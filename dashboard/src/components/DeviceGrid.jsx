import { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Smartphone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Radio,
  X
} from 'lucide-react';
import DeviceCard from './DeviceCard';
import './DeviceGrid.css';

export default function DeviceGrid({
  devices,
  loading,
  onFetchLogs,
  onSendSms,
  onOpenControls,
  onOpenApps,
  onLocateOnMap,
  onSwitchToMap
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, online, gps, low_batt

  const activeCount = devices.filter(d => d.is_active).length;
  const gpsCount = devices.filter(d => d.latitude !== null && d.latitude !== undefined).length;
  const lowBattCount = devices.filter(d => d.battery_level !== null && d.battery_level !== undefined && d.battery_level <= 20).length;

  const filteredDevices = devices.filter(d => {
    // Search filter
    const q = search.toLowerCase();
    const matchSearch =
      (d.device_name || '').toLowerCase().includes(q) ||
      (d.device_id || '').toLowerCase().includes(q) ||
      (d.model || '').toLowerCase().includes(q) ||
      (d.manufacturer || '').toLowerCase().includes(q) ||
      (d.ip_address || '').toLowerCase().includes(q);

    if (!matchSearch) return false;

    // Category filter
    if (filter === 'online') {
      const isOnline = d.is_active && d.last_seen_at &&
        (Date.now() - new Date(d.last_seen_at).getTime()) < 600000;
      return isOnline;
    }
    if (filter === 'gps') {
      return d.latitude !== null && d.latitude !== undefined;
    }
    if (filter === 'low_batt') {
      return d.battery_level !== null && d.battery_level !== undefined && d.battery_level <= 20;
    }

    return true;
  });

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
          <Smartphone size={40} className="text-muted" />
        </div>
        <h2>No Devices Registered</h2>
        <p>Enrolled Android devices running the EMM Agent will automatically populate here.</p>
      </div>
    );
  }

  return (
    <section className="device-grid-section" id="device-grid">
      {/* Grid Toolbar: Search & Quick Filters */}
      <div className="grid-toolbar">
        <div className="grid-search-box">
          <Search size={15} className="grid-search-icon" />
          <input
            type="text"
            placeholder="Search by name, IMEI, model, IP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="grid-search-input"
          />
          {search && (
            <button className="grid-search-clear" onClick={() => setSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="grid-filters">
          <button
            className={`grid-filter-pill ${filter === 'all' ? 'pill--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <span>All</span>
            <span className="pill-count">{devices.length}</span>
          </button>

          <button
            className={`grid-filter-pill ${filter === 'online' ? 'pill--active' : ''}`}
            onClick={() => setFilter('online')}
          >
            <span className="filter-dot filter-dot--green" />
            <span>Online</span>
            <span className="pill-count">{activeCount}</span>
          </button>

          <button
            className={`grid-filter-pill ${filter === 'gps' ? 'pill--active' : ''}`}
            onClick={() => setFilter('gps')}
          >
            <MapPin size={12} className="text-cyan" />
            <span>GPS Active</span>
            <span className="pill-count">{gpsCount}</span>
          </button>

          {lowBattCount > 0 && (
            <button
              className={`grid-filter-pill ${filter === 'low_batt' ? 'pill--active pill--warning' : ''}`}
              onClick={() => setFilter('low_batt')}
            >
              <AlertTriangle size={12} className="text-danger" />
              <span>Low Batt</span>
              <span className="pill-count">{lowBattCount}</span>
            </button>
          )}
        </div>

        {/* Quick Map Jump Button */}
        {onSwitchToMap && (
          <button
            className="btn btn-outline btn-sm map-view-shortcut"
            onClick={onSwitchToMap}
            title="Switch to full-screen interactive GPS radar map"
          >
            <Radio size={14} className="text-cyan" />
            <span>Open Radar Map</span>
          </button>
        )}
      </div>

      {/* Grid of Cards */}
      <div className="grid">
        {filteredDevices.map((device, index) => (
          <DeviceCard
            key={device.id}
            device={device}
            index={index}
            onFetchLogs={() => onFetchLogs(device)}
            onSendSms={() => onSendSms(device)}
            onOpenControls={() => onOpenControls(device)}
            onOpenApps={() => onOpenApps(device)}
            onLocateOnMap={() => onLocateOnMap && onLocateOnMap(device)}
          />
        ))}
      </div>
    </section>
  );
}
