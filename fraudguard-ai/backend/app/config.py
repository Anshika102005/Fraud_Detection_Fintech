"""Application configuration loaded from environment variables (python-dotenv).

All sensitive values (secrets, DB credentials, Google client id) are read from
the environment / .env file - never hard-coded.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/config.py -> backend/.env
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ------------------------------------------------------------------ app
    app_name: str = "FraudGuard AI"
    app_version: str = "1.0.0"
    environment: str = "development"  # development | production | test
    debug: bool = True
    api_prefix: str = "/api"

    # ------------------------------------------------------------------ security
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24  # 24h
    google_client_id: str = ""
    # Dev-only escape hatch: accept signed dev tokens (never enable in prod).
    allow_dev_google_tokens: bool = True

    # ------------------------------------------------------------------ database
    database_url: str = f"sqlite:///{(PROJECT_ROOT / 'fraudguard.db').as_posix()}"

    # ------------------------------------------------------------------ ML
    artifacts_dir: str = str(PROJECT_ROOT / "ml" / "artifacts")
    # Fraud classification thresholds (configurable, not universal truths)
    fraud_probability_suspicious: float = 0.30
    fraud_probability_fraudulent: float = 0.70
    # Risk score levels
    risk_medium_threshold: int = 26
    risk_high_threshold: int = 51
    risk_critical_threshold: int = 76
    # Alerting thresholds
    alert_risk_score_threshold: int = 60
    alert_fraud_probability_threshold: float = 0.65
    alert_min_anomaly_flags: int = 3

    # ------------------------------------------------------------------ demo
    seed_demo_data: bool = False
    demo_user_google_sub: str = "demo-user-001"


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor (dependency-friendly)."""
    return Settings()


settings = get_settings()
