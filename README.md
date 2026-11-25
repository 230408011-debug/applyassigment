# Pulsar Scout — PostgreSQL and Machine Learning

Özcan Öztürk · 230408011 · CMP307 Database Management Systems

A small, single-machine application that screens HTRU2 pulsar candidates.
Data is imported into PostgreSQL, read directly with SQL for model training,
and the predictions and metrics are written back to PostgreSQL. Flask serves
a review screen that queries the saved results. This is a public benchmark
exercise, not proof of discovering a new pulsar.

Working demo on YouTube (unlisted): https://www.youtube.com/watch?v=wj3nfrJxYe8

Medium article: https://medium.com/@ozturkozcan838/pulsar-scout-a-database-to-model-to-database-project-4994def1e9fc

## Download and deliverables

```sh
git clone --branch database-pulsar --single-branch https://github.com/230408011-debug/applyassigment.git pulsar-scout
cd pulsar-scout
```

The technical report is `docs/report.pdf`. Editable diagrams, OpenAPI, Postman,
the local Medium article copy and Turkish defence notes are in `docs/`. The
delivery ZIP includes the recorded MP4 demo, also available as `docs/demo.mp4`. See `docs/delivery_checklist.txt`
for the remaining publication and submission steps.

## Quick start with Docker

Install Docker Desktop (or Docker Engine with Compose), then in this directory:

```sh
cp .env.example .env
# Edit POSTGRES_PASSWORD in .env to a local password.
docker compose up --build -d
docker compose ps
```

Open **http://localhost:5055**. Click **Import dataset**, then **Train & save results**.
Training runs three fixed models and can take a minute on a slower laptop.
The page is updated after the database commit. Review shows the saved holdout
predictions, with FP/FN filters, probability filtering and original measurements.

The source is already bundled, so the app does not need internet access after
the images and Python dependencies have been installed. The database port is
bound only to loopback. The UI is a local teaching tool without authentication;
do not publish it on the open internet without adding access control.

Configuration in `.env` (never commit it):

- `POSTGRES_PASSWORD`: choose a local password. Use a URL-safe alphanumeric value.
- `DB_PORT`: host database port, default 55432.
- `APP_PORT`: host HTTP port, default 5055.

If a port is occupied, change its value in `.env`. Inside Compose the database
hostname is `db` and its port is always 5432. The app connects using DATABASE_URL.
A persistent volume holds PostgreSQL data; another stores fitted model artifacts.

Command-line equivalents:

```sh
docker compose exec app python -m pulsar.cli import-data
docker compose exec app python -m pulsar.cli train --seed 42
# Query the real DB:
docker compose exec db psql -U pulsar -d pulsar -c 'SELECT true_label,COUNT(*) FROM candidates GROUP BY true_label;'
docker compose exec db psql -U pulsar -d pulsar -c 'SELECT COUNT(*) FROM predictions;'
# Stop while keeping data:
docker compose down
```

`docker compose down -v` removes the project database and model volumes;
use that only when you intentionally want a full reset. Re-importing the source
is safe and does not duplicate its records.

## Local development

Use Python 3.12 and the Compose database:

```sh
python -m venv .venv
# Linux/macOS:
. .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
docker compose up -d db
python run_local.py init-db
python run_local.py import-data
python run_local.py train
python run_local.py
```

`run_local.py` loads the local `.env` and sets the database URL. An explicitly
provided DATABASE_URL is preserved. Docker uses Gunicorn; the local command
uses Flask's development server. `pytest -q` runs the integration checks after
one training batch exists. `python make_evidence.py` measures and exports
actual SQL results to the ignored `artifacts/` directory and creates figures.

## Data and reproducibility

