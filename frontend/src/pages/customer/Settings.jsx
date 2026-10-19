import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Lock,
  Moon,
  Sun,
  Eye,
  Check
} from 'lucide-react';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useNotification();

  const [notifPrefs, setNotifPrefs] = useState({
    fraudAlerts: true,
    highRiskAlerts: true,
    monthlyReports: true,
    safetyNotifications: true,
  });

  const [riskSensitivity, setRiskSensitivity] = useState('Standard (Balanced)');

  const handleTogglePref = (key) => {
    setNotifPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      showToast('Notification preference saved!', 'info');
      return updated;
    });
  };

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '780px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
          Settings & Preferences
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
          Configure personal fraud detection thresholds and alert notifications.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Notification Preferences */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Bell size={18} style={{ color: '#60a5fa' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
              Notification Preferences
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { id: 'fraudAlerts', label: 'Fraud Alerts', desc: 'Instant push & email for confirmed fraudulent transaction attempts' },
              { id: 'highRiskAlerts', label: 'High Risk Alerts', desc: 'Prompts for unusual merchant or late-night spending spikes' },
              { id: 'monthlyReports', label: 'Monthly Reports', desc: 'Notification when your monthly security statement is published' },
              { id: 'safetyNotifications', label: 'Safety Notifications', desc: 'Advisories regarding new emerging Indian UPI or QR scam vectors' },
            ].map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.875rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.desc}</div>
                </div>

                <button
                  onClick={() => handleTogglePref(item.id)}
                  style={{
                    width: '46px',
                    height: '24px',
                    borderRadius: '9999px',
                    background: notifPrefs[item.id] ? '#2563eb' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: notifPrefs[item.id] ? '24px' : '2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      transition: 'left 0.2s',
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Fraud Alert Sensitivity */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Shield size={18} style={{ color: '#60a5fa' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
              Fraud Alert Preferences
            </h3>
          </div>

          <label style={{ display: 'block', fontSize: '0.825rem', color: '#94a3b8', marginBottom: '8px' }}>
            AI Anomaly Engine Sensitivity
          </label>
          <select
            value={riskSensitivity}
            onChange={(e) => {
              setRiskSensitivity(e.target.value);
              showToast('Sensitivity threshold updated!', 'success');
            }}
            style={{
              width: '100%',
              background: '#0a0f1d',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#ffffff',
              fontSize: '0.875rem',
            }}
          >
            <option value="Conservative">Conservative (Flag only severe anomalies)</option>
            <option value="Standard (Balanced)">Standard (Balanced — Recommended for Gen Z spenders)</option>
            <option value="Aggressive">Aggressive (Screen all new merchants & rapid micro-payments)</option>
          </select>
        </div>

        {/* Interface Theme & Appearance */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
                Theme Appearance
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                Currently active: {theme === 'dark' ? 'Dark FinTech Mode' : 'Light FinTech Mode'}
              </p>
            </div>

            <button
              onClick={toggleTheme}
              className="btn-landing-secondary"
              style={{ padding: '8px 16px', fontSize: '0.825rem' }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
