"""Training entrypoint (MLflow-wrapped): `python -m src.models.train`.

Pipeline: load/generate -> build point-in-time features -> walk-forward
validation with label embargo -> (optional Optuna tuning) -> fit final model ->
cost-based threshold optimization on OOF predictions -> SHAP -> artifact bundle.

The artifact bundle is the single serving contract: model + feature order +
threshold + risk policy + encoder priors + drift reference stats + metadata.
Serving loads ONLY this bundle -> no training-serving skew by construction.
"""
from __future__ import annotations

import argparse
import json
import time
from datetime import UTC, datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from src.config import ROOT, load_model_config, load_risk_policy
from src.features.builder import build_dataset
from src.models.evaluate import evaluate_fraud
from src.models.threshold import RiskPolicy, optimize_threshold

ARTIFACTS = ROOT / "artifacts"


def load_transactions(path: str | None, args) -> pd.DataFrame:
    if path:
        p = Path(path)
        return pd.read_parquet(p) if p.suffix == ".parquet" else pd.read_csv(p)
    from src.data.generate_synthetic import generate
    return generate(args.cards, args.merchants, args.days, args.fraud_rate, args.seed)


def final_holdout_indices(df: pd.DataFrame, holdout_fraction: float) -> np.ndarray:
    """Time-based holdout: the LAST `holdout_fraction` of the timeline."""
    cutoff = df["txn_ts"].quantile(1.0 - holdout_fraction)
    return np.flatnonzero(df["txn_ts"].to_numpy() >= cutoff)


def walk_forward_splits(df: pd.DataFrame, cfg: dict,
                        exclude: np.ndarray | None = None) -> list[tuple[np.ndarray, np.ndarray]]:
    """Expanding-window folds that simulate real-world future prediction.

    Fold i:  train = {ts <= edge_i - embargo} AND {label known before edge_i}
             val   = [edge_i, edge_{i+1})
    The double filter kills both future leakage AND label leakage from
    late-arriving chargebacks ( embargo_days >= max chargeback delay).
    """
    v = cfg["validation"]
    n_folds, embargo = v["folds"], int(v["embargo_days"])
    mask = np.ones(len(df), bool) if exclude is None else ~np.isin(np.arange(len(df)), exclude)
    ts = df["txn_ts"].to_numpy()
    lab = pd.to_datetime(df["label_ts"]).to_numpy()
    t_train_end = df.loc[mask, "txn_ts"].quantile(1.0) if mask.any() else df["txn_ts"].quantile(1.0)
    t0, t1 = df.loc[mask, "txn_ts"].quantile(0.0), t_train_end
    span = (t1 - t0) / (n_folds + 1)
    folds = []
    for i in range(1, n_folds + 1):
        edge = t0 + span * i
        edge_next = t0 + span * (i + 1) if i < n_folds else t1 + pd.Timedelta(seconds=1)
        embargo_edge = pd.Timestamp(edge) - pd.Timedelta(days=embargo)
        tr = np.flatnonzero(mask & (ts <= np.datetime64(embargo_edge))
                            & (lab <= np.datetime64(pd.Timestamp(edge))))
        va = np.flatnonzero(mask & (ts >= np.datetime64(pd.Timestamp(edge)))
                            & (ts < np.datetime64(pd.Timestamp(edge_next))))
        if len(tr) and len(va):
            folds.append((tr, va))
    return folds


def scale_pos_weight(y_tr: np.ndarray, cap: float) -> float:
    pos = max(1, int(y_tr.sum()))
    return float(min((len(y_tr) - pos) / pos, cap))


def make_model(model_type: str, params: dict, spw: float, seed: int = 42):
    if model_type == "xgboost":
        from xgboost import XGBClassifier
        p = dict(params)
        es = p.pop("early_stopping_rounds", 50)
        return XGBClassifier(scale_pos_weight=spw, random_state=seed, n_jobs=-1,
                             early_stopping_rounds=es, eval_metric="aucpr",
                             **p), es
    from lightgbm import LGBMClassifier
    return LGBMClassifier(scale_pos_weight=spw, random_state=seed, n_jobs=-1,
                          **params), 50


def fit_model(model, X, y, tr, va_internal, model_type: str):
    """Fit with early stopping on an internal, time-later validation slice."""
    from lightgbm import early_stopping, log_evaluation
    if model_type == "xgboost":
        model.fit(X.iloc[tr], y.iloc[tr], eval_set=[(X.iloc[va_internal], y.iloc[va_internal])],
                  verbose=False)
    else:
        model.fit(X.iloc[tr], y.iloc[tr],
                  eval_set=[(X.iloc[va_internal], y.iloc[va_internal])],
                  callbacks=[early_stopping(50, verbose=False), log_evaluation(0)])
    return model

def compute_oof(X, y, feats, folds, model_type: str, params: dict,
                spw_cap: float, seed: int = 42) -> pd.Series:
    """Out-of-fold validation predictions (the validation plane)."""
    oof = pd.Series(np.nan, index=y.index, dtype=float)
    for tr, va in folds:
        m = fit_final(X, y, feats, tr, model_type, params,
                      scale_pos_weight(y.iloc[tr].to_numpy(), spw_cap), seed)
        oof.iloc[va] = m.predict_proba(X.iloc[va])[:, 1]
    return oof


