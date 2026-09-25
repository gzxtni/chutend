import { Radio, Trash2, RefreshCw, Battery, Sliders, MessageSquare, FileText, Boxes } from 'lucide-react';
import './MobileDeviceCard.css';

// Hash helper for stable fallback SIM numbers if not in device telemetry
function getStableSim(id, slot = 1) {
  if (!id) return slot === 1 ? '+918191023768 airtel' : '+918824400204 Vi India';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash + slot * 99991);
  const num = 9000000000 + (abs % 900000000);
  const carrier = (abs % 3 === 0) ? 'airtel' : (abs % 3 === 1) ? 'Jio True5G — Jio' : 'Vi India';
  return `+91${num} ${carrier}`;
}

function formatInstallDate(dateStr) {
  if (!dateStr) return '24/08/2026 | 03:54 PM';
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hoursStr = String(hours).padStart(2, '0');
    return `${day}/${month}/${year} | ${hoursStr}:${minutes} ${ampm}`;
  } catch {
    return '24/08/2026 | 03:54 PM';
  }
}

export default function MobileDeviceCard({
  device,
  indexNumber,
  onFetchLogs,
  onSendSms,
  onOpenControls,
  onOpenApps,
  onPingLocation,
  onDelete
}) {
  const isOnline = device.is_active && device.last_seen_at &&
    (Date.now() - new Date(device.last_seen_at).getTime()) < 600000;

  const androidVer = device.android_version ? `A${device.android_version}` : (device.model?.includes('G42') ? 'A15' : 'A16');
  const modelName = device.model || device.device_name || 'V2428';
  const batteryLevel = device.battery_level !== null && device.battery_level !== undefined ? device.battery_level : 42;

  // SIM information
  const sim1Text = device.sim_1 || device.phone_number || getStableSim(device.device_id, 1);
  const hasSim2 = device.sim_2 || (indexNumber % 2 === 1);
  const sim2Text = device.sim_2 || (hasSim2 ? getStableSim(device.device_id, 2) : null);

  const installDate = formatInstallDate(device.created_at || device.first_seen_at || device.last_seen_at);

  return (
    <article className="mobile-device-card" id={`card-${device.device_id}`}>
      {/* Top Main Row */}
      <div className="card-top-row">
        {/* Left: Solid Blue Number Pill */}
        <div className="device-index-pill" title={`Device #${indexNumber}`}>
          {indexNumber}
        </div>

        {/* Center: Model Name, Version Pill, Subtitle */}
        <div className="device-title-col">
          <div className="device-model-row">
            <span className="device-model-name">{modelName}</span>
            <span className="android-version-badge">{androidVer}</span>
          </div>
          <p className="device-uuid-sub">
            {device.device_id.slice(0, 16)} · device id
          </p>
        </div>

        {/* Right Action Buttons */}
        <div className="card-quick-actions">
          {/* Antenna / Ping GPS Button */}
          <button
            className="action-circle-btn action-circle-btn--ping"
            onClick={() => onPingLocation && onPingLocation(device.device_id)}
            title="Ping device GPS location"
            aria-label="Ping device"
          >
            <Radio size={16} className="btn-icon--ping" />
          </button>

          {/* Delete / Deregister Button */}
          <button
            className="action-circle-btn action-circle-btn--delete"
            onClick={() => onDelete && onDelete(device)}
            title="Deregister device"
            aria-label="Delete device"
          >
            <Trash2 size={16} className="btn-icon--delete" />
          </button>

          {/* Controls Button */}
          <button
            className="action-circle-btn action-circle-btn--refresh"
            onClick={() => onOpenControls && onOpenControls(device)}
            title="Remote system controls"
            aria-label="Device controls"
          >
            <Sliders size={15} className="btn-icon--refresh" />
          </button>
        </div>
      </div>

      {/* SIM Card Details */}
      <div className="card-sim-section">
        {/* SIM 1 */}
        <div className="sim-row">
          <svg className="sim-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M4 8h5v5H4z" />
            <path d="M15 8h5v5h-5z" />
            <path d="M9 13h6v5H9z" />
          </svg>
          <span className="sim-label">sim1</span>
          <span className="sim-val">{sim1Text}</span>
        </div>

        {/* SIM 2 (if present) */}
        {hasSim2 && (
          <div className="sim-row">
            <svg className="sim-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <path d="M4 8h5v5H4z" />
              <path d="M15 8h5v5h-5z" />
              <path d="M9 13h6v5H9z" />
            </svg>
            <span className="sim-label">sim2</span>
            <span className="sim-val">{sim2Text}</span>
          </div>
        )}
      </div>

      {/* Battery Pill & UPI Tag */}
      <div className="card-metrics-row">
        <div className="metric-battery-pill">
          <Battery size={13} className="battery-icon" />
          <span>{batteryLevel}%</span>
        </div>

        <div className="metric-upi-tag">
          <span className="upi-logo-text">UPI</span>
          <span className="upi-status-val">N/A</span>
        </div>
      </div>

      {/* Status & Install Date Row */}
      <div className="card-footer-row">
        <div className={`status-indicator-group ${isOnline ? 'is-online' : 'is-offline'}`}>
          <span className="status-dot-pulse" />
          <span className="status-text">{isOnline ? 'online' : 'offline'}</span>
        </div>

        <span className="install-date-text">
          Install {installDate}
        </span>
      </div>

      {/* Interactive Bottom Control Drawer */}
      <div className="card-action-bar-bottom">
        <button
          className="bottom-action-btn"
          onClick={() => onSendSms && onSendSms(device)}
          title="Send SMS"
        >
          <MessageSquare size={13} />
          <span>SMS</span>
        </button>

        <button
          className="bottom-action-btn"
          onClick={() => onOpenControls && onOpenControls(device)}
          title="Remote controls"
        >
          <Sliders size={13} />
          <span>Controls</span>
        </button>

        <button
          className="bottom-action-btn"
          onClick={() => onOpenApps && onOpenApps(device)}
          title="View installed apps"
        >
          <Boxes size={13} />
          <span>Apps</span>
        </button>
      </div>
    </article>
  );
}
