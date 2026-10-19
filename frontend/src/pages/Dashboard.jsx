import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ThemeContext';
import {
  getDashboardStats,
  getAnalytics,
  getFraudDistribution,
  getFraudByMerchantCategory,
  getFraudByLocation,
  getRiskAnalysis,
  getTransactions,
  blockTransaction,
  approveTransaction,
} from '../services/api';
import { cssVar, formatDateTime, formatCurrency } from '../utils/helpers';
import { FiArrowRight, FiShield, FiActivity } from 'react-icons/fi';

import KPICard from '../components/KPICard';
import ChartCard from '../components/ui/ChartCard';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import ErrorState from '../components/ui/ErrorState';
import RiskMeter from '../components/ui/RiskMeter';
import RiskScore from '../components/ui/RiskScore';
import TransactionTable from '../components/TransactionTable';
import TransactionModal from '../components/TransactionModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { AreaSeriesChart, SimpleDonutChart, HorizontalBarChart } from '../components/charts';

const TIME_RANGES = [
  { value: 1, label: '24 Hours' },
  { value: 7, label: '7 Days' },
  { value: 30, label: '30 Days' },
  { value: 90, label: '90 Days' },
];

function FraudLocationList({ locations }) {
  return (
    <div className="location-list">
      {locations.map((loc) => (
        <div className="location-row" key={loc.country}>
          <div className="location-meta">
            <span className="location-name">{loc.country}</span>
            <span className="location-count">{loc.fraud} fraud / {loc.total} txns</span>
          </div>
          <div className="location-rate-bar">
            <span className="location-rate-fill" style={{ width: `${Math.min(100, loc.fraud_rate * 4)}%`, backgroundColor: loc.fraud_rate > 3 ? 'var(--risk-high)' : 'var(--risk-medium)' }} />
          </div>
          <span className="location-rate">{loc.fraud_rate}%</span>
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  const { showToast } = useToast();
  const [range, setRange] = useState(7);
  const [viewing, setViewing] = useState(null);
  const [blocking, setBlocking] = useState(null);
  const [approving, setApproving] = useState(null);

  const loadAll = async () => {
    const [stats, analytics, distribution, categories, locations, risk, recent] = await Promise.all([
      getDashboardStats(),
      getAnalytics({ days: range }),
      getFraudDistribution(),
      getFraudByMerchantCategory(),
      getFraudByLocation(),
      getRiskAnalysis(),
      getTransactions({ limit: 8 }),
    ]);
    return { stats, analytics, distribution, categories, locations, risk, recent: recent.data };
  };

  const { data, loading, error, execute } = useApi(loadAll, [range]);

  const volumeSeries = [
    { key: 'legitimate', color: cssVar('--risk-low') },
    { key: 'suspicious', color: cssVar('--risk-medium') },
    { key: 'fraudulent', color: cssVar('--risk-high') },
  ];

  const confirmBlock = async () => {
    if (!blocking) return;
    await blockTransaction(blocking.transaction_id, 'Blocked by analyst from dashboard');
    showToast(`Transaction ${blocking.transaction_id} blocked.`, 'success');
    setBlocking(null);
    setViewing(null);
    execute();
  };

  const confirmApprove = async () => {
    if (!approving) return;
    await approveTransaction(approving.transaction_id);
    showToast(`Transaction ${approving.transaction_id} marked as legitimate.`, 'success');
    setApproving(null);
    setViewing(null);
    execute();
  };

  if (error) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Real-time fraud monitoring overview</p>
        </div>
        <ErrorState message={error.message} onRetry={execute} />
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Real-time fraud monitoring overview</p>
        </div>
        <SkeletonLoader rows={4} variant="cards" />
      </div>
    );
  }

  const { stats, analytics, distribution, categories, locations, risk, recent } = data;
  const exampleTxn = risk.highRiskTransactions.length ? risk.highRiskTransactions[0] : null;

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Real-time fraud monitoring overview</p>
        </div>
        <div className="page-header-actions">
          <Link to="/check" className="btn-clear">
            <FiShield /> Check Transaction
          </Link>
          <Link to="/alerts" className="btn-primary">
            View Alerts <FiArrowRight />
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        {stats.kpis.map((kpi) => (
          <KPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="analytics-grid">
        <ChartCard
          title="Transaction Volume"
          subtitle="Total, legitimate, suspicious and fraudulent transactions"
          actions={TIME_RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`chart-filter-btn ${range === r.value ? 'active' : ''}`}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        >
          <div className="chart-wrapper">
            <AreaSeriesChart data={analytics.transactionVolume} series={volumeSeries} />
          </div>
        </ChartCard>

        <ChartCard title="Fraud Distribution" subtitle="Share by classification">
          <div className="chart-wrapper">
            <SimpleDonutChart data={distribution.data} />
          </div>
          <div className="donut-stats">
            {distribution.data.map((d) => (
              <div className="donut-stat" key={d.name}>
                <span className="donut-stat-dot" style={{ backgroundColor: d.color }} />
                <div>
                  <div className="donut-stat-value">{distribution.percentages[d.name.toLowerCase()]}%</div>
                  <div className="donut-stat-label">{d.name}</div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
      <div className="analytics-grid">
        <ChartCard title="Fraud by Merchant Category" subtitle="Fraud rate per category">
          <div className="chart-wrapper">
            <HorizontalBarChart
              data={categories.map((c) => ({ label: c.category, value: c.fraud_rate }))}
              xKey="label"
              valueKey="value"
              color={cssVar('--risk-high')}
            />
          </div>
        </ChartCard>

        <ChartCard title="Fraud by Location" subtitle="Top locations by fraud rate">
          {locations.length ? <FraudLocationList locations={locations.slice(0, 6)} /> : <p>No location data.</p>}
        </ChartCard>
      </div>

      <div className="analytics-grid">
        <div className="risk-analysis-card">
          <div className="risk-analysis-header">
            <h3>Risk Analysis</h3>
            <p className="chart-subtitle">Distribution of transactions across risk bands</p>
          </div>
          {exampleTxn && <RiskMeter score={exampleTxn.risk_score} />}
          <div className="risk-distribution-list">
            {risk.riskDistribution.data.map((band) => (
              <div className="risk-band" key={band.name}>
                <span className="risk-dot" style={{ backgroundColor: band.color }} />
                <span className="risk-band-name">{band.name}</span>
                <span className="risk-band-value">{band.value} txns</span>
              </div>
            ))}
          </div>
          <div className="risk-factors-preview">
            {exampleTxn ? (
              <>
                <div className="risk-factor-header">
                  <span>Latest high-risk transaction</span>
                  <RiskScore score={exampleTxn.risk_score} />
                </div>
                <ul className="risk-reason-list">
                  <li>Unusual transaction amount</li>
                  <li>New device detected</li>
                  <li>Unusual location · {exampleTxn.city}</li>
                  <li>Multiple transactions within a short period</li>
                  <li>Transaction differs from historical behavior</li>
                </ul>
              </>
            ) : (
              <p className="chart-subtitle">No high-risk transactions in this window.</p>
            )}
          </div>
        </div>

        <div className="risk-analysis-card">
          <div className="risk-analysis-header">
            <h3>Recent Alerts</h3>
            <Link to="/alerts" className="chart-link">View all</Link>
          </div>
          {stats.recentAlerts.length ? (
            <div className="alerts-list">
              {stats.recentAlerts.slice(0, 6).map((alert) => (
                <div className={`alert-item ${alert.priority}`} key={alert.id}>
                  <span className="alert-item-header">
                    <span className="alert-item-title">
                      <FiActivity />
                      {alert.transaction_id}
                    </span>
                    <span className="alert-item-desc">
                      {alert.customer_name} · {alert.merchant} · {formatCurrency(alert.amount)}
                    </span>
                  </span>
                  <RiskScore score={alert.risk_score} />
                  <span className="alert-item-time">{formatDateTime(alert.time_detected, { date: false, time: true })}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="chart-subtitle">No recent alerts.</p>
          )}
        </div>
      </div>

      <div className="recent-transactions">
        <div className="recent-transactions-header">
          <h3>Recent Transactions</h3>
          <Link to="/transactions" className="chart-link">View all</Link>
        </div>
        <TransactionTable
          transactions={recent}
          compact
          onView={(txn) => setViewing(txn)}
          onBlock={(txn) => setBlocking(txn)}
          onApprove={(txn) => setApproving(txn)}
        />
      </div>

      {viewing && (
        <TransactionModal
          transaction={viewing}
          open={Boolean(viewing)}
          onClose={() => setViewing(null)}
          onBlock={() => {
            setBlocking(viewing);
            setViewing(null);
          }}
          onApprove={() => {
            setApproving(viewing);
            setViewing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(blocking)}
        title="Block transaction"
        message={blocking ? `Are you sure you want to block ${blocking.transaction_id} for ${blocking.customer_name}? This prevents further use of the card.` : ''}
        confirmLabel="Block"
        danger
        onConfirm={confirmBlock}
        onCancel={() => setBlocking(null)}
      />

      <ConfirmDialog
        open={Boolean(approving)}
        title="Mark as legitimate"
        message={approving ? `Approve ${approving.transaction_id} and mark it as a legitimate transaction?` : ''}
        confirmLabel="Approve"
        onConfirm={confirmApprove}
        onCancel={() => setApproving(null)}
      />
    </div>
  );
}

export default Dashboard;