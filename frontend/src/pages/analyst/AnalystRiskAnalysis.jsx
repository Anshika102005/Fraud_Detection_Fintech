import React, { useState } from 'react';
import {
  ShieldAlert,
  Activity,
  Zap,
  MapPin,
  Clock,
  Store,
  PieChart as PieChartIcon,
  TrendingUp,
  AlertTriangle,
  Compass
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';

export default function AnalystRiskAnalysis() {
  const radarData = [
    { subject: 'Transaction Velocity', A: 85, fullMark: 100 },
    { subject: 'Amount Deviation', A: 78, fullMark: 100 },
    { subject: 'Location Mismatch', A: 65, fullMark: 100 },
    { subject: 'Device Anomaly', A: 42, fullMark: 100 },
    { subject: 'VPA Blacklist', A: 90, fullMark: 100 },
    { subject: 'Time Deviation', A: 72, fullMark: 100 },
  ];

  const velocityData = [
    { range: '1-3 txns/hr', count: 94000, risk: 'Normal' },
    { range: '4-6 txns/hr', count: 18500, risk: 'Elevated' },
    { range: '7-10 txns/hr', count: 3200, risk: 'Suspicious' },
    { range: '>10 txns/hr', count: 890, risk: 'Critical' },
  ];

  return (
    <div className="page-container" style={{ padding: '24px', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
          Network Risk Analysis & Behavioral Telemetry
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
          Cross-network risk vector breakdown, behavioral anomalies, and algorithmic velocity tracking.
        </p>
      </div>

      {/* Grid of 6 Investigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* 1. Fraud Risk */}
        <div style={{ background: '#111827', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: '700', textTransform: 'uppercase' }}>Fraud Risk</span>
            <ShieldAlert size={18} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>0.34%</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>Network-wide average incidence across 1.42M payments.</div>
        </div>

        {/* 2. Behavioral Anomalies */}
        <div style={{ background: '#111827', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '700', textTransform: 'uppercase' }}>Behavioral Anomalies</span>
            <Activity size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f59e0b', fontFamily: 'Plus Jakarta Sans' }}>18,450</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>Deviations from customer baseline payment habit clusters.</div>
        </div>

        {/* 3. Transaction Velocity */}
        <div style={{ background: '#111827', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: '700', textTransform: 'uppercase' }}>Velocity Bursts</span>
            <Zap size={18} style={{ color: '#60a5fa' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#60a5fa', fontFamily: 'Plus Jakarta Sans' }}>892</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>Instances of rapid succession transfers exceeding threshold.</div>
        </div>

        {/* 4. Merchant Risk */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '700', textTransform: 'uppercase' }}>Merchant Risk</span>
            <Store size={18} style={{ color: '#a855f7' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>148 VPAs</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>Blacklisted or under active surveillance for spoofing.</div>
        </div>

        {/* 5. Location Risk */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '700', textTransform: 'uppercase' }}>Location Risk</span>
            <MapPin size={18} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>4 Zones</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>Geographic clusters exhibiting disproportionate fraud velocity.</div>
        </div>

        {/* 6. Time Pattern Risk */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '700', textTransform: 'uppercase' }}>Time Risk</span>
            <Clock size={18} style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>01:00 - 04:30</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>Peak nocturnal risk window accounting for 41% of severe flags.</div>
        </div>
      </div>

      {/* Radar & Velocity Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Behavioral Threat Radar */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '22px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
            Network Threat Radar Index
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
                <PolarRadiusAxis stroke="#64748b" fontSize={10} />
                <Radar name="Threat Intensity" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Velocity Distribution */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '22px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
            Transaction Velocity Distribution
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="range" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
