"""Synthetic transaction generator with realistic fraud attack patterns.

Produces a point-in-time realistic transaction log:
  - legitimate behavior: per-customer spend baseline, preferred hours/merchants,
    home geography, owned devices
  - fraud episodes: card testing bursts, account takeover (new device + impossible
    travel), high-amount cash-out at unusual hours
  - delayed labels: is_fraud becomes known only after `label_ts` (chargeback lag)

This is the *only* dataset dependency of the project, making the whole pipeline
self-contained and reproducible (seeded).
"""
from __future__ import annotations

import argparse
import uuid
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]

MCCS = [
    (5411, "grocery", 0.005), (5812, "restaurant", 0.005), (5311, "retail", 0.006),
    (5732, "electronics", 0.030), (5912, "pharmacy", 0.004), (5541, "fuel", 0.006),
    (4111, "transport", 0.005), (4812, "telecom", 0.008), (5945, "hobby_toys", 0.008),
    (5651, "clothing", 0.007), (7011, "hotels", 0.015), (4121, "taxi", 0.006),
    (5999, "misc_retail", 0.010), (5942, "books", 0.005), (5712, "furniture", 0.012),
    (5944, "jewelry", 0.035), (5734, "software", 0.040), (5968, "subscription", 0.025),
    (5655, "sports", 0.006), (5412, "fast_food", 0.004),
]
COUNTRIES = ["US", "CA", "MX", "GB", "DE"]
US_CITIES = ["new_york", "chicago", "houston", "phoenix", "denver", "seattle",
             "miami", "boston", "austin", "dallas"]
FOREIGN_CITIES = {"CA": ["toronto", "vancouver"], "MX": ["mexico_city", "cancun"],
                  "GB": ["london", "manchester"], "DE": ["berlin", "munich"]}
CITY_COORDS = {  # rough coords for distance realism
    "new_york": (40.7, -74.0), "chicago": (41.9, -87.6), "houston": (29.8, -95.4),
    "phoenix": (33.4, -112.1), "denver": (39.7, -105.0), "seattle": (47.6, -122.3),
    "miami": (25.8, -80.2), "boston": (42.4, -71.1), "austin": (30.3, -97.7),
    "dallas": (32.8, -96.8), "toronto": (43.7, -79.4), "vancouver": (49.3, -123.1),
    "mexico_city": (19.4, -99.1), "cancun": (21.2, -86.8), "london": (51.5, -0.13),
    "manchester": (53.5, -2.2), "berlin": (52.5, 13.4), "munich": (48.1, 11.6),
}
DEVICE_TYPES = ["mobile", "desktop", "tablet"]
OSS = {"mobile": ["ios", "android"], "desktop": ["windows", "macos", "linux"],
       "tablet": ["ios", "android"]}
BROWSERS = {"ios": ["safari"], "android": ["chrome"], "windows": ["chrome", "edge"],
            "macos": ["safari", "chrome"], "linux": ["firefox", "chrome"]}
AUTH_BY_CHANNEL = {"pos": ["chip_pin", "contactless"], "ecom": ["cvv", "threeds"],
                   "atm": ["pin"], "moto": ["cvv"]}
CHANNELS = ["pos", "ecom", "atm", "moto"]
CHANNEL_W = [0.45, 0.38, 0.10, 0.07]


def _row_template(n: int, rng: np.random.Generator) -> dict[str, np.ndarray]:
    return {
        "transaction_id": np.array([str(uuid.UUID(int=int(rng.integers(0, 2**128))))
                                    for _ in range(n)]),
        "amount": np.zeros(n), "txn_ts": np.zeros(n, dtype="datetime64[ns]"),
    }


def _uuid(rng) -> str:
    """Seeded random UUID (uuid4 format from generator bytes)."""
    return str(uuid.UUID(bytes=rng.bytes(16), version=4))


def _gen_customers(n: int, start: pd.Timestamp, rng) -> pd.DataFrame:
    return pd.DataFrame({
        "customer_id": [f"c{i:06d}" for i in range(n)],
        "card_id": [f"card_{i:06d}_{1 if rng.random() > 0.85 else 0}" for i in range(n)],
        "signup_ts": start - pd.to_timedelta(rng.integers(90, 1100, n), unit="D"),
        "home_city": rng.choice(US_CITIES, n),
        "customer_country": "US",
        "base_amount": np.exp(rng.normal(np.log(45), 0.6, n)),
        "amount_sigma": rng.uniform(0.35, 0.85, n),
        "txn_per_day": rng.uniform(0.4, 3.0, n),
        "active_hour": rng.integers(7, 22, n),
        "preferred_mcc": rng.choice([m[0] for m in MCCS], n),
        "device_ids": [[f"dev{i}_{j}" for j in range(rng.integers(1, 4))]
                       for i in range(n)],
    })


