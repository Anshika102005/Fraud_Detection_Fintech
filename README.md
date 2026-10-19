# 🛡️ Fraud Detection Fintech

End-to-end, leakage-safe credit-card fraud scoring system: point-in-time feature
engineering, walk-forward model training with label embargo, a single model-bundle
serving contract, real-time scoring over FastAPI, and a React demo app
(FraudGuard AI) on top.

![Architecture](docs/fraud-detection-fintech-system.svg)

*The diagram above is the static export of the interactive architecture diagram
generated with Archify — open
`.archify/architecture-fraud-detection-fintech-20261006-011354/fraud-detection-fintech.html`
in a browser to explore it (themes, focus views, exports).*

## How to read the architecture

The system has three zones, connected by one contract: **`model_bundle.joblib`**.

### 1. Offline training & MLOps

```
Synthetic Generator → Feature Builder → Trainer → model_bundle.joblib → MLflow Registry → Promotion Gates
 (2000 cards, 90d)    (point-in-time)   (walk-forward  (model + feature    (staging /          (PR-AUC · FNR ·
                                         + embargo)     order + threshold   production alias)    P@90% recall)
                                                        + policy + priors)
```

- **Synthetic Generator** (`make seed`) produces card-level transaction history —
  swap in real data by pointing the trainer at a CSV/Parquet file instead.
- **Feature Builder** constructs the strictly point-in-time training matrix
  (velocity, behavioral, temporal features), so no future information leaks into a row.
- **Trainer** (`make train`) runs expanding-window walk-forward folds with a
  **label embargo** that blocks both future leakage and late-arriving-chargeback
  label leakage, tunes with Optuna, and optimizes a **cost-based threshold** on
  out-of-fold predictions.
- Everything serving needs is frozen into **one artifact** — the bundle is the
  *single serving contract*: model + feature order + threshold + risk policy +
  encoder priors + drift reference stats. Serving loads *only* this bundle, so
  training–serving skew is prevented by construction.
- **Promotion Gates** (`make promote`, exit 1 on failure → CI blocks deployment):
  holdout PR-AUC ≥ floor, FNR ≤ max, precision at 90% recall ≥ business floor.

### 2. Real-time scoring service (the hot path)

```
Card Transactions → Fraud Detection API (FastAPI :8000) → ScoringEngine → Online Features → Model Bundle → Decision
   POST /predict      API key + token-bucket rate limit      idempotency     serving-consistent    proba →      risk level
                                                                                 (same code path      threshold    + top SHAP
                                                                                  as training)        → policy     factors
```

Per request (`src/serving/scorer.py::ScoringEngine.score`):

1. **API key + rate limit** — `X-API-Key` header, token-bucket limiter.
2. **Idempotency check** — a duplicate `X-Idempotency-Key` within the TTL replays
   the original response (`cached: true`).
3. **Online features** — `OnlineFeatureComputer` updates per-customer/merchant
   state in the **KV store** (Redis in production, in-memory for dev) and
   reproduces the exact training features row by row
   (verified by `tests/leakage/test_serving_consistency.py`).
4. **Score** — `predict_proba` → threshold → **risk policy** evaluates the level/decision.
5. **Explain** — SHAP `TreeExplainer` produces the top-5 risk factors (degrades
   gracefully to no-explanation if SHAP is unavailable).
6. **Record** — decision + features go to **Prediction Logs** (Postgres, JSONL
   fallback — never on the hot path's latency budget), counters to **Prometheus
   metrics** (`/metrics`).

Monitoring closes the loop: the **Drift Monitor** computes PSI on served features
from the prediction logs, and retraining triggers fire on PSI breach or
label-backed metric degradation — every retrain must re-pass the promotion gates.

### 3. FraudGuard AI prototype (`fraudguard-ai/` + `frontend/`)

A demo product shell: React 18 + Vite SPA with credential login (customer
**Anshika** / analyst **Vikram**, role-based routing), talking to the prototype
FastAPI blueprint at `/api/v1` with Bearer auth. Requests time out after 6 s and
fall back to **localStorage mocks**, so the demo runs with zero infrastructure.
Seeded demo data lives in `frontend/src/data/indianData.js`.

## Project layout

| Path | Purpose |
|---|---|
| `src/api/` | FastAPI app factory, routes (`/predict`, `/predict/batch`, `/health`, `/ready`, `/metrics`, `/admin/reload`), API-key auth, rate limiting |
| `src/serving/` | `ScoringEngine` (score + explain + log), KV stores, idempotency, prediction logger |
| `src/features/` | Online + batch feature engineering (velocity, behavioral, temporal), shared registry |
| `src/models/` | Training entrypoint, evaluation, threshold/risk-policy optimization |
| `src/explainability/` | SHAP top-risk-factor extraction |
| `src/monitoring/` | PSI drift monitor, Prometheus metrics, retraining triggers |
| `src/data/` | Synthetic generation, schema migration, DB engine, validators |
| `mlops/` | Registry promotion gates; label backfill |
| `configs/` | `model.yaml` (folds, embargo, gates), `risk_policy.yaml` |
| `fraudguard-ai/backend/` | Prototype FastAPI blueprint (auth, transactions, alerts, predictions) |
| `frontend/` | React SPA (Vite, react-router, credential auth) — see `frontend/README.md` for demo credentials |
| `docker-compose.yml` | api · postgres · redis · mlflow · trainer · prometheus · grafana |
| `tests/` | Unit, integration, and the leakage suite (serving-consistency, no-future-leakage) |
| `docs/` | Architecture diagram (SVG export) |
| `.archify/` | Interactive architecture diagram (open the HTML in a browser) |

## Quick start

```bash
make setup          # venv + requirements
make db-up          # postgres + redis + mlflow (Docker)
make migrate        # create schema
make seed           # 2000 synthetic cards, 90 days, 0.2% fraud
make train          # walk-forward training -> artifacts/model bundle
make api            # uvicorn src.api.main:app on :8000
```

Or run the whole stack: `make compose-up`.

### FraudGuard AI prototype

```bash
cd frontend && npm install && npm run dev    # http://localhost:3000
```

Demo credentials and user flow are documented in [`frontend/README.md`](frontend/README.md).
The prototype never touches the seeded demo data files.

## API usage

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Idempotency-Key: txn-42" \
  -d '{"transaction_id":"t1","customer_id":"c1","txn_ts":"2026-01-01T10:00:00Z","amount":4999.0,"merchant_id":"m7"}'
```

Response:

```json
{
  "transaction_id": "t1",
  "fraud_probability": 0.0132,
  "risk_level": "LOW",
  "decision": "APPROVE",
  "model_version": "lightgbm-3f2a91bc",
  "top_risk_factors": [{"feature": "amount_zscore", "contribution": 0.41}],
  "threshold": 0.62,
  "latency_ms": 3.7,
  "cached": false
}
```

Batch scoring: `POST /predict/batch` (one bad row never fails the batch).
Ops endpoints: `/health` (liveness), `/ready` (model loaded), `/metrics`
(Prometheus), `POST /admin/reload` (admin key → hot-swap the bundle).

## Testing

```bash
make test          # 35 tests: unit, integration, leakage suite
make lint          # ruff
```

The leakage suite is the correctness backbone: it asserts the online feature
computer reproduces training features **row by row** (training–serving
consistency) and that no future/late-label information enters training folds.

## Why PR-AUC, not accuracy?

Fraud is ~0.2–8% of rows depending on configuration. An "always legitimate"
model scores near-perfect accuracy while catching nothing. Training selects on
**PR-AUC**, and deployment is gated on recall-friendly business metrics
(FNR ceiling, precision at 90% recall).
