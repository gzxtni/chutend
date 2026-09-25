import { useState } from 'react';
import { Bell, Key, Lock, LogOut, ShieldCheck } from 'lucide-react';
import './MobileTopBar.css';

export default function MobileTopBar({
  manager,
  totalDevices = 0,
  activeCount = 0,
  onLogout,
  onOpenAutoToken,
  onOpenChangePin,
  onRefresh
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  const displayName = manager?.display_name || manager?.username || 'Admin';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="minimal-top-bar" id="minimal-top-bar">
      {/* iOS Status Bar with Dynamic Island */}
      <div className="ios-status-bar">
        <span className="ios-status-time">9:41</span>
        <div className="ios-dynamic-island" />
        <div className="ios-status-icons">
          {/* Signal bars */}
          <svg width="16" height="11" viewBox="0 0 17 11" fill="currentColor">
            <rect x="0" y="8" width="3" height="3" rx="1" />
            <rect x="4.5" y="5.5" width="3" height="5.5" rx="1" />
            <rect x="9" y="3" width="3" height="8" rx="1" />
            <rect x="13.5" y="0" width="3" height="11" rx="1" />
          </svg>
          {/* Wifi */}
          <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
            <path d="M7.5 9.5a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5zM11.5 5.5A5.65 5.65 0 003.5 5.5M14.5 2.5A9.85 9.85 0 00.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
          {/* Battery */}
          <svg width="22" height="11" viewBox="0 0 25 12" fill="currentColor">
            <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" fill="none" stroke="currentColor" />
            <rect x="2.5" y="2.5" width="13" height="7" rx="2" />
            <path d="M23 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Top Action Row (Bell & User Avatar Initials) */}
      <div className="minimal-top-actions">
        <button
          className="minimal-circle-btn"
          onClick={() => setShowAlerts(!showAlerts)}
          aria-label="Notifications"
        >
          <Bell size={18} strokeWidth={2} />
          {activeCount > 0 && <span className="minimal-bell-dot" />}
        </button>

        <button
          className="minimal-user-badge-btn"
          onClick={() => setShowUserMenu(!showUserMenu)}
          aria-label="User Profile"
        >
          {initials}
        </button>
      </div>

      {/* User Menu Dropdown */}
      {showUserMenu && (
        <>
          <div className="minimal-menu-backdrop" onClick={() => setShowUserMenu(false)} />
          <div className="minimal-user-dropdown">
            <div className="dropdown-user-header">
              <span className="dropdown-name">{displayName}</span>
              <span className="dropdown-role">Manager · {activeCount} devices active</span>
            </div>
            <div className="dropdown-divider" />
            <button
              className="dropdown-btn"
              onClick={() => {
                setShowUserMenu(false);
                onOpenAutoToken && onOpenAutoToken();
              }}
            >
              <Key size={15} />
              <span>Auto Token</span>
            </button>
            <button
              className="dropdown-btn"
              onClick={() => {
                setShowUserMenu(false);
                onOpenChangePin && onOpenChangePin();
              }}
            >
              <Lock size={15} />
              <span>Change PIN</span>
            </button>
            <div className="dropdown-divider" />
            <button
              className="dropdown-btn dropdown-btn--danger"
              onClick={() => {
                setShowUserMenu(false);
                onLogout && onLogout();
              }}
            >
              <LogOut size={15} />
              <span>Log Out</span>
            </button>
          </div>
        </>
      )}

      {/* Alerts Menu */}
      {showAlerts && (
        <>
          <div className="minimal-menu-backdrop" onClick={() => setShowAlerts(false)} />
          <div className="minimal-alerts-dropdown">
            <span className="alerts-title">System Status</span>
            <div className="alerts-row">
              <span className="alerts-status-dot online" />
              <div>
                <p className="alerts-text">{activeCount} devices connected</p>
                <span className="alerts-sub">Real-time sync active</span>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
