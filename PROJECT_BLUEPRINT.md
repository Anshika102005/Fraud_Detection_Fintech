# Credit Card Fraud Detection — Production Capstone Blueprint

**Authoring stance:** Senior ML Engineer / MLOps Architect. This document is the architectural contract for the entire system. Every section states (a) the core concept, (b) the fraud-specific *why*, (c) key decisions and trade-offs, and (d) common production pitfalls.

---

## 0. Repository Structure

```
fraud-detection/
├── README.md
├── docker-compose.yml
├── .env.example
├── Makefile
├── pyproject.toml
├── sql/
│   ├── migrations/
│   │   ├── 001_create_transactions.sql
│   │   ├── 002_create_user_features.sql
│   │   └── 003_create_prediction_logs.sql
│   └── features/
│       ├── velocity_24h.sql
│       └── rolling_aggregates.sql
├── notebooks/
│   ├── 01_eda_imbalance.ipynb
│   ├── 02_eda_temporal.ipynb
│   └── 03_eda_distributions_correlation.ipynb
├── src/
│   ├── data/
│   │   ├── load.py                 # point-in-time correct dataset builder
│   │   └── validators.py           # Great Expectations / Pandera checks
│   ├── features/
│   │   ├── temporal.py             # cyclical encodings
│   │   ├── behavioral.py           # deviations from user baseline
│   │   ├── velocity.py             # on-the-fly velocity fetches
│   │   ├── encoders.py             # WOE / target encoder w/ smoothing
│   │   └── pipeline.py             # sklearn Pipeline assembly
│   ├── models/
│   │   ├── train.py                # training entrypoint (MLflow-wrapped)
│   │   ├── evaluate.py             # fraud metric suite
│   │   ├── threshold.py            # cost-based threshold optimization
│   │   └── tune.py                 # Optuna studies
│   ├── api/
│   │   ├── main.py                 # FastAPI app factory
│   │   ├── schemas.py              # Pydantic request/response models
│   │   ├── deps.py                 # auth, db, redis, model registry deps
│   │   ├── middleware.py           # logging + prometheus instrumentation
│   │   └── routes/
│   │       ├── health.py
│   │       └── predict.py
│   ├── monitoring/
│   │   ├── drift.py                # PSI / KS / Evidently reports
│   │   └── alerts.py
│   └── config.py                   # pydantic-settings, env-driven
├── tests/
│   ├── unit/ (encoders, threshold logic, schemas)
│   ├── integration/ (API + test postgres/redis via testcontainers)
│   └── leakage/ (temporal leakage guards on feature SQL)
├── docker/
│   ├── Dockerfile.api
│   └── Dockerfile.train
├── mlops/
│   ├── promote.py                  # registry gate: staging → production
│   └── ci/
│       ├── train_pipeline.yml
│       └── deploy_pipeline.yml
└── monitoring/
    ├── prometheus.yml
    └── grafana/dashboards/fraud_api.json
```

---

## 1. System Architecture Overview

```
                        ┌────────────────────────────────────────────────────┐
                        │                    BATCH PLANE                      │
                        │                                                     │
  Raw txn stream ──► PostgreSQL (transactions) ──► SQL feature jobs ──►       │
                        (CDC / nightly load)      (window functions)   ▼      │
                                                          user_features       │
                                                             │                │
                          ┌──────────────────────────────────┘                │
                          ▼                                                   │
              Training dataset builder (point-in-time, snapshot-as-of)        │
                          ▼                                                   │
              Training pipeline (FE → XGB/LGBM → Optuna → metrics)            │
                          ▼                                                   │
                   MLflow Tracking ──► Model Registry (Staging/Prod)          │
                        └────────────────────────────────────────────────────┘

                        ┌──────────────────── SERVING PLANE ───────────────── ┐
  Client ──► FastAPI ──┬─► Redis: user state cache (~dedup, velocity seeds)   │
              (auth,   ├─► Postgres: latest user_features row (SQL feats)     │
               rate    ├─► Python transformer: on-the-fly temporal/behavioral│
               limit)  ├─► Model (loaded from registry @ startup, versioned)  │
                       └─► prediction_logs (async insert via background task) │
                                    │                                         │
                       Prometheus ◄─┘  ──► Grafana dashboards                 │
                       Evidently drift jobs (daily, batch over logs)          │
```

