import Modal from './ui/Modal';
import StatusBadge from './ui/StatusBadge';
import { formatCurrency, formatDateTime } from '../utils/helpers';

function BehaviorCompare({ label, current, historical, unit = '' }) {
  return (
    <div className="behavior-compare">
      <div className="behavior-compare-label">{label}</div>
      <div className="behavior-compare-value">
        <span className="behavior-current">{current}</span>
        <span className="behavior-vs">vs</span>
        <span className="behavior-historical">{historical}</span>
      </div>
      <span className="behavior-unit">{unit}</span>
    </div>
  );
}

function TransactionModal({ transaction, open, onClose, onBlock, onApprove }) {
  if (!transaction) return null;
  const t = transaction;

  return (
    <Modal open={open} title={`Transaction ${t.transaction_id}`} onClose={onClose} size="lg"
      footer={
        <>
          {onApprove && (
            <button className="btn-approve" onClick={() => onApprove(t)}>Mark as Legitimate</button>
          )}
          {onBlock && (
            <button className="btn-danger" onClick={() => onBlock(t)}>Block Transaction</button>
          )}
          <button className="btn-primary" onClick={onClose}>Close</button>
        </>
      }
    >
      <div className="modal-grid">
        <div className="modal-section">
          <h3 className="modal-section-title">Transaction Information</h3>
          <div className="modal-field">
            <span className="modal-field-label">Transaction ID</span>
            <span className="modal-field-value">{t.transaction_id}</span>
          </div>
          <div className="modal-field">
            <span className="modal-field-label">Amount</span>
            <span className="modal-field-value">{formatCurrency(t.amount, t.currency)}</span>
          </div>
          <div className="modal-field">
            <span className="modal-field-label">Date & Time</span>
            <span className="modal-field-value">{formatDateTime(t.txn_ts)}</span>
          </div>
          <div className="modal-field">
            <span className="modal-field-label">Merchant</span>
            <span className="modal-field-value">{t.merchant_name} · {t.merchant_category}</span>
          </div>
          <div className="modal-field">
            <span className="modal-field-label">Status</span>
            <StatusBadge status={t.status} />
          </div>
        </div>

        <div className="modal-section">
          <h3 className="modal-section-title">Customer Information</h3>
          <div className="modal-field">
            <span className="modal-field-label">Customer</span>
            <span className="modal-field-value">{t.customer_name} ({t.customer_id})</span>
          </div>
          <div className="modal-field">
            <span className="modal-field-label">Account age</span>
            <span className="modal-field-value">{t.account_age_days} days</span>
          </div>
          <div className="modal-field">
            <span className="modal-field-label">Previous transactions</span>
            <span className="modal-field-value">{t.prev_txn_count}</span>
          </div>
          <div className="modal-field">
            <span className="modal-field-label">Average transaction amount</span>
            <span className="modal-field-value">{formatCurrency(t.avg_amount)}</span>
          </div>
        </div>

        <div className="modal-section">
          <h3 className="modal-section-title">Device Information</h3>
          <div className="modal-field">
            <span className="modal-field-label">Device</span>
            <span className="modal-field-value">{t.device_type} · {t.device_id}</span>
          </div>
          <div className="modal-field">
            <span className="modal-field-label">IP Address</span>
            <span className="modal-field-value">{t.ip_address}</span>
          </div>
          <div className="modal-field">
            <span className="modal-field-label">Browser / OS</span>
            <span className="modal-field-value">{t.browser} / {t.os}</span>
          </div>
          <div className="modal-field">
            <span className="modal-field-label">Device trust</span>
            <span className="modal-field-value">{t.is_new_device ? 'New device — untrusted' : 'Recognized device'}</span>
          </div>
        </div>

        <div className="modal-section">
          <h3 className="modal-section-title">Location Information</h3>
          <div className="modal-field">
            <span className="modal-field-label">Transaction location</span>
            <span className="modal-field-value">{t.city}, {t.country}</span>
          </div>
          <div className="modal-field">
            <span className="modal-field-label">Previous location</span>
            <span className="modal-field-value">{t.prev_city}, {t.prev_country}</span>
          </div>
          <div className="modal-field">
            <span className="modal-field-label">Distance from previous txn</span>
            <span className="modal-field-value">{t.distance_from_prev_km} km</span>
          </div>
        </div>

        <div className="modal-section modal-full-row">
          <h3 className="modal-section-title">Behavioral Analysis</h3>
          <BehaviorCompare label="Average Amount" current={formatCurrency(t.amount)} historical={formatCurrency(t.avg_amount)} />
          <BehaviorCompare label="Avg Location Distance" current={`${t.distance_from_prev_km} km`} historical={`${t.avg_distance_km} km`} />
          <BehaviorCompare label="Transactions in last 10 minutes" current={String(t.txns_last_10m || 0)} historical="typical ≤ 2" />
        </div>
      </div>
    </Modal>
  );
}

export default TransactionModal;