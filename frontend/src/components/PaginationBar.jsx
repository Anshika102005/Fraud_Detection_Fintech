import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

/**
 * Minimal pagination control for tables and lists.
 */
function PaginationBar({ page = 1, totalPages = 1, total, onPageChange }) {
  if (!total) return null;
  return (
    <div className="pagination">
      <div className="pagination-info">
        Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong> · {total.toLocaleString()} records
      </div>
      <div className="pagination-buttons">
        <button className="pagination-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <FiChevronLeft />
        </button>
        <button className="pagination-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
}

export default PaginationBar;