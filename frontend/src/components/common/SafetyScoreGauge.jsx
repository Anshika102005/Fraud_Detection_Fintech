import React from 'react';

export default function SafetyScoreGauge({ score = 87, status = 'Good' }) {
  const radius = 70;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let strokeColor = '#10B981'; // Green
  let badgeClass = 'risk-badge-low';

  if (score < 40) {
    strokeColor = '#EF4444'; // Red
    badgeClass = 'risk-badge-critical';
  } else if (score < 70) {
    strokeColor = '#F59E0B'; // Yellow/Orange
    badgeClass = 'risk-badge-medium';
  }

  return (
    <div className="safety-score-gauge-wrap">
      <div className="gauge-svg-container">
        <svg height={radius * 2 + 20} width={radius * 2 + 20} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle
            stroke="rgba(255, 255, 255, 0.08)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius + 10}
            cy={radius + 10}
          />
          {/* Animated active progress */}
          <circle
            stroke={strokeColor}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease',
            }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius + 10}
            cy={radius + 10}
          />
        </svg>

        <div className="gauge-center-text">
          <span className="gauge-score-number">{score}</span>
          <span className="gauge-score-total">/ 100</span>
        </div>
      </div>

      <div className={`gauge-status-badge ${badgeClass}`}>
        {status}
      </div>
    </div>
  );
}
