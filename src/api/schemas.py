"""Pydantic request/response contracts (input validation at the edge).

Accepts the field names from the blueprint's API contract (e.g.
`transaction_amount`, `transaction_timestamp`) as aliases of the internal
schema names, validates amount > 0 and timestamp skew, ignores unknown extras.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TransactionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    transaction_id: str | None = None
    customer_id: str = Field(min_length=1)
    card_id: str | None = None
    merchant_id: str = Field(min_length=1)
    mcc: int | None = None
    merchant_category: str = "misc_retail"
    merchant_country: str | None = None
    merchant_city: str | None = None
    merchant_risk_score: float | None = Field(default=None, ge=0, le=1)
    txn_ts: datetime = Field(alias="transaction_timestamp")
    amount: float = Field(alias="transaction_amount", gt=0, le=1_000_000)
    currency: str = "USD"
    channel: str = "ecom"
    status: str = "approved"
    transaction_country: str = "US"
    transaction_city: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    home_latitude: float | None = None
    home_longitude: float | None = None
    device_id: str = Field(min_length=1)
    device_type: str = "mobile"
    operating_system: str | None = None
    ip_address: str = "0.0.0.0"
    ip_risk_score: float | None = Field(default=None, ge=0, le=1)
    device_age_days: float | None = None
    authentication_method: str | None = None
    cvv_result: str | None = None
    pin_verified: bool | None = None
    threeds_result: str | None = None
    biometric_verified: bool | None = None
    failed_auth_attempts: int = Field(default=0, ge=0, le=50)
    account_age_days: float | None = None

    @field_validator("txn_ts")
    @classmethod
    def _reject_far_future(cls, v: datetime) -> datetime:
        now = datetime.now(UTC) if v.tzinfo else datetime.utcnow()
        if v > now + timedelta(minutes=5):
            raise ValueError("transaction_timestamp is in the future beyond 5-min skew")
        return v

    def to_engine_dict(self) -> dict[str, Any]:
        d = self.model_dump(by_alias=False)
        d["txn_ts"] = self.txn_ts
        if d.get("status") not in ("approved", "declined"):
            d["status"] = "approved"
        return d


class BatchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transactions: list[TransactionRequest] = Field(min_length=1)


class RiskFactor(BaseModel):
    feature: str
    contribution: float
    explanation: str


class PredictionResponse(BaseModel):
    transaction_id: str | None = None
    customer_id: str | None = None
    fraud_probability: float
    risk_level: str
    decision: str
    model_version: str
    top_risk_factors: list[RiskFactor] = []
    threshold: float
    latency_ms: float
    cached: bool = False


class BatchResponse(BaseModel):
    count: int
    results: list[dict]


class HealthResponse(BaseModel):
    status: str
    model_version: str | None = None
    state_store: str
    prediction_log: str


class ReadyResponse(BaseModel):
    ready: bool
    model_loaded: bool
    state_store_ok: bool
    detail: str | None = None
