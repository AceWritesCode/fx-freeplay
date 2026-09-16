import React from 'react';

export interface DrawingToolbarHubMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  menuRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onNavigateHome?: () => void;
}

export const DrawingToolbarHubMenu: React.FC<DrawingToolbarHubMenuProps> = ({
  isOpen,
  position,
  menuRef,
  onClose,
  onNavigateHome,
}) => {
  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1.5 text-sm min-w-[220px] text-txt-secondary select-none"
      style={{
        left: `${position.x + 6}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="px-3 py-1 text-[10px] font-bold tracking-widest text-txt-muted uppercase font-mono border-b border-border-sub/60 mb-1">
        Modules
      </div>

      {/* Home */}
      <button
        type="button"
        onClick={() => {
          onClose();
          if (onNavigateHome) onNavigateHome();
        }}
        className="w-full px-3 py-2 text-left hover:bg-surface-hover hover:text-txt-primary flex items-center justify-between transition-colors text-xs font-semibold cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Workspace Hub</span>
        </div>
      </button>

      {/* Charts (Active) */}
      <button
        type="button"
        onClick={onClose}
        className="w-full px-3 py-2 text-left bg-accent-muted/40 text-accent flex items-center justify-between transition-colors text-xs font-semibold cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19V9M10 19V4M16 19v-7M22 19H2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Charts</span>
        </div>
        <span className="text-[10px] font-mono opacity-80 uppercase px-1.5 py-0.5 rounded bg-accent/20">Active</span>
      </button>

      {/* Journal (Coming Soon) */}
      <button
        type="button"
        onClick={onClose}
        className="w-full px-3 py-2 text-left hover:bg-surface-hover/60 text-txt-muted flex items-center justify-between transition-colors text-xs font-medium cursor-default"
      >
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-txt-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 3h11a1 1 0 0 1 1 1v16l-4-2-4 2-4-2-2 1V5a2 2 0 0 1 2-2z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 8h6M9 12h6" strokeLinecap="round" />
          </svg>
          <span>Journal</span>
        </div>
        <span className="text-[9.5px] font-mono text-txt-muted opacity-60 uppercase">Soon</span>
      </button>

      {/* Backtesting (Coming Soon) */}
      <button
        type="button"
        onClick={onClose}
        className="w-full px-3 py-2 text-left hover:bg-surface-hover/60 text-txt-muted flex items-center justify-between transition-colors text-xs font-medium cursor-default"
      >
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-txt-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Backtesting</span>
        </div>
        <span className="text-[9.5px] font-mono text-txt-muted opacity-60 uppercase">Soon</span>
      </button>

      {/* Research (Coming Soon) */}
      <button
        type="button"
        onClick={onClose}
        className="w-full px-3 py-2 text-left hover:bg-surface-hover/60 text-txt-muted flex items-center justify-between transition-colors text-xs font-medium cursor-default"
      >
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-txt-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M20 20l-4.7-4.7" strokeLinecap="round" />
          </svg>
          <span>Research</span>
        </div>
        <span className="text-[9.5px] font-mono text-txt-muted opacity-60 uppercase">Soon</span>
      </button>
    </div>
  );
};
