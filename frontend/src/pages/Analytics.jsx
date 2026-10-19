import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import {
  getAnalytics,
  getAmountDistribution,
  getFraudByLocation,
  getFraudByMerchantCategory,
  getFraudByDevice,
  getFraudByHour,
  getModelPerformance,
} from '../services/api';
import { cssVar } from '../utils/helpers';

import ChartCard from '../components/ui/ChartCard';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import ErrorState from '../components/ui/ErrorState';
import { MultiLineChart, VerticalBarChart, HorizontalBarChart } from '../components/charts';

const RANGES = [
  { value: 7, label: '7 Days' },
  { value: 30, label: '30 Days' },
  { value: 90, label: '90 Days' },
];

function Analytics() {
  const [days, setDays] = useState(30);

  const load = async () => {
    const [analytics, amountDist, locations, categories, devices, hours, modelPerf] = await Promise.all([
      getAnalytics({ days }),
      getAmountDistribution(),
      getFraudByLocation(),
      getFraudByMerchantCategory(),
      getFraudByDevice(),
      getFraudByHour(),
      getModelPerformance(),
    ]);
    return { analytics, amountDist, locations, categories, devices, hours, modelPerf };
  };

  const { data, loading, error, execute } = useApi(load, [days]);

  if (error) return <ErrorState message={error.message} onRetry={execute} />;
  if (loading || !data) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="dashboard-title">Analytics</h1>
          <p className="dashboard-subtitle">Fraud patterns, trends and detection performance</p>
        </div>
        <SkeletonLoader rows={6} variant="cards" />
      </div>
    );
  }

  const { analytics, amountDist, locations, categories, devices, hours, modelPerf } = data;

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="dashboard-title">Analytics</h1>
          <p className="dashboard-subtitle">Fraud patterns, trends and detection performance</p>
        </div>
        <div className="segment-group" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r.value} type="button" className={`segment-btn ${days === r.value ? 'active' : ''}`} onClick={() => setDays(r.value)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ChartCard title="Fraud Rate Over Time" subtitle={`Fraud rate (%) over the last ${days} days`}>
        <div className="chart-wrapper">
          <MultiLineChart data={analytics.fraudRateOverTime} series={[{ key: 'fraud_rate', color: cssVar('--risk-high') }]} />
        </div>
      </ChartCard>

      <div className="analytics-grid">
        <ChartCard title="Fraud by Transaction Amount" subtitle="Fraud rate by amount bucket">
          <div className="chart-wrapper">
            <VerticalBarChart data={amountDist.map((a) => ({ label: a.range, value: a.fraud_rate }))} xKey="label" series={[{ key: 'value', color: cssVar('--risk-high') }]} />
          </div>
        </ChartCard>

        <ChartCard title="Fraud by Device" subtitle="Fraud rate by device type">
          <div className="chart-wrapper">
            <HorizontalBarChart data={devices.map((d) => ({ label: d.device, value: d.fraud_rate }))} xKey="label" valueKey="value" color={cssVar('--risk-medium')} />
          </div>
        </ChartCard>
      </div>
      <div className="analytics-grid">
        <ChartCard title="Fraud by Merchant" subtitle="Fraud rate by merchant category">
          <div className="chart-wrapper">
            <HorizontalBarChart data={categories.map((c) => ({ label: c.category, value: c.fraud_rate }))} xKey="label" valueKey="value" color={cssVar('--risk-high')} />
          </div>
        </ChartCard>

        <ChartCard title="Fraud by Location" subtitle="Fraud rate by country">
          <div className="chart-wrapper">
            <VerticalBarChart data={locations.map((l) => ({ label: l.country, value: l.fraud_rate }))} xKey="label" series={[{ key: 'value', color: cssVar('--risk-medium') }]} />
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Fraud by Hour of Day" subtitle="Volume of fraudulent vs legitimate transactions by hour">
        <div className="chart-wrapper">
          <VerticalBarChart
            data={hours}
            xKey="hour"
            series={[
              { key: 'legitimate', color: cssVar('--risk-low') },
              { key: 'fraud', color: cssVar('--risk-high') },
            ]}
          />
        </div>
      </ChartCard>

      <div className="analytics-grid">
        <ChartCard title="Detection Accuracy" subtitle="Current model performance snapshot">
          <div className="accuracy-card">
            <div className="accuracy-value">{Math.round(modelPerf.model.accuracy * 100)}%</div>
            <div className="accuracy-label">Accuracy — {modelPerf.model.name}</div>
            <div className="accuracy-bars">
              <div className="accuracy-bar-row"><span>ROC-AUC</span><span className="accuracy-bar-track"><span className="accuracy-bar-fill" style={{ width: `${modelPerf.model.roc_auc * 100}%` }} /></span><span>{(modelPerf.model.roc_auc * 100).toFixed(1)}%</span></div>
              <div className="accuracy-bar-row"><span>Precision</span><span className="accuracy-bar-track"><span className="accuracy-bar-fill" style={{ width: `${modelPerf.model.precision * 100}%` }} /></span><span>{(modelPerf.model.precision * 100).toFixed(1)}%</span></div>
              <div className="accuracy-bar-row"><span>Recall</span><span className="accuracy-bar-track"><span className="accuracy-bar-fill" style={{ width: `${modelPerf.model.recall * 100}%` }} /></span><span>{(modelPerf.model.recall * 100).toFixed(1)}%</span></div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Fraud Volume" subtitle="Rolling 7-day transaction volume">
          <div className="chart-wrapper">
            <VerticalBarChart
              data={analytics.transactionVolume.slice(-7).map((d) => ({ label: d.label, fraudulent: d.fraudulent, total: d.total }))}
              xKey="label"
              series={[
                { key: 'total', color: cssVar('--color-info') },
                { key: 'fraudulent', color: cssVar('--risk-high') },
              ]}
            />
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

export default Analytics;