/* ============================================================
   Mock Data: Analytics & Model Performance
   ============================================================ */
import { TRANSACTIONS_MOCK } from './transactions';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const CATEGORIES = ['Online Shopping', 'Travel', 'Food & Dining', 'Electronics', 'Grocery', 'Entertainment', 'Other'];

function generateTimeSeries(days = 7, granularity = 'day') {
  const data = [];
  const now = new Date();
  const points = granularity === 'hour' ? Math.min(24, days * 24) : days;
  const stepMs = granularity === 'hour' ? 3600000 : 86400000;

  for (let i = points - 1; i >= 0; i--) {
    const date = new Date(now - i * stepMs);
    const label = granularity === 'hour' ? `${date.getHours()}:00` : date.toISOString().split('T')[0];
    const total = Math.floor(150 + ((i * 37) % 200));
    const fraud = Math.max(1, Math.floor(total * (0.018 + ((i * 13) % 20) / 1000)));
    data.push({
      label,
      total,
      legitimate: total - fraud - Math.floor(fraud * 0.3),
      suspicious: Math.floor(fraud * 0.3),
      fraudulent: fraud,
    });
  }
  return data;
}

export const getAnalyticsMock = (params = {}) => {
  const days = parseInt(params.days) || 7;
  const granularity = days <= 1 ? 'hour' : 'day';
  const series = generateTimeSeries(days, granularity);
  return {
    transactionVolume: series,
    fraudRateOverTime: series.map((d) => ({
      label: d.label,
      fraud_rate: parseFloat(((d.fraudulent / d.total) * 100).toFixed(2)),
    })),
  };
};

export const getFraudDistributionMock = () => {
  const total = TRANSACTIONS_MOCK.length;
  const legitimate = TRANSACTIONS_MOCK.filter((t) => t.status === 'legitimate').length;
  const suspicious = TRANSACTIONS_MOCK.filter((t) => t.status === 'suspicious').length;
  const fraudulent = TRANSACTIONS_MOCK.filter((t) => t.status === 'fraudulent' || t.status === 'blocked').length;
  return {
    data: [
      { name: 'Legitimate', value: legitimate, color: 'var(--risk-low)' },
      { name: 'Suspicious', value: suspicious, color: 'var(--risk-medium)' },
      { name: 'Fraudulent', value: fraudulent, color: 'var(--risk-high)' },
    ],
    total,
    percentages: {
      legitimate: ((legitimate / total) * 100).toFixed(1),
      suspicious: ((suspicious / total) * 100).toFixed(1),
      fraudulent: ((fraudulent / total) * 100).toFixed(1),
    },
  };
};

export const getRiskDistributionMock = () => {
  const low = TRANSACTIONS_MOCK.filter((t) => t.risk_score <= 30).length;
  const medium = TRANSACTIONS_MOCK.filter((t) => t.risk_score >= 31 && t.risk_score <= 70).length;
  const high = TRANSACTIONS_MOCK.filter((t) => t.risk_score >= 71).length;
  return {
    data: [
      { name: 'Low Risk (0-30)', value: low, color: 'var(--risk-low)', range: '0-30' },
      { name: 'Medium Risk (31-70)', value: medium, color: 'var(--risk-medium)', range: '31-70' },
      { name: 'High Risk (71-100)', value: high, color: 'var(--risk-high)', range: '71-100' },
    ],
    stats: { low, medium, high },
  };
};

export const getRiskAnalysisMock = () => {
  const highRiskTxns = TRANSACTIONS_MOCK.filter((t) => t.risk_score >= 71)
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 20);
  return {
    riskDistribution: getRiskDistributionMock(),
    highRiskTransactions: highRiskTxns,
    behavioralPatterns: {
      byHour: HOURS.map((h) => ({ hour: h, fraud: Math.floor((h + 3) % 10), legitimate: Math.floor(20 + ((h * 7) % 25)) })),
    },
  };
};
export const getFraudByMerchantCategoryMock = () =>
  CATEGORIES.map((category) => {
    const catTxns = TRANSACTIONS_MOCK.filter((t) => t.merchant_category === category);
    const fraud = catTxns.filter((t) => t.status !== 'legitimate').length;
    return {
      category,
      fraud_count: fraud,
      total_count: catTxns.length,
      fraud_rate: catTxns.length ? parseFloat(((fraud / catTxns.length) * 100).toFixed(2)) : 0,
    };
  }).sort((a, b) => b.fraud_rate - a.fraud_rate);

