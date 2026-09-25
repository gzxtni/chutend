import { Database, FileText, Smartphone, HardDrive, Wifi, Radio } from 'lucide-react';
import './DataTab.css';

export default function DataTab({ devices = [], onFetchLogs }) {
  const activeCount = devices.filter((d) => d.is_active).length;
  const gpsCount = devices.filter((d) => d.latitude !== null && d.latitude !== undefined).length;

  return (
    <div className="data-tab-page" id="data-tab-page">
      <div className="data-header-row">
        <h3 className="tab-main-heading">Data & Telemetry Vault</h3>
        <span className="tab-pill-badge">Live Sync</span>
      </div>

      {/* Metric Cards Row */}
      <div className="data-stats-grid">
        <div className="data-stat-card">
          <div className="stat-card-icon bg-blue-dim">
            <Smartphone size={18} className="text-blue" />
          </div>
          <div>
            <p className="stat-card-val">{devices.length}</p>
            <p className="stat-card-lbl">Enrolled Devices</p>
          </div>
        </div>

        <div className="data-stat-card">
          <div className="stat-card-icon bg-green-dim">
            <Wifi size={18} className="text-green" />
          </div>
          <div>
            <p className="stat-card-val">{activeCount}</p>
            <p className="stat-card-lbl">Active Telemetry</p>
          </div>
        </div>

        <div className="data-stat-card">
          <div className="stat-card-icon bg-blue-dim">
            <Radio size={18} className="text-blue" />
          </div>
          <div>
            <p className="stat-card-val">{gpsCount}</p>
            <p className="stat-card-lbl">GPS Geofixes</p>
          </div>
        </div>

        <div className="data-stat-card">
          <div className="stat-card-icon bg-amber-dim">
            <Database size={18} className="text-amber" />
          </div>
          <div>
            <p className="stat-card-val">Encrypted</p>
            <p className="stat-card-lbl">Database Storage</p>
          </div>
        </div>
      </div>

      {/* Device Data Inspection List */}
      <div className="data-devices-container">
        <h4 className="data-section-title">Select Device to Inspect Logs</h4>

        <div className="data-device-list">
          {devices.map((device, idx) => (
            <div
              key={device.device_id || idx}
              className="data-device-item"
              onClick={() => onFetchLogs && onFetchLogs(device)}
            >
              <div className="data-device-left">
                <span className="data-index-pill">#{devices.length - idx}</span>
                <div>
                  <h5 className="data-device-name">{device.model || device.device_name || 'V2428'}</h5>
                  <p className="data-device-id">{device.device_id.slice(0, 16)}...</p>
                </div>
              </div>

              <button className="data-inspect-btn">
                <FileText size={14} />
                <span>Open Logs</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
