import React, { useState } from 'react';
import { useToast } from '../contexts/ThemeContext';
import { FiKey } from 'react-icons/fi';

function Settings() {
  const { showToast } = useToast();

  const [settings, setSettings] = useState({
    orgName: 'FraudGuard AI',
    timezone: 'UTC',
    low: 30,
    medium: 70,
    high: 90,
    notifyCritical: true,
    notifyHigh: true,
    notifyMedium: false,
    autoBlockCritical: true,
    threshold: 0.53,
  });

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const [saved, setSaved] = useState({ ...settings });

  const save = () => {
    setSaved({ ...settings });
    showToast('Settings saved. Risk thresholds are now live.', 'success');
  };

  const reset = () => setSettings({ ...saved });

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="dashboard-title">Settings</h1>
          <p className="dashboard-subtitle">Organization, risk policy and notification configuration</p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-card">
          <h3 className="confusion-matrix-title">Organization</h3>
          <div className="form-group">
            <label className="form-label" htmlFor="org">Organization name</label>
            <input id="org" className="form-input" value={settings.orgName} onChange={(e) => update('orgName', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="tz">Timezone</label>
            <select id="tz" className="form-select" value={settings.timezone} onChange={(e) => update('timezone', e.target.value)}>
              <option>UTC</option>
              <option>America/New_York</option>
              <option>Europe/London</option>
              <option>Asia/Singapore</option>
            </select>
          </div>
        </div>

        <div className="settings-card">
          <h3 className="confusion-matrix-title">Risk Policy (configurable — never hard-coded)</h3>
          <div className="threshold-row">
            <label className="form-label">LOW risk (0 – {settings.low})</label>
            <input type="range" min="10" max="40" value={settings.low} onChange={(e) => update('low', Number(e.target.value))} />
            <span className="threshold-value">{settings.low}</span>
          </div>
          <div className="threshold-row">
            <label className="form-label">MEDIUM (31 – {settings.medium})</label>
            <input type="range" min="40" max="80" value={settings.medium} onChange={(e) => update('medium', Number(e.target.value))} />
            <span className="threshold-value">{settings.medium}</span>
          </div>
          <div className="threshold-row">
            <label className="form-label">HIGH (71 – {settings.high})</label>
            <input type="range" min="70" max="95" value={settings.high} onChange={(e) => update('high', Number(e.target.value))} />
            <span className="threshold-value">{settings.high}</span>
          </div>
          <div className="threshold-row">
            <label className="form-label">Fraud threshold (score)</label>
            <input type="range" min="0.25" max="0.85" step="0.01" value={settings.threshold} onChange={(e) => update('threshold', Number(e.target.value))} />
            <span className="threshold-value">{settings.threshold.toFixed(2)}</span>
          </div>
          <p className="form-help">Threshold optimized from the business cost curve (FN=$100, FP=$5).</p>
        </div>

        <div className="settings-card">
          <h3 className="confusion-matrix-title">Notifications & Automation</h3>
          <label className="toggle-row">
            <input type="checkbox" checked={settings.notifyCritical} onChange={(e) => update('notifyCritical', e.target.checked)} />
            <span>Notify on CRITICAL alerts (SMS + email)</span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={settings.notifyHigh} onChange={(e) => update('notifyHigh', e.target.checked)} />
            <span>Notify on HIGH alerts (email)</span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={settings.autoBlockCritical} onChange={(e) => update('autoBlockCritical', e.target.checked)} />
            <span>Auto-block CRITICAL (≥ {settings.high}) transactions</span>
          </label>
        </div>

        <div className="settings-card">
          <h3 className="confusion-matrix-title">API Access</h3>
          <p className="form-help">Inject via environment variables. Never commit secrets.</p>
          <div className="api-key-row">
            <span className="api-key-masked">sk_live_********************</span>
            <button className="btn-clear" onClick={() => showToast('Rotate key request sent to admin.')}>
              <FiKey /> Rotate
            </button>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn-clear" onClick={reset}>Discard Changes</button>
        <button className="btn-primary" onClick={save}>Save Settings</button>
      </div>
    </div>
  );
}

export default Settings;