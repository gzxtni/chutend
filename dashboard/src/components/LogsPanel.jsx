import { useState, useEffect } from 'react';
import { getDeviceEvents, getDeviceStats } from '../api';
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

export default function LogsPanel({ device, onClose, addToast }) {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [evts, st] = await Promise.all([
          getDeviceEvents(device.device_id, { limit: 100, eventType: filter || undefined }),
          getDeviceStats(device.device_id),
        ]);
        setEvents(evts);
        setStats(st);
        addToast(`Loaded ${evts.length} events for ${device.device_name || device.device_id}`, 'success');
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [device.device_id, filter]);

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

        {/* Stats Bar */}
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

        {/* Filter Tabs */}
        <div className="logs-filters">
          {['', 'sms_received', 'sms_sent', 'call_incoming', 'call_outgoing', 'call_missed'].map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'filter-tab--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f ? EVENT_ICONS[f] + ' ' + f.replace('_', ' ') : '🔍 All'}
            </button>
          ))}
        </div>

        {/* Events List */}
        <div className="logs-list">
          {loading ? (
            <div className="logs-loading">
              <span className="spinner spinner-lg" />
              <p>Fetching logs...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="logs-empty">
              <p>No events found</p>
            </div>
          ) : (
            events.map((evt, i) => (
              <div
                className="log-entry"
                key={evt.event_id}
                style={{ animationDelay: `${i * 30}ms` }}
              >
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
                  {evt.message_body && (
                    <p className="log-body">{evt.message_body}</p>
                  )}
                  {evt.call_duration != null && (
                    <p className="log-duration">Duration: {evt.call_duration}s</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
