import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Download, Check, AlertCircle, Camera } from 'lucide-react';
import { useCaptureStore } from '../store/useCaptureStore';

export const ScreenshotPreviewModal: React.FC = () => {
  const {
    isScreenshotPreviewOpen,
    latestScreenshotResult,
    closeScreenshotPreview,
    saveLatestScreenshot,
    copyLatestScreenshot,
  } = useCaptureStore();

  const [copiedRecently, setCopiedRecently] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isScreenshotPreviewOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeScreenshotPreview();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isScreenshotPreviewOpen, closeScreenshotPreview]);

  if (!isScreenshotPreviewOpen || !latestScreenshotResult || typeof document === 'undefined') {
    return null;
  }

  const { objectUrl, filename, dimensions, format, saved, copied, error, clipboardError, target } =
    latestScreenshotResult;

  const handleManualCopy = async () => {
    const success = await copyLatestScreenshot();
    if (success) {
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2500);
    }
  };

  const handleManualSave = () => {
    saveLatestScreenshot();
    setSavedRecently(true);
    setTimeout(() => setSavedRecently(false), 2500);
  };

  const isSaved = saved || savedRecently;
  const isCopied = copied || copiedRecently;

  let targetLabel = 'Entire Workspace';
  if (target.type === 'canvas') {
    const parts = [`Chart ${target.canvas.slotIndex + 1}`];
    if (target.canvas.symbol) parts.push(target.canvas.symbol);
    if (target.canvas.timeframe) parts.push(target.canvas.timeframe.toUpperCase());
    targetLabel = parts.join(' • ');
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-150 select-none font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeScreenshotPreview();
      }}
    >
      <div className="relative max-w-4xl w-full bg-modal-bg border border-border-def rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* ─── HEADER ─────────────────────────────────────────────────── */}
        <div className="px-5 py-3.5 bg-surface border-b border-border-sub flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-accent-muted text-accent border border-accent/20">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-txt-primary">Screenshot Captured</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-surface-elevated text-accent font-semibold border border-border-sub">
                  {format.toUpperCase()} • {dimensions.width}×{dimensions.height}
                </span>
              </div>
              <p className="text-[11px] text-txt-muted mt-0.5 truncate max-w-xs sm:max-w-md">
                {targetLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeScreenshotPreview}
            className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── IMAGE PREVIEW CONTAINER ────────────────────────────────── */}
        <div className="flex-1 min-h-[220px] max-h-[62vh] overflow-auto p-4 sm:p-6 bg-app-bg/90 flex items-center justify-center">
          {objectUrl ? (
            <div className="relative group rounded-xl overflow-hidden border border-border-sub shadow-xl max-h-full flex items-center justify-center bg-black/40">
              <img
                src={objectUrl}
                alt="Captured Screenshot"
                className="max-h-[56vh] w-auto object-contain rounded-lg transition-transform duration-200"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-txt-muted py-12">
              <AlertCircle className="w-8 h-8 text-status-error" />
              <span className="text-xs font-semibold text-status-error">
                {error || 'Failed to display screenshot image'}
              </span>
            </div>
          )}
        </div>

        {/* ─── FOOTER & ACTIONS ───────────────────────────────────────── */}
        <div className="px-5 py-3 bg-surface border-t border-border-sub flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-txt-muted truncate max-w-sm hidden sm:block font-mono">
            {filename}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleManualCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                isCopied
                  ? 'bg-status-success/15 border-status-success/30 text-status-success'
                  : 'bg-surface-elevated hover:bg-surface-hover text-txt-primary border-border-def'
              }`}
              title={clipboardError ? `Clipboard notice: ${clipboardError}` : 'Copy image to clipboard'}
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied' : 'Copy to Clipboard'}</span>
            </button>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleManualSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                isSaved
                  ? 'bg-status-success/15 border-status-success/30 text-status-success'
                  : 'bg-accent hover:bg-accent-hover text-txt-inverse border-transparent shadow-xs'
              }`}
              title="Download image file to device"
            >
              {isSaved ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isSaved ? 'Saved to Device' : 'Save to Device'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={closeScreenshotPreview}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-txt-secondary hover:text-txt-primary hover:bg-surface-hover border border-transparent hover:border-border-sub transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