def fit_final(X, y, feats, tr_idx, model_type: str, params: dict, spw: float,
              seed: int = 42):
    """Fit on training region; early stopping on an internal, time-later slice
    (last 10% of the training window) — never on the final holdout."""
    from lightgbm import early_stopping, log_evaluation
    ts = feats["txn_ts"].to_numpy()[tr_idx]
    order = np.argsort(ts, kind="stable")
    k = int(len(tr_idx) * 0.9)
    fit_idx, es_idx = tr_idx[order[:k]], tr_idx[order[k:]]
    y_es = y.iloc[es_idx]
    use_es = len(es_idx) > 50 and len(y_es.unique()) == 2 and y_es.sum() > 0
    model, _ = make_model(model_type, params, spw, seed)
    if model_type == "xgboost" and not use_es:
        model.early_stopping_rounds = None
    if use_es:
        if model_type == "xgboost":
            model.fit(X.iloc[fit_idx], y.iloc[fit_idx],
                      eval_set=[(X.iloc[es_idx], y_es)], verbose=False)
        else:
            model.fit(X.iloc[fit_idx], y.iloc[fit_idx],
                      eval_set=[(X.iloc[es_idx], y_es)],
                      callbacks=[early_stopping(50, verbose=False), log_evaluation(0)])
    else:
        model.fit(X.iloc[fit_idx], y.iloc[fit_idx],
                  callbacks=[log_evaluation(0)] if model_type != "xgboost" else None)
    return model


def reference_stats(X: pd.DataFrame) -> dict:
    """Drift-monitoring baseline: quantile bins + moments per feature (train only)."""
    stats = {}
    for col in X.columns:
        v = X[col].astype(float).to_numpy()
        v = v[np.isfinite(v)]
        if len(v) < 100:
            continue
        stats[col] = {
            "quantiles": np.quantile(v, np.linspace(0, 1, 11)).tolist(),
            "mean": float(v.mean()), "std": float(v.std()), "n": int(len(v)),
        }
    return stats

def build_bundle(model, model_type, X, y, feats, th, policy, val_metrics,
                 holdout_metrics, fold_aucs, params, global_importance, cfg,
                 encoder_cfg=None) -> dict:
    return {
        "model": model,
        "model_type": model_type,
        "feature_names": list(X.columns),
        "threshold": th["threshold"],
        "risk_policy": policy.to_dict(),
        "cost_model": cfg["cost_model"],
        "metrics": {"validation": val_metrics, "holdout": holdout_metrics,
                    "fold_pr_aucs": fold_aucs, "threshold_opt": th},
        "params": {k: (v if isinstance(v, (int, float, str, bool, type(None))) else str(v))
                   for k, v in params.items()},
        "reference_stats": reference_stats(X),
        "global_importance": global_importance,
        "encoder_cfg": encoder_cfg or {},
        "merchant_smoothing": cfg.get("merchant_smoothing", {}),
        "woe_smoothing": cfg.get("woe_smoothing", 50),
        "metadata": {
            "trained_at": datetime.now(UTC).isoformat(),
            "n_rows": int(len(y)),
            "fraud_rate": float(y.mean()),
            "data_start": str(feats["txn_ts"].min()),
            "data_end": str(feats["txn_ts"].max()),
            "note": "bundle is the single serving contract (model+policy+stats)",
        },
    }


def _mlflow_log(args, bundle, artifacts_dir: Path, best_value) -> str | None:
    if args.no_mlflow:
        return None
    try:
        import mlflow
        from mlflow.tracking import MlflowClient
    except ImportError:
        return None
    from src.config import get_settings
    s = get_settings()
    if not s.mlflow_enabled:
        return None
    mlflow.set_tracking_uri(s.mlflow_tracking_uri)
    mlflow.set_experiment(s.mlflow_experiment)
    with mlflow.start_run(run_name=f"{args.model}-{time.strftime('%Y%m%d-%H%M%S')}") as run:
        mlflow.log_params({**bundle["params"], "model_type": bundle["model_type"],
                           "n_rows": bundle["metadata"]["n_rows"],
                           "fraud_rate": bundle["metadata"]["fraud_rate"]})
        flat = {f"holdout_{k}": v for k, v in bundle["metrics"]["holdout"].items()
                if isinstance(v, (int, float)) and np.isfinite(v)}
        flat.update({"threshold": bundle["threshold"],
                     "oof_cost_per_txn": bundle["metrics"]["threshold_opt"]["cost_per_txn"]})
        if best_value is not None:
            flat["optuna_best_pr_auc"] = best_value
        mlflow.log_metrics(flat)
        mlflow.log_artifact(str(artifacts_dir / "model_bundle.joblib"))
        mlflow.log_artifact(str(artifacts_dir / "metrics.json"))
        if getattr(args, "register", False):
            flavor = mlflow.lightgbm if bundle["model_type"] == "lightgbm" else mlflow.xgboost
            flavor.log_model(bundle["model"], artifact_path="model")
            mv = mlflow.register_model(f"runs:/{run.info.run_id}/model",
                                       s.model_registry_name)
            MlflowClient().set_registered_model_alias(s.model_registry_name,
                                                      "candidate", mv.version)
        return run.info.run_id

