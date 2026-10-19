-- 002: materialized feature tables (offline feature store plane).
-- user_features: one row per (customer, as_of_ts) snapshot produced by the
-- nightly SQL feature job (see sql/features/*.sql). The serving plane reads the
-- LATEST row per customer; the training builder reads historical snapshots.
CREATE TABLE IF NOT EXISTS user_features (
    customer_id            TEXT   NOT NULL,
    as_of_ts               TIMESTAMPTZ NOT NULL,
    txn_count_1h           INTEGER,
    txn_count_24h          INTEGER,
    txn_count_7d           INTEGER,
    txn_count_30d          INTEGER,
    sum_amount_24h         NUMERIC(14,2),
    avg_amount_7d          NUMERIC(14,2),
    std_amount_30d         NUMERIC(14,2),
    max_amount_30d         NUMERIC(14,2),
    distinct_merchants_24h INTEGER,
    distinct_merchants_30d INTEGER,
    distinct_countries_24h INTEGER,
    cards_same_device_24h  INTEGER,
    PRIMARY KEY (customer_id, as_of_ts)
);

-- merchant_features: refreshed daily; consumed by the serving plane for
-- merchant fraud-rate / WOE encodings (label-dependent features are batch-
-- maintained so the online path NEVER computes them from live labels).
CREATE TABLE IF NOT EXISTS merchant_features (
    merchant_id         TEXT   NOT NULL,
    as_of_date          DATE   NOT NULL,
    txn_count_hist      BIGINT,
    fraud_count_hist    BIGINT,
    fraud_rate_smoothed DOUBLE PRECISION,
    avg_amount_hist     NUMERIC(14,2),
    PRIMARY KEY (merchant_id, as_of_date)
);
