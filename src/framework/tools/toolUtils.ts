import { getTimeframeMinutes } from '../../domain/market/timeframeUtils.ts';

/**
 * Timeframe parser helper for drawing overlays visibility checks.
 */
export const parseTimeframe = (tf: string): { value: number; unit: string } => {
  if (tf === 'D' || tf === '1D') return { value: 1, unit: 'days' };
  if (tf === 'W' || tf === '1W') return { value: 1, unit: 'weeks' };
  if (tf === 'M' || tf === '1M') return { value: 1, unit: 'months' };
  const match = tf.match(/^(\d+)([a-zA-Z]+)$/);
  if (!match) return { value: 1, unit: 'minutes' };
  const val = parseInt(match[1]);
  const unitChar = match[2];
  let unit = 'minutes';
  if (unitChar === 's') unit = 'seconds';
  else if (unitChar === 'm') unit = 'minutes';
  else if (unitChar === 'h' || unitChar === 'H') unit = 'hours';
  else if (unitChar === 'd' || unitChar === 'D') unit = 'days';
  else if (unitChar === 'w' || unitChar === 'W') unit = 'weeks';
  else if (unitChar === 'M') unit = 'months';
  return { value: val, unit };
};

/**
 * Detects the candle interval in milliseconds directly from candlestick dataList,
 * falling back to the chart's timeframe or 1 minute.
 */
export const getCandleIntervalMs = (
  dataList: { timestamp: number }[],
  tfFallback?: string,
  chart?: { _loadedTimeframe?: string }
): number => {
  if (dataList && dataList.length >= 2) {
    const len = dataList.length;
    let minDiff = Infinity;
    const sampleCount = Math.min(len - 1, 10);
    for (let i = len - 1; i >= len - sampleCount; i--) {
      const diff = dataList[i].timestamp - dataList[i - 1].timestamp;
      if (diff > 0 && diff < minDiff) {
        minDiff = diff;
      }
    }
    if (isFinite(minDiff) && minDiff > 0) {
      return minDiff;
    }
  }

  const tf = tfFallback || chart?._loadedTimeframe || '1m';
  return getTimeframeMinutes(tf) * 60 * 1000;
};

/**
 * Checks whether an overlay is visible on the current chart timeframe
 * based on the overlay's customSettings.visibility rules.
 */
export const isOverlayVisible = (overlay: any, chart: any): boolean => {
  const customSettings = (overlay?.extendData as any)?.customSettings || {};
  const visibility = customSettings.visibility;
  if (!visibility) return true;
  const tf = chart?._loadedTimeframe || '1m';
  const { value, unit } = parseTimeframe(tf);
  const rule = visibility[unit];
  if (!rule) return true;
  if (!rule.show) return false;
  if (rule.min !== undefined && value < rule.min) return false;
  if (rule.max !== undefined && value > rule.max) return false;
  return true;
};

// Aliases for compatibility
export const checkOverlayVisible = isOverlayVisible;

/**
 * Shared grab handle renderer for overlays.
 * Used uniformly by TrendLine, Rectangle, PriceChannel, Forecast, Ray, HorizontalLine, VerticalLine, etc.
 */
export const drawGrabHandles = (
  figures: any[],
  coordinates: any[],
  isLocked: boolean,
  isSelected: boolean = true
) => {
  coordinates.forEach((coord: any) => {
    if (!coord || typeof coord.x !== 'number' || typeof coord.y !== 'number') return;
    if (isLocked) {
      figures.push({
        type: 'circle',
        attrs: { x: coord.x, y: coord.y, r: 3 },
        styles: {
          style: 'stroke_fill',
          color: '#474a59',
          borderColor: '#6a6d7c',
          borderSize: 1.5
        },
        ignoreEvent: false
      });
    } else {
      figures.push({
        type: 'circle',
        attrs: { x: coord.x, y: coord.y, r: isSelected ? 4 : 4.5 },
        styles: {
          style: 'stroke_fill',
          color: '#ffffff',
          borderColor: '#2196F3',
          borderSize: isSelected ? 2 : 1
        },
        ignoreEvent: false
      });
    }
  });
};

/**
 * Shared arrowhead renderer for line overlays (TrendLine, Ray, Arrow, etc.).
 * Places arrowheads at the anchor points based on startArrow ('normal' | 'arrow') and endArrow ('normal' | 'arrow').
 */
