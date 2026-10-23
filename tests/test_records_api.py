"""Records API tests: server-side scoring, per-account isolation, RBAC.

Every account used here is created by the test — the application seeds no
default users. Covers the customer data plane (/transactions, /fraud-alerts,
/analytics/summary, /risk-analysis, /reports/monthly) and the analyst
investigation queue (/analyst/cases, /analyst/overview).
"""
from __future__ import annotations

import json
import secrets
from datetime import date

import pytest
from fastapi.testclient import TestClient

from src.api.main import create_app
from src.config import Settings

CUSTOMER_A = {"name": "Alpha Customer", "email": "alpha@example.com", "password": "AlphaPass123"}
CUSTOMER_B = {"name": "Beta Customer", "email": "beta@example.com", "password": "BetaPass1234"}
ANALYST = {"name": "Case Analyst", "email": "cases@fraudguard.test", "password": "AnalystPass123"}

LEGIT = {
    "merchant": "Swiggy", "amount": 480, "date": date.today().isoformat(),
    "time": "19:30", "paymentMethod": "UPI - Google Pay", "category": "Food & Dining",
    "location": "Bengaluru, Karnataka", "device": "iPhone 15 Pro",
}
FLAGGED = {
    "merchant": "Unknown P2P UPI Collect", "amount": 14500,
    "date": date.today().isoformat(), "time": "23:45",
    "paymentMethod": "UPI - PhonePe", "category": "Other",
    "location": "VPN Proxy, Unknown", "device": "Unknown Android Device",
}


@pytest.fixture()
def settings(tmp_path) -> Settings:
    return Settings(
        artifact_path=tmp_path / "missing_bundle.joblib",
        auth_db_path=tmp_path / "auth.db",
        state_store="inmemory",
        prediction_log="jsonl",
        prediction_log_path=tmp_path / "predictions.jsonl",
        rate_limit_per_minute=100_000,
    )


@pytest.fixture()
def client(settings):
    app = create_app(settings)
    with TestClient(app) as c:
        yield c


def _register(client, spec):
    r = client.post("/api/v1/auth/register", json=spec)
    assert r.status_code == 201, r.text
    return r.json()


def _create_analyst(client, spec):
    user = client.app.state.user_store.create_user(
        user_id=f"USR-{secrets.token_hex(4).upper()}",
        username=spec["email"].split("@", 1)[0],
        email=spec["email"],
        password=spec["password"],
        role="analyst",
        name=spec["name"],
    )
    assert user is not None
    return user


