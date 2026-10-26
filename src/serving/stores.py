"""Serving state stores & prediction logging.

Redis vs PostgreSQL decision rule (blueprint §24):
  Redis  -> hot path: recent-transaction state, velocity counters, idempotency
            (microsecond reads, TTL-native, acceptable to lose & rebuild)
  Postgres -> system of record: transactions, feature tables, prediction logs
            (durable, queryable, slower; never on the scoring hot path)
Prediction caching: fraud predictions are NOT cached long-term — customer
behavior changes; only the idempotency cache reuses a score for a duplicate
request within a short TTL.
"""
from __future__ import annotations

import json
import threading
import time
from datetime import UTC, datetime
from pathlib import Path

from src.config import Settings
from src.features.online import InMemoryKV, RedisKV


class PredictionLogger:
    """prediction_logs sink. Postgres in production; JSONL fallback for demo."""

    def __init__(self, settings: Settings):
        self.mode = settings.prediction_log
        self.path = Path(settings.prediction_log_path)
        self._lock = threading.Lock()
        self._engine = None
        if self.mode == "postgres" and settings.database_url:
            from src.data.db import get_engine
            self._engine = get_engine(settings.database_url)

    def log(self, record: dict) -> None:
        record = {**record,
                  "logged_at": datetime.now(UTC).isoformat()}
        if self.mode == "postgres" and self._engine is not None:
            from sqlalchemy import text
            with self._engine.begin() as conn:
                conn.execute(text(
                    "INSERT INTO prediction_logs (request_id, customer_id, "
                    "fraud_probability, risk_level, decision, model_version, "
                    "latency_ms, features, actual_label) VALUES "
                    "(:request_id, :customer_id, :fraud_probability, :risk_level, "
                    ":decision, :model_version, :latency_ms, :features, NULL)"),
                    {"request_id": record.get("request_id"),
                     "customer_id": record.get("customer_id"),
                     "fraud_probability": record.get("fraud_probability"),
                     "risk_level": record.get("risk_level"),
                     "decision": record.get("decision"),
                     "model_version": record.get("model_version"),
                     "latency_ms": record.get("latency_ms"),
                     "features": json.dumps(record.get("features", {}), default=str)})
        elif self.mode == "jsonl":
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with self._lock, open(self.path, "a", encoding="utf-8") as f:
                f.write(json.dumps(record, default=str) + "\n")

    def recent(self, limit: int = 5000) -> list[dict]:
        """Read recent logs (drift monitoring input). JSONL mode only."""
        if self.mode != "jsonl" or not self.path.exists():
            return []
        with open(self.path, encoding="utf-8") as f:
            lines = f.readlines()[-limit:]
        out = []
        for line in lines:
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return out


class IdempotencyCache:
    """Duplicate-request protection: same idempotency key -> same response."""

    def __init__(self, kv, ttl_seconds: int):
        self.kv = kv
        self.ttl = ttl_seconds

    def get(self, key: str):
        rec = self.kv.get(f"idem:{key}")
        if rec is None:
            return None
        if time.time() - rec.get("ts", 0) > self.ttl:
            self.kv.delete(f"idem:{key}")
            return None
        return rec.get("response")

    def put(self, key: str, response: dict) -> None:
        self.kv.set(f"idem:{key}", {"ts": time.time(), "response": response})


def make_kv(settings: Settings):
    if settings.state_store == "redis":
        return RedisKV(settings.redis_url)
    return InMemoryKV()
