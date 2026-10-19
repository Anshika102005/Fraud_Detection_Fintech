import { useEffect } from 'react';
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import '../../styles/ui.css';

const TYPE_ICONS = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  warning: FiAlertTriangle,
  info: FiInfo,
};

/**
 * Toast notification with auto-dismiss.
 */
function Toast({ toast, onRemove }) {
  const { id, message, type = 'info', duration = 4000 } = toast;
  const Icon = TYPE_ICONS[type] || FiInfo;

  useEffect(() => {
    const timer = setTimeout(() => onRemove(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onRemove]);

  return (
    <div className={`toast toast-${type}`} role="status">
      <span className="toast-icon">
        <Icon />
      </span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={() => onRemove(id)} aria-label="Dismiss notification">
        <FiX />
      </button>
    </div>
  );
}

export default Toast;