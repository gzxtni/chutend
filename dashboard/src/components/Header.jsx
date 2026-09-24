import './Header.css';

export default function Header({ totalDevices, activeCount, inactiveCount, onRefresh, loading, manager, onLogout }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-left">
          <div className="header-logo">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="1" width="18" height="22" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <rect x="7" y="5" width="10" height="12" rx="1" fill="currentColor" opacity="0.2" />
                <circle cx="12" cy="20" r="1" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 className="header-title">EMM Dashboard</h1>
              <p className="header-subtitle">Enterprise Mobile Management</p>
            </div>
          </div>
        </div>

        <div className="header-center">
          <div className="stat-pills">
            <div className="stat-pill stat-pill--total">
              <span className="stat-pill-value">{totalDevices}</span>
              <span className="stat-pill-label">Total</span>
            </div>
            <div className="stat-pill stat-pill--active">
              <span className="stat-dot stat-dot--green" />
              <span className="stat-pill-value">{activeCount}</span>
              <span className="stat-pill-label">Active</span>
            </div>
            <div className="stat-pill stat-pill--inactive">
              <span className="stat-dot stat-dot--red" />
              <span className="stat-pill-value">{inactiveCount}</span>
              <span className="stat-pill-label">Inactive</span>
            </div>
          </div>
        </div>

        <div className="header-right">
          <button
            className="btn btn-ghost btn-sm refresh-btn"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh devices"
            id="refresh-devices-btn"
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 8A6 6 0 1 1 8 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8 0L10 2L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            Refresh
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
                title="Sign out"
                id="logout-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
