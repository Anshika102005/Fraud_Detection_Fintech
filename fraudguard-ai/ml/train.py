"""CLI entry point: train the FraudGuard model and persist artifacts.

Usage (from fraudguard-ai/):
    python -m ml.train                # train on synthetic demo data
    python -m ml.train --users 80 --txns-per-user 150
"""
from __future__ import annotations

import argparse
import json

from ml import demo_data
from ml.models.fraud_model import save_artifacts, train_model


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the FraudGuard AI fraud-detection model")
    parser.add_argument("--users", type=int, default=40)
    parser.add_argument("--txns-per-user", type=int, default=120)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    print("[train] generating synthetic dataset ...")
    dataset = demo_data.generate_synthetic_dataset(
        n_users=args.users,
        txns_per_user=args.txns_per_user,
        random_seed=args.seed,
    )
    fraud_count = int(dataset["is_fraud"].sum())
    print(f"[train] dataset: {len(dataset)} rows, fraud={fraud_count} "
          f"({100.0 * fraud_count / len(dataset):.1f}%)")

    print("[train] engineering features (leak-free per-user history) ...")
    model, preprocessor, feature_names, metrics = train_model(dataset)

    out = save_artifacts(model, preprocessor, feature_names, metrics)
    print(f"[train] artifacts saved to {out}")
    print("[train] metrics:", json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
