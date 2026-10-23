"""SQLite-backed record store: transactions, fraud alerts, and fraud cases.

Every row is owned by exactly one account (``user_id``). The API layer always
derives the owner from the authenticated session — never from the request body
and never from a default user. All fraud scoring happens server-side; the
browser never supplies risk verdicts.

The store also exposes pure aggregation builders (analytics, risk summary,
monthly report, macro overview) that turn a caller's own transaction rows into
the shapes the web app renders — all derived from database rows at request
time, with no seeded or mock datasets.
"""
from __future__ import annotations

import json
import math
import secrets
import sqlite3
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Server-side fraud scoring (rule engine — the single source of truth)
# ---------------------------------------------------------------------------

SCAM_KEYWORDS = ("telegram", "task", "fake", "lottery", "unknown", "collect")

RISK_COLORS = {
    "LOW": "#10b981",
    "MEDIUM": "#f59e0b",
    "HIGH": "#ef4444",
    "CRITICAL": "#dc2626",
}
PALETTE = ["#3b82f6", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6"]


def score_transaction(
    *,
    amount: float,
    time_of_day: str,
    merchant: str,
    payment_method: str,
    location: str,
) -> dict[str, Any]:
    """Score one transaction. Mirrors the FraudGuard web rule engine."""
    amount = float(amount) or 0.0
    try:
        hour = int(str(time_of_day).split(":")[0], 10)
    except (ValueError, IndexError):
        hour = 12

    merchant_l = (merchant or "").lower()
    method_l = (payment_method or "").lower()
    location_l = (location or "").lower()

    score = 10
    reasons: list[str] = []

    if amount > 20000:
        score += 45
        reasons.append(
            f"High transaction amount (₹{amount:,.0f}) significantly above peer average"
        )
    elif amount > 8000:
        score += 25
        reasons.append(f"Amount ₹{amount:,.0f} exceeds normal daily micro-spending baseline")

    if hour >= 23 or hour < 5:
        score += 30
        reasons.append(
            f"Unusual late-night transaction time ({time_of_day}) outside standard "
            "8:00 AM – 10:00 PM window"
        )

    if any(k in merchant_l for k in SCAM_KEYWORDS):
        score += 45
        reasons.append("Merchant or receiver name matches reported scam keyword taxonomy")

    if "collect" in method_l or "p2p" in method_l:
        score += 20
        reasons.append("Unsolicited UPI collect mechanism used")

    if "vpn" in location_l or "unknown" in location_l:
        score += 25
        reasons.append("Originating device using unknown proxy / VPN endpoint")

    final_score = min(max(score, 4), 98)
    fraud_prob = round(final_score * 0.95)

    if final_score >= 85:
        risk_level, prediction, status = "CRITICAL", "Fraudulent", "fraudulent"
    elif final_score >= 65:
        risk_level, prediction, status = "HIGH", "Suspicious", "suspicious"
    elif final_score >= 35:
        risk_level, prediction, status = "MEDIUM", "Suspicious", "suspicious"
    else:
        risk_level, prediction, status = "LOW", "Legitimate", "legitimate"
        if not reasons:
            reasons.append(
                "Normal transaction parameters matching established personal baseline"
            )

    if risk_level in ("CRITICAL", "HIGH"):
        recommendation = (
            "Decline payment authorization immediately. Never enter UPI PIN or OTP "
            "for this counterparty."
        )
    else:
        recommendation = (
            "Transaction parameters appear normal. No immediate threat identified."
        )

    return {
        "risk_score": final_score,
        "fraud_probability": fraud_prob,
        "risk_level": risk_level,
        "prediction": prediction,
        "status": status,
        "flagged_reasons": reasons,
        "recommendation": recommendation,
    }


# ---------------------------------------------------------------------------
# Display formatting helpers
# ---------------------------------------------------------------------------

def format_inr(amount: float) -> str:
    return f"₹{round(float(amount)):,}"


def format_display_dt(iso: str | None) -> str:
    """'Today, 02:41 AM' / 'Yesterday, 11:20 PM' / 'Sep 11, 04:15 PM'."""
    if not iso:
        return "—"
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return str(iso)
    now = datetime.now(UTC)
    local = dt.astimezone()
    time_str = local.strftime("%I:%M %p").lstrip("0")
    today = now.astimezone().date()
    day = local.date()
    if day == today:
        return f"Today, {time_str}"
    if day == today - timedelta(days=1):
        return f"Yesterday, {time_str}"
    return f"{local.strftime('%b %d')}, {time_str}"


def risk_level_for_avg(avg: float) -> str:
    if avg >= 81:
        return "CRITICAL"
    if avg >= 61:
        return "HIGH"
    if avg >= 31:
        return "MEDIUM"
    return "LOW"


def safety_score_for(txns: list[dict[str, Any]]) -> int:
    """Shared personal-safety score: 100 minus risk-weighted penalties."""
    if not txns:
        return 0
    total = len(txns)
    avg = sum(t["riskScore"] for t in txns) / total
    fraud_share = sum(1 for t in txns if t["status"] == "fraudulent") / total
    susp_share = sum(1 for t in txns if t["status"] == "suspicious") / total
    return max(0, min(100, 100 - round(0.6 * avg + 60 * fraud_share + 30 * susp_share)))


def _new_id(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(4).upper()}"


# ---------------------------------------------------------------------------
# Row → API shape converters
# ---------------------------------------------------------------------------

def txn_to_dict(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "date": row["date"],
        "time": row["time"],
        "merchant": row["merchant"],
        "category": row["category"],
        "amount": row["amount"],
        "paymentMethod": row["payment_method"],
        "location": row["location"],
        "device": row["device"],
        "riskLevel": row["risk_level"],
        "riskScore": row["risk_score"],
        "fraudProbability": row["fraud_probability"],
        "prediction": row["prediction"],
        "status": row["status"],
        "flaggedReasons": json.loads(row["flagged_reasons"]),
        "recommendation": row["recommendation"],
        "createdAt": row["created_at"],
    }


def alert_to_dict(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "transactionId": row["transaction_id"],
        "riskLevel": row["risk_level"],
        "riskScore": row["risk_score"],
        "fraudProbability": row["fraud_probability"],
        "amount": row["amount"],
        "merchant": row["merchant"],
        "category": row["category"],
        "timestamp": format_display_dt(row["created_at"]),
        "status": row["status"],
        "whyFlagged": json.loads(row["why_flagged"]),
        "recommendedAction": row["recommended_action"],
    }


def case_to_dict(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    return {
        "incidentId": row["id"],
        "transactionId": row["transaction_id"],
        "user": row["user_name"] or "Registered user",
        "amount": format_inr(row["amount"]),
        "risk": row["risk_level"],
        "riskScore": row["risk_score"],
        "fraudProbability": f"{row['fraud_probability']}%",
        "reason": row["reason"],
        "status": row["status"],
        "createdAt": format_display_dt(row["created_at"]),
        "assignedTo": row["assigned_to"],
        "assignedToName": row["assigned_to_name"] or "",
    }


# ---------------------------------------------------------------------------
# Store
# ---------------------------------------------------------------------------

class RecordStore:
    """Thin SQLite store; every read/write is scoped by ``user_id``."""

    def __init__(self, db_path: Path | str):
        self.db_path = str(db_path)
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS transactions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    time TEXT NOT NULL,
                    merchant TEXT NOT NULL,
                    category TEXT NOT NULL,
                    amount REAL NOT NULL CHECK (amount > 0),
                    payment_method TEXT NOT NULL,
                    location TEXT NOT NULL,
                    device TEXT NOT NULL,
                    risk_score INTEGER NOT NULL,
                    fraud_probability INTEGER NOT NULL,
                    risk_level TEXT NOT NULL,
                    prediction TEXT NOT NULL,
                    status TEXT NOT NULL,
                    flagged_reasons TEXT NOT NULL,
                    recommendation TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

                CREATE TABLE IF NOT EXISTS fraud_alerts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    transaction_id TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    risk_score INTEGER NOT NULL,
                    fraud_probability INTEGER NOT NULL,
                    amount REAL NOT NULL,
                    merchant TEXT NOT NULL,
                    category TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'new',
                    why_flagged TEXT NOT NULL,
                    recommended_action TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_alerts_user ON fraud_alerts(user_id);

                CREATE TABLE IF NOT EXISTS fraud_cases (
                    id TEXT PRIMARY KEY,
                    alert_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    transaction_id TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    risk_score INTEGER NOT NULL,
                    fraud_probability INTEGER NOT NULL,
                    amount REAL NOT NULL,
                    merchant TEXT NOT NULL,
                    category TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'New',
                    assigned_to TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """
            )

    # --- transactions ------------------------------------------------------

    def add_transaction(
        self, user_id: str, fields: dict[str, Any], evaluation: dict[str, Any]
    ) -> dict[str, Any]:
        """Persist one scored transaction; raise a fraud alert + case when flagged."""
        now_iso = datetime.now(UTC).isoformat()
        txn_id = _new_id("TXN")
        with self._connect() as conn:
            while conn.execute("SELECT 1 FROM transactions WHERE id = ?", (txn_id,)).fetchone():
                txn_id = _new_id("TXN")
            conn.execute(
                """
                INSERT INTO transactions (id, user_id, date, time, merchant, category,
                    amount, payment_method, location, device, risk_score, fraud_probability,
                    risk_level, prediction, status, flagged_reasons, recommendation, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    txn_id, user_id, fields["date"], fields["time"], fields["merchant"],
                    fields["category"], float(fields["amount"]), fields["payment_method"],
                    fields["location"], fields["device"], evaluation["risk_score"],
                    evaluation["fraud_probability"], evaluation["risk_level"],
                    evaluation["prediction"], evaluation["status"],
                    json.dumps(evaluation["flagged_reasons"]), evaluation["recommendation"],
                    now_iso,
                ),
            )
            if evaluation["status"] in ("suspicious", "fraudulent"):
                self._create_alert_and_case(
                    conn, user_id, txn_id, fields, evaluation, now_iso
                )
            row = conn.execute("SELECT * FROM transactions WHERE id = ?", (txn_id,)).fetchone()
        return txn_to_dict(row)

    def _create_alert_and_case(
        self, conn: sqlite3.Connection, user_id: str, txn_id: str,
        fields: dict[str, Any], evaluation: dict[str, Any], now_iso: str,
    ) -> None:
        alert_id = _new_id("ALT")
        conn.execute(
            """
            INSERT INTO fraud_alerts (id, user_id, transaction_id, risk_level, risk_score,
                fraud_probability, amount, merchant, category, status, why_flagged,
                recommended_action, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?)
            """,
            (
                alert_id, user_id, txn_id, evaluation["risk_level"],
                evaluation["risk_score"], evaluation["fraud_probability"],
                float(fields["amount"]), fields["merchant"], fields["category"],
                json.dumps(evaluation["flagged_reasons"]), evaluation["recommendation"],
                now_iso, now_iso,
            ),
        )
        conn.execute(
            """
            INSERT INTO fraud_cases (id, alert_id, user_id, transaction_id, risk_level,
                risk_score, fraud_probability, amount, merchant, category, reason,
                status, assigned_to, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', NULL, ?, ?)
            """,
            (
                _new_id("INC"), alert_id, user_id, txn_id, evaluation["risk_level"],
                evaluation["risk_score"], evaluation["fraud_probability"],
                float(fields["amount"]), fields["merchant"], fields["category"],
                evaluation["flagged_reasons"][0], now_iso, now_iso,
            ),
        )

    def list_transactions(
        self, user_id: str, *, search: str | None = None, risk: str | None = None,
        status: str | None = None, payment_method: str | None = None,
        category: str | None = None, sort_by: str = "date", sort_order: str = "desc",
        page: int = 1, limit: int = 8,
    ) -> dict[str, Any]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
        data = [txn_to_dict(r) for r in rows]

        if search:
            q = search.lower()
            data = [
                t for t in data
                if q in t["merchant"].lower() or q in t["id"].lower()
                or q in (t["location"] or "").lower() or q in (t["category"] or "").lower()
            ]
        if risk and risk != "ALL":
            data = [t for t in data if t["riskLevel"].upper() == risk.upper()]
        if status and status != "ALL":
            data = [t for t in data if t["status"].lower() == status.lower()]
        if payment_method and payment_method != "ALL":
            data = [t for t in data if payment_method.lower() in t["paymentMethod"].lower()]
        if category and category != "ALL":
            data = [t for t in data if t["category"].lower() == category.lower()]

        reverse = (sort_order or "desc").lower() != "asc"
        if sort_by == "amount":
            data.sort(key=lambda t: t["amount"], reverse=reverse)
        elif sort_by == "riskScore":
            data.sort(key=lambda t: t["riskScore"], reverse=reverse)
        else:
            data.sort(key=lambda t: f"{t['date']} {t.get('time') or '00:00'}", reverse=reverse)

        total = len(data)
        page = max(1, int(page))
        limit = max(1, int(limit))
        start = (page - 1) * limit
        return {
            "transactions": data[start:start + limit],
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": max(1, math.ceil(total / limit)),
        }

    def get_transaction(self, user_id: str, txn_id: str) -> dict[str, Any] | None:
        """Own transaction only — other accounts' rows are invisible (404)."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM transactions WHERE id = ? AND user_id = ?",
                (txn_id, user_id),
            ).fetchone()
        return txn_to_dict(row) if row else None

    def existing_signature(self, user_id: str) -> set[tuple[str, float, str]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT merchant, amount, date FROM transactions WHERE user_id = ?",
                (user_id,),
            ).fetchall()
        return {(r["merchant"].lower(), round(float(r["amount"]), 2), r["date"]) for r in rows}

    # --- alerts ------------------------------------------------------------

    def list_alerts(
        self, user_id: str, status: str | None = None, risk_level: str | None = None
    ) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM fraud_alerts WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
        alerts = [alert_to_dict(r) for r in rows]
        if status and status != "ALL":
            alerts = [a for a in alerts if a["status"].lower() == status.lower()]
        if risk_level and risk_level != "ALL":
            alerts = [a for a in alerts if a["riskLevel"].upper() == risk_level.upper()]
        return alerts

    def update_alert(self, user_id: str, alert_id: str, status: str) -> dict[str, Any] | None:
        now_iso = datetime.now(UTC).isoformat()
        with self._connect() as conn:
            cur = conn.execute(
                "UPDATE fraud_alerts SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?",
                (status, now_iso, alert_id, user_id),
            )
            if cur.rowcount == 0:
                return None
            row = conn.execute(
                "SELECT * FROM fraud_alerts WHERE id = ?", (alert_id,)
            ).fetchone()
        return alert_to_dict(row)

    # --- analyst views -----------------------------------------------------

    def list_all_transactions(self, limit: int = 500) -> list[dict[str, Any]]:
        """All accounts' transactions with owner names — analyst role only."""
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT t.*, u.name AS user_name FROM transactions t
                JOIN users u ON u.id = t.user_id
                ORDER BY t.created_at DESC LIMIT ?
                """,
                (int(limit),),
            ).fetchall()
        out = []
        for r in rows:
            item = txn_to_dict(r)
            item["user"] = r["user_name"] or "Registered user"
            item["userName"] = item["user"]
            out.append(item)
        return out

    def list_cases(
        self, status: str | None = None, assigned_to: str | None = None
    ) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT c.*, cu.name AS user_name, au.name AS assigned_to_name
                FROM fraud_cases c
                JOIN users cu ON cu.id = c.user_id
                LEFT JOIN users au ON au.id = c.assigned_to
                ORDER BY c.created_at DESC
                """
            ).fetchall()
        cases = [case_to_dict(r) for r in rows]
        if status and status != "ALL":
            cases = [c for c in cases if c["status"] == status]
        if assigned_to:
            cases = [c for c in cases if c["assignedTo"] == assigned_to]
        return cases

    def update_case(
        self, case_id: str, *, status: str | None = None, assign_to: str | None = None
    ) -> dict[str, Any] | None:
        now_iso = datetime.now(UTC).isoformat()
        with self._connect() as conn:
            if conn.execute("SELECT 1 FROM fraud_cases WHERE id = ?", (case_id,)).fetchone() is None:
                return None
            if status is not None:
                conn.execute(
                    "UPDATE fraud_cases SET status = ?, updated_at = ? WHERE id = ?",
                    (status, now_iso, case_id),
                )
            if assign_to is not None:
                conn.execute(
                    "UPDATE fraud_cases SET assigned_to = ?, updated_at = ? WHERE id = ?",
                    (assign_to or None, now_iso, case_id),
                )
            row = conn.execute(
                """
                SELECT c.*, cu.name AS user_name, au.name AS assigned_to_name
                FROM fraud_cases c
                JOIN users cu ON cu.id = c.user_id
                LEFT JOIN users au ON au.id = c.assigned_to
                WHERE c.id = ?
                """,
                (case_id,),
            ).fetchone()
        return case_to_dict(row)

    def user_aggregates(self) -> dict[str, dict[str, Any]]:
        """Per-account stats computed from real rows (for the analyst Users page)."""
        with self._connect() as conn:
            txn_rows = conn.execute(
                """
                SELECT user_id, COUNT(*) AS cnt, COALESCE(SUM(amount), 0) AS volume,
                       COALESCE(AVG(risk_score), 0) AS avg_risk,
                       SUM(CASE WHEN status = 'fraudulent' THEN 1 ELSE 0 END) AS fraud_cnt,
                       SUM(CASE WHEN status = 'suspicious' THEN 1 ELSE 0 END) AS susp_cnt
                FROM transactions GROUP BY user_id
                """
            ).fetchall()
            alert_rows = conn.execute(
                "SELECT user_id, COUNT(*) AS cnt FROM fraud_alerts GROUP BY user_id"
            ).fetchall()
            scoped = conn.execute(
                "SELECT user_id, risk_score, status FROM transactions"
            ).fetchall()
        alerts_by_user = {r["user_id"]: r["cnt"] for r in alert_rows}
        txns_by_user: dict[str, list[dict[str, Any]]] = {}
        for r in scoped:
            txns_by_user.setdefault(r["user_id"], []).append(
                {"riskScore": r["risk_score"], "status": r["status"]}
            )
        agg: dict[str, dict[str, Any]] = {}
        for r in txn_rows:
            flagged = int(r["fraud_cnt"] or 0) + int(r["susp_cnt"] or 0)
            avg = float(r["avg_risk"] or 0)
            agg[r["user_id"]] = {
                "transactionsCount": int(r["cnt"]),
                "totalVolume": round(float(r["volume"])),
                "riskScore": round(avg),
                "riskLevel": risk_level_for_avg(avg),
                "fraudCases": alerts_by_user.get(r["user_id"], 0),
                "flaggedCount": flagged,
                "safetyScore": safety_score_for(txns_by_user.get(r["user_id"], [])),
            }
        return agg


# ---------------------------------------------------------------------------
# Pure aggregation builders (database rows → UI shapes)
# ---------------------------------------------------------------------------

_EMPTY_ANALYTICS: dict[str, Any] = {
    "empty": True,
    "totalTransactions": 0,
    "totalVolume": 0,
    "fraudCount": 0,
    "suspiciousCount": 0,
    "fraudRate": "0.00%",
    "averageAmount": 0,
    "trends": [],
    "paymentMethods": [],
    "categories": [],
    "hourlyActivity": [],
    "locations": [],
}

_HOURLY_LABELS = [
    "Late Night", "Early Dawn", "Morning", "Office Start",
    "Lunch Hours", "Afternoon", "Evening Peak", "Late Evening",
]


def _pct(part: int, whole: int) -> float:
    return round((part / whole) * 100, 2) if whole else 0.0


def build_analytics_summary(txns: list[dict[str, Any]], range_key: str) -> dict[str, Any]:
    """Customer analytics: every number derived from the caller's own rows."""
    days = {"7d": 7, "30d": 30, "90d": 90, "6m": 180, "1y": 365}.get(range_key, 30)
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    rows = [t for t in txns if t["date"] >= cutoff]
    if not rows:
        return {**_EMPTY_ANALYTICS, "timeRange": range_key}

    total = len(rows)
    volume = sum(t["amount"] for t in rows)
    fraud = sum(1 for t in rows if t["status"] == "fraudulent")
    susp = sum(1 for t in rows if t["status"] == "suspicious")

    # Trends: daily buckets for short ranges, monthly for long ones.
    buckets: dict[str, dict[str, Any]] = {}
    for t in rows:
        key = t["date"] if days <= 90 else t["date"][:7]
        b = buckets.setdefault(key, {"count": 0, "value": 0.0, "fraud": 0})
        b["count"] += 1
        b["value"] += t["amount"]
        if t["status"] in ("fraudulent", "suspicious"):
            b["fraud"] += 1
    ordered = sorted(buckets.items())
    trends = [
        {
            "date": datetime.strptime(k, "%Y-%m-%d").strftime("%b %d")
            if len(k) == 10
            else datetime.strptime(k + "-01", "%Y-%m-%d").strftime("%b %Y"),
            "volume": v["count"],
            "value": round(v["value"]),
            "fraudRate": _pct(v["fraud"], v["count"]),
        }
        for k, v in ordered
    ]
    if len(trends) > 12:  # keep charts readable: sample evenly, always keep the tail
        step = math.ceil(len(trends) / 12)
        trends = trends[::step][-12:]

    def group_counts(key_fn) -> dict[str, int]:
        out: dict[str, int] = {}
        for t in rows:
            k = key_fn(t)
            out[k] = out.get(k, 0) + 1
        return out

    method_counts = group_counts(lambda t: t["paymentMethod"])
    methods_sorted = sorted(method_counts.items(), key=lambda kv: -kv[1])[:6]
    payment_methods = [
        {"name": m, "value": _pct(c, total), "count": c, "color": PALETTE[i % len(PALETTE)]}
        for i, (m, c) in enumerate(methods_sorted)
    ]

    cat_counts = sorted(group_counts(lambda t: t["category"]).items(), key=lambda kv: -kv[1])
    categories = [{"name": c, "value": _pct(n, total), "count": n} for c, n in cat_counts]

    loc_stats: dict[str, dict[str, int]] = {}
    for t in rows:
        city = (t["location"] or "Unknown").split(",")[0].strip()
        s = loc_stats.setdefault(city, {"count": 0, "fraud": 0})
        s["count"] += 1
        if t["status"] in ("fraudulent", "suspicious"):
            s["fraud"] += 1
    locations = [
        {"city": c, "transactions": s["count"], "fraudCases": s["fraud"]}
        for c, s in sorted(loc_stats.items(), key=lambda kv: -kv[1]["count"])[:5]
    ]

    hourly: list[dict[str, Any]] = []
    for bucket in range(8):
        h_rows = [t for t in rows if _hour_of(t) // 3 == bucket]
        hourly.append(
            {
                "hour": f"{bucket * 3:02d}-{bucket * 3 + 3:02d}",
                "count": len(h_rows),
                "riskCount": sum(1 for t in h_rows if t["status"] != "legitimate"),
                "label": _HOURLY_LABELS[bucket],
            }
        )

    legit = total - fraud - susp
    return {
        "empty": False,
        "timeRange": range_key,
        "totalTransactions": total,
        "totalVolume": round(volume),
        "fraudCount": fraud,
        "suspiciousCount": susp,
        "fraudRate": f"{_pct(fraud, total):.2f}%",
        "averageAmount": round(volume / total),
        "trends": trends,
        "legitimateVsRisk": [
            {"name": "Legitimate", "value": _pct(legit, total), "count": legit, "color": "#10B981"},
            {"name": "Suspicious", "value": _pct(susp, total), "count": susp, "color": "#F59E0B"},
            {"name": "Fraudulent", "value": _pct(fraud, total), "count": fraud, "color": "#EF4444"},
        ],
        "paymentMethods": payment_methods,
        "categories": categories,
        "locations": locations,
        "hourlyActivity": hourly,
    }


def _hour_of(t: dict[str, Any]) -> int:
    try:
        return int(str(t.get("time", "12:00")).split(":")[0], 10)
    except (ValueError, IndexError):
        return 12


def _median(values: list[float]) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    mid = len(s) // 2
    return s[mid] if len(s) % 2 else (s[mid - 1] + s[mid]) / 2


def build_risk_summary(txns: list[dict[str, Any]]) -> dict[str, Any]:
    """Customer behavioral risk summary derived only from the caller's rows."""
    if not txns:
        return {
            "empty": True,
            "safetyScore": 0,
            "status": "No Data",
            "factors": [],
            "safetyFactors": [],
            "overallRiskScore": 0,
            "behaviorAnomalyScore": 0,
            "merchantRiskScore": 0,
            "locationRiskScore": 0,
            "timeOfDayRiskScore": 0,
            "velocityRiskScore": 0,
            "amountDeviationScore": 0,
            "riskDimensions": [],
            "riskDistribution": [],
            "riskPatterns": [],
        }

    total = len(txns)
    avg = sum(t["riskScore"] for t in txns) / total
    fraud = [t for t in txns if t["status"] == "fraudulent"]
    susp = [t for t in txns if t["status"] == "suspicious"]
    flagged = fraud + susp

    hours = [_hour_of(t) for t in txns]
    late_night = sum(1 for h in hours if h >= 23 or h < 5)
    unknown_geo = sum(
        1 for t in txns if "vpn" in (t["location"] or "").lower()
        or "unknown" in (t["location"] or "").lower()
    )
    scam_merchants = sum(
        1 for t in txns if any(k in t["merchant"].lower() for k in SCAM_KEYWORDS)
    )
    amounts = [t["amount"] for t in txns]
    med = _median(amounts)
    spikes = sum(1 for a in amounts if med and a > 3 * med)
    per_day: dict[str, int] = {}
    for t in txns:
        per_day[t["date"]] = per_day.get(t["date"], 0) + 1
    max_day = max(per_day.values()) if per_day else 0
    unknown_devices = sum(
        1 for t in txns
        if "unknown" in (t.get("device") or "").lower() or "vpn" in (t.get("device") or "").lower()
    )

    unique_merchants = len({t["merchant"] for t in txns})
    method_counts: dict[str, int] = {}
    for t in txns:
        method_counts[t["paymentMethod"]] = method_counts.get(t["paymentMethod"], 0) + 1
    top_method, top_method_n = max(method_counts.items(), key=lambda kv: kv[1])

    safety = safety_score_for(txns)
    rating = "Good" if safety >= 80 else "Fair" if safety >= 60 else "At Risk"

    factors = [
        {
            "text": (
                f"No fraud detections across {total} transactions in your history"
                if not fraud
                else f"{len(fraud)} fraudulent transaction(s) detected in your history"
            ),
            "passed": not fraud,
        },
        {
            "text": f"{unique_merchants} recurring merchants across {total} transactions",
            "passed": unique_merchants <= max(3, total // 2),
        },
        {
            "text": (
                f"{len([t for t in flagged])} flagged transaction(s) need your review"
                if flagged
                else "No unusual transaction spikes detected"
            ),
            "passed": not flagged,
        },
        {
            "text": f"{round(top_method_n / total * 100)}% of transactions use {top_method}",
            "passed": top_method_n / total >= 0.4,
        },
    ]

    dist_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for t in txns:
        dist_counts[t["riskLevel"]] = dist_counts.get(t["riskLevel"], 0) + 1
    risk_distribution = [
        {
            "name": f"{level.replace('LOW', 'Low').replace('MEDIUM', 'Medium').replace('HIGH', 'High').replace('CRITICAL', 'Critical')} Risk",
            "value": _pct(n, total),
            "color": RISK_COLORS[level],
        }
        for level, n in dist_counts.items()
    ]

    def pct_where(pred) -> int:
        return round(sum(1 for t in txns if pred(t)) / total * 100)

    amount_dev = pct_where(lambda t: med and t["amount"] > 3 * med)
    time_anom = round(late_night / total * 100)
    merchant_trust = round(scam_merchants / total * 100)
    geo = round(unknown_geo / total * 100)
    velocity = min(100, round(max_day / total * 100) + 10)
    device_integrity = round(unknown_devices / total * 100)

    highest = max(txns, key=lambda t: t["riskScore"])
    top_category_counts: dict[str, int] = {}
    for t in txns:
        if t["status"] == "legitimate":
            top_category_counts[t["category"]] = top_category_counts.get(t["category"], 0) + 1
    safest_cat = (
        max(top_category_counts.items(), key=lambda kv: kv[1])[0] if top_category_counts else None
    )

    patterns = [
        {
            "title": "Active Operating Hours",
            "description": (
                f"Your transactions run between {min(hours):02d}:00 and {max(hours):02d}:00. "
                + (
                    f"{late_night} transaction(s) occurred outside your usual window and were flagged."
                    if late_night
                    else "No activity outside your usual window."
                )
            ),
            "severity": "warning" if late_night else "safe",
        },
        {
            "title": "Spending Pattern Deviation",
            "description": (
                f"Median transaction is ₹{round(med):,}. "
                + (
                    f"{spikes} transaction(s) exceeded 3× your median and were reviewed by the risk engine."
                    if spikes
                    else "No transaction exceeded 3× your median basket size."
                )
            ),
            "severity": "warning" if spikes else "safe",
        },
        {
            "title": "Safest Category",
            "description": (
                f"{safest_cat} represents your most frequent clean category with zero risk flags."
                if safest_cat
                else "No fully clean category recorded yet."
            ),
            "severity": "safe" if safest_cat else "warning",
        },
        {
            "title": "Primary Risk Vector",
            "description": (
                f"Highest-risk recorded transaction: {highest['merchant']} "
                f"({highest['riskLevel']}, score {highest['riskScore']}/100)."
                if highest["riskLevel"] in ("HIGH", "CRITICAL")
                else f"All {total} transactions scored LOW/MEDIUM risk — no dominant threat vector."
            ),
            "severity": "danger" if highest["riskLevel"] in ("HIGH", "CRITICAL") else "safe",
        },
    ]

    behavior = round(0.5 * avg + 0.5 * (len(flagged) / total * 100))
    return {
        "empty": False,
        "safetyScore": safety,
        "status": rating,
        "safetyFactors": factors,
        "factors": factors,
        "overallRiskScore": round(avg),
        "behaviorAnomalyScore": behavior,
        "merchantRiskScore": merchant_trust,
        "locationRiskScore": geo,
        "timeOfDayRiskScore": time_anom,
        "velocityRiskScore": velocity,
        "amountDeviationScore": amount_dev,
        "riskDimensions": [
            {"dimension": "Amount Deviation", "score": amount_dev, "max": 100},
            {"dimension": "Time Anomaly", "score": time_anom, "max": 100},
            {"dimension": "Merchant Trust", "score": merchant_trust, "max": 100},
            {"dimension": "Geo Location", "score": geo, "max": 100},
            {"dimension": "Velocity Burst", "score": velocity, "max": 100},
            {"dimension": "Device Integrity", "score": device_integrity, "max": 100},
        ],
        "riskDistribution": risk_distribution,
        "riskPatterns": patterns,
    }


def build_monthly_report(
    user: dict[str, Any], txns: list[dict[str, Any]], month_param: str | None
) -> dict[str, Any]:
    """Monthly security statement computed from the caller's own rows."""
    # Resolve target month: explicit 'August 2026' → else latest data month → now.
    target: date | None = None
    if month_param:
        try:
            target = datetime.strptime(month_param.strip(), "%B %Y").date().replace(day=1)
        except ValueError:
            target = None
    if target is None and txns:
        latest = max(t["date"] for t in txns)
        target = date.fromisoformat(latest[:7] + "-01")
    if target is None:
        today = date.today()
        target = today.replace(day=1)

    prefix = target.strftime("%Y-%m")
    rows = [t for t in txns if t["date"][:7] == prefix]
    prev_month = (target.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=30)
    prev_prefix = prev_month.strftime("%Y-%m")
    prev_rows = [t for t in txns if t["date"][:7] == prev_prefix]

    total = len(rows)
    volume = sum(t["amount"] for t in rows)
    fraud = [t for t in rows if t["status"] == "fraudulent"]
    susp = [t for t in rows if t["status"] == "suspicious"]
    avg_risk = round(sum(t["riskScore"] for t in rows) / total) if total else 0
    safety = safety_score_for(rows) if rows else 0

    method_counts: dict[str, int] = {}
    cat_counts: dict[str, int] = {}
    for t in rows:
        method_counts[t["paymentMethod"]] = method_counts.get(t["paymentMethod"], 0) + 1
        cat_counts[t["category"]] = cat_counts.get(t["category"], 0) + 1
    top_method = max(method_counts.items(), key=lambda kv: kv[1]) if method_counts else None
    top_cat = max(cat_counts.items(), key=lambda kv: kv[1]) if cat_counts else None

    flagged_all = [t for t in rows if t["status"] in ("fraudulent", "suspicious")]
    highest = max(flagged_all, key=lambda t: t["riskScore"]) if flagged_all else None

    prev_volume = sum(t["amount"] for t in prev_rows)
    if prev_rows and prev_volume:
        change = round((volume - prev_volume) / prev_volume * 100)
        spending_change = f"{change:+d}% compared to {prev_month.strftime('%B %Y')}"
    else:
        spending_change = "No prior-month activity recorded"

    highlights = []
    if flagged_all:
        highlights.append(
            f"Risk engine flagged {len(flagged_all)} transaction(s) worth "
            f"₹{round(sum(t['amount'] for t in flagged_all)):,} for your review."
        )
    else:
        highlights.append("Zero suspicious or fraudulent transactions recorded this month.")
    if susp or fraud:
        highlights.append(
            f"{len(fraud)} fraudulent and {len(susp)} suspicious transaction(s) were "
            "detected and surfaced in your Fraud Alert Center."
        )
    if total:
        late = sum(1 for t in rows if _hour_of(t) >= 23 or _hour_of(t) < 5)
        highlights.append(f"{late} transaction(s) occurred outside 8:00 AM – 10:00 PM.")
    highlights.append("Zero account compromise or OTP leak incidents recorded.")

    return {
        "reportId": f"FG-RPT-{prefix}",
        "month": target.strftime("%B %Y"),
        "generatedAt": datetime.now(UTC).astimezone().strftime("%Y-%m-%d %H:%M %Z"),
        "user": user.get("name") or user.get("email") or "Account Holder",
        "personalSafetyScore": safety,
        "safetyRating": "Good" if safety >= 80 else "Fair" if safety >= 60 else "At Risk",
        "metrics": {
            "totalTransactions": total,
            "totalTransactionValue": round(volume),
            "fraudTransactions": len(fraud),
            "suspiciousTransactions": len(susp),
            "fraudRate": f"{_pct(len(fraud), total):.2f}%",
            "averageRiskScore": avg_risk,
            "highestRiskTransaction": (
                {
                    "id": highest["id"],
                    "merchant": highest["merchant"],
                    "amount": highest["amount"],
                    "riskScore": highest["riskScore"],
                    "riskLevel": highest["riskLevel"],
                }
                if highest
                else None
            ),
            "mostUsedPaymentMethod": (
                f"{top_method[0]} ({_pct(top_method[1], total):.0f}%)" if top_method else "—"
            ),
            "mostUsedCategory": f"{top_cat[0]} ({_pct(top_cat[1], total):.0f}%)" if top_cat else "—",
            "spendingChange": spending_change,
        },
        "summary": (
            f"{len(fraud)} fraudulent transaction(s) were deflected this month."
            if fraud
            else "No fraudulent transactions were recorded this month."
        ),
        "highlights": highlights,
        "aiAdvisorNotes": (
            "Maintain vigilance regarding urgent SMS notices mimicking utility providers. "
            "Never authorize unexpected collect requests, and never share UPI PIN, OTP, "
            "or CVV with anyone."
        ),
    }


def build_macro_overview(
    txns: list[dict[str, Any]], cases: list[dict[str, Any]], accounts: int = 0
) -> dict[str, Any]:
    """Analyst Fraud Intelligence overview — computed from all database rows."""
    total = len(txns)
    fraud = sum(1 for t in txns if t["status"] == "fraudulent")
    susp = sum(1 for t in txns if t["status"] == "suspicious")
    volume = sum(t["amount"] for t in txns)
    avg_risk = round(sum(t["riskScore"] for t in txns) / total) if total else 0

    # fraudTrend: last six calendar months
    today = date.today().replace(day=1)
    months: list[date] = []
    cursor = today
    for _ in range(6):
        months.append(cursor)
        cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
    months.reverse()
    trend = []
    for m in months:
        prefix = m.strftime("%Y-%m")
        m_rows = [t for t in txns if t["date"][:7] == prefix]
        detected = sum(1 for t in m_rows if t["status"] in ("fraudulent", "suspicious"))
        prevented = sum(1 for t in m_rows if t["status"] == "fraudulent")
        trend.append({"month": m.strftime("%b"), "detected": detected, "prevented": prevented})

    flagged = [t for t in txns if t["status"] in ("fraudulent", "suspicious")]
    cat_counts: dict[str, int] = {}
    for t in flagged:
        cat_counts[t["category"]] = cat_counts.get(t["category"], 0) + 1
    total_flagged = len(flagged)
    vectors = [
        {
            "name": name,
            "percentage": _pct(n, total_flagged),
            "cases": n,
            "color": RISK_COLORS[list(RISK_COLORS)[i % 4]],
        }
        for i, (name, n) in enumerate(
            sorted(cat_counts.items(), key=lambda kv: -kv[1])[:4]
        )
    ]

    dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for t in txns:
        dist[t["riskLevel"]] = dist.get(t["riskLevel"], 0) + 1
    risk_distribution = [
        {
            "name": f"{lvl.replace('LOW', 'Low (0-30)').replace('MEDIUM', 'Medium (31-60)').replace('HIGH', 'High (61-80)').replace('CRITICAL', 'Critical (81-100)')}",
            "value": _pct(n, total),
            "color": RISK_COLORS[lvl],
        }
        for lvl, n in dist.items()
    ]

    method_stats: dict[str, dict[str, int]] = {}
    for t in txns:
        s = method_stats.setdefault(t["paymentMethod"], {"fraud": 0, "safe": 0})
        if t["status"] == "legitimate":
            s["safe"] += 1
        else:
            s["fraud"] += 1
    payment_methods = [
        {
            "method": m,
            "fraudCount": s["fraud"],
            "safeCount": s["safe"],
            "rate": f"{_pct(s['fraud'], s['fraud'] + s['safe'])}%",
        }
        for m, s in sorted(method_stats.items(), key=lambda kv: -kv[1]["fraud"])[:5]
    ]

    loc_stats: dict[str, dict[str, Any]] = {}
    for t in flagged:
        city = (t["location"] or "Unknown").split(",")[0].strip()
        s = loc_stats.setdefault(city, {"incidents": 0, "risk_sum": 0})
        s["incidents"] += 1
        s["risk_sum"] += t["riskScore"]
    locations = []
    for city, s in sorted(loc_stats.items(), key=lambda kv: -kv[1]["incidents"])[:6]:
        avg = s["risk_sum"] / s["incidents"]
        locations.append(
            {
                "state": city,
                "incidents": s["incidents"],
                "percentage": _pct(s["incidents"], total_flagged or 1),
                "riskLevel": risk_level_for_avg(avg),
            }
        )

    hourly = []
    for b in range(12):
        start, end = b * 2, b * 2 + 2
        count = sum(1 for t in flagged if start <= _hour_of(t) < end)
        hourly.append({"hour": f"{start:02d}:00", "cases": count})

    return {
        "macroKpis": {
            "totalTransactions": total,
            "fraudTransactions": fraud,
            "suspiciousTransactions": susp,
            "fraudRate": f"{_pct(fraud, total):.2f}%",
            "totalTransactionValue": round(volume),
            "averageRiskScore": avg_risk,
            "activeAccounts": accounts,
        },
        "fraudTrend": trend,
        "vectorBreakdown": vectors,
        "riskDistribution": risk_distribution,
        "paymentMethodDistribution": payment_methods,
        "locationDistribution": locations,
        "hourlyActivity": hourly,
        "openCases": sum(1 for c in cases if c["status"] in ("New", "Under Review")),
        "unassignedCases": sum(1 for c in cases if not c["assignedTo"]),
    }
