import React, { useRef } from 'react';
import { 
  Folder, 
  List, 
  RefreshCw, 
  Plus, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
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
  savedFolderHandle: any;
  isVerifyingFolder: boolean;
  handleRestoreSavedFolder: () => void;
  onClearFolderHandles: () => void;
  isRestoreError: boolean;
  symbolFilesMap: Record<string, any>;
  loadSymbolFromFolder: (sym: string) => void;
  activeSymbol: string | null;
  onRemoveSymbol: (sym: string) => void;
  onAddSymbolFolder?: () => void;
  onAddSymbolFile?: (file: File) => void;
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
    savedFolderHandle,
    isVerifyingFolder,
    handleRestoreSavedFolder,
    onClearFolderHandles,
    isRestoreError,
    symbolFilesMap,
    loadSymbolFromFolder,
    activeSymbol,
    onRemoveSymbol,
    onAddSymbolFolder,
    onAddSymbolFile,
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
  const watchlistAddInputRef = useRef<HTMLInputElement>(null);

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
      className="h-full border-l border-gray-950 bg-[#1e222d] flex relative z-10 flex-shrink-0 transition-[width] duration-150"
    >
      {/* Resizer bar */}
      {isSidebarVisible && (
        <div
          onMouseDown={handleMouseDownResize}
          className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-indigo-500/50 transition-all ${
            isResizingRightPanel ? 'bg-indigo-650' : 'bg-transparent'
          }`}
        />
      )}

      {/* Tabs list on the left side of sidebar */}
      <div className="w-11 border-r border-gray-950 flex flex-col items-center py-3 gap-3 flex-shrink-0 bg-[#1e222d]">
        <button
          onClick={() => setActiveRightTab(activeRightTab === 'watchlist' ? null : 'watchlist')}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            activeRightTab === 'watchlist' ? 'bg-indigo-600/10 text-indigo-400' : 'text-gray-500 hover:text-gray-300'
          }`}
          title="Watchlist Panel"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveRightTab(activeRightTab === 'objectTree' ? null : 'objectTree')}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            activeRightTab === 'objectTree' ? 'bg-indigo-600/10 text-indigo-400' : 'text-gray-500 hover:text-gray-300'
          }`}
          title="Object Tree Panel"
        >
          <Folder className="w-4 h-4" />
        </button>
      </div>

      {/* Main Tab content container */}
      {isSidebarVisible && (
        <div className="flex-1 h-full flex flex-col min-w-0 bg-[#1c1f28] overflow-hidden">
          {activeRightTab === 'watchlist' ? (
            <div className="flex-1 h-full flex flex-col min-w-0">
              {/* Panel header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-950/40">
                <div className="flex items-center gap-2">
                  <List className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white">Watchlist</span>
                  {watchlistSymbols.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-full">
                      {watchlistSymbols.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* Refresh folder button (visible in folder mode when savedFolderHandle is present) */}
                  {importMode === 'folder' && savedFolderHandle && (
                    <button
                      onClick={handleRestoreSavedFolder}
                      disabled={isVerifyingFolder}
                      title="Refresh folder data"
                      className="p-1 rounded-md text-gray-500 hover:text-indigo-350 hover:bg-indigo-600/10 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingFolder ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                  {/* + Add symbol icon button */}
                  <button
                    onClick={() => {
                      if (importMode === 'folder') {
                        onAddSymbolFolder?.();
                      } else {
                        watchlistAddInputRef.current?.click();
                      }
                    }}
                    title={importMode === 'folder' ? "Add symbol folder" : "Add symbol from CSV"}
                    className="p-1 rounded-md text-gray-500 hover:text-indigo-350 hover:bg-indigo-600/10 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={watchlistAddInputRef}
                    type="file"
                    accept=".csv"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        Array.from(e.target.files).forEach(file => {
                          onAddSymbolFile?.(file);
                        });
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {/* Watchlist items list */}
              <div className="flex-1 overflow-y-auto py-2 px-3 flex flex-col gap-1 select-none">
                
                {/* Folder status status information */}
                {importMode === 'folder' && savedFolderHandle && (
                  <div className="mb-2 p-2 bg-gray-950/40 rounded-lg border border-gray-850 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isVerifyingFolder ? (
                        <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                      ) : isRestoreError ? (
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      )}
                      <span className="text-gray-400 truncate">Folder Mode:</span>
                      <span className="text-emerald-300/70 font-mono truncate">{savedFolderHandle.name}</span>
                    </div>
                    <button
                      onClick={onClearFolderHandles}
                      title="Disconnect directory"
                      className="p-0.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Watchlist Toast Notification */}
                {watchlistToast && (
                  <div className={`mb-2 px-3 py-2 rounded-lg text-[11px] font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
                    watchlistToast.type === 'error'
                      ? 'bg-red-500/10 border border-red-500/25 text-red-400'
                      : 'bg-indigo-500/10 border border-indigo-500/25 text-indigo-300'
                  }`}>
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{watchlistToast.msg}</span>
                  </div>
                )}

                {watchlistSymbols.map((item) => {
                  const isSelected = item.name === activeSymbol;
                  const hasFiles = symbolFilesMap[item.name] !== undefined;

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
                            ? 'bg-indigo-650 border border-indigo-500 text-white shadow-md'
                            : 'bg-transparent border border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-white'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {importMode === 'folder' ? (
                          <Folder className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-gray-500 group-hover/item:text-gray-400'}`} />
                        ) : (
                          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-400' : 'bg-gray-750 group-hover:bg-gray-500'}`} />
                        )}
                        <span className="truncate text-xs font-semibold">{item.name}</span>
                        {importMode === 'folder' && hasFiles && (
                          <span className="text-[9px] px-1 bg-gray-950/60 text-gray-500 rounded font-mono group-hover/item:bg-gray-900">
                            {Object.keys(symbolFilesMap[item.name]).length} TF
                          </span>
                        )}
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
