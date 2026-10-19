"""Risk-band policy: configurable bands, no hard-coded 0.5."""
from __future__ import annotations

from src.models.threshold import RiskPolicy


def test_bands_match_config(policy):
    assert policy.evaluate(0.05) == ("LOW", "APPROVE")
    assert policy.evaluate(0.30) == ("LOW", "APPROVE")     # inclusive boundary
    assert policy.evaluate(0.31) == ("MEDIUM", "REVIEW")
    assert policy.evaluate(0.70) == ("MEDIUM", "REVIEW")
    assert policy.evaluate(0.75) == ("HIGH", "DECLINE")
    assert policy.evaluate(0.95) == ("CRITICAL", "BLOCK")
    assert policy.evaluate(1.50) == ("CRITICAL", "BLOCK")  # safety catch-all


def test_policy_is_config_driven():
    custom = RiskPolicy([
        {"name": "GREEN", "max_p": 0.5, "decision": "APPROVE"},
        {"name": "RED", "max_p": 1.01, "decision": "BLOCK"},
    ])
    assert custom.evaluate(0.49) == ("GREEN", "APPROVE")
    assert custom.evaluate(0.51) == ("RED", "BLOCK")
