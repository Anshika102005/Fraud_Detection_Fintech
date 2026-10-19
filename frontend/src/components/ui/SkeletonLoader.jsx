import '../../styles/ui.css';

/**
 * Skeleton loader used while data is being fetched so the UI never
 * shows a blank screen.
 */
function SkeletonLoader({ rows = 5, variant = 'table' }) {
  const item = (key) => (
    <div className="skeleton-row" key={key}>
      <span className="skeleton-line" style={{ width: `${30 + ((key * 17) % 60)}%` }} />
    </div>
  );

  if (variant === 'table') {
    return (
      <div className="skeleton skeleton-table" aria-busy="true" aria-label="Loading data">
        {Array.from({ length: rows }, (_, i) => (
          <div className="skeleton-table-row" key={i}>
            {Array.from({ length: 6 }, (_, j) => <span className="skeleton-cell" key={j} />)}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className="skeleton skeleton-cards" aria-busy="true" aria-label="Loading cards">
        {Array.from({ length: rows }, (_, i) => (
          <div className="skeleton-card" key={i}>
            {item(1)}
            {item(2)}
            {item(3)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => item(i))}
    </div>
  );
}

export default SkeletonLoader;