/**
 * Card wrapper for charts and dashboards with optional header actions.
 */
function ChartCard({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`chart-container ${className}`}>
      <div className="chart-header">
        <div className="chart-heading">
          <h3 className="chart-title">{title}</h3>
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="chart-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export default ChartCard;