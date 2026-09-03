import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Play, RotateCcw, Maximize2 } from 'lucide-react';
import { useCaptureStore } from '../store/useCaptureStore';
import type { CustomRect } from '../types';

export const CustomRegionOverlay: React.FC = () => {
  const {
    flowStep,
    customRect,
    videoConfig,
    setCustomRect,
    confirmTargetSelection,
    cancelFlow,
  } = useCaptureStore();

  const isActive = flowStep === 'selecting_custom_region';

  // Initialize rect in center of screen
  const [rect, setRect] = useState<CustomRect>(() => {
    if (typeof window !== 'undefined') {
      const w = Math.min(960, Math.round(window.innerWidth * 0.7));
      const h = Math.min(540, Math.round(window.innerHeight * 0.6));
      const x = Math.max(0, Math.round((window.innerWidth - w) / 2));
      const y = Math.max(0, Math.round((window.innerHeight - h) / 2));
      return { x, y, width: w, height: h };
    }
    return customRect;
  });

  const dragActionRef = useRef<{
    type: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';
    startX: number;
    startY: number;
    initialRect: CustomRect;
  } | null>(null);

  // Sync with store
  useEffect(() => {
    setCustomRect(rect);
  }, [rect, setCustomRect]);

  // Handle Escape key
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelFlow();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isActive, cancelFlow]);

  const handlePointerDown = (
    e: React.PointerEvent,
    actionType: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragActionRef.current = {
      type: actionType,
      startX: e.clientX,
      startY: e.clientY,
      initialRect: { ...rect },
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (!dragActionRef.current) return;
      const { type, startX, startY, initialRect } = dragActionRef.current;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      let newX = initialRect.x;
      let newY = initialRect.y;
      let newW = initialRect.width;
      let newH = initialRect.height;
      const minW = 150;
      const minH = 100;
      const maxViewportW = window.innerWidth;
      const maxViewportH = window.innerHeight;

      if (type === 'move') {
        newX = Math.max(0, Math.min(maxViewportW - newW, initialRect.x + dx));
        newY = Math.max(0, Math.min(maxViewportH - newH, initialRect.y + dy));
      } else {
        // Horizontal resizing
        if (type.includes('e')) {
          newW = Math.min(maxViewportW - newX, Math.max(minW, initialRect.width + dx));
        } else if (type.includes('w')) {
          const clampedX = Math.max(0, Math.min(initialRect.x + initialRect.width - minW, initialRect.x + dx));
          newW = initialRect.width + (initialRect.x - clampedX);
          newX = clampedX;
        }

        // Vertical resizing (can expand to full viewport height)
        if (type.includes('s')) {
          newH = Math.min(maxViewportH - newY, Math.max(minH, initialRect.height + dy));
        } else if (type.includes('n')) {
          const clampedY = Math.max(0, Math.min(initialRect.y + initialRect.height - minH, initialRect.y + dy));
          newH = initialRect.height + (initialRect.y - clampedY);
          newY = clampedY;
        }
      }

      setRect({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    };

    const handlePointerUp = () => {
      dragActionRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleStartRecording = useCallback(() => {
    const target = {
      type: 'custom' as const,
      rect,
    };

    if (videoConfig.countdownSeconds > 0) {
      useCaptureStore.setState({
        flowStep: 'countdown',
        selectedTarget: target,
        countdownValue: videoConfig.countdownSeconds,
      });
    } else {
      confirmTargetSelection(target);
    }
  }, [rect, videoConfig.countdownSeconds, confirmTargetSelection]);

  const applyPreset = (w: number, h: number) => {
    const targetW = Math.min(w, window.innerWidth);
    const targetH = Math.min(h, window.innerHeight);
    const x = Math.max(0, Math.round((window.innerWidth - targetW) / 2));
    const y = Math.max(0, Math.round((window.innerHeight - targetH) / 2));
    setRect({ x, y, width: targetW, height: targetH });
  };

  const applyMaxViewport = () => {
    setRect({
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };

  if (!isActive || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] select-none overflow-hidden animate-in fade-in duration-100">
      {/* ─── DIMMED CUTOUT BACKDROP ─────────────────────────────────────── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="custom-cutout-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.55)"
          mask="url(#custom-cutout-mask)"
        />
      </svg>

      {/* ─── INTERACTIVE RESIZABLE BOX (SHOWN ON TOP OF ALL UI) ─────────── */}
      <div
        style={{
          position: 'absolute',
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
        }}
        className="border-2 border-accent shadow-2xl z-[100000]"
      >
        {/* Drag handle header / grab region */}
        <div
          onPointerDown={(e) => handlePointerDown(e, 'move')}
          className="absolute inset-0 cursor-move flex items-center justify-center group"
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 rounded bg-surface-elevated/95 border border-border-def text-[10px] font-semibold text-txt-muted shadow-lg pointer-events-none">
            Drag to Move Region
          </div>
        </div>

        {/* Live Dimension Pill (auto shifts inside if too close to top edge) */}
        <div
          className={`absolute px-2 py-0.5 rounded bg-surface-elevated/95 border border-accent text-[10px] font-mono font-bold text-accent shadow-md pointer-events-none z-10 ${
            rect.y < 35 ? 'top-2 left-2' : '-top-7 left-0'
          }`}
        >
          {rect.width} × {rect.height} px
        </div>

        {/* ─── 8 RESIZE HANDLES (Z-INDEX ON TOP OF BORDER) ─────────────── */}
        {/* Corners */}
        <div
          onPointerDown={(e) => handlePointerDown(e, 'nw')}
          className="absolute -top-2 -left-2 w-4 h-4 bg-accent border-2 border-white rounded-xs cursor-nwse-resize shadow-lg z-20"
        />
        <div
          onPointerDown={(e) => handlePointerDown(e, 'ne')}
          className="absolute -top-2 -right-2 w-4 h-4 bg-accent border-2 border-white rounded-xs cursor-nesw-resize shadow-lg z-20"
        />
        <div
          onPointerDown={(e) => handlePointerDown(e, 'sw')}
          className="absolute -bottom-2 -left-2 w-4 h-4 bg-accent border-2 border-white rounded-xs cursor-nesw-resize shadow-lg z-20"
        />
        <div
          onPointerDown={(e) => handlePointerDown(e, 'se')}
          className="absolute -bottom-2 -right-2 w-4 h-4 bg-accent border-2 border-white rounded-xs cursor-nwse-resize shadow-lg z-20"
        />
        {/* Edges */}
        <div
          onPointerDown={(e) => handlePointerDown(e, 'n')}
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-accent border border-white rounded-full cursor-ns-resize z-20"
        />
        <div
          onPointerDown={(e) => handlePointerDown(e, 's')}
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-accent border border-white rounded-full cursor-ns-resize z-20"
        />
        <div
          onPointerDown={(e) => handlePointerDown(e, 'w')}
          className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2.5 h-8 bg-accent border border-white rounded-full cursor-ew-resize z-20"
        />
        <div
          onPointerDown={(e) => handlePointerDown(e, 'e')}
          className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-2.5 h-8 bg-accent border border-white rounded-full cursor-ew-resize z-20"
        />
      </div>

      {/* ─── FLOATING FOOTER RECORD SETTINGS / CONTROLS ─────────────────── */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100001] bg-surface-elevated/95 border border-border-def rounded-2xl flex items-center justify-between gap-6 px-6 py-2.5 backdrop-blur-md text-xs shadow-2xl pointer-events-auto">
        {/* Left: Dimension feedback */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">Custom:</span>
          <span className="font-mono text-xs font-bold text-accent px-2 py-0.5 bg-surface rounded border border-border-sub">
            {rect.width} × {rect.height} px
          </span>
        </div>

        {/* Center: Quick Presets */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-txt-muted uppercase mr-1">Presets:</span>
          <button
            type="button"
            onClick={applyMaxViewport}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-accent hover:bg-accent-muted border border-accent/40 transition-colors cursor-pointer"
            title="Expand to Full Viewport"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Full Viewport</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset(1920, 1080)}
            className="px-2 py-1 rounded-md text-[11px] font-semibold text-txt-muted hover:text-txt-primary hover:bg-surface border border-border-sub transition-colors cursor-pointer"
          >
            1080p
          </button>
          <button
            type="button"
            onClick={() => applyPreset(1280, 720)}
            className="px-2 py-1 rounded-md text-[11px] font-semibold text-txt-muted hover:text-txt-primary hover:bg-surface border border-border-sub transition-colors cursor-pointer"
          >
            720p
          </button>
          <button
            type="button"
            onClick={() => applyPreset(800, 800)}
            className="px-2 py-1 rounded-md text-[11px] font-semibold text-txt-muted hover:text-txt-primary hover:bg-surface border border-border-sub transition-colors cursor-pointer"
          >
            1:1
          </button>
          <button
            type="button"
            title="Reset to center"
            onClick={() => applyPreset(960, 540)}
            className="p-1 rounded text-txt-muted hover:text-txt-primary hover:bg-surface border border-border-sub transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => cancelFlow()}
            title="Escape to cancel"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-txt-muted hover:text-txt-primary hover:bg-surface border border-border-sub transition-colors cursor-pointer"
          >
            Cancel (Esc)
          </button>
          <button
            type="button"
            onClick={handleStartRecording}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-status-error hover:bg-status-error/90 text-white rounded-lg text-xs font-bold shadow-lg shadow-status-error/20 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Recording</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
