"""Preprocessing pipeline shared by training and inference.

Design rules:
- Numeric: median impute + StandardScaler (robust enough after clipping).
- Categorical: constant-fill impute + One-Hot with handle_unknown="ignore"
  so unseen merchants/locations at inference never crash.
- The SAME fitted preprocessor is persisted and reused at inference
  (never refit at request time -> no leakage, no drift).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from ml.features import CATEGORICAL_FEATURES, FEATURE_NAMES, NUMERIC_FEATURES


def build_preprocessor() -> ColumnTransformer:
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False, max_categories=40)),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, NUMERIC_FEATURES),
            ("cat", categorical_pipeline, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
        verbose_feature_names_out=True,
    )


def get_feature_names(preprocessor: ColumnTransformer) -> list[str]:
    """Output feature names after transformation."""
    try:
        names = list(preprocessor.get_feature_names_out())
    except AttributeError:  # older sklearn
        names = list(FEATURE_NAMES)
    return [n.split("__", 1)[-1] for n in names]


def transform_features(preprocessor: ColumnTransformer, features: pd.DataFrame) -> np.ndarray:
    """Transform engineered feature rows using a FITTED preprocessor."""
    ordered = features[FEATURE_NAMES]
    return preprocessor.transform(ordered)
