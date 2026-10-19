/* ============================================================
   Mock Data: Fraud Prediction
   Deterministic heuristic used when the FastAPI backend is not
   reachable. Mirrors the real endpoint contract:
   GET /api/predict -> { fraud_probability, risk_score, risk_level, decision, reasons }
   ============================================================ */

const REASON_TEMPLATES = [
  { key: 'amount', label: 'Transaction amount significantly exceeds normal behavior', points: 18 },
  { key: 'device', label: 'New device detected', points: 14 },
  { key: 'location', label: 'Unusual transaction location', points: 16 },
  { key: 'velocity', label: 'High transaction velocity in a short period', points: 12 },
  { key: 'behavior', label: 'Transaction differs from historical customer behavior', points: 10 },
];

const RISK_LIMITS = [
  { max: 30, label: 'LOW', decision: 'APPROVE' },
  { max: 70, label: 'MEDIUM', decision: 'REVIEW' },
  { max: 100, label: 'HIGH', decision: 'BLOCK' },
];

export const predictFraudMock = (input = {}) => {
  const amount = Math.max(0, parseFloat(input.transaction_amount) || 0);
  const avgAmount = Math.max(0, parseFloat(input.average_transaction_amount) || amount || 100);
  const recentTxns = Math.max(0, parseInt(input.recent_transactions) || 0);
  const amountRatio = avgAmount > 0 ? amount / avgAmount : 1;
  const locationChanged = Boolean(input.location && input.previous_location_location && input.location !== input.previous_location_location);

  const contributions = [];
  if (amountRatio > 2.5) contributions.push({ ...REASON_TEMPLATES[0], points: Math.round(Math.min(28, (amountRatio - 2) * 8)) });
  if (input.new_device === true || input.device_id) contributions.push({ ...REASON_TEMPLATES[1], points: 15 });
  if (locationChanged) contributions.push({ ...REASON_TEMPLATES[2], points: 17 });
  if (recentTxns >= 4) contributions.push({ ...REASON_TEMPLATES[3], points: Math.round(Math.min(20, recentTxns * 3)) });
  if (amountRatio > 1.6 && !locationChanged) contributions.push({ ...REASON_TEMPLATES[4], points: 10 });

  if (contributions.length === 0) {
    contributions.push({ ...REASON_TEMPLATES[4], points: 4 });
  }

  const score = Math.max(3, Math.min(99, Math.round(contributions.reduce((s, c) => s + c.points, 8))));
  const fraudProbability = Math.round((score * 0.92 + 4) * 10) / 10;
  const level = RISK_LIMITS.find((r) => score <= r.max) || { label: 'HIGH', decision: 'BLOCK' };

  return {
    fraud_probability: fraudProbability,
    risk_score: score,
    risk_level: level.label,
    decision: level.decision,
    reasons: contributions
      .sort((a, b) => b.points - a.points)
      .map((c) => ({ factor: c.label, contribution: c.points })),
    model_version: 'xgboost-v2.1.0',
  };
};