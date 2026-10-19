import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ThemeContext';
import { getTransactions, blockTransaction, approveTransaction } from '../services/api';
import { MERCHANT_CATEGORIES } from '../utils/constants';

import FilterBar, { FilterGroup } from '../components/FilterBar';
import TransactionTable from '../components/TransactionTable';
import TransactionModal from '../components/TransactionModal';
import PaginationBar from '../components/PaginationBar';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import ErrorState from '../components/ui/ErrorState';

const PAGE_SIZE = 15;
const DEFAULT_FILTERS = { search: '', status: '', risk_level: '', merchant_category: '', min_amount: '', max_amount: '', date_from: '', date_to: '' };

function Transactions() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const [blocking, setBlocking] = useState(null);
  const [approving, setApproving] = useState(null);

  const load = async () => {
    const params = { limit: PAGE_SIZE, page };
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    return getTransactions(params);
  };

  const { data, loading, error, execute } = useApi(load, [
    page,
    filters.search,
    filters.status,
    filters.risk_level,
    filters.merchant_category,
    filters.min_amount,
    filters.max_amount,
    filters.date_from,
    filters.date_to,
  ]);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setPage(1);
  };

  const confirmBlock = async () => {
    if (!blocking) return;
    await blockTransaction(blocking.transaction_id, 'Blocked by analyst');
    showToast(`Transaction ${blocking.transaction_id} blocked and card frozen.`, 'success');
    setBlocking(null);
    setViewing(null);
    execute();
  };

  const confirmApprove = async () => {
    if (!approving) return;
    await approveTransaction(approving.transaction_id);
    showToast(`Transaction ${approving.transaction_id} approved as legitimate.`, 'success');
    setApproving(null);
    setViewing(null);
    execute();
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="dashboard-title">Transactions</h1>
          <p className="dashboard-subtitle">Search and review all card transactions</p>
        </div>
      </div>

      <FilterBar onClear={clearFilters}>
        <FilterGroup label="Search">
          <input
            type="search"
            className="form-input filter-search"
            placeholder="ID, customer, merchant, location..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            aria-label="Search transactions"
          />
        </FilterGroup>
        <FilterGroup label="Status">
          <select className="form-select" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="legitimate">Legitimate</option>
            <option value="suspicious">Suspicious</option>
            <option value="fraudulent">Fraudulent</option>
            <option value="blocked">Blocked</option>
          </select>
        </FilterGroup>
        <FilterGroup label="Risk Level">
          <select className="form-select" value={filters.risk_level} onChange={(e) => setFilter('risk_level', e.target.value)} aria-label="Filter by risk level">
            <option value="">All risk levels</option>
            <option value="high">High (71-100)</option>
            <option value="medium">Medium (31-70)</option>
            <option value="low">Low (0-30)</option>
          </select>
        </FilterGroup>
        <FilterGroup label="Category">
          <select className="form-select" value={filters.merchant_category} onChange={(e) => setFilter('merchant_category', e.target.value)} aria-label="Filter by merchant category">
            <option value="">All categories</option>
            {Object.values(MERCHANT_CATEGORIES).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FilterGroup>
        <FilterGroup label="Min Amount">
          <input type="number" min="0" step="0.01" className="form-input" value={filters.min_amount} onChange={(e) => setFilter('min_amount', e.target.value)} placeholder="$0" aria-label="Minimum amount" />
        </FilterGroup>
        <FilterGroup label="Max Amount">
          <input type="number" min="0" step="0.01" className="form-input" value={filters.max_amount} onChange={(e) => setFilter('max_amount', e.target.value)} placeholder="$10,000" aria-label="Maximum amount" />
        </FilterGroup>
        <FilterGroup label="From">
          <input type="date" className="form-input" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} aria-label="Start date" />
        </FilterGroup>
        <FilterGroup label="To">
          <input type="date" className="form-input" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} aria-label="End date" />
        </FilterGroup>
      </FilterBar>
      {error && <ErrorState message={error.message} onRetry={execute} />}

      {loading && <SkeletonLoader rows={8} variant="table" />}

      {!loading && data && (
        <>
          <TransactionTable
            transactions={data.data}
            onView={(txn) => setViewing(txn)}
            onBlock={(txn) => setBlocking(txn)}
            onApprove={(txn) => setApproving(txn)}
          />
          <PaginationBar page={data.page} totalPages={data.total_pages} total={data.total} onPageChange={setPage} />
        </>
      )}

      {!loading && data && data.total === 0 && (
        <div className="filter-summary">
          No transactions match the current filters.
          <button className="btn-clear" onClick={clearFilters}>Clear filters</button>
        </div>
      )}

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
        message={blocking ? `Block ${blocking.transaction_id}? The card will be frozen and a fraud alert raised.` : ''}
        confirmLabel="Block"
        danger
        onConfirm={confirmBlock}
        onCancel={() => setBlocking(null)}
      />

      <ConfirmDialog
        open={Boolean(approving)}
        title="Mark as legitimate"
        message={approving ? `Mark ${approving.transaction_id} as legitimate?` : ''}
        confirmLabel="Approve"
        onConfirm={confirmApprove}
        onCancel={() => setApproving(null)}
      />
    </div>
  );
}

export default Transactions;