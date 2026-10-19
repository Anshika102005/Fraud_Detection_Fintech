-- Rolling / expanding aggregates + previous-transaction features.
--
-- ANTI-LEAKAGE PATTERNS DEMONSTRATED:
--   * EXCLUDE CURRENT ROW          -> window ends before the current row
--   * h.txn_ts < t.txn_ts          -> strict past-only self-join
--   * h.label_ts <= t.txn_ts       -> chargeback label must ALREADY be known
--   * LAG() over time order        -> previous-transaction features
--
-- Merchant fraud rate is the textbook target-leakage trap: computing it over
-- ALL rows (including the current + future) embeds the label into a feature.
-- Here it is strictly historical AND label-available-as-of.
SELECT
    t.transaction_id,
    t.customer_id,
    t.txn_ts,
    -- ---- expanding customer spend profile (past rows only) ----------------
    AVG(h.amount)   OVER w_past AS customer_avg_amount_prev,
    STDDEV(h.amount) OVER w_past AS customer_std_amount_prev,
    MAX(h.amount)   OVER w_past AS customer_max_amount_prev,
    COUNT(*)        OVER w_past AS customer_txn_count_prev,
    -- ---- previous-transaction features -------------------------------------
    LAG(amount)       OVER w_seq AS prev_amount,
    LAG(txn_ts)       OVER w_seq AS prev_txn_ts,
    LAG(merchant_id)  OVER w_seq AS prev_merchant_id,
    LAG(transaction_country) OVER w_seq AS prev_country,
    -- ---- merchant historical fraud rate (label-aware, as-of) ---------------
    (COALESCE(mh.fraud_count, 0) + 2.0) / (COALESCE(mh.txn_count, 0) + 100.0)
                      AS merchant_fraud_rate_hist
FROM transactions t
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS txn_count,
           SUM(CASE WHEN h.is_fraud THEN 1 ELSE 0 END) AS fraud_count
    FROM transactions h
    WHERE h.merchant_id = t.merchant_id
      AND h.txn_ts < t.txn_ts          -- only transactions BEFORE this one
      AND h.label_ts <= t.txn_ts       -- whose labels were KNOWN by this time
) mh ON true
WINDOW
    w_past AS (
        PARTITION BY t.customer_id ORDER BY t.txn_ts
        RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW EXCLUDE CURRENT ROW),
    w_seq AS (
        PARTITION BY t.customer_id ORDER BY t.txn_ts
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING);
