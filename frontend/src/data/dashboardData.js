/* ============================================================
   Mock Data: Dashboard KPIs & Alerts
   ============================================================ */
import { TRANSACTIONS_MOCK } from './transactions';

const totalTxns = TRANSACTIONS_MOCK.length;
const fraudTxns = TRANSACTIONS_MOCK.filter((t) => t.status === 'fraudulent').length;
const blockedTxns = TRANSACTIONS_MOCK.filter((t) => t.status === 'blocked').length;
const totalValue = TRANSACTIONS_MOCK.reduce((sum, t) => sum + t.amount, 0);
const avgRisk = TRANSACTIONS_MOCK.reduce((sum, t) => sum + t.risk_score, 0) / totalTxns;
const fraudRate = (fraudTxns / totalTxns) * 100;

export const getDashboardStatsMock = () => ({
  kpis: [
    {
      id: 'total_transactions',
      label: 'Total Transactions',
      value: totalTxns.toLocaleString(),
      change: '+12.4%',
      changeType: 'increase',
      goodWhenUp: true,
      icon: 'Receipt',
      iconClass: 'transactions',
    },
    {
      id: 'fraudulent',
      label: 'Fraudulent Transactions',
      value: fraudTxns.toLocaleString(),
      change: '-8.2%',
      changeType: 'decrease',
      goodWhenUp: false,
      icon: 'ShieldAlert',
      iconClass: 'fraud',
    },
    {
      id: 'fraud_rate',
      label: 'Fraud Rate',
      value: `${fraudRate.toFixed(2)}%`,
      change: '-0.42%',
      changeType: 'decrease',
      goodWhenUp: false,
      icon: 'TrendingDown',
      iconClass: 'fraud-rate',
    },
    {
      id: 'total_value',
      label: 'Total Transaction Value',
      value: `$${(totalValue / 1000000).toFixed(2)}M`,
      change: '+18.7%',
      changeType: 'increase',
      goodWhenUp: true,
      icon: 'Banknote',
      iconClass: 'value',
    },
    {
      id: 'avg_risk',
      label: 'Average Risk Score',
      value: avgRisk.toFixed(1),
      change: '+3.1%',
      changeType: 'increase',
      goodWhenUp: false,
      icon: 'Gauge',
      iconClass: 'risk',
    },
    {
      id: 'blocked',
      label: 'Blocked Transactions',
      value: blockedTxns.toString(),
      change: '-15.3%',
      changeType: 'decrease',
      goodWhenUp: false,
      icon: 'Lock',
      iconClass: 'blocked',
    },
  ],
  recentAlerts: generateRecentAlerts(),
  timeFilter: '7d',
});

function generateRecentAlerts() {
  const alerts = [];
  const highRisk = TRANSACTIONS_MOCK.filter((t) => t.risk_score >= 80).slice(0, 8);
  highRisk.forEach((txn) => {
    const priority = txn.risk_score >= 90 ? 'critical' : txn.risk_score >= 80 ? 'high' : 'medium';
    alerts.push({
      id: `alt_${String(1000 + alerts.length).padStart(4, '0')}`,
      transaction_id: txn.transaction_id,
      customer_name: txn.customer_name,
      customer_id: txn.customer_id,
      risk_score: txn.risk_score,
      fraud_probability: txn.fraud_probability,
      amount: txn.amount,
      merchant: txn.merchant_name,
      triggered_rules: generateRules(txn),
      time_detected: txn.txn_ts,
      status: 'new',
      priority,
    });
  });
  return alerts;
}

function generateRules(txn) {
  const rules = [];
  if (txn.risk_score > 70) rules.push('High risk score detected');
  if (txn.amount > 500) rules.push('Unusual transaction amount');
  if (txn.fraud_probability > 80) rules.push('High fraud probability');
  if (txn.is_new_device) rules.push('New device detected');
  if (txn.distance_from_prev_km > 500) rules.push('Location anomaly');
  if (txn.txns_last_10m >= 4) rules.push('Velocity violation');
  return rules.length ? rules : ['Risk threshold exceeded'];
}