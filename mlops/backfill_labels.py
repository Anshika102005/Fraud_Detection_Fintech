"""Chargeback label backfill (closes the delayed-label feedback loop).

In production, chargebacks land in a payment-system export; this job writes the
ground truth back into `transactions` and (conceptually) refreshes the
label-dependent online providers (merchant/MCC fraud rates) used by serving.

  python -m mlops.backfill_labels --input chargebacks.csv --database-url ...
"""
from __future__ import annotations

import argparse

import pandas as pd


def main() -> None:
    p = argparse.ArgumentParser(description="Backfill fraud labels")
    p.add_argument("--input", required=True, help="CSV: transaction_id,is_fraud,label_ts")
    p.add_argument("--database-url", default=None)
    args = p.parse_args()

    df = pd.read_csv(args.input)
    required = {"transaction_id", "is_fraud", "label_ts"}
    missing = required - set(df.columns)
    if missing:
        raise SystemExit(f"input missing columns: {missing}")

    url = args.database_url
    if not url:
        from src.config import get_settings
        url = get_settings().database_url
    if not url:
        print("no DATABASE_URL set — dry run only:")
        print(df.head(10).to_string())
        print(f"would update {len(df)} labels "
              f"({int(pd.to_numeric(df['is_fraud']).sum())} frauds)")
        return

    from sqlalchemy import text

    from src.data.db import get_engine
    engine = get_engine(url)
    updated = 0
    with engine.begin() as conn:
        for row in df.itertuples(index=False):
            res = conn.execute(text(
                "UPDATE transactions SET is_fraud = :fraud, label_ts = :label_ts "
                "WHERE transaction_id = :tid AND label_ts IS NULL"),
                {"fraud": bool(row.is_fraud), "label_ts": row.label_ts,
                 "tid": row.transaction_id})
            updated += res.rowcount
    print(f"backfilled {updated}/{len(df)} labels "
          "(rows with existing labels are never overwritten)")


if __name__ == "__main__":
    main()
