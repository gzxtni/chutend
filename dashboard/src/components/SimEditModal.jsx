import { useState, useEffect } from 'react';
import { X, Check, Smartphone, Sparkles, Trash2 } from 'lucide-react';
import { getDeviceSimProfile, saveDeviceSimProfile, clearDeviceSimProfile } from '../utils/simStorage';
import { autoDetectDeviceSim } from '../utils/autoDetectSim';
import './SimEditModal.css';

const COMMON_CARRIERS = ['Jio True5G', 'Airtel 5G Plus', 'Vi India', 'BSNL'];

export default function SimEditModal({ isOpen, onClose, device }) {
  if (!isOpen || !device) return null;

  const currentProfile = getDeviceSimProfile(device.device_id, device);

  const [sim1Number, setSim1Number] = useState(currentProfile?.sim1 || '');
  const [sim1Carrier, setSim1Carrier] = useState(currentProfile?.carrier1 || '');
  const [hasSim2, setHasSim2] = useState(Boolean(currentProfile?.hasSim2));
  const [sim2Number, setSim2Number] = useState(currentProfile?.sim2 || '');
  const [sim2Carrier, setSim2Carrier] = useState(currentProfile?.carrier2 || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState('');

  useEffect(() => {
    const prof = getDeviceSimProfile(device.device_id, device);
    setSim1Number(prof?.sim1 || '');
    setSim1Carrier(prof?.carrier1 || '');
    setHasSim2(Boolean(prof?.hasSim2));
    setSim2Number(prof?.sim2 || '');
    setSim2Carrier(prof?.carrier2 || '');
    setSavedSuccess(false);
    setDetectMsg('');
  }, [device.device_id]);

  const handleAutoDetect = async () => {
    setDetecting(true);
    setDetectMsg('Scanning SMS for number...');
    try {
      const res = await autoDetectDeviceSim(device);
      if (res && res.sim1) {
        setSim1Number(res.sim1);
        if (res.carrier1) setSim1Carrier(res.carrier1);
        setDetectMsg(`Detected: ${res.sim1}`);
      } else {
        setDetectMsg('No operator number found in synced SMS');
      }
    } catch (e) {
      setDetectMsg('Could not scan messages');
    } finally {
      setDetecting(false);
      setTimeout(() => setDetectMsg(''), 4000);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveDeviceSimProfile(device.device_id, {
      sim1: sim1Number,
      carrier1: sim1Carrier,
      hasSim2,
      sim2: sim2Number,
      carrier2: sim2Carrier,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    clearDeviceSimProfile(device.device_id);
    setSim1Number('');
    setSim1Carrier('');
    setHasSim2(false);
    setSim2Number('');
    setSim2Carrier('');
    onClose();
  };

  const modelName = device.model || device.device_name || 'Device';

  return (
    <div className="sim-modal-overlay" onClick={onClose}>
      <div className="sim-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="sim-modal-header">
          <div className="sim-modal-title-row">
            <Smartphone size={18} className="sim-modal-icon" />
            <div>
              <h3 className="sim-modal-title">Configure SIM Cards</h3>
              <p className="sim-modal-sub">{modelName} · {device.device_id.slice(0, 16)}</p>
            </div>
          </div>
          <button className="sim-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="sim-modal-body">
          {/* SIM 1 Section */}
          <div className="sim-config-card">
            <div className="sim-config-header">
              <div className="sim-header-left">
                <span className="sim-chip-badge">SIM 1</span>
                <span className="sim-config-hint">Primary Slot</span>
              </div>
              <button
                type="button"
                className="sim-autodetect-btn"
                onClick={handleAutoDetect}
                disabled={detecting}
                title="Scan SMS for operator and recharge messages to auto-detect number"
              >
                <Sparkles size={12} className={detecting ? 'sim-spin' : ''} />
                <span>{detecting ? 'Scanning...' : 'Auto-Detect'}</span>
              </button>
            </div>

            {detectMsg && (
              <div className="sim-detect-notice">{detectMsg}</div>
            )}

            <div className="sim-field-group">
              <label className="sim-field-label">Phone Number</label>
              <input
                type="text"
                className="sim-input"
                placeholder="+91 98765 43210"
                value={sim1Number}
                onChange={(e) => setSim1Number(e.target.value)}
                autoFocus
              />
            </div>

            <div className="sim-field-group">
              <label className="sim-field-label">Carrier / Network Name</label>
              <input
                type="text"
                className="sim-input"
                placeholder="e.g. Jio True5G, Airtel"
                value={sim1Carrier}
                onChange={(e) => setSim1Carrier(e.target.value)}
              />
              <div className="sim-quick-chips">
                {COMMON_CARRIERS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`sim-chip-btn ${sim1Carrier === c ? 'active' : ''}`}
                    onClick={() => setSim1Carrier(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SIM 2 Section */}
          <div className="sim-config-card">
            <div className="sim-config-header">
              <div className="sim-toggle-row">
                <span className="sim-chip-badge sim-chip-badge--secondary">SIM 2</span>
                <label className="sim-switch-label">
                  <input
                    type="checkbox"
                    checked={hasSim2}
                    onChange={(e) => setHasSim2(e.target.checked)}
                    className="sim-switch-checkbox"
                  />
                  <span>Enable Slot 2</span>
                </label>
              </div>
            </div>

            {hasSim2 && (
              <div className="sim-slot2-fields">
                <div className="sim-field-group">
                  <label className="sim-field-label">Phone Number (SIM 2)</label>
                  <input
                    type="text"
                    className="sim-input"
                    placeholder="+91 91234 56789"
                    value={sim2Number}
                    onChange={(e) => setSim2Number(e.target.value)}
                  />
                </div>

                <div className="sim-field-group">
                  <label className="sim-field-label">Carrier / Network Name</label>
                  <input
                    type="text"
                    className="sim-input"
                    placeholder="e.g. Vi India, BSNL"
                    value={sim2Carrier}
                    onChange={(e) => setSim2Carrier(e.target.value)}
                  />
                  <div className="sim-quick-chips">
                    {COMMON_CARRIERS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`sim-chip-btn ${sim2Carrier === c ? 'active' : ''}`}
                        onClick={() => setSim2Carrier(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sim-modal-actions">
            <button
              type="button"
              className="sim-reset-btn"
              onClick={handleReset}
              title="Reset to default"
            >
              <Trash2 size={14} />
              <span>Reset</span>
            </button>

            <div className="sim-action-group-right">
              <button
                type="button"
                className="sim-cancel-btn"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`sim-save-btn ${savedSuccess ? 'saved' : ''}`}
              >
                {savedSuccess ? (
                  <>
                    <Check size={14} />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>Save SIM Numbers</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
