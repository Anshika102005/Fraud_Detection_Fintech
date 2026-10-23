"""Customer-scoped data endpoints — profile-owning session only, role enforced.

Every route here requires an authenticated session whose account role is
'customer' (``require_role``), and every query is scoped to the session user's
id — so a customer can only ever read or write their own transactions, alerts,
analytics, and reports. An analyst token receives 403 on these routes, and a
different customer's rows are simply invisible (404). All scoring happens
server-side in ``src.api.records``.
"""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from src.api.records import (
    RecordStore,
    build_analytics_summary,
    build_monthly_report,
    build_risk_summary,
    score_transaction,
)
from src.api.routes.auth import require_role

router = APIRouter(prefix="/api/v1", tags=["customer-data"])

ALERT_STATUSES = {"new", "investigating", "resolved", "dismissed"}


def _records(request: Request) -> RecordStore:
    return request.app.state.record_store


def _own_txns(store: RecordStore, user_id: str) -> list[dict]:
    res = store.list_transactions(user_id, page=1, limit=1_000_000)
    return res["transactions"]


# --- request models --------------------------------------------------------

class NewTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")

    merchant: str = Field(min_length=1, max_length=140)
    amount: float = Field(gt=0, le=1_000_000)
    date: str = Field(default="", max_length=10)
    time: str = Field(default="12:00", max_length=5)
    paymentMethod: str = Field(default="UPI", max_length=80)
    category: str = Field(default="Other", max_length=60)
    location: str = Field(default="Unknown", max_length=120)
    device: str = Field(default="Unknown Device", max_length=100)


class BatchRow(BaseModel):
    """Loose types on purpose: bad rows are reported per-row, not as a 422."""
    model_config = ConfigDict(extra="ignore")

    rowNumber: int = 0
    raw: str = Field(default="", max_length=2000)
    merchant: str = Field(default="", max_length=140)
    amount: str = Field(default="", max_length=40)
    date: str = Field(default="", max_length=10)
    time: str = Field(default="12:00", max_length=5)
    paymentMethod: str = Field(default="UPI", max_length=80)
    category: str = Field(default="Other", max_length=60)
    location: str = Field(default="Unknown", max_length=120)


class BatchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    fileName: str = Field(default="transactions_batch.csv", max_length=200)
    rows: list[BatchRow] = Field(default_factory=list, max_length=5000)


class AlertStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = Field(min_length=3, max_length=30)


def _clean_fields(body: NewTransaction) -> dict:
    txn_date = body.date.strip() or date.today().isoformat()
    try:
        date.fromisoformat(txn_date)
    except ValueError:
        txn_date = date.today().isoformat()
    return {
        "merchant": body.merchant.strip(),
        "amount": float(body.amount),
        "date": txn_date,
        "time": (body.time.strip() or "12:00")[:5],
        "payment_method": body.paymentMethod.strip() or "UPI",
        "category": body.category.strip() or "Other",
        "location": body.location.strip() or "Unknown",
        "device": body.device.strip() or "Unknown Device",
    }


# --- transactions ----------------------------------------------------------

@router.get("/transactions")
def list_own_transactions(
    request: Request,
    user=Depends(require_role("customer")),
    search: str | None = Query(default=None),
    risk: str | None = Query(default=None),
    status: str | None = Query(default=None),
    paymentMethod: str | None = Query(default=None),
    category: str | None = Query(default=None),
    sortBy: str = Query(default="date"),
    sortOrder: str = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=8, ge=1, le=1000),
) -> dict:
    return _records(request).list_transactions(
        user["id"], search=search, risk=risk, status=status,
        payment_method=paymentMethod, category=category,
        sort_by=sortBy, sort_order=sortOrder, page=page, limit=limit,
    )


@router.get("/transactions/{txn_id}")
def get_own_transaction(txn_id: str, request: Request, user=Depends(require_role("customer"))):
    txn = _records(request).get_transaction(user["id"], txn_id)
    if txn is None:
        # Not owned (or unknown): indistinguishable from missing — no leakage.
        raise HTTPException(404, f"Transaction {txn_id} not found")
    return txn


@router.post("/transactions", status_code=201)
def add_transaction(body: NewTransaction, request: Request,
                    user=Depends(require_role("customer"))) -> dict:
    fields = _clean_fields(body)
    evaluation = score_transaction(
        amount=fields["amount"], time_of_day=fields["time"], merchant=fields["merchant"],
        payment_method=fields["payment_method"], location=fields["location"],
    )
    txn = _records(request).add_transaction(user["id"], fields, evaluation)
    return {
        "success": True,
        "transaction": txn,
        "prediction": txn["prediction"],
        "fraudProbability": txn["fraudProbability"],
        "riskScore": txn["riskScore"],
        "riskLevel": txn["riskLevel"],
        "flaggedReasons": txn["flaggedReasons"],
    }


