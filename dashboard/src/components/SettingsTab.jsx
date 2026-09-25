import { Key, Lock, Download, Radio, LogOut, ShieldCheck, User, Server } from 'lucide-react';
import './SettingsTab.css';

export default function SettingsTab({
  manager,
  onOpenAutoToken,
  onOpenChangePin,
  onOpenApk,
  onOpenRadarMap,
  onLogout
}) {
  const displayName = manager?.display_name || manager?.username || 'SHEIKH';

  return (
    <div className="settings-tab-page" id="settings-tab-page">
      <div className="settings-header-row">
        <h3 className="tab-main-heading">Settings & Preferences</h3>
        <span className="tab-pill-badge">v2.1</span>
      </div>

      {/* Account Profile Card */}
      <div className="settings-profile-card">
        <div className="profile-avatar-wrap">
          <img
            src="/avatar.jpg"
            alt="Manager Mascot"
            className="profile-avatar-img"
            onError={(e) => {
              e.target.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=sheikh';
            }}
          />
        </div>
        <div className="profile-details">
          <h4 className="profile-name">{displayName}</h4>
          <span className="profile-role">Root Administrator Â· 14d active</span>
          <span className="profile-status">
            <span className="profile-dot" /> Live Session Active
          </span>
        </div>
      </div>

      {/* Settings Navigation List */}
      <div className="settings-menu-group">
        <h4 className="group-title">Quick Security & Access</h4>

        <div className="settings-menu-list">
          <div className="settings-item-btn" onClick={onOpenAutoToken}>
            <div className="item-icon-box bg-blue-dim">
              <Key size={17} className="text-blue" />
            </div>
            <div className="item-text-box">
              <span className="item-title">Auto Token</span>
              <span className="item-sub">View and copy current API authorization key</span>
            </div>
          </div>

          <div className="settings-item-btn" onClick={onOpenChangePin}>
            <div className="item-icon-box bg-blue-dim">
              <Lock size={17} className="text-blue" />
            </div>
            <div className="item-text-box">
              <span className="item-title">Change PIN</span>
              <span className="item-sub">Update panel access PIN or password</span>
            </div>
          </div>

          <div className="settings-item-btn" onClick={onOpenApk}>
            <div className="item-icon-box bg-blue-dim">
              <Download size={17} className="text-blue" />
            </div>
            <div className="item-text-box">
              <span className="item-title">Client APK</span>
              <span className="item-sub">Download latest Android EMM Agent APK</span>
            </div>
          </div>

          <div className="settings-item-btn" onClick={onOpenRadarMap}>
            <div className="item-icon-box bg-blue-dim">
              <Radio size={17} className="text-blue" />
            </div>
            <div className="item-text-box">
              <span className="item-title">Live GPS Radar</span>
              <span className="item-sub">View full interactive map with device clusters</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backend Server Information */}
      <div className="server-info-card">
        <div className="server-info-header">
          <Server size={16} className="text-blue" />
          <span className="server-title">Backend Gateway</span>
        </div>
        <p className="server-url">https://chutend-production.up.railway.app</p>
        <span className="server-status">Status: Operational (HTTP 200)</span>
      </div>

      {/* Logout Action */}
      <button className="settings-logout-btn" onClick={onLogout} id="settings-logout-btn">
        <LogOut size={16} />
        <span>Log Out of Panel</span>
      </button>
    </div>
  );
}