def main() -> None:
    p = argparse.ArgumentParser(description="Train fraud model (walk-forward, MLflow)")
    p.add_argument("--model", choices=["lightgbm", "xgboost"], default="lightgbm")
    p.add_argument("--data", default=None, help="parquet/csv; omit to generate synthetic")
    p.add_argument("--cards", type=int, default=2000)
    p.add_argument("--merchants", type=int, default=400)
    p.add_argument("--days", type=int, default=90)
    p.add_argument("--fraud-rate", type=float, default=0.008)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--trials", type=int, default=0, help="Optuna trials (0 = skip)")
    p.add_argument("--no-mlflow", action="store_true")
    p.add_argument("--register", action="store_true")
    args = p.parse_args()

    from src.logging_conf import setup_logging
    setup_logging("INFO")
    cfg = load_model_config()
    policy = RiskPolicy.from_config(load_risk_policy())
    artifacts = ARTIFACTS
    artifacts.mkdir(parents=True, exist_ok=True)

    t0 = time.time()
    df = load_transactions(args.data, args)
    X, y, feats = build_dataset(df, cfg)
    print(f"[1/6] dataset: {X.shape}, fraud rate {y.mean():.4%} ({time.time()-t0:.0f}s)")

    hold_idx = final_holdout_indices(feats, cfg["validation"]["final_holdout_fraction"])
    folds = walk_forward_splits(feats, cfg, exclude=hold_idx)
    print(f"[2/6] validation: {len(folds)} walk-forward folds, holdout rows {len(hold_idx)} "
          f"(embargo {cfg['validation']['embargo_days']}d)")

    params, best_value = dict(cfg[args.model]["base"]), None
    if args.trials > 0:
        from src.models.tune import tune_hyperparams
        params, best_value = tune_hyperparams(X, y, feats, cfg, args.model,
                                              args.trials, args.seed)
        print(f"[3/6] optuna best PR-AUC {best_value:.4f}")

    spw_cap = cfg["imbalance"]["max_spw"]
    oof = compute_oof(X, y, feats, folds, args.model, params, spw_cap, args.seed)
    val_mask = oof.notna().to_numpy()
    cm = cfg["cost_model"]
    th = optimize_threshold(y[val_mask], oof[val_mask], cm["false_negative"],
                            cm["false_positive"])
    print(f"[4/6] threshold {th['threshold']:.3f} "
          f"(cost/txn ${th['cost_per_txn']:.3f} @ FN=${cm['false_negative']}, FP=${cm['false_positive']})")

    tr_all = np.setdiff1d(np.arange(len(y)), hold_idx)
    model = fit_final(X, y, feats, tr_all, args.model, params,
                      scale_pos_weight(y.iloc[tr_all].to_numpy(), spw_cap), args.seed)
    hold_proba = model.predict_proba(X.iloc[hold_idx])[:, 1]
    val_metrics = evaluate_fraud(y[val_mask], oof[val_mask], th["threshold"])
    holdout_metrics = evaluate_fraud(y.iloc[hold_idx], hold_proba, th["threshold"])
    print(f"[5/6] holdout: PR-AUC {holdout_metrics['pr_auc']:.4f} "
          f"ROC-AUC {holdout_metrics['roc_auc']:.4f} recall {holdout_metrics['recall']:.3f} "
          f"precision {holdout_metrics['precision']:.3f} "
          f"P@90%R {holdout_metrics['precision_at_recall_90']:.3f}")

    from src.explainability.shap_explainer import compute_global_importance
    n_sample = min(cfg["explainability"]["shap_sample"], len(hold_idx))
    sample = X.iloc[hold_idx].sample(n=n_sample, random_state=args.seed)
    global_importance = compute_global_importance(model, args.model, sample)

    encoder_cfg = {
        name: {"global_prior": enc.global_prior, "prior_rate": enc.prior_rate,
               "strength": enc.strength, "kind": enc.kind}
        for name, enc in getattr(feats, "attrs", {}).get("encoders", {}).items()
    }
    bundle = build_bundle(model, args.model, X, y, feats, th, policy, val_metrics,
                          holdout_metrics, [], params, global_importance, cfg,
                          encoder_cfg)
    joblib.dump(bundle, artifacts / "model_bundle.joblib")
    with open(artifacts / "metrics.json", "w", encoding="utf-8") as f:
        json.dump({"validation": val_metrics, "holdout": holdout_metrics,
                   "threshold": th}, f, indent=2)
    run_id = _mlflow_log(args, bundle, artifacts, best_value)
    if run_id:
        bundle["metadata"]["mlflow_run_id"] = run_id
        joblib.dump(bundle, artifacts / "model_bundle.joblib")
    print(f"[6/6] artifacts saved to {artifacts} (mlflow run: {run_id or 'disabled'})")


if __name__ == "__main__":
    main()



