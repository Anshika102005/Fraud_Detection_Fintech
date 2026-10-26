"""Online feature computation — the SERVING mirror of the offline builder.

Training-serving consistency contract: `OnlineFeatureComputer.compute()` returns
exactly `registry.all_feature_names()` with the SAME definitions as
`builder.build_features()`. Verified row-by-row by tests/test_serving_consistency
(offline row vs online compute on the same replayed sequence).

State layout (per customer):
  - recent events ring-buffer (bounded) for windowed velocity/distinct features
  - running totals (n, sum, sumsq, min, max, sin/cos sums) for expanding stats
  - sorted amounts for past-only median; seen-sets for new-entity flags
Global state (merchant/device/ip) and historical label-dependent stats
(merchant fraud rates, WOE encodings) are maintained by the batch feature
refresh job — the online plane only reads them (plus incremental commits).
"""
from __future__ import annotations

import json
import math
from bisect import insort
from collections import deque

import numpy as np
import pandas as pd

from src.features.behavioral import haversine_km
from src.features.encoders import HistoricalEncoder
from src.features.temporal import circular_hour_diff

WINDOWS_SEC = {5: "5m", 15: "15m", 30: "30m", 60: "1h", 360: "6h",
               1440: "24h", 10080: "7d", 43200: "30d"}
SEC = {"5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "6h": 21600,
       "24h": 86400, "7d": 604800, "30d": 2592000, "90d": 7776000}


class InMemoryKV:
    def __init__(self):
        self._d: dict = {}

    def get(self, key, default=None):
        return self._d.get(key, default)

    def set(self, key, value, ttl=None):
        self._d[key] = value

    def delete(self, key):
        self._d.pop(key, None)


class RedisKV:
    """JSON-serializing KV over redis-py (imported lazily)."""

    def __init__(self, url: str):
        import redis
        self._r = redis.Redis.from_url(url, decode_responses=True)

    def get(self, key, default=None):
        v = self._r.get(key)
        return json.loads(v) if v is not None else default

    def set(self, key, value, ttl=None):
        self._r.set(key, json.dumps(value, default=str), ex=ttl)

    def delete(self, key):
        self._r.delete(key)


class CustomerState:
    __slots__ = ("events", "totals", "merchants_seen", "devices_seen",
                 "countries_seen", "cities_seen", "amounts_sorted",
                 "pair_stats", "device_last_country")

    def __init__(self):
        self.events: deque = deque()
        self.totals = {"n": 0, "sum": 0.0, "sumsq": 0.0, "min": None,
                       "max": None, "sin_sum": 0.0, "cos_sum": 0.0}
        self.merchants_seen: set = set()
        self.devices_seen: set = set()
        self.countries_seen: set = set()
        self.cities_seen: set = set()
        self.amounts_sorted: list = []
        self.pair_stats: dict = {}   # (merchant_id) -> [n, sum]
        self.device_last_country: dict = {}  # device_id -> last country

    def to_dict(self) -> dict:
        return {
            "events": list(self.events)[-2000:],
            "totals": self.totals,
            "merchants_seen": list(self.merchants_seen),
            "devices_seen": list(self.devices_seen),
            "countries_seen": list(self.countries_seen),
            "cities_seen": list(self.cities_seen),
            "amounts_sorted": self.amounts_sorted[-2000:],
            "pair_stats": {k: list(v) for k, v in self.pair_stats.items()},
            "device_last_country": self.device_last_country,
        }

    @classmethod
    def from_dict(cls, d: dict) -> CustomerState:
        s = cls()
        s.events = deque(d.get("events", []))
        s.totals = d.get("totals", s.totals)
        s.merchants_seen = set(d.get("merchants_seen", []))
        s.devices_seen = set(d.get("devices_seen", []))
        s.countries_seen = set(d.get("countries_seen", []))
        s.cities_seen = set(d.get("cities_seen", []))
        s.amounts_sorted = list(d.get("amounts_sorted", []))
        s.pair_stats = {k: tuple(v) for k, v in d.get("pair_stats", {}).items()}
        s.device_last_country = d.get("device_last_country", {})
        return s

