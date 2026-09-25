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
  Plus,
  Radio,
  Check,
  Clock,
  ArrowUpRight,
  Wifi,
  ChevronRight
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

  const services = [
    {
      id: 'devices',
      title: 'Device Matrix',
      desc: 'All connected phones',
      icon: Smartphone,
      color: '#0284c7',
      bgColor: '#f0f9ff',
      action: () => onNavigate('devices')
    },
    {
      id: 'messages',
      title: 'SMS Center',
      desc: 'Live inbox & chats',
      icon: MessageSquare,
      color: '#059669',
      bgColor: '#ecfdf5',
      action: () => onNavigate('messages')
    },
    {
      id: 'bulk',
      title: 'Bulk Sender',
      desc: 'Broadcast SMS blast',
      icon: Send,
      color: '#7c3aed',
      bgColor: '#f5f3ff',
      action: onOpenBulkSender
    },
    {
      id: 'data',
      title: 'Data Vault',
      desc: 'Call & SMS logs',
      icon: Database,
      color: '#d97706',
      bgColor: '#fffbeb',
      action: () => onNavigate('data')
    },
    {
      id: 'sessions',
      title: 'Security',
      desc: 'Remote controls',
      icon: Shield,
      color: '#e11d48',
      bgColor: '#fff1f2',
      action: onOpenSessions
    },
    {
      id: 'apk',
      title: 'Client APK',
      desc: 'Download installer',
      icon: Download,
      color: '#0891b2',
      bgColor: '#ecfeff',
      action: onOpenApk
    },
  ];

  const recentActivities = [
    {
      id: 1,
      title: 'GPS Geofix Acquired',
      time: 'Today, 11:42 AM',
      status: 'Live',
      tag: 'Location',
      iconBg: '#ecfdf5',
      iconColor: '#059669'
    },
    {
      id: 2,
      title: 'Heartbeat Synchronized',
      time: 'Today, 11:38 AM',
      status: 'Normal',
      tag: 'Sync',
      iconBg: '#f0f9ff',
      iconColor: '#0284c7'
    },
    {
      id: 3,
      title: 'Telemetry Node Verified',
      time: 'Today, 11:20 AM',
      status: 'Encrypted',
      tag: 'Security',
      iconBg: '#f5f3ff',
      iconColor: '#7c3aed'
    }
  ];

  return (
    <div className="minimal-ios-home" id="minimal-ios-home">
      {/* 1. Header Title Row */}
      <div className="minimal-header-title-row">
        <h1 className="minimal-page-title">Home</h1>
      </div>

      {/* 2. Status Chips ("My Wallets" style) */}
      <div className="minimal-section">
        <span className="minimal-section-label">Device Fleet</span>

        <div className="minimal-chips-scroll">
          {/* Chip 1: Online */}
          <div className="minimal-chip-card" onClick={() => onNavigate('devices')}>
            <div className="chip-indicator chip-indicator--online">
              <span className="chip-indicator-dot" />
            </div>
            <div className="chip-text-group">
              <span className="chip-lbl">ONLINE</span>
              <span className="chip-val">{activeCount} Devices</span>
            </div>
          </div>

          {/* Chip 2: Total */}
          <div className="minimal-chip-card" onClick={() => onNavigate('devices')}>
            <div className="chip-indicator chip-indicator--total">
              <Smartphone size={14} className="text-blue" />
            </div>
            <div className="chip-text-group">
              <span className="chip-lbl">TOTAL</span>
              <span className="chip-val">{totalDevices} Enrolled</span>
            </div>
          </div>

          {/* Chip 3: Add / Live Radar */}
          <button className="minimal-chip-card chip-action" onClick={onOpenRadarMap}>
            <Radio size={14} className="text-muted" />
            <span className="chip-action-text">GPS Radar</span>
          </button>
        </div>
      </div>

      {/* 3. Services Grid (3x2 minimal soft cards) */}
      <div className="minimal-section">
        <span className="minimal-section-label">Services</span>

        <div className="minimal-services-grid">
          {services.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="service-card"
                onClick={item.action}
                id={`service-${item.id}`}
              >
                <div
                  className="service-icon-box"
                  style={{ backgroundColor: item.bgColor, color: item.color }}
                >
                  <Icon size={22} strokeWidth={2} />
                </div>
                <span className="service-title">{item.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Quick Tools Bar */}
      <div className="minimal-section">
        <span className="minimal-section-label">Quick Tools</span>
        <div className="minimal-tools-row">
          <div className="minimal-tool-pill" onClick={onOpenAutoToken}>
            <div className="tool-pill-icon bg-blue-soft">
              <Key size={15} className="text-blue" />
            </div>
            <div className="tool-pill-text">
              <span className="tool-pill-name">Auto Token</span>
              <span className="tool-pill-sub">Copy API key</span>
            </div>
          </div>

          <div className="minimal-tool-pill" onClick={onOpenChangePin}>
            <div className="tool-pill-icon bg-purple-soft">
              <Lock size={15} className="text-purple" />
            </div>
            <div className="tool-pill-text">
              <span className="tool-pill-name">Change PIN</span>
              <span className="tool-pill-sub">Security code</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Transaction / Activity History */}
      <div className="minimal-section minimal-activity-section">
        <span className="minimal-section-label">Activity History</span>

        <div className="minimal-activity-list">
          {recentActivities.map((act) => (
            <div key={act.id} className="activity-item">
              <div
                className="activity-icon-circle"
                style={{ backgroundColor: act.iconBg, color: act.iconColor }}
              >
                <Wifi size={16} strokeWidth={2} />
              </div>

              <div className="activity-details">
                <span className="activity-name">{act.title}</span>
                <span className="activity-date">{act.time}</span>
              </div>

              <span className="activity-status-text">{act.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
