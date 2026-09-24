import DeviceCard from './DeviceCard';
import './DeviceGrid.css';

export default function DeviceGrid({
  devices,
  loading,
  onFetchLogs,
  onSendSms,
  onOpenControls,
  onOpenApps,
}) {
  if (loading && !devices.length) {
    return (
      <div className="grid-loading">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line skeleton-line--title" />
            <div className="skeleton-line skeleton-line--subtitle" />
            <div className="skeleton-row">
              <div className="skeleton-line skeleton-line--chip" />
              <div className="skeleton-line skeleton-line--chip" />
            </div>
            <div className="skeleton-row">
              <div className="skeleton-line skeleton-line--btn" />
              <div className="skeleton-line skeleton-line--btn" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!devices.length) {
    return (
      <div className="grid-empty">
        <div className="grid-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="2" width="14" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <line x1="9" y1="18" x2="15" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <h2>No devices registered</h2>
        <p>Register Android devices via the API to see them here.</p>
      </div>
    );
  }

  return (
    <section className="device-grid" id="device-grid">
      <h2 className="section-title">
        Fleet Devices
        <span className="section-count">{devices.length}</span>
      </h2>
      <div className="grid">
        {devices.map((device, index) => (
          <DeviceCard
            key={device.id}
            device={device}
            index={index}
            onFetchLogs={() => onFetchLogs(device)}
            onSendSms={() => onSendSms(device)}
            onOpenControls={() => onOpenControls(device)}
            onOpenApps={() => onOpenApps(device)}
          />
        ))}
      </div>
    </section>
  );
}
