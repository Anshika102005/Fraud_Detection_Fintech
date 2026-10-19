import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Globe,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Calendar
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
  Legend
} from 'recharts';

export default function MacroAnalytics() {
  const [timeRange, setTimeRange] = useState('30d');

  const macroVolumeData = [
    { period: 'Week 1', totalVolume: 11.2, fraudVolume: 0.038, attempts: 1180 },
    { period: 'Week 2', totalVolume: 12.8, fraudVolume: 0.042, attempts: 1340 },
    { period: 'Week 3', totalVolume: 11.9, fraudVolume: 0.035, attempts: 1090 },
    { period: 'Week 4', totalVolume: 12.3, fraudVolume: 0.049, attempts: 1282 },
  ];

  const channelComparison = [
    { channel: 'UPI P2P Collect', legitRate: 99.73, fraudRate: 0.27 },
    { channel: 'Merchant Dynamic QR', legitRate: 99.88, fraudRate: 0.12 },
    { channel: 'Merchant Static QR', legitRate: 99.45, fraudRate: 0.55 },
    { channel: 'Cards & Online PG', legitRate: 99.62, fraudRate: 0.38 },
    { channel: 'Net Banking / RTGS', legitRate: 99.14, fraudRate: 0.86 },
  ];

  return (
    <div className="page-container" style={{ padding: '24px', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
            Macro Analytics & Payment Telemetry
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            System-wide payment volumes, comparative channel vulnerability, and longitudinal fraud patterns.
          </p>
        </div>

        {/* Time Filter */}
        <div style={{ display: 'flex', gap: '6px', background: '#111827', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: timeRange === range ? '#3b82f6' : 'transparent',
                color: timeRange === range ? '#ffffff' : '#94a3b8',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Total Processed Value</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: '4px 0' }}>₹48.2 Cr</div>
          <div style={{ fontSize: '0.72rem', color: '#10b981' }}>+8.4% vs last period</div>
        </div>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Attempted Fraud Loss</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ef4444', fontFamily: 'Plus Jakarta Sans', margin: '4px 0' }}>₹16.4 L</div>
          <div style={{ fontSize: '0.72rem', color: '#f87171' }}>100% intercepted by rules</div>
        </div>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Overall Intervention Rate</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981', fontFamily: 'Plus Jakarta Sans', margin: '4px 0' }}>98.2%</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Precision on critical alerts</div>
        </div>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Average Response Latency</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#38bdf8', fontFamily: 'Plus Jakarta Sans', margin: '4px 0' }}>42ms</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Inference pipeline speed</div>
        </div>
      </div>

      {/* Row: Volume Telemetry & Channel Vulnerability */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Weekly Ingestion Trends */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '22px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#ffffff', fontWeight: '700' }}>
            Weekly Network Value (₹ Crores)
          </h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={macroVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="period" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="totalVolume" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Volume (₹ Cr)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Risk Comparison */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '22px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#ffffff', fontWeight: '700' }}>
            Channel Vulnerability Index
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {channelComparison.map((ch) => (
              <div key={ch.channel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '4px' }}>
                  <span>{ch.channel}</span>
                  <span style={{ fontWeight: '700', color: ch.fraudRate > 0.5 ? '#ef4444' : '#f59e0b' }}>
                    {ch.fraudRate}% fraud rate
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${ch.fraudRate * 50}%`, height: '100%', background: ch.fraudRate > 0.5 ? '#ef4444' : '#f59e0b' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
