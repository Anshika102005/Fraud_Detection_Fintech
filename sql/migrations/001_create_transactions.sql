-- 001: raw transactions (system of record).
-- Labels arrive LATE (chargebacks): is_fraud is NULL until the label lands,
-- label_ts records when it became known — the anchor of all leakage guards.
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id        TEXT PRIMARY KEY,
    customer_id           TEXT        NOT NULL,
    card_id               TEXT,
    merchant_id           TEXT        NOT NULL,
    mcc                   INTEGER,
    merchant_category     TEXT,
    merchant_risk_score   REAL,
    txn_ts                TIMESTAMPTZ NOT NULL,
    amount                NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency              CHAR(3)     NOT NULL DEFAULT 'USD',
    channel               TEXT        CHECK (channel IN ('pos','ecom','atm','moto')),
    status                TEXT        NOT NULL DEFAULT 'approved',
    transaction_country   TEXT,
    transaction_city      TEXT,
    latitude              DOUBLE PRECISION,
    longitude             DOUBLE PRECISION,
    home_latitude         DOUBLE PRECISION,
    home_longitude        DOUBLE PRECISION,
    device_id             TEXT,
    device_type           TEXT,
    operating_system      TEXT,
    ip_address            TEXT,
    ip_risk_score         REAL,
    device_age_days       REAL,
    authentication_method TEXT,
    cvv_result            TEXT,
    pin_verified          BOOLEAN,
    threeds_result        TEXT,
    biometric_verified    BOOLEAN,
    failed_auth_attempts  SMALLINT    NOT NULL DEFAULT 0,
    account_age_days      INTEGER,
    is_fraud              BOOLEAN,              -- label arrives late
    label_ts              TIMESTAMPTZ,          -- when the label landed
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
