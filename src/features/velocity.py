"""Velocity & trailing-distinct features.

Leakage contract: every window aggregate uses closed='left' (right-open), i.e.
ONLY transactions strictly before the current one. Trailing distinct counts use
an exact deque/Counter sweep with strict '<'. Per-key helpers sort internally,
so callers may pass a DataFrame in any row order.
"""
from __future__ import annotations

from collections import Counter, deque

import numpy as np
import pandas as pd

TS = "txn_ts"
_LABELS = {5: "5m", 15: "15m", 30: "30m", 60: "1h", 360: "6h",
           1440: "24h", 10080: "7d", 43200: "30d"}


def _time_sorted(df: pd.DataFrame, sort_keys: list[str]) -> pd.DataFrame:
    return df.sort_values(sort_keys, kind="mergesort")


def _rolling_stat(df: pd.DataFrame, key_cols: list[str], sort_keys: list[str],
                  agg_col: str, how: str, window: str) -> pd.Series:
    """Rolling aggregate over a time window, closed='left' (strict past-only).

    groupby().rolling(on=TS, closed='left') yields exactly one value per input
    row.  However, the result's row order is NOT guaranteed to match ``tmp``'s
    row order — pandas may reorder groups internally, so positional
    ``to_numpy()`` alignment causes off-by-one skew.  We use an index-based
    reindex on the (key_cols + TS) MultiIndex to guarantee correct alignment.
    """
    tmp = _time_sorted(df, sort_keys)
    res = getattr(tmp.groupby(list(key_cols), sort=False)
                  .rolling(window, on=TS, closed="left")[agg_col], how)()
    # res has MultiIndex (key_cols..., txn_ts); reindex by lookup to align.
    tmp_mi = pd.MultiIndex.from_frame(tmp[list(key_cols) + [TS]])
    out = res.reindex(tmp_mi)
    out.index = tmp.index
    return out.reindex(df.index)


def _expanding_past(df: pd.DataFrame, key_col, col: str, stat: str,
                    sort_keys: list[str]) -> pd.Series:
    """Expanding statistic over strictly-previous rows within key (shift(1)).

    key_col may be a single column name or a list (composite keys)."""
    keys = [key_col] if isinstance(key_col, str) else list(key_col)
    tmp = _time_sorted(df, sort_keys)
    s = getattr(tmp.groupby(keys, sort=False)[col].expanding(), stat)()
    s = s.reset_index(level=list(range(len(keys))), drop=True)
    # s now carries tmp's index but possibly in group order, not tmp's row order.
    # Reindex to tmp's order so the groupby+shift operates positionally correct.
    s = s.reindex(tmp.index)
    s = s.groupby([tmp[k].to_numpy() for k in keys], sort=False).shift(1)
    return s.reindex(df.index)


def add_velocity_features(df: pd.DataFrame, history_key: str,
                          windows_minutes: list[int],
                          distinct_windows_minutes: list[int]) -> pd.DataFrame:
    key = history_key
    sk = [key, TS]

    # --- customer txn counts per window ---------------------------------------
    for m in windows_minutes:
        df[f"customer_txn_count_{_LABELS[m]}"] = (
            _rolling_stat(df, [key], sk, "amount", "count", f"{m}min").fillna(0.0))

    # --- customer amount velocity ------------------------------------------------
    for m in (60, 1440):
        lbl = _LABELS[m]
        df[f"customer_amount_sum_{lbl}"] = (_rolling_stat(df, [key], sk, "amount",
                                                          "sum", f"{m}min").fillna(0.0))
        cnt = df[f"customer_txn_count_{lbl}"].replace(0.0, np.nan)
        df[f"customer_amount_avg_{lbl}"] = df[f"customer_amount_sum_{lbl}"] / cnt

    # --- merchant / device / ip global velocity (past-only per key) ----------------
    for key_col, prefix, wins in (("merchant_id", "merchant", (60, 1440)),
                                  ("device_id", "device", (60, 1440)),
                                  ("ip_address", "ip", (1440,))):
        for m in wins:
            df[f"{prefix}_txn_count_{_LABELS[m]}"] = (
                _rolling_stat(df, [key_col], [key_col, TS], "amount", "count",
                              f"{m}min").fillna(0.0))

    # --- security counters ----------------------------------------------------------
    df["_failed"] = (df["status"] == "declined").astype(float)
    df["failed_txn_count_24h"] = (_rolling_stat(df, [key], sk, "_failed", "sum",
                                                "1440min").fillna(0.0))
    df["_authf"] = (df["failed_auth_attempts"] > 0).astype(float)
    df["auth_failures_24h"] = (_rolling_stat(df, [key], sk, "_authf", "sum",
                                             "1440min").fillna(0.0))
    df.drop(columns=["_failed", "_authf"], inplace=True)

    # --- trailing distinct counts per customer ---------------------------------------
    for m in distinct_windows_minutes:
        lbl = "24h" if m == 1440 else "7d"
        specs = ([("merchant_id", "merchants"), ("transaction_city", "cities"),
                  ("device_id", "devices"), ("transaction_country", "countries")]
                 if m == 1440 else [("merchant_id", "merchants")])
        for value_col, name in specs:
            add_trailing_distinct(df, key, value_col, m * 60, f"unique_{name}_{lbl}")
    if "unique_countries_24h" in df.columns:
        df["multi_country_24h_flag"] = (df["unique_countries_24h"] > 1).astype(float)
    return df


def add_trailing_distinct(df: pd.DataFrame, key_col: str, value_col: str,
                          window_sec: float | None, out_col: str) -> None:
    """Exact distinct-value count over (t - window, t) — strictly past-only.

    window_sec=None -> expanding (all history before t). Rows sharing the same
    (key, t) all exclude every row at t, so they receive the same value.
    O(n) sweep with per-key deque + Counter, time-sorted internally.
    """
    keys = pd.factorize(df[key_col])[0]
    vals = df[value_col].to_numpy()
    ts = df[TS].to_numpy().astype("datetime64[ns]").astype(np.int64)
    order = np.lexsort((ts, keys))
    out = np.empty(len(df), dtype=float)
    dq: dict = {}
    ctr: dict = {}
    win_ns = None if window_sec is None else int(window_sec * 1e9)
    for pos in order:
        k, t = keys[pos], ts[pos]
        d = dq.setdefault(k, deque())
        c = ctr.setdefault(k, Counter())
        while d and (d[0][0] >= t or (win_ns is not None and d[0][0] <= t - win_ns)):
            _, v = d.popleft()
            c[v] -= 1
            if c[v] == 0:
                del c[v]
        out[pos] = len(c)
        d.append((t, vals[pos]))
        c[vals[pos]] += 1
    df[out_col] = out
