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

function getBatteryClass(level) {
  if (level === null || level === undefined) return '';
  if (level > 50) return 'battery-good';
  if (level > 20) return 'battery-medium';
  return 'battery-low';
}

export default function DeviceCard({
  device,
  index,
  onFetchLogs,
  onSendSms,
  onOpenControls,
  onOpenApps,
}) {
  const isOnline = device.is_active && device.last_seen_at &&
    (Date.now() - new Date(device.last_seen_at).getTime()) < 600000; // 10min

  const hasLocation = device.latitude !== null && device.latitude !== undefined &&
    device.longitude !== null && device.longitude !== undefined;

  // Count installed apps if available
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

  return (
    <article
      className={`device-card ${device.is_active ? '' : 'device-card--inactive'}`}
      style={{ animationDelay: `${index * 50}ms` }}
      id={`device-card-${device.device_id}`}
    >
      {/* Top Glow Bar */}
      <div className={`card-glow ${isOnline ? 'card-glow--online' : device.is_active ? 'card-glow--active' : 'card-glow--inactive'}`} />

      {/* Header */}
      <div className="card-header">
        <div className="device-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="2" width="14" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <line x1="9" y1="18" x2="15" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="device-info">
          <h3 className="device-name">{device.device_name || device.device_id}</h3>
          <p className="device-id">{device.device_id}</p>
        </div>
        <div className={`status-badge ${isOnline ? 'status-badge--online' : device.is_active ? 'status-badge--active' : 'status-badge--inactive'}`}>
          <span className="status-dot" />
          {isOnline ? 'Online' : device.is_active ? 'Active' : 'Inactive'}
        </div>
      </div>

      {/* Device Hardware Diagnostics & Telemetry Bar */}
      <div className="diagnostics-bar">
        {/* Battery */}
        <div className={`diag-chip ${getBatteryClass(device.battery_level)}`} title="Battery Level">
          <span className="diag-icon">🔋</span>
          <span>{device.battery_level !== null && device.battery_level !== undefined ? `${device.battery_level}%` : '—%'}</span>
        </div>

        {/* Network & IP */}
        <div className="diag-chip diag-chip--net" title={`IP: ${device.ip_address || 'Unknown'}`}>
          <span className="diag-icon">📶</span>
          <span>{device.network_type || 'Cellular'}</span>
        </div>

        {/* Geolocation */}
        {hasLocation ? (
          <a
            href={`https://www.google.com/maps?q=${device.latitude},${device.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="diag-chip diag-chip--gps diag-chip--link"
            title="Open in Google Maps"
          >
            <span className="diag-icon">📍</span>
            <span>{device.latitude.toFixed(2)}°, {device.longitude.toFixed(2)}°</span>
          </a>
        ) : (
          <div className="diag-chip diag-chip--gps" title="GPS coordinates pending">
            <span className="diag-icon">📍</span>
            <span>GPS —</span>
          </div>
        )}

        {/* Storage */}
        <div className="diag-chip" title="Available Internal Storage">
          <span className="diag-icon">💾</span>
          <span>
            {device.storage_available_gb !== null && device.storage_available_gb !== undefined
              ? `${device.storage_available_gb}G free`
              : '—'}
          </span>
        </div>
      </div>

      {/* Meta Specs */}
      <div className="card-meta">
        <div className="meta-item">
          <span className="meta-label">Model</span>
          <span className="meta-value">{device.manufacturer && device.model ? `${device.manufacturer} ${device.model}` : device.model || '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Android / RAM</span>
          <span className="meta-value">
            {device.os_version ? `v${device.os_version}` : '—'}
            {device.ram_total_gb ? ` • ${device.ram_total_gb}GB` : ''}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Serial Number</span>
          <span className="meta-value font-mono">{device.serial_number || '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">IP Address</span>
          <span className="meta-value font-mono">{device.ip_address || '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Last Seen</span>
          <span className="meta-value">{formatDate(device.last_seen_at)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Installed Apps</span>
          <span className="meta-value">{appsCount > 0 ? `${appsCount} apps` : 'Reported in sync'}</span>
        </div>
      </div>

      {/* Action Buttons: Logs, SMS, Controls, Apps */}
      <div className="card-actions-grid">
        <button
          className="btn btn-primary btn-sm card-btn"
          onClick={onFetchLogs}
          id={`fetch-logs-${device.device_id}`}
          title="View SMS, call logs, and communication history"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" stroke="currentColor" strokeWidth="2" />
            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" />
            <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Logs & Events
        </button>

        <button
          className="btn btn-accent btn-sm card-btn"
          onClick={onSendSms}
          disabled={!device.is_active}
          id={`send-sms-${device.device_id}`}
          title="Send SMS message through this phone"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="currentColor" strokeWidth="2" />
          </svg>
          Send SMS
        </button>

        <button
          className="btn btn-outline btn-sm card-btn card-btn--controls"
          onClick={onOpenControls}
          id={`controls-${device.device_id}`}
          title="Remote system controls: silent/vibrate, brightness, alarm"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="2" />
          </svg>
          Controls
        </button>

        <button
          className="btn btn-outline btn-sm card-btn card-btn--apps"
          onClick={onOpenApps}
          id={`apps-${device.device_id}`}
          title="View installed apps and remotely restart/launch"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
            <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
            <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
            <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
          </svg>
          Apps {appsCount > 0 ? `(${appsCount})` : ''}
        </button>
      </div>
    </article>
  );
}
