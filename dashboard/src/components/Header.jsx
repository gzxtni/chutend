import {
  Shield,
  LayoutGrid,
  Radio,
  RefreshCw,
  LogOut,
  Smartphone,
  MapPin,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import './Header.css';

export default function Header({
  totalDevices,
  activeCount,
  inactiveCount,
  gpsCount = 0,
  onRefresh,
  loading,
  manager,
  onLogout,
  viewMode = 'grid',
  onViewModeChange
}) {
  return (
    <header className="header" id="app-header">
      <div className="header-inner">
        {/* Brand & System Status */}
        <div className="header-left">
          <div className="header-logo">
            <div className="logo-icon">
              <Shield size={22} className="logo-shield" />
            </div>
            <div>
              <div className="header-title-row">
                <h1 className="header-title">EMM COMMAND</h1>
                <span className="system-pill">v2.1 SECURE</span>
              </div>
              <p className="header-subtitle">Enterprise Mobile & Fleet Intelligence</p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher Segmented Control */}
        <div className="header-nav-tabs">
          <button
            className={`nav-tab-btn ${viewMode === 'grid' ? 'nav-tab-btn--active' : ''}`}
            onClick={() => onViewModeChange('grid')}
            id="nav-tab-grid"
          >
            <LayoutGrid size={15} />
            <span>Fleet Matrix</span>
            <span className="tab-badge">{totalDevices}</span>
          </button>

          <button
            className={`nav-tab-btn ${viewMode === 'map' ? 'nav-tab-btn--active' : ''}`}
            onClick={() => onViewModeChange('map')}
            id="nav-tab-map"
          >
            <Radio size={15} className={gpsCount > 0 ? 'icon-pulse-cyan' : ''} />
            <span>Live GPS Radar</span>
            <span className="tab-badge tab-badge--cyan">{gpsCount} Fix</span>
          </button>
        </div>

        {/* Telemetry Stat Pills */}
        <div className="header-center">
          <div className="stat-pills">
            <div className="stat-pill stat-pill--total" title="Total enrolled devices">
              <Smartphone size={13} className="text-muted" />
              <span className="stat-pill-value">{totalDevices}</span>
              <span className="stat-pill-label">Total</span>
            </div>

            <div className="stat-pill stat-pill--active" title="Active devices connected recently">
              <span className="stat-dot stat-dot--green" />
              <span className="stat-pill-value">{activeCount}</span>
              <span className="stat-pill-label">Online</span>
            </div>

            <div className="stat-pill stat-pill--gps" title="Devices with active GPS coordinates">
              <MapPin size={13} className="text-cyan" />
              <span className="stat-pill-value text-cyan">{gpsCount}</span>
              <span className="stat-pill-label">GPS Fix</span>
            </div>

            <div className="stat-pill stat-pill--inactive" title="Offline or inactive devices">
              <span className="stat-dot stat-dot--red" />
              <span className="stat-pill-value">{inactiveCount}</span>
              <span className="stat-pill-label">Standby</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Manager Profile */}
        <div className="header-right">
          <button
            className="btn btn-outline btn-sm refresh-btn"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh fleet telemetry"
            id="refresh-devices-btn"
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            <span>{loading ? 'Syncing...' : 'Sync Fleet'}</span>
          </button>

          {manager && (
            <div className="manager-badge" id="manager-badge">
              <div className="manager-avatar">
                {(manager.display_name || manager.username || '?')[0].toUpperCase()}
              </div>
              <div className="manager-info">
                <span className="manager-name">{manager.display_name || manager.username}</span>
                <span className="manager-role">{manager.role}</span>
              </div>
              <button
                className="logout-btn"
                onClick={onLogout}
                title="Sign out of console"
                id="logout-btn"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