**Data flow (training):** raw transactions → SQL feature store (rolling aggregates, computed with `as_of` cutoffs) → training snapshot → model → registry.

**Data flow (inference):** single transaction → API fetches pre-computed SQL features + Redis-cached user context → Python computes request-time features → model scores → log predicted + features asynchronously → monitoring consumes logs.

**Key architectural decision:** the *same feature definitions* must exist in two planes. SQL features are consumed both by the training builder and by the API. The Python transformer is a pure, stateless function of (transaction, user_context) — identical object pickled with the model artifact to kill training-serving skew.

---

## 2. Data Layer (SQL)

### 2.1 Schema

```sql
CREATE TABLE transactions (
    txn_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    card_id       BIGINT       NOT NULL,            -- tokenized card reference
    merchant_id   INTEGER      NOT NULL,
    mcc           SMALLINT     NOT NULL,            -- merchant category code
    amount_cents  BIGINT       NOT NULL CHECK (amount_cents > 0),
    currency      CHAR(3)      NOT NULL DEFAULT 'USD',
    channel       TEXT         NOT NULL CHECK (channel IN ('pos','ecom','atm','moto')),
    is_fraud      BOOLEAN,                            -- label arrives LATE (chargebacks)
    label_ts      TIMESTAMPTZ,                        -- when label landed
    txn_ts        TIMESTAMPTZ  NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

**Fraud-specific note:** labels arrive weeks late (chargeback lag). Any training query must filter on `label_ts <= snapshot_date`, not assume labels exist. Joins to later-arriving labels are the #1 silent leakage source in fraud.

```sql
CREATE TABLE user_features (
    card_id            BIGINT NOT NULL,
    as_of_ts           TIMESTAMPTZ NOT NULL,      -- point-in-time anchor
    txn_count_1h       INTEGER,
    txn_count_24h      INTEGER,
    txn_count_7d       INTEGER,
    sum_amount_24h     NUMERIC(14,2),
    avg_amount_7d      NUMERIC(14,2),
    std_amount_30d     NUMERIC(14,2),
    max_amount_30d     NUMERIC(14,2),
    distinct_merchants_7d INTEGER,
    distinct_mcc_24h   SMALLINT,
    cards_same_device_24h INTEGER,
    PRIMARY KEY (card_id, as_of_ts)
);

CREATE TABLE prediction_logs (
    request_id   UUID PRIMARY KEY,
    txn_id       BIGINT,
    card_id      BIGINT,
    model_version TEXT NOT NULL,
    features     JSONB NOT NULL,
    score        DOUBLE PRECISION NOT NULL,
    decision     TEXT NOT NULL,         -- approve / review / decline
    latency_ms   INTEGER,
    served_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    actual_label BOOLEAN,               -- backfilled later for delayed feedback
    actual_label_ts TIMESTAMPTZ
);
```

### 2.2 Velocity features without leakage

The cardinal rule: every aggregate for a transaction at time `t` uses a window **strictly before** `t`, and the aggregate for training row *i* must not include row *i* itself.

```sql
-- Leakage-safe velocity features for a training snapshot
SELECT
    t.txn_id,
    COUNT(*) FILTER (
        WHERE p.txn_ts >= t.txn_ts - INTERVAL '24 hours' AND p.txn_ts < t.txn_ts
    ) AS txn_count_24h,
    AVG(p.amount_cents) FILTER (
        WHERE p.txn_ts >= t.txn_ts - INTERVAL '7 days' AND p.txn_ts < t.txn_ts
    ) AS avg_amount_7d,
    EXTRACT(EPOCH FROM (t.txn_ts - MAX(p.txn_ts) FILTER (WHERE p.txn_ts < t.txn_ts)))
        AS seconds_since_last_txn
FROM transactions t
LEFT JOIN transactions p
       ON p.card_id = t.card_id
      AND p.txn_ts >= t.txn_ts - INTERVAL '30 days'
      AND p.txn_ts <  t.txn_ts          -- strict less-than: exclude self & future
WHERE t.txn_ts BETWEEN :train_start AND :train_end
  AND (t.label_ts IS NULL OR t.label_ts <= :snapshot_date)  -- label availability guard
