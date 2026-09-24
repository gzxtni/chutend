import { useState } from 'react';
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3>Remote System Controls</h3>
              <p className="modal-subtitle">{device.device_name || device.device_id}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="controls-body">
          {/* Section: Audio & Ringer Mode */}
          <div className="control-group">
            <div className="control-group-header">
              <span className="control-title">🔊 Ringer / Audio Profile</span>
              <span className="control-hint">Toggle device between sound profiles</span>
            </div>
            <div className="ringer-buttons">
              <button
                className="btn btn-outline ringer-btn ringer-silent"
                onClick={() => handleRingerMode('silent')}
                disabled={ringerLoading}
              >
                <span className="ringer-emoji">🔕</span>
                <span className="ringer-label">Silent</span>
              </button>
              <button
                className="btn btn-outline ringer-btn ringer-vibrate"
                onClick={() => handleRingerMode('vibrate')}
                disabled={ringerLoading}
              >
                <span className="ringer-emoji">📳</span>
                <span className="ringer-label">Vibrate</span>
              </button>
              <button
                className="btn btn-outline ringer-btn ringer-normal"
                onClick={() => handleRingerMode('normal')}
                disabled={ringerLoading}
              >
                <span className="ringer-emoji">🔔</span>
                <span className="ringer-label">Normal</span>
              </button>
            </div>
          </div>

          {/* Section: Screen Brightness */}
          <div className="control-group">
            <div className="control-group-header">
              <span className="control-title">☀️ Screen Brightness</span>
              <span className="control-value-badge">{Math.round((brightness / 255) * 100)}%</span>
            </div>
            <div className="brightness-slider-container">
              <input
                type="range"
                min="5"
                max="255"
                value={brightness}
                onChange={e => setBrightness(Number(e.target.value))}
                className="brightness-range"
              />
              <div className="preset-buttons">
                <button type="button" className="btn btn-xs btn-ghost" onClick={() => setBrightness(64)}>25%</button>
                <button type="button" className="btn btn-xs btn-ghost" onClick={() => setBrightness(128)}>50%</button>
                <button type="button" className="btn btn-xs btn-ghost" onClick={() => setBrightness(192)}>75%</button>
                <button type="button" className="btn btn-xs btn-ghost" onClick={() => setBrightness(255)}>100%</button>
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm apply-btn"
              onClick={handleApplyBrightness}
              disabled={brightnessLoading}
            >
              {brightnessLoading ? 'Applying...' : 'Apply Brightness'}
            </button>
          </div>

          {/* Section: Quick Actions (Ring Alarm & GPS) */}
          <div className="control-group">
            <div className="control-group-header">
              <span className="control-title">⚡ Quick Remote Actions</span>
            </div>
            <div className="quick-actions-grid">
              <button
                className="btn btn-outline quick-action-btn"
                onClick={handleRingDevice}
                disabled={ringLoading}
              >
                <span>🚨</span>
                <div>
                  <strong>Ring Device Alarm</strong>
                  <small>Play ringtone at full volume</small>
                </div>
              </button>
              <button
                className="btn btn-outline quick-action-btn"
                onClick={handleRequestLocation}
                disabled={locLoading}
              >
                <span>📍</span>
                <div>
                  <strong>Ping GPS Location</strong>
                  <small>Request immediate coordinates</small>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
