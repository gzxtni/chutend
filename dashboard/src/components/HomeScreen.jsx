import { useState } from 'react';
import {
  Smartphone,
  MessageSquare,
  Send,
  Database,
  Shield,
  Download,
  Key,
  Lock,
  Radio,
  Check,
  Clock,
  Wifi,
  ChevronRight,
  ArrowUpRight,
  Activity,
  Layers
} from 'lucide-react';
import { getStoredToken } from '../api';
import './HomeScreen.css';

export default function HomeScreen({
  manager,
  devices = [],
  totalDevices = 0,
  activeCount = 0,
  onNavigate,
  onOpenBulkSender,
  onOpenSessions,
  onOpenApk,
  onOpenAutoToken,
  onOpenChangePin,
  onOpenRadarMap
}) {
  const [copiedToken, setCopiedToken] = useState(false);

  // Dynamic greeting
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';

  const userName = (manager?.display_name || manager?.username || 'Administrator');

  function handleCopyToken(e) {
    e.stopPropagation();
    const token = getStoredToken() || 'emm_token_session_key';
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  }

  const services = [
    {
      id: 'devices',
      title: 'Device Matrix',
      tag: `${totalDevices} Nodes`,
      icon: Smartphone,
      color: '#0284c7',
      bgColor: '#e0f2fe',
      action: () => onNavigate('devices')
    },
    {
      id: 'messages',
      title: 'SMS Center',
      tag: 'Live inbox',
      icon: MessageSquare,
      color: '#059669',
      bgColor: '#dcfce7',
      action: () => onNavigate('messages')
    },
    {
      id: 'bulk',
      title: 'Bulk Sender',
      tag: 'Broadcast',
      icon: Send,
      color: '#7c3aed',
      bgColor: '#ede9fe',
      action: onOpenBulkSender
    },
    {
      id: 'data',
      title: 'Data Vault',
      tag: 'Call & SMS',
      icon: Database,
      color: '#d97706',
      bgColor: '#fef3c7',
      action: () => onNavigate('data')
    },
    {
      id: 'sessions',
      title: 'Security',
      tag: 'Controls',
      icon: Shield,
      color: '#e11d48',
      bgColor: '#ffe4e6',
      action: onOpenSessions
    },
    {
      id: 'apk',
      title: 'Client APK',
      tag: 'v2.4 Agent',
      icon: Download,
      color: '#0891b2',
      bgColor: '#cffafe',
      action: onOpenApk
    },
  ];

  const recentActivities = [
    {
      id: 1,
      title: 'GPS Geofix Acquired',
      time: 'Today, 11:42 AM',
      status: 'Live',
      iconBg: '#ecfdf5',
      iconColor: '#059669'
    },
    {
      id: 2,
      title: 'Heartbeat Synchronized',
      time: 'Today, 11:38 AM',
      status: 'Normal',
      iconBg: '#f0f9ff',
      iconColor: '#0284c7'
    },
    {
      id: 3,
      title: 'Telemetry Node Verified',
      time: 'Today, 11:20 AM',
      status: 'Encrypted',
      iconBg: '#f5f3ff',
      iconColor: '#7c3aed'
    },
    {
      id: 4,
      title: 'Agent Security Check',
      time: 'Today, 10:55 AM',
      status: 'Passed',
      iconBg: '#fef3c7',
      iconColor: '#d97706'
    }
  ];

  return (
    <div className="home-dashboard-wrapper" id="home-dashboard-wrapper">
      {/* 1. Welcoming Hero Banner */}
      <div className="home-hero-greeting-card">
        <div className="greeting-text-col">
          <div className="live-status-pill">
            <span className="live-pulse-dot" />
            <span>FLEET SYNCHRONIZED</span>
          </div>
          <h2 className="greeting-title">
            {greeting}, <span className="greeting-name">{userName}</span>
          </h2>
          <p className="greeting-sub">Manage connected devices, SMS payloads & telemetry.</p>
        </div>

        {/* Hero Fleet Overview Stats Row */}
        <div className="hero-fleet-stats-row">
          <div className="fleet-stat-box" onClick={() => onNavigate('devices')} role="button" tabIndex={0}>
            <div className="stat-num-row">
              <span className="stat-big-num">{activeCount}</span>
              <span className="stat-total-label">/ {totalDevices}</span>
            </div>
            <span className="stat-desc-label">Active Online</span>
          </div>

          <div className="fleet-stat-divider" />

          <button className="fleet-action-pill-btn" onClick={onOpenRadarMap}>
            <Radio size={15} className="pulse-radar-icon" />
            <span>Live GPS Radar</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* 2. Services Grid (3x2 Bento Cards) */}
      <div className="dashboard-section">
        <div className="section-header-row">
          <span className="section-title-label">Management Services</span>
          <span className="section-tag-pill">6 Modules</span>
        </div>

        <div className="services-bento-grid">
          {services.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="service-bento-card"
                onClick={item.action}
                id={`service-${item.id}`}
              >
                <div
                  className="service-icon-squircle"
                  style={{ backgroundColor: item.bgColor, color: item.color }}
                >
                  <Icon size={22} strokeWidth={2.2} />
                </div>
                <div className="service-text-group">
                  <span className="service-bento-title">{item.title}</span>
                  <span className="service-bento-tag">{item.tag}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Quick Security Tools (Dual Cards) */}
      <div className="dashboard-section">
        <span className="section-title-label">Quick Security Tools</span>

        <div className="tools-dual-grid">
          {/* Tool 1: Auto Token */}
          <div className="tool-bento-card" onClick={handleCopyToken} role="button" tabIndex={0}>
            <div className="tool-card-header">
              <div className="tool-icon-wrap bg-blue-soft">
                <Key size={16} className="text-blue" />
              </div>
              <button className={`tool-copy-badge ${copiedToken ? 'copied' : ''}`}>
                {copiedToken ? <Check size={12} /> : null}
                <span>{copiedToken ? 'Copied' : 'Copy Key'}</span>
              </button>
            </div>
            <div className="tool-card-body">
              <h4 className="tool-title">Auto Token</h4>
              <p className="tool-sub">1-Tap copy authentication token</p>
            </div>
          </div>

          {/* Tool 2: Change PIN */}
          <div className="tool-bento-card" onClick={onOpenChangePin} role="button" tabIndex={0}>
            <div className="tool-card-header">
              <div className="tool-icon-wrap bg-purple-soft">
                <Lock size={16} className="text-purple" />
              </div>
              <span className="tool-secure-badge">PIN Code</span>
            </div>
            <div className="tool-card-body">
              <h4 className="tool-title">Change PIN</h4>
              <p className="tool-sub">Update manager security code</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Real-time Activity History */}
      <div className="dashboard-section activity-section-padded">
        <div className="section-header-row">
          <span className="section-title-label">Activity Stream</span>
          <span className="activity-live-badge">Real-time</span>
        </div>

        <div className="activity-stream-card">
          {recentActivities.map((act, idx) => (
            <div key={act.id} className="activity-stream-item">
              <div
                className="activity-icon-badge"
                style={{ backgroundColor: act.iconBg, color: act.iconColor }}
              >
                <Activity size={15} strokeWidth={2.2} />
              </div>

              <div className="activity-info-col">
                <span className="activity-main-text">{act.title}</span>
                <span className="activity-sub-time">{act.time}</span>
              </div>

              <span className="activity-status-chip">{act.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