GROUP BY t.txn_id;
```

For production scale, replace the per-row self-join with a **windowed pre-aggregation** into `user_features` keyed at a daily/hourly grain, using window functions:

```sql
SELECT card_id,
       date_trunc('hour', txn_ts) AS bucket,
       COUNT(*)        OVER w7d  AS txn_count_7d,
       AVG(amount_cents) OVER w7d AS avg_amount_7d
FROM transactions
WINDOW w7d AS (PARTITION BY card_id ORDER BY txn_ts
               RANGE BETWEEN INTERVAL '7 days' PRECEDING AND INTERVAL '1 microsecond' PRECEDING);
```

`RANGE BETWEEN ... PRECEDING AND <tiny> PRECEDING` is the leakage guard doing the work.

### 2.3 Indexing strategy

- `transactions(card_id, txn_ts)` — composite btree; supports every per-card window query. This is the workhorse index; put `card_id` first (equality prefix).
- `transactions(txn_ts)` — for snapshot range scans and CDC.
- BRIN on `txn_ts` for the full-history table once it's >100M rows and only ever scanned in time order (99% smaller than btree).
- `user_features(card_id, as_of_ts DESC)` — latest-row lookups via `ORDER BY as_of_ts DESC LIMIT 1`.
- `prediction_logs(served_at)` + partial index `WHERE actual_label IS NULL` for delayed-label backfill jobs.
- Partition `transactions` and `prediction_logs` by month (`PARTITION BY RANGE (txn_ts)`) — enables cheap retention/drop and keeps indexes hot.

**Pitfalls:** forgetting the label-availability guard (future label leakage); `<= t.txn_ts` instead of `<` (self-inclusion — the model learns "this exact row exists"); computing features on the full table then splitting by time (aggregates leak across the split boundary).

---

## 3. EDA Strategy

Ordered notebook plan. Each step has a fraud-specific reason and a downstream artifact.

1. **Class imbalance quantification.** Report fraud rate overall *and per time bucket* (fraud rate drifts seasonally). Decide the sampling/weighting budget. Pitfall: don't oversample before splitting — ever.
2. **Amount distribution.** Heavy right tail + point masses at round amounts. Apply `log1p(amount_cents)`. Compare fraud vs legit distributions with **KS test** *and* visualize on log scale — fraud typically over-indexes mid-range (card-testing micro-transactions at ~$1 and big-ticket drains).
3. **Temporal hotspots.** Fraud rate by hour-of-day and day-of-week, split by channel. Fraud peaks at night for ecom, business hours for social-engineering-driven card-not-present. These patterns justify cyclical encodings and make the case against treating time as a random covariate.
4. **KS / PSI for every numeric feature** (fraud vs legit): `KS > 0.1` is a candidate signal. This doubles as the *baseline reference distributions* for production drift monitoring — save them as an artifact.
5. **Cardinality audit** of categoricals (merchant_id can be 10⁵+, mcc is ~500). Drives the WOE vs one-hot decision.
6. **Correlation & multicollinearity.** Spearman matrix among engineered features; drop near-duplicates among velocity features (txn_count_24h vs txn_count_7d are correlated by construction). VIF check for any linear components. Tree models tolerate collinearity, but SHAP attribution and monitoring get noisy — prune to a curated set.
7. **Missingness as signal.** In fraud, a missing device_id or missing prior history ("cold-start card") *is* predictive. Encode missingness explicitly; never silently impute to median.
8. **Leakage sniff test.** Train a quick model on a temporally split sample; if AUC > 0.999, you leaked something. Cheapest detector available.

---

## 4. Feature Engineering Pipeline

### 4.1 Split of responsibilities

| Feature class | Where computed | Why |
|---|---|---|
| Velocity windows (24h/7d counts, sums) | SQL / feature store | Stateful, require history scans; training needs them at scale |
| Rolling user baselines (avg_amount_30d, std) | SQL / feature store | Same reason; also freshness-managed in one place |
| Cyclical time (sin/cos hour, dow, weekend/night flags) | Python (both planes) | Deterministic function of txn_ts only; trivially identical in training and serving |
| Behavioral (amount / user_avg_7d, z-score of amount, time_since_last_txn buckets) | Python, *from SQL-provided baselines* | Combines request payload with fetched state; keeps model artifact portable |
| WOE / target encoding of mcc, merchant_id, channel | Python (fitted at train, serialized in pipeline) | Must be fit on training labels only; refitting in SQL would leak |

**Design rule:** the SQL layer produces *raw state*; the Python transformer is a pure function `(txn, state) → vector` that ships inside the MLflow model as a custom `python_function` or a pickled pipeline. One definition, two executions — this is the canonical fix for training-serving skew.

### 4.2 The sklearn transformer

```python
class FraudFeatureTransformer(BaseEstimator, TransformerMixin):
    """Stateless; state arrives via the `context` column (user_features row)."""

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        out = pd.DataFrame(index=X.index)
        ts = pd.to_datetime(X["txn_ts"], utc=True)
        hour = ts.dt.hour + ts.dt.minute / 60
        out["hour_sin"] = np.sin(2 * np.pi * hour / 24)
        out["hour_cos"] = np.cos(2 * np.pi * hour / 24)
        out["dow_sin"] = np.sin(2 * np.pi * ts.dt.dayofweek / 7)
        out["dow_cos"] = np.cos(2 * np.pi * ts.dt.dayofweek / 7)
        out["is_night"] = ((ts.dt.hour >= 0) & (ts.dt.hour < 5)).astype(int)
        out["is_weekend"] = (ts.dt.dayofweek >= 5).astype(int)
        out["log_amount"] = np.log1p(X["amount_cents"])
        # behavioral, safe because context is "as of < txn_ts"
        out["amt_vs_avg7d"] = X["amount_cents"] / (X["avg_amount_7d_cents"] + 1)
        out["amt_zscore"] = (X["amount_cents"] - X["avg_amount_30d"]) / (X["std_amount_30d"] + 1)
        out["txn_count_24h"] = X["txn_count_24h"].fillna(0)
        out["new_card"] = X["txn_count_7d"].isna().astype(int)  # cold start flag
        return out.fillna(params["missing_value"])
