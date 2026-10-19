import React, { useState } from 'react';
import { useTransactions } from '../../contexts/TransactionContext';
import { useNotification } from '../../contexts/NotificationContext';
import TransactionModal from '../../components/transactions/TransactionModal';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Info,
  Clock,
  Filter
} from 'lucide-react';

export default function FraudAlerts() {
  const { alerts, updateAlertStatus, transactions, isEmptyMode } = useTransactions();
  const { showToast } = useNotification();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTxn, setSelectedTxn] = useState(null);

  const filteredAlerts = alerts.filter((a) => {
    if (statusFilter === 'ALL') return true;
    return a.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const handleAction = async (id, actionType) => {
    if (actionType === 'fraud') {
      await updateAlertStatus(id, 'resolved');
      showToast('Incident marked as confirmed fraud. Recipient VPA blacklisted in local safety cache.', 'error');
    } else if (actionType === 'legit') {
      await updateAlertStatus(id, 'resolved');
      showToast('Marked as legitimate. Personal ML baseline adjusted.', 'success');
    } else if (actionType === 'dismiss') {
      await updateAlertStatus(id, 'dismissed');
      showToast('Alert dismissed.', 'info');
    }
  };

  const handleReview = (alert) => {
    // Find matching full transaction or construct inspection object
    const match = transactions.find((t) => t.id === alert.transactionId);
    if (match) {
      setSelectedTxn(match);
    } else {
      setSelectedTxn({
        id: alert.transactionId,
        merchant: alert.merchant,
        amount: alert.amount,
        riskLevel: alert.riskLevel,
        riskScore: alert.riskScore,
        fraudProbability: alert.fraudProbability,
        status: alert.status,
        date: alert.timestamp,
        category: alert.category || 'Other',
        flaggedReasons: alert.whyFlagged,
        recommendation: alert.recommendedAction,
      });
    }
  };

  if (isEmptyMode || alerts.length === 0) {
    return (
      <div className="page-container" style={{ padding: '24px' }}>
        <div className="empty-dashboard-card">
          <div className="empty-state-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <ShieldCheck size={36} />
          </div>
          <h2 className="empty-state-title">No Active Security Alerts</h2>
          <p className="empty-state-msg">
            Your transactions currently show no anomalies or high-risk fraud alerts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
            Fraud Alerts
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Flagged payment activities requiring user review and confirmation.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', background: '#111827', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {['ALL', 'new', 'investigating', 'resolved', 'dismissed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                background: statusFilter === status ? '#2563eb' : 'transparent',
                border: 'none',
                color: statusFilter === status ? '#fff' : '#94a3b8',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s',
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="alerts-list-container">
        {filteredAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: '#111827', borderRadius: '16px', color: '#64748b' }}>
            No alerts found for selected filter status.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.riskLevel === 'CRITICAL';
            const isHigh = alert.riskLevel === 'HIGH';
            const riskClass = isCritical ? 'critical' : isHigh ? 'high' : 'medium';

            return (
              <div key={alert.id} className={`alert-card-fintech ${riskClass}`}>
                {/* Top Row: Merchant, Amount & Badges */}
                <div className="alert-top-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      className={`gauge-status-badge risk-badge-${alert.riskLevel.toLowerCase()}`}
                      style={{ marginTop: 0 }}
                    >
                      {alert.riskLevel} RISK
                    </div>
                    <span className="alert-merchant-name">{alert.merchant}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>#{alert.transactionId}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span className="alert-amount">₹{Number(alert.amount).toLocaleString('en-IN')}</span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        color: alert.status === 'new' ? '#ef4444' : '#10b981',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                      }}
                    >
                      {alert.status}
                    </span>
                  </div>
                </div>

                {/* Timing & Scores */}
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} />
                    <span>{alert.timestamp}</span>
                  </div>
                  <div>
                    Risk Score: <strong style={{ color: '#ffffff' }}>{alert.riskScore}/100</strong>
                  </div>
                  <div>
                    Fraud Probability: <strong style={{ color: '#ffffff' }}>{alert.fraudProbability}%</strong>
                  </div>
                </div>

                {/* Why Flagged */}
                <div className="alert-why-box">
                  <div className="alert-why-title">Why it was flagged:</div>
                  <ul className="alert-bullets">
                    {alert.whyFlagged.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>

                {/* Recommendation */}
                {alert.recommendedAction && (
                  <div className="alert-recommendation">
                    <Info size={16} style={{ flexShrink: 0 }} />
                    <span>{alert.recommendedAction}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="alert-actions-row">
                  <button onClick={() => handleReview(alert)} className="btn-alert-action btn-dismiss">
                    <Eye size={14} />
                    <span>Review Transaction</span>
                  </button>

                  <button onClick={() => handleAction(alert.id, 'fraud')} className="btn-alert-action btn-mark-fraud">
                    <XCircle size={14} />
                    <span>Mark as Fraud</span>
                  </button>

                  <button onClick={() => handleAction(alert.id, 'legit')} className="btn-alert-action btn-mark-legit">
                    <CheckCircle2 size={14} />
                    <span>Mark as Legitimate</span>
                  </button>

                  <button onClick={() => handleAction(alert.id, 'dismiss')} className="btn-alert-action btn-dismiss">
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Transaction Modal */}
      {selectedTxn && (
        <TransactionModal transaction={selectedTxn} onClose={() => setSelectedTxn(null)} />
      )}
    </div>
  );
}
