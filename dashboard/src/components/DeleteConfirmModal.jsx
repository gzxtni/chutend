import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Smartphone, Loader2 } from 'lucide-react';
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
      className="delete-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="delete-modal-card">
        <div className="delete-modal-top-accent" />

        <div className="delete-modal-content">
          <div className="delete-modal-icon-wrap">
            <Trash2 size={26} />
          </div>

          <h3 className="delete-modal-title" id="delete-modal-title">
            Delete Device?
          </h3>

          <p className="delete-modal-desc">
            This will permanently remove this device and all its records directly from the database.
          </p>

          <div className="delete-device-pill">
            <div className="delete-device-name-row">
              <Smartphone size={16} className="delete-device-icon" />
              <span className="delete-device-name">{deviceName}</span>
            </div>
            <span className="delete-device-id-code">{device.device_id}</span>
          </div>

          <div className="delete-modal-warning-box">
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              All associated SMS logs, call histories, commands, and telemetry will be erased. This action cannot be undone.
            </span>
          </div>

          <div className="delete-modal-actions">
            <button
              type="button"
              className="delete-btn-cancel"
              onClick={onCancel}
              disabled={isDeleting}
            >
              Cancel
            </button>

            <button
              type="button"
              className="delete-btn-confirm"
              onClick={handleConfirmClick}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="delete-spin-icon" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Delete Permanently</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
