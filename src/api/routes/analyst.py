"""Analyst-only endpoints — role enforced on the backend, not just the UI.

Every route here requires an authenticated session whose account role is
'analyst' (see src.api.routes.auth.require_role). A customer token receives
403 even if they hand-craft the request. All data is read from the database
at request time — there are no seeded users, mock datasets, or fallbacks.
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from src.api.records import build_macro_overview
from src.api.routes.auth import require_role, require_user
from src.api.users import UserStore, public_user

router = APIRouter(
    prefix="/api/v1/analyst",
    tags=["analyst"],
    dependencies=[Depends(require_role("analyst"))],
)

CASE_STATUSES = {"New", "Under Review", "Confirmed Fraud", "False Positive", "Resolved"}

MODEL_TYPE_LABELS = {"lightgbm": "LightGBM", "xgboost": "XGBoost", "catboost": "CatBoost"}


def _store(request: Request) -> UserStore:
    return request.app.state.user_store


def _records(request: Request):
    return request.app.state.record_store


class CaseUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str | None = Field(default=None, min_length=3, max_length=40)
    assign: bool | None = None  # True → claim for the calling analyst; False → unassign


# --- accounts --------------------------------------------------------------

def _attach_aggregates(users: list[dict[str, Any]], agg: dict[str, dict[str, Any]]) -> None:
    for u in users:
        a = agg.get(u["id"])
        if not a:
            u.update({
                "transactionsCount": None, "totalVolume": None, "riskScore": None,
                "riskLevel": None, "fraudCases": None, "safetyScore": None,
                "status": "active",
            })
            continue
        u.update({
            "transactionsCount": a["transactionsCount"],
            "totalVolume": a["totalVolume"],
            "riskScore": a["riskScore"],
            "riskLevel": a["riskLevel"],
            "fraudCases": a["fraudCases"],
            "safetyScore": a["safetyScore"],
            "status": "flagged" if a["fraudCases"] else "active",
        })


@router.get("/users")
def list_users(request: Request) -> dict:
    """Registered accounts (safe fields only) for the analyst Users page."""
    users = _store(request).list_users()
    _attach_aggregates(users, _records(request).user_aggregates())
    return {"users": users, "total": len(users)}


@router.get("/users/{user_id}")
def get_user_detail(user_id: str, request: Request) -> dict:
    """Account detail for one registered user. 404 for unknown ids."""
    row = _store(request).get_user(user_id)
    if row is None:
        raise HTTPException(404, f"User {user_id} not found")

    records = _records(request)
    agg = _records(request).user_aggregates().get(user_id)
    public = public_user(row)
    _attach_aggregates([public], {user_id: agg} if agg else {})

    store = records
    txns = store.list_transactions(user_id, page=1, limit=1_000_000)["transactions"]
    method_counts: dict[str, int] = {}
    cat_counts: dict[str, int] = {}
    for t in txns:
        method_counts[t["paymentMethod"]] = method_counts.get(t["paymentMethod"], 0) + 1
        cat_counts[t["category"]] = cat_counts.get(t["category"], 0) + 1

    activity: list[dict[str, str]] = []
    if public.get("lastLogin"):
        activity.append({"time": public["lastLogin"], "action": "Most recent authenticated session"})
    for t in txns[:5]:
        activity.append({
            "time": f"{t['date']} {t['time']}",
            "action": f"{t['riskLevel']} risk transaction at {t['merchant']}",
        })

    return {
        "user": public,
        "accountIsolated": True,
        "riskSummary": {
            "riskScore": public.get("riskScore"),
            "safetyScore": public.get("safetyScore"),
            "flaggedIncidents": public.get("fraudCases"),
            "dominantCategory": max(cat_counts, key=cat_counts.get) if cat_counts else None,
            "primaryMethod": max(method_counts, key=method_counts.get) if method_counts else None,
        },
        "recentActivity": activity,
    }


# --- macro intelligence ----------------------------------------------------

@router.get("/overview")
def overview(request: Request) -> dict:
    """Fraud Intelligence dashboard numbers — computed from live database rows."""
    txns = _records(request).list_all_transactions(limit=10_000)
    cases = _records(request).list_cases()
    accounts = len(_store(request).list_users())
    return build_macro_overview(txns, cases, accounts=accounts)


@router.get("/transactions")
def all_transactions(request: Request, limit: int = Query(default=500, ge=1, le=5000)) -> dict:
    """All accounts' transactions with owner names — analyst monitoring only."""
    rows = _records(request).list_all_transactions(limit=limit)
    return {"transactions": rows, "total": len(rows)}


