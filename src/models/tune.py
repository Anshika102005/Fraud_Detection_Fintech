"""Optuna hyperparameter optimization with a fraud-specific objective.

Objective = mean PR-AUC across walk-forward folds (NOT accuracy, NOT ROC-AUC).
Each fold retrains from scratch with strict temporal splits, so hyperparameters
are selected for future-prediction performance, not in-sample fit.
"""
from __future__ import annotations

import numpy as np
from sklearn.metrics import average_precision_score

from src.models.train import make_model, scale_pos_weight, walk_forward_splits


def _sample(trial, space: dict) -> dict:
    out = {}
    for name, (lo, hi) in space.items():
        if name in ("max_depth", "num_leaves", "min_child_samples",
                    "min_child_weight", "n_estimators"):
            out[name] = trial.suggest_int(name, int(lo), int(hi))
        elif name in ("learning_rate", "reg_alpha", "reg_lambda", "feature_fraction",
                      "subsample", "colsample_bytree"):
            out[name] = trial.suggest_float(name, float(lo), float(hi), log=True)
        else:
            out[name] = trial.suggest_float(name, float(lo), float(hi))
    return out


def tune_hyperparams(X, y, feats, cfg: dict, model_type: str,
                     n_trials: int, seed: int = 42) -> tuple[dict, float]:
    import optuna
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    folds = walk_forward_splits(feats, cfg)
    base = dict(cfg[model_type]["base"])
    base["n_estimators"] = 200  # fixed budget during search (fast, fair)
    base.pop("early_stopping_rounds", None)
    space = cfg[model_type]["space"]
    max_spw = cfg["imbalance"]["max_spw"]

    def objective(trial):
        params = {**base, **_sample(trial, space)}
        scores = []
        for tr, va in folds:
            model, _ = make_model(model_type, params,
                                  scale_pos_weight(y.iloc[tr].to_numpy(), max_spw), seed)
            model.fit(X.iloc[tr], y.iloc[tr])
            proba = model.predict_proba(X.iloc[va])[:, 1]
            scores.append(average_precision_score(y.iloc[va], proba))
        return float(np.mean(scores))

    study = optuna.create_study(direction="maximize",
                                sampler=optuna.samplers.TPESampler(seed=seed))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
    best = {k: v for k, v in study.best_params.items()}
    return {**base, **best}, float(study.best_value)
