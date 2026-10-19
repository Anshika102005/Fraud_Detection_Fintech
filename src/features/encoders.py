"""Historical (past-only) WOE & frequency encoders for high-cardinality features.

Leakage safety: WOE for row i uses ONLY labels of rows strictly before i for the
same key (expanding, shift(1)), smoothed toward the global prior. This is the
"historical computation" strategy from the blueprint — no cross-fitting needed
because no row ever sees its own or any future label. The same statistics are
maintained online by the batch feature-refresh job, killing training-serving skew.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


class HistoricalEncoder:
    def __init__(self, column: str, prior_rate: float = 0.02, strength: float = 50.0,
                 kind: str = "woe"):
        self.column = column
        self.prior_rate = prior_rate
        self.strength = strength
        self.kind = kind  # "woe" | "freq"
        self.global_prior = prior_rate  # updated on fit

    def fit_transform(self, df: pd.DataFrame, label_col: str,
                      ts_col: str | None = None) -> pd.DataFrame:
        """Fit on TRAIN data and produce the past-only encoded column.

        The prior is the CONFIGURED global fraud-rate constant (e.g. from the
        previous training cycle) — deliberately NOT computed from this frame.

        ts_col MUST be provided for time-correct past-only semantics: rows are
        sorted by (key, time) before the expanding+shift, so a row's encoding
        counts only its key's STRICTLY EARLIER transactions, regardless of the
        caller's frame ordering (a customer-major frame would otherwise leak
        other customers' later transactions into the counts)."""
        self.global_prior = self.prior_rate
        if ts_col is None:
            col = df[self.column]
            n_past = col.groupby(col, observed=True).cumcount().astype(float)
            s_past = (df[label_col].astype(float)
                      .groupby(col, observed=True).expanding().sum()
                      .reset_index(level=0, drop=True)
                      .groupby(col, observed=True).shift(1))
            return self._encode(n_past, s_past)

        tmp = df.sort_values([self.column, ts_col], kind="mergesort")
        c = tmp[self.column]
        n_past = c.groupby(c, observed=True).cumcount().astype(float)
        s_past = (tmp[label_col].astype(float)
                  .groupby(c, observed=True).expanding().sum()
                  .reset_index(level=0, drop=True)
                  .groupby(c, observed=True).shift(1))
        n_past.index, s_past.index = tmp.index, tmp.index
        return self._encode(n_past.reindex(df.index), s_past.reindex(df.index))

    def _encode(self, n_past: pd.Series, s_past: pd.Series) -> pd.DataFrame:
        out = pd.DataFrame(index=n_past.index)
        if self.kind == "freq":
            out[f"{self.column}_freq"] = np.log1p(n_past)
            return out
        # Single prior concept: the training-period fraud rate (global_prior,
        # set on fit) drives BOTH smoothing and the log-ratio baseline, so a
        # key's first occurrence (empty history) maps exactly to WOE = 0.
        prior = min(max(self.global_prior, 1e-6), 1 - 1e-6)
        rate = (s_past.fillna(0.0) + prior * self.strength) / (n_past + self.strength)
        rate = rate.clip(1e-6, 1 - 1e-6)
        out[f"{self.column}_woe"] = np.log(rate / (1 - rate)) - np.log(prior / (1 - prior))
        return out

    # ---- serving-side computation -------------------------------------------
    def encode_serving(self, n_past: float, fraud_past: float) -> float:
        """Identical formula from maintained per-key stats (batch-refreshed)."""
        if self.kind == "freq":
            return float(np.log1p(max(n_past, 0.0)))
        prior = min(max(self.global_prior, 1e-6), 1 - 1e-6)
        rate = (fraud_past + prior * self.strength) / (n_past + self.strength)
        rate = min(max(rate, 1e-6), 1 - 1e-6)
        return float(np.log(rate / (1 - rate)) - np.log(prior / (1 - prior)))
