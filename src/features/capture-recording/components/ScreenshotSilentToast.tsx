import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, ExternalLink } from 'lucide-react';
import { useCaptureStore } from '../store/useCaptureStore';

export const ScreenshotSilentToast: React.FC = () => {
  const {
    isSilentToastVisible,
    latestScreenshotResult,
    dismissSilentToast,
    openScreenshotPreview,
  } = useCaptureStore();

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!isSilentToastVisible) return;

    const timer = setTimeout(() => {
      dismissSilentToast();
    }, 4000);

    return () => clearTimeout(timer);
  }, [isSilentToastVisible, dismissSilentToast]);

  if (!isSilentToastVisible || !latestScreenshotResult || typeof document === 'undefined') {
    return null;
  }

  const { target } = latestScreenshotResult;
  let targetSummary = 'Workspace';
  if (target.type === 'canvas') {
    const parts: string[] = [];
    if (target.canvas.symbol) parts.push(target.canvas.symbol);
    if (target.canvas.timeframe) parts.push(target.canvas.timeframe.toUpperCase());
    targetSummary = parts.length > 0 ? parts.join(' ') : `Chart ${target.canvas.slotIndex + 1}`;
  }

  return createPortal(
    <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-[99999] pointer-events-auto select-none animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-surface/95 backdrop-blur-md border border-border-def shadow-xl text-xs font-medium text-txt-primary">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-full bg-status-success/15 text-status-success">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold">Screenshot captured</span>
          <span className="text-txt-muted text-[11px] font-mono">• {targetSummary}</span>
        </div>

        <div className="h-3.5 w-px bg-border-sub" />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openScreenshotPreview}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-accent hover:bg-accent-hover text-txt-inverse transition-colors cursor-pointer shadow-xs"
          >
            <span>View</span>
            <ExternalLink className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={dismissSilentToast}
            className="p-1 rounded-md text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