export const drawArrowHeads = (
  figures: any[],
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  startArrow: 'normal' | 'arrow' | string | undefined,
  endArrow: 'normal' | 'arrow' | string | undefined,
  lineColor: string,
  lineWidth: number = 1
) => {
  if (!p1 || !p2) return;
  const headLength = 10 + Math.max(1, lineWidth) * 2;
  const wingAngle = Math.PI / 5.5; // ~32 degrees sleek chevron

  if (endArrow === 'arrow') {
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const pLeft = {
      x: p2.x - headLength * Math.cos(angle - wingAngle),
      y: p2.y - headLength * Math.sin(angle - wingAngle)
    };
    const pRight = {
      x: p2.x - headLength * Math.cos(angle + wingAngle),
      y: p2.y - headLength * Math.sin(angle + wingAngle)
    };
    figures.push({
      type: 'line',
      attrs: { coordinates: [pLeft, p2, pRight] },
      styles: {
        style: 'solid',
        color: lineColor,
        size: lineWidth,
        lineCap: 'round',
        lineJoin: 'round'
      },
      ignoreEvent: true
    });
  }

  if (startArrow === 'arrow') {
    const angle = Math.atan2(p1.y - p2.y, p1.x - p2.x);
    const pLeft = {
      x: p1.x - headLength * Math.cos(angle - wingAngle),
      y: p1.y - headLength * Math.sin(angle - wingAngle)
    };
    const pRight = {
      x: p1.x - headLength * Math.cos(angle + wingAngle),
      y: p1.y - headLength * Math.sin(angle + wingAngle)
    };
    figures.push({
      type: 'line',
      attrs: { coordinates: [pLeft, p1, pRight] },
      styles: {
        style: 'solid',
        color: lineColor,
        size: lineWidth,
        lineCap: 'round',
        lineJoin: 'round'
      },
      ignoreEvent: true
    });
  }
};

/**
 * Returns a fully opaque version of an RGBA, HSLA, or hex color string.
 */
export function makeOpaqueColor(colorStr: string): string {
  if (!colorStr) return '#ffffff';
  colorStr = colorStr.trim();
  
  if (colorStr.startsWith('#')) {
    if (colorStr.length === 9) { // #RRGGBBAA
      return colorStr.slice(0, 7);
    }
    if (colorStr.length === 5) { // #RGBA
      return colorStr.slice(0, 4);
    }
    return colorStr;
  }
  
  const rgbaRegex = /^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[^)]+\)$/i;
  const matchRgba = colorStr.match(rgbaRegex);
  if (matchRgba) {
    return `rgb(${matchRgba[1]}, ${matchRgba[2]}, ${matchRgba[3]})`;
  }
  
  const hslaRegex = /^hsla\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*[^)]+\)$/i;
  const matchHsla = colorStr.match(hslaRegex);
  if (matchHsla) {
    return `hsl(${matchHsla[1]}, ${matchHsla[2]}, ${matchHsla[3]})`;
  }
  
  return colorStr;
}

/**
 * Boosts opacity of a color string for overlay highlight rendering.
 */
