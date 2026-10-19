-- Feature query: trailing 24h velocity per customer (nightly refresh job).
--
-- LEAKAGE SAFETY CONTRACT (demonstrated twice):
--  1) Window version: RANGE ... AND CURRENT ROW EXCLUDE CURRENT ROW — the frame
--     ends BEFORE the current row. (Caveat: rows sharing the exact peer
--     timestamp remain in each other's frames; the canonical Python builder
--     uses strict '<' and excludes peers. The LATERAL version below is exact.)
--  2) LATERAL version: h.txn_ts < t.txn_ts is the strict past-only predicate.
INSERT INTO user_features
    (customer_id, as_of_ts, txn_count_24h, sum_amount_24h,
     distinct_merchants_24h, distinct_countries_24h)
SELECT customer_id, as_of_ts,
       txn_count_24h, sum_amount_24h, distinct_merchants_24h, distinct_countries_24h
FROM (
    SELECT t.customer_id,
           t.txn_ts AS as_of_ts,
           COUNT(h.transaction_id)  AS txn_count_24h,
           COALESCE(SUM(h.amount), 0) AS sum_amount_24h,
           COUNT(DISTINCT h.merchant_id) AS distinct_merchants_24h,
           COUNT(DISTINCT h.transaction_country) AS distinct_countries_24h
    FROM transactions t
    LEFT JOIN LATERAL (
        SELECT h.transaction_id, h.amount, h.merchant_id, h.transaction_country
        FROM transactions h
        WHERE h.customer_id = t.customer_id
          AND h.txn_ts < t.txn_ts                            -- strictly BEFORE (no future leakage)
          AND h.txn_ts >= t.txn_ts - INTERVAL '24 hours'     -- trailing window
    ) h ON true
    WHERE t.created_at >= now() - INTERVAL '1 day'
    GROUP BY t.customer_id, t.txn_ts
) v
ON CONFLICT (customer_id, as_of_ts) DO NOTHING;
