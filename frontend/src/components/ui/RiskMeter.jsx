import { getRiskColor, getRiskLabel } from '../../utils/helpers';
import '../../styles/ui.css';

const SCALE = [0, 30, 70, 90, 100];

/**
 * Horizontal 0–100 risk gauge with scale, colored fill and marker.
 */
function RiskMeter({ score, size = 'md' }) {
  if (score === null || score === undefined) score = 0;
  const value = Math.max(0, Math.min(100, score));
  const color = getRiskColor(value);
  const label = getRiskLabel(value);

  return (
    <div className={`risk-meter-gauge risk-meter-${size}`}>
      <div className="risk-meter-track">
        <div className="risk-meter-zones">
          <span style={{ left: '0%' }} />
          <span style={{ left: '30%' }} />
          <span style={{ left: '70%' }} />
          <span style={{ left: '90%' }} />
          <span style={{ left: '100%' }} />
        </div>
        <div className="risk-meter-fill" style={{ width: `${value}%`, backgroundColor: color }} />
        <span className="risk-meter-marker" style={{ left: `${value}%`, backgroundColor: color }} />
      </div>
      <div className="risk-meter-scale">
        {SCALE.map((v) => (
          <span key={v} className="risk-meter-scale-label">
            {v}
          </span>
        ))}
      </div>
      <div className="risk-meter-caption">
        <span className="risk-meter-value" style={{ color }}>
          {score}/100
        </span>
        <span className="risk-meter-label">{label} RISK</span>
      </div>
    </div>
  );
}

export default RiskMeter;