class OnlineFeatureComputer:
    """Stateful, incremental mirror of builder.build_features() for one txn at a time."""

    ENCODER_COLS = ["merchant_id", "mcc", "merchant_category", "channel",
                    "device_type", "transaction_country"]

    def __init__(self, kv, encoder_cfg: dict | None = None, woe_smoothing: float = 50.0,
                 merchant_smoothing: dict | None = None, max_events: int = 2000):
        self.kv = kv
        self.max_events = max_events
        self.woe_smoothing = float(woe_smoothing)
        self.ms = merchant_smoothing or {}
        self.encoders: dict[str, HistoricalEncoder] = {}
        for key, c in (encoder_cfg or {}).items():
            col, kind = key.rsplit("_", 1)
            enc = HistoricalEncoder(col, prior_rate=c.get("prior_rate", 0.02),
                                    strength=c.get("strength", self.woe_smoothing),
                                    kind=kind)
            enc.global_prior = c.get("global_prior", 0.02)
            self.encoders[key] = enc
        if not self.encoders:  # training-less mode: prior-only encoders
            for col in self.ENCODER_COLS:
                for kind in ("woe", "freq"):
                    self.encoders[f"{col}_{kind}"] = HistoricalEncoder(
                        col, strength=self.woe_smoothing, kind=kind)

    # ------------------------------------------------------------------ state
    def _state(self, cid: str) -> CustomerState:
        st = self.kv.get(f"cust:{cid}")
        return CustomerState.from_dict(st) if st else CustomerState()

    def _save(self, cid: str, st: CustomerState) -> None:
        self.kv.set(f"cust:{cid}", st.to_dict())

    @staticmethod
    def _past_events(st: CustomerState, e: float) -> list:
        return [ev for ev in st.events if ev["e"] < e]

    # ---------------------------------------------------------------- compute
    def compute(self, txn: dict) -> dict:
        ts = pd.Timestamp(txn["txn_ts"])
        e = ts.value / 1e9
        cid = txn["customer_id"]
        st = self._state(cid)
        amt = float(txn["amount"])
        f: dict = {}

        # ---- static / current-txn ----
        hour, dow = int(ts.hour), int(ts.dayofweek)
        f["amount"] = amt
        f["log_amount"] = math.log(max(amt, 1e-3))
        for k in ("merchant_risk_score", "ip_risk_score", "device_age_days",
                  "account_age_days", "failed_auth_attempts"):
            v = txn.get(k)
            f[k] = float(v) if v is not None else np.nan
        f["transaction_hour"] = hour
        f["transaction_dow"] = dow
        f["transaction_month"] = int(ts.month)
        f["is_weekend"] = float(dow >= 5)
        f["is_night"] = float(hour >= 23 or hour < 6)
        f["is_business_hour"] = float(9 <= hour < 18 and dow < 5)
        f["hour_sin"] = math.sin(2 * math.pi * hour / 24)
        f["hour_cos"] = math.cos(2 * math.pi * hour / 24)
        f["dow_sin"] = math.sin(2 * math.pi * dow / 7)
        f["dow_cos"] = math.cos(2 * math.pi * dow / 7)

        # ---- customer velocity (strictly-past events, newest-first scan) ----
        ev = self._past_events(st, e)
        for minutes, lbl in WINDOWS_SEC.items():
            c, _ = self._window_sum(ev, e, minutes * 60)
            f[f"customer_txn_count_{lbl}"] = float(c)
        f["customer_amount_sum_1h"] = self._window_sum(ev, e, 3600)[1]
        f["customer_amount_sum_24h"] = self._window_sum(ev, e, 86400)[1]
        c1, _ = self._window_sum(ev, e, 3600)
        c24, _ = self._window_sum(ev, e, 86400)
        f["customer_amount_avg_1h"] = f["customer_amount_sum_1h"] / c1 if c1 else np.nan
        f["customer_amount_avg_24h"] = (f["customer_amount_sum_24h"] / c24
                                        if c24 else np.nan)
        f["failed_txn_count_24h"] = float(sum(v_["f"] for v_ in ev if v_["e"] >= e - 86400))
        f["auth_failures_24h"] = float(sum(v_["af"] for v_ in ev if v_["e"] >= e - 86400))

        # ---- global merchant / device / ip velocity ----
        mid, dev = str(txn["merchant_id"]), str(txn["device_id"])
        ip = str(txn["ip_address"])
        for lbl, sec in (("1h", 3600), ("24h", 86400)):
            f[f"merchant_txn_count_{lbl}"] = float(self._global_count(f"g:merchant:{mid}", e, sec))
            f[f"device_txn_count_{lbl}"] = float(self._global_count(f"g:device:{dev}", e, sec))
        f["ip_txn_count_24h"] = float(self._global_count(f"g:ip:{ip}", e, 86400))

        # ---- trailing distinct (24h) ----
        w24 = [v_ for v_ in ev if v_["e"] > e - 86400]
        f["unique_merchants_24h"] = float(len({v_["m"] for v_ in w24}))
        f["unique_cities_24h"] = float(len({v_["c"] for v_ in w24}))
        f["unique_devices_24h"] = float(len({v_["d"] for v_ in w24}))
        f["unique_countries_24h"] = float(len({v_["co"] for v_ in w24}))
        f["multi_country_24h_flag"] = float(f["unique_countries_24h"] > 1)

        # ---- expanding history ----
        t = st.totals
        n = t["n"]
        mean = t["sum"] / n if n else np.nan
        if n > 1:
            std = math.sqrt(max((t["sumsq"] - n * mean * mean) / (n - 1), 0.0))
        else:
            std = np.nan
        f["customer_txn_count_hist"] = float(n)
        f["customer_amount_mean_hist"] = mean
        f["customer_amount_std_hist"] = std
        f["customer_amount_min_hist"] = t["min"] if t["min"] is not None else np.nan
        f["customer_amount_max_hist"] = t["max"] if t["max"] is not None else np.nan
        f["customer_amount_sum_hist"] = t["sum"]
        f["amount_ratio_to_mean"] = amt / mean if n else np.nan
        f["amount_ratio_to_median"] = amt / self._median(st.amounts_sorted) if n else np.nan
        f["amount_ratio_to_max"] = (amt / t["max"]
                                    if t["max"] not in (None, 0) else np.nan)
        f["amount_deviation_from_mean"] = amt - mean if n else np.nan
        f["amount_zscore"] = ((amt - mean) / std
                              if (n > 1 and std == std and std > 0) else np.nan)
        w30_cnt = [v_ for v_ in ev if v_["e"] >= e - SEC["30d"]]   # rolling sums: left-inclusive
        w30_uniq = [v_ for v_ in ev if v_["e"] > e - SEC["30d"]]   # distinct: strict (matches SQL '<')
        c30 = len(w30_cnt)
        f["unique_merchants_30d"] = float(len({v_["m"] for v_ in w30_uniq}))
        f["customer_night_ratio_30d"] = (sum(v_["n"] for v_ in w30_cnt) / c30
                                         if c30 else np.nan)
        f["customer_weekend_ratio_30d"] = (sum(v_["w"] for v_ in w30_cnt) / c30
                                           if c30 else np.nan)
        if n:
            typical = math.degrees(math.atan2(t["sin_sum"] / n, t["cos_sum"] / n)) / 15.0 % 24
            f["customer_typical_hour"] = typical
            f["hour_deviation_circular"] = circular_hour_diff(hour, typical)
        else:
            f["customer_typical_hour"] = np.nan
            f["hour_deviation_circular"] = np.nan

        # ---- sequential / previous transaction ----
        prev = ev[-1] if ev else None
        if prev is not None:
            dt = e - prev["e"]
            f["prev_txn_amount"] = prev["a"]
            f["time_since_prev_txn_sec"] = dt
            f["amount_ratio_to_prev"] = amt / prev["a"] if prev["a"] else np.nan
            f["amount_diff_from_prev"] = amt - prev["a"]
            f["amount_spike_flag"] = float(amt / prev["a"] > 5) if prev["a"] else 0.0
            f["merchant_changed_flag"] = float(prev["m"] != mid)
            f["country_changed_flag"] = float(prev["co"] != str(txn["transaction_country"]))
            f["city_changed_flag"] = float(prev["c"] != str(txn["transaction_city"]))
            f["device_changed_flag"] = float(prev["d"] != dev)
            f["rapid_repeat_txn_flag"] = float(dt < 120)
            f["distance_from_prev_km"] = haversine_km(
                txn.get("latitude"), txn.get("longitude"), prev["la"], prev["lo"])
            hours_dt = max(dt / 3600.0, 1.0 / 60.0)
            f["impossible_travel_kmh"] = f["distance_from_prev_km"] / hours_dt
            f["impossible_travel_flag"] = float(f["impossible_travel_kmh"] > 900)
        else:
            for k in ("prev_txn_amount", "time_since_prev_txn_sec",
                      "amount_ratio_to_prev", "amount_diff_from_prev",
                      "distance_from_prev_km", "impossible_travel_kmh"):
                f[k] = np.nan
            f["amount_spike_flag"] = 0.0
            for k in ("merchant_changed_flag", "country_changed_flag",
                      "city_changed_flag", "device_changed_flag"):
                f[k] = 1.0  # everything is "new" on the first observed txn
            f["rapid_repeat_txn_flag"] = 0.0
            f["impossible_travel_flag"] = 0.0
        f["country_change_flag"] = f["country_changed_flag"]
        f["distance_from_home_km"] = haversine_km(
            txn.get("latitude"), txn.get("longitude"),
            txn.get("home_latitude"), txn.get("home_longitude"))

        # ---- new-entity flags ----
        f["new_device_flag"] = float(dev not in st.devices_seen)
        f["new_country_flag"] = float(str(txn["transaction_country"])
                                      not in st.countries_seen)
        f["new_city_flag"] = float(str(txn["transaction_city"]) not in st.cities_seen)
        f["new_merchant_for_customer_flag"] = float(mid not in st.merchants_seen)

        # ---- device / ip behavioral ----
        f["device_txn_count_hist"] = float(self._global_total(f"g:device:{dev}"))
        f["device_customer_count"] = float(len(self.kv.get(f"g:devcust:{dev}", [])))
        f["ip_customer_count"] = float(len(self.kv.get(f"g:ipcust:{ip}", [])))
        f["multiple_customers_same_device_flag"] = float(
            f["device_customer_count"] > 1)
        last_c = st.device_last_country.get(dev)
        f["device_location_mismatch_flag"] = float(
            last_c is not None and last_c != str(txn["transaction_country"]))

        # ---- merchant / category historical stats ----
        prior = float(self.ms.get("prior_rate", 0.02))
        strength = float(self.ms.get("strength", 100))
        mp = self.kv.get(f"prov:merchant:{mid}", [0, 0.0, 0.0])
        f["merchant_txn_count_hist"] = float(mp[0])
        f["merchant_fraud_rate_hist"] = (mp[1] + prior * strength) / (mp[0] + strength)
        f["merchant_avg_amount_hist"] = mp[2] / mp[0] if mp[0] else np.nan
        mcc = str(txn["mcc"])
        m_cnt = self.kv.get(f"prov:count:mcc:{mcc}", 0)
        m_frd = self.kv.get(f"prov:fraud:mcc:{mcc}", 0.0)
        f["mcc_fraud_rate_hist"] = (m_frd + prior * strength) / (m_cnt + strength)
        pair = st.pair_stats.get(mid, (0, 0.0))
        f["customer_merchant_txn_count_90d"] = float(sum(
            1 for v_ in ev if v_["e"] >= e - SEC["90d"] and v_["m"] == mid))
        f["customer_merchant_avg_amount"] = pair[1] / pair[0] if pair[0] else np.nan
        f["new_merchant_global_ratio"] = (f["merchant_txn_count_hist"]
                                          / (f["merchant_txn_count_hist"] + 50.0))

        # ---- historical encodings (identical formula, batch-maintained stats) ----
        values = {"merchant_id": mid, "mcc": str(txn["mcc"]),
                  "merchant_category": str(txn["merchant_category"]),
                  "channel": str(txn["channel"]),
                  "device_type": str(txn["device_type"]),
                  "transaction_country": str(txn["transaction_country"])}
        for col, val in values.items():
            cnt = self.kv.get(f"prov:count:{col}:{val}", 0)
            frd = self.kv.get(f"prov:fraud:{col}:{val}", 0.0)
            enc = self.encoders.get(f"{col}_woe")
            f[f"{col}_woe"] = enc.encode_serving(cnt, frd) if enc else 0.0
            f[f"{col}_freq"] = float(math.log1p(cnt))

        # ---- interactions ----
        f["amount_x_velocity_24h"] = f["log_amount"] * f["customer_txn_count_24h"]
        f["amount_zscore_x_velocity_24h"] = (f["amount_zscore"]
                                             * f["customer_txn_count_24h"])
        f["new_device_x_amount_zscore"] = f["new_device_flag"] * f["amount_zscore"]
        f["new_country_x_log_amount"] = f["new_country_flag"] * f["log_amount"]
        f["night_x_amount_ratio_mean"] = f["is_night"] * f["amount_ratio_to_mean"]
        f["impossible_travel_x_log_amount"] = (f["impossible_travel_flag"]
                                               * f["log_amount"])

        # ---- commit state AFTER computing (strictly past-only guarantee) ----
        event = {"e": e, "a": amt, "m": mid, "d": dev,
                 "c": str(txn["transaction_city"]),
                 "co": str(txn["transaction_country"]),
                 "la": float(txn.get("latitude") or 0.0),
                 "lo": float(txn.get("longitude") or 0.0),
                 "f": float(str(txn.get("status", "approved")) == "declined"),
                 "af": 1.0 if float(txn.get("failed_auth_attempts") or 0) > 0 else 0.0,
                 "n": float(hour >= 23 or hour < 6), "w": float(dow >= 5)}
        st.events.append(event)
        if len(st.events) > self.max_events:
            st.events.popleft()
        t["n"] += 1
        t["sum"] += amt
        t["sumsq"] += amt * amt
        t["min"] = amt if t["min"] is None else min(t["min"], amt)
        t["max"] = amt if t["max"] is None else max(t["max"], amt)
        t["sin_sum"] += f["hour_sin"]
        t["cos_sum"] += f["hour_cos"]
        insort(st.amounts_sorted, amt)
        st.merchants_seen.add(mid)
        st.devices_seen.add(dev)
        st.countries_seen.add(str(txn["transaction_country"]))
        st.cities_seen.add(str(txn["transaction_city"]))
        st.pair_stats[mid] = (pair[0] + 1, pair[1] + amt)
        st.device_last_country[dev] = str(txn["transaction_country"])
        self._save(cid, st)
        for key in (f"g:merchant:{mid}", f"g:device:{dev}", f"g:ip:{ip}"):
            self._bump_global(key, e, 30 * 86400)
        self._add_unique(f"g:devcust:{dev}", cid)
        self._add_unique(f"g:ipcust:{ip}", cid)
        mp2 = self.kv.get(f"prov:merchant:{mid}", [0, 0.0, 0.0])
        self.kv.set(f"prov:merchant:{mid}", [mp2[0] + 1, mp2[1], mp2[2] + amt])
        for col, val in values.items():
            k = f"prov:count:{col}:{val}"
            self.kv.set(k, self.kv.get(k, 0) + 1)
        return f

    # ------------------------------------------------------------- labels
    def record_label(self, txn: dict) -> None:
        """Backfill fraud labels into historical rate providers (batch job)."""
        if txn.get("is_fraud") is None:
            return
        y = float(bool(txn["is_fraud"]))
        mid = str(txn["merchant_id"])
        mp = self.kv.get(f"prov:merchant:{mid}", [0, 0.0, 0.0])
        self.kv.set(f"prov:merchant:{mid}", [mp[0], mp[1] + y, mp[2]])
        pairs = (("merchant_id", mid),
                 ("mcc", str(txn["mcc"])),
                 ("merchant_category", str(txn.get("merchant_category"))),
                 ("channel", str(txn.get("channel"))),
                 ("device_type", str(txn.get("device_type"))),
                 ("transaction_country", str(txn.get("transaction_country"))))
        for col, val in pairs:
            if val is None:
                continue
            k = f"prov:fraud:{col}:{val}"
            self.kv.set(k, self.kv.get(k, 0.0) + y)

    # ------------------------------------------------------------- helpers
    @staticmethod
    def _window_sum(events, e: float, sec: float):
        """(count, sum) over [e-sec, e) — matches pandas closed='left': the left
        edge is INCLUDED, the current instant is EXCLUDED. Events time-ascending."""
        c, s = 0, 0.0
        for v in reversed(events):
            if v["e"] < e - sec:
                break
            c += 1
            s += v["a"]
        return c, s

    def _global_count(self, key: str, e: float, sec: float) -> int:
        return sum(1 for t in self.kv.get(key, []) if t >= e - sec)

    def _global_total(self, key: str) -> int:
        return len(self.kv.get(key, []))

    def _bump_global(self, key: str, e: float, horizon: float) -> None:
        lst = [t for t in self.kv.get(key, []) if t > e - horizon]
        lst.append(e)
        self.kv.set(key, lst)

    def _add_unique(self, key: str, value) -> None:
        lst = self.kv.get(key, [])
        if value not in lst:
            lst.append(value)
            self.kv.set(key, lst)

    @staticmethod
    def _median(sorted_list) -> float:
        n = len(sorted_list)
        if not n:
            return np.nan
        mid = n // 2
        return (sorted_list[mid] if n % 2
                else (sorted_list[mid - 1] + sorted_list[mid]) / 2.0)





