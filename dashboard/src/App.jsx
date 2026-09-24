import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import DeviceGrid from './components/DeviceGrid';
import FleetMap from './components/FleetMap';
import FleetBentoStats from './components/FleetBentoStats';
import LogsPanel from './components/LogsPanel';
import SmsModal from './components/SmsModal';
import SystemControlsModal from './components/SystemControlsModal';
import AppManagementModal from './components/AppManagementModal';
import Toast from './components/Toast';
import LoginPage from './components/LoginPage';
import {
  listDevices,
  isAuthenticated,
  getStoredManager,
  logout as apiLogout,
  requestDeviceLocation
} from './api';
import './App.css';

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [manager, setManager] = useState(getStoredManager());

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View state: 'grid' (Fleet Matrix) | 'map' (Live GPS Radar)
  const [viewMode, setViewMode] = useState('grid');
  const [selectedMapDevice, setSelectedMapDevice] = useState(null);

  // Active modal panels
  const [logsDevice, setLogsDevice] = useState(null);
  const [smsDevice, setSmsDevice] = useState(null);
  const [controlsDevice, setControlsDevice] = useState(null);
  const [appsDevice, setAppsDevice] = useState(null);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Listen for auth expiry events (401 from API)
  useEffect(() => {
    function handleAuthExpired() {
      setAuthed(false);
      setManager(null);
      setDevices([]);
      addToast('Session expired — please log in again', 'warning');
    }
    window.addEventListener('emm:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('emm:auth-expired', handleAuthExpired);
  }, [addToast]);

  const fetchDevices = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      setLoading(true);
      setError(null);
      const data = await listDevices();
      setDevices(data);
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!authed) return;
    fetchDevices();
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, [authed, fetchDevices]);

  function handleLoginSuccess(managerProfile) {
    setAuthed(true);
    setManager(managerProfile);
    addToast(`Authenticated as ${managerProfile.display_name || managerProfile.username}`, 'success');
  }

  function handleLogout() {
    apiLogout();
    setAuthed(false);
    setManager(null);
    setDevices([]);
    setLogsDevice(null);
    setSmsDevice(null);
    setControlsDevice(null);
    setAppsDevice(null);
    addToast('Logged out of console', 'info');
  }

  // Jump from device card straight to Live Radar map centered on that device
  function handleLocateOnMap(device) {
    setSelectedMapDevice(device);
    setViewMode('map');
  }

  async function handleRequestLocation(deviceId) {
    try {
      await requestDeviceLocation(deviceId);
      addToast(`GPS acquisition dispatched to device ${deviceId}`, 'success');
    } catch (err) {
      addToast(`Failed to ping location: ${err.message}`, 'error');
    }
  }

  // ── Not authenticated → show login ──────────────────────
  if (!authed) {
    return (
      <div className="app">
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        <div className="toast-container">
          {toasts.map(t => (
            <Toast
              key={t.id}
              message={t.message}
              type={t.type}
              onDismiss={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Authenticated → show console ────────────────────────
  const activeDevices = devices.filter(d => d.is_active);
  const inactiveDevices = devices.filter(d => !d.is_active);
  const gpsCount = devices.filter(d => d.latitude !== null && d.latitude !== undefined).length;

  return (
    <div className="app">
      <Header
        totalDevices={devices.length}
        activeCount={activeDevices.length}
        inactiveCount={inactiveDevices.length}
        gpsCount={gpsCount}
        onRefresh={fetchDevices}
        loading={loading}
        manager={manager}
        onLogout={handleLogout}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <main className={`app-main ${viewMode === 'map' ? 'app-main--map' : ''}`}>
        {error && !devices.length && (
          <div className="error-banner">
            <div>
              <h3>Network Communication Error</h3>
              <p>{error}</p>
            </div>
            <button className="btn btn-ghost" onClick={fetchDevices}>
              Retry Connection
            </button>
          </div>
        )}

        {viewMode === 'map' ? (
          <FleetMap
            devices={devices}
            selectedDevice={selectedMapDevice}
            onOpenControls={(device) => setControlsDevice(device)}
            onSendSms={(device) => setSmsDevice(device)}
            onOpenApps={(device) => setAppsDevice(device)}
            onFetchLogs={(device) => setLogsDevice(device)}
            onRequestLocation={handleRequestLocation}
            onSelectDevice={setSelectedMapDevice}
          />
        ) : (
          <>
            <FleetBentoStats
              devices={devices}
              onSwitchToMap={() => setViewMode('map')}
            />
            <DeviceGrid
              devices={devices}
              loading={loading}
              onFetchLogs={(device) => setLogsDevice(device)}
              onSendSms={(device) => setSmsDevice(device)}
              onOpenControls={(device) => setControlsDevice(device)}
              onOpenApps={(device) => setAppsDevice(device)}
              onLocateOnMap={handleLocateOnMap}
              onSwitchToMap={() => setViewMode('map')}
            />
          </>
        )}
      </main>

      {logsDevice && (
        <LogsPanel
          device={logsDevice}
          onClose={() => setLogsDevice(null)}
          addToast={addToast}
        />
      )}

      {smsDevice && (
        <SmsModal
          device={smsDevice}
          onClose={() => setSmsDevice(null)}
          addToast={addToast}
        />
      )}

      {controlsDevice && (
        <SystemControlsModal
          device={controlsDevice}
          onClose={() => setControlsDevice(null)}
          addToast={addToast}
        />
      )}

      {appsDevice && (
        <AppManagementModal
          device={appsDevice}
          onClose={() => setAppsDevice(null)}
          addToast={addToast}
        />
      )}

      <div className="toast-container">
        {toasts.map(t => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            onDismiss={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          />
        ))}
      </div>
    </div>
  );
}
