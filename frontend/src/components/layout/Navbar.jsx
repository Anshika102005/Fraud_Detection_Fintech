import { FiMenu, FiSearch, FiBell, FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '../../contexts/ThemeContext';
import '../../styles/navbar.css';

/**
 * Top navigation: page title, global search, notifications,
 * theme toggle and user profile.
 */
function Navbar({ pageTitle = 'Dashboard', onToggleSidebar }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="navbar-icon-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar" title="Toggle sidebar">
          <FiMenu />
        </button>
        <div className="navbar-heading">
          <h1 className="navbar-title">{pageTitle}</h1>
          <div className="navbar-subtitle">Real-time fraud monitoring</div>
        </div>
      </div>

      <div className="navbar-center">
        <div className="navbar-search">
          <span className="navbar-search-icon">
            <FiSearch />
          </span>
          <input
            className="navbar-search-input"
            type="search"
            placeholder="Search transactions, customers, merchants..."
            aria-label="Search transactions"
          />
        </div>
      </div>

      <div className="navbar-right">
        <button className="navbar-icon-btn" aria-label="Notifications" title="Notifications">
          <FiBell />
          <span className="navbar-alert-badge" />
        </button>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle color theme" title="Toggle color theme">
          {theme === 'dark' ? <FiSun /> : <FiMoon />}
        </button>
        <div className="user-profile" title="Alice Johnson — Fraud Analyst">
          <div className="user-profile-avatar">AJ</div>
          <div className="user-profile-meta">
            <div className="user-profile-name">Alice Johnson</div>
            <div className="user-profile-role">Fraud Analyst</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;