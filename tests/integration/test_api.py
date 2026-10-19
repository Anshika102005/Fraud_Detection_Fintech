"""Integration tests: full API against a real trained bundle (in-memory stores)."""
from __future__ import annotations

import json
from datetime import datetime, timedelta

import joblib
import pytest
from fastapi.testclient import TestClient

from src.api.main import create_app
from src.config import Settings


@pytest.fixture()
def client(mini_trained, tmp_path):
    artifact = tmp_path / "model_bundle.joblib"
    joblib.dump(mini_trained, artifact)
    settings = Settings(
        artifact_path=artifact,
        state_store="inmemory",
        prediction_log="jsonl",
        prediction_log_path=tmp_path / "predictions.jsonl",
        api_keys="test-key-1",
        rate_limit_per_minute=100_000,
    )
    app = create_app(settings)
    with TestClient(app) as c:
        yield c


def _payload(**over):
    body = {
        "customer_id": "c_test", "merchant_id": "m_test", "device_id": "d_test",
        "transaction_amount": 250.0,
        "transaction_timestamp": datetime.utcnow().isoformat(),
        "merchant_category": "grocery", "channel": "pos",
        "transaction_country": "US", "transaction_city": "chicago",
        "latitude": 41.9, "longitude": -87.6,
        "home_latitude": 41.9, "home_longitude": -87.6,
        "ip_address": "10.0.0.5", "failed_auth_attempts": 0,
    }
    body.update(over)
    return body


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_ready_after_startup(client):
    r = client.get("/ready")
    assert r.status_code == 200
    assert r.json()["ready"] is True


def test_predict_requires_api_key(client):
    assert client.post("/predict", json=_payload()).status_code == 401
    assert client.post("/predict", json=_payload(),
                       headers={"X-API-Key": "wrong"}).status_code == 403


def test_predict_roundtrip(client):
    r = client.post("/predict", json=_payload(),
                    headers={"X-API-Key": "test-key-1"})
    assert r.status_code == 200
    body = r.json()
    for field in ("fraud_probability", "risk_level", "decision", "model_version",
                  "top_risk_factors", "latency_ms"):
        assert field in body
    assert 0.0 <= body["fraud_probability"] <= 1.0
    assert body["decision"] in ("APPROVE", "REVIEW", "DECLINE", "BLOCK")


def test_idempotency_returns_cached_response(client):
    h = {"X-API-Key": "test-key-1", "X-Idempotency-Key": "dup-1"}
    r1 = client.post("/predict", json=_payload(), headers=h).json()
    r2 = client.post("/predict", json=_payload(), headers=h).json()
    assert r2["cached"] is True
    assert r2["fraud_probability"] == r1["fraud_probability"]
    assert r2["decision"] == r1["decision"]


def test_validation_error_is_422(client):
    r = client.post("/predict", json=_payload(transaction_amount=0),
                    headers={"X-API-Key": "test-key-1"})
    assert r.status_code == 422


def test_batch(client):
    r = client.post("/predict/batch", json={"transactions": [_payload(), _payload()]},
                    headers={"X-API-Key": "test-key-1"})
    assert r.status_code == 200
    assert r.json()["count"] == 2


def test_prediction_logged_to_jsonl(client, tmp_path):
    client.post("/predict", json=_payload(), headers={"X-API-Key": "test-key-1"})
    log = tmp_path / "predictions.jsonl"
    assert log.exists()
    rec = json.loads(log.read_text(encoding="utf-8").strip().splitlines()[-1])
    assert "fraud_probability" in rec and "features" in rec