```

### 4.3 WOE / target encoding

- **Why WOE/target encoding over one-hot:** merchant_id cardinality makes one-hot explode dimensionality; trees split poorly on thousands of sparse dummies. WOE gives a single monotonic, interpretable numeric per category — historically the default in credit risk.
- **Regularization is mandatory:** smoothed target encoding `enc = (n * mean_c + m * global_mean) / (n + m)` with m≈100; fit **inside each CV fold** (or via out-of-fold encoding) — fitting on the full frame is textbook target leakage. Rare/unseen categories map to the global mean, never NaN.
- Alternative worth benchmarking: LightGBM native categorical handling with `max_cat_to_onehot`.

**Pitfalls:** target encoder fit outside CV; velocity features computed after the train/test boundary; serving path recomputing a feature with subtly different logic (unit mismatch cents vs dollars is a classic).

---

## 5. Model Training Framework

### 5.1 XGBoost vs LightGBM for fraud

| Dimension | XGBoost | LightGBM |
|---|---|---|
| Training speed (10⁷ rows) | Slower (hist is decent) | 3–10× faster (GOSS/EFB, leaf-wise) |
| Accuracy at small tabular scale | Often marginally better | Parity with tuning |
| Overfitting risk | depth-wise, more conservative | leaf-wise can overfit rare positive class; control via `min_data_in_leaf`, `num_leaves` |
| Categorical handling | needs encoding | native |
| Prediction latency | both fine (≤ ms for ~500 trees) | similar |
| Ecosystem | SHAP, DMatrix maturity | equally fine |

**Recommendation:** benchmark both with identical CV; in practice LightGBM usually wins the iteration-speed battle in fraud (huge data, constant retraining), XGBoost the out-of-the-box robustness. Ship whichever wins on **AUC-PR at the production operating region**, not overall.

### 5.2 Validation: why TimeSeriesSplit, not StratifiedKFold

Fraud is a *forecasting* problem: you will always deploy on the future of your training data. Random K-fold evaluates on transactions temporally adjacent to training ones with shared merchant campaigns, seasons, and attack waves — inflating metrics by several AUC points. Use an expanding-window time split **with an embargo gap** (e.g., 7 days) between train and validation, because chargeback labels and behavioral correlations bleed across nearby time:

```
Train: [Jan 1 ────── Mar 31]  gap  Val: [Apr 8 ─── Apr 30]
Train: [Jan 1 ────── Apr 30]  gap  Val: [May 8 ─── May 31]
```

### 5.3 Class imbalance

- First choice: `scale_pos_weight = #neg / #pos` (or a capped version, e.g. `min(spw, 100)` — raw ratios on 0.1% fraud can destabilize gradients).
- Undersampling negatives (keeping all fraud) is legitimate and speeds training; tune the ratio (1:5 … 1:20) as a hyperparameter. **Never** SMOTE on high-cardinality tabular fraud data — synthetic interpolations between rare frauds produce unrealistic feature combos and fool your validation.
- Focal loss: marginal gains over reweighting for gradient boosting at tabular scale; mention as explored, not default.

