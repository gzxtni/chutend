import { useState, useEffect } from 'react';
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

const EVENT_ICONS = {
  sms_received: '📩',
  sms_sent: '📤',
  call_incoming: '📞',
  call_outgoing: '📱',
  call_missed: '📵',
};

const EVENT_COLORS = {
  sms_received: 'var(--accent-cyan)',
  sms_sent: 'var(--accent-blue)',
  call_incoming: 'var(--accent-green)',
  call_outgoing: 'var(--accent-purple)',
  call_missed: 'var(--accent-red)',
};

const SMS_TYPE_ICONS = { inbox: '📩', sent: '📤', draft: '📝' };
const SMS_TYPE_COLORS = {
  inbox: 'var(--accent-cyan)',
  sent: 'var(--accent-blue)',
  draft: 'var(--accent-purple)',
};

const CALL_TYPE_ICONS = { incoming: '📞', outgoing: '📱', missed: '📵', rejected: '🚫' };
const CALL_TYPE_COLORS = {
  incoming: 'var(--accent-green)',
  outgoing: 'var(--accent-purple)',
  missed: 'var(--accent-red)',
  rejected: 'var(--accent-red)',
};

export default function LogsPanel({ device, onClose, addToast }) {
  // Tab state
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
        addToast(`Loaded ${logs.length} SMS logs`, 'success');
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
        addToast(`Loaded ${logs.length} call logs`, 'success');
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setCallLoading(false);
      }
    }
    fetchCalls();
  }, [device.device_id, callFilter, activeTab]);

  // ── Fetch real-time events ──────────────────────────────
  useEffect(() => {
    if (activeTab !== 'events') return;
    async function fetchEvents() {
      setEventsLoading(true);
      try {
        const [evts, st] = await Promise.all([
          getDeviceEvents(device.device_id, { limit: 100, eventType: eventFilter || undefined }),
          getDeviceStats(device.device_id),
        ]);
        setEvents(evts);
        setStats(st);
        addToast(`Loaded ${evts.length} events`, 'success');
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setEventsLoading(false);
      }
    }
    fetchEvents();
  }, [device.device_id, eventFilter, activeTab]);

  // ── Fetch communication logs ────────────────────────────
  useEffect(() => {
    if (activeTab !== 'comm-logs') return;
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
        addToast(`Loaded ${logs.length} communication logs`, 'success');
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
        <div className="logs-panel-header">
          <div>
            <h2 className="logs-panel-title">Device Logs</h2>
            <p className="logs-panel-device">{device.device_name || device.device_id}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} id="close-logs-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="logs-tab-bar">
          <button className={`logs-tab ${activeTab === 'sms' ? 'logs-tab--active' : ''}`}
            onClick={() => setActiveTab('sms')} id="tab-sms">
            📩 SMS
          </button>
          <button className={`logs-tab ${activeTab === 'calls' ? 'logs-tab--active' : ''}`}
            onClick={() => setActiveTab('calls')} id="tab-calls">
            📞 Calls
          </button>
          <button className={`logs-tab ${activeTab === 'events' ? 'logs-tab--active' : ''}`}
            onClick={() => setActiveTab('events')} id="tab-events">
            📡 Events
          </button>
          <button className={`logs-tab ${activeTab === 'comm-logs' ? 'logs-tab--active' : ''}`}
            onClick={() => setActiveTab('comm-logs')} id="tab-comm-logs">
            📋 History
          </button>
        </div>

        {/* ═══════ SMS Tab ═══════════════════════════════════ */}
        {activeTab === 'sms' && (
          <>
            <div className="logs-filters">
              {['', 'inbox', 'sent', 'draft'].map(f => (
                <button key={f}
                  className={`filter-tab ${smsFilter === f ? 'filter-tab--active' : ''}`}
                  onClick={() => setSmsFilter(f)}>
                  {f ? (SMS_TYPE_ICONS[f] || '') + ' ' + f : '🔍 All'}
                </button>
              ))}
            </div>
            <div className="logs-list">
              {smsLoading ? (
                <div className="logs-loading"><span className="spinner spinner-lg" /><p>Fetching SMS...</p></div>
              ) : smsLogs.length === 0 ? (
                <div className="logs-empty"><p>No SMS logs found</p></div>
              ) : (
                smsLogs.map((log, i) => (
                  <div className="log-entry" key={log.id} style={{ animationDelay: `${i * 25}ms` }}>
                    <div className="log-icon" style={{ color: SMS_TYPE_COLORS[log.sms_type] || 'var(--accent-cyan)' }}>
                      {SMS_TYPE_ICONS[log.sms_type] || '📩'}
                    </div>
                    <div className="log-content">
                      <div className="log-top">
                        <span className="log-type" style={{ color: SMS_TYPE_COLORS[log.sms_type] }}>
                          {log.sms_type}
                        </span>
                        <span className="log-time">{formatEventTime(log.timestamp)}</span>
                      </div>
                      <p className="log-number">{log.address}</p>
                      {log.body && <p className="log-body">{log.body}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ═══════ Calls Tab ═════════════════════════════════ */}
        {activeTab === 'calls' && (
          <>
            <div className="logs-filters">
              {['', 'incoming', 'outgoing', 'missed', 'rejected'].map(f => (
                <button key={f}
                  className={`filter-tab ${callFilter === f ? 'filter-tab--active' : ''}`}
                  onClick={() => setCallFilter(f)}>
                  {f ? (CALL_TYPE_ICONS[f] || '') + ' ' + f : '🔍 All'}
                </button>
              ))}
            </div>
            <div className="logs-list">
              {callLoading ? (
                <div className="logs-loading"><span className="spinner spinner-lg" /><p>Fetching calls...</p></div>
              ) : callLogs.length === 0 ? (
                <div className="logs-empty"><p>No call logs found</p></div>
              ) : (
                callLogs.map((log, i) => (
                  <div className="log-entry" key={log.id} style={{ animationDelay: `${i * 25}ms` }}>
                    <div className="log-icon" style={{ color: CALL_TYPE_COLORS[log.call_type] || 'var(--accent-green)' }}>
                      {CALL_TYPE_ICONS[log.call_type] || '📞'}
                    </div>
                    <div className="log-content">
                      <div className="log-top">
                        <span className="log-type" style={{ color: CALL_TYPE_COLORS[log.call_type] }}>
                          {log.call_type}
                        </span>
                        <span className="log-time">{formatEventTime(log.timestamp)}</span>
                      </div>
                      <p className="log-number">
                        {log.contact_name ? `${log.contact_name} (${log.phone_number})` : log.phone_number}
                      </p>
                      <p className="log-duration">Duration: {log.duration_seconds}s</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ═══════ Real-Time Events Tab ══════════════════════ */}
        {activeTab === 'events' && (
          <>
            {stats && (
              <div className="logs-stats">
                <div className="logs-stat">
                  <span className="logs-stat-value">{stats.total_events}</span>
                  <span className="logs-stat-label">Total Events</span>
                </div>
                <div className="logs-stat">
                  <span className="logs-stat-value">{stats.unique_contacts}</span>
                  <span className="logs-stat-label">Contacts</span>
                </div>
                {Object.entries(stats.event_counts || {}).map(([type, count]) => (
                  <div className="logs-stat" key={type}>
                    <span className="logs-stat-value" style={{ color: EVENT_COLORS[type] }}>{count}</span>
                    <span className="logs-stat-label">{type.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="logs-filters">
              {['', 'sms_received', 'sms_sent', 'call_incoming', 'call_outgoing', 'call_missed'].map(f => (
                <button key={f}
                  className={`filter-tab ${eventFilter === f ? 'filter-tab--active' : ''}`}
                  onClick={() => setEventFilter(f)}>
                  {f ? EVENT_ICONS[f] + ' ' + f.replace('_', ' ') : '🔍 All'}
                </button>
              ))}
            </div>
            <div className="logs-list">
              {eventsLoading ? (
                <div className="logs-loading"><span className="spinner spinner-lg" /><p>Fetching events...</p></div>
              ) : events.length === 0 ? (
                <div className="logs-empty"><p>No events found</p></div>
              ) : (
                events.map((evt, i) => (
                  <div className="log-entry" key={evt.event_id} style={{ animationDelay: `${i * 25}ms` }}>
                    <div className="log-icon" style={{ color: EVENT_COLORS[evt.event_type] }}>
                      {EVENT_ICONS[evt.event_type] || '📋'}
                    </div>
                    <div className="log-content">
                      <div className="log-top">
                        <span className="log-type" style={{ color: EVENT_COLORS[evt.event_type] }}>
                          {evt.event_type.replace('_', ' ')}
                        </span>
                        <span className="log-time">{formatEventTime(evt.timestamp)}</span>
                      </div>
                      <p className="log-number">{evt.sender_number}</p>
                      {evt.message_body && <p className="log-body">{evt.message_body}</p>}
                      {evt.call_duration != null && <p className="log-duration">Duration: {evt.call_duration}s</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ═══════ Communication Logs Tab ════════════════════ */}
        {activeTab === 'comm-logs' && (
          <>
            {commStats && (
              <div className="logs-stats">
                <div className="logs-stat">
                  <span className="logs-stat-value">{commStats.total_logs}</span>
                  <span className="logs-stat-label">Total Logs</span>
                </div>
                <div className="logs-stat">
                  <span className="logs-stat-value">{commStats.unique_senders}</span>
                  <span className="logs-stat-label">Unique Senders</span>
                </div>
                {commStats.earliest_log && (
                  <div className="logs-stat">
                    <span className="logs-stat-value" style={{ fontSize: '0.75rem' }}>
                      {formatEventTime(commStats.earliest_log.timestamp)}
                    </span>
                    <span className="logs-stat-label">Earliest</span>
                  </div>
                )}
                {commStats.latest_log && (
                  <div className="logs-stat">
                    <span className="logs-stat-value" style={{ fontSize: '0.75rem' }}>
                      {formatEventTime(commStats.latest_log.timestamp)}
                    </span>
                    <span className="logs-stat-label">Latest</span>
                  </div>
                )}
              </div>
            )}
            <div className="logs-filters">
              <input id="comm-log-search" type="text" className="comm-log-search-input"
                placeholder="🔍  Search messages or sender..."
                value={commSearch} onChange={e => setCommSearch(e.target.value)} />
            </div>
            <div className="logs-list">
              {commLoading ? (
                <div className="logs-loading"><span className="spinner spinner-lg" /><p>Fetching history...</p></div>
              ) : commLogs.length === 0 ? (
                <div className="logs-empty">
                  <p>No communication logs found</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem' }}>
                    Logs appear after the device syncs its SMS inbox history
                  </p>
                </div>
              ) : (
                commLogs.map((log, i) => (
                  <div className="log-entry" key={log.id} style={{ animationDelay: `${i * 25}ms` }}>
                    <div className="log-icon" style={{ color: 'var(--accent-cyan)' }}>📩</div>
                    <div className="log-content">
                      <div className="log-top">
                        <span className="log-type" style={{ color: 'var(--accent-cyan)' }}>received</span>
                        <span className="log-time">{formatEventTime(log.timestamp)}</span>
                      </div>
                      <p className="log-number">{log.address}</p>
                      {log.body && <p className="log-body">{log.body}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
