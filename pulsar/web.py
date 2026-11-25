import math
import uuid
from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import HTTPException
import psycopg
from .db import connect, import_dataset
from .ml import train_all, TrainingBusy

def create_app():
    app = Flask(__name__)
    app.config['MAX_CONTENT_LENGTH'] = 16384

    @app.get('/')
    def index():
        return render_template('index.html')

    @app.get('/api/health')
    def health():
        with connect() as conn:
            version = conn.execute('SELECT version() AS version').fetchone()['version']
        return jsonify(status='ok', database='PostgreSQL', version=version)

    @app.get('/api/overview')
    def overview():
        with connect() as conn:
            data = conn.execute('''SELECT count(*) AS total, count(*) FILTER(WHERE true_label=1) AS pulsar,
                                           count(*) FILTER(WHERE true_label=0) AS noise FROM candidates''').fetchone()
            data['runs'] = conn.execute("SELECT count(*) AS n FROM model_runs WHERE status='completed'").fetchone()['n']
            data['predictions'] = conn.execute('SELECT count(*) AS n FROM predictions').fetchone()['n']
            data['datasets'] = conn.execute('SELECT * FROM dataset_versions ORDER BY id').fetchall()
        return jsonify(data)

    def json_object():
        if not request.is_json:
            raise ValueError('Send Content-Type: application/json')
        body = request.get_json()
        if not isinstance(body, dict):
            raise ValueError('JSON body must be an object')
        return body

    @app.post('/api/import')
    def import_data():
        json_object()
        return jsonify(import_dataset())

    @app.post('/api/train')
    def train():
        body = json_object()
        seed = body.get('seed', 42)
        if isinstance(seed, bool) or not isinstance(seed, int) or not 0 <= seed <= 4294967295:
            raise ValueError('seed must be an integer from 0 through 4294967295')
        return jsonify(train_all(seed)), 201

    @app.get('/api/runs')
    def runs():
        with connect() as conn:
            rows = conn.execute('''SELECT r.*, m.accuracy,m.precision_score,m.recall,m.f1,m.roc_auc,m.average_precision,m.tn,m.fp,m.fn,m.tp
                                    FROM model_runs r LEFT JOIN run_metrics m ON r.id=m.run_id
                                    ORDER BY r.created_at DESC,r.id''').fetchall()
        return jsonify(items=rows)

    @app.get('/api/runs/<run_id>/predictions')
    def predictions(run_id):
        run_id = str(uuid.UUID(run_id))
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        minimum = float(request.args.get('min_probability', 0))
        outcome = request.args.get('outcome', '')
        if not 1 <= limit <= 100 or offset < 0 or not math.isfinite(minimum) or not 0 <= minimum <= 1:
            raise ValueError('Invalid limit, offset or probability range')
        if outcome not in ['', 'TP', 'FP', 'FN', 'TN']:
            raise ValueError('outcome must be TP, FP, FN or TN')
        condition = 'run_id=%s AND probability >= %s'
        params = [run_id, minimum]
        if outcome:
            condition += ' AND outcome=%s'; params.append(outcome)
        with connect() as conn:
            if not conn.execute('SELECT 1 FROM model_runs WHERE id=%s', (run_id,)).fetchone():
                return jsonify(error='Run not found'), 404
            total = conn.execute('SELECT count(*) AS n FROM prediction_review WHERE ' + condition, params).fetchone()['n']
            items = conn.execute('SELECT * FROM prediction_review WHERE ' + condition + ' ORDER BY probability DESC,candidate_id LIMIT %s OFFSET %s', params + [limit, offset]).fetchall()
        return jsonify(items=items, total=total, limit=limit, offset=offset)

    @app.get('/api/candidates/<int:candidate_id>')
    def candidate(candidate_id):
        with connect() as conn:
            row = conn.execute('SELECT * FROM candidates WHERE id=%s', (candidate_id,)).fetchone()
        if row is None:
            return jsonify(error='Candidate not found'), 404
        return jsonify(row)

    @app.errorhandler(Exception)
    def error(exc):
        if isinstance(exc, TrainingBusy):
            return jsonify(error=str(exc)), 409
        if isinstance(exc, ValueError):
            return jsonify(error=str(exc)), 400
        if isinstance(exc, HTTPException):
            return jsonify(error=exc.description), exc.code
        if isinstance(exc, psycopg.OperationalError):
            app.logger.error('Database unavailable')
            return jsonify(error='Database unavailable. Check the database service.'), 503
        app.logger.exception('Request failed')
        return jsonify(error='Request failed. See the application log.'), 500

    return app
