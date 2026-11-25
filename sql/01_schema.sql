CREATE TABLE IF NOT EXISTS dataset_versions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  license TEXT NOT NULL,
  sha256 CHAR(64) NOT NULL UNIQUE,
  expected_rows INTEGER NOT NULL CHECK (expected_rows > 0),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS candidates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dataset_id BIGINT NOT NULL REFERENCES dataset_versions(id),
  source_row INTEGER NOT NULL CHECK (source_row > 0),
  feature_1 DOUBLE PRECISION NOT NULL,
  feature_2 DOUBLE PRECISION NOT NULL,
  feature_3 DOUBLE PRECISION NOT NULL,
  feature_4 DOUBLE PRECISION NOT NULL,
  feature_5 DOUBLE PRECISION NOT NULL,
  feature_6 DOUBLE PRECISION NOT NULL,
  feature_7 DOUBLE PRECISION NOT NULL,
  feature_8 DOUBLE PRECISION NOT NULL,
  true_label SMALLINT NOT NULL CHECK (true_label IN (0,1)),
  UNIQUE (dataset_id, source_row)
);
CREATE TABLE IF NOT EXISTS model_runs (
  id UUID PRIMARY KEY,
  batch_id UUID NOT NULL,
  dataset_id BIGINT NOT NULL REFERENCES dataset_versions(id),
  algorithm TEXT NOT NULL CHECK (algorithm IN ('Dummy','LogisticRegression','RandomForest')),
  seed INTEGER NOT NULL,
  threshold DOUBLE PRECISION NOT NULL CHECK (threshold BETWEEN 0 AND 1),
  cv_f1 DOUBLE PRECISION NOT NULL CHECK (cv_f1 BETWEEN 0 AND 1),
  selected BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL CHECK (status IN ('running','completed','failed')),
  parameters JSONB NOT NULL,
  model_sha256 CHAR(64),
  train_count INTEGER NOT NULL CHECK (train_count > 0),
  test_count INTEGER NOT NULL CHECK (test_count > 0),
  feature_query_ms DOUBLE PRECISION NOT NULL CHECK (feature_query_ms >= 0),
  train_seconds DOUBLE PRECISION,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS run_samples (
  run_id UUID NOT NULL REFERENCES model_runs(id),
  candidate_id BIGINT NOT NULL REFERENCES candidates(id),
  subset TEXT NOT NULL CHECK (subset IN ('train','test')),
  PRIMARY KEY (run_id,candidate_id),
  UNIQUE (run_id,candidate_id,subset)
);
CREATE TABLE IF NOT EXISTS run_metrics (
  run_id UUID PRIMARY KEY REFERENCES model_runs(id),
  accuracy DOUBLE PRECISION NOT NULL CHECK (accuracy BETWEEN 0 AND 1),
  precision_score DOUBLE PRECISION NOT NULL CHECK (precision_score BETWEEN 0 AND 1),
  recall DOUBLE PRECISION NOT NULL CHECK (recall BETWEEN 0 AND 1),
  f1 DOUBLE PRECISION NOT NULL CHECK (f1 BETWEEN 0 AND 1),
  roc_auc DOUBLE PRECISION NOT NULL CHECK (roc_auc BETWEEN 0 AND 1),
  average_precision DOUBLE PRECISION NOT NULL CHECK (average_precision BETWEEN 0 AND 1),
  tn INTEGER NOT NULL CHECK (tn >= 0), fp INTEGER NOT NULL CHECK (fp >= 0),
  fn INTEGER NOT NULL CHECK (fn >= 0), tp INTEGER NOT NULL CHECK (tp >= 0)
);
CREATE TABLE IF NOT EXISTS predictions (
  run_id UUID NOT NULL,
  candidate_id BIGINT NOT NULL,
  subset TEXT NOT NULL DEFAULT 'test' CHECK (subset = 'test'),
  probability DOUBLE PRECISION NOT NULL CHECK (probability BETWEEN 0 AND 1),
  predicted_label SMALLINT NOT NULL CHECK (predicted_label IN (0,1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id,candidate_id),
  FOREIGN KEY (run_id,candidate_id,subset) REFERENCES run_samples(run_id,candidate_id,subset)
);
-- An FK proves existence; this trigger additionally proves dataset agreement.
CREATE OR REPLACE FUNCTION check_run_dataset() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT dataset_id FROM model_runs WHERE id=NEW.run_id)
     IS DISTINCT FROM (SELECT dataset_id FROM candidates WHERE id=NEW.candidate_id) THEN
    RAISE EXCEPTION 'Run and candidate must belong to the same dataset' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS run_dataset_guard ON run_samples;
CREATE TRIGGER run_dataset_guard BEFORE INSERT OR UPDATE ON run_samples
  FOR EACH ROW EXECUTE FUNCTION check_run_dataset();
CREATE INDEX IF NOT EXISTS predictions_rank ON predictions(run_id,probability DESC,candidate_id);
CREATE INDEX IF NOT EXISTS runs_dataset_time ON model_runs(dataset_id,created_at DESC);
CREATE OR REPLACE VIEW prediction_review AS
SELECT p.run_id,p.candidate_id,c.source_row,c.true_label,p.predicted_label,p.probability,
       CASE WHEN c.true_label=1 AND p.predicted_label=1 THEN 'TP'
            WHEN c.true_label=0 AND p.predicted_label=1 THEN 'FP'
            WHEN c.true_label=1 AND p.predicted_label=0 THEN 'FN' ELSE 'TN' END AS outcome
FROM predictions p JOIN candidates c ON c.id=p.candidate_id;
