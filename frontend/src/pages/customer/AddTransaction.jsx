import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTransactions } from '../../contexts/TransactionContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
  INDIAN_MERCHANTS,
  INDIAN_CITIES,
  PAYMENT_METHODS,
  DEVICE_TYPES
} from '../../data/indianData';
import {
  PlusCircle,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
  RotateCcw
} from 'lucide-react';

export default function AddTransaction() {
  const { addTransaction } = useTransactions();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    amount: '',
    merchant: INDIAN_MERCHANTS[0].name,
    category: INDIAN_MERCHANTS[0].category,
    date: new Date().toISOString().split('T')[0],
    time: '19:30',
    paymentMethod: PAYMENT_METHODS[0].label,
    location: INDIAN_CITIES[0],
    device: DEVICE_TYPES[0],
    customMerchant: '',
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleMerchantChange = (e) => {
    const val = e.target.value;
    if (val === 'CUSTOM') {
      setFormData((prev) => ({ ...prev, merchant: 'CUSTOM', customMerchant: '' }));
    } else {
      const match = INDIAN_MERCHANTS.find((m) => m.name === val);
      setFormData((prev) => ({
        ...prev,
        merchant: val,
        category: match ? match.category : prev.category,
        customMerchant: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    setIsAnalyzing(true);
    const resolvedMerchant =
      formData.merchant === 'CUSTOM' ? formData.customMerchant || 'Custom Merchant' : formData.merchant;

    try {
      // Small simulated latency for AI inference
      await new Promise((r) => setTimeout(r, 650));
      const res = await addTransaction({
        ...formData,
        merchant: resolvedMerchant,
        amount: Number(formData.amount),
      });

      setAnalysisResult(res);
      showToast('Transaction analyzed & added to monitoring!', 'success');
    } catch (err) {
      showToast('Error analyzing transaction: ' + err.message, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setFormData({
      amount: '',
      merchant: INDIAN_MERCHANTS[0].name,
      category: INDIAN_MERCHANTS[0].category,
      date: new Date().toISOString().split('T')[0],
      time: '19:30',
      paymentMethod: PAYMENT_METHODS[0].label,
      location: INDIAN_CITIES[0],
      device: DEVICE_TYPES[0],
      customMerchant: '',
    });
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#f59e0b';
      default: return '#10b981';
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '820px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
          Add & Analyze Transaction
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
          Evaluate transaction telemetry against personal behavioral anomaly baselines.
        </p>
      </div>

      {/* Security Notice Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 18px',
          borderRadius: '12px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          marginBottom: '24px',
        }}
      >
        <Lock size={18} style={{ color: '#10b981', flexShrink: 0 }} />
        <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
          <strong style={{ color: '#ffffff' }}>Strict Privacy Guard:</strong> We never ask for UPI PIN, OTP, CVV, or Net Banking credentials. Enter only public transaction parameters.
        </div>
      </div>

      {/* Analysis Result Display */}
      {analysisResult ? (
        <div
          style={{
            background: '#111827',
            border: `2px solid ${getRiskColor(analysisResult.riskLevel)}`,
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                AI Model Prediction Result
              </span>
              <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#ffffff', fontWeight: '800' }}>
                {analysisResult.prediction}
              </h2>
            </div>

            <div
              className={`gauge-status-badge risk-badge-${analysisResult.riskLevel.toLowerCase()}`}
              style={{ fontSize: '0.9rem', padding: '6px 18px', marginTop: 0 }}
            >
              {analysisResult.riskLevel} RISK
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Risk Score</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: getRiskColor(analysisResult.riskLevel), fontFamily: 'Plus Jakarta Sans' }}>
                {analysisResult.riskScore} <span style={{ fontSize: '0.85rem', color: '#64748b' }}>/ 100</span>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Fraud Probability</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: getRiskColor(analysisResult.riskLevel), fontFamily: 'Plus Jakarta Sans' }}>
                {analysisResult.fraudProbability}%
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Transaction ID</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff', marginTop: '6px' }}>
                {analysisResult.transaction?.id}
              </div>
            </div>
          </div>

          {/* AI Explanation */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Why was this outcome produced?
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '0.875rem', lineHeight: '1.6' }}>
              {analysisResult.flaggedReasons?.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          {analysisResult.transaction?.recommendation && (
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#f59e0b', fontSize: '0.85rem', marginBottom: '24px' }}>
              <strong>Advisory:</strong> {analysisResult.transaction.recommendation}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button onClick={handleReset} className="btn-landing-secondary" style={{ padding: '10px 20px' }}>
              <RotateCcw size={16} />
              <span>Add Another Transaction</span>
            </button>
            <Link to="/app/transactions" className="btn-landing-primary" style={{ padding: '10px 20px' }}>
              <span>View All Transactions</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      ) : (
        /* Form Section */
        <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '30px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              {/* Amount */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600', marginBottom: '8px' }}>
                  Amount in Indian Rupees (₹) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '12px', fontSize: '1.1rem', fontWeight: '700', color: '#94a3b8' }}>₹</span>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1450"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#0a0f1d',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '12px',
                      padding: '12px 16px 12px 34px',
                      color: '#ffffff',
                      fontSize: '1.1rem',
                      fontFamily: 'Plus Jakarta Sans',
                      fontWeight: '700',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Merchant Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600', marginBottom: '8px' }}>
                  Merchant / Receiver *
                </label>
                <select
                  value={formData.merchant}
                  onChange={handleMerchantChange}
                  style={{
                    width: '100%',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  {INDIAN_MERCHANTS.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.category})
                    </option>
                  ))}
                  <option value="CUSTOM">+ Enter Custom Merchant Name...</option>
                </select>

                {formData.merchant === 'CUSTOM' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter merchant or VPA handle..."
                    value={formData.customMerchant}
                    onChange={(e) => setFormData({ ...formData, customMerchant: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#0a0f1d',
                      border: '1px solid rgba(59,130,246,0.5)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      marginTop: '8px',
                      outline: 'none',
                    }}
                  />
                )}
              </div>

              {/* Merchant Category */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600', marginBottom: '8px' }}>
                  Merchant Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Grocery">Grocery / Quick Commerce</option>
                  <option value="Online Shopping">Online Shopping</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Travel">Travel & Commute</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other / Peer P2P</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600', marginBottom: '8px' }}>
                  Payment Method *
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.id} value={pm.label}>
                      {pm.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600', marginBottom: '8px' }}>
                  City / Location
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  {INDIAN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600', marginBottom: '8px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Time */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600', marginBottom: '8px' }}>
                  Time of Day (24hr)
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Device Type */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600', marginBottom: '8px' }}>
                  Device Type & Platform
                </label>
                <select
                  value={formData.device}
                  onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  {DEVICE_TYPES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isAnalyzing}
              className="btn-landing-primary"
              style={{
                width: '100%',
                padding: '14px 20px',
                fontSize: '1rem',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
              }}
            >
              <Sparkles size={18} />
              <span>{isAnalyzing ? 'Running AI Anomaly Engine...' : 'Analyze Transaction'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
