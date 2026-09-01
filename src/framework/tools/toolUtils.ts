/**
 * Timeframe parser helper for drawing overlays visibility checks.
 */
export const parseTimeframe = (tf: string): { value: number; unit: string } => {
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
export const isOverlayTimeframeVisible = isOverlayVisible;

/**
 * Shared grab handle renderer for overlays.
 * Used uniformly by TrendLine, Rectangle, PriceChannel, Forecast, Ray, HorizontalLine, VerticalLine, etc.
 */
export const drawGrabHandles = (figures: any[], coordinates: any[], isLocked: boolean) => {
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
        attrs: { x: coord.x, y: coord.y, r: 5 },
        styles: {
          style: 'stroke_fill',
          color: '#ffffff',
          borderColor: '#2196F3',
          borderSize: 1.5
        },
        ignoreEvent: false
      });
    }
  });
};

/**
 * Shared arrowhead renderer for line overlays (TrendLine, Ray, Arrow, etc.).
 * Places arrowheads at the anchor points based on arrowType ('none' | 'start' | 'end' | 'both').
 */
export const drawArrowHeads = (
  figures: any[],
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  arrowType: 'none' | 'start' | 'end' | 'both' | string | undefined,
  lineColor: string,
  lineWidth: number = 1
) => {
  if (!arrowType || arrowType === 'none') return;
  const headLength = 10 + Math.max(1, lineWidth) * 1.5;

  if (arrowType === 'end' || arrowType === 'both') {
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const pLeft = {
      x: p2.x - headLength * Math.cos(angle - Math.PI / 6),
      y: p2.y - headLength * Math.sin(angle - Math.PI / 6)
    };
    const pRight = {
      x: p2.x - headLength * Math.cos(angle + Math.PI / 6),
      y: p2.y - headLength * Math.sin(angle + Math.PI / 6)
    };
    figures.push({
      type: 'polygon',
      attrs: { coordinates: [p2, pLeft, pRight] },
      styles: { style: 'fill', color: lineColor },
      ignoreEvent: true
    });
  }

  if (arrowType === 'start' || arrowType === 'both') {
    const angle = Math.atan2(p1.y - p2.y, p1.x - p2.x);
    const pLeft = {
      x: p1.x - headLength * Math.cos(angle - Math.PI / 6),
      y: p1.y - headLength * Math.sin(angle - Math.PI / 6)
    };
    const pRight = {
      x: p1.x - headLength * Math.cos(angle + Math.PI / 6),
      y: p1.y - headLength * Math.sin(angle + Math.PI / 6)
    };
    figures.push({
      type: 'polygon',
      attrs: { coordinates: [p1, pLeft, pRight] },
      styles: { style: 'fill', color: lineColor },
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
