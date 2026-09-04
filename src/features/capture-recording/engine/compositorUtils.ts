import type { CustomRect } from '../types';

/**
 * Dynamic Capture Rectangle interface.
 * Coordinates are defined in CSS Viewport Pixels (clientX, clientY).
 */
export type DynamicCaptureRect = CustomRect;

/**
 * A resolver function queried per-frame to dynamically resolve the current capture bounds.
 * Returning null indicates the target is currently unavailable or unmounted.
 */
export type CaptureRectResolver = () => DynamicCaptureRect | null;

/**
 * Clamps and normalizes a candidate rectangle to ensure non-negative coordinates
 * and valid positive dimensions.
 */
export function normalizeCaptureRect(
  rect: DynamicCaptureRect,
  maxWidth = Infinity,
  maxHeight = Infinity
): DynamicCaptureRect {
  const x = Math.max(0, Math.min(maxWidth, rect.x));
  const y = Math.max(0, Math.min(maxHeight, rect.y));
  let width = Math.max(2, Math.min(maxWidth - x, Math.round(rect.width)));
  let height = Math.max(2, Math.min(maxHeight - y, Math.round(rect.height)));

  // Enforce even dimensions required by video encoders (H.264, VP8, VP9)
  if (width % 2 !== 0) width -= 1;
  if (height % 2 !== 0) height -= 1;

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(2, width),
    height: Math.max(2, height),
  };
}

/**
 * Computes destination render dimensions preserving source aspect ratio.
 */
export function calculateFitDimensions(
  srcWidth: number,
  srcHeight: number,
  maxTargetWidth: number,
  maxTargetHeight: number
): { width: number; height: number; scale: number } {
  if (srcWidth <= 0 || srcHeight <= 0) {
    return { width: 1, height: 1, scale: 1 };
  }

  const scale = Math.min(maxTargetWidth / srcWidth, maxTargetHeight / srcHeight, 1);
  const width = Math.max(1, Math.round(srcWidth * scale));
  const height = Math.max(1, Math.round(srcHeight * scale));

  return { width, height, scale };
}

const slotBgCache = new WeakMap<HTMLElement, { bg: string; timestamp: number }>();

/**
 * Helper to determine slot background color/gradient from chart slot element.
 * Cached to prevent costly getComputedStyle layout thrashing inside 60 FPS compositor loops.
 */
export function getSlotBackgroundColor(slotEl: HTMLElement): string | null {
  const bg = slotEl.getAttribute('data-chart-bg');
  if (bg && bg !== 'transparent') return bg;

  const innerEl = slotEl.querySelector<HTMLElement>('[data-chart-slot-inner]');
  if (innerEl && innerEl.style.backgroundColor && innerEl.style.backgroundColor !== 'transparent') {
    return innerEl.style.backgroundColor;
  }

  const now = performance.now();
  const cached = slotBgCache.get(slotEl);
  if (cached && now - cached.timestamp < 1000) {
    return cached.bg;
  }

  const targetEl = innerEl || slotEl;
  let compBg = '#131722';
  if (typeof window !== 'undefined') {
    try {
      const computed = window.getComputedStyle(targetEl);
      if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)' && computed.backgroundColor !== 'transparent') {
        compBg = computed.backgroundColor;
      }
    } catch {
      // Fallback
    }
  }

  slotBgCache.set(slotEl, { bg: compBg, timestamp: now });
  return compBg;
}

/**
 * Creates a dynamic rectangle resolver for a specific chart slot index.
 * Dynamically queries the DOM on every frame call, measuring the chart container
 * bounds via getBoundingClientRect() and retaining a lastKnownRect fallback for stability.
 */
export function createChartCanvasResolver(slotIndex: number): CaptureRectResolver {
  let lastKnownRect: DynamicCaptureRect | null = null;

  return () => {
    if (typeof document === 'undefined') return lastKnownRect;

    // First attempt: Query inner chart slot container
    const innerEl = document.querySelector<HTMLElement>(
      `[data-chart-slot-index="${slotIndex}"] [data-chart-slot-inner="true"]`
    );

    // Fallback: Query chart slot wrapper
    const targetEl = innerEl || document.querySelector<HTMLElement>(`[data-chart-slot-index="${slotIndex}"]`);

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const maxW = typeof window !== 'undefined' ? window.innerWidth : Infinity;
        const maxH = typeof window !== 'undefined' ? window.innerHeight : Infinity;
        const normalized = normalizeCaptureRect(
          {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          },
          maxW,
          maxH
        );
        lastKnownRect = normalized;
        return normalized;
      }
    }

    return lastKnownRect;
  };
}

/**
 * Creates a dynamic rectangle resolver that encapsulates all visible chart slots.
 * Dynamically queries all mounted chart slots in the DOM per frame and computes
 * their enclosing union bounding box.
 */
export function createAllChartsResolver(): CaptureRectResolver {
  let lastKnownRect: DynamicCaptureRect | null = null;

  return () => {
    if (typeof document === 'undefined') return lastKnownRect;

    const slots = Array.from(document.querySelectorAll<HTMLElement>('[data-chart-slot-index]'));
    if (slots.length === 0) return lastKnownRect;

    const rects = slots.map((s) => s.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
    if (rects.length === 0) return lastKnownRect;

    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right));
    const bottom = Math.max(...rects.map((r) => r.bottom));

    const width = Math.max(2, right - left);
    const height = Math.max(2, bottom - top);

    const maxW = typeof window !== 'undefined' ? window.innerWidth : Infinity;
    const maxH = typeof window !== 'undefined' ? window.innerHeight : Infinity;

    const normalized = normalizeCaptureRect(
      {
        x: left,
        y: top,
        width,
        height,
      },
      maxW,
      maxH
    );

    lastKnownRect = normalized;
    return normalized;
  };
}

/**
 * Queries and computes the bounding box of the chart canvas workspace.
 * First queries [data-chart-workspace], falling back to the enclosing union of all [data-chart-slot-index] elements.
 */
export function getChartWorkspaceBounds(): DynamicCaptureRect {
  if (typeof document !== 'undefined') {
    const workspaceEl = document.querySelector<HTMLElement>('[data-chart-workspace]');
    if (workspaceEl) {
      const rect = workspaceEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      }
    }

    const slots = Array.from(document.querySelectorAll<HTMLElement>('[data-chart-slot-index]'));
    if (slots.length > 0) {
      const rects = slots.map((s) => s.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
      if (rects.length > 0) {
        const left = Math.min(...rects.map((r) => r.left));
        const top = Math.min(...rects.map((r) => r.top));
        const right = Math.max(...rects.map((r) => r.right));
        const bottom = Math.max(...rects.map((r) => r.bottom));
        return {
          x: Math.round(left),
          y: Math.round(top),
          width: Math.round(right - left),
          height: Math.round(bottom - top),
        };
      }
    }
  }

  const maxW = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const maxH = typeof window !== 'undefined' ? window.innerHeight : 1080;
  return { x: 0, y: 0, width: maxW, height: maxH };
}

