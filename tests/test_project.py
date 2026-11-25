import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import run_local  # load the local, ignored .env; existing DATABASE_URL is preserved
import uuid
import numpy as np
import psycopg
import pytest
from pulsar.db import connect, initialize, import_dataset
from pulsar.ml import save_results
from pulsar.web import create_app

@pytest.fixture(scope='session',autouse=True)
def schema():
    initialize()

@pytest.fixture
def client():
    return create_app().test_client()

def test_import_and_data_quality():
    assert import_dataset()['total'] == 17898
    assert import_dataset()['total'] == 17898
    with connect() as c:
        assert c.execute('SELECT count(*) AS n FROM candidates WHERE true_label=1').fetchone()['n'] == 1639
        assert c.execute('SELECT count(*) AS n FROM dataset_versions').fetchone()['n'] == 1
        data=c.execute('SELECT * FROM candidates ORDER BY id LIMIT 1').fetchone()
        assert data['source_row']==1
        assert data['feature_1']==140.5625

def test_api_reads_and_validation(client):
    assert client.get('/api/health').json['status']=='ok'
    assert client.get('/api/overview').json['total']==17898
    assert client.post('/api/import',json={}).json['total']==17898
    assert client.post('/api/train',json={'seed':-1}).status_code==400
    assert client.post('/api/train',json={'seed':True}).status_code==400
    assert client.post('/api/train',json=[]).status_code==400
    assert client.post('/api/train',data='{',content_type='application/json').status_code==400
    assert client.get('/api/runs/not-a-uuid/predictions').status_code==400
    assert client.get('/api/runs/'+str(uuid.uuid4())+'/predictions').status_code==404
    assert client.get('/api/candidates/999999999').status_code==404
    assert client.get('/api/not-a-route').status_code==404

def test_completed_runs_have_consistent_metrics_and_disjoint_splits(client):
    rows=client.get('/api/runs').json['items']
    assert len(rows)>=3
    for row in rows:
        if row['status']!='completed': continue
        with connect() as c:
            counts=c.execute('SELECT subset,count(*) AS n FROM run_samples WHERE run_id=%s GROUP BY subset',(row['id'],)).fetchall()
            counts={r['subset']:r['n'] for r in counts}
            assert counts=={'train':14318,'test':3580}
            # A PK forbids a candidate from belonging to both sets for one run.
            assert c.execute('SELECT count(*) AS n FROM predictions WHERE run_id=%s',(row['id'],)).fetchone()['n']==3580
            cm=c.execute('SELECT outcome,count(*) AS n FROM prediction_review WHERE run_id=%s GROUP BY outcome',(row['id'],)).fetchall()
            cm={r['outcome']:r['n'] for r in cm}
            for k in ['tn','fp','fn','tp']:assert row[k]==cm.get(k.upper(),0)
            assert row['accuracy']==pytest.approx((row['tn']+row['tp'])/3580)
            assert row['f1']==pytest.approx(2*row['tp']/(2*row['tp']+row['fp']+row['fn']) if row['tp'] else 0)
        page=client.get(f"/api/runs/{row['id']}/predictions?outcome=FP&limit=2").json
        assert all(r['outcome']=='FP' for r in page['items'])
        assert client.get(f"/api/runs/{row['id']}/predictions?min_probability=nan").status_code==400
    batches={r['batch_id'] for r in rows}
    for batch in batches:
        subset=[r for r in rows if r['batch_id']==batch and r['status']=='completed']
        if len(subset)==3:
            chosen=[r for r in subset if r['selected']]
            assert len(chosen)==1
            assert chosen[0]['cv_f1']==max(r['cv_f1'] for r in subset)

def test_database_rejects_invalid_labels_and_infinite_features():
    with connect() as c:
        row=c.execute('SELECT * FROM candidates ORDER BY id LIMIT 1').fetchone()
        for column,value in [('true_label',3),('feature_1',float('inf')),('feature_2',-1)]:
            with pytest.raises(psycopg.errors.CheckViolation):
                with c.transaction():
                    c.execute(f'UPDATE candidates SET {column}=%s WHERE id=%s',(value,row['id']))

def test_fk_guard_prevents_training_predictions_and_atomic_rollback():
    with connect() as c:
        with c.transaction():
            dataset=c.execute('SELECT id FROM dataset_versions LIMIT 1').fetchone()['id']
            ids=[r['id'] for r in c.execute('SELECT id FROM candidates ORDER BY id LIMIT 2').fetchall()]
            run=str(uuid.uuid4())
            c.execute("INSERT INTO model_runs(id,batch_id,dataset_id,algorithm,seed,threshold,cv_f1,status,parameters,train_count,test_count,feature_query_ms) VALUES (%s,%s,%s,'Dummy',42,.5,0,'running','{}',1,1,0)",(run,str(uuid.uuid4()),dataset))
            with pytest.raises(RuntimeError,match='Test rollback'):
                save_results(c,run,np.array(ids),[0],[1],[.5],[1],{},0,None,fail=True)
            assert c.execute('SELECT count(*) AS n FROM predictions WHERE run_id=%s',(run,)).fetchone()['n']==0
            assert c.execute('SELECT count(*) AS n FROM run_samples WHERE run_id=%s',(run,)).fetchone()['n']==0
            c.execute("INSERT INTO run_samples VALUES (%s,%s,'train')",(run,ids[0]))
            with pytest.raises(psycopg.errors.ForeignKeyViolation):
                with c.transaction():
                    c.execute('INSERT INTO predictions(run_id,candidate_id,probability,predicted_label) VALUES (%s,%s,.5,1)',(run,ids[0]))
            # Prevent crossing two source dataset versions even if both ids exist.
            other=c.execute("INSERT INTO dataset_versions(name,source_url,license,sha256,expected_rows) VALUES ('test','test','test',%s,1) RETURNING id",(str(uuid.uuid4()).replace('-','').ljust(64,'0'),)).fetchone()['id']
            other_id=c.execute('INSERT INTO candidates(dataset_id,source_row,feature_1,feature_2,feature_3,feature_4,feature_5,feature_6,feature_7,feature_8,true_label) VALUES (%s,1,1,1,1,1,1,1,1,1,0) RETURNING id',(other,)).fetchone()['id']
            with pytest.raises(psycopg.errors.CheckViolation):
                with c.transaction():
                    c.execute("INSERT INTO run_samples VALUES (%s,%s,'test')",(run,other_id))
            # The outer test transaction is rolled back deliberately, preserving the real data.
            raise RollbackTest()

class RollbackTest(Exception): pass
# The wrapper converts the deliberate rollback into a passing test.
_atomic_test=test_fk_guard_prevents_training_predictions_and_atomic_rollback
def test_fk_guard_prevents_training_predictions_and_atomic_rollback():
    with pytest.raises(RollbackTest): _atomic_test()
