import { useState, useEffect } from 'react';
import {
  FileText,
  MessageSquare,
  PhoneCall,
  Activity,
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
  PhoneMissed,
  PhoneOff,
  Search,
  RefreshCw,
  X,
  AlertCircle,
  Clock,
  User,
  Hash
} from 'lucide-react';
import {
  getDeviceEvents, getDeviceStats,
  getSmsLogs, getCallLogs,
  getCommunicationLogs, getCommunicationLogStats,
} from '../api';
import './LogsPanel.css';

function formatEventTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
}

function getEventIcon(type) {
  switch (type) {
    case 'sms_received':
    case 'inbox':
      return <ArrowDownLeft size={14} className="text-cyan" />;
    case 'sms_sent':
    case 'sent':
      return <ArrowUpRight size={14} className="text-blue" />;
    case 'call_incoming':
    case 'incoming':
      return <ArrowDownLeft size={14} className="text-success" />;
    case 'call_outgoing':
    case 'outgoing':
      return <ArrowUpRight size={14} className="text-purple" />;
    case 'call_missed':
    case 'missed':
      return <PhoneMissed size={14} className="text-danger" />;
    case 'rejected':
      return <PhoneOff size={14} className="text-danger" />;
    default:
      return <MessageSquare size={14} className="text-muted" />;
  }
}

