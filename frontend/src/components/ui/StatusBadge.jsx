import { getStatusBadgeClass, getStatusLabel } from '../../utils/helpers';

/**
 * Colored status badge for transaction/alert statuses.
 */
function StatusBadge({ status, label }) {
  return (
    <span className={getStatusBadgeClass(status)}>
      <span className="status-dot" />
      {label || getStatusLabel(status)}
    </span>
  );
}

export default StatusBadge;