"""Transaction endpoints: create, list (filters), detail, delete, CSV upload."""
from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FraudAlert, Transaction, User
from app.schemas import (
    CSVUploadResult,
    FraudAlertOut,
    PaginatedTransactions,
    TransactionCreate,
    TransactionDetail,
    TransactionOut,
    TransactionStatusUpdate,
)
from app.services.csv_service import CSVValidationError, process_csv
from app.services.providers import CSVTransactionProvider, ManualTransactionProvider, TransactionIn
from app.utils.security import get_current_user, hash_identifier
from ml.features import parse_transaction_datetime

logger = logging.getLogger("fraudguard.api.transactions")
router = APIRouter(prefix="/transactions", tags=["transactions"])


def _get_user_transaction(db: Session, user: User, transaction_id: int) -> Transaction:
    """Ownership-enforced fetch - users can NEVER read another user's txn."""
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == user.id)
        .first()
    )
    if txn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Transaction not found")
    return txn


def _build_detail(db: Session, txn: Transaction) -> TransactionDetail:
    alerts = (
        db.query(FraudAlert)
        .filter(FraudAlert.transaction_id == txn.id)
        .order_by(FraudAlert.created_at.desc())
        .all()
    )
    detail = TransactionDetail.model_validate(txn)
    detail.alerts = [FraudAlertOut.model_validate(a) for a in alerts]
    detail.prediction = {
        "prediction": txn.ml_prediction,
        "fraud_probability": txn.fraud_probability,
        "risk_score": txn.risk_score,
        "risk_level": txn.risk_level,
    }
    return detail


@router.post("", response_model=TransactionDetail, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manual transaction entry: save -> features -> ML -> risk -> alert."""
    dt = parse_transaction_datetime(payload.date, payload.time)
    if dt is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid date '{payload.date}' or time '{payload.time}'. "
                   "Use date=YYYY-MM-DD and time=HH:MM.",
        )
    if dt > datetime.now() + timedelta(minutes=5):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Transaction date cannot be in the future.")

    txn_in = TransactionIn(
        amount=payload.amount,
        transaction_datetime=dt,
        merchant=payload.merchant,
        merchant_category=payload.merchant_category or "Other",
        payment_method=payload.payment_method,
        location=payload.location,
        device_type=payload.device_type,
        transaction_reference=payload.transaction_reference,
        device_id_hash=hash_identifier(payload.device_id),
        ip_hash=hash_identifier(payload.ip_address),
        notes=payload.notes,
        source="manual",
    )
    try:
        ManualTransactionProvider(txn_in).sync_transactions(db, current_user)
    except Exception as exc:  # noqa: BLE001
        logger.error("Transaction processing failed: %s", exc)
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Could not process the transaction") from exc

    txn = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.id.desc())
        .first()
    )
    return _build_detail(db, txn)


@router.get("", response_model=PaginatedTransactions)
def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    min_amount: float | None = Query(None, ge=0),
    max_amount: float | None = Query(None, ge=0),
    risk: str | None = Query(None, pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$"),
    status_filter: str | None = Query(None, alias="status"),
    merchant: str | None = Query(None, max_length=100),
    category: str | None = Query(None, max_length=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User's own transactions with pagination + filters (user_id always enforced)."""
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Transaction.merchant.ilike(like)) | (Transaction.transaction_reference.ilike(like))
        )
    if start_date:
        dt = parse_transaction_datetime(start_date)
        if dt:
            query = query.filter(Transaction.transaction_datetime >= dt)
    if end_date:
        dt = parse_transaction_datetime(end_date)
        if dt:
            query = query.filter(Transaction.transaction_datetime < dt + timedelta(days=1))
    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)
    if risk:
        query = query.filter(Transaction.risk_level == risk)
    if status_filter:
        query = query.filter(Transaction.status == status_filter)
    if merchant:
        query = query.filter(Transaction.merchant.ilike(f"%{merchant}%"))
    if category:
        query = query.filter(Transaction.merchant_category.ilike(f"%{category}%"))

    total = query.count()
    items = (
        query.order_by(Transaction.transaction_datetime.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return PaginatedTransactions(
        items=[TransactionOut.model_validate(t) for t in items],
        page=page, limit=limit, total=total,
        pages=math.ceil(total / limit) if limit else 0,
    )


@router.get("/{transaction_id}", response_model=TransactionDetail)
def transaction_detail(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = _get_user_transaction(db, current_user, transaction_id)
    return _build_detail(db, txn)


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = _get_user_transaction(db, current_user, transaction_id)
    db.delete(txn)
    db.commit()
    logger.info("Transaction %s deleted by user %s", transaction_id, current_user.id)
    return {"detail": "Transaction deleted"}


@router.put("/{transaction_id}/status", response_model=TransactionOut)
def update_transaction_status(
    transaction_id: int,
    payload: TransactionStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer action: mark transaction as fraud / legitimate / reviewed.

    Updates FraudGuard's internal status only - it does NOT block any bank or
    UPI payment.
    """
    txn = _get_user_transaction(db, current_user, transaction_id)
    txn.status = payload.status
    db.commit()
    db.refresh(txn)
    return txn


@router.post("/upload", response_model=CSVUploadResult)
async def upload_transactions_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """CSV bulk upload with full validation and per-row ML analysis."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Only .csv files are accepted")
    contents = await file.read()
    try:
        parsed = process_csv(contents, filename=file.filename)
    except CSVValidationError as exc:
        logger.warning("CSV validation failed for user %s: %s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": str(exc), "errors": exc.errors},
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.error("CSV processing failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Could not process the CSV file") from exc

    provider = CSVTransactionProvider(parsed.valid_rows)
    sync = provider.sync_transactions(db, current_user)

    recent = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id, Transaction.source == "csv")
        .order_by(Transaction.id.desc())
        .limit(sync.created)
        .all()
    )
    fraud_count = sum(1 for t in recent if t.ml_prediction == "fraudulent")
    suspicious_count = sum(1 for t in recent if t.ml_prediction == "suspicious")
    legitimate_count = sync.created - fraud_count - suspicious_count

    errors = parsed.errors + sync.errors
    if errors:
        logger.info("CSV upload for user %s had %d row errors", current_user.id, len(errors))
    return CSVUploadResult(
        total_rows=parsed.total_rows,
        valid_rows=len(parsed.valid_rows),
        invalid_rows=parsed.invalid_rows,
        duplicates=parsed.duplicates + sync.skipped_duplicates,
        inserted=sync.created,
        fraud_count=fraud_count,
        suspicious_count=suspicious_count,
        legitimate_count=legitimate_count,
        errors=errors[:100],
    )
