import React, { useState, useRef, useEffect } from 'react';
import { WrapperSidebar } from './WrapperSidebar';
import './wrapper-home.css';

interface WrapperHomeProps {
  onNavigate: (view: string) => void;
}

export const WrapperHome: React.FC<WrapperHomeProps> = ({ onNavigate }) => {
  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, []);

  const showNotification = (msg: string, durationMs = 3000) => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    setActiveNotification(msg);
    notificationTimerRef.current = setTimeout(() => {
      setActiveNotification(null);
      notificationTimerRef.current = null;
    }, durationMs);
  };

  const handleSupportClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    console.log('[Wrapper] Opening support link: https://linktr.ee/hiiimanshu');
    const url = 'https://linktr.ee/hiiimanshu';
    if (typeof window !== 'undefined') {
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleHelpClick = () => {
    console.log('[Wrapper] Navigating to Help & Documentation');
    onNavigate('help');
  };

  const handleComingSoonClick = (moduleName: string) => {
    console.log(`[Wrapper] Module selected: ${moduleName}`);
    console.log(`[Wrapper] Module unavailable — Coming Soon`);
    showNotification(`${moduleName} module is in active development.`);
  };

  return (
    <div className="fx-home-container">
      {/* ---------- background pattern ---------- */}
      <div className="fx-home-bg-pattern">
        <svg viewBox="0 0 1440 500" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <polyline
            points="0,420 120,340 260,400 380,260 520,340 660,200 800,300 940,180 1080,260 1220,140 1360,220 1440,170"
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="1"
            opacity="0.18"
          />
          <polyline
            points="0,470 140,410 300,450 460,360 620,420 780,320 940,390 1100,300 1260,360 1440,300"
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="1"
            opacity="0.12"
          />
          <polyline
            points="0,500 160,470 340,495 520,440 700,480 880,420 1060,470 1240,410 1440,450"
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="1"
            opacity="0.08"
          />
        </svg>
      </div>

      {/* ---------- Toast Notification ---------- */}
      {activeNotification && (
        <div className="fx-toast-banner">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
            <span>{activeNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveNotification(null)}
            className="text-xs font-bold cursor-pointer opacity-70 hover:opacity-100 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ---------- layout shell ---------- */}
      <div className="fx-home-shell">
        {/* ============ SIDEBAR ============ */}
        <WrapperSidebar
          activeView="home"
          onNavigate={onNavigate}
          onSupportClick={handleSupportClick}
          onHelpClick={handleHelpClick}
          onUnavailableSelect={handleComingSoonClick}
        />

        {/* ============ MAIN ============ */}
        <main className="fx-home-main">
          {/* header */}
          <header className="fx-home-header">
            <div>
              <h1>FX Freeplay</h1>
              <p className="subtitle">Analyze markets. Test ideas. Build an edge.</p>
            </div>
            <div className="fx-watermark">DISCIPLINE&nbsp;THROUGH&nbsp;RESEARCH</div>
          </header>

          {/* primary content grid */}
          <section className="fx-content-grid">
            {/* charts card */}
            <div
              className="fx-card fx-charts-card"
              onClick={() => {
                console.log('[Wrapper] Module selected: Charts');
                onNavigate('charts');
              }}
            >
              <div className="fx-charts-top">
                <div>
                  <div className="fx-eyebrow">CORE EXECUTION</div>
                  <div className="fx-charts-title">Charts</div>
                </div>
              </div>

              <p className="fx-charts-desc">
                Multi-timeframe charting workspace featuring synchronous crosshair tracking, bar replay simulation, and multi-layout analysis.
              </p>

              <div className="fx-chart-wrap">
                <div className="fx-chart-svg-container" style={{ position: 'relative', width: '100%', flex: 1, minHeight: 0 }}>
                  <svg viewBox="0 0 600 160" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block' }}>
                    <defs>
                      <linearGradient id="fxCleanLineFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.18" />
                        <stop offset="85%" stopColor="var(--accent-primary)" stopOpacity="0.02" />
                        <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Gradient Area Fill under the crisp curve */}
                    <path
                      d="M 24 100 L 40 114 L 62 86 L 85 78 L 108 77 L 128 88 L 148 72 L 168 106 L 188 90 L 208 92 L 226 124 L 244 102 L 262 118 L 280 114 L 298 88 L 316 84 L 334 134 L 352 116 L 370 116 L 388 66 L 404 76 L 420 74 L 436 75 L 452 94 L 468 82 L 484 74 L 500 73 L 514 26 L 528 60 L 542 27 L 556 58 L 570 24 L 570 156 L 24 156 Z"
                      fill="url(#fxCleanLineFill)"
                    />

                    {/* Ultra-crisp Primary Price Action Path */}
                    <path
                      d="M 24 100 L 40 114 L 62 86 L 85 78 L 108 77 L 128 88 L 148 72 L 168 106 L 188 90 L 208 92 L 226 124 L 244 102 L 262 118 L 280 114 L 298 88 L 316 84 L 334 134 L 352 116 L 370 116 L 388 66 L 404 76 L 420 74 L 436 75 L 452 94 L 468 82 L 484 74 L 500 73 L 514 26 L 528 60 L 542 27 L 556 58 L 570 24"
                      fill="none"
                      stroke="var(--accent-primary)"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      style={{ filter: 'drop-shadow(0 0 4px color-mix(in srgb, var(--accent-primary) 55%, transparent))' }}
                    />
                  </svg>

                  {/* Perfectly round node indicator (570/600 = 95%, 24/160 = 15%) */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '95%',
                      top: '15%',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-hover)',
                      transform: 'translate(-50%, -50%)',
                      boxShadow: '0 0 8px 1px var(--accent-primary)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>

                <div className="fx-timeline-labels">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                </div>
              </div>

              <div className="fx-charts-footer">
                <button
                  type="button"
                  className="fx-btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('[Wrapper] Module selected: Charts');
                    onNavigate('charts');
                  }}
                >
                  Enter Charts →
                </button>
              </div>
            </div>

            {/* secondary tool cards */}
            <div className="fx-secondary-col">
              {/* Journal */}
              <div
                className="fx-card fx-tool-card"
                onClick={() => handleComingSoonClick('Journal')}
              >
                <div className="fx-tool-top">
                  <div className="fx-tool-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M6 3h11a1 1 0 0 1 1 1v16l-4-2-4 2-4-2-2 1V5a2 2 0 0 1 2-2z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 8h6M9 12h6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="fx-tool-title-wrap">
                    <div className="fx-tool-title">Journal</div>
                  </div>
                  <span className="fx-badge fx-badge-soon">COMING SOON</span>
                </div>
                <p className="fx-tool-desc">Log trades, tag setups, and review outcomes against your plan.</p>
                <p className="fx-tool-quote">"What gets recorded gets improved."</p>
              </div>

              {/* Backtesting */}
              <div
                className="fx-card fx-tool-card"
                onClick={() => handleComingSoonClick('Backtesting')}
              >
                <div className="fx-tool-top">
                  <div className="fx-tool-icon">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="fx-tool-title-wrap">
                    <div className="fx-tool-title">Backtesting</div>
                  </div>
                  <span className="fx-badge fx-badge-soon">COMING SOON</span>
                </div>
                <p className="fx-tool-desc">Run strategies against historical data before risking real capital.</p>
                <p className="fx-tool-quote">"Trust, but verify — on ten years of candles."</p>
              </div>

              {/* Research */}
              <div
                className="fx-card fx-tool-card"
                onClick={() => handleComingSoonClick('Research')}
              >
                <div className="fx-tool-top">
                  <div className="fx-tool-icon">
                    <svg viewBox="0 0 24 24">
                      <circle cx="10.5" cy="10.5" r="6.5" />
                      <path d="M20 20l-4.7-4.7" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="fx-tool-title-wrap">
                    <div className="fx-tool-title">Research</div>
                  </div>
                  <span className="fx-badge fx-badge-soon">COMING SOON</span>
                </div>
                <p className="fx-tool-desc">Dig into macro data, correlations, and market structure notes.</p>
                <p className="fx-tool-quote">"The edge is in the reading no one else finishes."</p>
              </div>
            </div>
          </section>

          {/* bottom row */}
          <section className="fx-bottom-row">
            {/* System Status / Engine Specifications */}
            <div className="fx-card fx-panel fx-system-panel">
              <div className="fx-panel-title">v1.0.0 • PLATFORM ARCHITECT</div>
              <ul className="fx-specs-list">
                <li>
                  <span className="spec-name">Replay Engine</span>
                  <span className="spec-val">Tick-Accurate V2</span>
                </li>
                <li>
                  <span className="spec-name">Chart Sync</span>
                  <span className="spec-val">Sub-Millisecond Crosshair</span>
                </li>
                <li>
                  <span className="spec-name">Data Storage</span>
                  <span className="spec-val">Local-First Sandbox</span>
                </li>
              </ul>
            </div>

            {/* Quote Panel */}
            <div className="fx-card fx-panel fx-quote-panel">
              <div className="fx-quote-mark">"</div>
              <p className="fx-quote-text">A focused mind sees opportunities everywhere.</p>
            </div>

            {/* Support Panel */}
            <div className="fx-card fx-panel fx-support-panel">
              <div className="fx-panel-title">SUPPORT DEVELOPMENT</div>
              <p>FX Freeplay is built independently. If it's earned a place in your routine, consider backing what comes next.</p>
              <button
                type="button"
                className="fx-btn-ghost"
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).electronAPI) {
                    (window as any).electronAPI.openExternal('https://linktr.ee/hiiimanshu');
                  } else {
                    window.open('https://linktr.ee/hiiimanshu', '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                Support FX Freeplay
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* ============ FOOTER ============ */}
      <footer className="fx-home-footer">
        <span>v1.0.0 • Platform Architect • FX Freeplay Desktop</span>
        <span>EXPLORE • ANALYZE • IMPROVE</span>
      </footer>
    </div>
  );
};
