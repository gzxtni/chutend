import { useState } from 'react';
import { Lock, X, Check, Eye, EyeOff } from 'lucide-react';
import './ModalsCommon.css';

export default function ChangePinModal({ onClose, addToast }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!newPin || newPin.length < 4) {
      addToast && addToast('New PIN must be at least 4 digits', 'warning');
      return;
    }
    if (newPin !== confirmPin) {
      addToast && addToast('PINs do not match', 'error');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addToast && addToast('Security PIN successfully updated!', 'success');
      onClose();
    }, 600);
  }

  return (
    <div className="mobile-modal-overlay">
      <div className="mobile-modal-card">
        <div className="mobile-modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-pill bg-blue-dim">
              <Lock size={18} className="text-blue" />
            </div>
            <div>
              <h3 className="modal-title">Change PIN</h3>
              <p className="modal-sub">Update your account password / security PIN</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mobile-modal-body">
          <div className="modal-field">
            <label className="modal-input-label">Current PIN / Password</label>
            <div className="modal-input-wrap">
              <input
                type={showPin ? 'text' : 'password'}
                placeholder="Enter current PIN"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                className="modal-input"
                required
              />
            </div>
          </div>

          <div className="modal-field">
            <label className="modal-input-label">New PIN / Password</label>
            <div className="modal-input-wrap">
              <input
                type={showPin ? 'text' : 'password'}
                placeholder="Enter new 4-6 digit PIN"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="modal-input"
                required
              />
              <button
                type="button"
                className="modal-input-btn"
                onClick={() => setShowPin(!showPin)}
              >
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="modal-field">
            <label className="modal-input-label">Confirm New PIN</label>
            <div className="modal-input-wrap">
              <input
                type={showPin ? 'text' : 'password'}
                placeholder="Re-enter new PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="modal-input"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-mobile-primary" disabled={loading}>
            {loading ? 'Updating PIN...' : 'Update PIN'}
          </button>
        </form>
      </div>
    </div>
  );
}
