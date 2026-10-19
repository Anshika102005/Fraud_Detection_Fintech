import { FiX } from 'react-icons/fi';

/**
 * Filter group: labeled control used inside FilterBar.
 */
export function FilterGroup({ label, children, className = '' }) {
  return (
    <div className={`filter-group ${className}`}>
      <label className="filter-label">{label}</label>
      {children}
    </div>
  );
}

/**
 * Generic filter bar with a "Clear Filters" action.
 * Children should be FilterGroup components.
 */
function FilterBar({ children, onClear, showClear = true }) {
  return (
    <div className="filter-bar">
      {children}
      {showClear && (
        <div className="filter-actions">
          <button type="button" className="btn-clear" onClick={onClear}>
            <FiX />
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}

export default FilterBar;