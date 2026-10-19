"""Transaction provider abstraction (future financial-data integration point).

FraudGuard AI has NO direct bank/UPI/payment-provider API access. Transaction
data enters the system ONLY through the providers below. The abstraction
mirrors how an `AuthorizedFinancialDataProvider` would plug in later without
touching the ML or API layers.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Protocol

from app.utils.security import hash_identifier


@dataclass
class TransactionIn:
    """Normalized inbound transaction, independent of its source."""

    amount: float
    transaction_datetime: datetime
    merchant: str
    merchant_category: str
    payment_method: str
    location: str | None = None
    device_type: str | None = None
    transaction_reference: str | None = None
    device_id_hash: str | None = None
    ip_hash: str | None = None
    currency: str = "INR"
    source: str = "manual"
    notes: str | None = None


@dataclass
class SyncResult:
    created: int = 0
    skipped_duplicates: int = 0
    errors: list[str] = field(default_factory=list)


class TransactionProvider(Protocol):
    """Every ingestion path implements this interface.

    fetch_transactions() / get_transaction() / sync_transactions()
    """

    def fetch_transactions(self, user_id: int, **kwargs) -> list[TransactionIn]: ...
    def get_transaction(self, user_id: int, reference: str) -> TransactionIn | None: ...
    def sync_transactions(self, db, user, **kwargs) -> SyncResult: ...


class ManualTransactionProvider:
    """Wraps a single user-submitted transaction (POST /api/transactions)."""

    def __init__(self, payload: TransactionIn) -> None:
        self._payload = payload

    def fetch_transactions(self, user_id: int, **kwargs) -> list[TransactionIn]:
        return [self._payload]

    def get_transaction(self, user_id: int, reference: str) -> TransactionIn | None:
        return None

    def sync_transactions(self, db, user, **kwargs) -> SyncResult:
        from app.models import Transaction
        from app.services.fraud_detection_service import analyze_transaction

        result = SyncResult()
        for txn_in in self.fetch_transactions(user.id):
            txn = Transaction(user_id=user.id, **_model_kwargs(txn_in))
            db.add(txn)
            db.flush()
            analyze_transaction(db, user, txn)
            result.created += 1
        return result


class CSVTransactionProvider:
    """Ingests cleaned rows from an uploaded CSV (POST /api/transactions/upload)."""

    def __init__(self, rows: list[TransactionIn]) -> None:
        self._rows = rows

    def fetch_transactions(self, user_id: int, **kwargs) -> list[TransactionIn]:
        return self._rows

    def get_transaction(self, user_id: int, reference: str) -> TransactionIn | None:
        for row in self._rows:
            if row.transaction_reference == reference:
                return row
        return None

    def sync_transactions(self, db, user, **kwargs) -> SyncResult:
        from app.models import Transaction
        from app.services.fraud_detection_service import analyze_transaction

        result = SyncResult()
        seen_references: set[str] = set()
        for txn_in in self.fetch_transactions(user.id):
            ref = txn_in.transaction_reference
            if ref and ref in seen_references:
                result.skipped_duplicates += 1
                continue
            if ref:
                seen_references.add(ref)
                exists = (
                    db.query(Transaction.id)
                    .filter(
                        Transaction.user_id == user.id,
                        Transaction.transaction_reference == ref,
                    )
                    .first()
                )
                if exists:
                    result.skipped_duplicates += 1
                    continue
            try:
                txn = Transaction(user_id=user.id, **_model_kwargs(txn_in))
                db.add(txn)
                db.flush()
                analyze_transaction(db, user, txn)
                result.created += 1
            except Exception as exc:  # noqa: BLE001 - per-row isolation
                db.rollback()
                result.errors.append(f"Row '{ref or txn_in.merchant}': {exc}")
        return result


class DemoTransactionProvider:
    """Generates synthetic demo transactions for the demo user flow."""

    def __init__(self, n_rows: int = 90, seed: int = 7) -> None:
        self._n = n_rows
        self._seed = seed

    def fetch_transactions(self, user_id: int, **kwargs) -> list[TransactionIn]:
        import random

        from ml.demo_data import LOCATIONS, MERCHANTS, PAYMENT_METHODS

        rng = random.Random(self._seed)
        rows: list[TransactionIn] = []
        now = datetime.now().replace(microsecond=0)
        fav = ["Food & Dining", "Transport", "Shopping", "Groceries", "Entertainment"]
        fav_merchants = {c: MERCHANTS[c] for c in fav}
        base = rng.uniform(200, 700)
        for i in range(self._n):
            is_fraud_pattern = i in {self._n - 12, self._n - 7, self._n - 3, self._n - 1}
            if is_fraud_pattern:
                category = "Electronics"
                merchant = "QuickCash Electronics"
                amount = rng.uniform(8000, 45000)
                hour = rng.choice([1, 2, 3])
                location = rng.choice([l for l in LOCATIONS if l != "Raipur"])
            else:
                category = rng.choice(fav)
                merchant = rng.choice(fav_merchants[category])
                amount = max(30, rng.gauss(base, base * 0.5))
                hour = rng.randint(7, 22)
                location = "Raipur" if rng.random() < 0.85 else "Bhilai"
            rows.append(TransactionIn(
                amount=round(float(amount), 2),
                transaction_datetime=now.replace(
                    hour=hour, minute=rng.randint(0, 59), second=0
                ),
                merchant=merchant,
                merchant_category=category,
                payment_method=rng.choice(PAYMENT_METHODS[:3]),
                location=location,
                device_type="mobile",
                transaction_reference=f"DEMO{i:04d}",
                source="demo",
            ))
        return rows

    def get_transaction(self, user_id: int, reference: str) -> TransactionIn | None:
        return None

    def sync_transactions(self, db, user, **kwargs) -> SyncResult:
        from app.models import Transaction
        from app.services.fraud_detection_service import analyze_transaction

        result = SyncResult()
        for txn_in in self.fetch_transactions(user.id):
            txn = Transaction(user_id=user.id, **_model_kwargs(txn_in))
            db.add(txn)
            db.flush()
            analyze_transaction(db, user, txn, create_alert=False)
            result.created += 1
        return result


def _model_kwargs(txn_in: TransactionIn) -> dict:
    """Map normalized input to Transaction ORM kwargs. Raw device/IP values are
    hashed; sensitive data (UPI PIN/OTP/CVV/card numbers) is never accepted."""
    return {
        "amount": txn_in.amount,
        "transaction_datetime": txn_in.transaction_datetime,
        "merchant": txn_in.merchant,
        "merchant_category": txn_in.merchant_category,
        "payment_method": txn_in.payment_method,
        "location": txn_in.location,
        "device_type": txn_in.device_type,
        "transaction_reference": txn_in.transaction_reference,
        "device_id_hash": txn_in.device_id_hash or hash_identifier(None),
        "ip_hash": txn_in.ip_hash or hash_identifier(None),
        "currency": txn_in.currency,
        "source": txn_in.source,
        "notes": txn_in.notes,
    }
