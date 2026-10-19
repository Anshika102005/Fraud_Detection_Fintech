import { FiAlertCircle } from 'react-icons/fi';
import '../../styles/ui.css';

/**
 * Error state with retry action.
 */
function ErrorState({ message = 'Something went wrong while loading data.', onRetry }) {
  return (
    <div className="error-state">
      <span className="error-state-icon">
        <FiAlertCircle />
      </span>
      <h3 className="error-state-title">Unable to load data</h3>
      <p className="error-state-description">{message}</p>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorState;