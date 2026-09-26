import { useState } from 'react';
import { Send, X, Smartphone, Zap, Sparkles, Phone, Loader2, ArrowRight } from 'lucide-react';
import { executeCommand } from '../api';
import './BulkSenderModal.css';

const QUICK_TEMPLATES = [
  { label: '⚡ Quick Ping', text: 'EMM Fleet Ping: Communication verification check.' },
  { label: '🔔 Urgent Alert', text: 'URGENT: Please verify your device status immediately.' },
  { label: '📍 Status Check', text: 'EMM Status Check: Confirm device power and connectivity.' },
];

export default function BulkSenderModal({ devices = [], onClose, addToast }) {
  const onlineDevices = devices.filter((d) => d.is_active);

  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState(
    onlineDevices.length > 0 ? onlineDevices[0].device_id : ''
  );
  const [loading, setLoading] = useState(false);

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

    const targetDevice = onlineDevices.find((d) => d.device_id === selectedDeviceId) || onlineDevices[0];

    setLoading(true);

    try {
      await executeCommand(targetDevice.device_id, 'send_sms', {
        phone_number: recipient.trim(),
        message: message.trim(),
      });

      const devName = targetDevice.device_name || targetDevice.model || 'Device';
      addToast && addToast(`SMS dispatched to ${recipient} via ${devName}!`, 'success');
      onClose();
    } catch (err) {
      addToast && addToast(`Dispatch error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="apixer-sender-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="apixer-sender-title"
    >
      <div className="apixer-sender-card">
        {/* Top Sheet Drag Notch */}
        <div className="apixer-sheet-notch" />

        {/* Modal Header */}
        <div className="apixer-sender-top-header">
          <div className="apixer-brand-heading-row">
            <div className="apixer-header-icon-box">
              <Send size={18} />
            </div>
            <div className="apixer-title-stack">
              <div className="apixer-title-badge-row">
                <h3 className="apixer-sender-title" id="apixer-sender-title">
                  DISPATCH TRANSMISSION
                </h3>
                {onlineDevices.length > 0 && (
                  <span className="apixer-online-pill">
                    <span className="apixer-online-dot" /> {onlineDevices.length} Online
                  </span>
                )}
              </div>
              <p className="apixer-sub-title">Transmit cellular SMS directly through registered device SIMs</p>
            </div>
          </div>
          <button
            className="apixer-close-circle-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <X size={17} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSend} className="apixer-sender-form-body">
          {/* 1. Recipient Phone Number */}
          <div className="apixer-field-group">
            <label className="apixer-field-label">RECIPIENT PHONE NUMBER</label>
            <div className="apixer-input-box">
              <Phone size={17} className="apixer-field-icon" />
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="apixer-text-input"
                autoFocus
                required
              />
            </div>
          </div>

          {/* 2. Transmitter Device Node Selector (NO "All" option) */}
          <div className="apixer-field-group">
            <div className="apixer-label-row">
              <label className="apixer-field-label">TRANSMITTER DEVICE / SENDER NODE</label>
              <span className="apixer-field-hint">{onlineDevices.length} Ready</span>
            </div>

            <div className="apixer-nodes-chip-row">
              {onlineDevices.map((d) => {
                const name = d.device_name || d.model || (d.device_id ? d.device_id.slice(0, 12) : 'Agent');
                const isSelected = selectedDeviceId === d.device_id;
                return (
                  <button
                    key={d.device_id}
                    type="button"
                    className={`apixer-node-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedDeviceId(d.device_id)}
                  >
                    <Smartphone size={13} />
                    <span>{name}</span>
                  </button>
                );
              })}
              {onlineDevices.length === 0 && (
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  No online devices currently connected.
                </span>
              )}
            </div>
          </div>

          {/* 3. SMS Message Content */}
          <div className="apixer-field-group">
            <div className="apixer-label-row">
              <label className="apixer-field-label">SMS MESSAGE CONTENT</label>
              <span className="apixer-char-counter">
                {message.length} chars · {smsParts} SMS
              </span>
            </div>

            {/* Quick Template Pills */}
            <div className="apixer-template-pills-row">
              {QUICK_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  className="apixer-template-pill"
                  onClick={() => applyTemplate(tpl.text)}
                >
                  <Sparkles size={11} className="pill-star" />
                  <span>{tpl.label}</span>
                </button>
              ))}
            </div>

            <div className="apixer-textarea-box">
              <textarea
                rows={3}
                placeholder="Type message text to broadcast via cellular SIM..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="apixer-textarea-input"
                required
              />
            </div>
          </div>

          {/* 4. Carrier Dispatch Info Card */}
          <div className="apixer-notice-card">
            <div className="apixer-notice-icon-box">
              <Zap size={15} />
            </div>
            <span className="apixer-notice-text">
              Carrier transmission will execute immediately via agent device cellular radio. Instant carrier dispatch.
            </span>
          </div>

          {/* 5. Submit Pill Button (Exact Login & Onboarding Style) */}
          <button
            type="submit"
            className="apixer-submit-pill-btn"
            disabled={loading || onlineDevices.length === 0}
          >
            {loading ? (
              <>
                <span>TRANSMITTING SMS...</span>
                <div className="submit-circle-arrow">
                  <Loader2 size={17} className="animate-spin" />
                </div>
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
