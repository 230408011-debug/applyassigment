import run_local
import json,time,statistics
from pathlib import Path
from psycopg.types.json import Jsonb
from pulsar.db import connect
from pulsar.ml import FEATURES
out=Path('artifacts');out.mkdir(exist_ok=True)
class UndoBenchmark(Exception):pass
with connect() as c:
    runs=c.execute('''SELECT r.*,m.accuracy,m.precision_score,m.recall,m.f1,m.roc_auc,m.average_precision,m.tn,m.fp,m.fn,m.tp
                      FROM model_runs r JOIN run_metrics m ON m.run_id=r.id ORDER BY r.created_at,r.algorithm''').fetchall()
    selected=next(r for r in runs if r['selected'])
    dataset=c.execute('SELECT * FROM dataset_versions ORDER BY id LIMIT 1').fetchone()
    label_counts=c.execute('SELECT true_label,count(*) AS n FROM candidates GROUP BY true_label ORDER BY true_label').fetchall()
    shapes={}
    for name,sql in [('typed_columns','SELECT id,'+','.join(FEATURES)+',true_label FROM candidates WHERE dataset_id=%s ORDER BY id'),
                     ('json_array_transport','SELECT id,jsonb_build_array('+','.join(FEATURES)+') AS features,true_label FROM candidates WHERE dataset_id=%s ORDER BY id')]:
        measurements=[]
        for i in range(8):
            start=time.perf_counter();rows=c.execute(sql,(dataset['id'],)).fetchall();ms=(time.perf_counter()-start)*1000
            assert len(rows)==17898
            if i:measurements.append(ms)
        shapes[name]={'median_ms':statistics.median(measurements),'runs_ms':measurements}
    query='EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT candidate_id,probability FROM predictions WHERE run_id=%s ORDER BY probability DESC,candidate_id LIMIT 20'
    plans={}
    try:
        with c.transaction():
            for name in ['with_index','without_index']:
                if name=='without_index':c.execute('DROP INDEX predictions_rank')
                samples=[]
                for i in range(8):
                    plan=c.execute(query,(selected['id'],)).fetchone()['QUERY PLAN'][0]
                    if i:samples.append(plan['Execution Time'])
                plans[name]={'median_execution_ms':statistics.median(samples),'samples_ms':samples,'plan':plan}
            raise UndoBenchmark()
    except UndoBenchmark:pass
    assert c.execute("SELECT 1 FROM pg_indexes WHERE indexname='predictions_rank'").fetchone()
    evidence={'database_version':c.execute('SELECT version() AS v').fetchone()['v'],'dataset':dataset,'label_counts':label_counts,'runs':runs,'selected_run_id':selected['id'],'transport_benchmark':shapes,'ranking_benchmark':plans,
              'roundtrip_counts':c.execute('SELECT (SELECT count(*) FROM candidates) AS candidates,(SELECT count(*) FROM run_samples) AS memberships,(SELECT count(*) FROM predictions) AS predictions').fetchone()}
(out/'evidence.json').write_text(json.dumps(evidence,default=str,indent=2))
print(json.dumps({'transport':shapes,'index':{k:v['median_execution_ms'] for k,v in plans.items()}},indent=2))
# Actual SQL-derived results, not illustrative numbers.
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
first=runs[:3]
# Order explicitly, regardless of UUID or timing.
first=sorted(first,key=lambda r:['Dummy','LogisticRegression','RandomForest'].index(r['algorithm']))
fig,axes=plt.subplots(1,2,figsize=(10,4),layout='constrained')
x=range(3)
axes[0].bar(x,[r['f1'] for r in first],color=['#8996a6','#438ba0','#265b75']);axes[0].set_xticks(list(x),['Majority baseline','Logistic regression','Random forest'],rotation=12);axes[0].set_ylim(0,1);axes[0].set_ylabel('Positive-class F1');axes[0].set_title('Untouched holdout, threshold 0.5')
for i,r in enumerate(first):axes[0].text(i,r['f1']+.02,f"{r['f1']:.4f}",ha='center')
m=[[selected['tn'],selected['fp']],[selected['fn'],selected['tp']]]
axes[1].imshow(m,cmap='Blues');axes[1].set_xticks([0,1],['Noise','Pulsar']);axes[1].set_yticks([0,1],['Noise','Pulsar']);axes[1].set_xlabel('Predicted');axes[1].set_ylabel('Actual');axes[1].set_title('CV-selected Random Forest')
for i in range(2):
 for j in range(2):axes[1].text(j,i,str(m[i][j]),ha='center',va='center',color='white' if m[i][j]>1500 else 'black')
fig.savefig(out/'results.png',dpi=180);fig.savefig(out/'results.svg');plt.close(fig)
