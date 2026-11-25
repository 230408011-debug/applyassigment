"""Train from SQL rows; persist split membership, metrics and held-out predictions."""
import hashlib
import os
import time
import uuid
from pathlib import Path
import joblib
import numpy as np
from psycopg.types.json import Jsonb
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, average_precision_score, confusion_matrix
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from .db import connect

FEATURES = [f'feature_{i}' for i in range(1, 9)]
FEATURE_SQL = 'SELECT id, ' + ', '.join(FEATURES) + ', true_label FROM candidates WHERE dataset_id=%s ORDER BY id'

class TrainingBusy(Exception):
    pass

def save_results(conn, run_id, ids, train_indices, test_indices, probabilities, labels, metrics, seconds, model_hash, fail=False):
    """A failed write leaves no partial split, predictions or metrics for this run."""
    with conn.transaction():
        with conn.cursor() as cur:
            cur.executemany('INSERT INTO run_samples(run_id,candidate_id,subset) VALUES (%s,%s,%s)',
                            [(run_id, int(ids[i]), 'train') for i in train_indices] + [(run_id, int(ids[i]), 'test') for i in test_indices])
            cur.executemany('INSERT INTO predictions(run_id,candidate_id,probability,predicted_label) VALUES (%s,%s,%s,%s)',
                            [(run_id, int(ids[i]), float(probability), int(label)) for i, probability, label in zip(test_indices, probabilities, labels)])
        if fail:
            raise RuntimeError('Test rollback after predictions')
        columns = list(metrics)
        conn.execute('INSERT INTO run_metrics(run_id,' + ','.join(columns) + ') VALUES (' + ','.join(['%s'] * (len(columns) + 1)) + ')',
                     [run_id] + [metrics[k] for k in columns])
        conn.execute("UPDATE model_runs SET status='completed',completed_at=now(),train_seconds=%s,model_sha256=%s WHERE id=%s", (seconds, model_hash, run_id))

def train_all(seed=42):
    with connect() as conn:
        # This session lock protects against simultaneous train buttons across workers/processes.
        if not conn.execute('SELECT pg_try_advisory_lock(230408011) AS locked').fetchone()['locked']:
            raise TrainingBusy('Another training request is running')
        try:
            dataset = conn.execute('SELECT * FROM dataset_versions ORDER BY imported_at DESC,id DESC LIMIT 1').fetchone()
            if not dataset:
                raise ValueError('Import the dataset first')
            started = time.perf_counter()
            rows = conn.execute(FEATURE_SQL, (dataset['id'],)).fetchall()
            query_ms = (time.perf_counter() - started) * 1000
            ids = np.array([r['id'] for r in rows])
            X = np.array([[r[f] for f in FEATURES] for r in rows], dtype=float)
            y = np.array([r['true_label'] for r in rows], dtype=int)
            if len(rows) != dataset['expected_rows'] or not np.isfinite(X).all() or set(np.unique(y)) != {0, 1}:
                raise ValueError('Dataset failed row-count, finite-value or label checks')
            train, test = train_test_split(np.arange(len(y)), test_size=0.2, stratify=y, random_state=seed)
            cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=seed)
            models = {
                'Dummy': DummyClassifier(strategy='most_frequent'),
                'LogisticRegression': make_pipeline(StandardScaler(), LogisticRegression(class_weight='balanced', max_iter=2000, random_state=seed)),
                'RandomForest': RandomForestClassifier(n_estimators=100, min_samples_leaf=2, class_weight='balanced', random_state=seed, n_jobs=1)
            }
            # Scaling is fitted inside each CV training fold, never on held-out data.
            cv_scores = {name: float(cross_val_score(model, X[train], y[train], cv=cv, scoring='f1', n_jobs=1).mean()) for name, model in models.items()}
            selected = max(cv_scores, key=cv_scores.get)
            batch_id = str(uuid.uuid4())
            results = []
            for name, model in models.items():
                run_id = str(uuid.uuid4())
                parameters = {k: str(v) if not isinstance(v, (str, int, float, bool, type(None))) else v for k, v in model.get_params(deep=False).items()}
                conn.execute('''INSERT INTO model_runs(id,batch_id,dataset_id,algorithm,seed,threshold,cv_f1,selected,status,parameters,train_count,test_count,feature_query_ms)
                                VALUES (%s,%s,%s,%s,%s,0.5,%s,%s,'running',%s,%s,%s,%s)''',
                             (run_id, batch_id, dataset['id'], name, seed, cv_scores[name], name == selected, Jsonb(parameters), len(train), len(test), query_ms))
                try:
                    started = time.perf_counter()
                    model.fit(X[train], y[train])
                    seconds = time.perf_counter() - started
                    probability = model.predict_proba(X[test])[:, list(model.classes_).index(1)]
                    prediction = (probability >= 0.5).astype(int)
                    truth = y[test]
                    tn, fp, fn, tp = confusion_matrix(truth, prediction, labels=[0, 1]).ravel()
                    metrics = {
                        'accuracy': float(accuracy_score(truth, prediction)),
                        'precision_score': float(precision_score(truth, prediction, zero_division=0)),
                        'recall': float(recall_score(truth, prediction, zero_division=0)),
                        'f1': float(f1_score(truth, prediction, zero_division=0)),
                        'roc_auc': float(roc_auc_score(truth, probability)),
                        'average_precision': float(average_precision_score(truth, probability)),
                        'tn': int(tn), 'fp': int(fp), 'fn': int(fn), 'tp': int(tp)
                    }
                    directory = Path(os.environ.get('ARTIFACT_DIR', 'artifacts')) / 'models'
                    directory.mkdir(parents=True, exist_ok=True)
                    path = directory / f'{run_id}.joblib'
                    joblib.dump(model, path)
                    model_hash = hashlib.sha256(path.read_bytes()).hexdigest()
                    save_results(conn, run_id, ids, train, test, probability, prediction, metrics, seconds, model_hash)
                    results.append({'id': run_id, 'algorithm': name, 'selected': name == selected, 'cv_f1': cv_scores[name], **metrics})
                except Exception:
                    conn.execute("UPDATE model_runs SET status='failed',error='Training or result write failed' WHERE id=%s", (run_id,))
                    raise
            return {'batch_id': batch_id, 'selected': selected, 'runs': results, 'train': len(train), 'test': len(test), 'query_ms': query_ms}
        finally:
            conn.execute('SELECT pg_advisory_unlock(230408011)')
