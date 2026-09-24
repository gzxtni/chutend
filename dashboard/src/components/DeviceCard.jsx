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

export default function DeviceCard({ device, index, onFetchLogs, onSendSms }) {
  const isOnline = device.is_active && device.last_seen_at &&
    (Date.now() - new Date(device.last_seen_at).getTime()) < 600000; // 10min

  return (
    <article
      className={`device-card ${device.is_active ? '' : 'device-card--inactive'}`}
      style={{ animationDelay: `${index * 50}ms` }}
      id={`device-card-${device.device_id}`}
    >
      {/* Top Glow Bar */}
      <div className={`card-glow ${isOnline ? 'card-glow--online' : device.is_active ? 'card-glow--active' : 'card-glow--inactive'}`} />

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

      <div className="card-meta">
        <div className="meta-item">
          <span className="meta-label">Model</span>
          <span className="meta-value">{device.manufacturer && device.model ? `${device.manufacturer} ${device.model}` : device.model || '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Android</span>
          <span className="meta-value">{device.os_version || '—'}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Last Seen</span>
          <span className="meta-value">{formatDate(device.last_seen_at)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Registered</span>
          <span className="meta-value">{formatDate(device.registered_at)}</span>
        </div>
      </div>

      <div className="card-actions">
        <button
          className="btn btn-primary btn-sm card-btn"
          onClick={onFetchLogs}
          id={`fetch-logs-${device.device_id}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" stroke="currentColor" strokeWidth="2" />
            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" />
            <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="8" y1="17" x2="13" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Fetch Latest Logs
        </button>
        <button
          className="btn btn-accent btn-sm card-btn"
          onClick={onSendSms}
          disabled={!device.is_active}
          id={`send-sms-${device.device_id}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="currentColor" strokeWidth="2" />
          </svg>
          Send Remote SMS
        </button>
      </div>
    </article>
  );
}
