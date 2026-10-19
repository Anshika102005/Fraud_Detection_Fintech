-- 003: prediction logs (serving audit + monitoring input).
-- features JSONB enables drift jobs without schema changes; actual_label is
-- backfilled by mlops.backfill_labels (chargeback feedback loop).
CREATE TABLE IF NOT EXISTS prediction_logs (
    request_id        UUID PRIMARY KEY,
    customer_id       TEXT,
    fraud_probability DOUBLE PRECISION,
    risk_level        TEXT,
    decision          TEXT,
    model_version     TEXT,
    latency_ms        DOUBLE PRECISION,
    features          JSONB,
    actual_label      BOOLEAN,
    label_ts          TIMESTAMPTZ,
    logged_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
