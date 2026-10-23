import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTransactions } from '../../contexts/TransactionContext';
import SafetyScoreGauge from '../../components/common/SafetyScoreGauge';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Receipt,
  PlusCircle,
  UploadCloud,
  TrendingUp,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  PieChart as PieIcon,
  Sparkles,
  ShoppingBag,
  Smartphone,
  ChevronRight,
  Database
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { transactions, alerts, kpis, isEmptyMode, toggleEmptyMode } = useTransactions();
  const navigate = useNavigate();

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';

  // Sample dynamic chart activity data
  const activityData = [
    { name: 'Mon', volume: 8, value: 4200 },
    { name: 'Tue', volume: 12, value: 6800 },
    { name: 'Wed', volume: 5, value: 2400 },
    { name: 'Thu', volume: 9, value: 5100 },
    { name: 'Fri', volume: 16, value: 14200 },
    { name: 'Sat', volume: 22, value: 18900 },
    { name: 'Sun', volume: 14, value: 9400 },
  ];

  const distributionData = [
    { name: 'Legitimate', value: transactions.filter((t) => t.status === 'legitimate').length || 10, color: '#10B981' },
    { name: 'Suspicious', value: transactions.filter((t) => t.status === 'suspicious').length || 2, color: '#F59E0B' },
    { name: 'Fraudulent', value: transactions.filter((t) => t.status === 'fraudulent').length || 1, color: '#EF4444' },
  ];

  /* ---------------- EMPTY STATE ---------------- */
  if (isEmptyMode || transactions.length === 0) {
    return (
      <div className="page-container" style={{ padding: '24px' }}>
        <div className="empty-dashboard-card">
          <div className="empty-state-icon">
            <Shield size={36} />
          </div>
          <h2 className="empty-state-title">Your FraudGuard dashboard is ready.</h2>
          <p className="empty-state-msg">
            Add your transactions or upload your transaction history to begin.
          </p>

          <div className="empty-state-actions" style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/app/add-transaction" className="btn-landing-primary" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>
              <PlusCircle size={18} />
              <span>+ Add Transaction</span>
            </Link>
            <Link to="/app/upload" className="btn-landing-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>
              <UploadCloud size={18} />
              <span>Upload CSV</span>
            </Link>
          </div>

        </div>
      </div>
    );
  }

  /* ---------------- DASHBOARD WITH DATA ---------------- */
  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Top Welcome & Quick Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: '0 0 4px 0' }}>
            Welcome, {firstName}
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
            Your Indian digital payments are actively protected by FraudGuard AI behavior analysis.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/app/add-transaction" className="btn-landing-primary" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>
            <PlusCircle size={16} />
            <span>+ Add Transaction</span>
          </Link>
          <Link to="/app/upload" className="btn-landing-secondary" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>
            <UploadCloud size={16} />
            <span>Upload CSV</span>
          </Link>
        </div>
      </div>

      {/* Top 6 KPI Cards */}
      <div className="kpi-grid-fintech">
        <div className="kpi-card-fintech">
          <div className="kpi-header-fintech">
            <span className="kpi-label-fintech">Total Transactions</span>
            <div className="kpi-icon-fintech" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
              <Receipt size={18} />
            </div>
          </div>
          <div className="kpi-value-fintech">{kpis.totalTransactions.toLocaleString('en-IN')}</div>
          <div className="kpi-footer-fintech">
            <Activity size={13} style={{ color: '#10b981' }} />
            <span>Active monitoring</span>
          </div>
        </div>

        <div className="kpi-card-fintech">
          <div className="kpi-header-fintech">
            <span className="kpi-label-fintech">Fraud Transactions</span>
            <div className="kpi-icon-fintech" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="kpi-value-fintech" style={{ color: '#ef4444' }}>{kpis.fraudCount}</div>
          <div className="kpi-footer-fintech">
            <span>Critical flagged cases</span>
          </div>
        </div>

        <div className="kpi-card-fintech">
          <div className="kpi-header-fintech">
            <span className="kpi-label-fintech">Suspicious Activity</span>
            <div className="kpi-icon-fintech" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="kpi-value-fintech" style={{ color: '#f59e0b' }}>{kpis.suspiciousCount}</div>
          <div className="kpi-footer-fintech">
            <span>Needs review</span>
          </div>
        </div>

        <div className="kpi-card-fintech">
          <div className="kpi-header-fintech">
            <span className="kpi-label-fintech">Fraud Rate</span>
            <div className="kpi-icon-fintech" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value-fintech">{kpis.fraudRate}</div>
          <div className="kpi-footer-fintech">
            <span>Safe industry threshold</span>
          </div>
        </div>

        <div className="kpi-card-fintech">
          <div className="kpi-header-fintech">
            <span className="kpi-label-fintech">Transaction Value</span>
            <div className="kpi-icon-fintech" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>
              <span style={{ fontWeight: '800', fontSize: '1rem' }}>₹</span>
            </div>
          </div>
          <div className="kpi-value-fintech">
            ₹{kpis.totalValue > 100000 ? (kpis.totalValue / 100000).toFixed(2) + 'L' : kpis.totalValue.toLocaleString('en-IN')}
          </div>
          <div className="kpi-footer-fintech">
            <span>Processed volume</span>
          </div>
        </div>

        <div className="kpi-card-fintech">
          <div className="kpi-header-fintech">
            <span className="kpi-label-fintech">Average Amount</span>
            <div className="kpi-icon-fintech" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8' }}>
              <Activity size={18} />
            </div>
          </div>
          <div className="kpi-value-fintech">₹{kpis.averageAmount.toLocaleString('en-IN')}</div>
          <div className="kpi-footer-fintech">
            <span>Typical ticket size</span>
          </div>
        </div>
      </div>

      {/* Large Personal Safety Score Card */}
      <div className="safety-score-card">
        <SafetyScoreGauge score={87} status="Good" />

        <div className="safety-score-info">
          <h3>Personal Safety Score</h3>
          <p>
            Your safety score is based on transaction risk patterns, peer anomaly comparisons, and security behavior across your Indian digital wallets.
          </p>

          <div className="safety-factors-grid">
            <div className="factor-item">
              <CheckCircle2 size={16} className="factor-check-icon" />
              <span>Low suspicious activity over past 30 days</span>
            </div>
            <div className="factor-item">
              <CheckCircle2 size={16} className="factor-check-icon" />
              <span>Normal transaction behavior & recognized merchants</span>
            </div>
            <div className="factor-item">
              <CheckCircle2 size={16} className="factor-check-icon" />
              <span>No unusual transaction velocity spikes</span>
            </div>
            <div className="factor-item">
              <CheckCircle2 size={16} className="factor-check-icon" />
              <span>Safe payment patterns: 92% legitimate VPAs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row: Payment Activity & Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr', gap: '24px', marginBottom: '24px' }}>
        {/* Activity Trend */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
                Your Payment Activity
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Weekly volume and INR spending trend</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: '600' }}>7-Day Trajectory</span>
          </div>

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  formatter={(val) => [`₹${val}`, 'Spent Value']}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} fill="url(#valGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Legitimate / Suspicious / Fraudulent */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
              Transaction Integrity
            </h3>
            <PieIcon size={18} style={{ color: '#94a3b8' }} />
          </div>

          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
            {distributionData.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#cbd5e1' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }} />
                <span>{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Spending Insights */}
      <div className="spending-insights-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} style={{ color: '#60a5fa' }} />
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: '700' }}>
            AI Spending Insights
          </h3>
        </div>

        <div className="insights-grid">
          <div className="insight-item">
            <div className="insight-icon">
              <TrendingUp size={18} />
            </div>
            <div>
              <div className="insight-title">Monthly Trajectory</div>
              <div className="insight-text">Your spending increased by 18% compared with last month.</div>
            </div>
          </div>

          <div className="insight-item">
            <div className="insight-icon">
              <ShoppingBag size={18} />
            </div>
            <div>
              <div className="insight-title">Top Spending Category</div>
              <div className="insight-text">Food & Delivery is your most-used category (Swiggy, Zomato).</div>
            </div>
          </div>

          <div className="insight-item">
            <div className="insight-icon">
              <Smartphone size={18} />
            </div>
            <div>
              <div className="insight-title">Average Basket Size</div>
              <div className="insight-text">Your average transaction amount is ₹1,240.</div>
            </div>
          </div>

          <div className="insight-item">
            <div className="insight-icon">
              <Clock size={18} />
            </div>
            <div>
              <div className="insight-title">Active Payment Window</div>
              <div className="insight-text">Most transactions occur between 6:00 PM and 10:00 PM.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Alerts Summary Banner */}
      {alerts.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(17, 24, 39, 0.8) 100%)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.95rem' }}>
                You have {alerts.filter((a) => a.status === 'new').length} unreviewed security alerts
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                Latest: {alerts[0]?.merchant} (₹{alerts[0]?.amount?.toLocaleString('en-IN')}) flagged for {alerts[0]?.whyFlagged[0]}
              </div>
            </div>
          </div>

          <Link to="/app/alerts" className="btn-landing-primary" style={{ background: '#ef4444', borderColor: '#ef4444', padding: '8px 18px', fontSize: '0.85rem' }}>
            <span>Review Alerts</span>
            <ChevronRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
