"""Risk endpoints: GET /api/risk-analysis, GET /api/safety-score."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.services.analytics_service import analytics_risk_distribution, analytics_summary
from app.services.insights_service import calculate_safety_score
from app.utils.security import get_current_user

router = APIRouter(tags=["risk"])


@router.get("/risk-analysis")
def risk_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregate risk posture of the user's own transactions."""
    return {
        "summary": analytics_summary(db, current_user.id),
        "risk_distribution": analytics_risk_distribution(db, current_user.id),
    }


@router.get("/safety-score")
def safety_score(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Personal digital safety score (0-100) + recommendations.

    Returns overall_score: null with an 'insufficient_data' message when there
    is not enough information to compute a meaningful score - never invented.
    """
    return calculate_safety_score(db, current_user.id)