@router.post("/transactions/batch")
def add_transaction_batch(body: BatchRequest, request: Request,
                          user=Depends(require_role("customer"))) -> dict:
    store = _records(request)
    seen = store.existing_signature(user["id"])
    errors: list[dict] = []
    valid = 0
    duplicates = 0
    fraud = suspicious = legitimate = 0

    for row in body.rows:
        merchant = row.merchant.strip()
        try:
            amount = float(row.amount.replace(",", "").replace("₹", ""))
        except (ValueError, AttributeError):
            amount = 0.0
        if not merchant:
            errors.append({"rowNumber": row.rowNumber, "raw": row.raw,
                           "reason": "Missing merchant name"})
            continue
        if amount <= 0:
            errors.append({"rowNumber": row.rowNumber, "raw": row.raw,
                           "reason": "Invalid or missing amount"})
            continue
        txn_date = row.date.strip() or date.today().isoformat()
        try:
            date.fromisoformat(txn_date)
        except ValueError:
            errors.append({"rowNumber": row.rowNumber, "raw": row.raw,
                           "reason": "Invalid date (expected YYYY-MM-DD)"})
            continue

        signature = (merchant.lower(), round(amount, 2), txn_date)
        if signature in seen:
            duplicates += 1
            continue
        seen.add(signature)

        fields = {
            "merchant": merchant, "amount": amount, "date": txn_date,
            "time": (row.time.strip() or "12:00")[:5],
            "payment_method": row.paymentMethod.strip() or "UPI",
            "category": row.category.strip() or "Other",
            "location": row.location.strip() or "Unknown",
            "device": "Uploaded Device Profile",
        }
        evaluation = score_transaction(
            amount=amount, time_of_day=fields["time"], merchant=merchant,
            payment_method=fields["payment_method"], location=fields["location"],
        )
        store.add_transaction(user["id"], fields, evaluation)
        valid += 1
        if evaluation["status"] == "fraudulent":
            fraud += 1
        elif evaluation["status"] == "suspicious":
            suspicious += 1
        else:
            legitimate += 1

    return {
        "fileName": body.fileName,
        "totalRows": len(body.rows),
        "validTransactions": valid,
        "invalidRows": len(errors),
        "duplicates": duplicates,
        "breakdown": {
            "total": valid,
            "fraud": fraud,
            "suspicious": suspicious,
            "legitimate": legitimate,
            "errors": len(errors),
        },
        "errors": errors,
    }


# --- fraud alerts ----------------------------------------------------------

@router.get("/fraud-alerts")
def list_own_alerts(
    request: Request,
    user=Depends(require_role("customer")),
    status: str | None = Query(default=None),
    riskLevel: str | None = Query(default=None),
) -> dict:
    alerts = _records(request).list_alerts(user["id"], status=status, risk_level=riskLevel)
    return {
        "alerts": alerts,
        "total": len(alerts),
        "unresolvedCount": sum(1 for a in alerts if a["status"] in ("new", "investigating")),
    }


@router.patch("/fraud-alerts/{alert_id}")
def update_own_alert(alert_id: str, body: AlertStatusUpdate, request: Request,
                     user=Depends(require_role("customer"))) -> dict:
    status = body.status.strip().lower()
    if status not in ALERT_STATUSES:
        raise HTTPException(422, f"Invalid alert status '{body.status}'")
    updated = _records(request).update_alert(user["id"], alert_id, status)
    if updated is None:
        raise HTTPException(404, f"Alert {alert_id} not found")
    return {"success": True, "id": updated["id"], "status": updated["status"]}


# --- derived analytics / risk / report (computed from own rows) ------------

@router.get("/analytics/summary")
def analytics_summary(
    request: Request,
    user=Depends(require_role("customer")),
    range: str = Query(default="30d", alias="range"),
) -> dict:
    return build_analytics_summary(_own_txns(_records(request), user["id"]), range)


@router.get("/risk-analysis")
def risk_analysis(request: Request, user=Depends(require_role("customer"))) -> dict:
    return build_risk_summary(_own_txns(_records(request), user["id"]))


@router.get("/reports/monthly")
def monthly_report(
    request: Request,
    user=Depends(require_role("customer")),
    month: str | None = Query(default=None, max_length=20),
) -> dict:
    store = _records(request)
    return build_monthly_report(
        {"name": user["name"], "email": user["email"]},
        _own_txns(store, user["id"]),
        month,
    )
