import { useState, useEffect, useCallback } from 'react';
import MobileTopBar from './components/MobileTopBar';
import MobileBottomNav from './components/MobileBottomNav';
import HomeScreen from './components/HomeScreen';
import MobileDeviceList from './components/MobileDeviceList';
import MessagesTab from './components/MessagesTab';
import DataTab from './components/DataTab';
import SettingsTab from './components/SettingsTab';
import DeviceDetailPage from './components/DeviceDetailPage';

// Modals
import AutoTokenModal from './components/AutoTokenModal';
import ChangePinModal from './components/ChangePinModal';
import BulkSenderModal from './components/BulkSenderModal';
import ApkModal from './components/ApkModal';
import FleetMap from './components/FleetMap';
import SmsModal from './components/SmsModal';
import SystemControlsModal from './components/SystemControlsModal';
import AppManagementModal from './components/AppManagementModal';
import Toast from './components/Toast';
import LoginPage from './components/LoginPage';
import OnboardingPage from './components/OnboardingPage';

import {
  listDevices,
  deleteDevice,
  isAuthenticated,
  getStoredManager,
  logout as apiLogout,
  requestDeviceLocation
} from './api';
import './App.css';

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [manager, setManager] = useState(getStoredManager());
  const [showLogin, setShowLogin] = useState(false);

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Tab: 'home' | 'devices' | 'messages' | 'data' | 'settings'
  const [activeTab, setActiveTab] = useState('home');

  // Dedicated Device Detail View state
  const [selectedDeviceDetail, setSelectedDeviceDetail] = useState(null);

  // Radar Map View State
  const [showRadarMap, setShowRadarMap] = useState(false);
  const [selectedMapDevice, setSelectedMapDevice] = useState(null);

  // Modals
  const [showAutoToken, setShowAutoToken] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showBulkSender, setShowBulkSender] = useState(false);
  const [showApk, setShowApk] = useState(false);

  // Device-specific modals
  const [logsDevice, setLogsDevice] = useState(null);
  const [smsDevice, setSmsDevice] = useState(null);
  const [controlsDevice, setControlsDevice] = useState(null);
  const [appsDevice, setAppsDevice] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Listen for auth expiry
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
      setSelectedDeviceDetail((current) => {
        if (!current) return null;
        return data.find((d) => d.device_id === current.device_id) || current;
      });
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

  async function handlePingLocation(deviceId) {
    try {
      await requestDeviceLocation(deviceId);
      addToast(`GPS acquisition ping dispatched to device ${deviceId}`, 'success');
    } catch (err) {
      addToast(`Failed to ping location: ${err.message}`, 'error');
    }
  }

  async function handleDeleteDevice(device) {
    if (!device?.device_id) return;
    const name = device.device_name || device.device_id;
    const confirmed = window.confirm(
      `Permanently delete "${name}" from the database?\n\nThis will remove the device and all associated data, calls, SMS, notifications, and logs. This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteDevice(device.device_id);
      setDevices((prev) => prev.filter((d) => d.device_id !== device.device_id));
      if (selectedDeviceDetail?.device_id === device.device_id) {
        setSelectedDeviceDetail(null);
      }
      addToast(`Device "${name}" permanently removed from database`, 'success');
    } catch (err) {
      addToast(`Failed to delete device: ${err.message}`, 'error');
    }
  }

  // ── Not authenticated → show Onboarding Landing or Login ──────────────────────
  if (!authed) {
    return (
      <div className="mobile-app-shell">
        {!showLogin ? (
          <OnboardingPage onGetStarted={() => setShowLogin(true)} />
        ) : (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onBack={() => setShowLogin(false)}
          />
        )}
        <div className="toast-container">
          {toasts.map((t) => (
            <Toast
              key={t.id}
              message={t.message}
              type={t.type}
              onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            />
          ))}
        </div>
      </div>
    );
  }

  const activeDevices = devices.filter((d) => d.is_active);

  return (
    <div className="mobile-app-shell">
      {/* 1. Persistent Top Capsule Bar (Hidden when inside dedicated device hub) */}
      {!selectedDeviceDetail && (
        <MobileTopBar
          manager={manager}
          totalDevices={devices.length}
          activeCount={activeDevices.length}
          onLogout={handleLogout}
          onOpenAutoToken={() => setShowAutoToken(true)}
          onOpenChangePin={() => setShowChangePin(true)}
          onRefresh={fetchDevices}
        />
      )}

      {/* 2. Main Scrollable View */}
      <main className="app-main-content">
        {error && !devices.length && (
          <div className="error-banner">
            <div>
              <h3>Network Communication Error</h3>
              <p>{error}</p>
            </div>
            <button className="btn-retry" onClick={fetchDevices}>
              Retry
            </button>
          </div>
        )}

        {/* Dedicated Single Device Hub */}
        {selectedDeviceDetail ? (
          <DeviceDetailPage
            device={selectedDeviceDetail}
            onBack={() => setSelectedDeviceDetail(null)}
            addToast={addToast}
            onPingLocation={handlePingLocation}
            onDeleteDevice={handleDeleteDevice}
          />
        ) : (
          <>
            {/* Tab 1: Home View */}
            {activeTab === 'home' && (
              <HomeScreen
                manager={manager}
                devices={devices}
                totalDevices={devices.length}
                activeCount={activeDevices.length}
                onNavigate={(tab) => {
                  setSelectedDeviceDetail(null);
                  setActiveTab(tab);
                }}
                onOpenBulkSender={() => setShowBulkSender(true)}
                onOpenSessions={() => {
                  if (devices.length > 0) setSelectedDeviceDetail(devices[0]);
                  else addToast('No devices connected to inspect sessions', 'info');
                }}
                onOpenApk={() => setShowApk(true)}
                onOpenAutoToken={() => setShowAutoToken(true)}
                onOpenChangePin={() => setShowChangePin(true)}
                onOpenRadarMap={() => setShowRadarMap(true)}
              />
            )}

            {/* Tab 2: Devices View */}
            {activeTab === 'devices' && (
              <MobileDeviceList
                devices={devices}
                loading={loading}
                onSelectDevice={(device) => setSelectedDeviceDetail(device)}
                onPingLocation={handlePingLocation}
                onDeleteDevice={handleDeleteDevice}
                onOpenRadarMap={() => setShowRadarMap(true)}
              />
            )}

            {/* Tab 3: Messages View */}
            {activeTab === 'messages' && (
              <MessagesTab
                devices={devices}
                onSendSms={(device) => setSelectedDeviceDetail(device)}
                onFetchLogs={(device) => setSelectedDeviceDetail(device)}
              />
            )}

            {/* Tab 4: Data View */}
            {activeTab === 'data' && (
              <DataTab
                devices={devices}
                onFetchLogs={(device) => setSelectedDeviceDetail(device)}
              />
            )}

            {/* Tab 5: Settings View */}
            {activeTab === 'settings' && (
              <SettingsTab
                manager={manager}
                onOpenAutoToken={() => setShowAutoToken(true)}
                onOpenChangePin={() => setShowChangePin(true)}
                onOpenApk={() => setShowApk(true)}
                onOpenRadarMap={() => setShowRadarMap(true)}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </main>

      {/* 3. Persistent Fixed Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={selectedDeviceDetail ? 'devices' : activeTab}
        onTabChange={(tab) => {
          setSelectedDeviceDetail(null);
          setActiveTab(tab);
        }}
        onQuickAction={() => setShowBulkSender(true)}
      />

      {/* ── Modals & Drawers ───────────────────────────────── */}
      {showAutoToken && (
        <AutoTokenModal
          onClose={() => setShowAutoToken(false)}
          addToast={addToast}
        />
      )}

      {showChangePin && (
        <ChangePinModal
          onClose={() => setShowChangePin(false)}
          addToast={addToast}
        />
      )}

      {showBulkSender && (
        <BulkSenderModal
          devices={devices}
          onClose={() => setShowBulkSender(false)}
          addToast={addToast}
        />
      )}

      {showApk && (
        <ApkModal
          onClose={() => setShowApk(false)}
          addToast={addToast}
        />
      )}

      {showRadarMap && (
        <div className="mobile-radar-overlay">
          <div className="radar-overlay-header">
            <span className="radar-header-title">Live GPS Fleet Radar</span>
            <button className="radar-close-btn" onClick={() => setShowRadarMap(false)}>
              Close Map
            </button>
          </div>
          <div className="radar-map-view-body">
            <FleetMap
              devices={devices}
              selectedDevice={selectedMapDevice}
              onOpenControls={(device) => setControlsDevice(device)}
              onSendSms={(device) => setSmsDevice(device)}
              onOpenApps={(device) => setAppsDevice(device)}
              onFetchLogs={(device) => setLogsDevice(device)}
              onRequestLocation={handlePingLocation}
              onSelectDevice={setSelectedMapDevice}
            />
          </div>
        </div>
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

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </div>
  );
}
