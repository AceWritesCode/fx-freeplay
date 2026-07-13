import type { ToolDefinition } from '../ToolRegistry';
import { snapPointToCandle } from '../../../utils/overlays';

function makeOpaqueColor(colorStr: string): string {
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

// ─── Long Position Icon ──────────────────────────────────────────────────────
const LongPositionIcon = ({ className = 'w-5 h-5', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style}>
    <path fill="currentColor" d="M5.5 20c1.2 0 2.22.86 2.45 2H25v1H7.95a2.5 2.5 0 1 1-2.45-3m0 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m0 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M25 18H5v-1h20zm-11-4h3v1h-4V9h1zM5.5 4c1.2 0 2.22.86 2.45 2H25v1H7.95A2.5 2.5 0 1 1 5.5 4m0 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3" />
  </svg>
);

// ─── Short Position Icon ─────────────────────────────────────────────────────
const ShortPositionIcon = ({ className = 'w-5 h-5', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style}>
    <path fill="currentColor" d="M5.5 20c1.2 0 2.22.86 2.45 2H25v1H7.95a2.5 2.5 0 1 1-2.45-3m0 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m9.52-7q.53 0 .93.2l.2.1q.27.17.46.43l.06.1q.2.3.25.73v.02h-.82v-.01a1 1 0 0 0-.36-.55 1.2 1.2 0 0 0-.73-.2q-.22 0-.4.06l-.12.04a1 1 0 0 0-.36.3 1 1 0 0 0-.13.43v.01q0 .2.09.34t.26.25q.19.1.48.2l.76.21q.71.2 1.06.57l.08.1q.27.36.27.9v.02q0 .45-.2.81l-.07.1a2 2 0 0 1-.72.62q-.45.22-1.02.22-.42 0-.77-.1l-.22-.1a2 2 0 0 1-.7-.55 2 2 0 0 1-.3-.84v-.02h.86v.01q.1.36.39.57t.76.22q.34 0 .59-.11a1 1 0 0 0 .4-.31l.06-.1q.09-.17.08-.36a1 1 0 0 0-.1-.38l-.1-.1a1.5 1.5 0 0 0-.65-.34l-.78-.21q-.46-.13-.77-.34-.3-.21-.45-.51-.14-.3-.14-.73 0-.5.24-.88l.06-.09q.24-.32.61-.5.43-.23.96-.23M25 12H5v-1h20zM5.5 4c1.2 0 2.22.86 2.45 2H25v1H7.95A2.5 2.5 0 1 1 5.5 4m0 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3" />
  </svg>
);

// ─── Timeframe Visibility Helper ─────────────────────────────────────────────

const parseTimeframe = (tf: string) => {
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

const isOverlayVisible = (overlay: any, chart: any) => {
  const customSettings = overlay?.extendData?.customSettings || {};
  const visibility = customSettings.visibility;
  if (!visibility) return true; // Default visible
  
  const tf = chart?._loadedTimeframe || '1m';
  const { value, unit } = parseTimeframe(tf);
  
  const rule = visibility[unit];
  if (!rule) return true;
  if (!rule.show) return false;
  
  if (rule.min !== undefined && value < rule.min) return false;
  if (rule.max !== undefined && value > rule.max) return false;
  
  return true;
};

// ─── Pip Formatting Helper ───────────────────────────────────────────────────

const formatPips = (diff: number, refPrice: number) => {
  if (refPrice < 2.0) return (diff * 10000).toFixed(1);                      // Forex
  if (refPrice < 200.0) return (diff * 100).toFixed(1);                      // JPY pairs, Oil
  if (refPrice >= 500.0 && refPrice < 5000.0) return (diff * 10).toFixed(1); // Gold (XAUUSD)
  return diff.toFixed(1);                                                    // Crypto, Indices
};

// ─── Custom Drag Handles Draw Helper ─────────────────────────────────────────

const drawGrabHandles = (figures: any[], coordinates: any[], isLocked: boolean) => {
  coordinates.forEach((coord: any) => {
    if (!coord) return;
    if (isLocked) {
      figures.push({
        type: 'circle',
        attrs: { x: coord.x, y: coord.y, r: 2.5 },
        styles: {
          style: 'stroke_fill',
          color: '#474a59',
          borderColor: '#6a6d7c',
          borderSize: 1.5
        },
        ignoreEvent: true
      });
    } else {
      figures.push({
        type: 'circle',
        attrs: { x: coord.x, y: coord.y, r: 4.5 },
        styles: {
          style: 'stroke_fill',
          color: '#ffffff',
          borderColor: '#2196F3',
          borderSize: 1.5
        },
        ignoreEvent: true
      });
    }
  });
};

// ─── Compute default 6-point RR values from a single entry point ──────────────

const computeDefaultRRPoints = (
  entryVal: number,
  entryTs: number,
  entryDi: number,
  isLong: boolean,
  dataList: any[],
  tf: string
) => {
  let diff = 0.005;
  if (entryVal < 2.0) diff = 0.005;
  else if (entryVal < 200.0) diff = 0.50;
  else if (entryVal >= 500.0 && entryVal < 5000.0) diff = 5.0;
  else diff = 50.0;

  const tpVal = isLong ? entryVal + diff : entryVal - diff;
  const slVal = isLong ? entryVal - diff : entryVal + diff;

  const { value, unit } = parseTimeframe(tf);
  let tfMinutes = value;
  if (unit === 'hours') tfMinutes = value * 60;
  else if (unit === 'days') tfMinutes = value * 1440;
  else if (unit === 'weeks') tfMinutes = value * 10080;
  else if (unit === 'months') tfMinutes = value * 43200;
  const tfMs = tfMinutes * 60 * 1000;

  const diMin = entryDi;
  // Do NOT clamp diMax to dataList.length-1 — doing so causes the right edge
  // to collapse onto the entry candle when clicking near the end of the data,
  // producing a zero-width box. Let it exceed the array and fall back to
  // timestamp arithmetic so the box always extends 30 bars to the right.
  const diMax = diMin + 30;
  const xMin = entryTs;
  const xMax = diMax < dataList.length
    ? dataList[diMax].timestamp
    : entryTs + 30 * tfMs;

  return [
    { timestamp: xMin, value: tpVal, dataIndex: diMin },
    { timestamp: xMax, value: tpVal, dataIndex: diMax },
    { timestamp: xMax, value: slVal, dataIndex: diMax },
    { timestamp: xMin, value: slVal, dataIndex: diMin },
    { timestamp: xMin, value: entryVal, dataIndex: diMin },
    { timestamp: xMax, value: entryVal, dataIndex: diMax }
  ];
};

// ─── Risk/Reward Overlay Creator ─────────────────────────────────────────────

const createRiskRewardOverlayDef = (id: string, isLong: boolean) => ({
  name: id,
  totalStep: 1,
  needDefaultPointFigure: false,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false,
  
  createPointFigures: ({ chart, overlay, yAxis }: any) => {
    if (chart && !isOverlayVisible(overlay, chart)) {
      return [];
    }

    // ── Derive the 6 canonical points ───────────────────────────────────────
    // When the overlay was just placed (1 point from the click), compute the
    // default 1RR box inline so the box is visible immediately.
    let pts6: any[] | null = null;

    if (overlay.points.length >= 6) {
      // Already fully formed — use convertToPixel on all 6 points.
      const px = chart.convertToPixel(overlay.points, { paneId: 'candle_pane' });
      if (px.length >= 6) pts6 = px;
    } else if (overlay.points.length >= 1) {
      // Still being placed or onDrawEnd hasn't propagated yet — synthesise 6 value-points.
      const p0 = overlay.points[0];
      const dataList = chart.getDataList();
      const tf = chart?._loadedTimeframe || '1m';
      const synth = computeDefaultRRPoints(
        p0.value, p0.timestamp, p0.dataIndex ?? 0, isLong, dataList, tf
      );
      const px = chart.convertToPixel(synth, { paneId: 'candle_pane' });
      if (px.length >= 6) pts6 = px;
    }

    if (!pts6 || !yAxis) return [];

    const pTL = pts6[0]; // TP left
    const pTR = pts6[1]; // TP right
    const pBR = pts6[2]; // SL right
    const pBL = pts6[3]; // SL left
    const pML = pts6[4]; // Entry left
    const pMR = pts6[5]; // Entry right

    const startX = Math.min(pTL.x, pBL.x, pML.x);
    const endX   = Math.max(pTR.x, pBR.x, pMR.x);
    const yTarget = isLong ? Math.min(pTL.y, pTR.y) : Math.max(pTL.y, pTR.y);
    const yStop   = isLong ? Math.max(pBL.y, pBR.y) : Math.min(pBL.y, pBR.y);
    const y0      = (pML.y + pMR.y) / 2;

    const entryPrice  = yAxis.convertFromPixel(y0);
    const targetPrice = yAxis.convertFromPixel(yTarget);
    const stopPrice   = yAxis.convertFromPixel(yStop);

    const profitDiff = Math.abs(targetPrice - entryPrice);
    const lossDiff   = Math.abs(entryPrice - stopPrice);
    const rrRatio    = lossDiff > 0 ? (profitDiff / lossDiff).toFixed(2) : '1.00';

    const left     = Math.min(startX, endX);
    const right    = Math.max(startX, endX);
    const boxWidth = right - left;

    // Load custom settings from settings/template
    const customSettings = overlay?.extendData?.customSettings || {};
    const greenFill  = customSettings.profitColor || 'rgba(76, 175, 80, 0.12)';
    const greenBorder = makeOpaqueColor(greenFill);
    const redFill    = customSettings.lossColor   || 'rgba(244, 67, 54, 0.12)';
    const redBorder  = makeOpaqueColor(redFill);
    const lineColor  = customSettings.lineColor   || '#808285';
    const lineWidth  = customSettings.lineWidth   || 1;
    const lineStyle  = customSettings.lineStyle   || 'solid';
    const isSelected = overlay.extendData?.isSelected || false;
    const isHovered  = overlay.extendData?.isHovered  || false;

    let style = 'solid';
    let dashedValue = [4, 4];
    if (lineStyle === 'dashed') {
      style = 'dashed';
    } else if (lineStyle === 'dotted') {
      style = 'dashed';
      dashedValue = [2, 2];
    }

    const figures: any[] = [];

    // 1. Take Profit Zone (green)
    const tpTop    = Math.min(y0, yTarget);
    const tpHeight = Math.abs(y0 - yTarget);
    figures.push({
      type: 'rect',
      attrs: { x: left, y: tpTop, width: boxWidth, height: tpHeight },
      styles: { style: 'fill', color: greenFill }
    });

    // 2. Stop Loss Zone (red)
    const slTop    = Math.min(y0, yStop);
    const slHeight = Math.abs(y0 - yStop);
    figures.push({
      type: 'rect',
      attrs: { x: left, y: slTop, width: boxWidth, height: slHeight },
      styles: { style: 'fill', color: redFill }
    });

    const showLines = customSettings.showLines !== false && customSettings.showLines === true;

    // 3. Entry Price line
    if (showLines) {
      figures.push({
        type: 'line',
        attrs: { coordinates: [{ x: left, y: y0 }, { x: right, y: y0 }] },
        styles: { color: lineColor, size: lineWidth, style: style, dashedValue: dashedValue }
      });
    }

    // 4. TP top border line
    if (showLines) {
      figures.push({
        type: 'line',
        attrs: { coordinates: [{ x: left, y: yTarget }, { x: right, y: yTarget }] },
        styles: { color: greenBorder, size: lineWidth, style: style, dashedValue: dashedValue }
      });
    }

    // 5. SL bottom border line
    if (showLines) {
      figures.push({
        type: 'line',
        attrs: { coordinates: [{ x: left, y: yStop }, { x: right, y: yStop }] },
        styles: { color: redBorder, size: lineWidth, style: style, dashedValue: dashedValue }
      });
    }

    // Text metrics & Badges
    const topDiffVal    = formatPips(Math.abs(targetPrice - entryPrice), entryPrice);
    const bottomDiffVal = formatPips(Math.abs(entryPrice - stopPrice), entryPrice);
    const midX          = (left + right) / 2;

    const textColor      = customSettings.textColor || '#ffffff';
    const alwaysShowStats = customSettings.alwaysShowStats !== false;
    const showStats       = alwaysShowStats || isHovered || isSelected;

    if (showStats) {
      // TP label badge
      figures.push({
        type: 'text',
        attrs: { x: midX, y: yTarget, text: `TP: ${topDiffVal} pips`, align: 'center', baseline: 'middle' },
        styles: {
          color: textColor,
          size: 10,
          backgroundColor: greenBorder,
          borderRadius: 3,
          paddingLeft: 6,
          paddingRight: 6,
          paddingTop: 3,
          paddingBottom: 3
        }
      });

      // SL label badge
      figures.push({
        type: 'text',
        attrs: { x: midX, y: yStop, text: `SL: ${bottomDiffVal} pips`, align: 'center', baseline: 'middle' },
        styles: {
          color: textColor,
          size: 10,
          backgroundColor: redBorder,
          borderRadius: 3,
          paddingLeft: 6,
          paddingRight: 6,
          paddingTop: 3,
          paddingBottom: 3
        }
      });

      // R:R Ratio badge
      figures.push({
        type: 'text',
        attrs: { x: midX, y: y0, text: `R:R Ratio: ${rrRatio}`, align: 'center', baseline: 'middle' },
        styles: {
          color: textColor,
          size: 10.5,
          backgroundColor: '#455a64',
          borderRadius: 4,
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 4,
          paddingBottom: 4
        }
      });
    }

    // Grab handles — only shown when the box is in focus (selected or hovered)
    // so they don't clutter the canvas when the box is idle.
    if (isSelected || isHovered) {
      drawGrabHandles(figures, pts6, overlay.lock || false);
    }

    return figures;
  },

  createYAxisFigures: ({ chart, overlay, yAxis, bounding }: any) => {
    if (!yAxis || !chart) return [];

    // Determine the 3 prices to show on the Y-axis.
    // Work with either 6 fully-set points or 1 bootstrap point.
    let entryPrice: number;
    let targetPrice: number;
    let stopPrice: number;

    const points = overlay.points;

    if (points.length >= 6) {
      targetPrice = points[0].value;
      entryPrice  = points[4].value;
      stopPrice   = points[2].value;
    } else if (points.length >= 1) {
      // Derive from the single clicked point using the same default diff logic.
      const p0 = points[0];
      entryPrice = p0.value;
      let diff = 0.005;
      if (entryPrice < 2.0) diff = 0.005;
      else if (entryPrice < 200.0) diff = 0.50;
      else if (entryPrice >= 500.0 && entryPrice < 5000.0) diff = 5.0;
      else diff = 50.0;
      targetPrice = isLong ? entryPrice + diff : entryPrice - diff;
      stopPrice   = isLong ? entryPrice - diff : entryPrice + diff;
    } else {
      return [];
    }

    const customSettings = overlay?.extendData?.customSettings || {};
    const greenFill  = customSettings.profitColor || 'rgba(76, 175, 80, 0.12)';
    const redFill    = customSettings.lossColor   || 'rgba(244, 67, 54, 0.12)';
    const tpLabelColor = makeOpaqueColor(greenFill);
    const slLabelColor = makeOpaqueColor(redFill);
    const entryColor   = customSettings.lineColor || '#455a64';

    const yTP    = yAxis.convertToPixel(targetPrice);
    const yEntry = yAxis.convertToPixel(entryPrice);
    const ySL    = yAxis.convertToPixel(stopPrice);

    const pricePrecision = chart.getSymbol?.()?.pricePrecision ?? 5;
    const formatPrice = (p: number) => p.toFixed(pricePrecision);

    const isFromZero = yAxis.isFromZero?.() ?? false;
    const textAlign  = isFromZero ? 'left' : 'right';
    const textX      = isFromZero ? 6 : bounding.width - 6;

    const figures: any[] = [];

    // TP price tag
    figures.push({
      type: 'rect',
      attrs: { x: 0, y: yTP - 9, width: bounding.width, height: 18 },
      styles: { style: 'fill', color: tpLabelColor }
    });
    figures.push({
      type: 'text',
      attrs: { x: textX, y: yTP, text: formatPrice(targetPrice), align: textAlign, baseline: 'middle' },
      styles: { color: '#ffffff', size: 10, backgroundColor: 'transparent' }
    });

    // SL price tag
    figures.push({
      type: 'rect',
      attrs: { x: 0, y: ySL - 9, width: bounding.width, height: 18 },
      styles: { style: 'fill', color: slLabelColor }
    });
    figures.push({
      type: 'text',
      attrs: { x: textX, y: ySL, text: formatPrice(stopPrice), align: textAlign, baseline: 'middle' },
      styles: { color: '#ffffff', size: 10, backgroundColor: 'transparent' }
    });

    // Entry price tag
    figures.push({
      type: 'rect',
      attrs: { x: 0, y: yEntry - 9, width: bounding.width, height: 18 },
      styles: { style: 'fill', color: entryColor }
    });
    figures.push({
      type: 'text',
      attrs: { x: textX, y: yEntry, text: formatPrice(entryPrice), align: textAlign, baseline: 'middle' },
      styles: { color: '#ffffff', size: 10, backgroundColor: 'transparent' }
    });

    return figures;
  }
});

// ─── onDrawEnd: expand 1-point overlay → 6-point RR box ──────────────────────
// Uses setTimeout so the overlay is fully committed before overrideOverlay is
// called — calling overrideOverlay synchronously inside onDrawEnd can be a
// no-op in some klinecharts versions.

const onDrawEndRiskReward = (event: any, isLong: boolean) => {
  const overlay = event.overlay;
  const points  = overlay.points;
  if (points.length < 1) return;

  // Already expanded (shouldn't happen, but guard anyway)
  if (points.length >= 6) return;

  const p0       = points[0];
  const dataList = event.chart.getDataList();
  const tf       = event.chart?._loadedTimeframe || '1m';

  const newPoints = computeDefaultRRPoints(
    p0.value, p0.timestamp, p0.dataIndex ?? 0, isLong, dataList, tf
  );

  // ── Synchronous call ────────────────────────────────────────────────────
  // klinecharts fires onPressedMoveStart in the same synchronous event chain
  // as onDrawEnd (totalStep:1 mouse-down = place + start-drag in one gesture).
  // By updating points synchronously here, onPressedMoveStart will see 6 points
  // and correctly identify the nearest handle instead of body-dragging.
  event.chart.overrideOverlay({ id: overlay.id, points: newPoints });
  event.overlay.points = newPoints;

  // ── Deferred safety net ─────────────────────────────────────────────────
  // Some klinecharts versions silently ignore overrideOverlay inside onDrawEnd
  // for the visual render. The deferred call guarantees the canvas redraws.
  setTimeout(() => {
    event.chart.overrideOverlay({ id: overlay.id, points: newPoints });
  }, 0);
};


// ─── onPressedMoving: handle per-handle drag constraints ─────────────────────

const onPressedMovingRiskReward = (event: any, draggedIndex: number, isLong: boolean) => {
  let points = [...event.overlay.points];

  // ── Race-condition guard ─────────────────────────────────────────────────
  // If onPressedMoveStart fired before our deferred overrideOverlay had a
  // chance to expand the overlay to 6 points (totalStep:1 race), synthesise
  // the 6 points now and commit them so this drag and all future ones work.
  if (points.length < 6) {
    const p0 = points[0];
    if (!p0) return false;
    const dataList = event.chart.getDataList();
    const tf       = event.chart?._loadedTimeframe || '1m';
    const expanded = computeDefaultRRPoints(
      p0.value, p0.timestamp, p0.dataIndex ?? 0, isLong, dataList, tf
    );
    event.chart.overrideOverlay({ id: event.overlay.id, points: expanded });
    // Use the just-computed 6 points for the remainder of this drag event.
    points = expanded;
  }

  const mousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];
  if (!mousePt) return false;

  const snapped  = snapPointToCandle(event, event.x, event.y);
  const targetPt = snapped || mousePt;

  const draggedPt = {
    ...points[draggedIndex],
    timestamp: targetPt.timestamp,
    value:     targetPt.value,
    dataIndex: targetPt.dataIndex
  };
  points[draggedIndex] = draggedPt;

  const y            = draggedPt.value;
  const startPoints  = event.overlay.extendData?.startPoints;

  const baseXMin   = startPoints ? startPoints[4].timestamp : points[4].timestamp;
  const baseXMax   = startPoints ? startPoints[5].timestamp : points[5].timestamp;
  const baseDiMin  = startPoints ? startPoints[4].dataIndex : points[4].dataIndex;
  const baseDiMax  = startPoints ? startPoints[5].dataIndex : points[5].dataIndex;
  const baseYTP    = startPoints ? startPoints[0].value      : points[0].value;
  const baseYSL    = startPoints ? startPoints[2].value      : points[2].value;
  const baseYEntry = startPoints ? startPoints[4].value      : points[4].value;

  let xMin   = baseXMin;
  let xMax   = baseXMax;
  let diMin  = baseDiMin;
  let diMax  = baseDiMax;
  let yTP    = baseYTP;
  let ySL    = baseYSL;
  let yEntry = baseYEntry;

  const getConstrainedRightPt = (pt: any) => {
    const pixelMin = event.chart.convertToPixel([{ timestamp: xMin, value: yEntry }], { paneId: 'candle_pane' })[0]?.x;
    const pixelX   = event.chart.convertToPixel([{ timestamp: pt.timestamp, value: yEntry }], { paneId: 'candle_pane' })[0]?.x;
    if (pixelMin !== undefined && pixelX !== undefined && pixelX < pixelMin + 40) {
      const backPt = event.chart.convertFromPixel([{ x: pixelMin + 40, y: 0 }], { paneId: 'candle_pane' })[0];
      return backPt ? { timestamp: backPt.timestamp, dataIndex: backPt.dataIndex } : pt;
    }
    return pt;
  };

  const getConstrainedLeftPt = (pt: any) => {
    const pixelMax = event.chart.convertToPixel([{ timestamp: xMax, value: yEntry }], { paneId: 'candle_pane' })[0]?.x;
    const pixelX   = event.chart.convertToPixel([{ timestamp: pt.timestamp, value: yEntry }], { paneId: 'candle_pane' })[0]?.x;
    if (pixelMax !== undefined && pixelX !== undefined && pixelX > pixelMax - 40) {
      const backPt = event.chart.convertFromPixel([{ x: pixelMax - 40, y: 0 }], { paneId: 'candle_pane' })[0];
      return backPt ? { timestamp: backPt.timestamp, dataIndex: backPt.dataIndex } : pt;
    }
    return pt;
  };

  switch (draggedIndex) {
    case 0: // TP-left corner: lock horizontal, move TP vertically
      yTP = y;
      if (isLong) { if (yTP < yEntry) yTP = yEntry; }
      else        { if (yTP > yEntry) yTP = yEntry; }
      break;

    case 1: { // TP-right corner: move right edge + TP level
      const rightPt1 = getConstrainedRightPt(draggedPt);
      xMax  = rightPt1.timestamp;
      diMax = rightPt1.dataIndex;
      yTP   = y;
      if (isLong) { if (yTP < yEntry) yTP = yEntry; }
      else        { if (yTP > yEntry) yTP = yEntry; }
      break;
    }

    case 2: { // SL-right corner: move right edge + SL level
      const rightPt2 = getConstrainedRightPt(draggedPt);
      xMax  = rightPt2.timestamp;
      diMax = rightPt2.dataIndex;
      ySL   = y;
      if (isLong) { if (ySL > yEntry) ySL = yEntry; }
      else        { if (ySL < yEntry) ySL = yEntry; }
      break;
    }

    case 3: // SL-left corner: lock horizontal, move SL vertically
      ySL = y;
      if (isLong) { if (ySL > yEntry) ySL = yEntry; }
      else        { if (ySL < yEntry) ySL = yEntry; }
      break;

    case 4: { // Entry-left: shift entire box vertically + resize left edge
      const mousePrice = targetPt.value;
      if (mousePrice === undefined) break;
      const dy4 = mousePrice - baseYEntry;
      yEntry = baseYEntry + dy4;
      yTP    = baseYTP    + dy4;
      ySL    = baseYSL    + dy4;
      const leftPt = getConstrainedLeftPt(draggedPt);
      xMin  = leftPt.timestamp;
      diMin = leftPt.dataIndex;
      break;
    }

    case 5: { // Entry-right: move right edge horizontally
      const rightPt5 = getConstrainedRightPt(draggedPt);
      xMax  = rightPt5.timestamp;
      diMax = rightPt5.dataIndex;
      break;
    }
  }

  const newPoints = [
    { timestamp: xMin, value: yTP,    dataIndex: diMin },
    { timestamp: xMax, value: yTP,    dataIndex: diMax },
    { timestamp: xMax, value: ySL,    dataIndex: diMax },
    { timestamp: xMin, value: ySL,    dataIndex: diMin },
    { timestamp: xMin, value: yEntry, dataIndex: diMin },
    { timestamp: xMax, value: yEntry, dataIndex: diMax }
  ];

  event.chart.overrideOverlay({
    id:     event.overlay.id,
    points: newPoints
  });

  return true;
};

// ─── Tool Exports ─────────────────────────────────────────────────────────────

export const LongPositionTool: ToolDefinition = {
  id: 'longPosition',
  name: 'Long position',
  icon: LongPositionIcon as any,
  group: 'forecast',
  settingsSchema: [
    { id: 'profitColor',     label: 'Profit Fill Color',  type: 'color',   defaultValue: 'rgba(76, 175, 80, 0.12)' },
    { id: 'lossColor',       label: 'Loss Fill Color',    type: 'color',   defaultValue: 'rgba(244, 67, 54, 0.12)' },
    { id: 'lineColor',       label: 'Entry Line Color',   type: 'color',   defaultValue: '#808285' },
    { id: 'textColor',       label: 'Text Color',         type: 'color',   defaultValue: '#ffffff' },
    { id: 'showLines',       label: 'Show Lines',         type: 'boolean', defaultValue: false },
    { id: 'alwaysShowStats', label: 'Always Show Stats',  type: 'boolean', defaultValue: true }
  ],
  defaultTemplates: [{
    id: 'default',
    name: 'Default',
    commonSettings: {
      profitColor:     'rgba(76, 175, 80, 0.12)',
      lossColor:       'rgba(244, 67, 54, 0.12)',
      lineColor:       '#808285',
      textColor:       '#ffffff',
      showLines:       false,
      alwaysShowStats: true
    }
  }],
  createOverlayDef:  () => createRiskRewardOverlayDef('longPosition', true),
  onDrawEnd:         (event: any) => onDrawEndRiskReward(event, true),
  onPressedMoving:   (event: any, draggedIndex: number) => onPressedMovingRiskReward(event, draggedIndex, true)
};

export const ShortPositionTool: ToolDefinition = {
  id: 'shortPosition',
  name: 'Short position',
  icon: ShortPositionIcon as any,
  group: 'forecast',
  settingsSchema: [
    { id: 'profitColor',     label: 'Profit Fill Color',  type: 'color',   defaultValue: 'rgba(76, 175, 80, 0.12)' },
    { id: 'lossColor',       label: 'Loss Fill Color',    type: 'color',   defaultValue: 'rgba(244, 67, 54, 0.12)' },
    { id: 'lineColor',       label: 'Entry Line Color',   type: 'color',   defaultValue: '#808285' },
    { id: 'textColor',       label: 'Text Color',         type: 'color',   defaultValue: '#ffffff' },
    { id: 'showLines',       label: 'Show Lines',         type: 'boolean', defaultValue: false },
    { id: 'alwaysShowStats', label: 'Always Show Stats',  type: 'boolean', defaultValue: true }
  ],
  defaultTemplates: [{
    id: 'default',
    name: 'Default',
    commonSettings: {
      profitColor:     'rgba(76, 175, 80, 0.12)',
      lossColor:       'rgba(244, 67, 54, 0.12)',
      lineColor:       '#808285',
      textColor:       '#ffffff',
      showLines:       false,
      alwaysShowStats: true
    }
  }],
  createOverlayDef:  () => createRiskRewardOverlayDef('shortPosition', false),
  onDrawEnd:         (event: any) => onDrawEndRiskReward(event, false),
  onPressedMoving:   (event: any, draggedIndex: number) => onPressedMovingRiskReward(event, draggedIndex, false)
};
