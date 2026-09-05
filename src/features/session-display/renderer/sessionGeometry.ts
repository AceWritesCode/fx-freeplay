/**
 * sessionGeometry.ts
 *
 * Pure functions for:
 * - Session occurrence timestamp to pixel coordinate conversion
 * - Horizontal viewport clipping against chart boundaries
 * - Safe geometry calculations (preventing negative width, zero height, NaN, or offscreen renders)
 *
 * This module has NO React or Canvas state and is 100% unit testable.
 */

export interface PixelRange {
  leftX: number;
  width: number;
}

/**
 * Clips a horizontal pixel span [x1, x2] to the viewport bounding width [0, boundingWidth].
 *
 * Returns null if:
 * - The session is completely outside the viewport (x2 <= 0 or x1 >= boundingWidth)
 * - The resulting clipped width is non-positive
 * - Any input coordinate is not a finite number
 */
export function clipHorizontalSpan(
  rawStartX: number,
  rawEndX: number,
  boundingWidth: number
): PixelRange | null {
  if (!Number.isFinite(rawStartX) || !Number.isFinite(rawEndX) || !Number.isFinite(boundingWidth)) {
    return null;
  }

  if (boundingWidth <= 0) {
    return null;
  }

  const minX = Math.min(rawStartX, rawEndX);
  const maxX = Math.max(rawStartX, rawEndX);

  // Completely offscreen
  if (maxX <= 0 || minX >= boundingWidth) {
    return null;
  }

  // Clip within [0, boundingWidth]
  const leftX = Math.max(0, minX);
  const rightX = Math.min(boundingWidth, maxX);
  const width = rightX - leftX;

  if (width <= 0) {
    return null;
  }

  return { leftX, width };
}

/**
 * Coordinate converter function signature compatible with KLineCharts or mock converters.
 */
export type TimestampToPixelFn = (timestamp: number) => number | null | undefined;

/**
 * Computes the clipped pixel bounds for a given session occurrence.
 *
 * @param startTimestamp - Session start UTC timestamp in ms
 * @param endTimestamp - Session end UTC timestamp in ms
 * @param convertTimestampToPixel - Function converting timestamp to x-pixel coordinate
 * @param boundingWidth - Plot area width in pixels
 */
export function computeSessionPixelBounds(
  startTimestamp: number,
  endTimestamp: number,
  convertTimestampToPixel: TimestampToPixelFn,
  boundingWidth: number
): PixelRange | null {
  if (endTimestamp <= startTimestamp) {
    return null;
  }

  const startX = convertTimestampToPixel(startTimestamp);
  const endX = convertTimestampToPixel(endTimestamp);

  if (startX === null || startX === undefined || !Number.isFinite(startX)) {
    return null;
  }

  if (endX === null || endX === undefined || !Number.isFinite(endX)) {
    return null;
  }

  return clipHorizontalSpan(startX, endX, boundingWidth);
}