### 5.4 Hyperparameter search (Optuna)

- Objective: **maximize validation AUC-PR** (not logloss, not accuracy), 100–300 trials, TPE sampler, MedianPruner.
- Search space: `learning_rate [0.01–0.2, log]`, `num_leaves [16–512]` / `max_depth [3–10]`, `min_child_weight` / `min_data_in_leaf`, `feature_fraction`, `bagging_fraction`, `lambda_l1/l2`, `scale_pos_weight` around computed ratio.
- Prune **per time-split fold**, not per boosting round globally — fold splitting is your real signal.

### 5.5 Threshold optimization

The probability is a ranking score; the *decision* needs a threshold chosen on business cost:

```
cost(t) = Σ_accepted_fraud  C_FN  +  Σ_flagged_legit  C_FP
```

Typical framing: a missed fraud costs the transaction amount (C_FN = amount); a false positive costs a manual review (~$5) plus churn risk. Optimize the threshold on a **held-out time-based validation set** by minimizing expected cost, and also report the PR-curve-optimal F1 threshold as a sanity anchor. Define **decision bands**, not one threshold: `score > t2 → decline`, `t1 < score ≤ t2 → step-up review`, else approve. Recompute quarterly — thresholds drift with fraud mix even when the model doesn't.

**Pitfall:** tuning the threshold on the same fold used for early stopping; threshold should be chosen on a dedicated calibration slice.

---

## 6. Fraud-Specific Metrics & Evaluation

**Why accuracy is dead on arrival:** at 0.1% fraud, "predict legit always" scores 99.9% accuracy and catches zero fraud. Efficiency metrics must be insensitive to the majority class's true negatives.

Production metric suite (computed per time-split fold and on final holdout):

1. **ROC-AUC** — overall ranking quality; necessary, not sufficient. Inflated by massive TN mass; always pair with (2).
2. **Average Precision (AUC-PR)** — the headline metric for imbalanced detection; directly reflects precision/recall trade-off in the rare class.
3. **Precision at fixed recall levels (70/80/90%)** — answers "if the business requires catching 80% of fraud, how many false alarms?" This is the contract you sign with the fraud-ops team.
4. **False Negative Rate at the operating threshold** — the direct fraud-loss driver; the number executives care about.
5. **Top-K precision (precision@K)** — precision among the K highest scores, where K = daily review-team capacity. If ops can review 300 txns/day, the metric that matters operationally is precision@300. Two models with equal AUC-PR can differ wildly here.
6. **Business-cost score** — `C_FN·FN + C_FP·FP` in dollars at the chosen bands; the ultimate decision metric.
7. **Recall stratified** by channel, amount decile, and mcc — fraud models silently fail on segments (e.g., great on ecom, blind on ATM skimming).

**Deployment gate:** production promotion requires **AUC-PR ≥ X**, **FNR@threshold ≤ Y%**, and **precision@K ≥ Z%** on a recent pure-holdout window, computed in `promote.py` against the metric definitions in `evaluate.py` — same code path, no copy-paste metrics.

---

## 7. MLOps & Experiment Tracking (MLflow)

### 7.1 Experiment logging

Every training run logs:

- **Params:** full Optuna best set, data snapshot window, `scale_pos_weight`, threshold(s).
- **Metrics:** the entire §6 suite per fold + holdout.
- **Artifacts:** feature importance (gain + SHAP summary PNG), PR curve PNG, threshold-vs-cost curve, the pickled feature pipeline, `conda.yaml`/requirements pin, git commit SHA, and the **dataset snapshot hash** (data versioning via content hash or DVC pointer — reproducibility without copying terabytes).
- **Tags:** model_version, data_window, owner,candidate/staging flag.

### 7.2 Registry lifecycle

```
None → Staging → Production → Archived
                 ↘ (rollback: re-tag previous archived version to Production)
```

