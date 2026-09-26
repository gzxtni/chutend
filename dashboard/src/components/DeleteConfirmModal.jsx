import { useState, useEffect } from 'react';
import { Trash2, AlertCircle, Smartphone, Loader2, X } from 'lucide-react';
import './DeleteConfirmModal.css';

export default function DeleteConfirmModal({ device, onConfirm, onCancel }) {
  const [isDeleting, setIsDeleting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !isDeleting) {
        onCancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleting, onCancel]);

  if (!device) return null;

  const deviceName = device.device_name || device.model || device.device_id;

  async function handleConfirmClick() {
    setIsDeleting(true);
    try {
      await onConfirm(device);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="apixer-delete-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="apixer-delete-title"
    >
      <div className="apixer-delete-card">
        {/* Top Header bar with APIXER logo and close button */}
        <div className="apixer-delete-top-bar">
          <h2 className="apixer-brand-logo">
            APIX<span>E</span>R
          </h2>
          <button
            className="apixer-close-pill"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Hero Naruto Character Section (Exact Login Hero Image) */}
        <div className="apixer-hero-section">
          <img
            src="/login-hero.png"
            alt="Security Purge Guard"
            className="apixer-hero-img"
          />
        </div>

        {/* Body Content */}
        <div className="apixer-delete-body">
          <div className="apixer-heading-stack">
            <span className="apixer-badge-pill">CRITICAL ACTION</span>
            <h3 className="apixer-main-title" id="apixer-delete-title">
              DELETE DEVICE
            </h3>
            <p className="apixer-sub-description">
              Purge device from database and wipe all telemetry records.
            </p>
          </div>

          {/* Target Device Input-Box Card (Login Input Style) */}
          <div className="apixer-field-group">
            <label className="apixer-field-label">TARGET DEVICE NODE</label>
            <div className="apixer-device-box">
              <div className="apixer-device-icon-box">
                <Smartphone size={18} />
              </div>
              <div className="apixer-device-info-col">
                <span className="apixer-device-name">{deviceName}</span>
                <span className="apixer-device-uuid">{device.device_id}</span>
              </div>
            </div>
          </div>

          {/* Danger Alert Notice (Matching Login error alert style) */}
          <div className="apixer-danger-alert">
            <AlertCircle size={17} className="apixer-alert-icon" />
            <span className="apixer-alert-text">
              <strong>Irreversible Purge:</strong> SMS, call logs, notifications, and commands will be permanently erased.
            </span>
          </div>

          {/* Action Pill Buttons (Exact Login & Onboarding Style) */}
          <div className="apixer-action-stack">
            <button
              type="button"
              className="apixer-delete-pill-btn"
              onClick={handleConfirmClick}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <span>PURGING DATABASE...</span>
                  <div className="apixer-btn-circle">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                </>
              ) : (
                <>
                  <span>PERMANENTLY DELETE</span>
                  <div className="apixer-btn-circle">
                    <Trash2 size={16} />
                  </div>
                </>
              )}
            </button>

            <button
              type="button"
              className="apixer-cancel-pill-btn"
              onClick={onCancel}
              disabled={isDeleting}
            >
              CANCEL & KEEP DEVICE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
