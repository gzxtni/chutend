import { useState } from 'react';
import {
  Boxes,
  Play,
  RotateCcw,
  RefreshCw,
  Search,
  ShieldCheck,
  Package,
  Layers,
  X,
  AlertCircle
} from 'lucide-react';
import { executeCommand, requestInstalledApps } from '../api';
import './AppManagementModal.css';

export default function AppManagementModal({ device, onClose, addToast }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, user, system
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [actionLoadingPkg, setActionLoadingPkg] = useState(null);

  // Parse installed_apps from device
  let appsList = [];
  if (device.installed_apps) {
    try {
      appsList = Array.isArray(device.installed_apps)
        ? device.installed_apps
        : JSON.parse(device.installed_apps);
    } catch {
      appsList = [];
    }
  }

  // Filter and sort apps
  const filteredApps = appsList.filter(app => {
    const q = search.toLowerCase();
    const matchesSearch =
      (app.name || '').toLowerCase().includes(q) ||
      (app.package || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterType === 'user') return !app.is_system;
    if (filterType === 'system') return !!app.is_system;
    return true;
  });

  async function handleRefreshApps() {
    try {
      setRefreshLoading(true);
      await requestInstalledApps(device.device_id);
      addToast('Refresh apps command dispatched to device', 'success');
    } catch (err) {
      addToast(`Failed to dispatch refresh: ${err.message}`, 'error');
    } finally {
      setRefreshLoading(false);
    }
  }

  async function handleLaunchOrRestart(pkgName, appName) {
    try {
      setActionLoadingPkg(pkgName);
      await executeCommand(device.device_id, 'launch_app', { package_name: pkgName });
      addToast(`Restart/Launch dispatched for ${appName || pkgName}`, 'success');
    } catch (err) {
      addToast(`Failed to launch app: ${err.message}`, 'error');
    } finally {
      setActionLoadingPkg(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card app-mgmt-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Boxes size={20} className="text-cyan" />
            </div>
            <div>
              <h3>Installed Applications Inventory</h3>
              <p className="modal-subtitle font-mono">
                {device.device_name || device.device_id} • {appsList.length} packages
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="app-mgmt-toolbar">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by app name or package identifier..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>
                <X size={12} />
              </button>
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
            <RefreshCw size={13} className={refreshLoading ? 'spin-icon' : ''} />
            <span>{refreshLoading ? 'Syncing...' : 'Scan Device'}</span>
          </button>
        </div>

        {/* Apps List Container */}
        <div className="apps-list-container">
          {appsList.length === 0 ? (
            <div className="empty-apps-state">
              <Package size={40} className="text-muted" />
              <h4>No App Inventory Received Yet</h4>
              <p>Trigger a scan to instruct the background agent to index and report all installed packages.</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleRefreshApps}
                disabled={refreshLoading}
              >
                <RefreshCw size={13} className={refreshLoading ? 'spin-icon' : ''} />
                <span>Scan Device Now</span>
              </button>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="empty-apps-state">
              <AlertCircle size={32} className="text-muted" />
              <h4>No Matching Applications Found</h4>
              <p>Try searching for a different keyword or toggle filter.</p>
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
                    <span className="app-package font-mono">{app.package}</span>
                  </div>
                  <div className="app-action-col">
                    <button
                      className="btn btn-outline btn-sm restart-app-btn"
                      onClick={() => handleLaunchOrRestart(app.package, app.name)}
                      disabled={actionLoadingPkg === app.package}
                      title="Remotely launch or restart this application on device"
                    >
                      {actionLoadingPkg === app.package ? (
                        <RefreshCw size={12} className="spin-icon" />
                      ) : (
                        <Play size={12} />
                      )}
                      <span>{actionLoadingPkg === app.package ? 'Launching...' : 'Restart / Launch'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
