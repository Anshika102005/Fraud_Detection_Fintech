import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ThemeContext';
import { getUsersMock } from '../data/users';

import RiskScore from '../components/ui/RiskScore';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { getInitials, formatNumber } from '../utils/helpers';
import { FiLock, FiKey } from 'react-icons/fi';

function Users() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [blocking, setBlocking] = useState(null);

  const { data, loading, error, execute } = useApi(async () => {
    const result = await getUsersMock();
    if (search) {
      const q = search.toLowerCase();
      result.data = result.data.filter((a) => a.name.toLowerCase().includes(q) || a.customer_id.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
    }
    return result;
  }, [search]);

  const confirmBlock = () => {
    if (!blocking) return;
    showToast(`${blocking.name} has been placed on the watchlist.`, 'success');
    setBlocking(null);
    execute();
  };

  if (error) return <ErrorState message={error.message} onRetry={execute} />;
  if (loading || !data) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="dashboard-title">Users / Accounts</h1>
          <p className="dashboard-subtitle">Customer accounts and risk profiles</p>
        </div>
        <SkeletonLoader rows={5} variant="table" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="dashboard-title">Users / Accounts</h1>
          <p className="dashboard-subtitle">Customer accounts and risk profiles</p>
        </div>
        <div className="page-header-badge">
          {data.summary.active} active · {data.summary.flagged} flagged · avg risk {data.summary.avg_risk}
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">Search</label>
          <input
            type="search"
            className="form-input filter-search"
            placeholder="Name, customer ID or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search accounts"
          />
        </div>
      </div>

      {data.data.length ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Tier</th>
                <th>Transactions</th>
                <th>Avg Amount</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th>Flags</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((account) => (
                <tr key={account.customer_id}>
                  <td>
                    <div className="user-cell">
                      <span className="user-avatar">{getInitials(account.name)}</span>
                      <div>
                        <div className="table-cell-primary">{account.name}</div>
                        <div className="table-cell-secondary">{account.customer_id}</div>
                      </div>
                    </div>
                  </td>
                  <td>{account.email}</td>
                  <td>{account.tier}</td>
                  <td>{formatNumber(account.total_txns)}</td>
                  <td>${account.avg_amount.toFixed(2)}</td>
                  <td>
                    <RiskScore score={account.risk_score} />
                  </td>
                  <td>
                    {account.status === 'active' ? (
                      <span className="status-badge legitimate"><span className="status-dot" />Active</span>
                    ) : account.status === 'flagged' ? (
                      <span className="status-badge fraudulent"><span className="status-dot" />Flagged</span>
                    ) : (
                      <span className="status-badge suspicious"><span className="status-dot" />Review</span>
                    )}
                  </td>
                  <td>
                    {account.flags.length ? (
                      account.flags.map((flag) => <span className="fraud-alert-rule" key={flag}>{flag}</span>)
                    ) : (
                      <span className="table-cell-secondary">—</span>
                    )}
                  </td>
                  <td>
                    <div className="action-btn-group">
                      <button className="action-btn approve" title="Add to allowlist" onClick={() => showToast(`${account.name} added to allowlist.`, 'success')}>
                        <FiKey />
                      </button>
                      <button className="action-btn block" title="Add to watchlist" onClick={() => setBlocking(account)}>
                        <FiLock />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No accounts found" description="Try a different search term." />
      )}

      <ConfirmDialog
        open={Boolean(blocking)}
        title="Add to watchlist"
        message={blocking ? `Add ${blocking.name} to the fraud watchlist? Their transactions will be routed for manual review.` : ''}
        confirmLabel="Watchlist"
        danger
        onConfirm={confirmBlock}
        onCancel={() => setBlocking(null)}
      />
    </div>
  );
}

export default Users;