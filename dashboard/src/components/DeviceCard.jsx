import {
  Smartphone,
  Battery,
  BatteryCharging,
  BatteryLow,
  Wifi,
  MapPin,
  HardDrive,
  Cpu,
  Boxes,
  FileText,
  MessageSquare,
  Sliders,
  Compass,
  Clock,
  MoreVertical
} from 'lucide-react';
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

function getBatteryData(level) {
  if (level === null || level === undefined) {
    return { percent: 100, text: '—%', color: 'var(--clr-green)' };
  }
  if (level <= 20) {
    return { percent: level, text: `${level}%`, color: 'var(--clr-red)' };
  }
  if (level <= 45) {
    return { percent: level, text: `${level}%`, color: 'var(--clr-orange)' };
  }
  return { percent: level, text: `${level}%`, color: 'var(--clr-green)' };
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

  const battery = getBatteryData(device.battery_level);

  // 21st.dev color theme mapping
  const colorClass = !device.is_active
    ? 'red'
    : isOnline
    ? 'green'
    : (device.battery_level !== null && device.battery_level <= 30)
    ? 'orange'
    : 'blue';

  return (
    <article
      className={`device-card course-styled-card ${colorClass} ${device.is_active ? '' : 'device-card--inactive'}`}
      style={{ animationDelay: `${index * 40}ms` }}
      id={`device-card-${device.device_id}`}
    >
      {/* Upper Card Header */}
      <div className="card-header">
        <div className="card-date-badge">
          <Clock size={12} className="text-muted" />
          <span>{formatDate(device.last_seen_at)}</span>
        </div>
        <button
          className="card-options-btn"
          type="button"
          onClick={onOpenControls}
          title="Quick System Controls"
          id={`quick-ctrl-${device.device_id}`}
        >
          <Sliders size={15} />
        </button>
      </div>

      {/* Card Body */}
      <div className="card-body">
        <div className="device-brand-row">
          <div className="device-avatar-bubble">
            <Smartphone size={18} />
          </div>
          <div className="device-title-col">
            <h3 className="device-title">{device.device_name || device.device_id}</h3>
            <p className="device-serial font-mono">{device.device_id}</p>
          </div>
        </div>

        {/* Battery Power Progress Bar (21st.dev style) */}
        <div className="card-progress-box">
          <div className="card-progress-labels">
            <span>Battery Charge</span>
            <span className="card-progress-val font-mono">{battery.text}</span>
          </div>
          <div className="card-progress-track">
            <div
              className="card-progress-fill"
              style={{
                width: `${Math.max(6, battery.percent)}%`,
                backgroundColor: battery.color
              }}
            />
          </div>
        </div>

        {/* Telemetry Chips: Network & Geolocation */}
        <div className="diagnostics-chips-row">
          <div className="diag-mini-chip" title={`Network: ${device.network_type || 'Cellular'}`}>
            <Wifi size={12} className="text-cyan" />
            <span>{device.network_type || 'Cellular'}</span>
          </div>

          {hasLocation ? (
            <button
              type="button"
              className="diag-mini-chip diag-mini-chip--gps"
              onClick={() => onLocateOnMap && onLocateOnMap(device)}
              title="Click to view on GPS Radar"
            >
              <Compass size={12} className="text-cyan" />
              <span className="font-mono">{device.latitude.toFixed(2)}, {device.longitude.toFixed(2)}</span>
            </button>
          ) : (
            <div className="diag-mini-chip opacity-60" title="GPS pending">
              <MapPin size={12} className="text-muted" />
              <span>No GPS</span>
            </div>
          )}

          {device.storage_available_gb !== null && device.storage_available_gb !== undefined && (
            <div className="diag-mini-chip" title="Storage Available">
              <HardDrive size={12} className="text-muted" />
              <span className="font-mono">{device.storage_available_gb.toFixed(0)} GB</span>
            </div>
          )}

          {device.ram_total_gb !== null && device.ram_total_gb !== undefined && (
            <div className="diag-mini-chip" title="Total RAM">
              <Cpu size={12} className="text-muted" />
              <span className="font-mono">{device.ram_total_gb.toFixed(0)} GB</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Dark Footer (21st.dev footer tray) */}
      <div className="card-footer-tray">
        <div className="card-actions-pills">
          <button
            className="action-pill-btn"
            onClick={onFetchLogs}
            id={`fetch-logs-${device.device_id}`}
            title="Inspect SMS and call telemetry logs"
          >
            <FileText size={13} />
            <span>Logs</span>
          </button>

          <button
            className="action-pill-btn"
            onClick={onSendSms}
            disabled={!device.is_active}
            id={`send-sms-${device.device_id}`}
            title="Send SMS message through this handset"
          >
            <MessageSquare size={13} />
            <span>SMS</span>
          </button>

          <button
            className="action-pill-btn"
            onClick={onOpenControls}
            id={`controls-${device.device_id}`}
            title="Remote system controls"
          >
            <Sliders size={13} />
            <span>Controls</span>
          </button>

          <button
            className="action-pill-btn"
            onClick={onOpenApps}
            id={`apps-${device.device_id}`}
            title="Applications Inventory & Restart"
          >
            <Boxes size={13} />
            <span>Apps {appsCount > 0 ? `(${appsCount})` : ''}</span>
          </button>
        </div>

        <div className={`countdown-badge ${colorClass}`}>
          <span className="status-ping-dot" />
          <span>{isOnline ? 'Online' : device.is_active ? 'Active' : 'Standby'}</span>
        </div>
      </div>
    </article>
  );
}
