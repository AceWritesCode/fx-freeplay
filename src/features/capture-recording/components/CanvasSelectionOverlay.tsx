import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCaptureStore } from '../store/useCaptureStore';
import { resolveTargetAtPoint, type TargetResolutionResult } from '../utils/targetResolver';

const ActiveSelectionOverlay: React.FC = () => {
  const {
    setHoveredTarget,
    confirmTargetSelection,
    cancelFlow,
  } = useCaptureStore();

  const [resolution, setResolution] = useState<TargetResolutionResult | null>(() => {
    if (typeof window === 'undefined') return null;
    return resolveTargetAtPoint(window.innerWidth / 2, window.innerHeight / 2);
  });

  const resolutionRef = useRef<TargetResolutionResult | null>(null);

  useEffect(() => {
    resolutionRef.current = resolution;
  }, [resolution]);

  useEffect(() => {
    // Sync initial center resolution with store
    const initial = resolveTargetAtPoint(window.innerWidth / 2, window.innerHeight / 2);
    if (initial) {
      setHoveredTarget(initial.target);
    }
  }, [setHoveredTarget]);

  useEffect(() => {
    const originalCursor = document.body.style.cursor;
    document.body.style.cursor = 'crosshair';

    const handlePointerMove = (e: PointerEvent) => {
      const res = resolveTargetAtPoint(e.clientX, e.clientY);
      if (res) {
        resolutionRef.current = res;
        setResolution(res);
        setHoveredTarget(res.target);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const targetEl = e.target as HTMLElement | null;
      if (targetEl?.closest('[data-capture-cancel]')) {
        e.preventDefault();
        e.stopPropagation();
        cancelFlow();
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const current = resolutionRef.current;
      if (current) {
        const { activeCaptureType, videoConfig } = useCaptureStore.getState();

        if (activeCaptureType === 'video' && videoConfig.countdownSeconds > 0) {
          useCaptureStore.setState({
            flowStep: 'countdown',
            selectedTarget: current.target,
            countdownValue: videoConfig.countdownSeconds,
          });
        } else {
          confirmTargetSelection(current.target);
        }
      } else {
        cancelFlow();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelFlow();
      }
    };

    // Attach capturing event listeners to intercept pointer and keyboard events
    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('click', handleClick, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.body.style.cursor = originalCursor;
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [setHoveredTarget, confirmTargetSelection, cancelFlow]);

  if (!resolution || typeof document === 'undefined') {
    return null;
  }

  const { activeCaptureType, videoConfig } = useCaptureStore.getState();
  const isVideoChartMode = activeCaptureType === 'video' && videoConfig.areaMode === 'canvas';

  return createPortal(
    <div className="fixed inset-0 z-[99999] pointer-events-none select-none overflow-hidden animate-in fade-in duration-100">
      {/* ─── FOOTER INSTRUCTION TEXT (Centered in footer, no container) ─── */}
      <div className="fixed bottom-0 left-0 right-0 h-12 flex items-center justify-center pointer-events-none z-30 select-none">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-accent animate-in fade-in duration-150">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span>
            {isVideoChartMode
              ? 'Click a chart to record • Click outside charts to record all canvases • Escape to cancel'
              : 'Click a chart to capture • Move outside charts to capture entire workspace'}
          </span>
          <span className="text-txt-muted/60">•</span>
          <button
            type="button"
            data-capture-cancel="true"
            onClick={() => cancelFlow()}
            title="Escape to cancel"
            className="pointer-events-auto px-2 py-0.5 rounded text-[11px] font-bold text-txt-muted hover:text-txt-primary hover:bg-surface-elevated transition-colors cursor-pointer border border-border-sub hover:border-border-def"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* ─── TRANSLUCENT HIGHLIGHT RECTS ─────────────────────────────────── */}
      {resolution.boundingRects.map((rect, idx) => (
        <div
          key={idx}
          style={{
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          className="pointer-events-none border-2 border-accent bg-accent/15 rounded-lg shadow-xl shadow-accent/10 backdrop-blur-[0.5px] transition-all duration-150 ease-out z-40"
        >
          {/* Subtle corner accent markers */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent rounded-tl" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-accent rounded-tr" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-accent rounded-bl" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent rounded-br" />
        </div>
      ))}

      {/* ─── FLOATING TARGET BADGE ───────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: resolution.badgePosition.top,
          left: resolution.badgePosition.left,
        }}
        className="pointer-events-none z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated/95 border border-accent/80 shadow-2xl backdrop-blur-md text-xs font-bold text-accent transition-all duration-100 ease-out animate-in fade-in zoom-in-95"
      >
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span>{resolution.badgeLabel}</span>
      </div>
    </div>,
    document.body
  );
};

export const CanvasSelectionOverlay: React.FC = () => {
  const flowStep = useCaptureStore((s) => s.flowStep);

  if (flowStep !== 'selecting_canvas') {
    return null;
  }

  return <ActiveSelectionOverlay />;
};
