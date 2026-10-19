import {
  FiCreditCard,
  FiShield,
  FiTrendingDown,
  FiShoppingCart,
  FiActivity,
  FiLock,
  FiArrowUpRight,
  FiArrowDownRight,
} from 'react-icons/fi';

const iconMap = {
  Receipt: FiCreditCard,
  ShieldAlert: FiShield,
  TrendingDown: FiTrendingDown,
  Banknote: FiShoppingCart,
  Gauge: FiActivity,
  Lock: FiLock,
};

/**
 * KPI metric card: value, label, icon and directional change.
 */
function KPICard({ kpi }) {
  const Icon = iconMap[kpi.icon] || FiReceipt;
  const isUp = kpi.change.startsWith('+');
  const goodWhenUp = kpi.goodWhenUp !== false;
  const bad = isUp !== goodWhenUp;
  const trendClass = bad ? 'increasing' : 'decreasing';
  const TrendIcon = isUp ? FiArrowUpRight : FiArrowDownRight;

  return (
    <div className="kpi-card">
      <div className={`kpi-icon ${kpi.iconClass || ''}`}>
        <Icon />
      </div>
      <div className="kpi-value">{kpi.value}</div>
      <div className="kpi-label">{kpi.label}</div>
      <div className={`kpi-trend ${trendClass}`}>
        <TrendIcon />
        <span>{kpi.change} from last week</span>
      </div>
    </div>
  );
}

export default KPICard;