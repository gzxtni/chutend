import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import DeviceGrid from './components/DeviceGrid';
import LogsPanel from './components/LogsPanel';
import SmsModal from './components/SmsModal';
import Toast from './components/Toast';
import LoginPage from './components/LoginPage';
import { listDevices, isAuthenticated, getStoredManager, logout as apiLogout } from './api';
import './App.css';

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [manager, setManager] = useState(getStoredManager());

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active panels
  const [logsDevice, setLogsDevice] = useState(null);
  const [smsDevice, setSmsDevice] = useState(null);

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
    addToast(`Welcome back, ${managerProfile.display_name || managerProfile.username}!`, 'success');
  }

  function handleLogout() {
    apiLogout();
    setAuthed(false);
    setManager(null);
    setDevices([]);
    setLogsDevice(null);
    setSmsDevice(null);
    addToast('Logged out successfully', 'info');
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

  // ── Authenticated → show dashboard ──────────────────────
  const activeDevices = devices.filter(d => d.is_active);
  const inactiveDevices = devices.filter(d => !d.is_active);

  return (
    <div className="app">
      <Header
        totalDevices={devices.length}
        activeCount={activeDevices.length}
        inactiveCount={inactiveDevices.length}
        onRefresh={fetchDevices}
        loading={loading}
        manager={manager}
        onLogout={handleLogout}
      />

      <main className="app-main">
        {error && !devices.length && (
          <div className="error-banner">
            <span className="error-icon">⚠</span>
            <div>
              <h3>Connection Error</h3>
              <p>{error}</p>
            </div>
            <button className="btn btn-ghost" onClick={fetchDevices}>
              Retry
            </button>
          </div>
        )}

        <DeviceGrid
          devices={devices}
          loading={loading}
          onFetchLogs={(device) => setLogsDevice(device)}
          onSendSms={(device) => setSmsDevice(device)}
        />
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
