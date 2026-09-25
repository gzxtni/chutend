import { Home, Clock, Repeat, LayoutGrid, Plus } from 'lucide-react';
import './MobileBottomNav.css';

export default function MobileBottomNav({ activeTab, onTabChange, onQuickAction }) {
  return (
    <div className="minimal-bottom-wrapper">
      <div className="minimal-bottom-nav-container">
        {/* Floating Capsule Bar */}
        <nav className="minimal-capsule-bar" id="minimal-capsule-bar">
          {/* Tab 1: Home */}
          <button
            className={`capsule-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => onTabChange('home')}
            aria-label="Home"
          >
            <div className="capsule-icon-wrap">
              <Home size={20} strokeWidth={2.2} />
            </div>
          </button>

          {/* Tab 2: Devices */}
          <button
            className={`capsule-tab-btn ${activeTab === 'devices' ? 'active' : ''}`}
            onClick={() => onTabChange('devices')}
            aria-label="Devices"
          >
            <div className="capsule-icon-wrap">
              <Clock size={20} strokeWidth={2.2} />
            </div>
          </button>

          {/* Tab 3: Messages */}
          <button
            className={`capsule-tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => onTabChange('messages')}
            aria-label="Messages"
          >
            <div className="capsule-icon-wrap">
              <Repeat size={20} strokeWidth={2.2} />
            </div>
          </button>

          {/* Tab 4: Data & Settings */}
          <button
            className={`capsule-tab-btn ${activeTab === 'data' || activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => onTabChange(activeTab === 'data' ? 'settings' : 'data')}
            aria-label="Dashboard"
          >
            <div className="capsule-icon-wrap">
              <LayoutGrid size={20} strokeWidth={2.2} />
            </div>
          </button>
        </nav>

        {/* Circular Action Button (+) */}
        <button
          className="minimal-fab-btn"
          onClick={onQuickAction}
          aria-label="Quick action"
          id="minimal-fab-btn"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