const COUNTRY_NAMES = { US: 'United States', GB: 'United Kingdom', FR: 'France', DE: 'Germany', CA: 'Canada' };

function groupBy(keyFn) {
  const counts = {};
  TRANSACTIONS_MOCK.forEach((t) => {
    const key = keyFn(t);
    const entry = (counts[key] = counts[key] || { key, total: 0, fraud: 0 });
    entry.total += 1;
    if (t.status !== 'legitimate') entry.fraud += 1;
  });
  return Object.values(counts)
    .map((c) => ({ ...c, fraud_rate: parseFloat(((c.fraud / c.total) * 100).toFixed(2)) }))
    .sort((a, b) => b.fraud_rate - a.fraud_rate);
}

export const getFraudByLocationMock = () =>
  groupBy((t) => COUNTRY_NAMES[t.country] || t.country).map(({ key, total, fraud, fraud_rate }) => ({
    country: key,
    total,
    fraud,
    fraud_rate,
  }));

export const getFraudByDeviceMock = () =>
  groupBy((t) => t.device_type).map(({ key, total, fraud, fraud_rate }) => ({ device: key, total, fraud, fraud_rate }));

export const getFraudByHourMock = () => {
  const byHour = {};
  HOURS.forEach((h) => (byHour[h] = { hour: `${String(h).padStart(2, '0')}:00`, fraud: 0, legitimate: 0 }));
  TRANSACTIONS_MOCK.forEach((t) => {
    const bucket = byHour[new Date(t.txn_ts).getHours()];
    if (t.status !== 'legitimate') bucket.fraud += 1;
    else bucket.legitimate += 1;
  });
  return HOURS.map((h) => byHour[h]);
};

export const getAmountDistributionMock = () =>
  [
    { range: '$0 - $100', min: 0, max: 100 },
    { range: '$100 - $500', min: 100, max: 500 },
    { range: '$500 - $1,000', min: 500, max: 1000 },
    { range: '$1,000 - $5,000', min: 1000, max: 5000 },
    { range: '$5,000+', min: 5000, max: Infinity },
  ].map((r) => {
    const inRange = TRANSACTIONS_MOCK.filter((t) => t.amount >= r.min && t.amount < r.max);
    const fraud = inRange.filter((t) => t.status !== 'legitimate').length;
    return {
      range: r.range,
      fraud,
      legitimate: inRange.length - fraud,
      fraud_rate: inRange.length ? parseFloat(((fraud / inRange.length) * 100).toFixed(2)) : 0,
    };
  });

export const getModelPerformanceMock = () => ({
  model: {
    name: 'XGBoost v2.1',
    version: '2.1.0',
    deployed_date: '2024-06-15',
    accuracy: 0.942,
    precision: 0.918,
    recall: 0.893,
    f1_score: 0.905,
    roc_auc: 0.967,
    precision_at_recall: { 70: 0.88, 80: 0.82, 90: 0.74 },
  },
  confusion_matrix: { tp: 742, fp: 67, tn: 49880, fn: 91 },
});

export const getModelComparisonMock = () => [
  { name: 'XGBoost', version: '2.1.0', accuracy: 0.942, precision: 0.918, recall: 0.893, f1_score: 0.905, roc_auc: 0.967, training_time: '2.4s', is_current: true },
  { name: 'LightGBM', version: '4.3.0', accuracy: 0.935, precision: 0.895, recall: 0.901, f1_score: 0.898, roc_auc: 0.958, training_time: '1.8s', is_current: false },
  { name: 'Random Forest', version: '1.5.0', accuracy: 0.918, precision: 0.876, recall: 0.845, f1_score: 0.86, roc_auc: 0.934, training_time: '4.1s', is_current: false },
  { name: 'Logistic Regression', version: '1.0.0', accuracy: 0.885, precision: 0.823, recall: 0.798, f1_score: 0.81, roc_auc: 0.891, training_time: '0.5s', is_current: false },
];