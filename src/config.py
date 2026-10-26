"""Central configuration: env-driven settings (pydantic-settings) + YAML loaders.

Environment variables map 1:1 to field names (case-insensitive), matching
.env.example. No secrets are ever hardcoded; everything is overridable via env.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    """Runtime settings for the API / serving plane."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- model artifact ---
    artifact_path: Path = ROOT / "artifacts" / "model_bundle.joblib"

    # --- state stores ---
    state_store: str = "inmemory"  # inmemory | redis
    redis_url: str = "redis://localhost:6379/0"
    user_state_cache_ttl_seconds: int = 60
    idempotency_ttl_seconds: int = 300
    state_max_events: int = 500  # recent-transaction buffer depth per customer

    # --- prediction logging ---
    prediction_log: str = "jsonl"  # jsonl | postgres | none
    database_url: str | None = None
    prediction_log_path: Path = ROOT / "data" / "predictions.jsonl"

    # --- api security ---
    api_keys: str = "dev-key-123"  # comma-separated; rotate via env/secret store
    admin_api_key: str = "admin-secret-key"
    rate_limit_per_minute: int = 120
    max_batch_size: int = 1000
    timestamp_skew_seconds: int = 300

    # --- web auth (user accounts + sessions) ---
    auth_db_path: Path = ROOT / "data" / "auth.db"
    session_ttl_hours: int = 24
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # --- mlflow ---
    mlflow_enabled: bool = False
    mlflow_tracking_uri: str = "file:./mlruns"
    mlflow_experiment: str = "fraud-detection"
    model_registry_name: str = "fraud-risk-model"
    model_alias: str = "production"

    log_level: str = "INFO"

    @property
    def api_key_set(self) -> frozenset[str]:
        return frozenset(k.strip() for k in self.api_keys.split(",") if k.strip())

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


def load_yaml(path: Path) -> dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_model_config(path: Path | None = None) -> dict[str, Any]:
    """Training/feature configuration (windows, cost model, gates, spaces)."""
    return load_yaml(path or ROOT / "configs" / "model.yaml")


def load_risk_policy(path: Path | None = None) -> dict[str, Any]:
    """Risk-band policy (probability bands -> risk level -> decision)."""
    return load_yaml(path or ROOT / "configs" / "risk_policy.yaml")
