import { NavLink, useLocation } from 'react-router-dom';
import { NAVIGATION_ITEMS } from '../../utils/constants';
import {
  FiGrid,
  FiShoppingBag,
  FiAlertTriangle,
  FiShield,
  FiBarChart2,
  FiUsers,
  FiCpu,
  FiSettings,
  FiLogOut,
} from 'react-icons/fi';
import '../../styles/sidebar.css';

const iconMap = {
  LayoutDashboard: FiGrid,
  Receipt: FiShoppingBag,
  AlertTriangle: FiAlertTriangle,
  ShieldCheck: FiShield,
  BarChart3: FiBarChart2,
  Users: FiUsers,
  Brain: FiCpu,
  Settings: FiSettings,
};

/**
 * Fixed sidebar navigation. Collapse state is owned by App (desktop),
 * mobile drawer state is passed in via props.
 */
function Sidebar({ collapsed = false, mobileOpen = false, onCloseMobile }) {
  const location = useLocation();

  return (
    <>
      <nav className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-icon">🛡️</span>
            {!collapsed && <span>FraudGuard AI</span>}
          </div>
        </div>

        <div className="sidebar-nav">
          <ul className="sidebar-nav-list">
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive = location.pathname === item.path;
              return (
                <li key={item.id} className="sidebar-nav-item">
                  <NavLink to={item.path} className={`sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={onCloseMobile} title={item.label}>
                    <span className="sidebar-nav-icon">
                      <Icon />
                    </span>
                    <span className="sidebar-nav-label">{item.label}</span>
                    {item.id === 'alerts' && <span className="sidebar-nav-badge">{7}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">AJ</div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">Alice Johnson</div>
                <div className="sidebar-user-role">Fraud Analyst</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button className="sidebar-logout" onClick={() => alert('Logging out...')} title="Logout">
              <FiLogOut />
              <span>Logout</span>
            </button>
          )}
        </div>
      </nav>
      {mobileOpen && <div className="sidebar-overlay" onClick={onCloseMobile} />}
    </>
  );
}

export default Sidebar;