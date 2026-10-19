import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ThemeContext';
import { getRiskAnalysis, blockTransaction, approveTransaction } from '../services/api';
import { formatDateTime, formatCurrency, getRiskLabel, getRiskColor } from '../utils/helpers';

import RiskScore from '../components/ui/RiskScore';
import RiskMeter from '../components/ui/RiskMeter';
import StatusBadge from '../components/ui/StatusBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import { FiArrowRight, FiShield } from 'react-icons/fi';

function riskFactors(txn) {
  const factors = [];
  const ratio = txn.amount / txn.avg_amount;
  if (ratio > 1.5) factors.push({ label: 'Transaction Amount', points: Math.round(Math.min(28, (ratio - 1) * 14)) });
  if (txn.is_new_device) factors.push({ label: 'New Device', points: 15 });
  if (txn.distance_from_prev_km > 300) factors.push({ label: 'Unusual Location', points: 18 });
  if (txn.txns_last_10m >= 4) factors.push({ label: 'Velocity', points: 20 });
  factors.push({ label: 'Behavior Deviation', points: Math.round(4 + Math.min(10, ratio * 4)) });
  return factors.sort((a, b) => b.points - a.points);
}

function InvestigationPanel({ txn, onBlock, onApprove }) {
  if (!txn) return null;
  const factors = riskFactors(txn);
  const maxPoints = Math.max(...factors.map((f) => f.points), 1);

  return (
    <div className="investigation-panel">
      <div className="investigation-header">
        <div>
          <h2 className="investigation-title">{txn.transaction_id}</h2>
          <p className="investigation-subtitle">{formatDateTime(txn.txn_ts)} · {txn.customer_name} · {txn.merchant_name}</p>
        </div>
        <StatusBadge status={txn.status} />
      </div>

      <div className="investigation-score-row">
        <div className="investigation-score-box">
          <div className="investigation-score-value" style={{ color: getRiskColor(txn.risk_score) }}>
            {txn.risk_score}
            <span className="investigation-score-max">/100</span>
          </div>
          <div className="investigation-score-level">{getRiskLabel(txn.risk_score).toUpperCase()} RISK</div>
          <div className="investigation-fraud-prob">Fraud Probability: {txn.fraud_probability}%</div>
        </div>
        <div className="investigation-meter-box">
          <RiskMeter score={txn.risk_score} />
        </div>
      </div>

      <div className="investigation-section-title">Risk Factors</div>
      <div className="risk-factors">
        {factors.map((factor) => (
          <div className="risk-factor-row" key={factor.label}>
            <span className="risk-factor-label">{factor.label}</span>
            <span className="risk-factor-bar-track">
              <span className="risk-factor-bar-fill" style={{ width: `${(factor.points / maxPoints) * 100}%`, backgroundColor: getRiskColor(txn.risk_score) }} />
            </span>
            <span className="risk-factor-score">+{factor.points}</span>
          </div>
        ))}
      </div>

      <div className="investigation-section-title">Behavioral Analysis</div>
      <div className="behavior-comparison-table">
        <div className="behavior-row">
          <span>Amount</span>
          <span className="behavior-now">{formatCurrency(txn.amount)}</span>
          <span className="behavior-then">hist. avg {formatCurrency(txn.avg_amount)}</span>
        </div>
        <div className="behavior-row">
          <span>Location distance</span>
          <span className="behavior-now">{txn.distance_from_prev_km} km</span>
          <span className="behavior-then">hist. avg {txn.avg_distance_km} km</span>
        </div>
        <div className="behavior-row">
          <span>Transactions in 10 min</span>
          <span className="behavior-now">{txn.txns_last_10m}</span>
          <span className="behavior-then">typical ≤ 2</span>
        </div>
        <div className="behavior-row">
          <span>Device</span>
          <span className="behavior-now">{txn.device_type}</span>
          <span className="behavior-then">{txn.is_new_device ? 'new / untrusted' : 'recognized'}</span>
        </div>
      </div>

      <div className="investigation-actions">
        <button className="btn-approve" onClick={() => onApprove(txn)}>Mark Legitimate</button>
        <button className="btn-danger" onClick={() => onBlock(txn)}>Block Transaction</button>
      </div>
    </div>
  );
}

function RiskAnalysis() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('txn');

  const { data, loading, error, execute } = useApi(getRiskAnalysis, []);
  const [selected, setSelected] = useState(null);
  const [blocking, setBlocking] = useState(null);
  const [approving, setApproving] = useState(null);

  const confirmBlock = async () => {
    if (!blocking) return;
    await blockTransaction(blocking.transaction_id, 'Blocked during investigation');
    showToast(`Transaction ${blocking.transaction_id} blocked.`, 'success');
    setBlocking(null);
    execute();
  };

  const confirmApprove = async () => {
    if (!approving) return;
    await approveTransaction(approving.transaction_id);
    showToast(`Transaction ${approving.transaction_id} marked legitimate.`, 'success');
    setApproving(null);
    execute();
  };

  if (error) {
    return (
      <div className="dashboard">
        <ErrorState message={error.message} onRetry={execute} />
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="dashboard-title">Risk Analysis</h1>
          <p className="dashboard-subtitle">Investigate high-risk transactions</p>
        </div>
        <SkeletonLoader rows={6} />
      </div>
    );
  }

  const txns = data.highRiskTransactions;
  const active = selected || txns.find((t) => t.transaction_id === selectedId) || txns[0];

  return (
    <div className="dashboard risk-analysis-page">
      <div className="page-header">
        <div>
          <h1 className="dashboard-title">Risk Analysis</h1>
          <p className="dashboard-subtitle">Investigate high-risk transactions</p>
        </div>
        <Link to="/check" className="btn-primary">
          <FiShield /> Check Transaction
        </Link>
      </div>

      <div className="investigation-layout">
        <aside className="investigation-list">
          <h3 className="investigation-list-title">High-Risk Queue</h3>
          {txns.length ? (
            <ul className="investigation-list-items">
              {txns.slice(0, 12).map((t) => (
                <li key={t.transaction_id}>
                  <button
                    type="button"
                    className={`investigation-list-item ${active && t.transaction_id === active.transaction_id ? 'active' : ''}`}
                    onClick={() => setSelected(t)}
                  >
                    <span className="investigation-item-top">
                      <span className="investigation-item-id">{t.transaction_id}</span>
                      <RiskScore score={t.risk_score} />
                    </span>
                    <span className="investigation-item-sub">{t.customer_name} · {formatCurrency(t.amount)}</span>
                    <span className="investigation-item-time">{formatDateTime(t.txn_ts, { date: false, time: true })}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No high-risk transactions" description="The risk queue is clear right now." />
          )}
        </aside>

        <section className="investigation-main">
          {active ? (
            <InvestigationPanel txn={active} onBlock={(t) => setBlocking(t)} onApprove={(t) => setApproving(t)} />
          ) : (
            <EmptyState title="Select a transaction" description="Choose a transaction from the queue to start an investigation." />
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(blocking)}
        title="Block transaction"
        message={blocking ? `Block ${blocking.transaction_id}? The card will be frozen immediately.` : ''}
        confirmLabel="Block"
        danger
        onConfirm={confirmBlock}
        onCancel={() => setBlocking(null)}
      />
      <ConfirmDialog
        open={Boolean(approving)}
        title="Mark as legitimate"
        message={approving ? `Mark ${approving.transaction_id} as legitimate?` : ''}
        confirmLabel="Approve"
        onConfirm={confirmApprove}
        onCancel={() => setApproving(null)}
      />
    </div>
  );
}

export default RiskAnalysis;