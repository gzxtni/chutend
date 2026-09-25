import { useState, useEffect } from 'react';
import { Radio, Trash2, Battery, Sliders, ChevronRight, Edit2 } from 'lucide-react';
import { getDeviceImage } from '../utils/deviceImages';
import { getDeviceSimProfile } from '../utils/simStorage';
import { autoDetectDeviceSim } from '../utils/autoDetectSim';
import SimEditModal from './SimEditModal';
import './MobileDeviceCard.css';

function formatInstallDate(dateStr) {
  if (!dateStr) return '24/08/2026 | 03:54 PM';
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hoursStr = String(hours).padStart(2, '0');
    return `${day}/${month}/${year} | ${hoursStr}:${minutes} ${ampm}`;
  } catch {
    return '24/08/2026 | 03:54 PM';
  }
}

export default function MobileDeviceCard({
  device,
  indexNumber,
  onSelectDevice,
  onPingLocation,
  onDelete
}) {
  const [simProfile, setSimProfile] = useState(() => getDeviceSimProfile(device.device_id, device));
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);

  useEffect(() => {
    setSimProfile(getDeviceSimProfile(device.device_id, device));

    // Automatically detect phone number from messages if not customized yet
    if (!device.phone_number && !device.sim_1) {
      autoDetectDeviceSim(device);
    }

    const handleProfileUpdate = (e) => {
      if (!e.detail?.deviceId || e.detail.deviceId === device.device_id) {
        setSimProfile(getDeviceSimProfile(device.device_id, device));
      }
    };
    window.addEventListener('emm:sim-profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('emm:sim-profile-updated', handleProfileUpdate);
  }, [device.device_id, device]);

  const isOnline = device.is_active && device.last_seen_at &&
    (Date.now() - new Date(device.last_seen_at).getTime()) < 600000;

  const androidVer = device.android_version ? `A${device.android_version}` : (device.model?.includes('G42') ? 'A15' : 'A16');
  const modelName = device.model || device.device_name || 'V2428';
  const batteryLevel = device.battery_level !== null && device.battery_level !== undefined ? device.battery_level : 42;

  // Real SIM slot 1 information
  let sim1Text = '';
  if (simProfile?.sim1) {
    sim1Text = `${simProfile.sim1}${simProfile.carrier1 ? ' · ' + simProfile.carrier1 : ''}`;
  } else if (device.sim_1 || device.phone_number) {
    sim1Text = `${device.sim_1 || device.phone_number}`;
  } else if (device.network_type && device.network_type !== 'Offline') {
    sim1Text = `${device.network_type} (Tap to set number)`;
  } else {
    sim1Text = 'Tap to set SIM number';
  }

  // SIM slot 2 - only if enabled/detected
  const hasSim2 = Boolean(simProfile?.hasSim2 || device.sim_2);
  let sim2Text = '';
  if (hasSim2) {
    if (simProfile?.sim2) {
      sim2Text = `${simProfile.sim2}${simProfile.carrier2 ? ' · ' + simProfile.carrier2 : ''}`;
    } else if (device.sim_2) {
      sim2Text = `${device.sim_2}`;
    } else {
      sim2Text = 'Slot 2 Active';
    }
  }

  const installDate = formatInstallDate(device.created_at || device.first_seen_at || device.last_seen_at);

  return (
    <article className="mobile-device-card" id={`card-${device.device_id}`}>
      {/* Top Main Row */}
      <div className="card-top-row">
        {/* Left: Realistic Device Image Thumbnail */}
        <div className="device-thumb-wrapper" title={`Device #${indexNumber} - ${modelName}`}>
          <img
            src={getDeviceImage(device)}
            alt={modelName}
            className="device-thumb-image"
            onError={(e) => { e.target.src = '/devices/generic.jpg'; }}
          />
          <span className="device-thumb-pill">#{indexNumber}</span>
        </div>

        {/* Center: Model Name, Version Pill, Subtitle */}
        <div className="device-title-col">
          <div className="device-model-row">
            <span className="device-model-name">{modelName}</span>
            <span className="android-version-badge">{androidVer}</span>
          </div>
          <p className="device-uuid-sub">
            {device.device_id.slice(0, 16)} · device id
          </p>
        </div>

        {/* Right Action Buttons */}
        <div className="card-quick-actions">
          {/* Antenna / Ping GPS Button */}
          <button
            className="action-circle-btn action-circle-btn--ping"
            onClick={() => onPingLocation && onPingLocation(device.device_id)}
            title="Ping device GPS location"
            aria-label="Ping device"
          >
            <Radio size={16} className="btn-icon--ping" />
          </button>

          {/* Delete / Deregister Button */}
          <button
            className="action-circle-btn action-circle-btn--delete"
            onClick={() => onDelete && onDelete(device)}
            title="Deregister device"
            aria-label="Delete device"
          >
            <Trash2 size={16} className="btn-icon--delete" />
          </button>

          {/* Controls / Hub Button */}
          <button
            className="action-circle-btn action-circle-btn--refresh"
            onClick={() => onSelectDevice && onSelectDevice(device)}
            title="Open Device Console"
            aria-label="Device console"
          >
            <Sliders size={15} className="btn-icon--refresh" />
          </button>
        </div>
      </div>

      {/* SIM Card Details */}
      <div
        className="card-sim-section"
        onClick={() => setIsSimModalOpen(true)}
        title="Tap to configure SIM numbers"
      >
        <div className="sim-rows-wrap">
          {/* SIM 1 */}
          <div className="sim-row">
            <svg className="sim-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <path d="M4 8h5v5H4z" />
              <path d="M15 8h5v5h-5z" />
              <path d="M9 13h6v5H9z" />
            </svg>
            <span className="sim-label">sim1</span>
            <span className={`sim-val ${!simProfile?.sim1 && !device.phone_number && !device.sim_1 ? 'sim-val--placeholder' : ''}`}>
              {sim1Text}
            </span>
          </div>

          {/* SIM 2 (if present) */}
          {hasSim2 && (
            <div className="sim-row">
              <svg className="sim-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="3" width="16" height="18" rx="2" />
                <path d="M4 8h5v5H4z" />
                <path d="M15 8h5v5h-5z" />
                <path d="M9 13h6v5H9z" />
              </svg>
              <span className="sim-label">sim2</span>
              <span className="sim-val">{sim2Text}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="sim-edit-trigger-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsSimModalOpen(true);
          }}
          title="Edit SIM"
          aria-label="Edit SIM"
        >
          <Edit2 size={12} />
        </button>
      </div>

      {/* Battery Pill & UPI Tag */}
      <div className="card-metrics-row">
        <div className="metric-battery-pill">
          <Battery size={13} className="battery-icon" />
          <span>{batteryLevel}%</span>
        </div>

        <div className="metric-upi-tag">
          <span className="upi-logo-text">UPI</span>
          <span className="upi-status-val">N/A</span>
        </div>
      </div>

      {/* Status & Install Date Row */}
      <div className="card-footer-row">
        <div className={`status-indicator-group ${isOnline ? 'is-online' : 'is-offline'}`}>
          <span className="status-dot-pulse" />
          <span className="status-text">{isOnline ? 'online' : 'offline'}</span>
        </div>

        <span className="install-date-text">
          Install {installDate}
        </span>
      </div>

      {/* Single Unified Device Management Action */}
      <div className="card-single-action-bar">
        <button
          type="button"
          className="device-manage-btn"
          onClick={() => onSelectDevice && onSelectDevice(device)}
          title="Open complete device hub"
        >
          <Sliders size={13} />
          <span>Manage Device</span>
          <ChevronRight size={14} className="manage-arrow" />
        </button>
      </div>

      {/* Interactive SIM Profile Configuration Modal */}
      <SimEditModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        device={device}
      />
    </article>
  );
}
