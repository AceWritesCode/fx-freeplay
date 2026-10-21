import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  FolderOpen,
  Database,
  Upload,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Play,
  Layers,
  Terminal as TerminalIcon,
  ChevronDown,
  ChevronUp,
  Monitor,
  Check,
} from 'lucide-react';
import type { ImportProgressState } from '@/coordinator';
import {
  mt5BridgeClient,
  type SystemCheckResult,
  type TerminalInfo,
  type ActiveChartInfo,
} from '@/bridge/mt5BridgeClient';

interface WorkspaceImportOverlayProps {
  importProgress: ImportProgressState | null;
  isBootstrapped: boolean;
  hasData: boolean;
  onResetImportProgress: () => void;
  onSelectFolder: () => void;
  onAutoImportSuccess?: () => void;
}

export const WorkspaceImportOverlay: React.FC<WorkspaceImportOverlayProps> = ({
  importProgress,
  isBootstrapped,
  hasData,
  onResetImportProgress,
  onSelectFolder,
  onAutoImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');

  // Accordion state for System Prerequisites
  const [isPrereqOpen, setIsPrereqOpen] = useState(false);

  // MT5 Bridge state
  const [checkingSystem, setCheckingSystem] = useState(false);
  const [sysCheck, setSysCheck] = useState<SystemCheckResult | null>(null);
  const [selectedTerminal, setSelectedTerminal] = useState<TerminalInfo | null>(null);
  const [activeChart, setActiveChart] = useState<ActiveChartInfo | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Drag and drop state for manual tab
  const [isDragging, setIsDragging] = useState(false);

  // Run system pre-flight check
  const runPreflightCheck = async () => {
    setCheckingSystem(true);
    setSyncError(null);
    try {
      const res = await mt5BridgeClient.checkSystem();
      setSysCheck(res);
      if (res.terminals && res.terminals.length > 0) {
        setSelectedTerminal((prev) => prev || res.terminals[0]);
      }
      // If prerequisites not met, open accordion automatically
      const ready = res.python_installed && res.mt5_package_installed && res.terminals_count > 0;
      if (!ready) {
        setIsPrereqOpen(true);
      }
      const chart = await mt5BridgeClient.getActiveChart();
      setActiveChart(chart);
    } catch (err: any) {
      setSyncError(err?.message || 'Failed to check system dependencies.');
      setIsPrereqOpen(true);
    } finally {
      setCheckingSystem(false);
    }
  };

  useEffect(() => {
    if (!hasData && isBootstrapped) {
      runPreflightCheck();
    }
  }, [hasData, isBootstrapped]);

  // Handle Sync action
  const handleSyncChart = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await mt5BridgeClient.syncChart(selectedTerminal?.exe_path, 50000);
      setSyncResult(`Successfully imported ${res.bars_imported} bars for ${res.symbol} (${res.timeframe}) into SQLite database!`);
      if (onAutoImportSuccess) {
        onAutoImportSuccess();
      }
    } catch (err: any) {
      setSyncError(err?.message || 'Synchronization failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    // Trigger directory selection
    onSelectFolder();
  };

  if (importProgress) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-overlay-bg backdrop-blur-xs p-6 text-center select-none transition-all duration-300">
        <div className="max-w-md w-full bg-modal-bg border border-border-def rounded-xl p-6 shadow-2xl flex flex-col items-center gap-5">
          {importProgress.status === 'error' ? (
            <>
              <div className="w-12 h-12 rounded-full bg-status-error/10 border border-status-error/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-status-error" />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <h2 className="text-base font-bold text-txt-primary tracking-tight">Import Failed</h2>
                <p className="text-xs text-status-error bg-status-error/10 border border-status-error/20 rounded-lg p-3 text-left whitespace-pre-wrap font-mono max-h-36 overflow-y-auto">
                  {importProgress.errorMessage}
                </p>
              </div>
              <div className="flex items-center gap-3 w-full pt-1">
                <button
                  onClick={onResetImportProgress}
                  className="flex-1 py-2 px-3 bg-surface-elevated hover:bg-surface-hover text-txt-secondary rounded-lg text-xs font-semibold border border-border-def transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={onSelectFolder}
                  className="flex-1 py-2 px-3 bg-accent hover:bg-accent-hover text-txt-inverse rounded-lg text-xs font-semibold shadow-lg border border-accent transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Select Folder</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-accent-muted border border-accent/20 flex items-center justify-center">
                <Database className="w-6 h-6 text-accent animate-pulse" />
              </div>
              <div className="flex flex-col gap-1 w-full">
                <h2 className="text-base font-bold text-txt-primary tracking-tight">Loading Market Data</h2>
                <p className="text-xs text-txt-muted">
                  {importProgress.currentActivity}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full flex flex-col gap-2">
                <div className="w-full bg-app-bg rounded-full h-2 overflow-hidden border border-border-sub relative">
                  {importProgress.status === 'scanning' ? (
                    <div className="h-full bg-accent rounded-full animate-pulse w-full" />
                  ) : (
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          importProgress.totalCount > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (importProgress.processedCount /
                                    importProgress.totalCount) *
                                    100
                                )
                              )
                            : 0
                        }%`,
                      }}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-txt-muted font-medium px-0.5">
                  <span>
                    {importProgress.status === 'scanning'
                      ? 'Scanning files...'
                      : importProgress.status === 'validating'
                      ? 'Validating files...'
                      : importProgress.status === 'preparing'
                      ? 'Preparing chart...'
                      : `Processing ${importProgress.processedCount} / ${importProgress.totalCount}`}
                  </span>
                  <span>
                    {importProgress.totalCount > 0 && importProgress.status !== 'scanning'
                      ? `${Math.min(
                          100,
                          Math.round(
                            (importProgress.processedCount /
                              importProgress.totalCount) *
                              100
                          )
                        )}%`
                      : ''}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!isBootstrapped) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-app-bg select-none">
        <div className="w-8 h-8 rounded-full border-[3px] border-border-def border-t-accent animate-spin" />
      </div>
    );
  }

  if (!hasData) {
    const isPythonReady = !!sysCheck?.python_installed;
    const isMt5PkgReady = !!sysCheck?.mt5_package_installed;
    const hasTerminals = (sysCheck?.terminals_count || 0) > 0;
    const allRequirementsMet = isPythonReady && isMt5PkgReady && hasTerminals;

    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-app-bg p-6 text-center select-none">
        {/* Modal Container with Fixed Height (h-[580px]) so height stays identical across tabs */}
        <div className="max-w-[540px] w-full h-[580px] bg-modal-bg border border-border-def rounded-2xl p-6 shadow-2xl flex flex-col text-left">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-sub pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-muted border border-accent/20 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-base font-bold text-txt-primary tracking-tight">Load Forex Market Data</h2>
                <p className="text-txt-muted text-xs">Choose automated MT5 synchronization or manual folder import.</p>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-surface-elevated p-1 rounded-xl border border-border-sub my-4 shrink-0">
            <button
              onClick={() => setActiveTab('auto')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'auto'
                  ? 'bg-accent text-txt-inverse shadow-sm'
                  : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>Auto Import (MT5 Bridge)</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-accent text-txt-inverse shadow-sm'
                  : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Manual Import (CSV Folder)</span>
            </button>
          </div>

          {/* TAB 1: AUTO IMPORT (MT5 BRIDGE) */}
          {activeTab === 'auto' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 gap-3.5">
              
              {/* Accordion: System Prerequisites Check */}
              <div className="bg-surface-elevated/80 border border-border-def rounded-xl overflow-hidden shrink-0 transition-all duration-200">
                <div
                  onClick={() => setIsPrereqOpen(!isPrereqOpen)}
                  className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-surface-hover/50 select-none transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold text-txt-primary">System Prerequisites Check</span>
                    {allRequirementsMet ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-success/10 text-status-success border border-status-success/20 font-semibold">
                        Ready
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-warning/10 text-status-warning border border-status-warning/20 font-semibold">
                        Setup Required
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        runPreflightCheck();
                      }}
                      disabled={checkingSystem}
                      className="text-[11px] text-accent hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${checkingSystem ? 'animate-spin' : ''}`} />
                      <span>Re-check</span>
                    </button>
                    {isPrereqOpen ? (
                      <ChevronUp className="w-4 h-4 text-txt-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-txt-muted" />
                    )}
                  </div>
                </div>

                {isPrereqOpen && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-border-sub/60 flex flex-col gap-2 text-xs">
                    {/* Python check */}
                    <div className="flex items-center justify-between py-1.5 border-b border-border-sub/40">
                      <div className="flex items-center gap-2">
                        {isPythonReady ? (
                          <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-status-error shrink-0" />
                        )}
                        <span className="text-txt-primary font-medium">
                          Python 3 {sysCheck?.python_version ? `(${sysCheck.python_version})` : ''}
                        </span>
                      </div>
                      {!isPythonReady && (
                        <button
                          onClick={() => mt5BridgeClient.openExternal('https://www.python.org/downloads/windows/')}
                          className="py-1 px-2.5 bg-status-error/10 hover:bg-status-error/20 text-status-error border border-status-error/30 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Download Python</span>
                        </button>
                      )}
                    </div>

                    {/* MT5 Python Package Check */}
                    <div className="flex items-center justify-between py-1.5 border-b border-border-sub/40">
                      <div className="flex items-center gap-2">
                        {isMt5PkgReady ? (
                          <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-status-error shrink-0" />
                        )}
                        <span className="text-txt-primary font-medium">MetaTrader5 Python Library</span>
                      </div>
                      {!isMt5PkgReady && isPythonReady && (
                        <button
                          onClick={() => mt5BridgeClient.openExternal('https://pypi.org/project/MetaTrader5/')}
                          className="py-1 px-2.5 bg-status-error/10 hover:bg-status-error/20 text-status-error border border-status-error/30 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>pip install MetaTrader5</span>
                        </button>
                      )}
                    </div>

                    {/* MT5 Desktop Terminals Check */}
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        {hasTerminals ? (
                          <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-status-error shrink-0" />
                        )}
                        <span className="text-txt-primary font-medium">
                          MetaTrader 5 Desktop Terminal ({sysCheck?.terminals_count || 0} detected)
                        </span>
                      </div>
                      {!hasTerminals && (
                        <button
                          onClick={() => mt5BridgeClient.openExternal('https://www.metatrader5.com/en/download')}
                          className="py-1 px-2.5 bg-status-error/10 hover:bg-status-error/20 text-status-error border border-status-error/30 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Download MT5</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Terminal Card Selection List (No dropdown, interactive cards) */}
              <div className="flex-1 flex flex-col min-h-0 gap-2">
                <div className="flex items-center justify-between shrink-0">
                  <label className="text-xs font-bold text-txt-primary">
                    Select MetaTrader 5 Terminal
                  </label>
                  {activeChart && (
                    <span className="text-[11px] text-accent font-medium">
                      Active: {activeChart.symbol} ({activeChart.timeframe})
                    </span>
                  )}
                </div>

                {allRequirementsMet ? (
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[160px]">
                    {sysCheck?.terminals.map((term, idx) => {
                      const isSelected = selectedTerminal?.exe_path === term.exe_path;
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedTerminal(term)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-accent/10 border-accent shadow-sm'
                              : 'bg-surface-elevated/60 border-border-def hover:border-border-hover hover:bg-surface-elevated'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-accent text-txt-inverse'
                                  : 'bg-surface-elevated text-txt-secondary'
                              }`}
                            >
                              <Monitor className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-txt-primary truncate">
                                {term.name}
                              </span>
                              <span className="text-[11px] text-txt-muted truncate font-mono">
                                {term.exe_path}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-accent text-txt-inverse flex items-center justify-center shrink-0 ml-2">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-status-warning/10 border border-status-warning/20 rounded-xl text-xs text-txt-secondary flex flex-col gap-1 shrink-0">
                    <div className="font-bold text-status-warning flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Setup Required</span>
                    </div>
                    <p>
                      Please click on <strong>System Prerequisites Check</strong> above to review missing dependencies.
                    </p>
                  </div>
                )}
              </div>

              {/* Status feedback */}
              {syncError && (
                <div className="text-xs text-status-error bg-status-error/10 border border-status-error/20 rounded-lg p-2.5 shrink-0">
                  {syncError}
                </div>
              )}
              {syncResult && (
                <div className="text-xs text-status-success bg-status-success/10 border border-status-success/20 rounded-lg p-2.5 shrink-0">
                  {syncResult}
                </div>
              )}

              {/* Action Button */}
              <div className="shrink-0 pt-1">
                <button
                  onClick={handleSyncChart}
                  disabled={syncing || !allRequirementsMet}
                  className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-txt-inverse rounded-xl text-xs font-semibold shadow-lg border border-accent transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {syncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  <span>
                    {syncing
                      ? 'Connecting & Synchronizing...'
                      : 'Connect & Import Active Chart (SQLite)'}
                  </span>
                </button>
                <p className="text-[11px] text-txt-muted text-center mt-1.5">
                  If the terminal is stopped, it will launch automatically and extract the chart data.
                </p>
              </div>

            </div>
          )}

          {/* TAB 2: MANUAL CSV IMPORT (WITH DRAG & DROP ZONE, SAME HEIGHT) */}
          {activeTab === 'manual' && (
            <div className="flex-1 flex flex-col min-h-0 gap-4">
              {/* Drag and Drop Zone Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={onSelectFolder}
                className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-accent bg-accent/10'
                    : 'border-border-def bg-surface-elevated/40 hover:bg-surface-elevated/70 hover:border-border-hover'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-modal-bg border border-border-def flex items-center justify-center mb-3 shadow-sm">
                  <FolderOpen className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-sm font-bold text-txt-primary">Drag and drop folder</h3>
                <p className="text-xs text-txt-muted mt-1 max-w-xs">
                  Drag your exported MT5 data folder here, or click to browse files from your computer.
                </p>
              </div>

              {/* Action Button */}
              <div className="shrink-0">
                <button
                  onClick={onSelectFolder}
                  className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-txt-inverse rounded-xl text-xs font-semibold shadow-lg border border-accent transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Open Directory (Folder Mode)</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return null;
};
