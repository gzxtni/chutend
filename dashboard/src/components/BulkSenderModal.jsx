import { useState, useRef } from 'react';
import { Zap, Phone, Loader2, ArrowRight } from 'lucide-react';
import { executeCommand } from '../api';
import './BulkSenderModal.css';

export default function BulkSenderModal({ devices = [], onClose, addToast }) {
  const onlineDevices = devices.filter((d) => d.is_active);

  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Gesture drag-to-dismiss states
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const hasMovedRef = useRef(false);

  const smsParts = message.length === 0 ? 0 : Math.ceil(message.length / 160);

  function handlePointerDown(e) {
    if (loading) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    startYRef.current = e.clientY - dragY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!isDragging || loading) return;
    const currentY = e.clientY - startYRef.current;
    if (currentY > 4) hasMovedRef.current = true;
    const clampedY = Math.max(0, currentY);
    setDragY(clampedY);

    if (clampedY > 130) {
      setIsDragging(false);
      onClose();
    }
  }

  function handlePointerUp() {
    if (!isDragging || loading) return;
    setIsDragging(false);
    if (dragY > 60) {
      onClose();
    } else {
      setDragY(0);
    }
  }

  function handleHandleClick() {
    if (!hasMovedRef.current && !loading) {
      onClose();
    }
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
      for (const d of onlineDevices) {
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
        addToast && addToast(`SMS dispatched to ${recipient} via all ${successCount} online device(s)!`, 'success');
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
      <div
        className="apixer-sender-card"
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Interactive Drag Handle Zone — Tap or pull down to dismiss */}
        <div
          className="apixer-sheet-handle-zone"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleHandleClick}
          title="Drag down or tap to dismiss"
          role="button"
          tabIndex={0}
          aria-label="Drag down or tap to dismiss sheet"
        >
          <div className="apixer-sheet-notch" />
        </div>

        {/* Brand Graffiti Logo Hero Section */}
        <div className="apixer-sender-hero">
          <img
            src="/apixer-logo.png"
            alt="APIXER"
            className="apixer-sender-hero-img"
          />
        </div>

        {/* White Bottom Sheet Container */}
        <div className="apixer-sender-sheet-inner">
          <div className="apixer-sender-heading-section">
            <h1 className="apixer-sender-main-title" id="apixer-sender-title">
              DISPATCH TRANSMISSION
            </h1>
            <p className="apixer-sender-sub-description">
              Send carrier SMS simultaneously across all {onlineDevices.length} connected devices.
            </p>
          </div>

          <form onSubmit={handleSend} className="apixer-sender-form">
            {/* 1. Recipient Phone Number */}
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

            {/* 2. SMS Message Content */}
            <div className="apixer-input-group">
              <div className="apixer-input-label-row">
                <label className="apixer-field-label">SMS MESSAGE CONTENT</label>
                <span className="apixer-field-hint">
                  {message.length} chars · {smsParts} SMS
                </span>
              </div>

              <div className="apixer-textarea-box">
                <textarea
                  rows={4}
                  placeholder="Type message text to broadcast via cellular SIM..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="apixer-textarea-input"
                  required
                />
              </div>
            </div>

            {/* 3. Carrier Notice Card */}
            <div className="apixer-notice-card">
              <div className="apixer-notice-icon-box">
                <Zap size={15} />
              </div>
              <span className="apixer-notice-text">
                Carrier transmission will broadcast simultaneously across all {onlineDevices.length} online agent devices.
              </span>
            </div>

            {/* 4. Submit Pill Button */}
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
