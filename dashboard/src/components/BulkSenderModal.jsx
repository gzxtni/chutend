import { useState } from 'react';
import { Send, X, Users, AlertCircle, Smartphone, Radio, Zap, Sparkles, Phone, Loader2 } from 'lucide-react';
import { executeCommand } from '../api';
import './ModalsCommon.css';
import './BulkSenderModal.css';

const QUICK_TEMPLATES = [
  { label: '⚡ Quick Ping', text: 'EMM Fleet Ping: Communication verification check.' },
  { label: '🔔 Urgent Alert', text: 'URGENT: Please verify your device status immediately.' },
  { label: '📍 Status Check', text: 'EMM Status Check: Confirm device power and connectivity.' },
];

export default function BulkSenderModal({ devices = [], onClose, addToast }) {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('all_online'); // all_online, custom_phone
  const [loading, setLoading] = useState(false);

  const onlineDevices = devices.filter((d) => d.is_active);
  const smsParts = message.length === 0 ? 0 : Math.ceil(message.length / 160);

  function applyTemplate(tplText) {
    setMessage(tplText);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!message.trim()) {
      addToast && addToast('Message cannot be empty', 'warning');
      return;
    }

    if (targetType === 'custom_phone' && !recipient.trim()) {
      addToast && addToast('Please enter a recipient phone number', 'warning');
      return;
    }

    if (targetType === 'all_online' && onlineDevices.length === 0) {
      addToast && addToast('No online agent devices found to broadcast.', 'warning');
      return;
    }

    setLoading(true);
    let successCount = 0;

    try {
      if (targetType === 'custom_phone') {
        // Broadcast custom number via all online devices or first active device
        for (const d of onlineDevices) {
          try {
            await executeCommand(d.device_id, 'send_sms', {
              phone_number: recipient.trim(),
              message: message.trim(),
            });
            successCount++;
          } catch (err) {
            console.error(err);
          }
        }
        addToast && addToast(`SMS dispatched to ${recipient} via ${successCount} agent device(s)!`, 'success');
      } else {
        // Broadcast across all online devices
        for (const d of onlineDevices) {
          try {
            await executeCommand(d.device_id, 'send_sms', {
              phone_number: d.phone_number || recipient || '+919999999999',
              message: message.trim(),
            });
            successCount++;
          } catch (err) {
            console.error(err);
          }
        }
        addToast && addToast(`Dispatched SMS payload to ${successCount} devices!`, 'success');
      }

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
        {/* Top Sheet Drag Notch */}
        <div className="modal-sheet-notch" />

        {/* Modal Header */}
        <div className="bulk-modal-header">
          <div className="modal-title-wrap">
            <div className="modal-header-icon-box">
              <Send size={19} />
            </div>
            <div>
              <div className="modal-title-with-pill">
                <h3 className="modal-title">Bulk Sender</h3>
                {onlineDevices.length > 0 && (
                  <span className="modal-live-tag">
                    <span className="modal-live-dot" /> {onlineDevices.length} Online
                  </span>
                )}
              </div>
              <p className="modal-sub">Broadcast SMS through all connected agent devices</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSend} className="mobile-modal-body">
          {/* Dispatch Target Switcher */}
          <div className="modal-field">
            <label className="modal-input-label">Dispatch Target</label>
            <div className="target-segmented-control-modern">
              <button
                type="button"
                className={`segment-btn-modern ${targetType === 'all_online' ? 'active' : ''}`}
                onClick={() => setTargetType('all_online')}
              >
                <Radio size={13} />
                <span>All Online Devices</span>
                <span className="segment-count-badge">{onlineDevices.length}</span>
              </button>
              <button
                type="button"
                className={`segment-btn-modern ${targetType === 'custom_phone' ? 'active' : ''}`}
                onClick={() => setTargetType('custom_phone')}
              >
                <Phone size={13} />
                <span>Custom Phone Number</span>
              </button>
            </div>
          </div>

          {/* Target Nodes Status Strip (when all_online) */}
          {targetType === 'all_online' && (
            <div>
              {onlineDevices.length > 0 ? (
                <div className="online-nodes-preview-box">
                  <div className="preview-nodes-top">
                    <span>Active Sender Nodes ({onlineDevices.length})</span>
                    <span>Ready to Transmit</span>
                  </div>
                  <div className="preview-nodes-scroll">
                    {onlineDevices.map((d) => (
                      <div key={d.device_id} className="node-chip-badge">
                        <span className="node-chip-dot" />
                        <Smartphone size={12} className="text-blue" />
                        <span>{d.device_name || d.model || (d.device_id ? d.device_id.slice(0, 10) : 'Agent')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="nodes-empty-warning">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>No active agent devices currently online to broadcast.</span>
                </div>
              )}
            </div>
          )}

          {/* Custom Phone Number Input */}
          {targetType === 'custom_phone' && (
            <div className="modal-field">
              <label className="modal-input-label">Recipient Phone Number</label>
              <div className="modern-input-group">
                <Phone size={14} className="input-prefix-icon" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="modal-input"
                  required
                />
              </div>
            </div>
          )}

          {/* SMS Message Content Area */}
          <div className="modal-field">
            <div className="textarea-meta-header">
              <label className="modal-input-label">SMS Message Content</label>
              <span className="char-counter-tag">
                {message.length} chars · {smsParts} SMS
              </span>
            </div>

            {/* Quick Template Chips */}
            <div className="quick-template-chips">
              {QUICK_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(tpl.text)}
                  className="template-chip-btn"
                >
                  <Sparkles size={11} className="text-blue" />
                  <span>{tpl.label}</span>
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              placeholder="Type message text to broadcast..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="modal-textarea"
              required
            />
          </div>

          {/* Modern Tip / Notice Card */}
          <div className="modal-tip-box-modern">
            <div className="tip-box-icon-wrap">
              <Zap size={13} />
            </div>
            <span>
              This will queue an asynchronous SMS dispatch job across registered device SIMs. Carrier dispatch begins immediately upon transmission.
            </span>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="btn-modern-primary"
            disabled={loading || (targetType === 'all_online' && onlineDevices.length === 0)}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Transmitting SMS...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>
                  {targetType === 'all_online'
                    ? `Broadcast to ${onlineDevices.length} Device${onlineDevices.length === 1 ? '' : 's'}`
                    : 'Dispatch Custom SMS'}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
