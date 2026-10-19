import { getRiskColor, getRiskBgColor, getRiskLabel } from '../../utils/helpers';
import '../../styles/ui.css';

/**
 * Compact risk score pill with level coloring.
 */
function RiskScore({ score }) {
  if (score === null || score === undefined) return <span className="risk-score-badge">—</span>;
  const color = getRiskColor(score);
  const bg = getRiskBgColor(score);
  const label = getRiskLabel(score);
  return (
    <span className="risk-score-badge" style={{ color, backgroundColor: bg }} title={`${score}/100 — ${label}`}>
      <span className="risk-score-dot" style={{ backgroundColor: color }} />
      {score}
    </span>
  );
}

export default RiskScore;