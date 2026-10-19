import React from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  MapPin,
  CreditCard,
  Smartphone,
  Calendar,
  Sparkles,
  HelpCircle
} from 'lucide-react';

export default function TransactionModal({ transaction, onClose }) {
  if (!transaction) return null;

  const isCritical = transaction.riskLevel === 'CRITICAL';
  const isHigh = transaction.riskLevel === 'HIGH';
  const isMedium = transaction.riskLevel === 'MEDIUM';

  const riskBadgeClass = isCritical
    ? 'risk-badge-critical'
    : isHigh
    ? 'risk-badge-high'
    : isMedium
    ? 'risk-badge-medium'
    : 'risk-badge-low';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          background: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>
              Transaction #{transaction.id}
            </span>
            <span className={`gauge-status-badge ${riskBadgeClass}`} style={{ marginTop: 0 }}>
              {transaction.riskLevel} RISK
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Main Amount & Merchant Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff' }}>
                {transaction.merchant}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                {transaction.category}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>
                ₹{Number(transaction.amount).toLocaleString('en-IN')}
              </div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.75rem',
                  textTransform: 'capitalize',
                  color: transaction.status === 'legitimate' ? '#10b981' : '#f59e0b',
                  fontWeight: '600',
                }}
              >
                Status: {transaction.status}
              </span>
            </div>
          </div>

          {/* Key Attributes Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
              <Calendar size={15} style={{ color: '#60a5fa' }} />
              <span>{transaction.date}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
              <Clock size={15} style={{ color: '#60a5fa' }} />
              <span>{transaction.time || '12:00'} IST</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
              <CreditCard size={15} style={{ color: '#60a5fa' }} />
              <span>{transaction.paymentMethod}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
              <MapPin size={15} style={{ color: '#60a5fa' }} />
              <span>{transaction.location || 'Bengaluru, India'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1', gridColumn: 'span 2' }}>
              <Smartphone size={15} style={{ color: '#60a5fa' }} />
              <span>{transaction.device || 'iPhone 15 Pro (iOS 17)'}</span>
            </div>
          </div>

          {/* AI Fraud Analysis Card */}
          <div
            style={{
              background: isCritical || isHigh ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.06)',
              border: '1px solid ' + (isCritical || isHigh ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.2)'),
              borderRadius: '14px',
              padding: '18px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#ffffff', fontSize: '0.95rem' }}>
                <Sparkles size={16} style={{ color: isCritical || isHigh ? '#ef4444' : '#10b981' }} />
                <span>AI Fraud Analysis Card</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                Model: LightGBM Ensemble
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Risk Score</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: isCritical || isHigh ? '#ef4444' : '#10b981' }}>
                  {transaction.riskScore} / 100
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Fraud Probability</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: isCritical || isHigh ? '#ef4444' : '#10b981' }}>
                  {transaction.fraudProbability || Math.round(transaction.riskScore * 0.95)}%
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Prediction</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>
                  {transaction.prediction || (isCritical ? 'Fraudulent' : isHigh ? 'Suspicious' : 'Legitimate')}
                </div>
              </div>
            </div>
          </div>

          {/* AI Explanation: Why was this transaction flagged? */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.825rem', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Why was this transaction flagged?
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.6' }}>
              {transaction.flaggedReasons && transaction.flaggedReasons.length > 0 ? (
                transaction.flaggedReasons.map((reason, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{reason}</li>
                ))
              ) : (
                <li>No security anomalies detected. Transaction fits within your historical baseline.</li>
              )}
            </ul>
          </div>

          {transaction.recommendation && (
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.8rem', color: '#f59e0b' }}>
              <strong>Recommended Action:</strong> {transaction.recommendation}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '14px 24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn-landing-secondary"
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
