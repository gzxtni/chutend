import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import {
  Navigation,
  Crosshair,
  MapPin,
  RefreshCw,
  Layers,
  ExternalLink,
  Battery,
  BatteryCharging,
  BatteryLow,
  Radio,
  Smartphone,
  ChevronRight,
  Shield,
  LocateFixed,
  Search,
  X,
  ChevronDown,
  Check
} from 'lucide-react';
import { getDeviceDisplayName } from '../utils/deviceNames';
import { getDeviceImage } from '../utils/deviceImages';
import './MessagesTab.css';

// 100% Free OpenStreetMap & Public Map Layers (No API Keys / Free Forever)
const MAP_THEMES = {
  osm: {
    id: 'osm',
    name: 'Street View',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    subdomains: 'abc',
    className: '',
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    subdomains: '',
    className: '',
  },
  dark: {
    id: 'dark',
    name: 'Cyber Dark',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    subdomains: 'abc',
    className: 'leaflet-tile-tactical-dark',
  }
};

function getBatteryIcon(level) {
  if (level === null || level === undefined) return <Battery size={13} />;
  if (level <= 20) return <BatteryLow size={13} className="text-red-500" />;
  if (level >= 80) return <BatteryCharging size={13} className="text-emerald-500" />;
  return <Battery size={13} className="text-amber-500" />;
}

