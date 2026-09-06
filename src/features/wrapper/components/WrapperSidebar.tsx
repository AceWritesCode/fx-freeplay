import React from 'react';
import { Sliders } from 'lucide-react';

interface WrapperSidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onSupportClick: () => void;
  onHelpClick?: () => void;
  onUnavailableSelect?: (name: string) => void;
}

export const WrapperSidebar: React.FC<WrapperSidebarProps> = ({
  activeView,
  onNavigate,
  onSupportClick,
  onHelpClick,
  onUnavailableSelect,
}) => {
  return (
    <aside className="fx-home-sidebar">
      {/* 1. Logo */}
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="fx-sidebar-logo"
        title="FX Freeplay"
      >
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1">
          <defs>
            <linearGradient id="sbSilverGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#cfd8dc" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
            <linearGradient id="sbBlueGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent-hover)" />
              <stop offset="100%" stopColor="var(--accent-primary)" />
            </linearGradient>
          </defs>
          <path fill="url(#sbSilverGrad)" d="M 30 110 L 30 70 L 70 30 L 170 30 L 130 70 L 70 70 Z" />
          <path fill="url(#sbBlueGrad)" d="M 30 170 L 30 130 L 70 90 L 140 90 L 100 130 L 70 130 Z" />
        </svg>
      </button>

      {/* 2. Top Navigation Items */}
      <nav className="fx-nav-top">
        {/* Home */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`fx-nav-item ${activeView === 'home' ? 'active' : ''}`}
          title="Home"
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="fx-nav-label">Home</span>
        </button>

        {/* Charts */}
        <button
          type="button"
          onClick={() => onNavigate('charts')}
          className={`fx-nav-item ${activeView === 'charts' ? 'active' : ''}`}
          title="Charts"
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 19V9M10 19V4M16 19v-7M22 19H2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="fx-nav-label">Charts</span>
        </button>

        {/* Journal */}
        <button
          type="button"
          onClick={() => {
            console.log('[Wrapper] Module selected: Journal');
            console.log('[Wrapper] Module unavailable — Coming Soon');
            onUnavailableSelect?.('Journal');
          }}
          className={`fx-nav-item ${activeView === 'journal' ? 'active' : ''}`}
          title="Journal (Coming Soon)"
        >
          <svg viewBox="0 0 24 24">
            <path d="M6 3h11a1 1 0 0 1 1 1v16l-4-2-4 2-4-2-2 1V5a2 2 0 0 1 2-2z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 8h6M9 12h6" strokeLinecap="round" />
          </svg>
          <span className="fx-nav-label">Journal</span>
        </button>

        {/* Backtesting */}
        <button
          type="button"
          onClick={() => {
            console.log('[Wrapper] Module selected: Backtesting');
            console.log('[Wrapper] Module unavailable — Coming Soon');
            onUnavailableSelect?.('Backtesting');
          }}
          className={`fx-nav-item ${activeView === 'backtesting' ? 'active' : ''}`}
          title="Backtesting (Coming Soon)"
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="fx-nav-label">Backtesting</span>
        </button>

        {/* Research */}
        <button
          type="button"
          onClick={() => {
            console.log('[Wrapper] Module selected: Research');
            console.log('[Wrapper] Module unavailable — Coming Soon');
            onUnavailableSelect?.('Research');
          }}
          className={`fx-nav-item ${activeView === 'research' ? 'active' : ''}`}
          title="Research (Coming Soon)"
        >
          <svg viewBox="0 0 24 24">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M20 20l-4.7-4.7" strokeLinecap="round" />
          </svg>
          <span className="fx-nav-label">Research</span>
        </button>
      </nav>

      {/* 3. Spacer */}
      <div className="fx-sidebar-spacer" />

      {/* 4. Bottom Utility Navigation */}
      <div className="fx-nav-bottom">
        {/* Settings */}
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className={`fx-nav-item ${activeView === 'settings' ? 'active' : ''}`}
          title="Settings"
        >
          <Sliders className="w-5 h-5" />
          <span className="fx-nav-label">Settings</span>
        </button>

        {/* Support */}
        <button
          type="button"
          onClick={onSupportClick}
          className="fx-nav-item"
          title="Support FX Freeplay"
        >
          <svg viewBox="0 0 24 24">
            <path d="M12 20s-7-4.4-9.5-8.8C.8 8 2 4.5 5.4 3.7 8 3 10.3 4.3 12 6.8c1.7-2.5 4-3.8 6.6-3.1C22 4.5 23.2 8 21.5 11.2 19 15.6 12 20 12 20z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="fx-nav-label">Support</span>
        </button>

        {/* Help */}
        <button
          type="button"
          onClick={() => {
            if (onHelpClick) {
              onHelpClick();
            } else {
              onNavigate('help');
            }
          }}
          className={`fx-nav-item ${activeView === 'help' ? 'active' : ''}`}
          title="Help & Documentation"
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.2 9.2a2.8 2.8 0 1 1 3.8 2.6c-1 .5-1 1.3-1 2.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="17.2" r="0.6" fill="currentColor" stroke="none" />
          </svg>
          <span className="fx-nav-label">Help</span>
        </button>
      </div>

      {/* 5. Vertical Slogan */}
      <div className="fx-explore-text">EXPLORE&nbsp;&nbsp;ANALYZE&nbsp;&nbsp;IMPROVE</div>
    </aside>
  );
};
