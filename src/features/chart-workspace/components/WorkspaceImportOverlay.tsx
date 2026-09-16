import React from 'react';
import { AlertTriangle, FolderOpen, Database, Upload } from 'lucide-react';
import type { ImportProgressState } from '@/coordinator';

interface WorkspaceImportOverlayProps {
  importProgress: ImportProgressState | null;
  isBootstrapped: boolean;
  hasData: boolean;
  onResetImportProgress: () => void;
  onSelectFolder: () => void;
}

export const WorkspaceImportOverlay: React.FC<WorkspaceImportOverlayProps> = ({
  importProgress,
  isBootstrapped,
  hasData,
  onResetImportProgress,
  onSelectFolder,
}) => {
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

              {/* Real Progress Bar */}
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
    return (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-app-bg p-6 text-center select-none">
        <div className="max-w-md flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-accent-muted border border-accent/20 flex items-center justify-center animate-pulse">
            <Upload className="w-7 h-7 text-accent" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-txt-primary tracking-tight">Load Forex Market Data</h2>
            <p className="text-txt-muted text-xs leading-relaxed px-4">
              Import MT5 CSV candlesticks to replay, annotate, and test your trading edge.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 w-full">
            <button
              onClick={onSelectFolder}
              className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-txt-inverse rounded-lg text-xs font-semibold shadow-lg border border-accent transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Open Directory (Folder Mode)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
