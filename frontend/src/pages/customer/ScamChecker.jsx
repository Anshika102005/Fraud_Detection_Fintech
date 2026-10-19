import React, { useState } from 'react';
import { safetyApi } from '../../services/api/safetyApi';
import {
  SearchCode,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Info,
  CheckCircle2,
  Lock
} from 'lucide-react';

const PRESET_SCENARIOS = [
  'I received an SMS stating my electricity power will be cut tonight unless I call an officer number.',
  'An OLX buyer sent me a PhonePe QR code and told me to scan it and enter my PIN to receive payment.',
  'Someone on Telegram offered ₹3,000/day for liking YouTube videos but wants a ₹2,000 activation deposit.',
  'A caller claiming to be Mumbai Police video called on WhatsApp saying I am under Digital Arrest.',
  'Customer care for Swiggy told me to install AnyDesk to process an undelivered food refund.',
];

export default function ScamChecker() {
  const [query, setQuery] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null);

  const handleCheck = async (textToCheck) => {
    const text = textToCheck || query;
    if (!text.trim()) return;

    setIsChecking(true);
    try {
      await new Promise((r) => setTimeout(r, 600)); // simulated latency
      const res = await safetyApi.checkScam(text);
      setResult(res);
    } catch (err) {
      console.error('Error in scam check:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setQuery(preset);
    handleCheck(preset);
  };

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '820px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div
          className="landing-brand-badge"
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            margin: '0 auto 16px',
          }}
        >
          <SearchCode size={26} />
        </div>
        <h1 style={{ fontSize: '1.9rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', marginBottom: '8px' }}>
          Think something feels suspicious?
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#94a3b8', maxWidth: '540px', margin: '0 auto' }}>
          Paste an SMS message, describe an unsolicited call, or check an unexpected payment request before taking action.
        </p>
      </div>

      {/* Input Box */}
      <div className="scam-checker-box">
        <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '600', marginBottom: '10px' }}>
          Describe what happened...
        </label>
        <textarea
          className="scam-input-area"
          placeholder="e.g. I received a message saying my bank account will be blocked unless I pay a verification fee."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* Quick Presets */}
        <div style={{ marginBottom: '14px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '8px' }}>
            Or test with common Indian scam scenarios:
          </span>
          <div className="preset-scam-chips">
            {PRESET_SCENARIOS.map((preset, i) => (
              <button key={i} onClick={() => handleSelectPreset(preset)} className="preset-chip">
                {preset.slice(0, 48)}...
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => handleCheck()}
          disabled={isChecking || !query.trim()}
          className="btn-landing-primary"
          style={{
            width: '100%',
            padding: '13px',
            fontSize: '0.975rem',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
          }}
        >
          <Sparkles size={18} />
          <span>{isChecking ? 'Evaluating Social Engineering Patterns...' : 'Check Risk'}</span>
        </button>
      </div>

      {/* Result Card */}
      {result && (
        <div
          style={{
            background: '#111827',
            border: result.riskLevel === 'CRITICAL' ? '2px solid #ef4444' : result.riskLevel === 'HIGH' ? '2px solid #f97316' : '2px solid #f59e0b',
            borderRadius: '18px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '700' }}>
                Classification
              </span>
              <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#ffffff', fontWeight: '800' }}>
                {result.scamType}
              </h3>
            </div>

            <div
              className={`gauge-status-badge risk-badge-${result.riskLevel.toLowerCase()}`}
              style={{ fontSize: '0.9rem', padding: '6px 18px', marginTop: 0 }}
            >
              {result.riskLevel} RISK
            </div>
          </div>

          {/* Warning Signs */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Warning Signs Identified:
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '0.875rem', lineHeight: '1.6' }}>
              {result.warningSigns.map((w, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{w}</li>
              ))}
            </ul>
          </div>

          {/* Recommended Actions */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Recommended Actions:
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '0.875rem', lineHeight: '1.6' }}>
              {result.recommendedActions.map((rec, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{rec}</li>
              ))}
            </ul>
          </div>

          {/* Educational Guidance Disclaimer */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.78rem',
              color: '#94a3b8',
              lineHeight: '1.5',
            }}
          >
            <strong>Notice:</strong> FraudGuard AI provides educational guidance and does not guarantee that a situation is fraudulent.
          </div>
        </div>
      )}
    </div>
  );
}
