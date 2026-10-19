-- Query-path indexes. BRIN on txn_ts: cheap, ideal for append-only time series.
CREATE INDEX IF NOT EXISTS idx_txn_customer_ts  ON transactions (customer_id, txn_ts DESC);
CREATE INDEX IF NOT EXISTS idx_txn_merchant_ts  ON transactions (merchant_id, txn_ts DESC);
CREATE INDEX IF NOT EXISTS idx_txn_device_ts    ON transactions (device_id, txn_ts DESC);
CREATE INDEX IF NOT EXISTS idx_txn_ip_ts        ON transactions (ip_address, txn_ts DESC);
CREATE INDEX IF NOT EXISTS idx_txn_ts_brin      ON transactions USING brin (txn_ts);
CREATE INDEX IF NOT EXISTS idx_txn_label_ts     ON transactions (label_ts) WHERE label_ts IS NULL;
CREATE INDEX IF NOT EXISTS idx_uf_latest        ON user_features (customer_id, as_of_ts DESC);
CREATE INDEX IF NOT EXISTS idx_pl_model_ts      ON prediction_logs (model_version, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_pl_features_gin  ON prediction_logs USING gin (features jsonb_path_ops);
