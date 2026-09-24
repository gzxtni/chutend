import { useState, useMemo } from 'react';
import { launchDeviceApp, refreshDeviceApps } from '../api';
import './AppManagementModal.css';

export default function AppManagementModal({ device, onClose, addToast }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'user' | 'system'
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [launchingPackage, setLaunchingPackage] = useState(null);

  // Parse installed_apps JSON
  const appsList = useMemo(() => {
    if (!device.installed_apps) return [];
    try {
      if (Array.isArray(device.installed_apps)) return device.installed_apps;
      return JSON.parse(device.installed_apps);
    } catch {
      return [];
    }
  }, [device.installed_apps]);

  const filteredApps = useMemo(() => {
    return appsList.filter(app => {
      const matchesSearch =
        app.name?.toLowerCase().includes(search.toLowerCase()) ||
        app.package?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;
      if (filterType === 'user') return !app.is_system;
      if (filterType === 'system') return app.is_system;
      return true;
    });
  }, [appsList, search, filterType]);

  async function handleRefreshApps() {
    try {
      setRefreshLoading(true);
      await refreshDeviceApps(device.device_id);
      addToast('Dispatched request to re-scan device applications', 'success');
    } catch (err) {
      addToast(`Failed to refresh apps: ${err.message}`, 'error');
    } finally {
      setRefreshLoading(false);
    }
  }

  async function handleLaunchApp(pkg) {
    try {
      setLaunchingPackage(pkg.package);
      await launchDeviceApp(device.device_id, pkg.package);
      addToast(`Sent command to restart/launch: ${pkg.name || pkg.package}`, 'success');
    } catch (err) {
      addToast(`Failed to launch app: ${err.message}`, 'error');
    } finally {
      setLaunchingPackage(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card app-mgmt-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <h3>Installed Applications</h3>
              <p className="modal-subtitle">
                {device.device_name || device.device_id} • {appsList.length} applications
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Search & Actions Bar */}
        <div className="app-mgmt-toolbar">
          <div className="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" />
            </svg>
            <input
              type="text"
              placeholder="Search by app or package name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          <div className="filter-pills">
            <button
              className={`pill ${filterType === 'all' ? 'pill--active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All ({appsList.length})
            </button>
            <button
              className={`pill ${filterType === 'user' ? 'pill--active' : ''}`}
              onClick={() => setFilterType('user')}
            >
              User ({appsList.filter(a => !a.is_system).length})
            </button>
            <button
              className={`pill ${filterType === 'system' ? 'pill--active' : ''}`}
              onClick={() => setFilterType('system')}
            >
              System ({appsList.filter(a => a.is_system).length})
            </button>
          </div>

          <button
            className="btn btn-outline btn-sm refresh-apps-btn"
            onClick={handleRefreshApps}
            disabled={refreshLoading}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={refreshLoading ? 'spin' : ''}>
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {refreshLoading ? 'Refreshing...' : 'Refresh Apps List'}
          </button>
        </div>

        {/* Apps List Container */}
        <div className="apps-list-container">
          {appsList.length === 0 ? (
            <div className="empty-apps-state">
              <span className="empty-icon">📦</span>
              <h4>No Installed Apps Reported Yet</h4>
              <p>The device will report installed apps during periodic telemetry sync, or you can trigger a refresh now.</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleRefreshApps}
                disabled={refreshLoading}
              >
                Request App List from Device
              </button>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="empty-apps-state">
              <span className="empty-icon">🔍</span>
              <h4>No Matching Applications</h4>
              <p>Try searching for a different keyword or change filter.</p>
            </div>
          ) : (
            <div className="apps-table">
              {filteredApps.map(app => (
                <div key={app.package} className="app-row">
                  <div className="app-icon-col">
                    <div className={`app-avatar ${app.is_system ? 'app-avatar--system' : 'app-avatar--user'}`}>
                      {app.name ? app.name.charAt(0).toUpperCase() : 'A'}
                    </div>
                  </div>
                  <div className="app-details-col">
                    <div className="app-name-row">
                      <span className="app-title">{app.name}</span>
                      {app.is_system ? (
                        <span className="badge badge-system">System</span>
                      ) : (
                        <span className="badge badge-user">User App</span>
                      )}
                    </div>
                    <div className="app-sub-row">
                      <span className="app-pkg font-mono">{app.package}</span>
                      {app.version && <span className="app-ver">v{app.version}</span>}
                    </div>
                  </div>
                  <div className="app-action-col">
                    <button
                      className="btn btn-sm btn-outline launch-btn"
                      onClick={() => handleLaunchApp(app)}
                      disabled={launchingPackage === app.package}
                      title="Launch or restart this app on device"
                    >
                      {launchingPackage === app.package ? (
                        'Launching...'
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                          </svg>
                          Restart / Launch
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <span className="footer-count">Showing {filteredApps.length} of {appsList.length} apps</span>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
