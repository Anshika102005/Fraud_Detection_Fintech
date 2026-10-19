"""Fraud alert endpoints: list, detail, status update (customer actions)."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FraudAlert, User
from app.schemas import AlertStatusUpdate, FraudAlertOut
from app.utils.security import get_current_user

logger = logging.getLogger("fraudguard.api.alerts")
router = APIRouter(prefix="/fraud-alerts", tags=["fraud-alerts"])


def _get_user_alert(db: Session, user: User, alert_id: int) -> FraudAlert:
    alert = (
        db.query(FraudAlert)
        .filter(FraudAlert.id == alert_id, FraudAlert.user_id == user.id)
        .first()
    )
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Alert not found")
    return alert


@router.get("", response_model=list[FraudAlertOut])
def list_alerts(
    status_filter: str | None = Query(None, alias="status"),
    severity: str | None = Query(None, pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(FraudAlert).filter(FraudAlert.user_id == current_user.id)
    if status_filter:
        query = query.filter(FraudAlert.status == status_filter)
    if severity:
        query = query.filter(FraudAlert.severity == severity)
    return query.order_by(FraudAlert.created_at.desc()).limit(limit).all()


@router.get("/{alert_id}", response_model=FraudAlertOut)
def alert_detail(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_user_alert(db, current_user, alert_id)


@router.put("/{alert_id}", response_model=FraudAlertOut)
def update_alert_status(
    alert_id: int,
    payload: AlertStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer actions: reviewed / dismissed / confirmed_fraud / false_positive.

    These update FraudGuard's internal records only - they do not block or
    reverse any actual bank/UPI transaction.
    """
    alert = _get_user_alert(db, current_user, alert_id)
    alert.status = payload.status
    if payload.status != "new":
        alert.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    logger.info("Alert %s set to %s by user %s", alert_id, payload.status, current_user.id)
    return alert
