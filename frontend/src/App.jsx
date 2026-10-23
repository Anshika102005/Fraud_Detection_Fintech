import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { TransactionProvider } from './contexts/TransactionContext';
import { NotificationProvider } from './contexts/NotificationContext';
import RouteGuard from './routes/RouteGuard';

// Layout Components
import CustomerSidebar from './components/layout/CustomerSidebar';
import CustomerNavbar from './components/layout/CustomerNavbar';
import AnalystSidebar from './components/layout/AnalystSidebar';
import AnalystNavbar from './components/layout/AnalystNavbar';
import RoleBanner from './components/layout/RoleBanner';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';

// Customer Pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import Transactions from './pages/customer/Transactions';
import AddTransaction from './pages/customer/AddTransaction';
import CsvUpload from './pages/customer/CsvUpload';
import FraudAlerts from './pages/customer/FraudAlerts';
import RiskAnalysis from './pages/customer/RiskAnalysis';
import Analytics from './pages/customer/Analytics';
import ScamChecker from './pages/customer/ScamChecker';
import SafetyCenter from './pages/customer/SafetyCenter';
import MonthlyReport from './pages/customer/MonthlyReport';
import Profile from './pages/customer/Profile';
import Settings from './pages/customer/Settings';

// Analyst Pages
import AnalystDashboard from './pages/analyst/AnalystDashboard';
import AnalystTransactions from './pages/analyst/AnalystTransactions';
import FraudIncidents from './pages/analyst/FraudIncidents';
import AnalystRiskAnalysis from './pages/analyst/AnalystRiskAnalysis';
import AnalystUsers from './pages/analyst/AnalystUsers';
import MacroAnalytics from './pages/analyst/MacroAnalytics';
import ModelPerformance from './pages/analyst/ModelPerformance';
import AnalystSettings from './pages/analyst/AnalystSettings';

/* Customer Portal Shell */
function CustomerLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname.includes('/transactions')) return 'Transaction Monitoring';
    if (pathname.includes('/add-transaction')) return 'Add & Analyze Transaction';
    if (pathname.includes('/upload')) return 'Upload Transaction History (CSV)';
    if (pathname.includes('/fraud-alerts') || pathname.includes('/alerts')) return 'Fraud Alert Center';
    if (pathname.includes('/risk-analysis')) return 'Behavioral Risk Radar';
    if (pathname.includes('/analytics')) return 'Payment Analytics';
    if (pathname.includes('/scam-checker')) return 'AI Scam Checker';
    if (pathname.includes('/safety-center')) return 'Educational Safety Center';
    if (pathname.includes('/monthly-report')) return 'Monthly Security Statement';
    if (pathname.includes('/profile')) return 'Personal Profile';
    if (pathname.includes('/settings')) return 'Settings & Preferences';
    return 'Personal AI-Powered Fraud Protection';
  };

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0a0f1d' }}>
      <RoleBanner />
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        <CustomerSidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className={`main-content ${collapsed ? 'collapsed' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <CustomerNavbar
            pageTitle={getPageTitle(location.pathname)}
            onToggleSidebar={() => {
              if (window.innerWidth >= 1024) setCollapsed(!collapsed);
              else setMobileOpen(!mobileOpen);
            }}
          />
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="dashboard" element={<CustomerDashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="add-transaction" element={<AddTransaction />} />
              <Route path="upload" element={<CsvUpload />} />
              <Route path="upload-csv" element={<Navigate to="../upload" replace />} />
              <Route path="fraud-alerts" element={<FraudAlerts />} />
              <Route path="alerts" element={<Navigate to="../fraud-alerts" replace />} />
              <Route path="risk-analysis" element={<RiskAnalysis />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="scam-checker" element={<ScamChecker />} />
              <Route path="safety-center" element={<SafetyCenter />} />
              <Route path="monthly-report" element={<MonthlyReport />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Analyst Portal Shell */
function AnalystLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname.includes('/transactions')) return 'Transaction Monitoring';
    if (pathname.includes('/fraud-incidents')) return 'Fraud Incidents & Investigation';
    if (pathname.includes('/risk-analysis')) return 'Network Risk Analysis';
    if (pathname.includes('/users')) return 'Users & Accounts Management';
    if (pathname.includes('/macro-analytics')) return 'Macro Threat Analytics';
    if (pathname.includes('/model-performance')) return 'Model Telemetry (Demo Model Metrics)';
    if (pathname.includes('/settings')) return 'Analyst Security Settings';
    return 'Fraud Intelligence Dashboard';
  };

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0a0f1d' }}>
      <RoleBanner />
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        <AnalystSidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className={`main-content ${collapsed ? 'collapsed' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AnalystNavbar
            pageTitle={getPageTitle(location.pathname)}
            onToggleSidebar={() => {
              if (window.innerWidth >= 1024) setCollapsed(!collapsed);
              else setMobileOpen(!mobileOpen);
            }}
          />
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="dashboard" element={<AnalystDashboard />} />
              <Route path="transactions" element={<AnalystTransactions />} />
              <Route path="fraud-incidents" element={<FraudIncidents />} />
              <Route path="risk-analysis" element={<AnalystRiskAnalysis />} />
              <Route path="users" element={<AnalystUsers />} />
              <Route path="macro-analytics" element={<MacroAnalytics />} />
              <Route path="model-performance" element={<ModelPerformance />} />
              <Route path="settings" element={<AnalystSettings />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TransactionProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Landing & Login */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/how-it-works" element={<LandingPage />} />
                <Route path="/safety" element={<SafetyCenter />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/login/:role" element={<LoginPage />} />

                {/* Customer Portal */}
                <Route
                  path="/app/*"
                  element={
                    <RouteGuard requiredRole="customer">
                      <CustomerLayout />
                    </RouteGuard>
                  }
                />

                {/* Analyst Portal */}
                <Route
                  path="/analyst/*"
                  element={
                    <RouteGuard requiredRole="analyst">
                      <AnalystLayout />
                    </RouteGuard>
                  }
                />

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </TransactionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}