export function boostColorOpacity(colorStr: string, defaultOpacity: number = 0.28): string {
  if (!colorStr) return `rgba(76, 175, 80, ${defaultOpacity})`;
  colorStr = colorStr.trim();

  const rgbaRegex = /^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i;
  const matchRgba = colorStr.match(rgbaRegex);
  if (matchRgba) {
    const r = matchRgba[1];
    const g = matchRgba[2];
    const b = matchRgba[3];
    const baseAlpha = parseFloat(matchRgba[4]);
    const newAlpha = Math.min(0.85, Math.max(defaultOpacity, baseAlpha * 2.5));
    return `rgba(${r}, ${g}, ${b}, ${newAlpha})`;
  }

  const rgbRegex = /^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i;
  const matchRgb = colorStr.match(rgbRegex);
  if (matchRgb) {
    return `rgba(${matchRgb[1]}, ${matchRgb[2]}, ${matchRgb[3]}, ${defaultOpacity})`;
  }

  if (colorStr.startsWith('#')) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${defaultOpacity})`;
    }
  }

  return colorStr;
}

/**
 * Computes line segments for any 2D line segment between p1 and p2 with arbitrary 1D gap intervals subtracted.
 * Gaps are specified as distances along the line from pLeft [0, len].
 */
export function computeLineSegmentsWithGaps(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  gaps: { start: number; end: number }[]
): { x1: number; y1: number; x2: number; y2: number }[] {
  const pLeft = p1.x < p2.x || (p1.x === p2.x && p1.y <= p2.y) ? p1 : p2;
  const pRight = p1.x < p2.x || (p1.x === p2.x && p1.y <= p2.y) ? p2 : p1;
  const dx = pRight.x - pLeft.x;
  const dy = pRight.y - pLeft.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < 0.0001 || !gaps || gaps.length === 0) {
    return [{ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }];
  }

  // Normalize, clamp and filter valid gaps
  const validGaps = gaps
    .map((g) => ({
      start: Math.max(0, Math.min(len, g.start)),
      end: Math.max(0, Math.min(len, g.end)),
    }))
    .filter((g) => g.end > g.start)
    .sort((a, b) => a.start - b.start);

  if (validGaps.length === 0) {
    return [{ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }];
  }

  // Merge overlapping and adjacent gap intervals
  const mergedGaps: { start: number; end: number }[] = [];
  let current = { ...validGaps[0] };
  for (let i = 1; i < validGaps.length; i++) {
    const next = validGaps[i];
    if (next.start <= current.end) {
      current.end = Math.max(current.end, next.end);
    } else {
      mergedGaps.push(current);
      current = { ...next };
    }
  }
  mergedGaps.push(current);

  const ux = dx / len;
  const uy = dy / len;
  const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
  let currentDist = 0;

  for (const gap of mergedGaps) {
    if (gap.start > currentDist) {
      segments.push({
        x1: pLeft.x + currentDist * ux,
        y1: pLeft.y + currentDist * uy,
        x2: pLeft.x + gap.start * ux,
        y2: pLeft.y + gap.start * uy,
      });
    }
    currentDist = Math.max(currentDist, gap.end);
  }

  if (currentDist < len) {
    segments.push({
      x1: pLeft.x + currentDist * ux,
      y1: pLeft.y + currentDist * uy,
      x2: pRight.x,
      y2: pRight.y,
    });
  }

  return segments.length > 0 ? segments : [{ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }];
}

/**
 * Computes line segments for drawing lines (TrendLine, Fib level lines, etc.)
 * with an automatic gap when text is active and vertically centered (valign === 'middle').
 */
export function computeLineSegmentsWithTextGap(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  textToShow: string,
  textHalign: string = 'right',
  textValign: string = 'middle',
  fontSize: number = 14,
  measuredTextWidth?: number
): { x1: number; y1: number; x2: number; y2: number }[] {
  const drawSegments: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const pLeft = p1.x < p2.x ? p1 : p2;
  const pRight = p1.x < p2.x ? p2 : p1;

  const hasTextGap = Boolean(textToShow && textToShow.trim() !== '') && textValign === 'middle';

  if (hasTextGap) {
    const dx = pRight.x - pLeft.x;
    const dy = pRight.y - pLeft.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const calculatedWidth = textToShow.length * (fontSize * 0.5) + 6;
    const textWidth = measuredTextWidth
      ? Math.min(measuredTextWidth, calculatedWidth + 6)
      : calculatedWidth;

    if (len > 0.0001) {
      const ux = dx / len;
      const uy = dy / len;

      if (textHalign === 'center') {
        const midX = (pLeft.x + pRight.x) / 2;
        const midY = (pLeft.y + pRight.y) / 2;
        const gapHalf = textWidth / 2 + 2;

        if (len > textWidth) {
          drawSegments.push({
            x1: pLeft.x,
            y1: pLeft.y,
            x2: midX - gapHalf * ux,
            y2: midY - gapHalf * uy,
          });
          drawSegments.push({
            x1: midX + gapHalf * ux,
            y1: midY + gapHalf * uy,
            x2: pRight.x,
            y2: pRight.y,
          });
        }
      } else if (textHalign === 'left') {
        const trimLen = textWidth + 4;
        if (len > trimLen) {
          drawSegments.push({
            x1: pLeft.x + trimLen * ux,
            y1: pLeft.y + trimLen * uy,
            x2: pRight.x,
            y2: pRight.y,
          });
        }
      } else if (textHalign === 'right') {
        const trimLen = textWidth + 4;
        if (len > trimLen) {
          drawSegments.push({
            x1: pLeft.x,
            y1: pLeft.y,
            x2: pRight.x - trimLen * ux,
            y2: pRight.y - trimLen * uy,
          });
        }
      }
    }
  }

  // Fallback to full segment if gap couldn't be drawn or wasn't needed
  if (drawSegments.length === 0) {
    drawSegments.push({
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
    });
  }

  return drawSegments;
}