Source: [UCI HTRU2](https://archive.ics.uci.edu/dataset/372/htru2),
[DOI 10.24432/C5DK6R](https://doi.org/10.24432/C5DK6R), CC BY 4.0.
The bundle has 17,898 rows: 1,639 label-1 pulsars and 16,259 label-0 noise/RFI
examples, with eight numeric features. `data/provenance.json` records the raw
CSV SHA-256, source, licence and row-count audit. Original attribution and
background are in `data/SOURCE_README.txt`.

The ARFF header names positions 3/4 and 7/8 as skewness/kurtosis, while the
README prose lists excess kurtosis/skewness in those positions. This project
preserves the raw positions as `feature_1` to `feature_8`; it does not silently
swap columns or claim a physical interpretation for those ambiguous labels.
There are no sky coordinates, original images or raw time-series signals.

`sql/02_seed.sql` is a reproducible INSERT script generated from the source.
Only ingestion uses that source; **pulsar/ml.py never reads a CSV**. Its feature
projection is:

```sql
SELECT id, feature_1, feature_2, feature_3, feature_4,
       feature_5, feature_6, feature_7, feature_8, true_label
FROM candidates WHERE dataset_id = %s ORDER BY id;
```

Only the eight feature columns form X. IDs and labels never become input
features. A stratified 80/20 split with seed 42 creates 14,318 training and
3,580 test records; membership is saved per run. No exact duplicate feature
vectors were found in the supplied dataset.

Three fixed models are compared: majority Dummy, balanced Logistic Regression
with StandardScaler, and a 100-tree balanced Random Forest (min leaf 2).
Three-fold stratified CV on the training set selects by positive-class F1.
Scaling lives inside the pipeline, so each fold fits it only on its training
part. Selection occurs before held-out evaluation. The threshold is fixed at
0.5; it is not tuned using test labels. Test scores for all three predefined
models are reported for comparison, without choosing a winner from that test.

Metrics include accuracy, precision, recall, F1, ROC-AUC, average precision
and confusion counts. Average precision is the sklearn AP summary, not a claim
of trapezoidal PR-curve area. The scores are not calibrated probabilities.

A transaction saves membership, predictions, metrics and completed status.
The prediction FK allows only test members, and a trigger prevents membership
across different source datasets. A session advisory lock prevents overlapping
training operations. Saved model files have SHA-256 recorded in each run.

## Files

- `compose.yaml`, `Dockerfile`: complete local app/database deployment.
- `sql/01_schema.sql`: tables, constraints, guard trigger, view and indexes.
- `sql/02_seed.sql`: idempotent original-data INSERT statements.
- `pulsar/db.py`: parameterized PostgreSQL access and initialization.
- `pulsar/ml.py`: SQL feature extraction, CV, training and atomic writeback.
- `pulsar/web.py`: API and UI; `templates/` and `static/` contain the frontend.
- `tests/test_project.py`: import, API, constraints, split consistency, metrics and rollback tests.
- `docs/architecture.mmd`, `schema.mmd`, `conceptual_er.mmd`: editable diagram sources.
- `docs/openapi.yaml`, `postman_collection.json`: API documentation and request collection.
- `docs/`: report, observed result snapshot, article text and presentation material.
- `artifacts/`: ignored runtime measurements and fitted model files.

## API

OpenAPI: `docs/openapi.yaml`; import `docs/postman_collection.json` into Postman.
Set its `base_url` variable to your app URL and `run_id` to a completed run UUID.

| Endpoint | Purpose |
| --- | --- |
| GET /api/health | Database connectivity/version |
| GET /api/overview | Counts and source provenance |
| POST /api/import with `{}` | Idempotent source import |
| POST /api/train with `{"seed":42}` | Run and save the experiment |
| GET /api/runs | History joined to database metrics |
| GET /api/runs/:id/predictions | Review/filter/paginate stored predictions |
| GET /api/candidates/:id | Original measurements and actual label |

Filters are `outcome` (TP/FP/FN/TN), `min_probability` (0–1), `limit` (1–100)
and `offset`. Errors are JSON. SQL values use parameters, not string
interpolation from user inputs. The public API has no delete/reset operation.

## Scope and limits

The benchmark is imbalanced. The majority-only model is about 90.84% accurate
while finding no pulsars, so accuracy alone would be misleading. The class-1
recall and false negatives are important and are shown explicitly. Dataset
labels are human annotations, not new astronomical confirmation. The source
has no identifiers for grouping by observing session, so the random holdout
cannot establish generalization to new telescope campaigns.

This is one PostgreSQL instance and one web process, not a distributed or
production observatory platform. The API is synchronous, so the long-running
train request needs Gunicorn's configured timeout. Larger deployments would
need authenticated users, a background job queue and resource limits.

### Environment-specific Docker note

The managed development environment intercepts HTTPS with its own CA.
The Docker build was tested using a temporary Dockerfile whose pip RUN step
mounts that CA as a BuildKit secret and sets PIP_CERT. TLS verification stayed
on; the certificate was not copied into the image or committed. On an ordinary
Docker Desktop installation, use the tracked Dockerfile above. A VFS storage
limit was resolved by combining installation commands into fewer image layers.
