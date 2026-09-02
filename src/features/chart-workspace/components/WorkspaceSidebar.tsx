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
    <path fill="currentColor" fillRule="evenodd" d="m22 11 11 11-11 11-11-11 11-11Zm0 1.414L12.414 22 22 31.586 31.586 22 22 12.414Z"></path>
    <path fill="currentColor" fillRule="evenodd" d="m22 15 7 7-7 7-7-7 7-7Zm0 1.414L16.414 22 22 27.586 27.586 22 22 16.414Z"></path>
    <path fill="currentColor" d="m22 19 3 3-3 3-3-3 3-3Z"></path>
  </svg>
);
import { ObjectTreePanel } from '@/components/ObjectTreePanel';

interface WorkspaceSidebarProps {
  activeRightTab: 'watchlist' | 'objectTree' | null;
  setActiveRightTab: (tab: 'watchlist' | 'objectTree' | null) => void;
  rightPanelWidth: number;
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
  createOverlayWithHandlers: (chart: any, overlay: any) => void;
  watchlistToast: { msg: string; type: 'info' | 'error' | 'success' } | null;
  activeChartIndex: number;
  activeTimeframe: string;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = (props) => {
  const {
    activeRightTab,
    setActiveRightTab,
    rightPanelWidth,
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
    createOverlayWithHandlers,
    watchlistToast,
    activeChartIndex,
    activeTimeframe,
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
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(220, Math.min(600, newWidth));
      
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
  }, [isResizingRightPanel, onResizeEnd]);

  // Sidebar toggle visibility
  const isSidebarVisible = activeRightTab !== null;

  return (
    <div 
      ref={sidebarRef}
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

      {/* Tabs list on the left side of sidebar */}
      <div className="w-11 border-r border-border-def flex flex-col items-center py-3 gap-3 flex-shrink-0 bg-surface">
        <button
          onClick={() => setActiveRightTab(activeRightTab === 'watchlist' ? null : 'watchlist')}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            activeRightTab === 'watchlist' ? 'bg-accent-muted text-accent' : 'text-txt-muted hover:text-txt-primary'
          }`}
          title="Watchlist Panel"
        >
          <WatchlistTabIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveRightTab(activeRightTab === 'objectTree' ? null : 'objectTree')}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            activeRightTab === 'objectTree' ? 'bg-accent-muted text-accent' : 'text-txt-muted hover:text-txt-primary'
          }`}
          title="Object Tree Panel"
        >
          <ObjectTreeTabIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Main Tab content container */}
      {isSidebarVisible && (
        <div className="flex-1 h-full flex flex-col min-w-0 bg-surface overflow-hidden">
          {activeRightTab === 'watchlist' ? (
            <div className="flex-1 h-full flex flex-col min-w-0">
              {/* Panel header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-sub">
                <div className="flex items-center gap-2">
                  <WatchlistTabIcon className="w-3.5 h-3.5 text-accent" />
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
                    title="Add symbol folder"
                    className="p-1 rounded-md text-txt-muted hover:text-accent hover:bg-accent-muted transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Watchlist items list */}
              <div className="flex-1 overflow-y-auto py-2 px-3 flex flex-col gap-1 select-none">
                

                {/* Watchlist Toast Notification */}
                {watchlistToast && (
                  <div className={`mb-2 px-3 py-2 rounded-lg text-[11px] font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
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

                  return (
                    <div
                      key={item.name}
                      onClick={() => loadSymbolFromFolder(item.name)}
                      className={`
                        w-full flex items-center justify-between gap-2
                        px-3 py-2 rounded-xl text-left cursor-pointer
                        transition-all duration-150 group/item
                        ${
                          isSelected
                            ? 'bg-accent-muted border-l-2 border-accent text-txt-primary font-semibold pl-2.5 pr-3 py-2 rounded-r-sm rounded-l-sm'
                            : 'bg-transparent border-l-2 border-transparent text-txt-muted hover:bg-surface-hover hover:text-txt-primary pl-2.5 pr-3 py-2 rounded-r-sm rounded-l-sm'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {importMode === 'folder' ? (
                          <ObjectTreeTabIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-accent' : 'text-txt-muted group-hover/item:text-txt-primary'}`} />
                        ) : (
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-accent' : 'bg-surface-active group-hover:bg-txt-muted'}`} />
                        )}
                        <span className="truncate text-xs font-semibold">{item.name}</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSymbol(item.name);
                        }}
                        className="p-1 rounded opacity-0 group-hover/item:opacity-100 text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <ObjectTreePanel
              chartInstancesRef={chartInstancesRef}
              activeChartIndex={activeChartIndex}
              syncAllDrawings={syncAllDrawings}
              drawingTrigger={drawingTrigger}
              setDrawingTrigger={setDrawingTrigger}
              activeSymbol={activeSymbol || 'No Symbol'}
              activeTimeframe={activeTimeframe}
              createOverlayWithHandlers={createOverlayWithHandlers}
            />
          )}
        </div>
      )}
    </div>
  );
};