export default function MessagesTab({
  devices = [],
  onSelectDevice,
  onPingLocation,
  onRefresh
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});

  const [activeTheme, setActiveTheme] = useState('osm');
  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.device_id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [pingingId, setPingingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync selected device if missing
  useEffect(() => {
    if (!selectedDeviceId && devices.length > 0) {
      setSelectedDeviceId(devices[0].device_id);
    }
  }, [devices, selectedDeviceId]);

  // Current active selected device object
  const currentDevice = useMemo(() => {
    return devices.find((d) => d.device_id === selectedDeviceId) || devices[0] || null;
  }, [devices, selectedDeviceId]);

  // Filter devices with valid GPS coordinates
  const mappedDevices = useMemo(() => {
    return devices.filter(
      (d) =>
        d.latitude !== null &&
        d.latitude !== undefined &&
        d.longitude !== null &&
        d.longitude !== undefined &&
        !isNaN(d.latitude) &&
        !isNaN(d.longitude)
    );
  }, [devices]);

  const activeMappedCount = mappedDevices.filter((d) => d.is_active).length;

  // Filtered devices for search dropdown
  const filteredDevices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return devices;
    return devices.filter((d) => {
      const name = (d.device_name || d.model || '').toLowerCase();
      const phone = (d.phone_number || d.sim_1 || '').toLowerCase();
      const id = (d.device_id || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || id.includes(q);
    });
  }, [devices, searchQuery]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center
    const initialLat = currentDevice?.latitude ?? (mappedDevices.length > 0 ? mappedDevices[0].latitude : 20.5937);
    const initialLng = currentDevice?.longitude ?? (mappedDevices.length > 0 ? mappedDevices[0].longitude : 78.9629);
    const initialZoom = mappedDevices.length > 0 ? 12 : 5;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false
    });

    const theme = MAP_THEMES[activeTheme];
    tileLayerRef.current = L.tileLayer(theme.url, {
      maxZoom: theme.maxZoom,
      subdomains: theme.subdomains,
      className: theme.className || ''
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Map Theme Switching
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const theme = MAP_THEMES[activeTheme];

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(theme.url, {
      maxZoom: theme.maxZoom,
      subdomains: theme.subdomains,
      className: theme.className || ''
    }).addTo(mapInstanceRef.current);
  }, [activeTheme]);

  // Update Markers when mappedDevices or selection changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clean up old markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    if (mappedDevices.length === 0) return;

    const bounds = [];

    mappedDevices.forEach((device) => {
      const isOnline = device.is_active;
      const isSelected = selectedDeviceId === device.device_id;
      const displayName = getDeviceDisplayName(device);
      const initials = displayName.slice(0, 10);

      const html = `
        <div class="radar-custom-marker ${isOnline ? 'online' : 'offline'} ${isSelected ? 'selected' : ''}">
          <div class="marker-pulse-ring"></div>
          <div class="marker-core-dot">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
          </div>
          <div class="marker-label-pill">
            <span>${initials}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html,
        className: 'radar-leaflet-marker',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -20]
      });

      const marker = L.marker([device.latitude, device.longitude], { icon: customIcon })
        .addTo(map)
        .on('click', () => {
          setSelectedDeviceId(device.device_id);
          map.flyTo([device.latitude, device.longitude], 16, { animate: true, duration: 0.8 });
        });

      bounds.push([device.latitude, device.longitude]);
      markersRef.current[device.device_id] = marker;
    });
  }, [mappedDevices, selectedDeviceId]);

  // Focus a specific device on map
  const handleFocusDevice = useCallback((device) => {
    if (!device?.latitude || !device?.longitude) return;
    setSelectedDeviceId(device.device_id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([device.latitude, device.longitude], 16, {
        animate: true,
        duration: 0.8
      });
    }
  }, []);

  // Recenter map to fit all mapped devices
  const handleRecenter = () => {
    if (!mapInstanceRef.current || mappedDevices.length === 0) return;
    const bounds = mappedDevices.map((d) => [d.latitude, d.longitude]);
    if (bounds.length === 1) {
      mapInstanceRef.current.flyTo(bounds[0], 14, { animate: true });
    } else {
      mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
    }
  };

  // Ping a device for GPS fix
  const handlePing = async (e, deviceId) => {
    e.stopPropagation();
    if (!onPingLocation) return;
    setPingingId(deviceId);
    try {
      await onPingLocation(deviceId);
    } finally {
      setTimeout(() => setPingingId(null), 1800);
    }
  };

  // Sync / Refresh
  const handleSyncAll = async () => {
    setIsRefreshing(true);
    if (onRefresh) await onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="location-radar-page" id="location-radar-page">
      {/* ── Top Header & Stats ── */}
      <div className="radar-header-card">
        <div className="radar-title-group">
          <div className="radar-title-row">
            <h2 className="radar-page-title">Live Device Radar</h2>
            <div className="radar-satellite-tag">
              <span className="radar-live-beacon" />
              <span>GPS SYNC</span>
            </div>
          </div>
          <p className="radar-sub-desc">
            Real-time telemetry, geofix coordinates & fleet location
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="radar-top-actions">
          {/* Map Layer Switcher */}
          <div className="radar-layer-segmented">
            <button
              className={`layer-segment-btn ${activeTheme === 'osm' ? 'active' : ''}`}
              onClick={() => setActiveTheme('osm')}
            >
              Street
            </button>
            <button
              className={`layer-segment-btn ${activeTheme === 'satellite' ? 'active' : ''}`}
              onClick={() => setActiveTheme('satellite')}
            >
              Satellite
            </button>
            <button
              className={`layer-segment-btn ${activeTheme === 'dark' ? 'active' : ''}`}
              onClick={() => setActiveTheme('dark')}
            >
              Cyber
            </button>
          </div>

          <button
            className={`radar-sync-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={handleSyncAll}
            title="Refresh GPS telemetry"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Telemetry Stats Strip */}
        <div className="radar-metrics-strip">
          <div className="metric-pill-item">
            <span className="metric-dot green" />
            <span className="metric-label">Online Active:</span>
            <span className="metric-value">{activeMappedCount}</span>
          </div>

          <div className="metric-pill-divider" />

          <div className="metric-pill-item">
            <span className="metric-dot blue" />
            <span className="metric-label">GPS Fixed:</span>
            <span className="metric-value">{mappedDevices.length} / {devices.length}</span>
          </div>
        </div>
      </div>

      {/* ── Interactive Leaflet GPS Map Container ── */}
      <div className="radar-map-wrapper">
        <div ref={mapContainerRef} className="radar-map-canvas" id="radar-map-canvas" />

        {/* Map Float Controls */}
        <div className="map-float-controls">
          <button
            className="map-control-circle-btn"
            onClick={handleRecenter}
            title="Recenter all devices"
          >
            <Crosshair size={18} />
          </button>
          <button
            className="map-control-circle-btn"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            title="Zoom in"
          >
            +
          </button>
          <button
            className="map-control-circle-btn"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            title="Zoom out"
          >
            −
          </button>
        </div>
      </div>

      {/* ── Search & Single Device Inspector Section ── */}
      <div className="radar-inspector-section">
        {/* Search Bar / Device Selector Trigger */}
        <div className="radar-search-trigger-bar">
          <div
            className="radar-search-box-input"
            onClick={() => setIsDropdownOpen(true)}
          >
            <Search size={16} className="radar-search-icon" />
            <input
              type="text"
              className="radar-search-text-field"
              placeholder="Search & select device (name, phone, ID)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
            />
            {searchQuery ? (
              <button
                className="radar-search-clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }}
              >
                <X size={14} />
              </button>
            ) : (
              <div className="radar-select-chevron">
                <ChevronDown size={15} />
              </div>
            )}
          </div>
        </div>

        {/* Dropdown Menu Modal / Sheet for Search Results */}
        {isDropdownOpen && (
          <>
            <div
              className="radar-dropdown-backdrop"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="radar-search-dropdown-card">
              <div className="dropdown-head-row">
                <span className="dropdown-head-title">Select Target Device</span>
                <span className="dropdown-head-badge">{filteredDevices.length} available</span>
              </div>

              <div className="dropdown-items-scroll">
                {filteredDevices.length === 0 ? (
                  <div className="dropdown-empty-row">
                    <span>No devices match "{searchQuery}"</span>
                  </div>
                ) : (
                  filteredDevices.map((d) => {
                    const hasFix =
                      d.latitude !== null &&
                      d.latitude !== undefined &&
                      !isNaN(d.latitude);
                    const isSelected = selectedDeviceId === d.device_id;
                    const dName = getDeviceDisplayName(d);
                    const dImage = getDeviceImage(d);

                    return (
                      <button
                        key={d.device_id}
                        className={`dropdown-device-entry ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          setSelectedDeviceId(d.device_id);
                          setIsDropdownOpen(false);
                          setSearchQuery('');
                          if (hasFix) {
                            handleFocusDevice(d);
                          }
                        }}
                      >
                        <div className="entry-thumb-box">
                          <img src={dImage} alt="" className="entry-thumb-img" />
                          <span className={`entry-beacon ${d.is_active ? 'online' : 'offline'}`} />
                        </div>

                        <div className="entry-meta-col">
                          <span className="entry-name">{dName}</span>
                          <span className="entry-sub">
                            {d.sim_1 || d.phone_number || d.device_id.slice(0, 14)}
                          </span>
                        </div>

                        <div className="entry-right-badge">
                          {hasFix ? (
                            <span className="badge-gps-fix">
                              <MapPin size={10} /> Fixed
                            </span>
                          ) : (
                            <span className="badge-gps-none">No GPS</span>
                          )}
                          {isSelected && <Check size={14} className="entry-check-icon" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Single Selected Device Telemetry Card ── */}
        {currentDevice ? (
          (() => {
            const hasLocation =
              currentDevice.latitude !== null &&
              currentDevice.latitude !== undefined &&
              !isNaN(currentDevice.latitude);
            const isOnline = currentDevice.is_active;
            const isPinging = pingingId === currentDevice.device_id;
            const displayName = getDeviceDisplayName(currentDevice);
            const deviceImage = getDeviceImage(currentDevice);

            return (
              <div className="radar-single-device-card">
                <div className="radar-card-header-row">
                  <div className="device-avatar-wrap">
                    <img src={deviceImage} alt={displayName} className="device-thumb-img" />
                    <span className={`device-pulse-beacon ${isOnline ? 'online' : 'offline'}`} />
                  </div>

                  <div className="device-meta-group">
                    <div className="device-name-row">
                      <h4 className="device-card-title">{displayName}</h4>
                      <span className={`status-pill ${isOnline ? 'online' : 'offline'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="device-sub-specs">
                      <span className="specs-phone">
                        {currentDevice.sim_1 || currentDevice.phone_number || currentDevice.device_id.slice(0, 14)}
                      </span>
                      <span className="specs-bullet">•</span>
                      <span className="specs-battery">
                        {getBatteryIcon(currentDevice.battery_level)}
                        <span>{currentDevice.battery_level ?? '--'}%</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* GPS Coordinates or Fix Status */}
                <div className="radar-card-location-row">
                  {hasLocation ? (
                    <div className="location-coordinates-box">
                      <div className="coords-text-group">
                        <MapPin size={13} className="text-cyan" />
                        <span className="coords-nums">
                          {Number(currentDevice.latitude).toFixed(5)}, {Number(currentDevice.longitude).toFixed(5)}
                        </span>
                      </div>
                      {currentDevice.accuracy && (
                        <span className="coords-accuracy">±{Math.round(currentDevice.accuracy)}m</span>
                      )}
                    </div>
                  ) : (
                    <div className="location-no-fix-box">
                      <Radio size={13} className="text-amber" />
                      <span>No GPS fix recorded yet — Ping to acquire fix</span>
                    </div>
                  )}
                </div>

                {/* Card Action Controls */}
                <div className="radar-card-actions-row">
                  {hasLocation && (
                    <>
                      <button
                        className="radar-action-btn btn-focus"
                        onClick={() => handleFocusDevice(currentDevice)}
                      >
                        <LocateFixed size={13} />
                        <span>Focus</span>
                      </button>

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${currentDevice.latitude},${currentDevice.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="radar-action-btn btn-ext-maps"
                      >
                        <ExternalLink size={13} />
                        <span>Maps</span>
                      </a>
                    </>
                  )}

                  <button
                    className={`radar-action-btn btn-ping ${isPinging ? 'pinging' : ''}`}
                    onClick={(e) => handlePing(e, currentDevice.device_id)}
                    disabled={isPinging}
                  >
                    <RefreshCw size={13} className={isPinging ? 'spin-icon' : ''} />
                    <span>{isPinging ? 'Pinging...' : 'Ping GPS'}</span>
                  </button>

                  <button
                    className="radar-action-btn btn-details"
                    onClick={() => onSelectDevice && onSelectDevice(currentDevice)}
                  >
                    <span>Full Details</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="radar-no-device-card">
            <Smartphone size={24} className="text-muted" />
            <p>No device connected in database</p>
          </div>
        )}
      </div>
    </div>
  );
}
