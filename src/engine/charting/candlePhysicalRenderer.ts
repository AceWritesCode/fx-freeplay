/**
 * candlePhysicalRenderer.ts
 *
 * Implements physical-pixel rendering integration for KLineCharts candlestick bars,
 * borders, and wicks.
 *
 * Ensures:
 * 1. Candle wicks render as exactly 1 physical device pixel across arbitrary DPR values (1 / DPR CSS px).
 * 2. Candle body borders render as exactly 1 physical device pixel with crisp subpixel offset alignment.
 * 3. Candle body width and gap geometry preserve KLineCharts natural dynamic density (~4:1 body-to-gap ratio).
 */

import { getDevicePixelRatio, physicalPixelSize } from './pixelRatio.ts';
import { registerPhysicalFigures } from './figurePhysicalRenderer.ts';

/**
 * Registers the physical-pixel aware figures (including 'rect') with KLineCharts.
 * Idempotent: safe to invoke multiple times.
 */
export function registerPhysicalRectFigure(klinechartsApi?: { registerFigure: (fig: any) => void; utils?: any }): void {
  registerPhysicalFigures(klinechartsApi);
}

/**
 * Creates physical-pixel aware figure attributes for solid candlestick bars.
 *
 * @param x Center X coordinate in CSS pixels.
 * @param priceY Sorted price Y coordinates [high, open/close_top, open/close_bottom, low].
 * @param barSpace KLineCharts barSpace object containing gapBar and halfGapBar.
 * @param colors Array of [bodyColor, borderColor, wickColor].
 * @param correction Gap correction integer from KLineCharts (0 or 1).
 * @param customDpr Optional DPR override for testing.
 */
export function createPhysicalSolidCandleBar(
  x: number,
  priceY: number[],
  barSpace: { bar: number; gapBar: number; halfGapBar: number },
  colors: string[],
  correction: number,
  customDpr?: number
): any[] {
  const dpr = customDpr !== undefined ? customDpr : getDevicePixelRatio();
  const pSize = physicalPixelSize(dpr);

  // 1. Body: compute exact physical device pixel boundaries
  const bodyX = x - barSpace.halfGapBar;
  const bodyY = priceY[1];
  const bodyWidth = barSpace.gapBar + correction;
  const bodyHeight = priceY[2] - priceY[1];

  const physicalLeft = Math.floor(bodyX * dpr);
  const physicalTop = Math.floor(bodyY * dpr);
  const physicalWidth = Math.max(1, Math.round(bodyWidth * dpr));
  const physicalHeight = Math.max(1, Math.round(bodyHeight * dpr));
  const physicalBottom = physicalTop + physicalHeight;

  const snappedBodyX = physicalLeft / dpr;
  const snappedBodyY = physicalTop / dpr;
  const snappedBodyW = physicalWidth / dpr;
  const snappedBodyH = physicalHeight / dpr;

  // 2. Wicks: Disjoint upper and lower physical-pixel rectangles (never through the body)
  const wickPhysicalX = Math.floor(x * dpr);
  const highPhysicalY = Math.floor(priceY[0] * dpr);
  const lowPhysicalY = Math.floor(priceY[3] * dpr);

  const upperWickHeight = physicalTop - highPhysicalY;
  const lowerWickHeight = lowPhysicalY - physicalBottom;

  const wickAttrs: any[] = [];
  if (upperWickHeight > 0) {
    wickAttrs.push({
      x: wickPhysicalX / dpr,
      y: highPhysicalY / dpr,
      width: pSize,
      height: upperWickHeight / dpr,
    });
  }
  if (lowerWickHeight > 0) {
    wickAttrs.push({
      x: wickPhysicalX / dpr,
      y: physicalBottom / dpr,
      width: pSize,
      height: lowerWickHeight / dpr,
    });
  }

  const figures: any[] = [];
  if (wickAttrs.length > 0) {
    figures.push({
      name: 'rect',
      attrs: wickAttrs.length === 1 ? wickAttrs[0] : wickAttrs,
      styles: { style: 'fill', color: colors[2] },
    });
  }

  const bodyColor = colors[0];
  const borderColor = colors[1];
  const hasDistinctBorder =
    borderColor &&
    borderColor !== 'transparent' &&
    borderColor !== 'none' &&
    borderColor !== bodyColor;

  // Narrow candles (1-2 physical pixels) or flat candles (Doji 1-2 physical px high)
  if (physicalWidth <= 2 || physicalHeight <= 2 || !hasDistinctBorder) {
    figures.push({
      name: 'rect',
      attrs: {
        x: snappedBodyX,
        y: snappedBodyY,
        width: snappedBodyW,
        height: snappedBodyH,
      },
      styles: {
        style: 'fill',
        color: hasDistinctBorder ? borderColor : bodyColor,
      },
    });
  } else {
    // Normal / Wide candles (>= 3 physical pixels): render interior fill + crisp 1-physical-pixel border bars
    // 2a. Body interior fill
    figures.push({
      name: 'rect',
      attrs: {
        x: (physicalLeft + 1) / dpr,
        y: (physicalTop + 1) / dpr,
        width: (physicalWidth - 2) / dpr,
        height: (physicalHeight - 2) / dpr,
      },
      styles: { style: 'fill', color: bodyColor },
    });

    // 2b. 4 exact 1-physical-pixel border bars (no subpixel anti-aliasing convolution)
    figures.push({
      name: 'rect',
      attrs: [
        // Top border bar
        { x: snappedBodyX, y: snappedBodyY, width: snappedBodyW, height: pSize },
        // Bottom border bar
        { x: snappedBodyX, y: (physicalTop + physicalHeight - 1) / dpr, width: snappedBodyW, height: pSize },
        // Left border bar
        { x: snappedBodyX, y: (physicalTop + 1) / dpr, width: pSize, height: (physicalHeight - 2) / dpr },
        // Right border bar
        { x: (physicalLeft + physicalWidth - 1) / dpr, y: (physicalTop + 1) / dpr, width: pSize, height: (physicalHeight - 2) / dpr },
      ],
      styles: { style: 'fill', color: borderColor },
    });
  }

  return figures;
}

