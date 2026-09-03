import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pause, Play, Square, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCaptureStore } from '../store/useCaptureStore';

export const RecordingFloatingBar: React.FC = () => {
  const {
    recordingStatus,
    recordingElapsedSeconds,
    selectedTarget,
    errorMessage,
    tickRecordingTimer,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
  } = useCaptureStore();

  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isVisible =
    recordingStatus === 'recording' ||
    recordingStatus === 'paused' ||
    recordingStatus === 'processing' ||
    recordingStatus === 'completed' ||
    recordingStatus === 'error';

  // Timer: ticks once per second while recording
  useEffect(() => {
    if (recordingStatus !== 'recording') return;

    const interval = setInterval(() => {
      tickRecordingTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [recordingStatus, tickRecordingTimer]);

  // Keyboard shortcut: Escape cancels recording while recording or paused
  useEffect(() => {
    if (recordingStatus !== 'recording' && recordingStatus !== 'paused') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingStatus, cancelRecording]);

  // Clean up hover debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  if (!isVisible || typeof document === 'undefined') {
    return null;
  }

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Gentle 600ms debounce on mouse leave before hiding options
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 600);
  };

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTargetLabel = (): string => {
    if (!selectedTarget) return 'Recording';
    if (selectedTarget.type === 'canvas') {
      const { slotIndex, symbol, timeframe } = selectedTarget.canvas;
      const parts = [`Chart ${slotIndex + 1}`];
      if (symbol) parts.push(symbol);
      if (timeframe) parts.push(timeframe.toUpperCase());
      return parts.join(' • ');
    }
    if (selectedTarget.type === 'custom') {
      return `Custom (${selectedTarget.rect.width}×${selectedTarget.rect.height})`;
    }
    if (selectedTarget.type === 'workspace') {
      return selectedTarget.areaMode === 'fullscreen' ? 'Full Screen' : 'Workspace';
    }
    return 'Recording';
  };

  const isLive = recordingStatus === 'recording' || recordingStatus === 'paused';

  return createPortal(
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed bottom-0 left-[220px] right-[360px] h-12 flex items-center justify-center z-[99999] pointer-events-auto select-none"
    >
      {/* ─── 1. LIVE RECORDING: CLEAN CAMERA TEXT + SMOOTH HOVER EXPANSION ─── */}
      {isLive && (
        <div className="flex items-center justify-center cursor-default">
          {/* Always visible: Camera REC / PAUSED plain text */}
          <span
            className={`font-mono text-xs font-bold tracking-widest flex-shrink-0 transition-colors duration-300 ${
              recordingStatus === 'recording' ? 'text-status-error' : 'text-amber-500'
            }`}
          >
            {recordingStatus === 'recording' ? 'REC' : 'PAUSED'}  {formatTime(recordingElapsedSeconds)}
          </span>

          {/* Smoothly expanding controls on hover */}
          <div
            className={`flex items-center gap-3 overflow-hidden transition-all duration-700 ease-in-out ${
              isHovered
                ? 'max-w-[450px] opacity-100 ml-3.5 translate-x-0'
                : 'max-w-0 opacity-0 ml-0 -translate-x-2 pointer-events-none'
            }`}
          >
            <div className="h-3.5 w-px bg-border-sub flex-shrink-0" />

            {/* Target snippet */}
            <span className="text-[11px] text-txt-muted font-medium truncate max-w-[140px] flex-shrink-0">
              {getTargetLabel()}
            </span>

            <div className="h-3.5 w-px bg-border-sub flex-shrink-0" />

            {/* Inline Action buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {recordingStatus === 'recording' ? (
                <button
                  type="button"
                  onClick={pauseRecording}
                  title="Pause recording"
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-txt-muted hover:text-txt-primary hover:bg-surface-hover border border-border-sub transition-colors cursor-pointer"
                >
                  <Pause className="w-3 h-3" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeRecording}
                  title="Resume recording"
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-accent hover:bg-accent-muted border border-accent/40 transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Resume</span>
                </button>
              )}

              <button
                type="button"
                onClick={stopRecording}
                title="Stop recording"
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold text-white bg-status-error hover:bg-status-error/90 transition-colors cursor-pointer shadow-xs"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>Stop</span>
              </button>

              <button
                type="button"
                onClick={cancelRecording}
                title="Cancel recording (Esc)"
                className="p-1 rounded text-txt-muted hover:text-status-error hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. PROCESSING STATE (Inline in footer) ──────────────────── */}
      {recordingStatus === 'processing' && (
        <div className="h-12 flex items-center gap-2.5 px-4 text-xs animate-in fade-in duration-300">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
          <span className="font-semibold text-txt-primary">Processing recording...</span>
          <span className="font-mono text-txt-muted text-[11px]">
            ({formatTime(recordingElapsedSeconds)})
          </span>
        </div>
      )}

      {/* ─── 3. COMPLETED STATE (Inline in footer) ───────────────────── */}
      {recordingStatus === 'completed' && (
        <div className="h-12 flex items-center gap-2.5 px-4 text-xs animate-in fade-in duration-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-status-success flex-shrink-0" />
          <span className="font-semibold text-txt-primary">Recording complete</span>
          <span className="text-txt-muted font-normal">• Video is ready ({formatTime(recordingElapsedSeconds)})</span>
          <button
            type="button"
            onClick={resetRecording}
            className="ml-2 px-2.5 py-0.5 rounded text-[11px] font-bold text-txt-muted hover:text-txt-primary hover:bg-surface-hover border border-border-sub transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* ─── 4. ERROR STATE (Inline in footer) ───────────────────────── */}
      {recordingStatus === 'error' && (
        <div className="h-12 flex items-center gap-2.5 px-4 text-xs animate-in fade-in duration-300">
          <AlertCircle className="w-3.5 h-3.5 text-status-error flex-shrink-0" />
          <span className="font-semibold text-status-error">{errorMessage || 'Recording failed'}</span>
          <button
            type="button"
            onClick={resetRecording}
            className="ml-2 px-2.5 py-0.5 rounded text-[11px] font-bold text-txt-muted hover:text-txt-primary hover:bg-surface-hover border border-border-sub transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </div>,
    document.body
  );
};
