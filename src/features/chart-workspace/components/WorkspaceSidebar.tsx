import React, { useRef } from 'react';
import { 
  Plus, 
  X, 
  AlertCircle
} from 'lucide-react';

// TradingView sidebar panel icons
const WatchlistTabIcon = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" className={className}>
    <path fill="currentColor" d="M28 16H16v1h12v-1ZM28 20H16v1h12v-1ZM16 24h12v1H16v-1Z"></path>
    <path fill="currentColor" fillRule="evenodd" d="m22 30-10 4V12a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v22l-10-4Zm-9 2.52V12h18v20.52l-9-3.6-9 3.6Z"></path>
  </svg>
);

const ObjectTreeTabIcon = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" className={className}>
    <path fill="currentColor" d="M21.34 12.13a1 1 0 0 1 .98 0l10.41 5.93a1 1 0 0 1 0 1.73l-10.4 5.93a1 1 0 0 1-.99 0L10.78 19.8a1 1 0 0 1 0-1.75l10.56-5.92Zm.49.87-10.56 5.93 10.56 5.93 10.4-5.93L21.84 13ZM33.5 24.86l-11.66 6.8L10 25l.5-.87 11.33 6.38L32.99 24l.5.87Z"></path>
  </svg>
);

const SessionDisplayTabIcon = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" className={className}>
    <path fill="currentColor" fillRule="evenodd" d="M22 11a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm-9.5 11a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z" />
    <path fill="currentColor" d="M21.25 15.5a.75.75 0 0 1 .75.75v5.88l3.66 2.11a.75.75 0 1 1-.75 1.3l-4.04-2.33A.75.75 0 0 1 20.5 22.56v-6.31a.75.75 0 0 1 .75-.75Z" />
    <path fill="currentColor" d="M28 29.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM16 29.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" opacity="0.6" />
  </svg>
);

import { ObjectTreePanel } from '@/components/ObjectTreePanel';
import { SessionDisplayPanel } from '@/features/session-display';
import { getSymbolProfileCache } from '@/coordinator/workspaceCache';

interface WorkspaceSidebarProps {
  activeRightTab: 'watchlist' | 'objectTree' | 'sessionDisplay' | null;
  setActiveRightTab: (tab: 'watchlist' | 'objectTree' | 'sessionDisplay' | null) => void;
  rightPanelWidth: number;
  setRightPanelWidth?: (w: number) => void;
  isResizingRightPanel: boolean;
  onResizeStart: () => void;
  onResizeEnd: () => void;
  watchlistSymbols: any[];
  importMode: 'single' | 'folder';
  loadSymbolFromFolder: (sym: string) => void;
  activeSymbol: string | null;
  onRemoveSymbol: (sym: string) => void;
  onAddSymbolFolder?: () => void;
  chartInstancesRef: any;
  syncAllDrawings: () => void;
  drawingTrigger: number;
  setDrawingTrigger: (v: any) => void;
  watchlistToast: { msg: string; type: 'info' | 'error' | 'success' } | null;
  activeChartIndex: number;
  activeTimeframe: string;
  liveTicksBySymbol?: Record<string, { bid: number; ask: number; last: number; spread: number }>;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = (props) => {
  const {
    activeRightTab,
    setActiveRightTab,
    rightPanelWidth,
    setRightPanelWidth,
    isResizingRightPanel,
    onResizeStart,
    onResizeEnd,
    watchlistSymbols,
    importMode,
    loadSymbolFromFolder,
    activeSymbol,
    onRemoveSymbol,
    onAddSymbolFolder,
    chartInstancesRef,
    syncAllDrawings,
    drawingTrigger,
    setDrawingTrigger,
    watchlistToast,
    activeChartIndex,
    activeTimeframe,
    liveTicksBySymbol,
  } = props;

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Resize handler for Right Panel
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    onResizeStart();
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRightPanel) return;
      const rawWidth = window.innerWidth - e.clientX;
      