def _login(client, spec):
    r = client.post(
        "/api/v1/auth/login",
        json={"identifier": spec["email"], "password": spec["password"]},
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _add(client, token, payload):
    r = client.post("/api/v1/transactions", json=payload, headers=_auth(token))
    assert r.status_code == 201, r.text
    return r.json()


# --- auth + RBAC on the customer data plane --------------------------------
def test_customer_data_endpoints_require_auth(client):
    for path in ("/api/v1/transactions", "/api/v1/fraud-alerts",
                 "/api/v1/analytics/summary", "/api/v1/risk-analysis",
                 "/api/v1/reports/monthly"):
        assert client.get(path).status_code == 401, path
        assert client.get(path, headers=_auth("forged")).status_code == 401, path


def test_analyst_token_is_rejected_on_customer_endpoints(client):
    _create_analyst(client, ANALYST)
    token = _login(client, ANALYST)
    for path in ("/api/v1/transactions", "/api/v1/fraud-alerts",
                 "/api/v1/analytics/summary", "/api/v1/risk-analysis",
                 "/api/v1/reports/monthly"):
        assert client.get(path, headers=_auth(token)).status_code == 403, path


def test_customer_token_is_rejected_on_analyst_endpoints(client):
    token = _register(client, CUSTOMER_A)["token"]
    for path in ("/api/v1/analyst/users", "/api/v1/analyst/cases",
                 "/api/v1/analyst/overview", "/api/v1/analyst/transactions"):
        assert client.get(path, headers=_auth(token)).status_code == 403, path


# --- per-account isolation --------------------------------------------------
def test_customers_see_only_their_own_transactions(client):
    token_a = _register(client, CUSTOMER_A)["token"]
    token_b = _register(client, CUSTOMER_B)["token"]
    _add(client, token_a, LEGIT)
    _add(client, token_a, FLAGGED)

    listing_a = client.get("/api/v1/transactions", headers=_auth(token_a)).json()
    listing_b = client.get("/api/v1/transactions", headers=_auth(token_b)).json()
    assert listing_a["total"] == 2
    assert listing_b["total"] == 0
    assert listing_b["transactions"] == []
    merchants_a = {t["merchant"] for t in listing_a["transactions"]}
    assert LEGIT["merchant"] in merchants_a and FLAGGED["merchant"] in merchants_a
    assert not any(
        t["merchant"] in {LEGIT["merchant"], FLAGGED["merchant"]}
        for t in listing_b["transactions"]
    )


def test_customer_cannot_read_another_customers_transaction(client):
    token_a = _register(client, CUSTOMER_A)["token"]
    token_b = _register(client, CUSTOMER_B)["token"]
    created = _add(client, token_a, LEGIT)

    own = client.get(f"/api/v1/transactions/{created['transaction']['id']}",
                     headers=_auth(token_a))
    assert own.status_code == 200
    other = client.get(f"/api/v1/transactions/{created['transaction']['id']}",
                       headers=_auth(token_b))
    assert other.status_code == 404  # not distinguishable from missing


def test_customer_cannot_touch_another_customers_alert(client):
    token_a = _register(client, CUSTOMER_A)["token"]
    token_b = _register(client, CUSTOMER_B)["token"]
    _add(client, token_a, FLAGGED)
    alert_id = client.get("/api/v1/fraud-alerts",
                          headers=_auth(token_a)).json()["alerts"][0]["id"]
    r = client.patch(f"/api/v1/fraud-alerts/{alert_id}",
                     json={"status": "dismissed"}, headers=_auth(token_b))
    assert r.status_code == 404


# --- server-side scoring ----------------------------------------------------
def test_scoring_happens_on_the_server(client):
    token = _register(client, CUSTOMER_A)["token"]

    legit = _add(client, token, LEGIT)
    assert legit["riskLevel"] in ("LOW", "MEDIUM")
    assert legit["prediction"] == "Legitimate"
    assert legit["transaction"]["status"] == "legitimate"
    assert legit["flaggedReasons"], "scoring must return explanations"

    flagged = _add(client, token, FLAGGED)
    assert flagged["riskLevel"] in ("HIGH", "CRITICAL")
    assert flagged["prediction"] in ("Suspicious", "Fraudulent")
    assert flagged["flaggedReasons"]

    # what was scored server-side is what the database serves back
    txn_id = flagged["transaction"]["id"]
    stored = client.get(f"/api/v1/transactions/{txn_id}", headers=_auth(token)).json()
    assert stored["riskScore"] == flagged["riskScore"]
    assert stored["status"] == flagged["transaction"]["status"]


def test_client_supplied_verdicts_are_ignored(client):
    """Risk verdicts are computed server-side; request bodies cannot set them."""
    token = _register(client, CUSTOMER_A)["token"]
    r = client.post("/api/v1/transactions", headers=_auth(token),
                    json={**LEGIT, "riskScore": 1, "status": "legitimate",
                          "riskLevel": "LOW", "flaggedReasons": []})
    assert r.status_code == 201
    body = r.json()
    assert body["riskScore"] == body["transaction"]["riskScore"]
    assert body["flaggedReasons"], "server must still produce its own verdict"


# --- alerts + cases ---------------------------------------------------------
def test_flagged_transaction_creates_alert_and_analyst_case(client):
    token_a = _register(client, CUSTOMER_A)["token"]
    _create_analyst(client, ANALYST)
    analyst_token = _login(client, ANALYST)

    _add(client, token_a, FLAGGED)
    alerts = client.get("/api/v1/fraud-alerts", headers=_auth(token_a)).json()
    assert alerts["total"] == 1
    assert alerts["unresolvedCount"] == 1
    alert = alerts["alerts"][0]
    assert alert["status"] == "new"
    assert alert["whyFlagged"]
    assert alert["transactionId"]

    cases = client.get("/api/v1/analyst/cases", headers=_auth(analyst_token)).json()
    assert cases["total"] == 1
    case = cases["cases"][0]
    assert case["transactionId"] == alert["transactionId"]
    assert case["status"] == "New"
    assert case["user"] == CUSTOMER_A["name"]
    assert cases["unassignedCount"] == 1

    # the customer's own alert list never exposes the analyst case queue
    assert "incidentId" not in alert


def test_alert_status_update_is_owner_scoped(client):
    token = _register(client, CUSTOMER_A)["token"]
    _add(client, token, FLAGGED)
    alert_id = client.get("/api/v1/fraud-alerts",
                          headers=_auth(token)).json()["alerts"][0]["id"]

    ok = client.patch(f"/api/v1/fraud-alerts/{alert_id}",
                      json={"status": "investigating"}, headers=_auth(token))
    assert ok.status_code == 200
    assert ok.json() == {"success": True, "id": alert_id, "status": "investigating"}

    bad = client.patch(f"/api/v1/fraud-alerts/{alert_id}",
                       json={"status": "whatever"}, headers=_auth(token))
    assert bad.status_code == 422


def test_analyst_can_triage_and_claim_cases(client):
    token_a = _register(client, CUSTOMER_A)["token"]
    analyst = _create_analyst(client, ANALYST)
    analyst_token = _login(client, ANALYST)
    _add(client, token_a, FLAGGED)

    case = client.get("/api/v1/analyst/cases",
                      headers=_auth(analyst_token)).json()["cases"][0]

    reviewed = client.patch(f"/api/v1/analyst/cases/{case['incidentId']}",
                            json={"status": "Under Review"},
                            headers=_auth(analyst_token))
    assert reviewed.status_code == 200
    assert reviewed.json()["case"]["status"] == "Under Review"

    claimed = client.patch(f"/api/v1/analyst/cases/{case['incidentId']}",
                           json={"assign": True}, headers=_auth(analyst_token))
    assert claimed.status_code == 200
    assert claimed.json()["case"]["assignedTo"] == analyst["id"]
    assert claimed.json()["case"]["assignedToName"] == ANALYST["name"]

    mine = client.get("/api/v1/analyst/cases?assignedTo=me",
                      headers=_auth(analyst_token)).json()
    assert mine["total"] == 1
    assert mine["assignedToMe"] == 1

    invalid = client.patch(f"/api/v1/analyst/cases/{case['incidentId']}",
                           json={"status": "Not A Status"},
                           headers=_auth(analyst_token))
    assert invalid.status_code == 422

    missing = client.patch("/api/v1/analyst/cases/INC-NOPE",
                           json={"status": "Resolved"},
                           headers=_auth(analyst_token))
    assert missing.status_code == 404


# --- derived analytics / risk / report -------------------------------------
def test_analytics_and_risk_empty_then_computed(client):
    token = _register(client, CUSTOMER_A)["token"]

    empty = client.get("/api/v1/analytics/summary", headers=_auth(token)).json()
    assert empty["empty"] is True
    assert empty["totalTransactions"] == 0
    assert client.get("/api/v1/risk-analysis",
                      headers=_auth(token)).json()["empty"] is True

    _add(client, token, LEGIT)
    _add(client, token, FLAGGED)
    analytics = client.get("/api/v1/analytics/summary", headers=_auth(token)).json()
    assert analytics["empty"] is False
    assert analytics["totalTransactions"] == 2
    assert analytics["trends"], "trend series must be computed from rows"
    assert analytics["paymentMethods"]

    risk = client.get("/api/v1/risk-analysis", headers=_auth(token)).json()
    assert risk["empty"] is False
    assert 0 <= risk["safetyScore"] <= 100
    assert risk["riskDimensions"]
    assert risk["riskPatterns"]


def test_monthly_report_uses_only_own_rows(client):
    token_a = _register(client, CUSTOMER_A)["token"]
    token_b = _register(client, CUSTOMER_B)["token"]
    created = _add(client, token_a, FLAGGED)

    report = client.get("/api/v1/reports/monthly", headers=_auth(token_a)).json()
    assert report["metrics"]["totalTransactions"] == 1
    assert report["user"] == CUSTOMER_A["name"]
    assert report["reportId"].startswith("FG-RPT-")
    assert report["metrics"]["highestRiskTransaction"]["id"] == \
        created["transaction"]["id"]

    other = client.get("/api/v1/reports/monthly", headers=_auth(token_b)).json()
    assert other["metrics"]["totalTransactions"] == 0
    assert other["user"] == CUSTOMER_B["name"]


# --- batch CSV ingestion ----------------------------------------------------
def test_batch_upload_validates_rows_server_side(client):
    token = _register(client, CUSTOMER_A)["token"]
    payload = {
        "fileName": "statement.csv",
        "rows": [
            {"rowNumber": 2, "raw": "Swiggy,480,2026-10-01", "merchant": "Swiggy",
             "amount": "480", "date": "2026-10-01", "time": "19:30"},
            {"rowNumber": 3, "raw": "Bad Row,abc", "merchant": "Bad Row",
             "amount": "abc", "date": "2026-10-01"},
            {"rowNumber": 4, "raw": ",999", "merchant": "",
             "amount": "999", "date": "2026-10-01"},
        ],
    }
    res = client.post("/api/v1/transactions/batch", json=payload,
                      headers=_auth(token)).json()
    assert res["fileName"] == "statement.csv"
    assert res["totalRows"] == 3
    assert res["validTransactions"] == 1
    assert res["invalidRows"] == 2
    assert res["breakdown"]["total"] == 1
    assert {e["rowNumber"] for e in res["errors"]} == {3, 4}
    assert res["errors"][0]["reason"]

    listing = client.get("/api/v1/transactions", headers=_auth(token)).json()
    assert listing["total"] == 1

    # a repeat of the same signature is counted as a duplicate, not re-inserted
    res2 = client.post("/api/v1/transactions/batch", json=payload,
                       headers=_auth(token)).json()
    assert res2["duplicates"] == 1
    assert res2["validTransactions"] == 0
    assert client.get("/api/v1/transactions",
                      headers=_auth(token)).json()["total"] == 1


# --- model telemetry --------------------------------------------------------
def test_model_performance_without_artifacts_is_503(client):
    _create_analyst(client, ANALYST)
    token = _login(client, ANALYST)
    r = client.get("/api/v1/analyst/model-performance", headers=_auth(token))
    assert r.status_code == 503


def test_model_performance_serves_real_artifact_metrics(settings):
    """KPIs come from artifacts/metrics.json — no mock values."""
    settings.artifact_path.parent.mkdir(parents=True, exist_ok=True)
    metrics = {
        "validation": {
            "precision": 0.91, "recall": 0.87, "f1": 0.89,
            "roc_auc": 0.95, "pr_auc": 0.9,
            "confusion": {"tn": 100, "fp": 5, "fn": 3, "tp": 42},
        },
        "threshold": {"threshold": 0.42},
    }
    (settings.artifact_path.parent / "metrics.json").write_text(
        json.dumps(metrics), encoding="utf-8"
    )
    app = create_app(settings)
    with TestClient(app) as client:
        user = client.app.state.user_store.create_user(
            user_id=f"USR-{secrets.token_hex(4).upper()}", username="perf.analyst",
            email="perf@fraudguard.test", password="PerfPass1234",
            role="analyst", name="Perf Analyst",
        )
        assert user is not None
        r = client.post("/api/v1/auth/login",
                        json={"identifier": "perf@fraudguard.test",
                              "password": "PerfPass1234"})
        token = r.json()["token"]
        perf = client.get("/api/v1/analyst/model-performance",
                          headers=_auth(token)).json()
    assert perf["kpis"]["precision"] == 0.91
    assert perf["kpis"]["rocAuc"] == 0.95
    assert perf["confusionMatrix"]["truePositive"] == 42
    assert perf["threshold"] == 0.42
    assert json.dumps(perf).find("0.948") == -1  # no hardcoded demo KPIs


# --- analyst overview -------------------------------------------------------
def test_analyst_overview_computed_from_database(client):
    token_a = _register(client, CUSTOMER_A)["token"]
    _create_analyst(client, ANALYST)
    analyst_token = _login(client, ANALYST)

    _add(client, token_a, LEGIT)
    _add(client, token_a, FLAGGED)

    overview = client.get("/api/v1/analyst/overview",
                          headers=_auth(analyst_token)).json()
    kpis = overview["macroKpis"]
    assert kpis["totalTransactions"] == 2
    assert kpis["fraudTransactions"] + kpis["suspiciousTransactions"] == 1
    assert kpis["totalTransactionValue"] == LEGIT["amount"] + FLAGGED["amount"]
    assert len(overview["fraudTrend"]) == 6
    assert overview["riskDistribution"]

    txns = client.get("/api/v1/analyst/transactions",
                      headers=_auth(analyst_token)).json()
    assert txns["total"] == 2
    assert all(t["user"] == CUSTOMER_A["name"] for t in txns["transactions"])