/**
 * Creates physical-pixel aware figure attributes for hollow/stroke candlestick bars.
 *
 * @param x Center X coordinate in CSS pixels.
 * @param priceY Sorted price Y coordinates [high, open/close_top, open/close_bottom, low].
 * @param barSpace KLineCharts barSpace object containing gapBar and halfGapBar.
 * @param colors Array of [bodyColor, borderColor, wickColor].
 * @param correction Gap correction integer from KLineCharts (0 or 1).
 * @param customDpr Optional DPR override for testing.
 */
export function createPhysicalStrokeCandleBar(
  x: number,
  priceY: number[],
  barSpace: { bar: number; gapBar: number; halfGapBar: number },
  colors: string[],
  correction: number,
  customDpr?: number
): any[] {
  const dpr = customDpr !== undefined ? customDpr : getDevicePixelRatio();
  const pSize = physicalPixelSize(dpr);

  // 1. Body
  const bodyX = x - barSpace.halfGapBar;
  const bodyY = priceY[1];
  const bodyWidth = barSpace.gapBar + correction;
  const bodyHeight = priceY[2] - priceY[1];

  const physicalLeft = Math.floor(bodyX * dpr);
  const physicalTop = Math.floor(bodyY * dpr);
  const physicalWidth = Math.max(1, Math.round(bodyWidth * dpr));
  const physicalHeight = Math.max(1, Math.round(bodyHeight * dpr));
  const physicalBottom = physicalTop + physicalHeight;

  const snappedBodyX = physicalLeft / dpr;
  const snappedBodyY = physicalTop / dpr;
  const snappedBodyW = physicalWidth / dpr;
  const snappedBodyH = physicalHeight / dpr;

  // 2. Wicks
  const wickPhysicalX = Math.floor(x * dpr);
  const highPhysicalY = Math.floor(priceY[0] * dpr);
  const lowPhysicalY = Math.floor(priceY[3] * dpr);

  const upperWickHeight = physicalTop - highPhysicalY;
  const lowerWickHeight = lowPhysicalY - physicalBottom;

  const wickAttrs: any[] = [];
  if (upperWickHeight > 0) {
    wickAttrs.push({
      x: wickPhysicalX / dpr,
      y: highPhysicalY / dpr,
      width: pSize,
      height: upperWickHeight / dpr,
    });
  }
  if (lowerWickHeight > 0) {
    wickAttrs.push({
      x: wickPhysicalX / dpr,
      y: physicalBottom / dpr,
      width: pSize,
      height: lowerWickHeight / dpr,
    });
  }

  const figures: any[] = [];
  if (wickAttrs.length > 0) {
    figures.push({
      name: 'rect',
      attrs: wickAttrs.length === 1 ? wickAttrs[0] : wickAttrs,
      styles: { style: 'fill', color: colors[2] },
    });
  }

  const borderColor = colors[1];

  if (physicalWidth <= 2 || physicalHeight <= 2) {
    figures.push({
      name: 'rect',
      attrs: {
        x: snappedBodyX,
        y: snappedBodyY,
        width: snappedBodyW,
        height: snappedBodyH,
      },
      styles: { style: 'fill', color: borderColor },
    });
  } else {
    figures.push({
      name: 'rect',
      attrs: [
        // Top border bar
        { x: snappedBodyX, y: snappedBodyY, width: snappedBodyW, height: pSize },
        // Bottom border bar
        { x: snappedBodyX, y: (physicalTop + physicalHeight - 1) / dpr, width: snappedBodyW, height: pSize },
        // Left border bar
        { x: snappedBodyX, y: (physicalTop + 1) / dpr, width: pSize, height: (physicalHeight - 2) / dpr },
        // Right border bar
        { x: (physicalLeft + physicalWidth - 1) / dpr, y: (physicalTop + 1) / dpr, width: pSize, height: (physicalHeight - 2) / dpr },
      ],
      styles: { style: 'fill', color: borderColor },
    });
  }

  return figures;
}

