"""Safety Center service: topic lookup + educational scam checker.

Keyword-rule based educational risk assessment - does NOT claim certainty and
never blocks anything. Kept separate from ML prediction logic.
"""
from __future__ import annotations

from typing import Any

from app.services.safety_knowledge import SAFETY_TOPICS

_SCAM_RULES: list[dict[str, Any]] = [
    {"keywords": ["upi pin", "pin", "otp", "cvv", "password"], "reason": "Asking for PIN/OTP/CVV/password - no legitimate process needs these", "weight": 40},
    {"keywords": ["qr", "scan"], "reason": "QR code / scan request - you never scan to RECEIVE money", "weight": 25},
    {"keywords": ["won", "giveaway", "prize", "lottery", "winner", "reward", "cashback"], "reason": "Unexpected reward or prize - classic bait", "weight": 25},
    {"keywords": ["customer care", "helpline", "support agent", "bank official"], "reason": "Unverified customer care / bank official contact", "weight": 20},
    {"keywords": ["job", "work from home", "part time", "earn", "task"], "reason": "Too-good-to-be-true earning opportunity", "weight": 20},
    {"keywords": ["investment", "trading", "profit", "returns", "double"], "reason": "Investment / guaranteed-return promise", "weight": 25},
    {"keywords": ["arrest", "police", "customs", "legal action", "court"], "reason": "Threats of legal action / 'digital arrest' - police never demand money", "weight": 35},
    {"keywords": ["anydesk", "teamviewer", "screen share", "remote"], "reason": "Remote-access / screen-sharing request", "weight": 35},
    {"keywords": ["urgent", "immediately", "hurry", "last chance", "block", "suspend"], "reason": "Artificial urgency / pressure tactics", "weight": 15},
    {"keywords": ["instagram", "whatsapp", "telegram", "facebook"], "reason": "Approach via social media / messaging platform", "weight": 10},
    {"keywords": ["processing fee", "registration fee", "advance", "deposit", "transfer"], "reason": "Upfront fee or money transfer requested", "weight": 25},
    {"keywords": ["unknown", "stranger"], "reason": "Contact from an unknown sender", "weight": 15},
]


def get_safety_topics() -> list[dict[str, Any]]:
    return SAFETY_TOPICS


def get_safety_topic(topic_id: str) -> dict[str, Any] | None:
    for topic in SAFETY_TOPICS:
        if topic["id"] == topic_id:
            return topic
    return None


def scam_check(user_description: str) -> dict[str, Any]:
    """Educational scam risk assessment. Probabilistic guidance, NOT certainty."""
    text = (user_description or "").lower()
    if not text.strip():
        return {
            "risk_level": "UNKNOWN",
            "confidence_note": "Please describe the situation for an assessment.",
            "warning_signs": [],
            "recommended_actions": [
                "Never share OTP/PIN/CVV - no genuine process asks for them",
                "Report suspected fraud to the 1930 cybercrime helpline",
            ],
            "matched_rules": [],
        }

    warning_signs: list[str] = []
    total_weight = 0
    matched: list[str] = []
    for rule in _SCAM_RULES:
        if any(k in text for k in rule["keywords"]):
            warning_signs.append(rule["reason"])
            total_weight += rule["weight"]
            matched.append(rule["keywords"][0])

    if total_weight >= 60:
        risk_level = "HIGH"
    elif total_weight >= 30:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    recommended_actions = [
        "Do not share OTP, UPI PIN, CVV, or passwords with anyone",
        "Stop all communication and do not transfer money",
        "Report to the National Cyber Crime Helpline 1930 or cybercrime.gov.in",
        "If money was sent, contact your bank immediately to try to freeze the transfer",
    ]
    if risk_level == "HIGH":
        recommended_actions.insert(
            0, "This matches several known scam patterns - do NOT pay anything"
        )

    return {
        "risk_level": risk_level,
        "warning_signs": warning_signs,
        "recommended_actions": recommended_actions,
        "matched_rules": matched,
        "disclaimer": (
            "This is an educational risk assessment, not a certainty. "
            "When in doubt, stop contact and verify through official channels."
        ),
    }
