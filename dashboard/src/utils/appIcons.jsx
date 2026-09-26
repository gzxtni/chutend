// Filter helper: returns true ONLY for genuine user-downloaded applications
export function isUserDownloadedApp(app) {
  if (!app) return false;
  if (app.is_system) return false;

  const pkg = (app.package || '').toLowerCase();
  const name = (app.name || '').toLowerCase();

  // Exclude Android / Google / OEM system framework, verifiers and background services
  if (
    pkg.startsWith('com.google.android.verifier') ||
    pkg.startsWith('com.google.android.contactkeys') ||
    pkg.startsWith('com.google.android.safetycore') ||
    pkg.startsWith('com.google.android.gms') ||
    pkg.startsWith('com.google.android.gsf') ||
    pkg.startsWith('com.google.android.ext.') ||
    pkg.startsWith('com.google.android.overlay') ||
    pkg.startsWith('com.google.android.feedback') ||
    pkg.startsWith('com.google.android.tag') ||
    pkg.startsWith('com.google.android.tts') ||
    pkg.startsWith('com.google.android.marvin') ||
    pkg.startsWith('com.google.android.printservice') ||
    pkg.startsWith('com.google.android.carrier') ||
    pkg.startsWith('com.google.android.apps.docs') ||
    pkg.startsWith('com.google.android.setupwizard') ||
    pkg.startsWith('com.google.android.as') ||
    pkg.startsWith('com.google.android.projection') ||
    pkg.startsWith('com.android.') ||
    pkg.startsWith('com.miui.') ||
    pkg.startsWith('com.xiaomi.') ||
    pkg.startsWith('com.qualcomm.') ||
    pkg.startsWith('com.mediatek.') ||
    pkg.startsWith('com.preff.') ||
    pkg.startsWith('com.bsp.') ||
    pkg.startsWith('com.sohu.') ||
    pkg.startsWith('com.duokan.') ||
    pkg.startsWith('com.milink.') ||
    pkg.startsWith('com.mfashiongallery.') ||
    pkg.startsWith('android') ||
    pkg.includes('.verifier') ||
    pkg.includes('.safetycore') ||
    pkg.includes('.contactkeys') ||
    name.includes('verifier') ||
    name.includes('safetycore') ||
    name.includes('system key')
  ) {
    return false;
  }

  return true;
}

// Brand color palette generator for fallback squircles
const PALETTES = [
  { bg: 'linear-gradient(135deg, #FF9900, #E67A00)', text: '#ffffff' }, // Orange / Amazon
  { bg: 'linear-gradient(135deg, #2874F0, #0F49A6)', text: '#ffffff' }, // Blue / Flipkart
  { bg: 'linear-gradient(135deg, #F8CB46, #D49C06)', text: '#222222' }, // Yellow / Blinkit
  { bg: 'linear-gradient(135deg, #008744, #005A2C)', text: '#ffffff' }, // Green / BHIM
  { bg: 'linear-gradient(135deg, #5F259F, #3C126B)', text: '#ffffff' }, // Purple / PhonePe
  { bg: 'linear-gradient(135deg, #E23744, #A3121D)', text: '#ffffff' }, // Red / Zomato
  { bg: 'linear-gradient(135deg, #FC8019, #C85400)', text: '#ffffff' }, // Orange / Swiggy
  { bg: 'linear-gradient(135deg, #25D366, #128C7E)', text: '#ffffff' }, // Emerald / WhatsApp
  { bg: 'linear-gradient(135deg, #E1306C, #833AB4)', text: '#ffffff' }, // Pink / Instagram
  { bg: 'linear-gradient(135deg, #0088CC, #005F8F)', text: '#ffffff' }, // Cyan / Telegram
  { bg: 'linear-gradient(135deg, #1DB954, #127936)', text: '#ffffff' }, // Green / Spotify
  { bg: 'linear-gradient(135deg, #E50914, #9E040C)', text: '#ffffff' }, // Red / Netflix
];

