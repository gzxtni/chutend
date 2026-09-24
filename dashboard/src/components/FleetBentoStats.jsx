import {
  Smartphone,
  Radio,
  BatteryCharging,
  BatteryWarning,
  Activity,
  Wifi,
  Compass,
  Layers,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import './FleetBentoStats.css';

export default function FleetBentoStats({ devices, onSwitchToMap }) {
  const total = devices.length;
  const activeDevices = devices.filter(
    d => d.is_active && d.last_seen_at &&
    (Date.now() - new Date(d.last_seen_at).getTime()) < 600000
  );
  const activeCount = activeDevices.length;
  const activeRatio = total > 0 ? Math.round((activeCount / total) * 100) : 0;

  const gpsDevices = devices.filter(
    d => d.latitude !== null && d.latitude !== undefined &&
         !isNaN(d.latitude) && !isNaN(d.longitude)
  );
  const gpsCount = gpsDevices.length;
  const gpsRatio = total > 0 ? Math.round((gpsCount / total) * 100) : 0;

  const validBatteries = devices
    .map(d => d.battery_level)
    .filter(b => b !== null && b !== undefined && !isNaN(b));
  const avgBattery = validBatteries.length > 0
    ? Math.round(validBatteries.reduce((a, b) => a + b, 0) / validBatteries.length)
    : 0;
  const lowBatteryCount = validBatteries.filter(b => b <= 20).length;

  return (
    <section className="bento-grid-section" aria-label="Fleet Metrics Overview">
      {/* Bento Card 1: Fleet Health & Active Ratio */}
      <div className="bento-card bento-card--health">
        <div className="bento-top-row">
          <div className="bento-icon-wrapper bento-icon--green">
            <Activity size={18} />
          </div>
          <span className="bento-status-badge badge--success">
            <span className="pulse-dot" />
            LIVE LINKED
          </span>
        </div>
        <div className="bento-metric-body">
          <span className="bento-metric-num font-mono">{activeCount} / {total}</span>
          <span className="bento-metric-label">Online Fleet Density</span>
        </div>
        <div className="bento-progress-track">
          <div
            className="bento-progress-fill fill--green"
            style={{ width: `${Math.max(activeRatio, 5)}%` }}
          />
        </div>
        <div className="bento-footer-row font-mono">
          <span>{activeRatio}% Operational Capacity</span>
          <span>{total - activeCount} Standby</span>
        </div>
      </div>

      {/* Bento Card 2: GPS Satellites & Geolocation */}
      <div className="bento-card bento-card--gps" onClick={onSwitchToMap} role="button" tabIndex={0}>
        <div className="bento-top-row">
          <div className="bento-icon-wrapper bento-icon--cyan">
            <Compass size={18} className="icon-spin-subtle" />
          </div>
          <span className="bento-status-badge badge--cyan">
            <Radio size={11} />
            RADAR ACTIVE
          </span>
        </div>
        <div className="bento-metric-body">
          <span className="bento-metric-num font-mono">{gpsCount} Fixed</span>
          <span className="bento-metric-label">Global Satellite Geolocation</span>
        </div>
        <div className="bento-progress-track">
          <div
            className="bento-progress-fill fill--cyan"
            style={{ width: `${Math.max(gpsRatio, 5)}%` }}
          />
        </div>
        <div className="bento-footer-row font-mono">
          <span className="text-cyan">{gpsRatio}% Position Locked</span>
          <span className="bento-click-hint">
            <span>View Radar</span>
            <ArrowUpRight size={13} />
          </span>
        </div>
      </div>

      {/* Bento Card 3: Battery & Energy Matrix */}
      <div className="bento-card bento-card--battery">
        <div className="bento-top-row">
          <div className="bento-icon-wrapper bento-icon--amber">
            <BatteryCharging size={18} />
          </div>
          {lowBatteryCount > 0 ? (
            <span className="bento-status-badge badge--warning">
              {lowBatteryCount} LOW POWER
            </span>
          ) : (
            <span className="bento-status-badge badge--success">
              POWER OPTIMAL
            </span>
          )}
        </div>
        <div className="bento-metric-body">
          <span className="bento-metric-num font-mono">{avgBattery}%</span>
          <span className="bento-metric-label">Average Fleet Power Reserve</span>
        </div>
        <div className="bento-progress-track">
          <div
            className={`bento-progress-fill ${avgBattery <= 20 ? 'fill--red' : avgBattery <= 50 ? 'fill--amber' : 'fill--green'}`}
            style={{ width: `${Math.max(avgBattery, 5)}%` }}
          />
        </div>
        <div className="bento-footer-row font-mono">
          <span>{validBatteries.length} Devices Reporting</span>
          <span className={lowBatteryCount > 0 ? 'text-danger' : 'text-muted'}>
            {lowBatteryCount > 0 ? `${lowBatteryCount} Need Charge` : 'Healthy Cells'}
          </span>
        </div>
      </div>

      {/* Bento Card 4: Network & Transport Intelligence */}
      <div className="bento-card bento-card--network">
        <div className="bento-top-row">
          <div className="bento-icon-wrapper bento-icon--purple">
            <Wifi size={18} />
          </div>
          <span className="bento-status-badge badge--purple">
            SECURE AES-256
          </span>
        </div>
        <div className="bento-metric-body">
          <span className="bento-metric-num font-mono">Real-Time</span>
          <span className="bento-metric-label">Bidirectional Command Relay</span>
        </div>
        <div className="bento-tags-row">
          <span className="bento-micro-tag font-mono">HTTP/2 Async</span>
          <span className="bento-micro-tag font-mono">Supabase PG</span>
          <span className="bento-micro-tag font-mono">EMM Agent</span>
        </div>
        <div className="bento-footer-row font-mono">
          <span className="text-muted">Telemetry Heartbeat</span>
          <span className="text-success">Active Sync</span>
        </div>
      </div>
    </section>
  );
}
