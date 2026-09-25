import { useState } from 'react';
import { MessageSquare, Send, Smartphone, Search, Clock } from 'lucide-react';
import './MessagesTab.css';

export default function MessagesTab({ devices = [], onSendSms, onFetchLogs }) {
  const [selectedDevice, setSelectedDevice] = useState(devices[0] || null);
  const [quickMsg, setQuickMsg] = useState('');
  const [recipient, setRecipient] = useState('');

  return (
    <div className="messages-tab-page" id="messages-tab-page">
      <div className="messages-header-row">
        <h3 className="tab-main-heading">SMS & Messaging Hub</h3>
        <span className="tab-pill-badge">{devices.length} Devices</span>
      </div>

      {/* Device Picker Carousel */}
      <div className="device-picker-carousel">
        {devices.map((d, idx) => {
          const isSelected = selectedDevice?.device_id === d.device_id;
          return (
            <div
              key={d.device_id || idx}
              className={`device-pill-card ${isSelected ? 'is-selected' : ''}`}
              onClick={() => setSelectedDevice(d)}
            >
              <div className="picker-avatar">
                <Smartphone size={16} />
              </div>
              <div className="picker-info">
                <span className="picker-name">{d.model || d.device_name || 'V2428'}</span>
                <span className="picker-sub">#{devices.length - idx}</span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedDevice ? (
        <div className="messages-chat-container">
          <div className="chat-device-header">
            <div>
              <h4 className="chat-device-title">{selectedDevice.model || selectedDevice.device_name}</h4>
              <p className="chat-device-sub">{selectedDevice.device_id.slice(0, 18)} · Ready to transmit</p>
            </div>
            <button
              className="view-logs-btn"
              onClick={() => onFetchLogs && onFetchLogs(selectedDevice)}
            >
              Full Inbox
            </button>
          </div>

          <div className="quick-sms-card">
            <h5 className="quick-sms-title">Direct SMS Dispatch</h5>
            <input
              type="text"
              placeholder="Recipient phone number (+91...)"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="quick-input"
            />
            <textarea
              rows={3}
              placeholder="Type message text..."
              value={quickMsg}
              onChange={(e) => setQuickMsg(e.target.value)}
              className="quick-textarea"
            />
            <button
              className="quick-send-btn"
              onClick={() => {
                if (!quickMsg.trim()) return;
                onSendSms && onSendSms(selectedDevice);
              }}
            >
              <Send size={15} />
              <span>Send SMS via Device</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="no-device-selected">
          <MessageSquare size={36} className="text-muted" />
          <p>No device selected. Choose a device above to send or view SMS.</p>
        </div>
      )}
    </div>
  );
}