- Candidate models register as **Staging** automatically; nothing reaches Production by CI accident.
- `promote.py` runs the **validation gate**: pulls the staging model + a fresh holdout window, recomputes the gate metrics, compares against the *current production model* (relative gate: AUC-PR must not regress by > δ0.5pt) *and* absolute floors. Only then transitions the registry stage. The gate is code, reviewed in PR — not a human eyeballing a dashboard.
- **Versioning & rollback:** the API pins a registry alias (`@production`). Rollback = re-point alias to the previous version; because the feature pipeline ships *inside* the model artifact, rolling back the model also rolls back its features — no "model v5 with features v7" split-brain.

**Pitfalls:** serving "latest" instead of an aliased version; logging metrics averaged across folds only (hides a bad fold); artifacts not pinned, so model won't load after a dependency bump two months later.

---

## 8. FastAPI Serving Layer

### 8.1 Endpoints and contracts

```python
class TransactionIn(BaseModel):
    txn_id: int
    card_id: int
    merchant_id: int
    mcc: int = Field(ge=1, le=9999)
    amount_cents: int = Field(gt=0, le=10_000_000_000)
    channel: Literal["pos", "ecom", "atm", "moto"]
    txn_ts: datetime

class PredictionOut(BaseModel):
    request_id: UUID
    score: float = Field(ge=0, le=1)
    decision: Literal["approve", "review", "decline"]
    model_version: str
    latency_ms: float
```

- `GET /health/live` — process is up (no deps).
- `GET /health/ready` — model loaded, DB reachable, Redis reachable. Kubernetes probes hit these; failing readiness removes the pod from service without killing it.
- `POST /predict` — flow: validate → dedup check (Redis `SETNX txn:<id>` short TTL; idempotent retries return cached score) → fetch `user_features` latest row + Redis context → transform → score → classify by bands → **log asynchronously** (DB insert via `BackgroundTasks` or a fire-and-forget queue; logging must never add to p99 latency or become a failure mode).
- `POST /predict/batch` — vectorized scoring for up to N=10k rows, row-level error capture so one bad row doesn't fail the batch.
- `GET /metrics` — Prometheus: `predict_requests_total{model_version,decision}`, `predict_latency_seconds` histogram, `score_distribution` bucket histogram (drift early-warning for free).

### 8.2 Cross-cutting concerns

- **Auth:** `HTTPBearer` API keys validated against a hashed store (or JWT for multi-tenant). Rate limiting per key (token bucket in Redis, e.g. slowapi) — the fraud API itself is an attack target (probing/extraction).
- **Model lifecycle:** model loaded once at startup from the registry alias into app state; hot-swappable via an internal `POST /admin/reload` guarded by a privileged key. Fallback behavior if registry unreachable: serve the currently loaded model, never crash-loop.
- **Redis cache roles:** (1) idempotency/dedup of retried requests, (2) user-state memoization with a short TTL (e.g., 60s) to keep velocity features fresh but avoid hammering Postgres under load.
- **Async done right:** endpoints are `async def` only where I/O is truly async (httpx/asyncpg); CPU-bound transform/scoring runs in a threadpool (`run_in_threadpool`) to avoid blocking the event loop.

**Pitfalls:** synchronous psycopg2 calls inside `async def`; logging in the request path; Pydantic validation that accepts `amount=0` or future timestamps (validate `txn_ts <= now + skew`); batch endpoint without a payload cap.

---

## 9. Monitoring & Drift Detection

| Signal | Method | Cadence | Action threshold |
|---|---|---|---|
| Input data drift (per-feature) | PSI on score + top-20 features vs training baseline; KS test on `log_amount`; χ² on channel/mcc frequencies | daily | PSI > 0.25 (two features) → investigate; PSI > 0.5 → page |
| Prediction drift | PSI on score distribution; alert also encoded in Prometheus `score_distribution` histogram | hourly/daily | sustained shift > 2× baseline std |
| Concept drift / label-based | rolling fraud-rate capture: precision@K and recall vs backfilled labels on `prediction_logs` | weekly (labels lag) | recall@K drops > 10% relative → retrain |
| Feature store freshness | `now() - max(as_of_ts)` per shard | 5-min | staleness > SLA → page immediately (serving stale velocity features silently degrades recall) |
| Service health | latency p95/p99, error rate, decision-mix ratio ("decline rate suddenly 3×") | real-time | SLO burn-rate alerts |

