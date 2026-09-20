import { ToolIconWrapper, HomeHubIcon } from './DrawingToolbarIcons';
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
      <div className="group relative flex items-center bg-transparent rounded-md">
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
          className="rounded-md border border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none"
          style={{ width: '33px', height: '33px' }}
        >
          <ToolIconWrapper>
            <HomeHubIcon />
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
          className={`rounded-r-sm transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
            isHubMenuOpen
              ? 'bg-accent-muted text-accent opacity-100 z-10'
              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover opacity-0 group-hover:opacity-100'
          }`}
          style={{ width: '9px', height: '33px' }}
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

      <div className="w-[33px] border-t border-border-def/60 my-0.5 ml-0" />
    </>
  );
};
