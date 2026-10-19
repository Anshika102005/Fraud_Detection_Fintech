import React, { useState } from 'react';
import {
  Shield,
  Bell,
  Key,
  Clock,
  Sliders,
  CheckCircle2,
  Lock,
  Smartphone,
  Eye,
  Save
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AnalystSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('security');
  const [saved, setSaved] = useState(false);

  // Settings State
  const [securityPolicies, setSecurityPolicies] = useState({
    enforceMfa: true,
    ipAllowlisting: false,
    sessionTimeoutMins: 30,
    strictFraudThreshold: 75,
  });

  const [notificationRules, setNotificationRules] = useState({
    criticalAlertsEmail: true,
    velocitySpikeSms: true,
    modelDriftSlack: false,
  });

  const [accessSettings, setAccessSettings] = useState({
    role: 'Lead Fraud Risk Analyst',
    workspaceScope: 'All Network Payment Streams',
    credentialAudit: 'Enabled',
  });

  const [sessionSettings, setSessionSettings] = useState({
    concurrentLogins: false,
    inactivityAutoLock: true,
  });

  const [preferences, setPreferences] = useState({
    defaultCurrency: 'INR (₹)',
    timeZone: 'Asia/Kolkata (IST)',
    denseTableMode: true,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { id: 'security', label: 'Security Policies', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'access', label: 'Access & Scope', icon: Key },
    { id: 'session', label: 'Session Management', icon: Clock },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
  ];

  return (
    <div className="page-container" style={{ padding: '24px', color: '#f8fafc', maxWidth: '1000px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
            Analyst Security & Workspace Settings
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Configure operational risk thresholds, notification rules, session parameters, and workspace preferences.
          </p>
        </div>

        <button
          onClick={handleSave}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '8px',
            background: saved ? '#10b981' : '#2563eb',
            border: 'none',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          <span>{saved ? 'Saved Successfully' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: activeTab === tab.id ? '#60a5fa' : '#94a3b8',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px' }}>
        {/* 1. Security */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>Operational Risk & Triage Policies</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#ffffff' }}>Enforce Analyst Multi-Factor Authentication (MFA)</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Require biometric or hardware token for analyst portal access.</div>
              </div>
              <input
                type="checkbox"
                checked={securityPolicies.enforceMfa}
                onChange={(e) => setSecurityPolicies({ ...securityPolicies, enforceMfa: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#ffffff' }}>Strict Fraud Alert Intercept Threshold</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Transactions exceeding this risk score trigger immediate auto-suspension.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number"
                  min="50"
                  max="95"
                  value={securityPolicies.strictFraudThreshold}
                  onChange={(e) => setSecurityPolicies({ ...securityPolicies, strictFraudThreshold: Number(e.target.value) })}
                  style={{ width: '70px', padding: '6px 10px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '6px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>/ 100</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Notifications */}
        {activeTab === 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>Notification & Alert Routing</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#ffffff' }}>Critical Incident Email Alerts</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Send high-priority email notifications when CRITICAL risk level is detected.</div>
              </div>
              <input
                type="checkbox"
                checked={notificationRules.criticalAlertsEmail}
                onChange={(e) => setNotificationRules({ ...notificationRules, criticalAlertsEmail: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#ffffff' }}>Velocity Spike Notifications</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Immediate push notification for rapid-fire payment transactions.</div>
              </div>
              <input
                type="checkbox"
                checked={notificationRules.velocitySpikeSms}
                onChange={(e) => setNotificationRules({ ...notificationRules, velocitySpikeSms: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
            </div>
          </div>
        )}

        {/* 3. Access */}
        {activeTab === 'access' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>Analyst Workspace Scope</h3>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', fontSize: '0.85rem' }}>
              <div style={{ marginBottom: '8px' }}><span style={{ color: '#64748b' }}>Assigned Identity:</span> <strong>{user?.name || 'Analyst'} ({user?.title || 'Fraud Analyst'})</strong></div>
              <div style={{ marginBottom: '8px' }}><span style={{ color: '#64748b' }}>Authorized Scope:</span> <strong style={{ color: '#38bdf8' }}>{accessSettings.workspaceScope}</strong></div>
              <div><span style={{ color: '#64748b' }}>Tenancy Boundary:</span> Zero-Knowledge tenant isolation enforced.</div>
            </div>
          </div>
        )}

        {/* 4. Session */}
        {activeTab === 'session' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>Session Timeout & Lock Parameters</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#ffffff' }}>Inactivity Auto-Lock</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Automatically lock workspace console after 30 minutes of inactivity.</div>
              </div>
              <input
                type="checkbox"
                checked={sessionSettings.inactivityAutoLock}
                onChange={(e) => setSessionSettings({ ...sessionSettings, inactivityAutoLock: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
            </div>
          </div>
        )}

        {/* 5. Preferences */}
        {activeTab === 'preferences' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>Workspace Preferences</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#ffffff' }}>Default Currency Display</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Display currency format across all transaction tables.</div>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#60a5fa' }}>INR (₹ - Indian Rupee)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#ffffff' }}>Time Zone Format</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Timestamp display format across analytics.</div>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#60a5fa' }}>IST (UTC+5:30)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
