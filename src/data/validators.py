"""Data validation gates (pre-DB and pre-training).

Small, dependency-free analogue of Great Expectations: deterministic checks with
an actionable report. The API path reuses the same rules via Pydantic schemas.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

REQUIRED_COLS = [
    "transaction_id", "customer_id", "card_id", "merchant_id", "mcc",
    "amount", "txn_ts", "channel", "is_fraud", "label_ts",
]


class DataValidationError(RuntimeError):
    pass


@dataclass
class ValidationReport:
    rows: int
    checks_passed: int = 0
    failures: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.failures

    def summary(self) -> str:
        status = "PASS" if self.ok else "FAIL"
        return f"[{status}] rows={self.rows} checks_passed={self.checks_passed} " \
               f"failures={self.failures}"


def validate_transactions(df: pd.DataFrame, max_future_skew_sec: int = 300) -> ValidationReport:
    report = ValidationReport(rows=len(df))

    def check(cond: bool, msg: str) -> None:
        if cond:
            report.checks_passed += 1
        else:
            report.failures.append(msg)

    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    check(not missing, f"missing_columns:{missing}")
    if missing:
        return report

    check(df["transaction_id"].is_unique, "duplicate_transaction_id")
    check(df["amount"].gt(0).all(), "amount_not_positive")
    check(df["txn_ts"].notna().all(), "null_txn_ts")
    check(df["is_fraud"].isin([0, 1, True, False]).all(), "invalid_label")
    if pd.api.types.is_datetime64_any_dtype(df["txn_ts"]):
        now = pd.Timestamp.now(tz=df["txn_ts"].dt.tz) if df["txn_ts"].dt.tz else pd.Timestamp.now()
        check(df["txn_ts"].max() <= now + pd.Timedelta(seconds=max_future_skew_sec),
              "future_timestamps")
    fraud = df["is_fraud"].astype(bool)
    if "label_ts" in df.columns:
        check((df.loc[fraud, "label_ts"] >= df.loc[fraud, "txn_ts"]).all(),
              "label_before_transaction")
    return report
