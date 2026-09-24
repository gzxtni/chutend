import { useState } from 'react';
import { executeCommand } from '../api';
import './SmsModal.css';

export default function SmsModal({ device, onClose, addToast }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const canSend = phoneNumber.trim().length >= 3 && message.trim().length > 0;

  async function handleSend(e) {
    e.preventDefault();
    if (!canSend || sending) return;

    setSending(true);
    setResult(null);

    try {
      const resp = await executeCommand(device.device_id, 'send_sms', {
        to: phoneNumber.trim(),
        message: message.trim(),
      });
      setResult({ success: true, data: resp });
      addToast(`SMS command queued for ${device.device_name || device.device_id}`, 'success');
    } catch (err) {
      setResult({ success: false, error: err.message });
      addToast(err.message, 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="sms-modal" id="sms-modal">
        <div className="sms-modal-header">
          <div className="sms-modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <h2 className="sms-modal-title">Send Remote SMS</h2>
            <p className="sms-modal-subtitle">
              via <strong>{device.device_name || device.device_id}</strong>
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} id="close-sms-modal-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSend} className="sms-form">
          <div className="form-group">
            <label htmlFor="sms-phone" className="form-label">Recipient Phone Number</label>
            <input
              id="sms-phone"
              type="tel"
              className="form-input"
              placeholder="+1 (234) 567-8900"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="sms-message" className="form-label">Message</label>
            <textarea
              id="sms-message"
              className="form-textarea"
              placeholder="Type your SMS message here..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              maxLength={1600}
              required
            />
            <span className="char-count">{message.length} / 1600</span>
          </div>

          {result && (
            <div className={`sms-result ${result.success ? 'sms-result--success' : 'sms-result--error'}`}>
              {result.success ? (
                <>
                  <span className="result-icon">✓</span>
                  <div>
                    <p className="result-title">Command Queued Successfully</p>
                    <p className="result-detail">
                      ID: <code>{result.data.command_id}</code>
                    </p>
                    <p className="result-detail">
                      Status: <strong>{result.data.status}</strong>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <span className="result-icon">✕</span>
                  <div>
                    <p className="result-title">Failed to Queue Command</p>
                    <p className="result-detail">{result.error}</p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="sms-form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-accent"
              disabled={!canSend || sending}
              id="submit-sms-btn"
            >
              {sending ? (
                <>
                  <span className="spinner" />
                  Sending...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M22 2L15 22l-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                  Send SMS Command
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
