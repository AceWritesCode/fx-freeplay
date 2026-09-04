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

/**
 * Helper to determine slot background color/gradient from chart slot element.
 */
export function getSlotBackgroundColor(slotEl: HTMLElement): string | null {
  const bg = slotEl.getAttribute('data-chart-bg');
  if (bg && bg !== 'transparent') return bg;

  const innerEl = slotEl.querySelector<HTMLElement>('[data-chart-slot-inner]');
  if (innerEl && innerEl.style.backgroundColor && innerEl.style.backgroundColor !== 'transparent') {
    return innerEl.style.backgroundColor;
  }

  const computed = window.getComputedStyle(innerEl || slotEl);
  const compBg = computed.backgroundColor;
  if (compBg && compBg !== 'rgba(0, 0, 0, 0)' && compBg !== 'transparent') {
    return compBg;
  }

  return '#131722'; // Default dark fallback
}
