import { useState } from 'react';
import { X, Smartphone, Zap, Sparkles, Phone, Loader2, ArrowRight } from 'lucide-react';
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
        {/* Drag Notch */}
        <div className="apixer-sheet-notch" />

        {/* Top Header Bar (Exact Login Top Bar) */}
        <div className="apixer-sender-top-bar">
          <h2 className="apixer-sender-brand-logo">
            APIX<span>E</span>R
          </h2>
          <button
            className="apixer-sender-back-pill"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <X size={15} />
            <span>Close</span>
          </button>
        </div>

        {/* Hero Naruto Character Section (Exact Login Hero on #e9f3f0) */}
        <div className="apixer-sender-hero">
          <img
            src="/login-hero.png"
            alt="Transmission Hero"
            className="apixer-sender-hero-img"
          />
        </div>

        {/* White Bottom Sheet Container (Exact Login Card Inner) */}
        <div className="apixer-sender-sheet-inner">
          <div className="apixer-sender-heading-section">
            <h1 className="apixer-sender-main-title" id="apixer-sender-title">
              DISPATCH TRANSMISSION
            </h1>
            <p className="apixer-sender-sub-description">
              Send carrier SMS directly via connected agent device SIMs.
            </p>
          </div>

          <form onSubmit={handleSend} className="apixer-sender-form">
            {/* 1. Recipient Phone Number (Exact Login Input Box) */}
            <div className="apixer-input-group">
              <label className="apixer-field-label">RECIPIENT PHONE NUMBER</label>
              <div className="apixer-input-box">
                <Phone size={18} className="apixer-input-icon" />
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

            {/* 2. Transmitter Device Node Chips (No "All" button) */}
            <div className="apixer-input-group">
              <div className="apixer-input-label-row">
                <label className="apixer-field-label">TRANSMITTER SENDER NODE</label>
                <span className="apixer-field-hint">{onlineDevices.length} Online</span>
              </div>

              <div className="apixer-nodes-list">
                {onlineDevices.map((d) => {
                  const name = d.device_name || d.model || (d.device_id ? d.device_id.slice(0, 12) : 'Agent');
                  const isSelected = selectedDeviceId === d.device_id;
                  return (
                    <button
                      key={d.device_id}
                      type="button"
                      className={`apixer-node-chip ${isSelected ? 'is-active' : ''}`}
                      onClick={() => setSelectedDeviceId(d.device_id)}
                    >
                      <Smartphone size={13} className="chip-icon" />
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
            <div className="apixer-input-group">
              <div className="apixer-input-label-row">
                <label className="apixer-field-label">SMS MESSAGE CONTENT</label>
                <span className="apixer-field-hint">
                  {message.length} chars · {smsParts} SMS
                </span>
              </div>

              {/* Quick Template Pills */}
              <div className="apixer-template-row">
                {QUICK_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    className="apixer-template-pill"
                    onClick={() => applyTemplate(tpl.text)}
                  >
                    <Sparkles size={11} style={{ color: '#3b82f6' }} />
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

            {/* 4. Carrier Notice Card */}
            <div className="apixer-notice-card">
              <div className="apixer-notice-icon-box">
                <Zap size={15} />
              </div>
              <span className="apixer-notice-text">
                Carrier transmission will execute immediately via agent device cellular radio.
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
    </div>
  );
}
