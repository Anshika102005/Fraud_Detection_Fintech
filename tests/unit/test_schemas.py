"""Pydantic contracts: garbage never reaches the scoring engine."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from src.api.schemas import BatchRequest, TransactionRequest


def _base(**over):
    payload = {
        "customer_id": "c1", "merchant_id": "m1", "device_id": "d1",
        "transaction_amount": 150.0,
        "transaction_timestamp": datetime.utcnow().isoformat(),
    }
    payload.update(over)
    return payload


def test_valid_request_with_blueprint_aliases():
    req = TransactionRequest(**_base())
    d = req.to_engine_dict()
    assert d["amount"] == 150.0
    assert d["txn_ts"] is not None


def test_rejects_non_positive_amount():
    with pytest.raises(ValidationError):
        TransactionRequest(**_base(transaction_amount=0))
    with pytest.raises(ValidationError):
        TransactionRequest(**_base(transaction_amount=-10))


def test_rejects_future_timestamp_beyond_skew():
    future = datetime.now(UTC) + timedelta(minutes=30)
    with pytest.raises(ValidationError):
        TransactionRequest(**_base(transaction_timestamp=future.isoformat()))


def test_rejects_missing_required_fields():
    with pytest.raises(ValidationError):
        TransactionRequest(**_base(customer_id=None))
    with pytest.raises(ValidationError):
        TransactionRequest(**_base(device_id=""))


def test_batch_rejects_empty():
    with pytest.raises(ValidationError):
        BatchRequest(transactions=[])
