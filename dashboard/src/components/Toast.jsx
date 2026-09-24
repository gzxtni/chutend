import { useEffect, useState } from 'react';
import './Toast.css';

export default function Toast({ message, type = 'info', onDismiss }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 300);
    }, 3700);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div className={`toast toast--${type} ${exiting ? 'toast--exiting' : ''}`}>
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-dismiss" onClick={() => { setExiting(true); setTimeout(onDismiss, 300); }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
