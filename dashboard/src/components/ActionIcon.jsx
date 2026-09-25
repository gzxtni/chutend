import './ActionIcon.css';

export default function ActionIcon({ type }) {
  return (
    <div className={`action-icon-circle action-icon--${type}`}>
      {/* Broken ring SVG background */}
      <svg className="action-ring-svg" viewBox="0 0 72 72" fill="none">
        {/* Outer segmented ring */}
        <circle
          cx="36"
          cy="36"
          r="30"
          stroke="#1877f2"
          strokeWidth="6"
          strokeDasharray="145 22 20 22"
          strokeLinecap="round"
        />
        {/* Soft inner glow circle */}
        <circle cx="36" cy="36" r="23" fill="#eaf3fe" />
      </svg>

      {/* Center Icon */}
      <div className="action-icon-inner">
        {type === 'devices' && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
          </svg>
        )}
        {type === 'data' && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
        )}
        {type === 'messages' && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="8" y1="9" x2="16" y2="9" />
            <line x1="8" y1="13" x2="14" y2="13" />
          </svg>
        )}
        {type === 'bulk' && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        )}
        {type === 'sessions' && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        )}
        {type === 'apk' && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
      </div>
    </div>
  );
}
