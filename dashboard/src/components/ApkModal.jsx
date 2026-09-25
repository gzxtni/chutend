import { Download, X, Smartphone, ShieldCheck, Terminal, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import './ModalsCommon.css';

export default function ApkModal({ onClose, addToast }) {
  const [copied, setCopied] = useState(false);
  const adbCmd = 'adb install -r -g NarayanEmmAgent.apk';

  function handleCopy() {
    navigator.clipboard.writeText(adbCmd);
    setCopied(true);
    addToast && addToast('ADB command copied!', 'info');
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    addToast && addToast('Downloading Narayan EMM Client APK...', 'success');
  }

  return (
    <div className="mobile-modal-overlay">
      <div className="mobile-modal-card">
        <div className="mobile-modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-pill bg-blue-dim">
              <Download size={18} className="text-blue" />
            </div>
            <div>
              <h3 className="modal-title">Client APK</h3>
              <p className="modal-sub">Download Narayan Android EMM Agent</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="mobile-modal-body">
          <div className="apk-card-info">
            <div className="apk-badge-row">
              <Smartphone size={16} className="text-blue" />
              <span className="apk-ver">v2.4.0 (Latest Release)</span>
            </div>
            <p className="apk-sub">Supports Android 8.0 - Android 16 (API 26-36)</p>
          </div>

          <button className="btn-mobile-primary" onClick={handleDownload}>
            <Download size={16} />
            <span>Download APK (14.2 MB)</span>
          </button>

          <label className="modal-input-label" style={{ marginTop: '16px' }}>
            Direct ADB Sideload Command
          </label>
          <div className="token-code-box" onClick={handleCopy} style={{ cursor: 'pointer' }}>
            <code className="token-code-text">{adbCmd}</code>
            <button className="token-copy-icon-btn" aria-label="Copy">
              {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
