import { useState } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw
} from 'lucide-react';
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
            <MessageSquare size={20} className="text-cyan" />
          </div>
          <div>
            <h2 className="sms-modal-title">Remote SMS Commander</h2>
            <p className="sms-modal-subtitle">
              Dispatching through <span className="font-mono">{device.device_name || device.device_id}</span>
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} id="close-sms-modal-btn">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSend} className="sms-form">
          <div className="form-group">
            <label htmlFor="sms-phone" className="form-label">
              <Phone size={13} className="text-muted" />
              <span>Target Recipient Phone Number</span>
            </label>
            <input
              id="sms-phone"
              type="tel"
              className="form-input font-mono"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              disabled={sending}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="sms-body" className="form-label">
              <MessageSquare size={13} className="text-muted" />
              <span>Message Content</span>
            </label>
            <textarea
              id="sms-body"
              className="form-textarea"
              rows={4}
              placeholder="Enter message text to transmit from device..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              disabled={sending}
              required
            />
            <div className="char-count font-mono">{message.length} chars</div>
          </div>

          {result && (
            <div className={`sms-result ${result.success ? 'sms-result--success' : 'sms-result--error'}`}>
              {result.success ? (
                <>
                  <CheckCircle2 size={16} className="text-success" />
                  <div>
                    <p className="result-title">Command Queued in Pipeline</p>
                    <p className="result-detail font-mono">
                      CMD ID: {result.data.command_id}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-danger" />
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
                  <RefreshCw size={13} className="spin-icon" />
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Send SMS Command</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
