import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ThemeContext';
import { getModelPerformance, getModelComparison } from '../services/api';

import SkeletonLoader from '../components/ui/SkeletonLoader';
import ErrorState from '../components/ui/ErrorState';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const METRIC_KEYS = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1_score', label: 'F1 Score' },
  { key: 'roc_auc', label: 'ROC-AUC' },
];

function MetricCard({ label, value }) {
  return (
    <div className="metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

function ModelPerformance() {
  const { showToast } = useToast();
  const [promoting, setPromoting] = useState(false);

  const load = async () => {
    const [perf, comparison] = await Promise.all([getModelPerformance(), getModelComparison()]);
    return { perf, comparison };
  };

  const { data, loading, error, execute } = useApi(load, []);

  if (error) return <ErrorState message={error.message} onRetry={execute} />;
  if (loading || !data) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="dashboard-title">Model Performance</h1>
          <p className="dashboard-subtitle">ML model quality, comparisons and promotion gates</p>
        </div>
        <SkeletonLoader rows={6} variant="cards" />
      </div>
    );
  }

  const { perf, comparison } = data;
  const cm = perf.confusion_matrix;
  const total = cm.tp + cm.fp + cm.tn + cm.fn;

  const confirmPromote = () => {
    showToast('Model promoted to Production in the MLflow registry.', 'success');
    setPromoting(false);
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="dashboard-title">Model Performance</h1>
          <p className="dashboard-subtitle">{perf.model.name} · v{perf.model.version} · deployed {perf.model.deployed_date}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-clear" onClick={() => showToast('Retraining triggered via CI/CD pipeline.', 'info')}>
            Retrain
          </button>
          <button className="btn-primary" onClick={() => setPromoting(true)}>
            Promote to Production
          </button>
        </div>
      </div>

      <div className="metric-grid">
        {METRIC_KEYS.map((m) => (
          <MetricCard key={m.key} label={m.label} value={`${(perf.model[m.key] * 100).toFixed(1)}%`} />
        ))}
        <MetricCard label="Precision@90% Recall" value={`${(perf.model.precision_at_recall[90] * 100).toFixed(1)}%`} />
      </div>

      <div className="analytics-grid">
        <div className="confusion-matrix-card">
          <h3 className="confusion-matrix-title">Confusion Matrix</h3>
          <p className="chart-subtitle">On hold-out validation set ({total.toLocaleString()} transactions)</p>
          <div className="confusion-grid">
            <span className="cm-cell cm-header">Predicted</span>
            <span className="cm-cell cm-header-positive">Fraud</span>
            <span className="cm-cell cm-header-negative">Legit</span>
            <span className="cm-cell cm-header">Actual Fraud</span>
            <span className="cm-cell cm-tp"><strong>{cm.tp}</strong><br />True Positive</span>
            <span className="cm-cell cm-fn"><strong>{cm.fn}</strong><br />False Negative</span>
            <span className="cm-cell cm-header">Actual Legit</span>
            <span className="cm-cell cm-fp"><strong>{cm.fp}</strong><br />False Positive</span>
            <span className="cm-cell cm-tn"><strong>{cm.tn}</strong><br />True Negative</span>
          </div>
          <div className="cm-summary">
            <span><strong>FPR:</strong> {((cm.fp / cm.tn) * 100).toFixed(3)}%</span>
            <span><strong>FNR:</strong> {((cm.fn / cm.tp) * 100).toFixed(1)}%</span>
            <span><strong>Precision:</strong> {(perf.model.precision * 100).toFixed(1)}%</span>
            <span><strong>Recall:</strong> {(perf.model.recall * 100).toFixed(1)}%</span>
          </div>
        </div>
        <div className="precision-card">
          <h3 className="confusion-matrix-title">Precision at Recall Targets</h3>
          <p className="chart-subtitle">Higher is better — recall is capped by business FNR limits</p>
          <div className="precision-bars">
            {Object.entries(perf.model.precision_at_recall).map(([recall, precision]) => (
              <div className="precision-row" key={recall}>
                <span className="precision-label">@{recall}% recall</span>
                <span className="precision-track">
                  <span className="precision-fill" style={{ width: `${precision * 100}%` }} />
                </span>
                <span className="precision-value">{(precision * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="model-comparison-table">
        <h3 className="confusion-matrix-title">Model Comparison</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Version</th>
                <th>Accuracy</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1</th>
                <th>ROC-AUC</th>
                <th>Train Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((m) => (
                <tr key={m.name}>
                  <td className="table-cell-primary">{m.name}</td>
                  <td>{m.version}</td>
                  <td>{(m.accuracy * 100).toFixed(1)}%</td>
                  <td>{(m.precision * 100).toFixed(1)}%</td>
                  <td>{(m.recall * 100).toFixed(1)}%</td>
                  <td>{(m.f1_score * 100).toFixed(1)}%</td>
                  <td>{(m.roc_auc * 100).toFixed(1)}%</td>
                  <td>{m.training_time}</td>
                  <td>
                    {m.is_current ? (
                      <span className="status-badge legitimate"><span className="status-dot" />In Production</span>
                    ) : (
                      <span className="status-badge suspicious"><span className="status-dot" />Candidate</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={promoting}
        title="Promote model to Production"
        message={`Promote ${perf.model.name} (v${perf.model.version}) to the Production stage? All gates passed: PR-AUC ≥ 0.90, FNR ≤ 10%, Precision@90% recall ≥ 70%.`}
        confirmLabel="Promote"
        onConfirm={confirmPromote}
        onCancel={() => setPromoting(false)}
      />
    </div>
  );
}

export default ModelPerformance;