import React from 'react';

interface ResetViewOverlayProps {
  hasData: boolean;
  isSettingResetView: boolean;
  isHoldingResetView: boolean;
  isHoveringBottom10: boolean;
  onCancelSettingResetView: () => void;
  onResetPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onResetPointerUp: () => void;
  onResetPointerLeave: () => void;
}

export const ResetViewOverlay: React.FC<ResetViewOverlayProps> = ({
  hasData,
  isSettingResetView,
  isHoldingResetView,
  isHoveringBottom10,
  onCancelSettingResetView,
  onResetPointerDown,
  onResetPointerUp,
  onResetPointerLeave,
}) => {
  return (
    <>
      {/* Reset View Point Setting Active Banner */}
      {isSettingResetView && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-surface-elevated/95 border border-accent shadow-xl backdrop-blur-md text-[11px] font-semibold text-accent select-none">
          <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
          <span>Click anywhere on the chart to set your new Reset View point</span>
          <button
            onClick={onCancelSettingResetView}
            className="ml-2 px-2 py-0.5 rounded text-[10px] text-txt-muted hover:text-txt-primary hover:bg-surface-hover cursor-pointer"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Reset View Button Overlay */}
      {hasData && !isSettingResetView && (
        <button
          onPointerDown={onResetPointerDown}
          onPointerUp={onResetPointerUp}
          onPointerLeave={onResetPointerLeave}
          title="Click to reset view • Hold 2s to set reset view point"
          className={`
            absolute bottom-8 left-1/2 -translate-x-1/2 z-20
            relative overflow-hidden flex items-center gap-1.5
            px-3.5 py-1.5
            bg-surface-elevated/90 hover:bg-surface-hover
            border ${isHoldingResetView ? 'border-accent shadow-accent/20' : 'border-border-def hover:border-border-focus'}
            text-txt-secondary hover:text-txt-primary
            text-[10px] font-semibold tracking-wider uppercase
            rounded-full
            backdrop-blur-xs
            shadow-lg
            transition-all duration-200
            select-none
            cursor-pointer
            ${isHoveringBottom10 || isHoldingResetView ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-95'}
          `}
        >
          {/* Hold visual progress indicator */}
          {isHoldingResetView && (
            <span
              className="absolute inset-0 bg-accent/20 transition-all duration-[2000ms] ease-linear"
              style={{ width: isHoldingResetView ? '100%' : '0%' }}
            />
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isHoldingResetView ? 'animate-spin text-accent' : ''}
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          <span className="relative z-10">
            {isHoldingResetView ? 'Hold to Set...' : 'Reset View'}
          </span>
        </button>
      )}
    </>
  );
};