/**
 * Hooks CandleBarView on a chart instance to render 1-physical-pixel wicks and borders.
 *
 * @param chart KLineCharts Chart instance.
 */
export function patchCandlePhysicalRendering(chart: any): void {
  try {
    const candlePane = (chart as any)?._candlePane;
    if (!candlePane) return;
    const widget = typeof candlePane.getMainWidget === 'function' ? candlePane.getMainWidget() : null;
    if (!widget || !widget._candleBarView) return;

    const proto = Object.getPrototypeOf(widget._candleBarView);
    if (!proto || proto._isPhysicalPixelPatched) return;

    proto._isPhysicalPixelPatched = true;

    proto._createSolidBar = function (
      x: number,
      priceY: number[],
      barSpace: { bar: number; gapBar: number; halfGapBar: number },
      colors: string[],
      correction: number
    ) {
      return createPhysicalSolidCandleBar(x, priceY, barSpace, colors, correction);
    };

    proto._createStrokeBar = function (
      x: number,
      priceY: number[],
      barSpace: { bar: number; gapBar: number; halfGapBar: number },
      colors: string[],
      correction: number
    ) {
      return createPhysicalStrokeCandleBar(x, priceY, barSpace, colors, correction);
    };
  } catch (err) {
    console.warn('[CandlePhysicalRenderer] Failed to patch CandleBarView:', err);
  }
}

/**
 * Complete initialization routine for candle physical-pixel rendering.
 * Ensures the physical rect figure is registered and patches the chart instance.
 *
 * @param chart KLineCharts Chart instance.
 */
export function initializeCandlePhysicalRendering(chart?: any): void {
  registerPhysicalRectFigure();
  if (chart) {
    patchCandlePhysicalRendering(chart);
  }
}