- **Evidently AI** generates scheduled drift reports (batch over `prediction_logs.features` JSONB vs the reference snapshot saved during EDA); custom PSI/KS where you need SQL-side aggregation at scale.
- **Concept drift in fraud is adversarial**, not just seasonal — fraudsters actively react to your model. Expect sharper, coordinated shifts (burst of a new attack vector). Decision-mix metrics and segment recall catch this sooner than global PSI.
- **Retraining trigger policy:** scheduled (e.g., weekly refresh on trailing data) **OR** triggered (recall@K degradation / PSI breach), whichever fires first; every retrain still passes the §7 promotion gate before going live.

**Pitfalls:** monitoring only on aggregated data (drift in a segment cancels out globally); alerting on raw volume rather than rates; no runbook — a drift alert with no defined owner/action is noise.

---

## 10. Deployment & Infrastructure

### 10.1 Dockerfile (API)

```dockerfile
FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

# build deps in a separate stage
FROM base AS builder
RUN pip install --no-cache-dir --prefix=/install \
    fastapi uvicorn[standard] lightgbm xgboost scikit-learn \
    pandas numpy asyncpg redis pydantic prometheus-client mlflow-skinny

FROM base
RUN useradd -r -u 10001 appuser        # non-root, no shell
COPY --from=builder /install /usr/local
COPY src/ /app/src
WORKDIR /app
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/health/live')"
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

Security notes: non-root user, slim base, no build tools in the runtime image, pinned versions, `.dockerignore` excluding notebooks/data/secrets.

### 10.2 docker-compose stack

```yaml
services:
  api:        { build: { context: ., dockerfile: docker/Dockerfile.api },
                depends_on: [postgres, redis], env_file: .env, ports: ["8000:8000"] }
  postgres:   { image: postgres:16, volumes: [pgdata:/var/lib/postgresql/data],
                environment: [POSTGRES_PASSWORD=...] }
  redis:      { image: redis:7-alpine }
  mlflow:     { image: ghcr.io/mlflow/mlflow:v2.*,
                command: mlflow server --backend-store-uri postgresql://... --default-artifact-root s3://mlflow-artifacts,
                ports: ["5000:5000"] }
  prometheus: { image: prom/prometheus, volumes: ["./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml"] }
  grafana:    { image: grafana/grafana, volumes: ["./monitoring/grafana:/etc/grafana/provisioning"], ports: ["3000:3000"] }
volumes: { pgdata: {} }
```

MLflow uses Postgres as its backend store (not local sqlite) and object storage for artifacts — the registry must survive container restarts.

### 10.3 Path to Kubernetes

- Deployment with `readinessProbe: /health/ready`, `livenessProbe: /health/live`; resource requests tuned so the model (~memory-bound artifact) fits with headroom.
- **HPA on queue depth, not just CPU:** scoring is bursty and CPU metrics lag. Scale on a custom metric — e.g., `predict_requests_in_flight` or Redis queue depth — via Prometheus Adapter/KEDA; target ~N inflight per pod sized from load-test p99.
- PGBouncer sidecar for Postgres connection pooling; Redis as a managed/shared service.
- Model rollout: registry alias flip → rolling restart (or Seldon/KServe if you later need shadow/canary traffic splits; canary 5% with automatic rollback on p99 or FNR-proxy regression).

---

## 11. Top Cross-Cutting Pitfalls (the ones that sink fraud projects)

1. **Label leakage via chargeback timing** — guard every training query with `label_ts <= snapshot_date`.
2. **Self-inclusive rolling windows** — always `< t`, never `<= t`.
3. **Training-serving skew** — ship the feature transformer inside the model artifact; single source of truth for SQL features consumed by both planes.
4. **Random CV on temporal fraud data** — always time-split with an embargo gap.
5. **Accuracy-style reporting** — gate on AUC-PR + FNR + precision@K, in code.
6. **Threshold set at 0.5 and forgotten** — cost-based bands, recomputed on a schedule.
7. **Synchronous logging in the request path** — async `prediction_logs` writes; observability without latency tax.
8. **No delayed-label feedback loop** — without backfilling `actual_label`, concept-drift detection is blind exactly where it matters.

---

*This blueprint is the implementation contract. Build order suggestion: SQL schema + synthetic data → EDA → training pipeline w/ MLflow → FastAPI wrapper → compose stack → monitoring. Each stage is demo-ready on its own.*
