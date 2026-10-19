import React, { useState, useEffect } from 'react';
import { analystApi } from '../../services/api/analystApi';
import {
  Cpu,
  BrainCircuit,
  Layers,
  Sparkles,
  BarChart3,
  CheckCircle2,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

export default function ModelPerformance() {
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const res = await analystApi.getModelPerformance();
        setModelData(res);
      } catch (err) {
        console.error('Failed to load model performance:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading || !modelData) {
    return <div className="page-container" style={{ padding: '24px', color: '#94a3b8' }}>Loading Model Telemetry...</div>;
  }

  const { kpis, confusionMatrix, featureImportance, modelName, lastTrained, datasetSize, evaluationMode } = modelData;

  return (
    <div className="page-container" style={{ padding: '24px', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
              Model Performance & Telemetry
            </h1>
            <span
              style={{
                fontSize: '0.725rem',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              Demo Model Metrics
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            {modelName} • Trained on {datasetSize} ({evaluationMode})
          </p>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Last Evaluation: {lastTrained}
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Precision', value: kpis.precision, desc: 'Low false-positive rate' },
          { label: 'Recall', value: kpis.recall, desc: 'Catches 92% of fraud vectors' },
          { label: 'F1 Score', value: kpis.f1Score, desc: 'Harmonic balance index' },
          { label: 'ROC-AUC', value: kpis.rocAuc, desc: 'Class separation power' },
          { label: 'PR-AUC', value: kpis.prAuc, desc: 'High-imbalance sensitivity' },
        ].map((m) => (
          <div key={m.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>{m.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: '4px 0' }}>
              {m.value}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#10b981' }}>{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Row: Confusion Matrix & Feature Importance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Confusion Matrix */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: '700' }}>
              Confusion Matrix Evaluation
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Test Split (284,000 samples)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700', textTransform: 'uppercase' }}>True Negatives (TN)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', margin: '6px 0' }}>
                {confusionMatrix.trueNegative.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Correctly verified legitimate</div>
            </div>

            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '700', textTransform: 'uppercase' }}>False Positives (FP)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', margin: '6px 0' }}>
                {confusionMatrix.falsePositive.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Legitimate challenged for 2FA</div>
            </div>

            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '700', textTransform: 'uppercase' }}>False Negatives (FN)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', margin: '6px 0' }}>
                {confusionMatrix.falseNegative.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Missed fraudulent attempts</div>
            </div>

            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700', textTransform: 'uppercase' }}>True Positives (TP)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', margin: '6px 0' }}>
                {confusionMatrix.truePositive.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Correctly intercepted fraud</div>
            </div>
          </div>
        </div>

        {/* Feature Importance */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: '700' }}>
              SHAP Feature Importance
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Top Predictive Signals</span>
          </div>

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureImportance} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <XAxis type="number" stroke="#64748b" fontSize={10} domain={[0, 0.35]} />
                <YAxis dataKey="feature" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                <Tooltip contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="importance" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Model Architecture Note */}
      <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '14px', padding: '18px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <Info size={20} style={{ color: '#60a5fa', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
          <strong style={{ color: '#ffffff' }}>Production Model Governance:</strong> Model telemetry incorporates calibrated LightGBM and XGBoost ensembles with tree-based SHAP explainability. All pipeline metrics depicted above are validated against synthetic test splits labeled for demonstration.
        </div>
      </div>
    </div>
  );
}