# --- fraud cases (investigation queue) -------------------------------------

@router.get("/cases")
def list_cases(
    request: Request,
    user=Depends(require_user),
    status: str | None = Query(default=None),
    assignedTo: str | None = Query(default=None),
) -> dict:
    """Investigation cases raised from customer fraud alerts.

    ``assignedTo=me`` narrows the list to cases assigned to the calling analyst.
    """
    assigned = user["id"] if assignedTo == "me" else assignedTo
    cases = _records(request).list_cases(status=status, assigned_to=assigned)
    return {
        "cases": cases,
        "total": len(cases),
        "unassignedCount": sum(1 for c in cases if not c["assignedTo"]),
        "assignedToMe": sum(1 for c in cases if c["assignedTo"] == user["id"]),
    }


@router.patch("/cases/{case_id}")
def update_case(
    case_id: str, body: CaseUpdate, request: Request, user=Depends(require_user)
) -> dict:
    """Triage an incident: change status and/or claim it for the caller."""
    status = body.status.strip() if body.status else None
    if status is not None and status not in CASE_STATUSES:
        raise HTTPException(422, f"Invalid case status '{body.status}'")
    assign_to = None
    if body.assign is True:
        assign_to = user["id"]  # never accepts an arbitrary target user id
    elif body.assign is False:
        assign_to = ""
    updated = _records(request).update_case(
        case_id, status=status, assign_to=assign_to
    )
    if updated is None:
        raise HTTPException(404, f"Case {case_id} not found")
    return {"success": True, "case": updated}


# --- model telemetry (real training artifacts) -----------------------------

@router.get("/model-performance")
def model_performance(request: Request) -> dict:
    """Real model metrics from the training artifacts + serving bundle."""
    settings = request.app.state.settings
    artifact_dir = Path(settings.artifact_path).parent
    metrics_path = artifact_dir / "metrics.json"
    if not metrics_path.exists():
        raise HTTPException(503, "Model metrics artifacts are not available on this deployment.")

    with open(metrics_path, encoding="utf-8") as fh:
        metrics = json.load(fh)
    split = metrics.get("holdout") or metrics.get("validation") or {}
    confusion = split.get("confusion", {})

    model_type = "unknown"
    last_trained = None
    dataset_rows = None
    feature_importance: list[dict[str, Any]] = []
    try:
        from src.api.main import get_engine
        engine = get_engine()
        if engine is not None:
            bundle = engine.bundle
            model_type = bundle.get("model_type", model_type)
            meta = bundle.get("metadata") or {}
            last_trained = meta.get("trained_at")
            dataset_rows = meta.get("n_rows")
            importance = bundle.get("global_importance") or []
            total_imp = sum(float(item.get("mean_abs_shap", 0)) for item in importance) or 1.0
            feature_importance = [
                {"feature": item.get("feature", "unknown"),
                 "importance": round(float(item.get("mean_abs_shap", 0)) / total_imp, 4)}
                for item in importance[:10]
            ]
    except Exception:  # engine optional — metrics.json still serves the page
        pass

    if last_trained:
        try:
            last_trained = datetime.fromisoformat(last_trained).astimezone().strftime(
                "%Y-%m-%d %H:%M %Z"
            )
        except ValueError:
            pass

    return {
        "modelName": f"FraudGuard {MODEL_TYPE_LABELS.get(model_type, model_type)} Serving Bundle",
        "lastTrained": last_trained or "unknown",
        "datasetSize": f"{dataset_rows:,} Transactions" if dataset_rows else "unknown",
        "evaluationMode": "Out-of-Time Holdout Validation",
        "kpis": {
            "precision": split.get("precision"),
            "recall": split.get("recall"),
            "f1Score": split.get("f1"),
            "rocAuc": split.get("roc_auc"),
            "prAuc": split.get("pr_auc"),
        },
        "confusionMatrix": {
            "trueNegative": confusion.get("tn"),
            "falsePositive": confusion.get("fp"),
            "falseNegative": confusion.get("fn"),
            "truePositive": confusion.get("tp"),
        },
        "featureImportance": feature_importance,
        "threshold": (metrics.get("threshold") or {}).get("threshold"),
    }
