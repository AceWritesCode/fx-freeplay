import React, { useState, useRef, useEffect } from 'react';
import { Pause, Play, Square, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCaptureStore } from '../store/useCaptureStore';
import {
  pauseVideoRecordingSession,
  resumeVideoRecordingSession,
  stopVideoRecordingSession,
  cancelVideoRecordingSession,
} from '../coordinator/useVideoCoordinator';

interface RecordingFloatingBarProps {
  className?: string;
}

export const RecordingFloatingBar: React.FC<RecordingFloatingBarProps> = ({ className = '' }) => {
  const {
    recordingStatus,
    recordingElapsedSeconds,
    selectedTarget,
    errorMessage,
    tickRecordingTimer,
    resetRecording,
  } = useCaptureStore();

  // Hover debounce timer
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
        void cancelVideoRecordingSession();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingStatus]);

  // Auto-dismissal: automatically reset completed or error banner after 4.5 seconds
  useEffect(() => {
    if (recordingStatus !== 'completed' && recordingStatus !== 'error') return;

    const timer = setTimeout(() => {
      resetRecording();
    }, 4500);

    return () => clearTimeout(timer);
  }, [recordingStatus, resetRecording]);

  // Clean up hover debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  if (!isVisible) {
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
      return 'All Canvases';
    }
    return 'Recording';
  };

  const isLive = recordingStatus === 'recording' || recordingStatus === 'paused';

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`flex items-center gap-2 flex-shrink-0 bg-app-bg border border-border-sub rounded-lg px-2.5 py-1 select-none transition-all cursor-default ${className}`}
    >
      {/* ─── 1. LIVE RECORDING: STATUS/TIMER + EXPANDING CONTROLS ON HOVER ─── */}
      {isLive && (
        <div className="flex items-center cursor-default">
          {/* Always visible: REC / PAUSED plain text and status dot */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${
                recordingStatus === 'recording' ? 'bg-status-error animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span
              className={`font-mono text-xs font-bold tracking-wider flex-shrink-0 transition-colors duration-300 ${
                recordingStatus === 'recording' ? 'text-status-error' : 'text-amber-500'
              }`}
            >
              {recordingStatus === 'recording' ? 'REC' : 'PAUSED'} {formatTime(recordingElapsedSeconds)}
            </span>
          </div>

          {/* Smoothly expanding controls on hover */}
          <div
            className={`flex items-center gap-2.5 overflow-hidden transition-all duration-700 ease-in-out ${
              isHovered
                ? 'max-w-[450px] opacity-100 ml-2.5 translate-x-0'
                : 'max-w-0 opacity-0 ml-0 -translate-x-2 pointer-events-none'
            }`}
          >
            <div className="h-3.5 w-px bg-border-sub flex-shrink-0" />

            {/* Target snippet */}
            <span className="text-[11px] text-txt-muted font-medium truncate max-w-[130px] flex-shrink-0">
              {getTargetLabel()}
            </span>

            <div className="h-3.5 w-px bg-border-sub flex-shrink-0" />

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {recordingStatus === 'recording' ? (
                <button
                  type="button"
                  onClick={pauseVideoRecordingSession}
                  title="Pause recording"
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-txt-muted hover:text-txt-primary hover:bg-surface-hover border border-border-sub transition-colors cursor-pointer"
                >
                  <Pause className="w-3 h-3" />
                  <span className="hidden sm:inline">Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeVideoRecordingSession}
                  title="Resume recording"
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-accent hover:bg-accent-muted border border-accent/40 transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span className="hidden sm:inline">Resume</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => void stopVideoRecordingSession()}
                title="Stop recording"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold text-white bg-status-error hover:bg-status-error/90 transition-colors cursor-pointer shadow-xs"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>Stop</span>
              </button>

              <button
                type="button"
                onClick={() => void cancelVideoRecordingSession()}
                title="Cancel recording (Esc)"
                className="p-1 rounded text-txt-muted hover:text-status-error hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. PROCESSING STATE ─────────────────────────────────────── */}
      {recordingStatus === 'processing' && (
        <div className="flex items-center gap-2 text-xs flex-shrink-0 animate-in fade-in duration-300">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
          <span className="font-semibold text-txt-primary">Processing...</span>
          <span className="font-mono text-txt-muted text-[11px]">
            ({formatTime(recordingElapsedSeconds)})
          </span>
        </div>
      )}

      {/* ─── 3. COMPLETED STATE ────────────────────────────────────────── */}
      {recordingStatus === 'completed' && (
        <div className="flex items-center gap-2 text-xs flex-shrink-0 animate-in fade-in duration-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-status-success flex-shrink-0" />
          <span className="font-semibold text-txt-primary">Saved</span>
          <span className="text-txt-muted text-[11px] font-mono">({formatTime(recordingElapsedSeconds)})</span>
          <button
            type="button"
            onClick={resetRecording}
            className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold text-txt-muted hover:text-txt-primary hover:bg-surface-hover border border-border-sub transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* ─── 4. ERROR STATE ────────────────────────────────────────────── */}
      {recordingStatus === 'error' && (
        <div className="flex items-center gap-2 text-xs flex-shrink-0 animate-in fade-in duration-300">
          <AlertCircle className="w-3.5 h-3.5 text-status-error flex-shrink-0" />
          <span className="font-semibold text-status-error truncate max-w-[150px]">{errorMessage || 'Recording failed'}</span>
          <button
            type="button"
            onClick={resetRecording}
            className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold text-txt-muted hover:text-txt-primary hover:bg-surface-hover border border-border-sub transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

