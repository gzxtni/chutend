import { useState } from 'react';
import { Send, X, Users, AlertCircle } from 'lucide-react';
import { executeCommand } from '../api';
import './ModalsCommon.css';

export default function BulkSenderModal({ devices = [], onClose, addToast }) {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('all_online'); // all_online, custom_phone
  const [loading, setLoading] = useState(false);

  const onlineDevices = devices.filter((d) => d.is_active);

  async function handleSend(e) {
    e.preventDefault();
    if (!message.trim()) {
      addToast && addToast('Message cannot be empty', 'warning');
      return;
    }

    setLoading(true);
    let successCount = 0;

    try {
      for (const d of onlineDevices) {
        try {
          await executeCommand(d.device_id, 'send_sms', {
            phone_number: recipient || d.phone_number || '+919999999999',
            message: message.trim(),
          });
          successCount++;
        } catch (err) {
          console.error(err);
        }
      }

      addToast && addToast(`Dispatched SMS payload to ${successCount} devices!`, 'success');
      onClose();
    } catch (err) {
      addToast && addToast(`Failed to dispatch: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mobile-modal-overlay">
      <div className="mobile-modal-card">
        <div className="mobile-modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-pill bg-blue-dim">
              <Send size={18} className="text-blue" />
            </div>
            <div>
              <h3 className="modal-title">Bulk Sender</h3>
              <p className="modal-sub">Broadcast SMS through all connected agent devices</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSend} className="mobile-modal-body">
          <div className="modal-field">
            <label className="modal-input-label">Dispatch Target</label>
            <div className="target-segmented-control">
              <button
                type="button"
                className={`segment-btn ${targetType === 'all_online' ? 'active' : ''}`}
                onClick={() => setTargetType('all_online')}
              >
                All Online Devices ({onlineDevices.length})
              </button>
              <button
                type="button"
                className={`segment-btn ${targetType === 'custom_phone' ? 'active' : ''}`}
                onClick={() => setTargetType('custom_phone')}
              >
                Custom Phone Number
              </button>
            </div>
          </div>

          {targetType === 'custom_phone' && (
            <div className="modal-field">
              <label className="modal-input-label">Recipient Phone Number</label>
              <input
                type="text"
                placeholder="+919876543210"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="modal-input"
                required
              />
            </div>
          )}

          <div className="modal-field">
            <label className="modal-input-label">SMS Message Content</label>
            <textarea
              rows={4}
              placeholder="Type message text to broadcast..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="modal-textarea"
              required
            />
          </div>

          <div className="modal-tip-box">
            <Users size={14} className="text-blue flex-shrink-0" />
            <span>This will queue an asynchronous SMS dispatch job across registered device SIMs.</span>
          </div>

          <button type="submit" className="btn-mobile-primary" disabled={loading || onlineDevices.length === 0}>
            <Send size={16} />
            <span>{loading ? 'Transmitting...' : `Broadcast to ${onlineDevices.length} Devices`}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
