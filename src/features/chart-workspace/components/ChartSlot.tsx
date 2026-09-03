import React from 'react';
import { SlotFloatingTextOverlays } from './SlotFloatingTextOverlays';

interface ChartSlotProps {
  slotIndex: number;
  isActive: boolean;
  isMultiChart: boolean;
  slotInfo?: { symbol: string | null; timeframe: string };
  settings: any;
  isSelectingCutPoint: boolean;
  cutPointHoverX: number | null;
  isSettingResetView?: boolean;
  resetViewHoverX?: number | null;
  isDrawingBlocked: boolean;
  selectedOverlayIds: string[];
  hoveredOverlayId: string | null;
  chartInstancesRef: React.MutableRefObject<(any | null)[]>;
  syncAllDrawings: () => void;
  setDrawingTrigger: React.Dispatch<React.SetStateAction<number>>;
  onSelectSlot: (index: number) => void;
  setContainerRef: (el: HTMLDivElement | null) => void;
}

export const ChartSlot: React.FC<ChartSlotProps> = ({
  slotIndex,
  isActive,
  isMultiChart,
  slotInfo,
  settings,
  isSelectingCutPoint,
  cutPointHoverX,
  isSettingResetView = false,
  resetViewHoverX = null,
  isDrawingBlocked,
  selectedOverlayIds,
  hoveredOverlayId,
  chartInstancesRef,
  syncAllDrawings,
  setDrawingTrigger,
  onSelectSlot,
  setContainerRef,
}) => {
  return (
    <div
      data-chart-slot-index={slotIndex}
      data-chart-symbol={slotInfo?.symbol || ''}
      data-chart-timeframe={slotInfo?.timeframe || ''}
      onClick={() => onSelectSlot(slotIndex)}
      className={`
        relative w-full h-full bg-slot-bg overflow-hidden transition-colors duration-200 cursor-pointer min-w-[150px] min-h-[150px]
        ${isMultiChart ? 'rounded' : ''}
        ${isMultiChart && isActive ? 'ring-2 ring-accent/40 z-10 shadow-md shadow-accent/5' : isMultiChart ? 'border border-border-sub hover:border-border-def' : ''}
      `}
    >
      <div
        ref={setContainerRef}
        className={`w-full h-full ${
          isSelectingCutPoint && isActive
            ? 'cursor-cell'
            : isSettingResetView && isActive
            ? 'cursor-crosshair'
            : ''
        }`}
        style={{
          background:
            settings.backgroundType === 'None'
              ? 'transparent'
              : settings.backgroundType === 'Gradient'
              ? `linear-gradient(180deg, ${settings.background} 0%, ${settings.backgroundGradientStop || '#1e222d'} 100%)`
              : settings.background,
        }}
      />

      {/* Blocked interaction overlay for inactive slots during an active drawing session */}
      {isDrawingBlocked && (
        <div
          className="absolute inset-0 z-40 cursor-not-allowed bg-transparent"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Finish or cancel the active drawing session on the current chart first"
        />
      )}

      {/* Vertical Cut Selection Line */}
      {isSelectingCutPoint && isActive && cutPointHoverX !== null && (
        <div
          className="absolute top-0 bottom-0 w-px border-l border-dashed border-status-error pointer-events-none z-30"
          style={{ left: `${cutPointHoverX}px` }}
        />
      )}

      {/* Vertical Reset View Point Selection Line */}
      {isSettingResetView && isActive && resetViewHoverX !== null && (
        <div
          className="absolute top-0 bottom-0 w-px border-l border-dashed border-accent pointer-events-none z-30"
          style={{ left: `${resetViewHoverX}px` }}
        >
          <div className="absolute top-12 -left-14 px-2 py-0.5 rounded bg-surface-elevated/95 border border-accent text-[10px] font-semibold text-accent shadow-md backdrop-blur-xs whitespace-nowrap select-none">
            Reset View Point
          </div>
        </div>
      )}

      {/* Slot Info Badge */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded bg-surface-elevated/85 backdrop-blur-sm border border-border-sub pointer-events-none select-none text-[10px] font-bold text-txt-primary">
        <span className={isActive ? 'text-accent' : 'text-txt-muted'}>#{slotIndex + 1}</span>
        <span>{slotInfo?.symbol || 'No Symbol'}</span>
        <span className="text-txt-muted">•</span>
        <span className="text-txt-secondary font-semibold">{slotInfo?.timeframe || '1m'}</span>
      </div>

      {/* Floating text inputs for TrendLines, Rectangles and Text tools */}
      <SlotFloatingTextOverlays
        chart={chartInstancesRef.current[slotIndex]}
        selectedOverlayIds={selectedOverlayIds}
        hoveredOverlayId={hoveredOverlayId}
        chartInstancesRef={chartInstancesRef}
        syncAllDrawings={syncAllDrawings}
        setDrawingTrigger={setDrawingTrigger}
      />
    </div>
  );
};
