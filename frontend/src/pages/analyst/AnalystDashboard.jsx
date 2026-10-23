import React, { useState, useEffect } from 'react';
import { analystApi } from '../../services/api/analystApi';
import {
  ShieldAlert,
  AlertTriangle,
  Receipt,
  TrendingUp,
  Activity,
  Cpu,
  BarChart3,
  Shield,
  Layers,
  MapPin,
  Clock,
  CreditCard,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function AnalystDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalystData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await analystApi.getAnalystDashboard();
        setData(res);
      } catch (err) {
        console.error('Failed to load analyst overview:', err);
        setError(err.message || 'Failed to load fraud intelligence telemetry.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalystData();
  }, []);

  if (loading) {
    return <div className="page-container" style={{ padding: '24px', color: '#94a3b8' }}>Loading Fraud Intelligence Telemetry...</div>;
  }

  if (error || !data) {
    return (
      <div className="page-container" style={{ padding: '24px' }}>
        <div
          role="alert"
          style={{
            padding: '14px 16px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '0.9rem',
          }}
        >
          {error || 'No overview data available.'}
        </div>
      </div>
    );
  }

  const {
    macroKpis,
    fraudTrend,
    vectorBreakdown,
    riskDistribution,
    paymentMethodDistribution,
    locationDistribution,
    hourlyActivity,
  } = data;

  return (
    <div className="page-container" style={{ padding: '24px', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
            Fraud Intelligence Dashboard
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Transaction monitoring, fraud investigation, and risk intelligence.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 14px', borderRadius: '8px' }}>
          <ShieldAlert size={16} style={{ color: '#ef4444' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#f87171' }}>OPERATIONS LEVEL: DEFCON 2</span>
        </div>
      </div>

      {/* 6 Macro KPI Cards */}
      <div className="kpi-grid-fintech" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* 1. Total Transactions */}
        <div className="kpi-card-fintech" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Total Transactions</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <Receipt size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>
            {macroKpis.totalTransactions.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Across {(macroKpis.activeAccounts || 0).toLocaleString('en-IN')} registered accounts
          </div>
        </div>

        {/* 2. Fraud Detected */}
        <div className="kpi-card-fintech" style={{ background: '#111827', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Fraud Detected</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <ShieldAlert size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ef4444', fontFamily: 'Plus Jakarta Sans' }}>
            {macroKpis.fraudTransactions.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>Intercepted before settlement</div>
        </div>

        {/* 3. Suspicious Flags */}
        <div className="kpi-card-fintech" style={{ background: '#111827', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Suspicious Flags</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <AlertTriangle size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f59e0b', fontFamily: 'Plus Jakarta Sans' }}>
            {macroKpis.suspiciousTransactions.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>In 2FA verification challenge</div>
        </div>

        {/* 4. System Fraud Rate */}
        <div className="kpi-card-fintech" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>System Fraud Rate</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <TrendingUp size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981', fontFamily: 'Plus Jakarta Sans' }}>
            {macroKpis.fraudRate}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>Flagged share of recorded transactions</div>
        </div>

        {/* 5. Processed Transaction Value */}
        <div className="kpi-card-fintech" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Processed Value</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', fontWeight: '800' }}>
              ₹
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>
            ₹{Number(macroKpis.totalTransactionValue || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>Cumulative recorded network flow</div>
        </div>

        {/* 6. Average Network Risk */}
        <div className="kpi-card-fintech" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Avg Network Risk</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <Activity size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#38bdf8', fontFamily: 'Plus Jakarta Sans' }}>
            {macroKpis.averageRiskScore} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: '500' }}>/ 100</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>Average score across recorded transactions</div>
        </div>
      </div>

      {/* Row 1: Fraud Trend & Threat Vectors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Monthly Fraud Prevented Trend */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#ffffff', fontWeight: '700' }}>
                Fraud Trend & Automated Interceptions
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Detected attempts vs automated platform deflections</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: '600', background: 'rgba(59, 130, 246, 0.12)', padding: '3px 8px', borderRadius: '6px' }}>
              Last 6 Months
            </span>
          </div>

          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fraudTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="detGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="detected" stroke="#ef4444" strokeWidth={2} fill="url(#detGrad)" name="Detected" />
                <Area type="monotone" dataKey="prevented" stroke="#10b981" strokeWidth={2} fill="url(#prevGrad)" name="Prevented" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Primary Threat Vectors */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: '700' }}>
              Primary Threat Vectors
            </h3>
            <Layers size={18} style={{ color: '#ef4444' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {vectorBreakdown.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                No flagged threat vectors recorded yet.
              </p>
            )}
            {vectorBreakdown.map((vec) => (
              <div key={vec.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: '#cbd5e1', marginBottom: '4px' }}>
                  <span>{vec.name}</span>
                  <span style={{ fontWeight: '700', color: vec.color }}>{vec.percentage}% ({vec.cases} cases)</span>
                </div>
                <div style={{ width: '100%', height: '6px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${vec.percentage}%`, height: '100%', background: vec.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Risk Distribution & Hourly Fraud Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Risk Distribution */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: '700' }}>
              Network Risk Distribution
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {macroKpis.totalTransactions.toLocaleString('en-IN')} Transactions
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {riskDistribution.every((item) => item.value === 0) && (
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                No transactions recorded yet.
              </p>
            )}
            {riskDistribution.map((item) => (
              <div key={item.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: '#cbd5e1', marginBottom: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                    {item.name}
                  </span>
                  <span style={{ fontWeight: '700', color: '#ffffff' }}>{item.value}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${item.value}%`, height: '100%', background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Fraud Activity */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', color: '#ffffff', fontWeight: '700' }}>
                Hourly Fraud Activity
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Late-night attack velocity peaks (IST)</span>
            </div>
            <Clock size={18} style={{ color: '#60a5fa' }} />
          </div>

          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyActivity} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="cases" fill="#ef4444" radius={[4, 4, 0, 0]} name="Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Geographic Distribution & Payment Channel Risk */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Geographic Hotspots */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: '700' }}>
              Geographic Fraud Hotspots
            </h3>
            <MapPin size={18} style={{ color: '#ef4444' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {locationDistribution.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                No flagged incidents recorded yet.
              </p>
            )}
            {locationDistribution.map((loc) => (
              <div key={loc.state} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#ffffff' }}>{loc.state}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{loc.incidents} flagged incidents</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: loc.riskLevel === 'CRITICAL' ? 'rgba(220,38,38,0.2)' : loc.riskLevel === 'HIGH' ? 'rgba(239,68,68,0.2)' : loc.riskLevel === 'MEDIUM' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                      color: loc.riskLevel === 'CRITICAL' ? '#f87171' : loc.riskLevel === 'HIGH' ? '#ef4444' : loc.riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981',
                    }}
                  >
                    {loc.riskLevel}
                  </span>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{loc.percentage}% of volume</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: '700' }}>
              Payment Method Vulnerability Index
            </h3>
            <CreditCard size={18} style={{ color: '#38bdf8' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {paymentMethodDistribution.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                No transactions recorded yet.
              </p>
            )}
            {paymentMethodDistribution.map((pm) => (
              <div key={pm.method} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#ffffff' }}>{pm.method}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ef4444' }}>{pm.rate} fraud rate</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
                  <span>{pm.fraudCount.toLocaleString('en-IN')} fraudulent attempts</span>
                  <span>{pm.safeCount.toLocaleString('en-IN')} verified safe</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