function getPaletteForName(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

// App Brand Icon Component
export function AppIconView({ app, size = 42 }) {
  const pkg = (app?.package || '').toLowerCase();
  const name = app?.name || 'App';
  const initial = name.charAt(0).toUpperCase();

  // 1. Device extracted real icon (base64)
  if (app?.icon && (app.icon.startsWith('data:image') || app.icon.startsWith('http'))) {
    return (
      <img
        src={app.icon}
        alt={name}
        className="app-brand-icon-img"
        style={{ width: size, height: size, borderRadius: '10px', objectFit: 'cover' }}
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    );
  }

  // 2. Curated brand icons for popular Indian & Global apps
  if (pkg.includes('amazon') || name.toLowerCase().includes('amazon')) {
    return (
      <div className="brand-icon-bubble" style={{ width: size, height: size, background: '#232f3e' }}>
        <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="#ff9900">
          <path d="M15.42 16.48c-3.13 2.3-7.58 3.51-11.53 1.95a.8.8 0 0 1-.1-1.34c3.08-2.6 6.88-3.4 10.74-2.12.63.2 1.25.75.89 1.51zm4.18-1.74c-.26-.35-1.75-.41-2.42-.33-.2 0-.25-.16-.08-.28 1.13-.8 2.97-.58 3.25-.22.28.36-.08 2.21-1.15 3.08-.16.14-.32.06-.25-.12.22-.58.91-1.78.65-2.13zM13.4 9.17c0-1.87-1.12-2.9-2.73-2.9-1.8 0-2.88 1.34-2.88 2.89 0 1.83 1.14 2.87 2.76 2.87 1.76 0 2.85-1.28 2.85-2.86zm2.42 5.09c-.15-.12-.34-.14-.52-.04-.84.66-1.95 1.05-3.23 1.05-2.67 0-4.66-1.75-4.66-4.99 0-3.07 2.1-5.11 4.93-5.11 1.48 0 2.65.55 3.26 1.35V4.38c0-.36.21-.61.57-.61h1.58c.36 0 .58.25.58.61v9.28c0 .36-.22.6-.58.6h-1.54c-.2 0-.34-.07-.39-.19z" />
        </svg>
      </div>
    );
  }

  if (pkg.includes('flipkart') || name.toLowerCase().includes('flipkart')) {
    return (
      <div className="brand-icon-bubble" style={{ width: size, height: size, background: '#2874f0' }}>
        <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="#ffe500">
          <path d="M19.6 4.3H4.4c-.8 0-1.4.6-1.4 1.4v12.6c0 .8.6 1.4 1.4 1.4h15.2c.8 0 1.4-.6 1.4-1.4V5.7c0-.8-.6-1.4-1.4-1.4zm-6.1 11.2h-3v-4.1h-1.7v-2.4h1.7V7.6c0-1.7 1-2.6 2.6-2.6.8 0 1.5.1 1.7.1v2h-1.2c-.8 0-1 .4-1 1v1.1h2.2l-.3 2.4h-1.9v4.1z" />
        </svg>
      </div>
    );
  }

  if (pkg.includes('blinkit') || pkg.includes('grofers') || name.toLowerCase().includes('blinkit')) {
    return (
      <div className="brand-icon-bubble" style={{ width: size, height: size, background: '#f8cb46' }}>
        <span style={{ fontSize: size * 0.55, fontWeight: 900, color: '#222222', fontFamily: 'sans-serif' }}>b</span>
      </div>
    );
  }

  if (pkg.includes('bhim') || pkg.includes('npci.upiapp') || name.toLowerCase().includes('bhim')) {
    return (
      <div className="brand-icon-bubble" style={{ width: size, height: size, background: 'linear-gradient(135deg, #008744, #005a2c)' }}>
        <span style={{ fontSize: size * 0.42, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>UPI</span>
      </div>
    );
  }

  if (pkg.includes('whatsapp')) {
    return (
      <div className="brand-icon-bubble" style={{ width: size, height: size, background: '#25D366' }}>
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="#ffffff">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.78 14.15c-.24.68-1.39 1.3-1.93 1.38-.51.08-1.17.11-3.79-.97-3.34-1.39-5.48-4.8-5.65-5.02-.16-.22-1.35-1.8-1.35-3.44 0-1.63.85-2.44 1.15-2.77.3-.33.66-.41.88-.41.22 0 .44.01.63.02.2.01.47-.08.73.56.27.68.92 2.27 1 2.44.08.17.14.37.03.59-.11.22-.17.36-.34.56-.17.2-.36.45-.51.6-.17.17-.35.35-.15.7.2.35.88 1.45 1.88 2.35 1.29 1.15 2.38 1.51 2.73 1.68.35.17.55.15.75-.08.2-.23.86-1 1.09-1.34.23-.34.46-.28.78-.17.32.11 2.03.96 2.38 1.13.35.17.58.26.67.4.08.14.08.82-.16 1.5z" />
        </svg>
      </div>
    );
  }

  if (pkg.includes('instagram')) {
    return (
      <div className="brand-icon-bubble" style={{ width: size, height: size, background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}>
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="#ffffff">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </div>
    );
  }

  // 3. Dynamic Colorful Branded Squircle
  const palette = getPaletteForName(pkg || name);
  return (
    <div
      className="brand-icon-bubble dynamic-squircle"
      style={{
        width: size,
        height: size,
        background: palette.bg,
        color: palette.text,
        boxShadow: '0 3px 8px rgba(0,0,0,0.12)',
      }}
    >
      <span style={{ fontSize: size * 0.48, fontWeight: 800 }}>{initial}</span>
    </div>
  );
}
