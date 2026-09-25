import { useState } from 'react';
import { Copy, Check, X, Shield, Key } from 'lucide-react';
import { getStoredToken } from '../api';
import './ModalsCommon.css';

export default function AutoTokenModal({ onClose, addToast }) {
  const [copied, setCopied] = useState(false);
  const token = getStoredToken() || 'emm_session_token_live_preview';

  function handleCopy() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    addToast && addToast('Panel token copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mobile-modal-overlay">
      <div className="mobile-modal-card">
        <div className="mobile-modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-pill bg-blue-dim">
              <Key size={18} className="text-blue" />
            </div>
            <div>
              <h3 className="modal-title">Auto Token</h3>
              <p className="modal-sub">Fast authentication key for agent devices</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="mobile-modal-body">
          <label className="modal-input-label">Current Authentication Token</label>
          <div className="token-code-box">
            <code className="token-code-text">{token}</code>
          </div>

          <div className="modal-tip-box">
            <Shield size={14} className="text-blue flex-shrink-0" />
            <span>Use this token for automatic login and agent enrollment authorization.</span>
          </div>

          <button className="btn-mobile-primary" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Auto Token'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
