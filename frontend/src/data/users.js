/* ============================================================
   Mock Data: Users / Accounts
   ============================================================ */

const ACCOUNTS = [
  { customer_id: 'c001', name: 'Alice Johnson', email: 'alice.johnson@email.com', role: 'Standard', tier: 'Verified', total_txns: 1240, fraud_txns: 3, risk_score: 18, avg_amount: 245.3, status: 'active', flags: ['Trusted'] },
  { customer_id: 'c002', name: 'Bob Smith', email: 'bob.smith@email.com', role: 'Standard', tier: 'Unverified', total_txns: 312, fraud_txns: 12, risk_score: 62, avg_amount: 128.75, status: 'flagged', flags: ['Velocity', 'New device'] },
  { customer_id: 'c003', name: 'Carol Lee', email: 'carol.lee@email.com', role: 'Premium', tier: 'Verified', total_txns: 2891, fraud_txns: 2, risk_score: 12, avg_amount: 567.8, status: 'active', flags: ['Trusted'] },
  { customer_id: 'c004', name: 'David Wang', email: 'david.wang@email.com', role: 'Standard', tier: 'Unverified', total_txns: 98, fraud_txns: 9, risk_score: 74, avg_amount: 89.5, status: 'review', flags: ['Location anomaly', 'Card testing'] },
  { customer_id: 'c005', name: 'Elena Rodriguez', email: 'elena.rodriguez@email.com', role: 'Premium', tier: 'Verified', total_txns: 1876, fraud_txns: 4, risk_score: 24, avg_amount: 345.2, status: 'active', flags: [] },
  { customer_id: 'c006', name: 'Frank Miller', email: 'frank.miller@email.com', role: 'Standard', tier: 'Verified', total_txns: 540, fraud_txns: 6, risk_score: 41, avg_amount: 198.75, status: 'active', flags: [] },
  { customer_id: 'c007', name: 'Grace Kim', email: 'grace.kim@email.com', role: 'Premium', tier: 'Verified', total_txns: 4230, fraud_txns: 1, risk_score: 9, avg_amount: 782.4, status: 'active', flags: ['Trusted'] },
  { customer_id: 'c008', name: 'Henry Brown', email: 'henry.brown@email.com', role: 'Standard', tier: 'Unverified', total_txns: 67, fraud_txns: 5, risk_score: 58, avg_amount: 67.3, status: 'review', flags: ['New account', 'Velocity'] },
];

export const getUsersMock = () => ({
  data: ACCOUNTS,
  total: ACCOUNTS.length,
  summary: {
    total: ACCOUNTS.length,
    active: ACCOUNTS.filter((a) => a.status === 'active').length,
    flagged: ACCOUNTS.filter((a) => a.status !== 'active').length,
    avg_risk: Math.round((ACCOUNTS.reduce((s, a) => s + a.risk_score, 0) / ACCOUNTS.length) * 10) / 10,
  },
});