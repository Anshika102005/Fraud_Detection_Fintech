import { FiInbox } from 'react-icons/fi';
import '../../styles/ui.css';

/**
 * Empty state shown when a list/filter yields no results.
 */
function EmptyState({ title = 'No data found', description = 'Try adjusting your filters or check back later.', action }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <FiInbox />
      </span>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

export default EmptyState;