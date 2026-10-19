"""Historical behavioral / sequential / geo / merchant features — ALL past-only.

Contract: `df` must be sorted by (history_key, txn_ts) with a clean RangeIndex.
Every aggregate is computed on a per-key time-sorted copy; expanding stats are
shifted by one position within the key (strictly excludes the current row).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from src.features.temporal import circular_hour_diff
from src.features.velocity import TS, _expanding_past, _rolling_stat, add_trailing_distinct


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = np.radians(np.asarray(lat1, float)), np.radians(np.asarray(lat2, float))
    dp, dl = p2 - p1, np.radians(np.asarray(lon2, float) - np.asarray(lon1, float))
    a = np.sin(dp / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return 2 * r * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))


def add_behavioral_features(df: pd.DataFrame, history_key: str,
                            merchant_smoothing: dict) -> pd.DataFrame:
    key = history_key
    sk = [key, TS]
    grp = df.groupby(key, sort=False)

    # --- expanding past-only customer spend profile ---------------------------
    # count/sum features: an empty history is 0, not unknown (NaN) — mirrors the
    # online plane exactly; distributional stats stay NaN until enough history.
    df["customer_txn_count_hist"] = _expanding_past(df, key, "amount", "count",
                                                    sk).fillna(0.0)
    mean_ = _expanding_past(df, key, "amount", "mean", sk)
    std_ = _expanding_past(df, key, "amount", "std", sk)
    df["customer_amount_min_hist"] = _expanding_past(df, key, "amount", "min", sk)
    max_ = _expanding_past(df, key, "amount", "max", sk)
    df["customer_amount_sum_hist"] = _expanding_past(df, key, "amount", "sum",
                                                     sk).fillna(0.0)
    median_ = _expanding_past(df, key, "amount", "median", sk)
    df["customer_amount_mean_hist"] = mean_
    df["customer_amount_std_hist"] = std_
    df["customer_amount_max_hist"] = max_

    # --- amount vs. history ----------------------------------------------------
    df["amount_ratio_to_mean"] = df["amount"] / mean_
    df["amount_ratio_to_median"] = df["amount"] / median_
    df["amount_ratio_to_max"] = df["amount"] / max_
    df["amount_deviation_from_mean"] = df["amount"] - mean_
    df["amount_zscore"] = (df["amount"] - mean_) / std_.replace(0.0, np.nan)

    # --- sequential / previous transaction --------------------------------------
    df["prev_txn_amount"] = grp["amount"].shift(1)
    prev_ts = grp["txn_ts"].shift(1)
    df["time_since_prev_txn_sec"] = (df["txn_ts"] - prev_ts).dt.total_seconds()
    df["amount_ratio_to_prev"] = df["amount"] / df["prev_txn_amount"].replace(0.0, np.nan)
    df["amount_diff_from_prev"] = df["amount"] - df["prev_txn_amount"]
    df["amount_spike_flag"] = (df["amount_ratio_to_prev"] > 5).astype(float)
    for col, out in (("merchant_id", "merchant_changed_flag"),
                     ("transaction_country", "country_changed_flag"),
                     ("transaction_city", "city_changed_flag"),
                     ("device_id", "device_changed_flag")):
        prev = grp[col].shift(1)
        df[out] = (prev.isna() | (prev != df[col])).astype(float)
    df["rapid_repeat_txn_flag"] = (df["time_since_prev_txn_sec"] < 120).astype(float)

    # --- geography ---------------------------------------------------------------
    prev_lat = grp["latitude"].shift(1)
    prev_lon = grp["longitude"].shift(1)
    df["distance_from_prev_km"] = haversine_km(df["latitude"], df["longitude"],
                                               prev_lat, prev_lon)
    df["distance_from_home_km"] = haversine_km(df["latitude"], df["longitude"],
                                               df["home_latitude"], df["home_longitude"])
    hours = (df["time_since_prev_txn_sec"] / 3600.0).clip(lower=1.0 / 60.0)
    df["impossible_travel_kmh"] = df["distance_from_prev_km"] / hours
    df["impossible_travel_flag"] = (df["impossible_travel_kmh"] > 900).astype(float)
    df["country_change_flag"] = df["country_changed_flag"]

    # --- new-entity flags (first occurrence per customer, in time order) ----------
    for col, out in (("device_id", "new_device_flag"),
                     ("transaction_country", "new_country_flag"),
                     ("transaction_city", "new_city_flag"),
                     ("merchant_id", "new_merchant_for_customer_flag")):
        df[out] = (~df.duplicated(subset=[key, col], keep="first")).astype(float)

    # --- device / ip behavioral ---------------------------------------------------
    add_trailing_distinct(df, "device_id", key, None, "device_customer_count")
    add_trailing_distinct(df, "ip_address", key, None, "ip_customer_count")
    df["device_txn_count_hist"] = _expanding_past(df, "device_id", "amount", "count",
                                                  ["device_id", TS]).fillna(0.0)
    df["multiple_customers_same_device_flag"] = (
        df["device_customer_count"] > 1).astype(float)
    prev_dev_country = df.groupby([key, "device_id"], sort=False)[
        "transaction_country"].shift(1)
    df["device_location_mismatch_flag"] = (
        prev_dev_country.notna()
        & (prev_dev_country != df["transaction_country"])).astype(float)

    # --- 30-day customer profile ----------------------------------------------------
    cnt30 = df["customer_txn_count_30d"].replace(0.0, np.nan)
    df["customer_night_ratio_30d"] = (_rolling_stat(df, [key], sk, "is_night", "sum",
                                                    "43200min") / cnt30)
    df["_wknd"] = df["is_weekend"].astype(float)
    df["customer_weekend_ratio_30d"] = (_rolling_stat(df, [key], sk, "_wknd", "sum",
                                                      "43200min") / cnt30)
    df.drop(columns=["_wknd"], inplace=True)
    add_trailing_distinct(df, key, "merchant_id", 30 * 86400, "unique_merchants_30d")

    # --- customer typical hour (circular mean of PAST hours) --------------------------
    sin_mean = _expanding_past(df, key, "hour_sin", "mean", sk)
    cos_mean = _expanding_past(df, key, "hour_cos", "mean", sk)
    typical = np.mod(np.degrees(np.arctan2(sin_mean.to_numpy(),
                                           cos_mean.to_numpy())) / 15.0, 24.0)
    df["customer_typical_hour"] = typical
    df["hour_deviation_circular"] = [
        circular_hour_diff(float(h), float(t)) if np.isfinite(t) else np.nan
        for h, t in zip(df["transaction_hour"], typical)
    ]

    # --- merchant / category historical stats (strictly past-only labels!) -------------
    prior = float(merchant_smoothing.get("prior_rate", 0.02))
    strength = float(merchant_smoothing.get("strength", 100))
    m_count = _expanding_past(df, "merchant_id", "amount", "count",
                              ["merchant_id", TS]).fillna(0.0)
    m_fraud = _expanding_past(df, "merchant_id", "is_fraud", "sum",
                              ["merchant_id", TS]).fillna(0.0)
    df["merchant_txn_count_hist"] = m_count
    df["merchant_fraud_rate_hist"] = (m_fraud + prior * strength) / (m_count + strength)
    df["merchant_avg_amount_hist"] = _expanding_past(df, "merchant_id", "amount",
                                                     "mean", ["merchant_id", TS])
    c_count = _expanding_past(df, "mcc", "amount", "count", ["mcc", TS]).fillna(0.0)
    c_fraud = _expanding_past(df, "mcc", "is_fraud", "sum", ["mcc", TS]).fillna(0.0)
    df["mcc_fraud_rate_hist"] = (c_fraud + prior * strength) / (c_count + strength)

    # --- customer x merchant pair (90d window + expanding average) ---------------------
    pk = [key, "merchant_id", TS]
    df["customer_merchant_txn_count_90d"] = _rolling_stat(
        df, [key, "merchant_id"], pk, "amount", "count", "129600min").fillna(0.0)
    df["customer_merchant_avg_amount"] = _expanding_past(
        df, [key, "merchant_id"], "amount", "mean", pk)
    df["new_merchant_global_ratio"] = (df["merchant_txn_count_hist"]
                                       / (df["merchant_txn_count_hist"] + 50.0))

    # --- interactions (deliberately curated, not combinatorial) ------------------------
    df["amount_x_velocity_24h"] = df["log_amount"] * df["customer_txn_count_24h"]
    df["amount_zscore_x_velocity_24h"] = df["amount_zscore"] * df["customer_txn_count_24h"]
    df["new_device_x_amount_zscore"] = df["new_device_flag"] * df["amount_zscore"]
    df["new_country_x_log_amount"] = df["new_country_flag"] * df["log_amount"]
    df["night_x_amount_ratio_mean"] = df["is_night"] * df["amount_ratio_to_mean"]
    df["impossible_travel_x_log_amount"] = (df["impossible_travel_flag"]
                                            * df["log_amount"])
    return df