export default function LogsPanel({ device, onClose, addToast }) {
  // Tab state: 'sms' | 'calls' | 'events' | 'comms'
  const [activeTab, setActiveTab] = useState('sms');

  // SMS Logs state (batch-synced)
  const [smsLogs, setSmsLogs] = useState([]);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsFilter, setSmsFilter] = useState('');

  // Call Logs state (batch-synced)
  const [callLogs, setCallLogs] = useState([]);
  const [callLoading, setCallLoading] = useState(false);
  const [callFilter, setCallFilter] = useState('');

  // Real-time Events state
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventFilter, setEventFilter] = useState('');

  // Communication Logs state
  const [commLogs, setCommLogs] = useState([]);
  const [commStats, setCommStats] = useState(null);
  const [commLoading, setCommLoading] = useState(false);
  const [commSearch, setCommSearch] = useState('');

  // ── Fetch SMS logs ──────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'sms') return;
    async function fetchSms() {
      setSmsLoading(true);
      try {
        const logs = await getSmsLogs(device.device_id, {
          limit: 100,
          smsType: smsFilter || undefined,
        });
        setSmsLogs(logs);
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setSmsLoading(false);
      }
    }
    fetchSms();
  }, [device.device_id, smsFilter, activeTab]);

  // ── Fetch Call logs ─────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'calls') return;
    async function fetchCalls() {
      setCallLoading(true);
      try {
        const logs = await getCallLogs(device.device_id, {
          limit: 100,
          callType: callFilter || undefined,
        });
        setCallLogs(logs);
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setCallLoading(false);
      }
    }
    fetchCalls();
  }, [device.device_id, callFilter, activeTab]);

  // ── Fetch Real-time Events ──────────────────────────────
  useEffect(() => {
    if (activeTab !== 'events') return;
    async function fetchEvents() {
      setEventsLoading(true);
      try {
        const [evData, stData] = await Promise.all([
          getDeviceEvents(device.device_id, {
            limit: 100,
            eventType: eventFilter || undefined,
          }),
          getDeviceStats(device.device_id),
        ]);
        setEvents(evData);
        setStats(stData);
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setEventsLoading(false);
      }
    }
    fetchEvents();
  }, [device.device_id, eventFilter, activeTab]);

  // ── Fetch Communication Logs ────────────────────────────
  useEffect(() => {
    if (activeTab !== 'comms') return;
    async function fetchCommLogs() {
      setCommLoading(true);
      try {
        const [logs, st] = await Promise.all([
          getCommunicationLogs(device.device_id, {
            limit: 100,
            search: commSearch || undefined,
          }),
          getCommunicationLogStats(device.device_id),
        ]);
        setCommLogs(logs);
        setCommStats(st);
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setCommLoading(false);
      }
    }
    fetchCommLogs();
  }, [device.device_id, commSearch, activeTab]);

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="logs-panel" id="logs-panel">
        {/* Header */}
        <div className="logs-header">
          <div className="logs-title-group">
            <div className="logs-icon-badge">
              <FileText size={18} className="text-cyan" />
            </div>
            <div>
              <h2 className="logs-title">Device Telemetry & Intel</h2>
              <p className="logs-subtitle font-mono">
                {device.device_name || device.device_id}
              </p>
            </div>
          </div>
          <button className="panel-close-btn" onClick={onClose} id="close-logs-btn">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="logs-nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'sms' ? 'active' : ''}`}
            onClick={() => setActiveTab('sms')}
            id="tab-sms-logs"
          >
            <MessageSquare size={14} />
            <span>SMS Logs</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'calls' ? 'active' : ''}`}
            onClick={() => setActiveTab('calls')}
            id="tab-call-logs"
          >
            <PhoneCall size={14} />
            <span>Call Logs</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'comms' ? 'active' : ''}`}
            onClick={() => setActiveTab('comms')}
            id="tab-comm-logs"
          >
            <Inbox size={14} />
            <span>SMS Archive</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
            id="tab-events-logs"
          >
            <Activity size={14} />
            <span>Live Webhook</span>
          </button>
        </div>

        {/* Tab: SMS Logs */}
        {activeTab === 'sms' && (
          <div className="tab-content">
            <div className="logs-filter-bar">
              <div className="filter-group">
                <button
                  className={`filter-btn ${smsFilter === '' ? 'active' : ''}`}
                  onClick={() => setSmsFilter('')}
                >
                  All ({smsLogs.length})
                </button>
                <button
                  className={`filter-btn ${smsFilter === 'inbox' ? 'active' : ''}`}
                  onClick={() => setSmsFilter('inbox')}
                >
                  Inbox
                </button>
                <button
                  className={`filter-btn ${smsFilter === 'sent' ? 'active' : ''}`}
                  onClick={() => setSmsFilter('sent')}
                >
                  Sent
                </button>
              </div>
            </div>

            <div className="logs-list">
              {smsLoading ? (
                <div className="logs-loading">
                  <RefreshCw size={24} className="spin-icon text-cyan" />
                  <p>Loading SMS history...</p>
                </div>
              ) : smsLogs.length === 0 ? (
                <div className="logs-empty">
                  <AlertCircle size={32} className="text-muted" />
                  <p>No SMS logs synchronized yet</p>
                </div>
              ) : (
                smsLogs.map(sms => (
                  <div key={sms.id} className="log-item">
                    <div className="log-item-icon">
                      {getEventIcon(sms.sms_type)}
                    </div>
                    <div className="log-item-content">
                      <div className="log-item-top">
                        <span className="log-address font-mono">{sms.address}</span>
                        <span className="log-time font-mono">{formatEventTime(sms.timestamp)}</span>
                      </div>
                      <p className="log-body">{sms.body || '<No Content>'}</p>
                      <span className={`log-badge badge-${sms.sms_type}`}>
                        {sms.sms_type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab: Call Logs */}
        {activeTab === 'calls' && (
          <div className="tab-content">
            <div className="logs-filter-bar">
              <div className="filter-group">
                <button
                  className={`filter-btn ${callFilter === '' ? 'active' : ''}`}
                  onClick={() => setCallFilter('')}
                >
                  All ({callLogs.length})
                </button>
                <button
                  className={`filter-btn ${callFilter === 'incoming' ? 'active' : ''}`}
                  onClick={() => setCallFilter('incoming')}
                >
                  Incoming
                </button>
                <button
                  className={`filter-btn ${callFilter === 'outgoing' ? 'active' : ''}`}
                  onClick={() => setCallFilter('outgoing')}
                >
                  Outgoing
                </button>
                <button
                  className={`filter-btn ${callFilter === 'missed' ? 'active' : ''}`}
                  onClick={() => setCallFilter('missed')}
                >
                  Missed
                </button>
              </div>
            </div>

            <div className="logs-list">
              {callLoading ? (
                <div className="logs-loading">
                  <RefreshCw size={24} className="spin-icon text-cyan" />
                  <p>Loading call history...</p>
                </div>
              ) : callLogs.length === 0 ? (
                <div className="logs-empty">
                  <AlertCircle size={32} className="text-muted" />
                  <p>No call logs synchronized yet</p>
                </div>
              ) : (
                callLogs.map(call => (
                  <div key={call.id} className="log-item">
                    <div className="log-item-icon">
                      {getEventIcon(call.call_type)}
                    </div>
                    <div className="log-item-content">
                      <div className="log-item-top">
                        <span className="log-address font-mono">
                          {call.contact_name ? `${call.contact_name} (${call.phone_number})` : call.phone_number}
                        </span>
                        <span className="log-time font-mono">{formatEventTime(call.timestamp)}</span>
                      </div>
                      <div className="call-meta-row">
                        <span className="call-duration font-mono">Duration: {call.duration_seconds}s</span>
                        <span className={`log-badge badge-${call.call_type}`}>
                          {call.call_type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab: Full SMS Archive */}
        {activeTab === 'comms' && (
          <div className="tab-content">
            <div className="logs-filter-bar">
              <div className="search-box">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search sender phone or message text..."
                  value={commSearch}
                  onChange={e => setCommSearch(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {commStats && (
              <div className="comm-stats-bar">
                <div className="comm-stat-chip">
                  <span className="stat-label">TOTAL STORED</span>
                  <span className="stat-value font-mono text-cyan">{commStats.total_logs}</span>
                </div>
                <div className="comm-stat-chip">
                  <span className="stat-label">UNIQUE SENDERS</span>
                  <span className="stat-value font-mono">{commStats.unique_senders}</span>
                </div>
              </div>
            )}

            <div className="logs-list">
              {commLoading ? (
                <div className="logs-loading">
                  <RefreshCw size={24} className="spin-icon text-cyan" />
                  <p>Loading inbox archive...</p>
                </div>
              ) : commLogs.length === 0 ? (
                <div className="logs-empty">
                  <AlertCircle size={32} className="text-muted" />
                  <p>No communication logs recorded</p>
                </div>
              ) : (
                commLogs.map(log => (
                  <div key={log.id} className="log-item">
                    <div className="log-item-icon">
                      <ArrowDownLeft size={14} className="text-cyan" />
                    </div>
                    <div className="log-item-content">
                      <div className="log-item-top">
                        <span className="log-address font-mono">{log.address}</span>
                        <span className="log-time font-mono">{formatEventTime(log.timestamp)}</span>
                      </div>
                      <p className="log-body">{log.body || '<Empty Message>'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab: Real-Time Webhook Events */}
        {activeTab === 'events' && (
          <div className="tab-content">
            <div className="logs-filter-bar">
              <div className="filter-group">
                <button
                  className={`filter-btn ${eventFilter === '' ? 'active' : ''}`}
                  onClick={() => setEventFilter('')}
                >
                  All ({events.length})
                </button>
                <button
                  className={`filter-btn ${eventFilter === 'sms_received' ? 'active' : ''}`}
                  onClick={() => setEventFilter('sms_received')}
                >
                  SMS In
                </button>
                <button
                  className={`filter-btn ${eventFilter === 'call_incoming' ? 'active' : ''}`}
                  onClick={() => setEventFilter('call_incoming')}
                >
                  Call In
                </button>
              </div>
            </div>

            <div className="logs-list">
              {eventsLoading ? (
                <div className="logs-loading">
                  <RefreshCw size={24} className="spin-icon text-cyan" />
                  <p>Streaming events...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="logs-empty">
                  <AlertCircle size={32} className="text-muted" />
                  <p>No real-time webhook events captured</p>
                </div>
              ) : (
                events.map(ev => (
                  <div key={ev.event_id} className="log-item">
                    <div className="log-item-icon">
                      {getEventIcon(ev.event_type)}
                    </div>
                    <div className="log-item-content">
                      <div className="log-item-top">
                        <span className="log-address font-mono">{ev.sender_number}</span>
                        <span className="log-time font-mono">{formatEventTime(ev.timestamp)}</span>
                      </div>
                      {ev.message_body && <p className="log-body">{ev.message_body}</p>}
                      {ev.call_duration !== null && ev.call_duration !== undefined && (
                        <span className="call-duration font-mono">Duration: {ev.call_duration}s</span>
                      )}
                      <span className={`log-badge badge-${ev.event_type}`}>
                        {ev.event_type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
