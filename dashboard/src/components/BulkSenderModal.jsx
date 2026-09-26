import { useState } from 'react';
import { Send, X, Smartphone, Zap, Sparkles, Phone, Loader2, ArrowRight, Radio } from 'lucide-react';
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
  const [selectedDeviceId, setSelectedDeviceId] = useState('all'); // 'all' or specific device_id
  const [loading, setLoading] = useState(false);

  const onlineDevices = devices.filter((d) => d.is_active);
  const smsParts = message.length === 0 ? 0 : Math.ceil(message.length / 160);

  function applyTemplate(tplText) {
    setMessage(tplText);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!recipient.trim()) {
      addToast && addToast('Please enter a recipient phone number', 'warning');
      return;
    }
    if (!message.trim()) {
      addToast && addToast('Message cannot be empty', 'warning');
      return;
    }

    if (onlineDevices.length === 0) {
      addToast && addToast('No active agent devices online to transmit SMS.', 'warning');
      return;
    }

    setLoading(true);
    let successCount = 0;

    try {
      const targetDevices = selectedDeviceId === 'all'
        ? onlineDevices
        : onlineDevices.filter((d) => d.device_id === selectedDeviceId);

      for (const d of targetDevices) {
        try {
          await executeCommand(d.device_id, 'send_sms', {
            phone_number: recipient.trim(),
            message: message.trim(),
          });
          successCount++;
        } catch (err) {
          console.error('Failed to send SMS from device', d.device_id, err);
        }
      }

      if (successCount > 0) {
        addToast && addToast(`SMS dispatched to ${recipient} via ${successCount} device(s)!`, 'success');
        onClose();
      } else {
        addToast && addToast('Failed to dispatch SMS from device(s)', 'error');
      }
    } catch (err) {
      addToast && addToast(`Dispatch error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mobile-modal-overlay">
      <div className="mobile-modal-card bulk-sender-card-sheet">
        {/* Top Sheet Drag Notch */}
        <div className="modal-sheet-notch" />

        {/* Modal Header */}
        <div className="bulk-sender-top-header">
          <div className="bulk-brand-heading-row">
            <div className="bulk-header-icon-box">
              <Send size={18} />
            </div>
            <div className="bulk-title-stack">
              <div className="bulk-title-badge-row">
                <h3 className="bulk-main-title">DISPATCH TRANSMISSION</h3>
                {onlineDevices.length > 0 && (
                  <span className="bulk-online-pill">
                    <span className="bulk-online-dot" /> {onlineDevices.length} Online
                  </span>
                )}
              </div>
              <p className="bulk-sub-title">Transmit cellular SMS directly through registered device SIMs</p>
            </div>
          </div>
          <button className="bulk-close-circle-btn" onClick={onClose} aria-label="Close modal">
            <X size={17} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSend} className="bulk-sender-form-body">
          {/* 1. Recipient Phone Number */}
          <div className="bulk-field-group">
            <label className="bulk-field-label">RECIPIENT PHONE NUMBER</label>
            <div className="bulk-input-box">
              <Phone size={17} className="bulk-field-icon" />
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="bulk-text-input"
                autoFocus
                required
              />
            </div>
          </div>

          {/* 2. Sender Node Selector */}
          <div className="bulk-field-group">
            <div className="bulk-label-row">
              <label className="bulk-field-label">TRANSMITTER DEVICE / SENDER NODE</label>
              <span className="bulk-field-hint">{onlineDevices.length} Ready</span>
            </div>

            <div className="bulk-nodes-chip-row">
              <button
                type="button"
                className={`bulk-node-chip ${selectedDeviceId === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedDeviceId('all')}
              >
                <Radio size={12} />
                <span>All Online Nodes ({onlineDevices.length})</span>
              </button>

              {onlineDevices.map((d) => {
                const name = d.device_name || d.model || (d.device_id ? d.device_id.slice(0, 10) : 'Agent');
                const isSelected = selectedDeviceId === d.device_id;
                return (
                  <button
                    key={d.device_id}
                    type="button"
                    className={`bulk-node-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedDeviceId(d.device_id)}
                  >
                    <Smartphone size={12} />
                    <span>{name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. SMS Message Content */}
          <div className="bulk-field-group">
            <div className="bulk-label-row">
              <label className="bulk-field-label">SMS MESSAGE CONTENT</label>
              <span className="bulk-char-pill">
                {message.length} chars · {smsParts} SMS
              </span>
            </div>

            {/* Quick Template Chips */}
            <div className="bulk-template-pills-row">
              {QUICK_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(tpl.text)}
                  className="bulk-template-pill"
                >
                  <Sparkles size={11} className="pill-star" />
                  <span>{tpl.label}</span>
                </button>
              ))}
            </div>

            <div className="bulk-textarea-box">
              <textarea
                rows={4}
                placeholder="Type message text to broadcast via cellular SIM..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bulk-textarea-input"
                required
              />
            </div>
          </div>

          {/* 4. Carrier Dispatch Info Card */}
          <div className="bulk-notice-card">
            <div className="bulk-notice-icon-box">
              <Zap size={14} />
            </div>
            <span className="bulk-notice-text">
              Carrier transmission will execute immediately via agent device cellular radio. Instant carrier dispatch.
            </span>
          </div>

          {/* 5. Submit Pill Button (Matching Onboarding & Login Aesthetic) */}
          <button
            type="submit"
            className="bulk-submit-pill-btn"
            disabled={loading || onlineDevices.length === 0}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>TRANSMITTING SMS...</span>
              </>
            ) : (
              <>
                <span>DISPATCH TRANSMISSION</span>
                <div className="submit-circle-arrow">
                  <ArrowRight size={17} />
                </div>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
