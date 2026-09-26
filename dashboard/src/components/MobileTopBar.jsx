import { useState } from 'react';
import { Bell, Key, Lock, LogOut, ShieldCheck, ChevronDown } from 'lucide-react';
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
      <div className="top-bar-inner">
        {/* Left: Branding & Status */}
        {/* Left: APIXER Logo */}
        <div className="top-brand-logo-wrap">
          <img
            src="/apixer-logo.png"
            alt="APIXER"
            className="top-brand-logo-img"
          />
        </div>

        {/* Right: Notification Bell & Initials Button */}
        <div className="top-action-group">
          <button
            className="top-action-btn"
            onClick={() => setShowAlerts(!showAlerts)}
            title="System notifications"
            aria-label="Notifications"
          >
            <Bell size={18} strokeWidth={2} />
            {activeCount > 0 && <span className="top-bell-dot" />}
          </button>

          <button
            className="top-user-pill-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            title="Account Menu"
            aria-label="Account"
          >
            <span>{initials}</span>
          </button>
        </div>
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
