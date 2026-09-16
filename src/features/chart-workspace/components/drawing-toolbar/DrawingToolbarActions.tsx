import React from 'react';
import { Star } from 'lucide-react';
import {
  ToolIconWrapper,
  MeasureIcon,
  ZoomInIcon,
  ZoomOutIcon,
  StayInDrawingModeIcon,
  LockAllDrawingsIcon,
  HideAllDrawingsIcon,
  DeleteIcon,
} from './DrawingToolbarIcons';

export interface DrawingToolbarUtilityControlsProps {
  hasData: boolean;
  activeTool: string | null;
  onSelectTool: (toolId: string) => void;
  onClearActiveTool: () => void;
  canZoomOut?: boolean;
  onZoomOut?: () => void;
  closeAllMenus: () => void;
}

export const DrawingToolbarUtilityControls: React.FC<DrawingToolbarUtilityControlsProps> = ({
  hasData,
  activeTool,
  onSelectTool,
  onClearActiveTool,
  canZoomOut,
  onZoomOut,
  closeAllMenus,
}) => {
  return (
    <>
      {/* Divider 1: End of Drawing Tools */}
      <div className="w-[34px] border-t border-border-def/60 my-0.5" />

      {/* --- UTILITIES GROUP (Measure & Zoom) --- */}
      {/* Measure / Scale Tool */}
      <button
        title="Measure (Shift + Click & Drag)"
        aria-label="Measure"
        data-tooltip="Measure"
        disabled={!hasData}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          closeAllMenus();
          if (activeTool === 'measure') {
            onClearActiveTool();
          } else {
            onSelectTool('measure');
          }
        }}
        className={`p-1.5 rounded-md border border-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
          activeTool === 'measure'
            ? 'bg-accent-muted text-accent'
            : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
        }`}
        style={{ width: '34px', height: '34px' }}
      >
        <ToolIconWrapper>
          <MeasureIcon className="w-full h-full text-current" />
        </ToolIconWrapper>
      </button>

      {/* Zoom In Tool */}
      <button
        title="Zoom in"
        aria-label="Zoom in"
        data-tooltip="Zoom in"
        disabled={!hasData}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          closeAllMenus();
          if (activeTool === 'zoomIn') {
            onClearActiveTool();
          } else {
            onSelectTool('zoomIn');
          }
        }}
        className={`p-1.5 rounded-md border border-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
          activeTool === 'zoomIn'
            ? 'bg-accent-muted text-accent'
            : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
        }`}
        style={{ width: '34px', height: '34px' }}
      >
        <ToolIconWrapper>
          <ZoomInIcon className="w-full h-full text-current" />
        </ToolIconWrapper>
      </button>

      {/* Zoom Out Tool (Appears when zoomed in) */}
      {canZoomOut && (
        <button
          title="Zoom out"
          aria-label="Zoom out"
          data-tooltip="Zoom out"
          disabled={!hasData}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeAllMenus();
            onZoomOut?.();
          }}
          className="p-1.5 rounded-md border border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none"
          style={{ width: '34px', height: '34px' }}
        >
          <ToolIconWrapper>
            <ZoomOutIcon className="w-full h-full text-current" />
          </ToolIconWrapper>
        </button>
      )}

      {/* Divider 2: End of Utilities */}
      <div className="w-[34px] border-t border-border-def/60 my-0.5" />
    </>
  );
};

export interface DrawingToolbarActionControlsProps {
  hasData: boolean;
  isStayInDrawingMode: boolean;
  onToggleStayInDrawingMode: () => void;
  isAllDrawingsLocked: boolean;
  onToggleLockAllDrawings: () => void;
  isAllDrawingsHidden: boolean;
  onToggleHideAllDrawings: () => void;
  onClearDrawings: () => void;
  isFavoriteToolbarOpen: boolean;
  onToggleFavoriteToolbar: () => void;
  closeAllMenus: () => void;
}

