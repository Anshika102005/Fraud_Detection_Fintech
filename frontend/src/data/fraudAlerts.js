/* ============================================================
   Mock Data: Fraud Alerts
============================================================ */
import { TRANSACTIONS_MOCK } from './transactions';

const ALL_ALERTS = TRANSACTIONS_MOCK.filter(t => t.status === 'fraudulent' || t.status === 'suspicious' || t.status === 'blocked')
  .map((txn, i) => {
    const priority = txn.risk_score >= 90 ? 'critical' : txn.risk_score >= 80 ? 'high' : txn.risk_score >= 71 ? 'medium' : 'low';
    const status = ['new', 'investigating', 'resolved'][Math.floor(Math.random() * 3)];
    return {
      id: 'alert_' + String(10000 + i).padStart(5, '0'),
      transaction_id: txn.transaction_id,
      customer_name: txn.customer_name,
      customer_id: txn.customer_id,
      amount: txn.amount,
      merchant: txn.merchant_name,
      risk_score: txn.risk_score,
      fraud_probability: txn.fraud_probability,
      triggered_rules: [
        'High risk score detected',
        'Unusual transaction amount',
        'Velocity violation',
        'Location anomaly',
      ].slice(0, Math.floor(Math.random() * 3) + 1),
      time_detected: txn.txn_ts,
      status,
      priority,
      notes: '',
    };
  }).sort((a, b) => new Date(b.time_detected) - new Date(a.time_detected));

export const FRAUD_ALERTS_MOCK = ALL_ALERTS;

export const getFraudAlertsMock = (params = {}) => {
  let data = [...ALL_ALERTS];
  if (params.priority) data = data.filter(a => a.priority === params.priority);
  if (params.status) data = data.filter(a => a.status === params.status);
  if (params.search) {
    const q = params.search.toLowerCase();
    data = data.filter(a => a.id.toLowerCase().includes(q) || a.transaction_id.toLowerCase().includes(q) || a.customer_name.toLowerCase().includes(q));
  }
  const limit = parseInt(params.limit) || 20;
  const page = parseInt(params.page) || 1;
  return { data: data.slice(0, limit), total: data.length, page, limit };
};

export const getFraudAlertByIdMock = (id) => {
  const alert = ALL_ALERTS.find(a => a.id === id) || FRAUD_ALERTS_MOCK.find(a => a.transaction_id === id);
  return alert ? { data: alert } : { data: null };
};
