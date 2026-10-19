import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ThemeContext';
import { getFraudAlerts } from '../services/api';

import FilterBar, { FilterGroup } from '../components/FilterBar';
import FraudAlertCard from '../components/FraudAlertCard';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';

function FraudAlerts() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    const params = { limit: 50 };
    if (priority) params.priority = priority;
    if (status) params.status = status;
    if (search) params.search = search;
    const result = await getFraudAlerts(params);
    return result;
  };

  const { data, loading, error, execute } = useApi(load, [priority, status, search]);

  const clearFilters = () => {
    setPriority('');
    setStatus('');
    setSearch('');
  };

  const investigate = (alert) => {
    showToast(`Opening investigation for ${alert.transaction_id}...`, 'info');
    navigate(`/risk-analysis?txn=${alert.transaction_id}`);
  };

  const resolve = (alert) => {
    showToast(`Alert ${alert.id} marked as resolved.`, 'success');
    execute();
  };

  const dismiss = (alert) => {
    showToast(`Alert ${alert.id} dismissed.`, 'info');
    execute();
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="dashboard-title">Fraud Alerts</h1>
          <p className="dashboard-subtitle">Priority-ranked alerts requiring analyst review</p>
        </div>
        <span className="page-header-badge">{data ? data.total : 0} active alerts</span>
      </div>

      <FilterBar onClear={clearFilters}>
        <FilterGroup label="Priority">
          <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
            <option value="">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </FilterGroup>
        <FilterGroup label="Status">
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </FilterGroup>
        <FilterGroup label="Risk Score">
          <select className="form-select" value={''} onChange={(e) => e.target.value === 'high' && setPriority('')} aria-label="Filter by risk band" disabled>
            <option value="">Min score 71+</option>
          </select>
        </FilterGroup>
        <FilterGroup label="Search">
          <input
            type="search"
            className="form-input filter-search"
            placeholder="Alert ID, transaction ID, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search alerts"
          />
        </FilterGroup>
      </FilterBar>

      {error && <ErrorState message={error.message} onRetry={execute} />}
      {loading && <div className="alerts-grid"><SkeletonLoader rows={6} variant="cards" /></div>}

      {!loading && data && (
        <>
          {data.data.length ? (
            <div className="alerts-grid">
              {data.data.map((alert) => (
                <FraudAlertCard key={alert.id} alert={alert} onInvestigate={investigate} onResolve={resolve} onDismiss={dismiss} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No alerts match your filters"
              description="Try a different priority, status or search term."
              action={<button className="btn-clear" onClick={clearFilters}>Clear Filters</button>}
            />
          )}
        </>
      )}
    </div>
  );
}

export default FraudAlerts;