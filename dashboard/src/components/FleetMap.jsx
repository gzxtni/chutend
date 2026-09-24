import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Navigation,
  Crosshair,
  Smartphone,
  Battery,
  BatteryCharging,
  BatteryLow,
  Wifi,
  Radio,
  Sliders,
  MessageSquare,
  Layers,
  FileText,
  Search,
  RefreshCw,
  MapPin,
  Compass,
  AlertCircle
} from 'lucide-react';
import './FleetMap.css';

function getBatteryIcon(level) {
  if (level === null || level === undefined) return <Battery size={13} />;
  if (level <= 20) return <BatteryLow size={13} className="text-danger" />;
  if (level >= 90) return <BatteryCharging size={13} className="text-success" />;
  return <Battery size={13} className="text-warning" />;
}

// Map Tile Layer Configurations (CARTO + Clean Tactical Dark + Satellite)
const CARTO_API_BASE = import.meta.env.VITE_CARTO_API_BASE || 'https://gcp-asia-northeast1.api.carto.com';
const CARTO_KEY = import.meta.env.VITE_CARTO_BASEMAP_KEY || import.meta.env.VITE_CARTO_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhIjoiYWNfdWsyb3QybXoiLCJqdGkiOiI3MTFhOTUzNSJ9.F1euDbDt_HSeLmIKvZaYj3yhLCb5_BjZKTbPRNdVX9s';