def _gen_merchants(n: int, rng) -> pd.DataFrame:
    mcc_idx = rng.integers(0, len(MCCS), n)
    mccs = [MCCS[i] for i in mcc_idx]
    return pd.DataFrame({
        "merchant_id": [f"m{i:05d}" for i in range(n)],
        "mcc": [m[0] for m in mccs],
        "merchant_category": [m[1] for m in mccs],
        "merchant_country": rng.choice(COUNTRIES, n, p=[0.80, 0.08, 0.05, 0.04, 0.03]),
        "merchant_city": rng.choice(US_CITIES + ["toronto", "london", "berlin"], n),
        "merchant_risk_score": np.round(rng.beta(2, 8, n), 3),
    })


def _device_meta(device_id: str, rng) -> tuple[str, str, str]:
    dtype = rng.choice(DEVICE_TYPES)
    os = rng.choice(OSS[dtype])
    browser = rng.choice(BROWSERS[os])
    return dtype, os, browser


def _inject_fraud(legit: pd.DataFrame, cust_df: pd.DataFrame, merch_df: pd.DataFrame,
                  rng, target_rate: float) -> pd.DataFrame:
    """Inject card-testing bursts, account-takeover and high-amount cash-outs."""
    merch_by_mcc: dict[int, list[int]] = {}
    for i, m in enumerate(merch_df["mcc"]):
        merch_by_mcc.setdefault(m, []).append(i)
    ecom_mccs = [5732, 5734, 5968, 5944, 5999]
    episodes: list[dict] = []
    quota = int(len(legit) * target_rate / (1 - target_rate))
    {c.customer_id: i for i, c in enumerate(cust_df.itertuples())}
    # Anchor episodes at a RANDOM past transaction of the victim (NOT the last):
    # anchoring at the last txn would cluster all frauds at the timeline's end,
    # starving early time-folds of positives (a classic synthetic-data trap).
    anchor_by_cust = legit.groupby("customer_id").sample(
        n=1, random_state=int(rng.integers(0, 2**31 - 1))).set_index("customer_id")
    victims = rng.choice(len(cust_df), size=min(len(cust_df), quota), replace=False)

    while len(episodes) < quota and len(victims) > 0:
        vi = int(rng.choice(victims))
        c = cust_df.iloc[vi]
        if c.customer_id not in anchor_by_cust.index:
            victims = victims[victims != vi]
            continue
        last = anchor_by_cust.loc[c.customer_id]
        kind = rng.choice(["card_testing", "account_takeover", "high_amount"],
                          p=[0.35, 0.35, 0.30])
        if kind == "card_testing" and len(episodes) + 6 <= quota:
            # burst of tiny amounts on a NEW device at ecom merchants, then cash-out
            t0 = last["txn_ts"] + pd.Timedelta(minutes=float(rng.integers(30, 240)))
            burst_n = int(rng.integers(4, 9))
            new_dev = f"devF{rng.integers(0, 10**6)}"
            for j in range(burst_n + 1):
                mi = int(rng.choice(merch_by_mcc.get(int(rng.choice(ecom_mccs)), [0])))
                merch_df.iloc[mi]
                ts = t0 + pd.Timedelta(seconds=float(rng.integers(15, 120))) * j
                cash_out = j == burst_n
                episodes.append(dict(
                    customer_id=c.customer_id, card_id=c.card_id,
                    transaction_ts=ts, amount=float(min(25_000, c.base_amount * rng.uniform(15, 40)))
                    if cash_out else float(rng.uniform(1, 12)),
                    merchant_idx=mi, channel="ecom", status="approved",
                    device_id=new_dev, is_fraud=1,
                    failed_auth_attempts=int(rng.integers(0, 2)),
                    threeds_result="bypass" if cash_out else "failed",
                    cvv_result="mismatch" if rng.random() < 0.5 else "match",
                ))
        elif kind == "account_takeover" and len(episodes) + 3 <= quota:
            # failed attempts, then success from a NEW device in a FAR location
            t0 = last["txn_ts"] + pd.Timedelta(minutes=float(rng.integers(10, 90)))
            new_dev = f"devA{rng.integers(0, 10**6)}"
            far_city = str(rng.choice(
                [ct for cs in FOREIGN_CITIES.values() for ct in cs]))
            country = next(k for k, v in FOREIGN_CITIES.items() if far_city in v)
            flat, flon = CITY_COORDS[far_city]
            mi = int(rng.choice(merch_by_mcc.get(int(rng.choice(ecom_mccs)), [0])))
            for j in range(int(rng.integers(1, 3))):  # failed attempts
                episodes.append(dict(
                    customer_id=c.customer_id, card_id=c.card_id,
                    transaction_ts=t0 - pd.Timedelta(minutes=float(5 * (j + 1))),
                    amount=float(c.base_amount), merchant_idx=mi, channel="ecom",
                    status="declined", device_id=new_dev, is_fraud=1,
                    failed_auth_attempts=int(rng.integers(2, 4)),
                    threeds_result="failed", cvv_result="mismatch",
                    latitude=flat, longitude=flon, city=far_city, country=country,
                ))
            episodes.append(dict(
                customer_id=c.customer_id, card_id=c.card_id,
                transaction_ts=t0,
                amount=float(min(25_000, c.base_amount * rng.uniform(8, 30))),
                merchant_idx=mi, channel="ecom", status="approved", device_id=new_dev,
                is_fraud=1, failed_auth_attempts=0, threeds_result="bypass",
                cvv_result="match", latitude=flat, longitude=flon,
                city=far_city, country=country,
                # impossible travel: ~5000km from the previous txn within minutes
                prev_lat=float(last["latitude"]), prev_lon=float(last["longitude"]),
                prev_ts=last["txn_ts"],
            ))
        else:  # high_amount cash-out on the STOLEN CARD at an odd hour
            ts = last["txn_ts"] + pd.Timedelta(minutes=float(rng.integers(20, 180)))
            mi = int(rng.choice(merch_by_mcc.get(int(rng.choice([5732, 5944, 5734])), [0])))
            episodes.append(dict(
                customer_id=c.customer_id, card_id=c.card_id, transaction_ts=ts,
                amount=float(min(25_000, c.base_amount * rng.uniform(10, 40))),
                merchant_idx=mi, channel=rng.choice(["pos", "ecom"]),
                status="approved", device_id=str(rng.choice(c.device_ids)),
                is_fraud=1, failed_auth_attempts=int(rng.integers(0, 2)),
                threeds_result="passed", cvv_result="match",
            ))
        victims = victims[victims != vi]
    return episodes


