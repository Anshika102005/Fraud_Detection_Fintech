import '../../styles/ui.css';

/**
 * Loading spinner with optional label.
 */
function LoadingSpinner({ label = 'Loading...', inline = false }) {
  if (inline) {
    return (
      <span className="spinner-inline">
        <span className="spinner" aria-hidden="true" />
        {label && <span className="spinner-label">{label}</span>}
      </span>
    );
  }
  return (
    <div className="spinner-block" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
}

export default LoadingSpinner;