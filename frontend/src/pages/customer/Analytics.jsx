import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../../services/api/analyticsApi';
import { useTransactions } from '../../contexts/TransactionContext';
import {
  BarChart3,
  Calendar,
  CreditCard,
  PieChart as PieIcon,
  Clock,
  MapPin,
  TrendingUp,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function Analytics() {
  const { isEmptyMode } = useTransactions();
  const [timeRange, setTimeRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await analyticsApi.getAnalytics(timeRange);
        setData(res);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [timeRange, isEmptyMode]);

  const ranges = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
    { label: '6 Months', value: '6m' },
    { label: '1 Year', value: '1y' },
  ];

  if (loading || !data) {
    return <div className="page-container" style={{ padding: '24px', color: '#94a3b8' }}>Loading Analytics...</div>;
  }

  if (isEmptyMode || data.empty) {
    return (
      <div className="page-container" style={{ padding: '24px' }}>
        <div className="empty-dashboard-card">
          <h2 className="empty-state-title">No Analytics Available</h2>
          <p className="empty-state-msg">
            Analytics will dynamically visualize spending volume, fraud rates, and category breakdowns once transactions exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Header & Range Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
            Transaction Analytics
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Comprehensive time-series and demographic analysis of your digital payments.
          </p>
        </div>

        {/* Range Buttons */}
        <div style={{ display: 'flex', gap: '6px', background: '#111827', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              style={{
                background: timeRange === r.value ? '#2563eb' : 'transparent',
                border: 'none',
                color: timeRange === r.value ? '#fff' : '#94a3b8',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Volume & Value Trends + Fraud Rate */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Value and Volume Line/Bar */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
              Processed Value & Volume Trend
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>INR (₹)</span>
          </div>

          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Value (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fraud Rate Trend */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
              Fraud Exposure Rate (%)
            </h3>
            <TrendingUp size={18} style={{ color: '#10b981' }} />
          </div>

          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey="fraudRate" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Fraud %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Payment Methods & Category Distributions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Payment Methods */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
              Payment Method Breakdown
            </h3>
            <CreditCard size={18} style={{ color: '#60a5fa' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.paymentMethods.map((pm) => (
              <div key={pm.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: '#cbd5e1', marginBottom: '4px' }}>
                  <span>{pm.name}</span>
                  <span style={{ fontWeight: '700' }}>{pm.value}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${pm.value}%`, height: '100%', background: pm.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
              Category Distribution
            </h3>
            <PieIcon size={18} style={{ color: '#60a5fa' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.categories.map((cat) => (
              <div key={cat.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: '#cbd5e1', marginBottom: '4px' }}>
                  <span>{cat.name}</span>
                  <span style={{ fontWeight: '700' }}>{cat.value}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${cat.value}%`, height: '100%', background: '#3b82f6' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Hourly Activity */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
              Hourly Transaction Activity
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Concentration of legitimate activity vs risk spikes by 3-hour windows</span>
          </div>
          <Clock size={18} style={{ color: '#60a5fa' }} />
        </div>

        <div style={{ width: '100%', height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.hourlyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Normal Activity" />
              <Bar dataKey="riskCount" fill="#ef4444" radius={[4, 4, 0, 0]} name="Flagged Risk" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
