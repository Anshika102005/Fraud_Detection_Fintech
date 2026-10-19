"""Pydantic request/response schemas (API contract for the React frontend).

The frontend only ever sees structured JSON - no ML preprocessing details,
feature names it must fill, or internal identifiers it must compute.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

VALID_PAYMENT_METHODS = {
    "UPI", "Debit Card", "Credit Card", "Wallet", "Net Banking", "Cash", "Other"
}


# --------------------------------------------------------------------------- auth

class GoogleAuthRequest(BaseModel):
    id_token: str = Field(..., min_length=10, description="Google ID token from the client")


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    profile_picture: str | None = None
    role: str
    created_at: datetime
    last_login: datetime | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class UserProfileUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    profile_picture: str | None = Field(None, max_length=1024)


# ------------------------------------------------------------------- transactions

class TransactionCreate(BaseModel):
    """Manual transaction entry. NOTE: user identity NEVER comes from the body."""

    amount: float = Field(..., gt=0, le=10_000_000)
    date: str = Field(..., min_length=8, max_length=32, description="YYYY-MM-DD")
    time: str | None = Field(None, max_length=8, description="HH:MM (24h)")
    merchant: str = Field(..., min_length=1, max_length=255)
    merchant_category: str = Field("Other", max_length=100)
    location: str | None = Field(None, max_length=255)
    payment_method: str = Field("UPI", max_length=50)
    device_type: str | None = Field("mobile", max_length=50)
    device_id: str | None = Field(None, max_length=256,
                                  description="Optional raw device id - stored as a salted hash")
    ip_address: str | None = Field(None, max_length=64,
                                   description="Optional raw IP - stored as a salted hash")
    transaction_reference: str | None = Field(None, max_length=64)
    notes: str | None = Field(None, max_length=1000)

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, v: str) -> str:
        if v.strip().lower() not in {m.lower() for m in VALID_PAYMENT_METHODS}:
            raise ValueError(
                f"Invalid payment method '{v}'. "
                f"Valid: {', '.join(sorted(VALID_PAYMENT_METHODS))}"
            )
        return v.strip()

    @field_validator("merchant", "merchant_category", "location")
    @classmethod
    def strip_text(cls, v: str | None) -> str | None:
        return v.strip() if isinstance(v, str) else v


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    transaction_reference: str | None = None
    amount: float
    currency: str
    transaction_datetime: datetime
    merchant: str
    merchant_category: str
    location: str | None = None
    payment_method: str
    device_type: str | None = None
    risk_score: int | None = None
    fraud_probability: float | None = None
    risk_level: str | None = None
    ml_prediction: str | None = None
    status: str
    source: str
    created_at: datetime


class PaginatedTransactions(BaseModel):
    items: list[TransactionOut]
    page: int
    limit: int
    total: int
    pages: int


class TransactionDetail(TransactionOut):
    alerts: list["FraudAlertOut"] = []
    prediction: dict[str, Any] | None = None


class CSVUploadResult(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicates: int
    inserted: int
    fraud_count: int
    suspicious_count: int
    legitimate_count: int
    errors: list[str]


# ------------------------------------------------------------------ predictions

class PredictionRequest(BaseModel):
    amount: float = Field(..., gt=0, le=10_000_000)
    transaction_datetime: datetime | None = None
    merchant: str = Field("Unknown", max_length=255)
    category: str = Field("Other", max_length=100)
    location: str | None = Field(None, max_length=255)
    payment_method: str = Field("UPI", max_length=50)
    device_type: str | None = Field("mobile", max_length=50)
    include_features: bool = False


class PredictionResponse(BaseModel):
    prediction: str
    fraud_probability: float
    risk_score: int
    risk_level: str
    behavioral_anomaly_score: int
    reasons: list[dict[str, Any]]
    model_name: str
    model_version: str
    is_demo_model: bool
    features: dict[str, Any] | None = None
    disclaimer: str = (
        "Fraud probability is a probabilistic estimate, not a certainty. "
        "FraudGuard does not block transactions."
    )


# ---------------------------------------------------------------- alerts

class FraudAlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    transaction_id: int
    alert_type: str
    severity: str
    title: str
    description: str
    fraud_probability: float
    risk_score: int
    reasons: list[str] | None = None
    status: str
    created_at: datetime
    resolved_at: datetime | None = None


class AlertStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(reviewed|dismissed|confirmed_fraud|false_positive)$")


class TransactionStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(legitimate|suspicious|fraudulent|reviewed)$")


TokenResponse.model_rebuild()
TransactionDetail.model_rebuild()