      // If user drags narrower than the cutoff threshold (140px), auto-close the drawer!
      if (rawWidth < 140) {
        setActiveRightTab(null);
        return;
      }
      
      const clampedWidth = Math.max(140, Math.min(600, rawWidth));
      setRightPanelWidth?.(clampedWidth);
      
      // Update custom property to dynamically resize CSS grid layout
      document.documentElement.style.setProperty('--right-panel-width', `${clampedWidth}px`);
    };

    const handleMouseUp = () => {
      onResizeEnd();
    };

    if (isResizingRightPanel) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingRightPanel, onResizeEnd, setActiveRightTab, setRightPanelWidth]);

  // Sidebar toggle visibility
  const isSidebarVisible = activeRightTab !== null;
  const currentEffectiveWidth = isSidebarVisible ? rightPanelWidth : 44;
  const showBidAsk = currentEffectiveWidth >= 260;
  const showSpread = currentEffectiveWidth >= 180;
  const gridColumnsClass = showBidAsk
    ? 'grid-cols-[1fr_64px_64px_36px_20px]'
    : showSpread
    ? 'grid-cols-[1fr_36px_20px]'
    : 'grid-cols-[1fr_20px]';

  return (
    <div 
      ref={sidebarRef}
      data-workspace-sidebar="true"
      style={{ width: isSidebarVisible ? `var(--right-panel-width, ${rightPanelWidth}px)` : '44px' }}
      className="h-full border-l border-border-def bg-surface flex relative z-10 flex-shrink-0 transition-[width] duration-150"
    >
      {/* Resizer bar */}
      {isSidebarVisible && (
        <div
          onMouseDown={handleMouseDownResize}
          className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-accent/50 transition-all ${
            isResizingRightPanel ? 'bg-accent' : 'bg-transparent'
          }`}
        />
      )}

      {/* Main Tab content container (opens to the left of the tab button column) */}
      {isSidebarVisible && (
        <div className="flex-1 h-full flex flex-col min-w-0 bg-surface overflow-hidden">
          {activeRightTab === 'watchlist' ? (
            <div className="flex-1 h-full flex flex-col min-w-0">
              {/* Panel header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-sub">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-txt-primary">Watchlist</span>
                  {watchlistSymbols.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-accent-muted text-accent border border-accent/30 rounded-full">
                      {watchlistSymbols.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* + Add symbol icon button */}
                  <button
                    onClick={() => {
                      onAddSymbolFolder?.();
                    }}
                    title={importMode === 'single' ? 'Search & Add Symbol (MT5)' : 'Add symbol folder'}
                    className="p-1 rounded-md text-txt-muted hover:text-accent hover:bg-accent-muted transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Watchlist Table Header */}
              <div className={`grid ${gridColumnsClass} items-center px-3 py-1.5 border-b border-border-sub text-[10px] font-bold text-txt-muted uppercase tracking-wider select-none`}>
                <span className="truncate">Symbol</span>
                {showBidAsk && <span className="text-right">Bid</span>}
                {showBidAsk && <span className="text-right">Ask</span>}
                {showSpread && <span className="text-right">Spr</span>}
                <span></span>
              </div>

              {/* Watchlist items list */}
              <div className="flex-1 overflow-y-auto py-1 px-1 flex flex-col gap-0.5 select-none">
                

                {/* Watchlist Toast Notification */}
                {watchlistToast && (
                  <div className={`mx-2 mb-2 px-3 py-2 rounded-lg text-[11px] font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
                    watchlistToast.type === 'error'
                      ? 'bg-status-error/10 border border-status-error/25 text-status-error'
                      : 'bg-accent-muted border border-accent/25 text-accent'
                  }`}>
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{watchlistToast.msg}</span>
                  </div>
                )}

                {watchlistSymbols.map((item) => {
                  const isSelected = item.name === activeSymbol;
                  const tick = liveTicksBySymbol?.[item.name];
                  const profile = getSymbolProfileCache(item.name);
                  const precision = (profile?.pricePrecision !== undefined && profile?.pricePrecision !== null)
                    ? profile.pricePrecision
                    : 5;

                  const formatPrice = (val?: number) => {
                    if (val === undefined || val === null || isNaN(val)) return '—';
                    return val.toFixed(precision);
                  };

                  return (
                    <div
                      key={item.name}
                      onClick={() => loadSymbolFromFolder(item.name)}
                      className={`
                        w-full grid ${gridColumnsClass} items-center
                        px-2 py-1.5 rounded-lg text-left cursor-pointer
                        transition-all duration-150 group/item text-xs
                        ${
                          isSelected
                            ? 'bg-accent-muted text-txt-primary font-semibold'
                            : 'bg-transparent text-txt-muted hover:bg-surface-hover hover:text-txt-primary'
                        }
                      `}
                    >
                      <div className="flex items-center min-w-0 pr-1">
                        <span className="truncate font-semibold text-txt-primary text-[11px]">{item.name}</span>
                      </div>

                      {showBidAsk && (
                        <div className="text-right font-mono text-[11px] font-medium text-txt-primary tabular-nums">
                          {formatPrice(tick?.bid)}
                        </div>
                      )}

                      {showBidAsk && (
                        <div className="text-right font-mono text-[11px] font-medium text-txt-primary tabular-nums">
                          {formatPrice(tick?.ask)}
                        </div>
                      )}

                      {showSpread && (
                        <div className="text-right font-mono text-[11px] text-txt-muted font-semibold tabular-nums">
                          {tick?.spread !== undefined ? tick.spread : '—'}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveSymbol(item.name);
                          }}
                          className="p-0.5 rounded opacity-0 group-hover/item:opacity-100 text-txt-muted hover:text-status-error hover:bg-status-error/10 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeRightTab === 'objectTree' ? (
            <ObjectTreePanel
              chartInstancesRef={chartInstancesRef}
              activeChartIndex={activeChartIndex}
              syncAllDrawings={syncAllDrawings}
              drawingTrigger={drawingTrigger}
              setDrawingTrigger={setDrawingTrigger}
              activeSymbol={activeSymbol || 'No Symbol'}
              activeTimeframe={activeTimeframe}
            />
          ) : activeRightTab === 'sessionDisplay' ? (
            <SessionDisplayPanel />
          ) : null}
        </div>
      )}

      {/* Tabs list permanently docked to the right edge */}
      <div className="w-11 border-l border-border-def flex flex-col items-center py-2 gap-1 flex-shrink-0 bg-surface">
        <button
          onClick={() => setActiveRightTab(activeRightTab === 'watchlist' ? null : 'watchlist')}
          className={`w-[33px] h-[33px] rounded-md transition-all flex items-center justify-center outline-none cursor-pointer ${
            activeRightTab === 'watchlist'
              ? 'bg-accent-muted text-accent'
              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
          }`}
          title="Watchlist Panel"
        >
          <WatchlistTabIcon className="w-[20px] h-[20px]" />
        </button>
        <button
          onClick={() => setActiveRightTab(activeRightTab === 'objectTree' ? null : 'objectTree')}
          className={`w-[33px] h-[33px] rounded-md transition-all flex items-center justify-center outline-none cursor-pointer ${
            activeRightTab === 'objectTree'
              ? 'bg-accent-muted text-accent'
              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
          }`}
          title="Object Tree Panel"
        >
          <ObjectTreeTabIcon className="w-[20px] h-[20px]" />
        </button>
        <button
          onClick={() => setActiveRightTab(activeRightTab === 'sessionDisplay' ? null : 'sessionDisplay')}
          className={`w-[33px] h-[33px] rounded-md transition-all flex items-center justify-center outline-none cursor-pointer ${
            activeRightTab === 'sessionDisplay'
              ? 'bg-accent-muted text-accent'
              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
          }`}
          title="Session Display Panel"
        >
          <SessionDisplayTabIcon className="w-[20px] h-[20px]" />
        </button>
      </div>
    </div>
  );
};
