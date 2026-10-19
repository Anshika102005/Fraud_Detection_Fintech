import { FiEye, FiLock, FiCheckCircle, FiSearch } from 'react-icons/fi';
import StatusBadge from './ui/StatusBadge';
import RiskScore from './ui/RiskScore';
import SkeletonLoader from './ui/SkeletonLoader';
import EmptyState from './ui/EmptyState';
import { formatDateTime, formatCurrency, shortenId } from '../utils/helpers';

/**
 * Professional transaction table with risk scores, status badges
 * and row actions (View / Investigate / Block / Mark legitimate).
 */
function TransactionTable({ transactions, loading = false, onView, onBlock, onApprove, onInvestigate, compact = false }) {
  if (loading) {
    return <SkeletonLoader rows={6} variant="table" />;
  }

  if (!transactions || transactions.length === 0) {
    return <EmptyState title="No transactions found" description="Try adjusting your filters or search query." />;
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Date & Time</th>
            <th>Customer</th>
            <th>Merchant</th>
            <th>Amount</th>
            <th>Location</th>
            <th>Device</th>
            <th>Risk Score</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <tr key={txn.transaction_id}>
              <td className="table-id" title={txn.transaction_id}>
                {shortenId(txn.transaction_id, 12)}
              </td>
              <td>{formatDateTime(txn.txn_ts)}</td>
              <td>
                <div className="table-cell-primary">{txn.customer_name}</div>
                <div className="table-cell-secondary">{txn.customer_id}</div>
              </td>
              <td>
                <div className="table-cell-primary">{txn.merchant_name}</div>
                <div className="table-cell-secondary">{txn.merchant_category}</div>
              </td>
              <td className="table-amount">{formatCurrency(txn.amount, txn.currency)}</td>
              <td>{`${txn.city}, ${txn.country}`}</td>
              <td title={txn.device_type}>{txn.device_type}</td>
              <td>
                <RiskScore score={txn.risk_score} />
              </td>
              <td>
                <StatusBadge status={txn.status} />
              </td>
              <td>
                <div className="action-btn-group" role="group" aria-label={`Actions for ${txn.transaction_id}`}>
                  <button className="action-btn view" title="View details" onClick={() => onView(txn)}>
                    <FiEye />
                  </button>
                  {onApprove && txn.status === 'suspicious' && (
                    <button className="action-btn approve" title="Mark as legitimate" onClick={() => onApprove(txn)}>
                      <FiCheckCircle />
                    </button>
                  )}
                  {!compact && onInvestigate && txn.risk_score >= 50 && (
                    <button className="action-btn investigate" title="Investigate" onClick={() => onInvestigate(txn)}>
                      <FiSearch />
                    </button>
                  )}
                  {onBlock && txn.status !== 'blocked' && (
                    <button className="action-btn block" title="Block transaction" onClick={() => onBlock(txn)}>
                      <FiLock />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TransactionTable;