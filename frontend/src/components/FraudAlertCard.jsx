import RiskScore from './ui/RiskScore';
import { formatDateTime, formatCurrency, getPriorityLabel, getAlertStatusLabel, getAlertStatusClass } from '../utils/helpers';
import { FiEye, FiCheckCircle, FiXCircle } from 'react-icons/fi';

/**
 * Fraud alert card used in the Fraud Alerts page.
 */
function FraudAlertCard({ alert, onInvestigate, onResolve, onDismiss }) {
  const priority = alert.priority || 'low';

  return (
    <article className={`fraud-alert-card ${priority}`}>
      <div className="fraud-alert-header">
        <span className={`fraud-alert-priority ${priority}`}>{getPriorityLabel(priority)}</span>
        <span className={getAlertStatusClass(alert.status)}>
          <span className="status-dot" />
          {getAlertStatusLabel(alert.status)}
        </span>
      </div>

      <div className="fraud-alert-body">
        <div className="fraud-alert-ids">
          <div className="fraud-alert-id">
            <span>{alert.id}</span>
            <span className="fraud-alert-txn">{alert.transaction_id}</span>
          </div>
          <div className="fraud-alert-meta">
            <span>{alert.customer_name}</span> · <span>{alert.merchant}</span>
          </div>
        </div>

        <div className="fraud-alert-stats">
          <div className="fraud-alert-stat">
            <span className="fraud-alert-stat-label">Amount</span>
            <span className="fraud-alert-stat-value">{formatCurrency(alert.amount)}</span>
          </div>
          <div className="fraud-alert-stat">
            <span className="fraud-alert-stat-label">Fraud Probability</span>
            <span className="fraud-alert-stat-value">{alert.fraud_probability}%</span>
          </div>
          <div className="fraud-alert-stat">
            <span className="fraud-alert-stat-label">Risk Score</span>
            <RiskScore score={alert.risk_score} />
          </div>
        </div>

        <div className="fraud-alert-rules">
          {alert.triggered_rules.map((rule) => (
            <span className="fraud-alert-rule" key={rule}>
              {rule}
            </span>
          ))}
        </div>

        <div className="fraud-alert-time">Detected {formatDateTime(alert.time_detected)}</div>
      </div>

      <div className="fraud-alert-actions">
        <button className="btn btn-primary" onClick={() => onInvestigate(alert)}>
          <FiEye /> Investigate
        </button>
        {alert.status !== 'resolved' && (
          <button className="btn-clear" onClick={() => onResolve(alert)}>
            <FiCheckCircle /> Resolve
          </button>
        )}
        {alert.status !== 'resolved' && (
          <button className="btn-clear" onClick={() => onDismiss(alert)}>
            <FiXCircle /> Dismiss
          </button>
        )}
      </div>
    </article>
  );
}

export default FraudAlertCard;