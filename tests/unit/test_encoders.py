"""HistoricalEncoder: past-only label usage, verified numerically."""
from __future__ import annotations

import numpy as np
import pandas as pd

from src.features.encoders import HistoricalEncoder


def test_first_occurrence_is_prior_woe_zero():
    df = pd.DataFrame({"k": ["a", "a", "a"], "y": [1, 0, 0]})
    enc = HistoricalEncoder("k", prior_rate=0.5, strength=2.0, kind="woe")
    out = enc.fit_transform(df, "y")
    # row 0: no history -> rate == prior -> WOE == 0 exactly
    assert out["k_woe"].iloc[0] == 0.0


def test_uses_only_past_labels():
    df = pd.DataFrame({"k": ["a", "a", "a"], "y": [1, 0, 0]})
    enc = HistoricalEncoder("k", prior_rate=0.5, strength=2.0, kind="woe")
    out = enc.fit_transform(df, "y")
    prior = enc.global_prior  # fit sets prior = mean(y) = 1/3
    # row 1 sees ONLY row 0's label (fraud=1): rate = (1 + p*2) / (1 + 2)
    rate1 = (1 + prior * 2.0) / 3.0
    expected1 = np.log(rate1 / (1 - rate1)) - np.log(prior / (1 - prior))
    assert np.isclose(out["k_woe"].iloc[1], expected1, atol=1e-9)
    # row 2 sees rows 0-1 (1 fraud / 2 txns): rate = (1 + p*2) / (2 + 2)
    rate2 = (1 + prior * 2.0) / 4.0
    expected2 = np.log(rate2 / (1 - rate2)) - np.log(prior / (1 - prior))
    assert np.isclose(out["k_woe"].iloc[2], expected2, atol=1e-9)


def test_future_labels_do_not_change_past_encodings():
    df1 = pd.DataFrame({"k": ["a", "a", "a", "a"], "y": [0, 0, 1, 1]})
    df2 = pd.DataFrame({"k": ["a", "a", "a", "a"], "y": [0, 0, 0, 0]})  # future flipped
    o1 = HistoricalEncoder("k", prior_rate=0.5, strength=2.0).fit_transform(df1, "y")
    o2 = HistoricalEncoder("k", prior_rate=0.5, strength=2.0).fit_transform(df2, "y")
    w1, w2 = o1["k_woe"].to_numpy(), o2["k_woe"].to_numpy()
    # rows 0-2: identical PAST label histories in both frames -> identical WOE
    # (row 2's own label must not affect its own encoding)
    assert np.allclose(w1[:3], w2[:3], equal_nan=True)
    # row 3 legitimately differs: its past includes row 2's flipped label
    assert not np.isclose(w1[3], w2[3])


def test_frequency_encoding_is_log1p_of_past_count():
    df = pd.DataFrame({"k": ["a", "a", "b"], "y": [0, 0, 0]})
    enc = HistoricalEncoder("k", kind="freq")
    out = enc.fit_transform(df, "y")
    assert np.isclose(out["k_freq"].iloc[0], 0.0)
    assert np.isclose(out["k_freq"].iloc[1], np.log1p(1))
    assert np.isclose(out["k_freq"].iloc[2], 0.0)


def test_serving_formula_matches_offline():
    enc = HistoricalEncoder("k", prior_rate=0.5, strength=2.0, kind="woe")
    enc.global_prior = 0.5
    assert enc.encode_serving(0, 0) == 0.0
    assert np.isclose(enc.encode_serving(1, 1), np.log(2), atol=1e-9)