def _build_legit(cust_df: pd.DataFrame, merch_df: pd.DataFrame, start: pd.Timestamp,
                 days: int, rng) -> pd.DataFrame:
    merch_by_mcc: dict[int, list[int]] = {}
    for i, m in enumerate(merch_df["mcc"]):
        merch_by_mcc.setdefault(int(m), []).append(i)
    all_idx = list(range(len(merch_df)))
    foreign_pairs = [(cty, city) for cty, cs in FOREIGN_CITIES.items() for city in cs]
    dev_cache: dict[str, tuple] = {}
    city_code = {c: i + 1 for i, c in enumerate(set(US_CITIES).union(*FOREIGN_CITIES.values()))}
    parts: list[pd.DataFrame] = []

    for c in cust_df.itertuples():
        n = int(rng.poisson(max(c.txn_per_day, 0.05) * days))
        if n == 0:
            continue
        day = rng.integers(0, days, n)
        hour = np.mod(np.round(rng.normal(c.active_hour, 2.5, n)), 24).astype(int)
        ts = start + pd.to_timedelta(day * 86400 + hour * 3600
                                     + rng.integers(0, 3600, n), unit="s")
        mid = np.array([
            rng.choice(merch_by_mcc.get(int(c.preferred_mcc), all_idx))
            if rng.random() < 0.70 else rng.choice(all_idx) for _ in range(n)
        ])
        merch = merch_df.iloc[mid]
        amount = np.round(np.exp(rng.normal(np.log(c.base_amount), c.amount_sigma, n)), 2)
        amount = amount.clip(1.0, 25000.0)

        r = rng.random(n)
        home, foreign = r < 0.85, r >= 0.95
        fidx = rng.integers(0, len(foreign_pairs), n)
        f_city = np.array([foreign_pairs[i][1] for i in fidx])
        f_cty = np.array([foreign_pairs[i][0] for i in fidx])
        d_city = rng.choice(US_CITIES, n)
        city = np.where(home, c.home_city, np.where(foreign, f_city, d_city))
        country = np.where(home, "US", np.where(foreign, f_cty, "US"))
        base = np.array([CITY_COORDS.get(ct, (39.5, -98.35)) for ct in city])
        lat = base[:, 0] + rng.normal(0, 0.05, n)
        lon = base[:, 1] + rng.normal(0, 0.05, n)

        channel = rng.choice(CHANNELS, n, p=CHANNEL_W)
        auth = np.array([rng.choice(AUTH_BY_CHANNEL[ch]) for ch in channel])
        dev = np.array([str(rng.choice(c.device_ids)) for _ in range(n)])
        for d in dev:
            if d not in dev_cache:
                dt_, os_, br_ = _device_meta(d, rng)
                dev_cache[d] = (dt_, os_, br_, int(rng.integers(30, 900)))
        dtype = np.array([dev_cache[d][0] for d in dev])
        dos = np.array([dev_cache[d][1] for d in dev])
        dbr = np.array([dev_cache[d][2] for d in dev])
        dage = np.array([dev_cache[d][3] for d in dev], dtype=float)

        parts.append(pd.DataFrame({
            "transaction_id": [_uuid(rng) for _ in range(n)],
            "customer_id": c.customer_id, "card_id": c.card_id,
            "merchant_id": merch["merchant_id"].to_numpy(),
            "mcc": merch["mcc"].to_numpy(),
            "merchant_category": merch["merchant_category"].to_numpy(),
            "merchant_country": merch["merchant_country"].to_numpy(),
            "merchant_city": merch["merchant_city"].to_numpy(),
            "merchant_risk_score": merch["merchant_risk_score"].to_numpy(),
            "txn_ts": ts, "amount": amount, "currency": "USD",
            "channel": channel, "status": np.where(rng.random(n) < 0.993, "approved", "declined"),
            "transaction_country": country, "transaction_city": city,
            "latitude": np.round(lat, 5), "longitude": np.round(lon, 5),
            "home_latitude": CITY_COORDS[c.home_city][0] + rng.normal(0, 0.1),
            "home_longitude": CITY_COORDS[c.home_city][1] + rng.normal(0, 0.1),
            "device_id": dev, "device_type": dtype, "operating_system": dos,
            "browser": dbr,
            "device_age_days": dage,
            "ip_address": [f"10.{city_code.get(ct, 0) % 250}.{rng.integers(1, 254)}."
                           f"{rng.integers(1, 254)}" for ct in city],
            "ip_risk_score": np.round(rng.beta(2, 20, n) * 0.4, 3),
            "authentication_method": auth,
            "cvv_result": np.where(rng.random(n) < 0.97, "match", "mismatch"),
            "pin_verified": np.where(channel == "atm", rng.random(n) < 0.98, False),
            "threeds_result": np.where(channel == "ecom",
                                       np.where(rng.random(n) < 0.95, "passed", "failed"),
                                       "not_applicable"),
            "biometric_verified": (dtype == "mobile") & (rng.random(n) < 0.30),
            "failed_auth_attempts": np.where(rng.random(n) < 0.05,
                                             rng.integers(1, 3, n), 0),
            "account_age_days": ((ts - c.signup_ts).total_seconds() // 86400).astype(int),
            "is_fraud": 0,
            "label_ts": ts + pd.Timedelta(days=1),
        }))
    df = pd.concat(parts, ignore_index=True)
    return df

def _episodes_to_rows(episodes: list[dict], cust_df: pd.DataFrame,
                      merch_df: pd.DataFrame, rng) -> pd.DataFrame:
    cust_by_id = cust_df.set_index("customer_id")
    dev_cache: dict[str, tuple] = {}
    rows = []
    for e in episodes:
        c = cust_by_id.loc[e["customer_id"]]
        merch = merch_df.iloc[e["merchant_idx"]]
        dev = e["device_id"]
        if dev not in dev_cache:
            if dev.startswith(("devF", "devA")):  # attacker-controlled device
                dt, dos, dbr = _device_meta(dev, rng)
                dev_cache[dev] = (dt, dos, dbr, 0)
            else:
                dt, dos, dbr = _device_meta(dev, rng)
                dev_cache[dev] = (dt, dos, dbr, int(rng.integers(30, 900)))
        dtype, dos, dbr, dage = dev_cache[dev]
        city = e.get("city", c.home_city)
        country = e.get("country", "US")
        if "latitude" in e:
            lat, lon = e["latitude"], e["longitude"]
        else:
            base = CITY_COORDS.get(city, (39.5, -98.35))
            lat, lon = base[0] + rng.normal(0, 0.05), base[1] + rng.normal(0, 0.05)
        ts = pd.Timestamp(e["transaction_ts"])
        rows.append({
            "transaction_id": _uuid(rng),
            "customer_id": e["customer_id"], "card_id": c.card_id,
            "merchant_id": merch["merchant_id"], "mcc": int(merch["mcc"]),
            "merchant_category": merch["merchant_category"],
            "merchant_country": merch["merchant_country"],
            "merchant_city": merch["merchant_city"],
            "merchant_risk_score": float(merch["merchant_risk_score"]),
            "txn_ts": ts, "amount": float(np.round(e["amount"], 2)), "currency": "USD",
            "channel": e["channel"], "status": e["status"],
            "transaction_country": country, "transaction_city": city,
            "latitude": round(float(lat), 5), "longitude": round(float(lon), 5),
            "home_latitude": CITY_COORDS[c.home_city][0],
            "home_longitude": CITY_COORDS[c.home_city][1],
            "device_id": dev, "device_type": dtype, "operating_system": dos,
            "browser": dbr,
            "ip_address": f"45.{rng.integers(1, 254)}.{rng.integers(1, 254)}."
                          f"{rng.integers(1, 254)}",
            "ip_risk_score": round(float(rng.uniform(0.55, 0.95)), 3),
            "device_age_days": dage,
            "authentication_method": rng.choice(AUTH_BY_CHANNEL[e["channel"]]),
            "cvv_result": e.get("cvv_result", "match"),
            "pin_verified": e["channel"] == "atm",
            "threeds_result": e.get("threeds_result",
                                    "not_applicable" if e["channel"] != "ecom"
                                    else "passed"),
            "biometric_verified": False,
            "failed_auth_attempts": int(e.get("failed_auth_attempts", 0)),
            "account_age_days": int((ts - c.signup_ts).total_seconds() // 86400),
            "is_fraud": 1,
            "label_ts": ts + pd.Timedelta(days=int(rng.integers(3, 15))),
        })
    return pd.DataFrame(rows)


def generate(n_customers: int = 2000, n_merchants: int = 400, days: int = 90,
             fraud_rate: float = 0.008, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    start = pd.Timestamp.today().normalize() - pd.Timedelta(days=days)
    cust_df = _gen_customers(n_customers, start, rng)
    merch_df = _gen_merchants(n_merchants, rng)
    legit = _build_legit(cust_df, merch_df, start, days, rng)
    episodes = _inject_fraud(legit, cust_df, merch_df, rng, fraud_rate)
    fraud_df = _episodes_to_rows(episodes, cust_df, merch_df, rng)
    df = (pd.concat([legit, fraud_df], ignore_index=True)
          .sort_values(["txn_ts", "transaction_id"], kind="mergesort")
          .reset_index(drop=True))
    return df


def main() -> None:
    p = argparse.ArgumentParser(description="Generate synthetic transactions")
    p.add_argument("--cards", type=int, default=2000)
    p.add_argument("--merchants", type=int, default=400)
    p.add_argument("--days", type=int, default=90)
    p.add_argument("--fraud-rate", type=float, default=0.008)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--out", default=str(ROOT / "data" / "processed" / "transactions.parquet"))
    args = p.parse_args()

    df = generate(args.cards, args.merchants, args.days, args.fraud_rate, args.seed)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.suffix == ".parquet":
        try:
            df.to_parquet(out, index=False)
        except Exception:
            out = out.with_suffix(".csv")
            df.to_csv(out, index=False)
    else:
        df.to_csv(out, index=False)

    from src.data.validators import validate_transactions
    report = validate_transactions(df)
    rate = df["is_fraud"].mean()
    print(f"saved {len(df):,} transactions -> {out}")
    print(f"fraud rate: {rate:.4%} ({int(df['is_fraud'].sum()):,} fraud txns)")
    print(report.summary())


if __name__ == "__main__":
    main()



