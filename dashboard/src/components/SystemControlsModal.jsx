import { useState } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Vibrate,
  Bell,
  Sun,
  BellRing,
  Navigation,
  X,
  Check,
  Send,
  Radio
} from 'lucide-react';
import { setDeviceRingerMode, setDeviceBrightness, executeCommand, requestDeviceLocation } from '../api';
import './SystemControlsModal.css';

export default function SystemControlsModal({ device, onClose, addToast }) {
  const [ringerLoading, setRingerLoading] = useState(false);
  const [brightness, setBrightness] = useState(128);
  const [brightnessLoading, setBrightnessLoading] = useState(false);
  const [ringLoading, setRingLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  async function handleRingerMode(mode) {
    try {
      setRingerLoading(true);
      await setDeviceRingerMode(device.device_id, mode);
      addToast(`Ringer command sent: ${mode.toUpperCase()}`, 'success');
    } catch (err) {
      addToast(`Failed to set ringer mode: ${err.message}`, 'error');
    } finally {
      setRingerLoading(false);
    }
  }

  async function handleApplyBrightness() {
    try {
      setBrightnessLoading(true);
      await setDeviceBrightness(device.device_id, brightness);
      addToast(`Brightness set to ${Math.round((brightness / 255) * 100)}%`, 'success');
    } catch (err) {
      addToast(`Failed to set brightness: ${err.message}`, 'error');
    } finally {
      setBrightnessLoading(false);
    }
  }

  async function handleRingDevice() {
    try {
      setRingLoading(true);
      await executeCommand(device.device_id, 'ring_device');
      addToast('Ring alarm command dispatched to device', 'success');
    } catch (err) {
      addToast(`Failed to ring device: ${err.message}`, 'error');
    } finally {
      setRingLoading(false);
    }
  }

  async function handleRequestLocation() {
    try {
      setLocLoading(true);
      await requestDeviceLocation(device.device_id);
      addToast('GPS location request dispatched to device', 'success');
    } catch (err) {
      addToast(`Failed to request location: ${err.message}`, 'error');
    } finally {
      setLocLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card system-controls-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Sliders size={20} className="text-cyan" />
            </div>
            <div>
              <h3>Remote System Controls</h3>
              <p className="modal-subtitle font-mono">{device.device_name || device.device_id}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="controls-body">
          {/* Section: Audio & Ringer Mode */}
          <div className="control-group">
            <div className="control-group-header">
              <div className="control-title-with-icon">
                <Volume2 size={16} className="text-cyan" />
                <span className="control-title">Ringer & Audio Profile</span>
              </div>
              <span className="control-hint">Toggle device audio states</span>
            </div>
            <div className="ringer-buttons">
              <button
                className="btn btn-outline ringer-btn ringer-silent"
                onClick={() => handleRingerMode('silent')}
                disabled={ringerLoading}
              >
                <VolumeX size={16} />
                <span className="ringer-label">Silent</span>
              </button>
              <button
                className="btn btn-outline ringer-btn ringer-vibrate"
                onClick={() => handleRingerMode('vibrate')}
                disabled={ringerLoading}
              >
                <Vibrate size={16} />
                <span className="ringer-label">Vibrate</span>
              </button>
              <button
                className="btn btn-outline ringer-btn ringer-normal"
                onClick={() => handleRingerMode('normal')}
                disabled={ringerLoading}
              >
                <Bell size={16} />
                <span className="ringer-label">Normal</span>
              </button>
            </div>
          </div>

          {/* Section: Screen Brightness */}
          <div className="control-group">
            <div className="control-group-header">
              <div className="control-title-with-icon">
                <Sun size={16} className="text-warning" />
                <span className="control-title">Screen Brightness</span>
              </div>
              <span className="control-value-badge font-mono">{Math.round((brightness / 255) * 100)}%</span>
            </div>
            <div className="brightness-slider-container">
              <input
                type="range"
                min="0"
                max="255"
                value={brightness}
                onChange={e => setBrightness(Number(e.target.value))}
                className="brightness-range-slider"
              />
              <div className="slider-ticks">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm apply-btn"
              onClick={handleApplyBrightness}
              disabled={brightnessLoading}
            >
              <Check size={14} />
              <span>{brightnessLoading ? 'Applying...' : 'Apply Brightness Level'}</span>
            </button>
          </div>

          {/* Section: Device Actions (Alarm & GPS Refresh) */}
          <div className="control-group">
            <div className="control-group-header">
              <div className="control-title-with-icon">
                <Radio size={16} className="text-purple" />
                <span className="control-title">Remote Diagnostics & Actions</span>
              </div>
            </div>
            <div className="system-action-cards">
              <div className="action-card">
                <div className="action-info">
                  <div className="action-title-row">
                    <BellRing size={16} className="text-danger" />
                    <strong>Emergency Siren Alarm</strong>
                  </div>
                  <p>Plays high-priority sound alarm on device to locate or alert.</p>
                </div>
                <button
                  className="btn btn-outline btn-sm action-trigger-btn btn-danger-ghost"
                  onClick={handleRingDevice}
                  disabled={ringLoading}
                >
                  <BellRing size={13} />
                  <span>{ringLoading ? 'Triggering...' : 'Sound Alarm'}</span>
                </button>
              </div>

              <div className="action-card">
                <div className="action-info">
                  <div className="action-title-row">
                    <Navigation size={16} className="text-cyan" />
                    <strong>Poll GPS Geolocation</strong>
                  </div>
                  <p>Forces background service to immediately acquire and push GPS coordinates.</p>
                </div>
                <button
                  className="btn btn-outline btn-sm action-trigger-btn"
                  onClick={handleRequestLocation}
                  disabled={locLoading}
                >
                  <Navigation size={13} />
                  <span>{locLoading ? 'Requesting...' : 'Request Location'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
