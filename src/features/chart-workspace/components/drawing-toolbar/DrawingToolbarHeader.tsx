import React from 'react';
import { ToolIconWrapper } from './DrawingToolbarIcons';
import { DrawingToolbarHubMenu } from './DrawingToolbarHubMenu';

export interface DrawingToolbarHeaderProps {
  isHubMenuOpen: boolean;
  hubMenuPos: { x: number; y: number };
  hubMenuRef: React.RefObject<HTMLDivElement | null>;
  onNavigateHome?: () => void;
  onOpenHubMenu: (rect: DOMRect) => void;
  onCloseAllMenus: () => void;
}

export const DrawingToolbarHeader: React.FC<DrawingToolbarHeaderProps> = ({
  isHubMenuOpen,
  hubMenuPos,
  hubMenuRef,
  onNavigateHome,
  onOpenHubMenu,
  onCloseAllMenus,
}) => {
  return (
    <>
      {/* 0. Hub & Module Selector Button */}
      <div className="relative flex items-center bg-transparent rounded-lg">
        <button
          type="button"
          title="Home Hub"
          aria-label="Home Hub"
          data-tooltip="Home Hub"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onCloseAllMenus();
            if (onNavigateHome) onNavigateHome();
          }}
          className="p-1.5 rounded-md border border-transparent text-accent hover:text-accent-hover hover:bg-accent-muted/40 transition-all flex items-center justify-center outline-none focus:outline-none select-none shadow-xs"
          style={{ width: '34px', height: '34px' }}
        >
          <ToolIconWrapper>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-current" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </ToolIconWrapper>
        </button>

        {/* Arrow to open Module Options Menu */}
        <button
          type="button"
          title="Module Navigation"
          aria-label="Module Navigation"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            onOpenHubMenu(rect);
          }}
          className={`border rounded-md transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
            isHubMenuOpen
              ? 'border-transparent bg-accent-muted text-accent z-10'
              : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
          }`}
          style={{ width: '12px', height: '34px' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-2 h-2 text-current">
            <path d="M5.5 3L10.5 8L5.5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Hub Module Selector Menu */}
        <DrawingToolbarHubMenu
          isOpen={isHubMenuOpen}
          position={hubMenuPos}
          menuRef={hubMenuRef}
          onClose={onCloseAllMenus}
          onNavigateHome={onNavigateHome}
        />
      </div>

      <div className="w-[36px] h-px bg-border-sub/80 -my-1 ml-0.5" />
    </>
  );
};
