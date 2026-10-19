import React, { useState, useEffect } from 'react';
import { riskApi } from '../../services/api/riskApi';
import { useTransactions } from '../../contexts/TransactionContext';
import SafetyScoreGauge from '../../components/common/SafetyScoreGauge';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Zap,
  Clock,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Compass,
  Radar as RadarIcon,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

export default function RiskAnalysis() {
  const { isEmptyMode } = useTransactions();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRisk = async () => {
      setLoading(true);
      try {
        const res = await riskApi.getRiskSummary();
        setData(res);
      } catch (err) {
        console.error('Error fetching risk analysis:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRisk();
  }, [isEmptyMode]);

  if (loading || !data) {
    return <div className="page-container" style={{ padding: '24px', color: '#94a3b8' }}>Loading Risk Engine...</div>;
  }

  if (isEmptyMode || data.empty) {
    return (
      <div className="page-container" style={{ padding: '24px' }}>
        <div className="empty-dashboard-card">
          <div className="empty-state-icon">
            <ShieldCheck size={36} />
          </div>
          <h2 className="empty-state-title">No Risk Profile Generated</h2>
          <p className="empty-state-msg">
            Add transactions to enable multi-dimensional behavioral anomaly detection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
          Behavioral Risk Analysis
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
          Personal transaction anomaly vectors, radar distribution, and telemetry patterns.
        </p>
      </div>

      {/* Top Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Overall Risk Score</span>
            <Activity size={18} style={{ color: '#60a5fa' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>
            {data.overallRiskScore} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/ 100</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '6px' }}>Safe Personal Threshold</div>
        </div>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Behavior Anomaly</span>
            <Zap size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>
            {data.behaviorAnomalyScore}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '6px' }}>Low baseline variance</div>
        </div>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Time-of-Day Risk</span>
            <Clock size={18} style={{ color: '#818cf8' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>
            {data.timeOfDayRiskScore} / 100
          </div>
          <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '6px' }}>Late night flags active</div>
        </div>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Geo Location Risk</span>
            <MapPin size={18} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>
            {data.locationRiskScore} / 100
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '6px' }}>Normal home base IP</div>
        </div>
      </div>

      {/* Radar Chart & Dimension Progress Indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Radar Chart */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
              Multi-Dimensional Risk Radar
            </h3>
            <RadarIcon size={18} style={{ color: '#60a5fa' }} />
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data.riskDimensions}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="dimension" stroke="#94a3b8" fontSize={11} />
                <PolarRadiusAxis stroke="#64748b" angle={30} domain={[0, 100]} />
                <Radar name="Risk Index" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                <Tooltip contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dimension Progress Indicators */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#ffffff', fontWeight: '700' }}>
            Telemetry Risk Indicators
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {data.riskDimensions.map((dim) => (
              <div key={dim.dimension}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', color: '#cbd5e1', marginBottom: '6px' }}>
                  <span>{dim.dimension}</span>
                  <span style={{ fontWeight: '700', color: dim.score > 50 ? '#ef4444' : '#60a5fa' }}>
                    {dim.score} / 100
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${dim.score}%`,
                      height: '100%',
                      borderRadius: '9999px',
                      background: dim.score > 50 ? '#ef4444' : '#3b82f6',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Your Risk Patterns Section */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', color: '#ffffff', fontWeight: '700' }}>
          Your Risk Patterns
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {data.riskPatterns.map((pattern, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: pattern.severity === 'danger' ? 'rgba(239, 68, 68, 0.08)' : pattern.severity === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                border: '1px solid ' + (pattern.severity === 'danger' ? 'rgba(239, 68, 68, 0.25)' : pattern.severity === 'warning' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.08)'),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                {pattern.severity === 'danger' ? (
                  <ShieldAlert size={16} style={{ color: '#ef4444' }} />
                ) : pattern.severity === 'warning' ? (
                  <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                ) : (
                  <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                )}
                <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.9rem' }}>{pattern.title}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                {pattern.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
