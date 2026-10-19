import React, { useState } from 'react';
import { useToast } from '../contexts/ThemeContext';
import { predictFraud } from '../services/api';
import { MERCHANT_CATEGORIES } from '../utils/constants';
import RiskMeter from '../components/ui/RiskMeter';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { FiAlertTriangle, FiCheckCircle, FiClock } from 'react-icons/fi';
import { getRiskColor } from '../utils/helpers';

const DEFAULT_FORM = {
  transaction_amount: '',
  transaction_time: '',
  merchant: '',
  merchant_category: 'Online Shopping',
  location: '',
  device_id: '',
  ip_address: '',
  recent_transactions: '',
  average_transaction_amount: '',
  previous_location_location: '',
};

function CheckTransaction() {
  const { showToast } = useToast();
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.transaction_amount || parseFloat(form.transaction_amount) <= 0) errs.transaction_amount = 'Enter a valid amount greater than 0.';
    if (form.ip_address && !/^\d{1,3}(\.\d{1,3}){3}$/.test(form.ip_address)) errs.ip_address = 'Enter a valid IPv4 address.';
    if (form.recent_transactions && parseInt(form.recent_transactions) < 0) errs.recent_transactions = 'Cannot be negative.';
    if (form.average_transaction_amount && parseFloat(form.average_transaction_amount) <= 0) errs.average_transaction_amount = 'Must be greater than 0.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Please fix the highlighted form fields.', 'warning');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const payload = {
        ...form,
        recent_transactions: form.recent_transactions || 0,
        average_transaction_amount: form.average_transaction_amount || form.transaction_amount,
      };
      const prediction = await predictFraud(payload);
      setResult(prediction);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setForm({ ...DEFAULT_FORM });
    setResult(null);
    setErrors({});
  };

  const now = new Date().toISOString().slice(0, 16);

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="dashboard-title">Check Transaction</h1>
          <p className="dashboard-subtitle">Score a single transaction with the production fraud model</p>
        </div>
      </div>
      <div className="check-layout">
        <form className="check-form" onSubmit={submit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="tx_amount">Transaction Amount ($) *</label>
              <input id="tx_amount" type="number" min="0.01" step="0.01" className="form-input" value={form.transaction_amount} onChange={(e) => set('transaction_amount', e.target.value)} placeholder="e.g. 1250.00" required />
              {errors.transaction_amount && <span className="form-error">{errors.transaction_amount}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tx_time">Transaction Time</label>
              <input id="tx_time" type="datetime-local" className="form-input" value={form.transaction_time || now} onChange={(e) => set('transaction_time', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="merchant">Merchant</label>
              <input id="merchant" type="text" className="form-input" value={form.merchant} onChange={(e) => set('merchant', e.target.value)} placeholder="e.g. Best Buy" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="category">Merchant Category</label>
              <select id="category" className="form-select" value={form.merchant_category} onChange={(e) => set('merchant_category', e.target.value)}>
                {Object.values(MERCHANT_CATEGORIES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="location">Location (City, Country)</label>
              <input id="location" type="text" className="form-input" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. London, GB" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="prev_location">Previous Transaction Location</label>
              <input id="prev_location" type="text" className="form-input" value={form.previous_location_location} onChange={(e) => set('previous_location_location', e.target.value)} placeholder="e.g. New York, US" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="device">Device ID</label>
              <input id="device" type="text" className="form-input" value={form.device_id} onChange={(e) => set('device_id', e.target.value)} placeholder="e.g. DEV-A1B2-847" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ip">IP Address</label>
              <input id="ip" type="text" className="form-input" value={form.ip_address} onChange={(e) => set('ip_address', e.target.value)} placeholder="e.g. 203.0.113.12" />
              {errors.ip_address && <span className="form-error">{errors.ip_address}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="recent">Recent Transactions (30 min)</label>
              <input id="recent" type="number" min="0" className="form-input" value={form.recent_transactions} onChange={(e) => set('recent_transactions', e.target.value)} placeholder="e.g. 7" />
              {errors.recent_transactions && <span className="form-error">{errors.recent_transactions}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="avg">Average Transaction Amount</label>
              <input id="avg" type="number" min="0.01" step="0.01" className="form-input" value={form.average_transaction_amount} onChange={(e) => set('average_transaction_amount', e.target.value)} placeholder="e.g. 120.00" />
              {errors.average_transaction_amount && <span className="form-error">{errors.average_transaction_amount}</span>}
            </div>
          </div>

          <div className="check-form-actions">
            <button type="button" className="btn-clear" onClick={reset}>Reset</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Analyzing…' : 'Analyze Transaction'}
            </button>
          </div>
        </form>
        <div className="check-results">
          {loading && (
            <div className="check-loading">
              <LoadingSpinner label="Scoring transaction with XGBoost v2.1…" />
            </div>
          )}

          {!loading && result && (
            <div className={`prediction-result ${result.risk_level.toLowerCase()}`}>
              <div className="prediction-header">
                <div>
                  <div className="prediction-label">Fraud Probability</div>
                  <div className="prediction-score" style={{ color: getRiskColor(result.risk_score) }}>
                    {result.fraud_probability}%
                  </div>
                  <div className="prediction-model">model {result.model_version}</div>
                </div>
                <span className={`risk-level-badge ${result.risk_level.toLowerCase()}`}>{result.risk_level} RISK</span>
              </div>

              <div className="prediction-decisions">
                {result.decision === 'APPROVE' && <FiCheckCircle className="prediction-decision-icon success" />}
                {result.decision === 'REVIEW' && <FiClock className="prediction-decision-icon warning" />}
                {result.decision === 'BLOCK' && <FiAlertTriangle className="prediction-decision-icon danger" />}
                <span className={`decision-chip decision-${String(result.decision).toLowerCase()}`}>
                  Decision: {result.decision}
                </span>
              </div>

              <RiskMeter score={result.risk_score} size="lg" />

              <div className="prediction-section-title">Why was this transaction flagged?</div>
              <div className="prediction-reasons">
                {result.reasons.map((r) => (
                  <div className="prediction-reason" key={r.factor}>
                    <span className="prediction-reason-icon">
                      <FiAlertTriangle />
                    </span>
                    <span className="prediction-reason-text">{r.factor}</span>
                    <span className="prediction-reason-points" style={{ color: getRiskColor(result.risk_score) }}>+{r.contribution}</span>
                  </div>
                ))}
              </div>

              <div className="prediction-footer">
                <button className="btn-clear" onClick={reset}>Run Another</button>
                <button className="btn-primary" onClick={() => showToast('Decision logged to the fraud case queue.', 'success')}>
                  Open Case
                </button>
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="check-placeholder">
              <span className="check-placeholder-icon">🔎</span>
              <h3>No prediction yet</h3>
              <p>Fill in the transaction details and click <strong>Analyze Transaction</strong> to receive a fraud probability, risk score and explainable risk factors.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CheckTransaction;