const MAP_STYLES = {
  tactical: {
    id: 'tactical',
    name: 'Cyber Dark',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    className: 'leaflet-tile-tactical-dark',
    maxZoom: 19,
    subdomains: 'abc',
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a> &bull; Maxar, Earthstar Geographics',
    className: '',
    maxZoom: 19,
    subdomains: '',
  },
  carto_dark: {
    id: 'carto_dark',
    name: 'CARTO Dark',
    url: `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
    attribution: '&copy; <a href="https://carto.com/" target="_blank" rel="noreferrer">CARTO</a> &bull; OpenStreetMap',
    className: '',
    maxZoom: 20,
    subdomains: 'abcd',
  },
  carto_voyager: {
    id: 'carto_voyager',
    name: 'CARTO Voyager',
    url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
    attribution: '&copy; <a href="https://carto.com/" target="_blank" rel="noreferrer">CARTO</a> &bull; OpenStreetMap',
    className: '',
    maxZoom: 20,
    subdomains: 'abcd',
  }
};

export default function FleetMap({
  devices,
  selectedDevice,
  onOpenControls,
  onSendSms,
  onOpenApps,
  onFetchLogs,
  onRequestLocation,
  onSelectDevice
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});
  const [mapTheme, setMapTheme] = useState('tactical');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  // Filter devices with valid GPS coordinates
  const mappedDevices = devices.filter(
    d => d.latitude !== null && d.latitude !== undefined &&
         d.longitude !== null && d.longitude !== undefined &&
         !isNaN(d.latitude) && !isNaN(d.longitude)
  );

  const displayedDevices = mappedDevices.filter(d => {
    const matchesSearch =
      (d.device_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.device_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.model || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = filterActiveOnly ? d.is_active : true;
    return matchesSearch && matchesActive;
  });

  // Devices missing GPS coordinates
  const unmappedDevices = devices.filter(
    d => d.latitude === null || d.latitude === undefined ||
         d.longitude === null || d.longitude === undefined
  );

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultCenter = [20.5937, 78.9629]; // Default to global/India center or first device
      const initialCenter = mappedDevices.length > 0
        ? [mappedDevices[0].latitude, mappedDevices[0].longitude]
        : defaultCenter;

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: mappedDevices.length > 0 ? 12 : 4,
        zoomControl: false,
        attributionControl: true,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Default Clean Cyber Dark tiles (Zero Watermark)
      const initialStyle = MAP_STYLES[mapTheme] || MAP_STYLES.tactical;
      const tileLayer = L.tileLayer(initialStyle.url, {
        attribution: initialStyle.attribution,
        className: initialStyle.className,
        maxZoom: initialStyle.maxZoom,
        subdomains: initialStyle.subdomains || 'abc',
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update tileLayer when theme changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const style = MAP_STYLES[mapTheme] || MAP_STYLES.tactical;
    const newLayer = L.tileLayer(style.url, {
      attribution: style.attribution,
      className: style.className,
      maxZoom: style.maxZoom,
      subdomains: style.subdomains || 'abc',
    }).addTo(map);
    tileLayerRef.current = newLayer;
  }, [mapTheme]);

  // Update Markers on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    displayedDevices.forEach(device => {
      const isOnline = device.is_active && device.last_seen_at &&
        (Date.now() - new Date(device.last_seen_at).getTime()) < 600000;

      const markerColor = isOnline ? '#2563eb' : device.is_active ? '#059669' : '#e11d48';
      const statusClass = isOnline ? 'pulse-blue' : device.is_active ? 'pulse-green' : 'pulse-red';

      // Custom clean pin icon
      const customIcon = L.divIcon({
        className: 'fleet-radar-marker',
        html: `
          <div class="marker-container ${statusClass}">
            <div class="marker-pulse" style="border-color: ${markerColor}"></div>
            <div class="marker-pin" style="background: ${markerColor}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
            </div>
            <div class="marker-label">${device.device_name || device.device_id.slice(0, 8)}</div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -22],
      });

      const marker = L.marker([device.latitude, device.longitude], { icon: customIcon }).addTo(map);

      // Construct Popup content
      const popupDiv = document.createElement('div');
      popupDiv.className = 'fleet-popup-card';
      popupDiv.innerHTML = `
        <div class="fleet-popup-header">
          <div class="fleet-popup-title-col">
            <span class="fleet-popup-name">${device.device_name || device.device_id}</span>
            <span class="fleet-popup-id">${device.device_id}</span>
          </div>
          <span class="fleet-popup-badge ${isOnline ? 'online' : 'offline'}">
            ${isOnline ? 'ONLINE' : 'STANDBY'}
          </span>
        </div>
        <div class="fleet-popup-telemetry">
          <div class="popup-item">
            <span class="popup-label">COORDINATES</span>
            <span class="popup-val font-mono">${device.latitude.toFixed(5)}, ${device.longitude.toFixed(5)}</span>
          </div>
          <div class="popup-grid-2">
            <div class="popup-item">
              <span class="popup-label">BATTERY</span>
              <span class="popup-val">${device.battery_level !== null && device.battery_level !== undefined ? `${device.battery_level}%` : '—'}</span>
            </div>
            <div class="popup-item">
              <span class="popup-label">NETWORK</span>
              <span class="popup-val">${device.network_type || 'Cellular'}</span>
            </div>
          </div>
          <div class="popup-item">
            <span class="popup-label">IP ADDRESS</span>
            <span class="popup-val font-mono">${device.ip_address || '—'}</span>
          </div>
        </div>
        <div class="fleet-popup-actions">
          <button class="popup-btn popup-btn-controls" id="popup-controls-${device.device_id}">
            Controls
          </button>
          <button class="popup-btn popup-btn-sms" id="popup-sms-${device.device_id}">
            Send SMS
          </button>
          <button class="popup-btn popup-btn-apps" id="popup-apps-${device.device_id}">
            Apps
          </button>
          <button class="popup-btn popup-btn-logs" id="popup-logs-${device.device_id}">
            Logs
          </button>
        </div>
      `;

      // Wire button click listeners
      popupDiv.querySelector(`#popup-controls-${device.device_id}`)?.addEventListener('click', () => {
        onOpenControls(device);
      });
      popupDiv.querySelector(`#popup-sms-${device.device_id}`)?.addEventListener('click', () => {
        onSendSms(device);
      });
      popupDiv.querySelector(`#popup-apps-${device.device_id}`)?.addEventListener('click', () => {
        onOpenApps(device);
      });
      popupDiv.querySelector(`#popup-logs-${device.device_id}`)?.addEventListener('click', () => {
        onFetchLogs(device);
      });

      marker.bindPopup(popupDiv, { maxWidth: 320, minWidth: 280 });
      markersRef.current[device.device_id] = marker;
    });

    // Auto-fit if we have devices and no single device explicitly selected
    if (displayedDevices.length > 0 && !selectedDevice) {
      const bounds = L.latLngBounds(displayedDevices.map(d => [d.latitude, d.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [displayedDevices, selectedDevice]);

  // Pan to selected device if passed
  useEffect(() => {
    if (!selectedDevice || !mapInstanceRef.current) return;
    if (selectedDevice.latitude && selectedDevice.longitude) {
      mapInstanceRef.current.flyTo(
        [selectedDevice.latitude, selectedDevice.longitude],
        16,
        { duration: 1.2 }
      );
      const marker = markersRef.current[selectedDevice.device_id];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedDevice]);

  function handleFlyTo(device) {
    if (!mapInstanceRef.current) return;
    if (device.latitude && device.longitude) {
      mapInstanceRef.current.flyTo([device.latitude, device.longitude], 16, { duration: 1.2 });
      const marker = markersRef.current[device.device_id];
      if (marker) {
        marker.openPopup();
      }
      if (onSelectDevice) onSelectDevice(device);
    }
  }

  function handleFitAll() {
    if (!mapInstanceRef.current || displayedDevices.length === 0) return;
    const bounds = L.latLngBounds(displayedDevices.map(d => [d.latitude, d.longitude]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }

  return (
    <div className="fleet-map-wrapper">
      {/* Interactive Map Surface */}
      <div ref={mapContainerRef} className="fleet-map-canvas" id="fleet-leaflet-map" />

      {/* Cyber Radar HUD Top Bar */}
      <div className="fleet-map-hud">
        <div className="hud-badge hud-radar-status">
          <span className="radar-sweep-icon" />
          <span className="hud-title">LIVE GPS FLEET RADAR</span>
        </div>

        <div className="hud-stats-group">
          <div className="hud-stat">
            <span className="hud-stat-num text-cyan">{mappedDevices.length}</span>
            <span className="hud-stat-label">LOCKED</span>
          </div>
          <div className="hud-divider" />
          <div className="hud-stat">
            <span className="hud-stat-num text-muted">{unmappedDevices.length}</span>
            <span className="hud-stat-label">NO FIX</span>
          </div>
        </div>

        <button
          className="btn btn-outline btn-sm hud-action-btn"
          onClick={handleFitAll}
          title="Fit all tracked devices into view"
        >
          <Crosshair size={14} />
          <span>Fit Fleet</span>
        </button>

        <div className="hud-theme-toggle">
          <button
            className={`hud-theme-btn ${mapTheme === 'tactical' ? 'active' : ''}`}
            onClick={() => setMapTheme('tactical')}
            title="Clean Cyber Dark (Zero Watermarks)"
          >
            Cyber Dark
          </button>
          <button
            className={`hud-theme-btn ${mapTheme === 'satellite' ? 'active' : ''}`}
            onClick={() => setMapTheme('satellite')}
            title="High-Res Satellite Imagery"
          >
            Satellite
          </button>
          <button
            className={`hud-theme-btn ${mapTheme === 'carto_dark' ? 'active' : ''}`}
            onClick={() => setMapTheme('carto_dark')}
            title="CARTO Dark Matter"
          >
            CARTO Dark
          </button>
          <button
            className={`hud-theme-btn ${mapTheme === 'carto_voyager' ? 'active' : ''}`}
            onClick={() => setMapTheme('carto_voyager')}
            title="CARTO Voyager"
          >
            CARTO Streets
          </button>
        </div>
      </div>

      {/* Floating Collapsible Device Drawer */}
      <div className="fleet-map-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title-row">
            <Compass size={16} className="text-cyan" />
            <h3 className="sidebar-title">Tracked Targets</h3>
            <span className="sidebar-counter">{displayedDevices.length}</span>
          </div>

          <div className="sidebar-search">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search targets or IMEI..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="sidebar-search-input"
            />
          </div>
        </div>

        {/* Device target list */}
        <div className="sidebar-targets-list">
          {displayedDevices.length === 0 ? (
            <div className="sidebar-empty">
              <AlertCircle size={24} className="text-muted" />
              <p>No active GPS targets found</p>
            </div>
          ) : (
            displayedDevices.map(device => {
              const isOnline = device.is_active && device.last_seen_at &&
                (Date.now() - new Date(device.last_seen_at).getTime()) < 600000;
              const isSelected = selectedDevice?.device_id === device.device_id;

              return (
                <div
                  key={device.device_id}
                  className={`target-card ${isSelected ? 'target-card--active' : ''}`}
                  onClick={() => handleFlyTo(device)}
                >
                  <div className="target-card-top">
                    <div className="target-name-group">
                      <span className={`target-status-dot ${isOnline ? 'dot-cyan' : 'dot-muted'}`} />
                      <span className="target-name">{device.device_name || device.device_id}</span>
                    </div>
                    <span className="target-coord-pill">
                      {device.latitude.toFixed(3)}, {device.longitude.toFixed(3)}
                    </span>
                  </div>

                  <div className="target-card-meta">
                    <div className="target-meta-chip">
                      {getBatteryIcon(device.battery_level)}
                      <span>{device.battery_level !== null && device.battery_level !== undefined ? `${device.battery_level}%` : '—'}</span>
                    </div>
                    <div className="target-meta-chip">
                      <Wifi size={12} className="text-muted" />
                      <span>{device.network_type || 'Cellular'}</span>
                    </div>
                    {device.ip_address && (
                      <div className="target-meta-chip font-mono">
                        <span>{device.ip_address}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Unmapped Section */}
          {unmappedDevices.length > 0 && (
            <div className="unmapped-section">
              <div className="unmapped-header">
                <span>Targets Pending GPS Fix ({unmappedDevices.length})</span>
              </div>
              {unmappedDevices.map(dev => (
                <div key={dev.device_id} className="unmapped-row">
                  <div className="unmapped-name">
                    <span>{dev.device_name || dev.device_id}</span>
                    <span className="unmapped-id">{dev.device_id}</span>
                  </div>
                  <button
                    className="btn btn-outline btn-sm request-gps-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onRequestLocation) onRequestLocation(dev.device_id);
                    }}
                    title="Send remote GPS location request command to device"
                  >
                    <Navigation size={12} />
                    <span>Ping GPS</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
