/**
 * Dynamic Capture Compositor — FX Freeplay
 *
 * Canvas-only compositor that renders directly from active KLineCharts DOM canvases
 * onto an internal recording canvas, dynamically querying the capture rectangle resolver
 * per frame, and outputting a stable MediaStream via canvas.captureStream(fps).
 *
 * Pure TypeScript — strictly zero dependencies on React or Zustand.
 */

import type { CaptureRectResolver, DynamicCaptureRect } from './compositorUtils';
import { normalizeCaptureRect, getSlotBackgroundColor } from './compositorUtils';

export interface DynamicCaptureCompositorOptions {
  fps?: 30 | 60;
  scale?: number; // Internal resolution multiplier (default: 1)
  backgroundColor?: string;
}

export type CompositorState = 'idle' | 'running' | 'destroyed';

export class DynamicCaptureCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private stream: MediaStream | null = null;
  private rectResolver: CaptureRectResolver;
  private options: Required<DynamicCaptureCompositorOptions>;
  private state: CompositorState = 'idle';

  private rafId: number | null = null;
  private lastFrameTimestamp: number = 0;
  private frameIntervalMs: number = 1000 / 60;

  // Track current canvas dimensions to avoid resizing unless necessary
  private currentCanvasWidth: number = 0;
  private currentCanvasHeight: number = 0;

  // Last valid resolved rectangle for fallback if resolver returns null temporarily
  private lastKnownRect: DynamicCaptureRect = { x: 0, y: 0, width: 800, height: 600 };

  constructor(
    rectResolver: CaptureRectResolver,
    options: DynamicCaptureCompositorOptions = {}
  ) {
    this.rectResolver = rectResolver;
    this.options = {
      fps: options.fps ?? 60,
      scale: options.scale ?? 1,
      backgroundColor: options.backgroundColor ?? '#131722',
    };

    this.frameIntervalMs = 1000 / this.options.fps;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false,
    });

    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }
  }

  public getState(): CompositorState {
    return this.state;
  }

  /**
   * Initializes the recording canvas, starts the RAF frame loop,
   * and returns the active MediaStream produced by canvas.captureStream(fps).
   */
  public start(): MediaStream {
    if (this.state === 'running' && this.stream) {
      return this.stream;
    }

    if (this.state === 'destroyed') {
      throw new Error('Cannot start a destroyed DynamicCaptureCompositor');
    }

    // Resolve initial bounds
    const initialRect = this.rectResolver() ?? this.lastKnownRect;
    const maxW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const maxH = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const normRect = normalizeCaptureRect(initialRect, maxW, maxH);

    this.lastKnownRect = normRect;
    this.updateCanvasDimensions(normRect.width, normRect.height);

    // Initial render before stream capture
    this.renderFrame();

    // Create stream from canvas
    interface CanvasWithCaptureStream extends HTMLCanvasElement {
      captureStream(fps?: number): MediaStream;
    }
    const canvasWithCapture = this.canvas as CanvasWithCaptureStream;

    if (typeof canvasWithCapture.captureStream === 'function') {
      this.stream = canvasWithCapture.captureStream(this.options.fps);
    } else {
      throw new Error('HTMLCanvasElement.captureStream is not supported in this environment');
    }

    this.state = 'running';
    this.lastFrameTimestamp = performance.now();
    this.scheduleNextFrame();

    return this.stream;
  }

  /**
   * Updates the capture rectangle resolver dynamically while running.
   */
  public setRectResolver(resolver: CaptureRectResolver): void {
    this.rectResolver = resolver;
  }

  /**
   * Adjusts target FPS dynamically.
   */
  public setFps(fps: 30 | 60): void {
    this.options.fps = fps;
    this.frameIntervalMs = 1000 / fps;
  }

  /**
   * Pauses / stops the rendering RAF loop without destroying stream tracks.
   */
  public stop(): void {
    if (this.state === 'running') {
      this.state = 'idle';
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
  }

  /**
   * Completely destroys compositor, terminates RAF loop, stops all stream tracks,
   * and releases canvas memory.
   */
  public destroy(): void {
    this.stop();
    this.state = 'destroyed';

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.ctx = null;
    this.canvas.width = 1;
    this.canvas.height = 1;
  }

  /**
   * Ensures the internal recording canvas matches the desired dimensions.
   */
  private updateCanvasDimensions(width: number, height: number): void {
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const effectiveScale = this.options.scale * dpr;

    let targetWidth = Math.max(2, Math.round(width * effectiveScale));
    let targetHeight = Math.max(2, Math.round(height * effectiveScale));
    if (targetWidth % 2 !== 0) targetWidth -= 1;
    if (targetHeight % 2 !== 0) targetHeight -= 1;

    if (this.currentCanvasWidth !== targetWidth || this.currentCanvasHeight !== targetHeight) {
      this.canvas.width = Math.max(2, targetWidth);
      this.canvas.height = Math.max(2, targetHeight);
      this.currentCanvasWidth = Math.max(2, targetWidth);
      this.currentCanvasHeight = Math.max(2, targetHeight);

      if (this.ctx) {
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
      }
    }
  }

  /**
   * Driven by requestAnimationFrame, throttled to requested FPS.
   */
  private scheduleNextFrame = (): void => {
    if (this.state !== 'running') return;

    this.rafId = requestAnimationFrame((timestamp) => {
      if (this.state !== 'running') return;

      const elapsed = timestamp - this.lastFrameTimestamp;
      if (elapsed >= this.frameIntervalMs - 1) { // 1ms threshold for frame timing jitter
        this.lastFrameTimestamp = timestamp;
        this.renderFrame();
      }

      this.scheduleNextFrame();
    });
  };

  /**
   * Single frame compositing execution.
   * Directly composites visible KLineCharts canvases within the resolved capture rectangle.
   */
  public renderFrame(): void {
    if (!this.ctx) return;

    // 1. Resolve current capture rectangle dynamically
    const rawRect = this.rectResolver();
    const activeRect = rawRect ? normalizeCaptureRect(rawRect) : this.lastKnownRect;
    this.lastKnownRect = activeRect;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const effectiveScale = this.options.scale * dpr;

    // Ensure canvas dimensions match current capture region
    this.updateCanvasDimensions(activeRect.width, activeRect.height);

    const destW = this.canvas.width;
    const destH = this.canvas.height;

    // 2. Clear background with theme or fallback color
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, destW, destH);

    if (typeof document === 'undefined') return;

    // 3. Query all chart slots currently present in the DOM
    const slotElements = Array.from(document.querySelectorAll<HTMLElement>('[data-chart-slot-index]'));

    for (const slotEl of slotElements) {
      const slotRect = slotEl.getBoundingClientRect();

      // Check for bounding box intersection with active capture rectangle
      const intersects = (
        slotRect.right > activeRect.x &&
        slotRect.left < activeRect.x + activeRect.width &&
        slotRect.bottom > activeRect.y &&
        slotRect.top < activeRect.y + activeRect.height
      );

      if (!intersects) continue;

      // Draw slot background if defined
      const bg = getSlotBackgroundColor(slotEl);
      if (bg && bg !== 'transparent') {
        const slotDestX = Math.round((slotRect.left - activeRect.x) * effectiveScale);
        const slotDestY = Math.round((slotRect.top - activeRect.y) * effectiveScale);
        const slotDestW = Math.round(slotRect.width * effectiveScale);
        const slotDestH = Math.round(slotRect.height * effectiveScale);

        this.ctx.fillStyle = bg;
        this.ctx.fillRect(slotDestX, slotDestY, slotDestW, slotDestH);
      }

      // 4. Draw stacked KLineCharts canvases in DOM order
      const internalCanvases = Array.from(slotEl.querySelectorAll<HTMLCanvasElement>('canvas'));

      for (const internalCanvas of internalCanvases) {
        if (internalCanvas.width === 0 || internalCanvas.height === 0) continue;

        const cRect = internalCanvas.getBoundingClientRect();

        // Calculate destination coordinates mapped relative to active capture rectangle
        const dx = Math.round((cRect.left - activeRect.x) * effectiveScale);
        const dy = Math.round((cRect.top - activeRect.y) * effectiveScale);
        const dw = Math.round(cRect.width * effectiveScale);
        const dh = Math.round(cRect.height * effectiveScale);

        try {
          this.ctx.drawImage(
            internalCanvas,
            0,
            0,
            internalCanvas.width,
            internalCanvas.height,
            dx,
            dy,
            dw,
            dh
          );
        } catch {
          // Ignore drawing errors if canvas was detached or mid-resize
        }
      }
    }
  }

  /**
   * Returns current internal recording canvas.
   */
  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}

