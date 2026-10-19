"""Feature registry: single source of truth for feature names & semantics.

Every feature is classified by:
  - plane:   offline | online | both
  - kind:    static | rolling | expanding (behavioral) | sequential | interaction
  - leakage: how the strict past-only property is guaranteed

The offline builder (src/features/builder.py) and the online computer
(src/features/online.py) must both produce exactly FEATURE_NAMES — this is
asserted by tests/leakage & the training-serving consistency test.
"""

HISTORY_KEY = "customer_id"
LABEL = "is_fraud"
LABEL_TS = "label_ts"
TS_COL = "txn_ts"

# Columns never fed to the model
ID_COLS = ["transaction_id", "customer_id", "card_id", "merchant_id", "device_id"]
META_COLS = [TS_COL, "label_ts"]

# --- static / current-transaction features (no history needed) -------------
STATIC_NUM = [
    "amount", "log_amount", "merchant_risk_score", "ip_risk_score",
    "device_age_days", "account_age_days", "failed_auth_attempts",
]
STATIC_CAT = [
    "channel", "device_type", "operating_system", "authentication_method",
    "currency", "merchant_category", "transaction_country",
]

# --- temporal ---------------------------------------------------------------
TEMPORAL = [
    "transaction_hour", "transaction_dow", "transaction_month", "is_weekend",
    "is_night", "is_business_hour", "hour_sin", "hour_cos", "dow_sin", "dow_cos",
]

# --- velocity (rolling counts/sums, strict past-only) ------------------------
def _velocity_names() -> list[str]:
    windows = {5: "5m", 15: "15m", 30: "30m", 60: "1h", 360: "6h",
               1440: "24h", 10080: "7d", 43200: "30d"}
    names = [f"customer_txn_count_{w}" for w in windows.values()]
    names += ["customer_amount_sum_1h", "customer_amount_sum_24h",
              "customer_amount_avg_1h", "customer_amount_avg_24h"]
    names += ["merchant_txn_count_1h", "merchant_txn_count_24h",
              "device_txn_count_1h", "device_txn_count_24h",
              "ip_txn_count_24h"]
    return names


VELOCITY = _velocity_names()

# --- trailing distinct counts ------------------------------------------------
DISTINCT = [
    "unique_merchants_24h", "unique_cities_24h", "unique_devices_24h",
    "unique_countries_24h", "multi_country_24h_flag",
    "failed_txn_count_24h", "auth_failures_24h",
]

# --- historical behavioral (expanding past-only per customer) ----------------
BEHAVIORAL = [
    "customer_txn_count_hist", "customer_amount_mean_hist",
    "customer_amount_std_hist", "customer_amount_min_hist",
    "customer_amount_max_hist", "customer_amount_sum_hist",
    "unique_merchants_30d", "customer_night_ratio_30d",
    "customer_weekend_ratio_30d", "customer_typical_hour",
    "hour_deviation_circular",
]

# --- amount vs. history (ratios/z-scores) -------------------------------------
AMOUNT_VS_HIST = [
    "amount_ratio_to_mean", "amount_ratio_to_median", "amount_ratio_to_max",
    "amount_zscore", "amount_deviation_from_mean",
    "amount_ratio_to_prev", "amount_diff_from_prev", "amount_spike_flag",
]

# --- sequential / previous transaction ----------------------------------------
SEQUENTIAL = [
    "time_since_prev_txn_sec", "prev_txn_amount", "merchant_changed_flag",
    "country_changed_flag", "city_changed_flag", "device_changed_flag",
    "rapid_repeat_txn_flag",
]

# --- geographic -----------------------------------------------------------------
GEO = [
    "distance_from_prev_km", "distance_from_home_km",
    "impossible_travel_kmh", "impossible_travel_flag",
    "new_country_flag", "new_city_flag", "country_change_flag",
]

# --- device / ip ------------------------------------------------------------------
DEVICE_IP = [
    "device_txn_count_hist", "device_customer_count", "ip_customer_count",
    "new_device_flag", "multiple_customers_same_device_flag",
    "device_location_mismatch_flag",
]

# --- merchant / category (historical, leakage-safe) ------------------------------
MERCHANT = [
    "merchant_txn_count_hist", "merchant_fraud_rate_hist",
    "merchant_avg_amount_hist", "mcc_fraud_rate_hist",
    "customer_merchant_txn_count_90d", "customer_merchant_avg_amount",
    "new_merchant_for_customer_flag", "new_merchant_global_ratio",
]

# --- historical WOE / frequency encodings (past-only) ------------------------------
ENCODINGS = [
    "merchant_id_woe", "merchant_id_freq", "mcc_woe", "mcc_freq",
    "merchant_category_woe", "merchant_category_freq",
    "channel_woe", "channel_freq", "device_type_woe", "device_type_freq",
    "transaction_country_woe", "transaction_country_freq",
]

# --- interactions --------------------------------------------------------------------
INTERACTIONS = [
    "amount_x_velocity_24h", "amount_zscore_x_velocity_24h",
    "new_device_x_amount_zscore", "new_country_x_log_amount",
    "night_x_amount_ratio_mean", "impossible_travel_x_log_amount",
]


def all_feature_names() -> list[str]:
    """Ordered model input feature list (the model contract)."""
    groups = [
        STATIC_NUM, TEMPORAL, VELOCITY, DISTINCT, BEHAVIORAL, AMOUNT_VS_HIST,
        SEQUENTIAL, GEO, DEVICE_IP, MERCHANT, ENCODINGS, INTERACTIONS,
    ]
    # static categoricals enter as WOE/frequency encodings, not raw strings
    return [f for g in groups for f in g]
