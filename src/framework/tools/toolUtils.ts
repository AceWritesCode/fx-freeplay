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
