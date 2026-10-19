"""Prediction endpoint: POST /api/predict (ad-hoc risk check, nothing stored)."""
from __future__ import annotations

import logging
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import PredictionRequest, PredictionResponse
from app.services.fraud_detection_service import build_history_frame, build_human_reasons
from app.services.model_service import ModelUnavailableError, get_model_service
from app.services.rules_engine import compute_risk
from app.utils.security import get_current_user

logger = logging.getLogger("fraudguard.api.predictions")
router = APIRouter(tags=["predictions"])


@router.post("/predict", response_model=PredictionResponse)
def predict(
    payload: PredictionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Score a transaction WITHOUT storing it (ad-hoc check for the frontend).

    Uses the caller's stored history for behavioral features; the transaction
    itself is never persisted.
    """
    from ml.features import (
        build_history_profile,
        engineer_transaction_features,
        features_to_frame,
        velocity_counts,
    )

    try:
        model_service = get_model_service()
        model_service.assert_ready()
    except ModelUnavailableError as exc:
        logger.error("Prediction requested but model unavailable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Fraud detection model is unavailable",
        ) from exc

    dt = payload.transaction_datetime or datetime.now()
    history_df = build_history_frame(db, current_user.id)
    history_datetimes = (
        [d.to_pydatetime() for d in pd.to_datetime(history_df["transaction_datetime"])]
        if len(history_df) else []
    )
    c1h, c24h = velocity_counts(history_datetimes, dt)
    profile = build_history_profile(history_df)

    features = engineer_transaction_features(
        amount=payload.amount,
        transaction_datetime=dt,
        merchant=payload.merchant,
        merchant_category=payload.category,
        payment_method=payload.payment_method,
        location=payload.location,
        device_type=payload.device_type,
        history_profile=profile,
        txn_count_1h=c1h,
        txn_count_24h=c24h,
    )
    features_frame = features_to_frame([dict(features)])

    try:
        probability = model_service.predict_proba(features_frame)
        contributions = model_service.explain(features_frame)
    except ModelUnavailableError as exc:
        logger.error("Prediction failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Prediction failed - model unavailable") from exc
    except Exception as exc:  # noqa: BLE001
        logger.error("Prediction error: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Prediction failed") from exc

    assessment = compute_risk(features, probability)
    reasons = build_human_reasons(assessment.flags, contributions, features)

    return PredictionResponse(
        prediction=assessment.prediction,
        fraud_probability=assessment.fraud_probability,
        risk_score=assessment.risk_score,
        risk_level=assessment.risk_level,
        behavioral_anomaly_score=assessment.behavioral_anomaly_score,
        reasons=reasons,
        model_name=model_service.model_name,
        model_version=model_service.model_version,
        is_demo_model=model_service.is_demo,
        features=dict(features) if payload.include_features else None,
    )
