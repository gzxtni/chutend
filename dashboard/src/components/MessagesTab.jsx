import { useEffect, useRef, useState, useCallback } from 'react';
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
  Zap,
  Globe
} from 'lucide-react';
import { getDeviceDisplayName } from '../utils/deviceNames';
import { getDeviceImage } from '../utils/deviceImages';
import './MessagesTab.css';

// Tile Layer Definitions
const MAP_THEMES = {
  voyager: {
    id: 'voyager',
    name: 'Street View',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    maxZoom: 19,
    subdomains: 'abcd',
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    subdomains: '',
  },
  dark: {
    id: 'dark',
    name: 'Cyber Dark',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    maxZoom: 19,
    subdomains: 'abcd',
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

  const [activeTheme, setActiveTheme] = useState('voyager');
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [pingingId, setPingingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter devices with valid GPS coordinates
  const mappedDevices = devices.filter(
    (d) =>
      d.latitude !== null &&
      d.latitude !== undefined &&
      d.longitude !== null &&
      d.longitude !== undefined &&
      !isNaN(d.latitude) &&
      !isNaN(d.longitude)
  );

  const activeMappedCount = mappedDevices.filter((d) => d.is_active).length;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center (India or fallback)
    const initialLat = mappedDevices.length > 0 ? mappedDevices[0].latitude : 20.5937;
    const initialLng = mappedDevices.length > 0 ? mappedDevices[0].longitude : 78.9629;
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
      subdomains: theme.subdomains
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
      subdomains: theme.subdomains
    }).addTo(mapInstanceRef.current);
  }, [activeTheme]);

  // Update Markers when mappedDevices change
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

    // Auto fit bounds on initial load if multiple devices
    if (bounds.length > 1 && !selectedDeviceId) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [mappedDevices, selectedDeviceId]);

  // Focus a specific device
  const handleFocusDevice = (device) => {
    if (!device.latitude || !device.longitude) return;
    setSelectedDeviceId(device.device_id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([device.latitude, device.longitude], 16, {
        animate: true,
        duration: 1
      });
    }
  };

  // Recenter map to fit all mapped devices
  const handleRecenter = () => {
    if (!mapInstanceRef.current || mappedDevices.length === 0) return;
    const bounds = mappedDevices.map((d) => [d.latitude, d.longitude]);
    if (bounds.length === 1) {
      mapInstanceRef.current.flyTo(bounds[0], 14, { animate: true });
    } else {
      mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
    }
    setSelectedDeviceId(null);
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
              className={`layer-segment-btn ${activeTheme === 'voyager' ? 'active' : ''}`}
              onClick={() => setActiveTheme('voyager')}
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

      {/* ── Devices Location Cards List ── */}
      <div className="radar-devices-section">
        <div className="section-title-bar">
          <span className="section-heading">Connected Fleet Terminals</span>
          <span className="section-count-badge">{devices.length} Total Nodes</span>
        </div>

        <div className="radar-device-cards-list">
          {devices.map((device, idx) => {
            const hasLocation =
              device.latitude !== null &&
              device.latitude !== undefined &&
              !isNaN(device.latitude);

            const isOnline = device.is_active;
            const isSelected = selectedDeviceId === device.device_id;
            const isPinging = pingingId === device.device_id;
            const displayName = getDeviceDisplayName(device);
            const deviceImage = getDeviceImage(device);

            return (
              <div
                key={device.device_id || idx}
                className={`radar-device-card ${isSelected ? 'is-selected' : ''}`}
                onClick={() => hasLocation && handleFocusDevice(device)}
              >
                {/* Device Icon / Image & Status */}
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
                        {device.sim_1 || device.phone_number || device.device_id.slice(0, 14)}
                      </span>
                      <span className="specs-bullet">•</span>
                      <span className="specs-battery">
                        {getBatteryIcon(device.battery_level)}
                        <span>{device.battery_level ?? '--'}%</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* GPS Coordinates or Fix Request */}
                <div className="radar-card-location-row">
                  {hasLocation ? (
                    <div className="location-coordinates-box">
                      <div className="coords-text-group">
                        <MapPin size={13} className="text-cyan" />
                        <span className="coords-nums">
                          {Number(device.latitude).toFixed(5)}, {Number(device.longitude).toFixed(5)}
                        </span>
                      </div>
                      {device.accuracy && (
                        <span className="coords-accuracy">±{Math.round(device.accuracy)}m</span>
                      )}
                    </div>
                  ) : (
                    <div className="location-no-fix-box">
                      <Radio size={13} className="text-amber" />
                      <span>No GPS fix recorded yet</span>
                    </div>
                  )}
                </div>

                {/* Card Actions Bar */}
                <div className="radar-card-actions-row">
                  {hasLocation && (
                    <>
                      <button
                        className="radar-action-btn btn-focus"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFocusDevice(device);
                        }}
                      >
                        <LocateFixed size={13} />
                        <span>Focus</span>
                      </button>

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${device.latitude},${device.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="radar-action-btn btn-ext-maps"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={13} />
                        <span>Maps</span>
                      </a>
                    </>
                  )}

                  <button
                    className={`radar-action-btn btn-ping ${isPinging ? 'pinging' : ''}`}
                    onClick={(e) => handlePing(e, device.device_id)}
                    disabled={isPinging}
                  >
                    <RefreshCw size={13} className={isPinging ? 'spin-icon' : ''} />
                    <span>{isPinging ? 'Pinging...' : 'Ping GPS'}</span>
                  </button>

                  <button
                    className="radar-action-btn btn-details"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDevice && onSelectDevice(device);
                    }}
                  >
                    <span>Details</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
