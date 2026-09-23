/**
 * pixelRatio.ts
 *
 * Centralized, framework-independent utility for physical-pixel rendering calculations.
 *
 * Canvas contexts in high-DPI environments are scaled by `devicePixelRatio` (DPR),
 * meaning 1 unit in canvas coordinate space corresponds to 1 CSS pixel (which equals DPR physical pixels).
 *
 * This utility provides the mathematical foundation to convert between logical CSS pixels
 * and physical device pixels, compute physical-pixel stroke dimensions, and snap coordinates
 * to the physical device pixel grid.
 */

/**
 * Returns the current device pixel ratio (DPR), safely falling back to 1 in non-browser
 * or uninitialized environments.
 *
 * @param customWindow Optional window object for testing/mocking.
 */
export function getDevicePixelRatio(customWindow?: { devicePixelRatio?: number }): number {
  if (customWindow && typeof customWindow.devicePixelRatio === 'number' && customWindow.devicePixelRatio > 0) {
    return customWindow.devicePixelRatio;
  }
  if (typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number' && window.devicePixelRatio > 0) {
    return window.devicePixelRatio;
  }
  return 1;
}

/**
 * Returns the size of exactly one physical device pixel expressed in CSS logical units.
 *
 * Example at DPR 1.75:
 *   1 / 1.75 = 0.5714285714285714 CSS pixels.
 *
 * @param dpr Optional device pixel ratio override (defaults to current DPR).
 */
export function physicalPixelSize(dpr?: number): number {
  const effectiveDpr = dpr !== undefined && dpr > 0 ? dpr : getDevicePixelRatio();
  return 1 / effectiveDpr;
}

/**
 * Converts a logical CSS pixel measurement to physical device pixels.
 *
 * Example at DPR 1.75:
 *   toPhysicalPixels(1, 1.75) = 1.75 physical pixels.
 *   toPhysicalPixels(10, 1.75) = 17.5 physical pixels.
 *
 * @param logicalPixels Measurement in CSS logical pixels.
 * @param dpr Optional device pixel ratio override.
 */
export function toPhysicalPixels(logicalPixels: number, dpr?: number): number {
  const effectiveDpr = dpr !== undefined && dpr > 0 ? dpr : getDevicePixelRatio();
  return logicalPixels * effectiveDpr;
}

/**
 * Converts a physical device pixel count to logical CSS pixel measurement.
 *
 * Example at DPR 1.75:
 *   fromPhysicalPixels(1, 1.75) = 0.5714285714285714 CSS pixels.
 *   fromPhysicalPixels(2, 1.75) = 1.1428571428571428 CSS pixels.
 *
 * @param physicalPixels Count of physical device pixels.
 * @param dpr Optional device pixel ratio override.
 */
export function fromPhysicalPixels(physicalPixels: number, dpr?: number): number {
  const effectiveDpr = dpr !== undefined && dpr > 0 ? dpr : getDevicePixelRatio();
  return physicalPixels / effectiveDpr;
}

/**
 * Converts a logical stroke width setting into the appropriate CSS pixel dimension
 * such that it renders as exact physical device pixels on screen.
 *
 * Example at DPR 1.75:
 *   toPhysicalStrokeWidth(1, 1.75) = 1 / 1.75 ≈ 0.5714 CSS px (renders 1 physical pixel)
 *   toPhysicalStrokeWidth(2, 1.75) = 2 / 1.75 ≈ 1.1428 CSS px (renders 2 physical pixels)
 *
 * @param logicalWidth Logical stroke width integer (e.g. 1, 2, 3). Defaults to 1.
 * @param dpr Optional device pixel ratio override.
 */
export function toPhysicalStrokeWidth(logicalWidth: number = 1, dpr?: number): number {
  return fromPhysicalPixels(logicalWidth, dpr);
}

/**
 * Snaps a coordinate in CSS pixel space to the nearest physical device pixel boundary.
 *
 * @param position Coordinate in CSS pixels.
 * @param dpr Optional device pixel ratio override.
 * @param mode Rounding mode: 'round' (default), 'floor', or 'ceil'.
 */
export function snapToPhysicalPixel(
  position: number,
  dpr?: number,
  mode: 'round' | 'floor' | 'ceil' = 'round'
): number {
  const effectiveDpr = dpr !== undefined && dpr > 0 ? dpr : getDevicePixelRatio();
  const physicalPos = position * effectiveDpr;
  const snappedPhysical = Math[mode](physicalPos);
  return snappedPhysical / effectiveDpr;
}

/**
 * Snaps a stroke center-line coordinate so that the stroke rasterizes cleanly without
 * anti-aliasing blur across physical pixel edges.
 *
 * - For odd physical pixel stroke widths (e.g. 1 physical px, 3 physical px), the stroke center
 *   must lie on a half physical pixel (+0.5 physical px) so that ±0.5 px fills an exact physical pixel.
 * - For even physical pixel stroke widths (e.g. 2 physical px, 4 physical px), the stroke center
 *   must lie on an exact physical pixel boundary (+0.0 physical px).
 *
 * Example at DPR 1.75 with 1 physical px stroke (odd):
 *   position = 100 CSS px -> physical = 175 -> floor(175) + 0.5 = 175.5 physical px
 *   snapped center = 175.5 / 1.75 = 100.285714... CSS px.
 *
 * @param position Center position in CSS pixels.
 * @param physicalStrokeWidth Number of physical pixels the stroke spans (defaults to 1).
 * @param dpr Optional device pixel ratio override.
 */
export function snapStrokeCenter(
  position: number,
  physicalStrokeWidth: number = 1,
  dpr?: number
): number {
  const effectiveDpr = dpr !== undefined && dpr > 0 ? dpr : getDevicePixelRatio();
  const isOdd = Math.round(physicalStrokeWidth) % 2 === 1;
  const physicalPos = position * effectiveDpr;

  if (isOdd) {
    return (Math.floor(physicalPos) + 0.5) / effectiveDpr;
  }
  return Math.round(physicalPos) / effectiveDpr;
}