export const DrawingToolbarActionControls: React.FC<DrawingToolbarActionControlsProps> = ({
  hasData,
  isStayInDrawingMode,
  onToggleStayInDrawingMode,
  isAllDrawingsLocked,
  onToggleLockAllDrawings,
  isAllDrawingsHidden,
  onToggleHideAllDrawings,
  onClearDrawings,
  isFavoriteToolbarOpen,
  onToggleFavoriteToolbar,
  closeAllMenus,
}) => {
  return (
    <>
      {/* Stay in Drawing Mode */}
      <button
        title={isStayInDrawingMode ? 'Stay in Drawing Mode (Active)' : 'Stay in Drawing Mode'}
        aria-label="Stay in Drawing Mode"
        data-tooltip="Stay in Drawing Mode"
        disabled={!hasData}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          closeAllMenus();
          onToggleStayInDrawingMode();
        }}
        className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
          isStayInDrawingMode
            ? 'border-transparent bg-accent-muted text-accent'
            : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
        }`}
        style={{ width: '34px', height: '34px' }}
      >
        <ToolIconWrapper>
          <StayInDrawingModeIcon className="w-full h-full text-current" />
        </ToolIconWrapper>
      </button>

      {/* Lock All Drawings */}
      <button
        title={isAllDrawingsLocked ? 'Unlock All Drawing Tools' : 'Lock All Drawing Tools'}
        aria-label="Lock All Drawing Tools"
        data-tooltip="Lock All Drawing Tools"
        disabled={!hasData}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          closeAllMenus();
          onToggleLockAllDrawings();
        }}
        className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
          isAllDrawingsLocked
            ? 'border-transparent bg-accent-muted text-accent'
            : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
        }`}
        style={{ width: '34px', height: '34px' }}
      >
        <ToolIconWrapper>
          <LockAllDrawingsIcon className="w-full h-full text-current" locked={isAllDrawingsLocked} />
        </ToolIconWrapper>
      </button>

      {/* Hide All Drawings */}
      <button
        title={isAllDrawingsHidden ? 'Show All Drawings' : 'Hide All Drawings'}
        aria-label="Hide All Drawings"
        data-tooltip="Hide All Drawings"
        disabled={!hasData}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          closeAllMenus();
          onToggleHideAllDrawings();
        }}
        className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
          isAllDrawingsHidden
            ? 'border-transparent bg-accent-muted text-accent'
            : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
        }`}
        style={{ width: '34px', height: '34px' }}
      >
        <ToolIconWrapper>
          <HideAllDrawingsIcon className="w-full h-full text-current" />
        </ToolIconWrapper>
      </button>

      {/* Divider 3: End of Action Tools */}
      <div className="w-[34px] border-t border-border-def/60 my-0.5" />

      {/* --- DELETE ALL DRAWINGS --- */}
      <button
        title="Remove All Drawings"
        aria-label="Remove All Drawings"
        data-tooltip="Remove All Drawings"
        disabled={!hasData}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          closeAllMenus();
          onClearDrawings();
        }}
        className="p-1.5 rounded-md border border-transparent text-txt-muted hover:text-status-error hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none"
        style={{ width: '34px', height: '34px' }}
      >
        <ToolIconWrapper>
          <DeleteIcon className="w-full h-full text-current" />
        </ToolIconWrapper>
      </button>

      {/* Bottom Sidebar: Favorite Drawing Tools Toolbar Toggle */}
      <div className="mt-auto w-[44px] flex items-center justify-center pt-2 pb-0.5">
        <button
          title="Favorite Drawing Tools Toolbar"
          aria-label="Favorite Drawing Tools Toolbar"
          data-tooltip="Favorite Drawing Tools Toolbar"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeAllMenus();
            onToggleFavoriteToolbar();
          }}
          className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
            isFavoriteToolbarOpen
              ? 'bg-surface-elevated text-txt-primary border-border-def shadow-sm'
              : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
          }`}
          style={{ width: '34px', height: '34px' }}
        >
          <ToolIconWrapper>
            <Star className={`w-full h-full ${isFavoriteToolbarOpen ? 'fill-current text-txt-primary' : 'text-current'}`} />
          </ToolIconWrapper>
        </button>
      </div>
    </>
  );
};
