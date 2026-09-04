import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  Download,
  X,
  Loader2,
  SlidersHorizontal,
  Repeat,
  AlertTriangle,
  AlertCircle,
  Crop,
} from 'lucide-react';
import { useCaptureStore } from '../store/useCaptureStore';
import { exportGifFromEditor, cancelGifEditor, abortGifExport } from '../coordinator/useGifCoordinator';
import type { CustomRect } from '../types';

export type FramingAspect = 'free' | '1:1' | '4:3' | '16:9' | '9:16';

export const GifEditorModal: React.FC = () => {
  const {
    gifEditorSession,
    setGifTimeRange,
    setGifCropRect,
    setGifFps,
    setGifResolutionScale,
    setGifLoop,
    setGifExportError,
  } = useCaptureStore();

  const {
    isOpen,
    sourceUrl,
    durationMs,
    sourceWidth,
    sourceHeight,
    startTime,
    endTime,
    cropRect,
    fps,
    resolutionScale,
    loop,
    isExporting,
    exportProgress,
    exportError,
  } = gifEditorSession;

  const totalDuration = durationMs > 0 ? durationMs / 1000 : 5;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoWrapperRef = useRef<HTMLDivElement | null>(null);
  const timelineTrackRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [selectedFraming, setSelectedFraming] = useState<FramingAspect>('free');
  const [videoDisplayDims, setVideoDisplayDims] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const handleRequestCancel = useCallback(() => {
    if (isExporting) {
      abortGifExport();
    } else {
      setShowDiscardConfirm(true);
    }
  }, [isExporting]);

  // Keep track of active pointer drag operations
  const activeCropDragRef = useRef<{
    type: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';
    startX: number;
    startY: number;
    initialCrop: CustomRect;
  } | null>(null);

  const activeTimelineDragRef = useRef<'start' | 'end' | 'playhead' | null>(null);

  // Apply framing preset (1:1, 4:3, 16:9, 9:16, or free)
  const applyFramingAspect = useCallback((aspect: FramingAspect) => {
    if (isExporting || sourceWidth <= 0 || sourceHeight <= 0) return;
    setSelectedFraming(aspect);

    if (aspect === 'free') {
      return;
    }

    let targetRatio = 1;
    if (aspect === '1:1') targetRatio = 1;
    else if (aspect === '4:3') targetRatio = 4 / 3;
    else if (aspect === '16:9') targetRatio = 16 / 9;
    else if (aspect === '9:16') targetRatio = 9 / 16;

    let w = sourceWidth;
    let h = Math.round(w / targetRatio);

    if (h > sourceHeight) {
      h = sourceHeight;
      w = Math.round(h * targetRatio);
    }

    const x = Math.max(0, Math.round((sourceWidth - w) / 2));
    const y = Math.max(0, Math.round((sourceHeight - h) / 2));

    setGifCropRect({
      x,
      y,
      width: w,
      height: h,
    });
  }, [isExporting, sourceWidth, sourceHeight, setGifCropRect]);

  // Reset crop to full source dimensions
  const handleResetCrop = () => {
    if (isExporting || sourceWidth <= 0 || sourceHeight <= 0) return;
    setSelectedFraming('free');
    setGifCropRect({
      x: 0,
      y: 0,
      width: sourceWidth,
      height: sourceHeight,
    });
  };

  // Measure rendered video display dimensions to map display coords <-> source video pixels
  const updateDisplayDimensions = useCallback(() => {
    if (!videoRef.current) return;
    const { clientWidth, clientHeight } = videoRef.current;
    if (clientWidth > 0 && clientHeight > 0) {
      setVideoDisplayDims({ width: clientWidth, height: clientHeight });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener('resize', updateDisplayDimensions);
    const interval = setInterval(updateDisplayDimensions, 500);

    return () => {
      window.removeEventListener('resize', updateDisplayDimensions);
      clearInterval(interval);
    };
  }, [isOpen, updateDisplayDimensions]);

  // Handle Play/Pause toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current || isExporting) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime >= endTime || videoRef.current.currentTime < startTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [isPlaying, startTime, endTime, isExporting]);

  // Keyboard controls: Space to play/pause, Escape to cancel or abort
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === ' ') {
        if (!showDiscardConfirm) {
          e.preventDefault();
          togglePlay();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else if (isExporting) {
          abortGifExport();
        } else {
          setShowDiscardConfirm(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, togglePlay, showDiscardConfirm, isExporting]);

  // Video time update and range loop management
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    if (cur >= endTime) {
      videoRef.current.currentTime = startTime;
      setCurrentTime(startTime);
    } else if (cur < startTime) {
      videoRef.current.currentTime = startTime;
      setCurrentTime(startTime);
    }
  };

  // ─── Spatial Cropper Pointer Handlers ─────────────────────────────────────

  const handleCropPointerDown = (
    e: React.PointerEvent,
    actionType: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  ) => {
    if (isExporting || videoDisplayDims.width <= 0 || videoDisplayDims.height <= 0) return;
    e.preventDefault();
    e.stopPropagation();

    activeCropDragRef.current = {
      type: actionType,
      startX: e.clientX,
      startY: e.clientY,
      initialCrop: { ...cropRect },
    };

    const scaleX = sourceWidth / videoDisplayDims.width;
    const scaleY = sourceHeight / videoDisplayDims.height;
    const minSourceW = Math.round(50 * scaleX);
    const minSourceH = Math.round(50 * scaleY);

    const targetRatio =
      selectedFraming === '1:1'
        ? 1
        : selectedFraming === '4:3'
        ? 4 / 3
        : selectedFraming === '16:9'
        ? 16 / 9
        : selectedFraming === '9:16'
        ? 9 / 16
        : null;

    const handlePointerMove = (ev: PointerEvent) => {
      if (!activeCropDragRef.current) return;
      const { type, startX, startY, initialCrop } = activeCropDragRef.current;
      const dScreenX = ev.clientX - startX;
      const dScreenY = ev.clientY - startY;

      // Convert screen delta to source video pixel delta
      const dSourceX = Math.round(dScreenX * scaleX);
      const dSourceY = Math.round(dScreenY * scaleY);

      let nextX = initialCrop.x;
      let nextY = initialCrop.y;
      let nextW = initialCrop.width;
      let nextH = initialCrop.height;

      if (type === 'move') {
        nextX = Math.max(0, Math.min(sourceWidth - nextW, initialCrop.x + dSourceX));
        nextY = Math.max(0, Math.min(sourceHeight - nextH, initialCrop.y + dSourceY));
      } else if (targetRatio !== null) {
        // Locked aspect ratio resizing
        if (type === 'se' || type === 'e' || type === 's') {
          const maxW = sourceWidth - initialCrop.x;
          const maxH = sourceHeight - initialCrop.y;
          let candidateW = Math.max(minSourceW, initialCrop.width + dSourceX);
          let candidateH = Math.round(candidateW / targetRatio);

          if (candidateH > maxH) {
            candidateH = maxH;
            candidateW = Math.round(candidateH * targetRatio);
          }
          if (candidateW > maxW) {
            candidateW = maxW;
            candidateH = Math.round(candidateW / targetRatio);
          }
          nextW = Math.max(minSourceW, candidateW);
          nextH = Math.max(minSourceH, candidateH);
        } else if (type === 'sw' || type === 'w') {
          const maxH = sourceHeight - initialCrop.y;
          let candidateW = Math.max(minSourceW, initialCrop.width - dSourceX);
          let candidateH = Math.round(candidateW / targetRatio);

          if (candidateH > maxH) {
            candidateH = maxH;
            candidateW = Math.round(candidateH * targetRatio);
          }
          const clampedX = Math.max(0, initialCrop.x + initialCrop.width - candidateW);
          candidateW = initialCrop.x + initialCrop.width - clampedX;
          candidateH = Math.round(candidateW / targetRatio);

          nextX = clampedX;
          nextW = Math.max(minSourceW, candidateW);
          nextH = Math.max(minSourceH, candidateH);
        } else if (type === 'ne' || type === 'n') {
          const maxW = sourceWidth - initialCrop.x;
          let candidateH = Math.max(minSourceH, initialCrop.height - dSourceY);
          let candidateW = Math.round(candidateH * targetRatio);

          if (candidateW > maxW) {
            candidateW = maxW;
            candidateH = Math.round(candidateW / targetRatio);
          }
          const clampedY = Math.max(0, initialCrop.y + initialCrop.height - candidateH);
          candidateH = initialCrop.y + initialCrop.height - clampedY;
          candidateW = Math.round(candidateH * targetRatio);

          nextY = clampedY;
          nextW = Math.max(minSourceW, candidateW);
          nextH = Math.max(minSourceH, candidateH);
        } else if (type === 'nw') {
          let candidateW = Math.max(minSourceW, initialCrop.width - dSourceX);
          const clampedX = Math.max(0, initialCrop.x + initialCrop.width - candidateW);

          candidateW = initialCrop.x + initialCrop.width - clampedX;
          let candidateH = Math.round(candidateW / targetRatio);
          if (initialCrop.y + initialCrop.height - candidateH < 0) {
            candidateH = initialCrop.y + initialCrop.height;
            candidateW = Math.round(candidateH * targetRatio);
          }

          nextX = Math.max(0, initialCrop.x + initialCrop.width - candidateW);
          nextY = Math.max(0, initialCrop.y + initialCrop.height - candidateH);
          nextW = Math.max(minSourceW, candidateW);
          nextH = Math.max(minSourceH, candidateH);
        }
      } else {
        // Free-form unconstrained horizontal/vertical resizing
        if (type.includes('e')) {
          nextW = Math.min(sourceWidth - nextX, Math.max(minSourceW, initialCrop.width + dSourceX));
        } else if (type.includes('w')) {
          const clampedX = Math.max(0, Math.min(initialCrop.x + initialCrop.width - minSourceW, initialCrop.x + dSourceX));
          nextW = initialCrop.width + (initialCrop.x - clampedX);
          nextX = clampedX;
        }

        if (type.includes('s')) {
          nextH = Math.min(sourceHeight - nextY, Math.max(minSourceH, initialCrop.height + dSourceY));
        } else if (type.includes('n')) {
          const clampedY = Math.max(0, Math.min(initialCrop.y + initialCrop.height - minSourceH, initialCrop.y + dSourceY));
          nextH = initialCrop.height + (initialCrop.y - clampedY);
          nextY = clampedY;
        }
      }

      setGifCropRect({
        x: nextX,
        y: nextY,
        width: nextW,
        height: nextH,
      });
    };

    const handlePointerUp = () => {
      activeCropDragRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // ─── Timeline Pointer Handlers ────────────────────────────────────────────

  const handleTimelineTrackPointerDown = (e: React.PointerEvent) => {
    if (isExporting || !timelineTrackRef.current) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = ratio * totalDuration;

    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleTimelineHandlePointerDown = (
    e: React.PointerEvent,
    handleType: 'start' | 'end'
  ) => {
    if (isExporting || !timelineTrackRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    activeTimelineDragRef.current = handleType;

    const handlePointerMove = (ev: PointerEvent) => {
      if (!timelineTrackRef.current || !activeTimelineDragRef.current) return;
      const rect = timelineTrackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const targetTime = Math.round(ratio * totalDuration * 100) / 100;

      if (activeTimelineDragRef.current === 'start') {
        const nextStart = Math.max(0, Math.min(targetTime, endTime - 0.2));
        setGifTimeRange(nextStart, endTime);
        if (videoRef.current && videoRef.current.currentTime < nextStart) {
          videoRef.current.currentTime = nextStart;
          setCurrentTime(nextStart);
        }
      } else if (activeTimelineDragRef.current === 'end') {
        const nextEnd = Math.min(totalDuration, Math.max(targetTime, startTime + 0.2));
        setGifTimeRange(startTime, nextEnd);
        if (videoRef.current && videoRef.current.currentTime > nextEnd) {
          videoRef.current.currentTime = startTime;
          setCurrentTime(startTime);
        }
      }
    };

    const handlePointerUp = () => {
      activeTimelineDragRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  if (!isOpen || !sourceUrl || typeof document === 'undefined') {
    return null;
  }

  // Calculate displayed crop box coordinates
  const scaleDisplayX = sourceWidth > 0 && videoDisplayDims.width > 0 ? videoDisplayDims.width / sourceWidth : 1;
  const scaleDisplayY = sourceHeight > 0 && videoDisplayDims.height > 0 ? videoDisplayDims.height / sourceHeight : 1;

  const displayCropLeft = cropRect.x * scaleDisplayX;
  const displayCropTop = cropRect.y * scaleDisplayY;
  const displayCropWidth = Math.max(10, cropRect.width * scaleDisplayX);
  const displayCropHeight = Math.max(10, cropRect.height * scaleDisplayY);

  const selectedDuration = Math.max(0.1, endTime - startTime);
  const estimatedFrames = Math.round(selectedDuration * fps);

  // Timeline percentages
  const startPercent = totalDuration > 0 ? (startTime / totalDuration) * 100 : 0;
  const endPercent = totalDuration > 0 ? (endTime / totalDuration) * 100 : 100;
  const playheadPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-150 select-none font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting && !showDiscardConfirm) {
          handleRequestCancel();
        }
      }}
    >
      <div className="relative max-w-4xl w-full bg-modal-bg border border-border-def rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-150 text-txt-secondary">
        {/* ─── HEADER ─────────────────────────────────────────────────── */}
        <div className="px-5 py-3.5 bg-surface border-b border-border-sub flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-accent-muted text-accent border border-accent/30">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-txt-primary">GIF Editor</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-surface-elevated text-accent font-semibold border border-border-sub">
                  {cropRect.width}×{cropRect.height} • {selectedFraming !== 'free' ? `${selectedFraming} • ` : ''}{selectedDuration.toFixed(1)}s • {fps} FPS
                </span>
              </div>
              <p className="text-[11px] text-txt-muted mt-0.5">
                Trim timeline, set framing, adjust crop region, and export animated GIF
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestCancel}
            className="p-1.5 text-txt-muted hover:text-txt-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
            title={isExporting ? 'Abort process (Esc)' : 'Cancel (Esc)'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── VIDEO PREVIEW & SPATIAL CROP WORKSPACE ─────────────────── */}
        <div className="relative flex-1 bg-black/95 flex items-center justify-center p-4 min-h-[260px] max-h-[50vh] overflow-hidden">
          <div
            ref={videoWrapperRef}
            className="relative inline-block overflow-hidden shadow-2xl rounded"
          >
            {/* Source Video Player */}
            <video
              ref={videoRef}
              src={sourceUrl}
              muted
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={updateDisplayDimensions}
              onLoadedData={updateDisplayDimensions}
              className="block max-h-[46vh] max-w-full w-auto h-auto object-contain cursor-pointer"
              onClick={togglePlay}
            />

            {/* Spatial Crop Overlay */}
            {videoDisplayDims.width > 0 && videoDisplayDims.height > 0 && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Crop Box with Outer Shadow Dimming */}
                <div
                  style={{
                    left: `${displayCropLeft}px`,
                    top: `${displayCropTop}px`,
                    width: `${displayCropWidth}px`,
                    height: `${displayCropHeight}px`,
                    boxShadow: '0 0 0 9999px var(--bg-overlay)',
                  }}
                  className="absolute pointer-events-auto border-2 border-accent border-dashed cursor-move group"
                  onPointerDown={(e) => handleCropPointerDown(e, 'move')}
                >
                  {/* Resolution & Aspect Ratio Badge */}
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-surface-elevated/95 border border-accent/40 text-[9px] font-mono font-bold text-accent pointer-events-none select-none flex items-center gap-1 shadow-sm">
                    <span>{cropRect.width}×{cropRect.height}</span>
                    {selectedFraming !== 'free' && (
                      <span className="text-[8px] opacity-80 font-sans font-normal">({selectedFraming})</span>
                    )}
                  </div>

                  {/* Corner Resize Handles */}
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, 'nw')}
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-accent border border-border-focus rounded-xs cursor-nwse-resize shadow"
                  />
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, 'ne')}
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-accent border border-border-focus rounded-xs cursor-nesw-resize shadow"
                  />
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, 'se')}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-accent border border-border-focus rounded-xs cursor-nwse-resize shadow"
                  />
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, 'sw')}
                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-accent border border-border-focus rounded-xs cursor-nesw-resize shadow"
                  />

                  {/* Edge Resize Handles */}
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, 'n')}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-accent/80 border border-border-focus rounded-xs cursor-ns-resize shadow"
                  />
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, 's')}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-accent/80 border border-border-focus rounded-xs cursor-ns-resize shadow"
                  />
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, 'w')}
                    className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-accent/80 border border-border-focus rounded-xs cursor-ew-resize shadow"
                  />
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, 'e')}
                    className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-accent/80 border border-border-focus rounded-xs cursor-ew-resize shadow"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── TIMELINE TRIMMING & CONTROLS ───────────────────────────── */}
        <div className="p-5 bg-surface border-t border-border-sub flex flex-col gap-4">
          {/* Timeline Bar with Dual Start/End Handles */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-txt-muted">
              <span>{startTime.toFixed(2)}s</span>
              <span className="text-accent font-bold">
                Duration: {selectedDuration.toFixed(2)}s ({estimatedFrames} frames)
              </span>
              <span>{endTime.toFixed(2)}s</span>
            </div>

            <div
              ref={timelineTrackRef}
              onPointerDown={handleTimelineTrackPointerDown}
              className="relative h-7 bg-app-bg border border-border-sub rounded-lg cursor-pointer select-none overflow-hidden"
            >
              {/* Active Trimming Range Highlight */}
              <div
                style={{
                  left: `${startPercent}%`,
                  width: `${Math.max(1, endPercent - startPercent)}%`,
                }}
                className="absolute top-0 bottom-0 bg-accent-muted border-x border-accent/60"
              />

              {/* Playhead Indicator Line */}
              <div
                style={{ left: `${playheadPercent}%` }}
                className="absolute top-0 bottom-0 w-0.5 bg-accent z-10 pointer-events-none shadow"
              />

              {/* Left Start Handle */}
              <div
                style={{ left: `${startPercent}%` }}
                onPointerDown={(e) => handleTimelineHandlePointerDown(e, 'start')}
                className="absolute top-0 bottom-0 -ml-2 w-4 z-20 flex items-center justify-center cursor-ew-resize group"
              >
                <div className="w-2.5 h-6 bg-accent group-hover:bg-accent-hover rounded-xs shadow-md border border-txt-inverse/90" />
              </div>

              {/* Right End Handle */}
              <div
                style={{ left: `${endPercent}%` }}
                onPointerDown={(e) => handleTimelineHandlePointerDown(e, 'end')}
                className="absolute top-0 bottom-0 -ml-2 w-4 z-20 flex items-center justify-center cursor-ew-resize group"
              >
                <div className="w-2.5 h-6 bg-accent group-hover:bg-accent-hover rounded-xs shadow-md border border-txt-inverse/90" />
              </div>
            </div>
          </div>

          {/* Controls Bar: Play/Pause, Reset Crop, Framing, FPS, Scale, Loop */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              {/* Play / Pause Button */}
              <button
                type="button"
                onClick={togglePlay}
                disabled={isExporting}
                title="Play / Pause (Space)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-elevated hover:bg-surface-hover text-txt-primary border border-border-def transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play</span>
                  </>
                )}
              </button>

              {/* Reset Crop Button */}
              <button
                type="button"
                onClick={handleResetCrop}
                disabled={isExporting}
                title="Reset crop to full frame"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-elevated hover:bg-surface-hover text-txt-muted hover:text-txt-primary border border-border-def transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Crop</span>
              </button>
            </div>

            {/* Framing Aspect Ratio Selector */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 text-xs text-txt-muted font-medium">
                <Crop className="w-3.5 h-3.5" />
                <span>Framing:</span>
              </div>
              <div className="flex items-center p-0.5 bg-app-bg border border-border-sub rounded-lg">
                {(['free', '1:1', '4:3', '16:9', '9:16'] as const).map((aspect) => {
                  const isActive = selectedFraming === aspect;
                  return (
                    <button
                      key={aspect}
                      type="button"
                      disabled={isExporting}
                      onClick={() => applyFramingAspect(aspect)}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                        isActive
                          ? 'bg-accent text-txt-inverse shadow-xs'
                          : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                      }`}
                    >
                      {aspect === 'free' ? 'Free' : aspect}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FPS Selector */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 text-xs text-txt-muted font-medium">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>FPS:</span>
              </div>
              <div className="flex items-center p-0.5 bg-app-bg border border-border-sub rounded-lg">
                {([10, 15, 24] as const).map((rate) => {
                  const isActive = fps === rate;
                  return (
                    <button
                      key={rate}
                      type="button"
                      disabled={isExporting}
                      onClick={() => setGifFps(rate)}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                        isActive
                          ? 'bg-accent text-txt-inverse shadow-xs'
                          : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                      }`}
                    >
                      {rate}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resolution Scale Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-txt-muted font-medium">Scale:</span>
              <div className="flex items-center p-0.5 bg-app-bg border border-border-sub rounded-lg">
                {([0.5, 0.75, 1] as const).map((scale) => {
                  const isActive = (resolutionScale ?? 1) === scale;
                  return (
                    <button
                      key={scale}
                      type="button"
                      disabled={isExporting}
                      onClick={() => setGifResolutionScale(scale)}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                        isActive
                          ? 'bg-accent text-txt-inverse shadow-xs'
                          : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                      }`}
                    >
                      {scale === 1 ? '1×' : `${scale}×`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Loop Toggle */}
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setGifLoop(!loop)}
              title="Toggle continuous animation loop"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50 ${
                loop
                  ? 'bg-accent-muted text-accent border-accent/40'
                  : 'bg-surface-elevated text-txt-muted border-border-def hover:text-txt-primary'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Loop</span>
            </button>
          </div>

          {/* Export Error Banner */}
          {exportError && (
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-status-error/10 border border-status-error/30 rounded-lg text-status-error text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-status-error" />
                <span className="truncate">{exportError}</span>
              </div>
              <button
                type="button"
                onClick={() => setGifExportError(null)}
                className="text-status-error hover:opacity-80 p-0.5 rounded hover:bg-status-error/20 transition-colors shrink-0 cursor-pointer"
                title="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Exporting Progress Bar */}
          {isExporting && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-semibold text-txt-primary">
                <div className="flex items-center gap-1.5 text-accent">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Encoding GIF frames...</span>
                </div>
                <span className="font-mono text-accent">
                  {Math.round(exportProgress * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-app-bg rounded-full overflow-hidden border border-border-sub">
                <div
                  style={{ width: `${Math.round(exportProgress * 100)}%` }}
                  className="h-full bg-accent rounded-full transition-all duration-100 ease-out"
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── FOOTER ACTION BUTTONS ──────────────────────────────────── */}
        <div className="px-5 py-3 bg-surface border-t border-border-sub flex items-center justify-between gap-3">
          <div className="text-[11px] text-txt-muted">
            {sourceWidth > 0 && sourceHeight > 0
              ? `Source: ${sourceWidth}×${sourceHeight} • Output: ${cropRect.width}×${cropRect.height}`
              : ''}
          </div>

          <div className="flex items-center gap-2.5">
            {isExporting ? (
              <button
                type="button"
                onClick={abortGifExport}
                className="px-4 py-2 text-xs font-semibold text-status-error hover:opacity-80 hover:bg-status-error/10 rounded-lg transition-colors cursor-pointer border border-status-error/30"
              >
                Abort Process
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRequestCancel}
                className="px-4 py-2 text-xs font-semibold text-txt-secondary hover:text-txt-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer border border-transparent hover:border-border-sub"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              disabled={isExporting}
              onClick={() => void exportGifFromEditor()}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-txt-inverse rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating GIF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Save GIF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ─── CUSTOM DISCARD CONFIRMATION DIALOG ────────────────────── */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-[100010] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
            <div
              className="w-full max-w-sm bg-modal-bg border border-border-def rounded-xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-status-warning/10 border border-status-warning/20 text-status-warning shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-txt-primary">
                    Discard GIF recording?
                  </h3>
                  <p className="text-xs text-txt-muted mt-1 leading-relaxed">
                    Your recorded GIF source will be discarded and you'll need to record again.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-txt-secondary hover:text-txt-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer border border-border-sub"
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    cancelGifEditor();
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-status-error hover:opacity-90 text-txt-inverse rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Discard Recording
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
