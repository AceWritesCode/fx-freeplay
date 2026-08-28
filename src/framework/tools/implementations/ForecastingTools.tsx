import type { ToolDefinition, ToolMutationResult } from '../ToolRegistry';
import { snapPointToCandle } from '@/engine/charting';

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

function boostColorOpacity(colorStr: string, defaultOpacity: number = 0.28): string {
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

const drawGrabHandles = (
  figures: any[],
  coordinates: any[],
  isLocked: boolean,
  draggedIndex?: number | null,
  hoveredAnchorIndex?: number | null
) => {
  coordinates.forEach((coord: any, idx: number) => {
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
      const isActive = draggedIndex === idx || hoveredAnchorIndex === idx;
      figures.push({
        type: 'circle',
        attrs: { x: coord.x, y: coord.y, r: 4.5 },
        styles: {
          style: 'stroke_fill',
          color: '#ffffff',
          borderColor: isActive ? '#EF5350' : '#2196F3',
          borderSize: isActive ? 2 : 1.5
        },
        ignoreEvent: true
      });

      // Invisible interactive hit target (captures hover and drag events for klinecharts)
      figures.push({
        type: 'rect',
        attrs: {
          x: coord.x - 10,
          y: coord.y - 10,
          width: 20,
          height: 20
        },
        styles: {
          style: 'fill',
          color: 'transparent'
        },
        ignoreEvent: false
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
  tf: string,
  chart?: any,
  initialSizePercent: number = 18
) => {
  let diff: number | null = null;
  const ratio = (typeof initialSizePercent === 'number' && initialSizePercent > 0 ? Math.min(50, initialSizePercent) : 18) / 100;

  // 1. Primary Method: Convert viewport top/bottom pixels to price using chart.convertFromPixel
  if (chart && typeof chart.convertFromPixel === 'function') {
    try {
      let paneHeight = 400;
      if (chart._chartStore && typeof chart._chartStore.getPaneStore === 'function') {
        const pane = chart._chartStore.getPaneStore().getPaneById('candle_pane');
        if (pane && typeof pane.getBounding === 'function') {
          const bounding = pane.getBounding();
          if (bounding && typeof bounding.height === 'number' && bounding.height > 50) {
            paneHeight = bounding.height;
          }
        }
      }

      const yTop = paneHeight * 0.10;
      const yBottom = paneHeight * 0.90;

      const converted = chart.convertFromPixel(
        [
          { x: 100, y: yTop },
          { x: 100, y: yBottom }
        ],
        { paneId: 'candle_pane' }
      );

      if (
        converted &&
        converted.length >= 2 &&
        typeof converted[0]?.value === 'number' &&
        typeof converted[1]?.value === 'number' &&
        !isNaN(converted[0].value) &&
        !isNaN(converted[1].value)
      ) {
        const priceTop = converted[0].value;
        const priceBottom = converted[1].value;
        const visiblePriceSpan = Math.abs(priceTop - priceBottom);

        if (visiblePriceSpan > 0) {
          // Dynamic initial distance: configured ratio of visible price height per side
          let calcDiff = visiblePriceSpan * ratio;

          // Clamping Edge Case: Ensure TP and SL remain inside viewport even if entry is near top or bottom edge
          const minVis = Math.min(priceTop, priceBottom);
          const maxVis = Math.max(priceTop, priceBottom);
          const distToTop = Math.max(0, maxVis - entryVal);
          const distToBottom = Math.max(0, entryVal - minVis);
          const maxSafeDiff = Math.min(distToTop, distToBottom) * 0.85;

          if (maxSafeDiff > 0 && calcDiff > maxSafeDiff) {
            calcDiff = maxSafeDiff;
          }

          if (calcDiff > 0) {
            diff = calcDiff;
          }
        }
      }
    } catch (_) {
      // Ignore conversion errors and fall through to fallback
    }
  }

  // 2. Fallback 1: Calculate range from visible candles using chart.getVisibleRange()
  if (diff === null && chart && typeof chart.getVisibleRange === 'function' && dataList && dataList.length > 0) {
    try {
      const vr = chart.getVisibleRange();
      if (vr && typeof vr.from === 'number' && typeof vr.to === 'number') {
        const fromIdx = Math.max(0, Math.floor(vr.from));
        const toIdx = Math.min(dataList.length - 1, Math.ceil(vr.to));
        let maxHigh = -Infinity;
        let minLow = Infinity;

        for (let i = fromIdx; i <= toIdx; i++) {
          const c = dataList[i];
          if (c && typeof c.high === 'number' && typeof c.low === 'number') {
            if (c.high > maxHigh) maxHigh = c.high;
            if (c.low < minLow) minLow = c.low;
          }
        }

        if (maxHigh > minLow && isFinite(maxHigh) && isFinite(minLow)) {
          const visCandleSpan = maxHigh - minLow;
          diff = visCandleSpan * ratio;
        }
      }
    } catch (_) {
      // Ignore and fall through to fallback 2
    }
  }

  // 3. Fallback 2: Magnitude-based ratio calculation fallback
  if (diff === null || diff <= 0 || isNaN(diff)) {
    diff = entryVal * 0.005;
  }

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
  totalStep: 2,
  needDefaultPointFigure: false,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false,
  
  createPointFigures: ({ chart, overlay, yAxis }: any) => {
    if (chart && !isOverlayVisible(overlay, chart)) {
      return [];
    }

    if (overlay.points.length < 6) {
      return [];
    }

    const pts6 = chart.convertToPixel(overlay.points, { paneId: 'candle_pane' });
    if (pts6.length < 6 || !yAxis) return [];

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

    // ─── Trade Activation & Exit Calculation ──────────────────────────────────
    const dataList = chart?.getDataList?.() || [];
    const diMin = overlay.points[4]?.dataIndex ?? 0;
    const diMax = overlay.points[5]?.dataIndex ?? (dataList.length - 1);
    const startIdx = Math.max(0, diMin);

    let activationCandle: any = null;
    let activationIndex = -1;

    if (dataList.length > 0 && startIdx < dataList.length) {
      for (let i = startIdx; i < dataList.length; i++) {
        const c = dataList[i];
        if (c && typeof c.low === 'number' && typeof c.high === 'number') {
          if (c.low <= entryPrice && c.high >= entryPrice) {
            activationCandle = c;
            activationIndex = i;
            break;
          }
        }
      }
    }

    let actPt: any = null;
    let exitPt: any = null;
    let activeSide: 'TP' | 'SL' | null = null;
    let isExited = false;

    if (activationCandle && activationIndex >= 0) {
      const convertedAct = chart.convertToPixel(
        [{ timestamp: activationCandle.timestamp, value: entryPrice, dataIndex: activationIndex }],
        { paneId: 'candle_pane' }
      );
      if (convertedAct && convertedAct.length > 0 && convertedAct[0]) {
        actPt = convertedAct[0];
      }

      // Scan forward from activation to determine exit (TP or SL) up to diMax
      let exitCandle: any = null;
      let exitIndex = -1;
      let exitPrice = entryPrice;

      const maxSearchIdx = Math.min(diMax, dataList.length - 1);

      for (let i = activationIndex; i <= maxSearchIdx; i++) {
        const c = dataList[i];
        if (!c || typeof c.low !== 'number' || typeof c.high !== 'number') continue;

        let hitTP = false;
        let hitSL = false;

        if (isLong) {
          hitTP = c.high >= targetPrice;
          hitSL = c.low <= stopPrice;
        } else {
          hitTP = c.low <= targetPrice;
          hitSL = c.high >= stopPrice;
        }

        if (hitTP || hitSL) {
          if (hitTP && hitSL) {
            const distTP = Math.abs(c.open - targetPrice);
            const distSL = Math.abs(c.open - stopPrice);
            if (distTP <= distSL) {
              activeSide = 'TP';
              exitPrice = targetPrice;
            } else {
              activeSide = 'SL';
              exitPrice = stopPrice;
            }
          } else if (hitTP) {
            activeSide = 'TP';
            exitPrice = targetPrice;
          } else {
            activeSide = 'SL';
            exitPrice = stopPrice;
          }

          exitCandle = c;
          exitIndex = i;
          isExited = true;
          break;
        }
      }

      // If trade is in progress (no TP/SL exit hit yet up to diMax)
      if (!isExited) {
        const currentIdx = Math.max(activationIndex, maxSearchIdx);
        exitCandle = dataList[currentIdx];
        exitIndex = currentIdx;

        if (exitCandle) {
          const rawClose = typeof exitCandle.close === 'number' ? exitCandle.close : entryPrice;
          const minBound = Math.min(targetPrice, stopPrice);
          const maxBound = Math.max(targetPrice, stopPrice);
          const clampedClose = Math.max(minBound, Math.min(maxBound, rawClose));
          exitPrice = clampedClose;
          if (isLong) {
            activeSide = rawClose >= entryPrice ? 'TP' : 'SL';
          } else {
            activeSide = rawClose <= entryPrice ? 'TP' : 'SL';
          }
        }
      }

      if (exitCandle && exitIndex >= 0) {
        const convertedExit = chart.convertToPixel(
          [{ timestamp: exitCandle.timestamp, value: exitPrice, dataIndex: exitIndex }],
          { paneId: 'candle_pane' }
        );
        if (convertedExit && convertedExit.length > 0 && convertedExit[0]) {
          exitPt = convertedExit[0];
        }
      }
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

    // ─── Independent Activation & Exit Visualization Settings ─────────────────
    const showActivationLine = customSettings.showActivationLine !== false;
    const showActivationHighlight = customSettings.showActivationHighlight !== false;
    const actLineColor = customSettings.activationLineColor || '#808285';
    const actLineWidth = customSettings.activationLineWidth || 1;
    const actLineStyle = customSettings.activationLineStyle || 'dashed';
    const actHighlightOpacity = typeof customSettings.activationHighlightOpacity === 'number'
      ? customSettings.activationHighlightOpacity
      : 0.28;

    // 2b. Active Area Single-Side Higher-Opacity Shading (if activated & showActivationHighlight is enabled)
    if (showActivationHighlight && actPt && exitPt && activeSide) {
      if (isExited) {
        // Exited trade: highlight full TP/SL region from activation X to exit X
        const activeLeft = Math.max(left, Math.min(right, actPt.x));
        const activeRight = Math.max(left, Math.min(right, exitPt.x));
        const activeWidth = activeRight - activeLeft;

        if (activeWidth > 0) {
          if (activeSide === 'TP') {
            const activeGreenFill = boostColorOpacity(greenFill, actHighlightOpacity);
            figures.push({
              type: 'rect',
              attrs: { x: activeLeft, y: tpTop, width: activeWidth, height: tpHeight },
              styles: { style: 'fill', color: activeGreenFill }
            });
          } else if (activeSide === 'SL') {
            const activeRedFill = boostColorOpacity(redFill, actHighlightOpacity);
            figures.push({
              type: 'rect',
              attrs: { x: activeLeft, y: slTop, width: activeWidth, height: slHeight },
              styles: { style: 'fill', color: activeRedFill }
            });
          }
        }
      } else {
        // Active trade (no exit yet): highlight region from activation X to right edge (pMR.x), bounded vertically from entry (y0) to latest price (exitPt.y)
        const activeLeft = Math.max(left, Math.min(right, actPt.x));
        const activeRight = right;
        const activeWidth = activeRight - activeLeft;

        if (activeWidth > 0) {
          const fillTop = Math.min(y0, exitPt.y);
          const fillHeight = Math.abs(y0 - exitPt.y);

          if (fillHeight > 0) {
            if (activeSide === 'TP') {
              const activeGreenFill = boostColorOpacity(greenFill, actHighlightOpacity);
              figures.push({
                type: 'rect',
                attrs: { x: activeLeft, y: fillTop, width: activeWidth, height: fillHeight },
                styles: { style: 'fill', color: activeGreenFill }
              });
            } else if (activeSide === 'SL') {
              const activeRedFill = boostColorOpacity(redFill, actHighlightOpacity);
              figures.push({
                type: 'rect',
                attrs: { x: activeLeft, y: fillTop, width: activeWidth, height: fillHeight },
                styles: { style: 'fill', color: activeRedFill }
              });
            }
          }
        }
      }
    }

    // Standard TP/SL/Entry Lines configuration (only rendered when showLines is ON)
    const showLines = customSettings.showLines === true;

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

    // Point B (lineEndPt) connects to exitPt (first TP/SL hit or last candle close at diMax boundary)
    const lineEndPt = exitPt;

    // 5b. Activation Trade Line (Point A = Activation to Point B = Clamped Close at diMax boundary)
    if (showActivationLine && actPt && lineEndPt) {
      let actDashedVal = [4, 3];
      let actStyleName = 'dashed';
      if (actLineStyle === 'solid') {
        actStyleName = 'solid';
      } else if (actLineStyle === 'dotted') {
        actStyleName = 'dashed';
        actDashedVal = [2, 2];
      }

      figures.push({
        type: 'line',
        attrs: {
          coordinates: [
            { x: actPt.x, y: y0 },
            { x: lineEndPt.x, y: lineEndPt.y }
          ]
        },
        styles: { color: actLineColor, size: actLineWidth, style: actStyleName, dashedValue: actDashedVal }
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

    const showMarkers = customSettings.showMarkers !== false;

    // 6. Entry/Activation Circle Marker (if activated & showMarkers is enabled)
    if (showMarkers && actPt) {
      figures.push({
        type: 'circle',
        attrs: { x: actPt.x, y: y0, r: 4 },
        styles: {
          style: 'stroke_fill',
          color: '#ffffff',
          borderColor: isLong ? greenBorder : redBorder,
          borderSize: 2
        },
        ignoreEvent: true
      });
    }

    // 7. Exit Circle Marker (at Point B lineEndPt, if activated & showMarkers is enabled)
    if (showMarkers && actPt && lineEndPt) {
      figures.push({
        type: 'circle',
        attrs: { x: lineEndPt.x, y: lineEndPt.y, r: 4 },
        styles: {
          style: 'stroke_fill',
          color: '#ffffff',
          borderColor: activeSide === 'TP' ? greenBorder : redBorder,
          borderSize: 2
        },
        ignoreEvent: true
      });
    }

    // Grab handles — only shown when the box is in focus (selected or hovered)
    // so they don't clutter the canvas when the box is idle.
    if (isSelected || isHovered) {
      const draggedIndex = overlay.extendData?.draggedIndex;
      const hoveredAnchorIndex = overlay.extendData?.hoveredAnchorIndex;
      drawGrabHandles(figures, pts6, overlay.lock || false, draggedIndex, hoveredAnchorIndex);
    }

    return figures;
  },

  createYAxisFigures: ({ chart, overlay, yAxis, bounding }: any) => {
    if (!yAxis || !chart || overlay.points.length < 6) return [];

    const points = overlay.points;
    const targetPrice = points[0].value;
    const entryPrice  = points[4].value;
    const stopPrice   = points[2].value;

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

  let initialSizePercent = 18;
  try {
    const savedDefaults = localStorage.getItem(`fx_default_settings_${overlay.name}`);
    const defaultSettings = savedDefaults ? JSON.parse(savedDefaults) : {};
    const mergedSettings = {
      ...defaultSettings,
      ...(overlay.extendData?.customSettings || {})
    };
    if (typeof mergedSettings.initialSizePercent === 'number' && mergedSettings.initialSizePercent > 0) {
      initialSizePercent = mergedSettings.initialSizePercent;
    }
  } catch (_) {}

  const newPoints = computeDefaultRRPoints(
    p0.value, p0.timestamp, p0.dataIndex ?? 0, isLong, dataList, tf, event.chart, initialSizePercent
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
  if (points.length < 6) {
    return false;
  }

  const chart = event.chart;
  const dataList = chart.getDataList();
  const tf = chart?._loadedTimeframe || '1m';
  const { value: tfVal, unit: tfUnit } = parseTimeframe(tf);
  let tfMinutes = tfVal;
  if (tfUnit === 'hours') tfMinutes = tfVal * 60;
  else if (tfUnit === 'days') tfMinutes = tfVal * 1440;
  else if (tfUnit === 'weeks') tfMinutes = tfVal * 10080;
  else if (tfUnit === 'months') tfMinutes = tfVal * 43200;
  const tfMs = tfMinutes * 60 * 1000;

  const mousePt = chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];
  if (!mousePt) {
    return false;
  }

  const snapped = snapPointToCandle(event, event.x, event.y);
  const targetPt = snapped || mousePt;

  // Retrieve current values of the 6 points
  const startPoints = event.overlay.extendData?.startPoints || points;

  // Retrieve baseline values of the 6 points from startPoints
  let yTP = startPoints[0].value;
  let ySL = startPoints[2].value;
  let yEntry = startPoints[4].value;

  let diMin = startPoints[4].dataIndex;
  let xMin = startPoints[4].timestamp;
  let diMax = startPoints[5].dataIndex;
  let xMax = startPoints[5].timestamp;

  // 1. Vertical adjustment: Dragging TP (0, 1), SL (2, 3), or Entry (4, 5) updates the respective price level
  if (draggedIndex === 0 || draggedIndex === 1) { // TP anchors
    yTP = targetPt.value;
    if (isLong) {
      if (yTP < yEntry) yTP = yEntry;
    } else {
      if (yTP > yEntry) yTP = yEntry;
    }
  } else if (draggedIndex === 2 || draggedIndex === 3) { // SL anchors
    ySL = targetPt.value;
    if (isLong) {
      if (ySL > yEntry) ySL = yEntry;
    } else {
      if (ySL < yEntry) ySL = yEntry;
    }
  } else if (draggedIndex === 4) { // Entry Anchor 1 (Left) is vertical + horizontal, Entry Anchor 2 (index 5) is horizontal-only
    yEntry = targetPt.value;
    const min = Math.min(yTP, ySL);
    const max = Math.max(yTP, ySL);
    if (yEntry < min) yEntry = min;
    if (yEntry > max) yEntry = max;
  }

  // 2. Horizontal adjustment: Left-side anchors adjust diMin/xMin, right-side anchors adjust diMax/xMax
  const isLeftSide = [0, 3, 4].includes(draggedIndex);

  if (isLeftSide) {
    diMin = targetPt.dataIndex;
    xMin = targetPt.timestamp;

    // Constrain diMin to be valid (>= 0)
    if (diMin < 0) {
      diMin = 0;
      xMin = dataList[0]?.timestamp ?? xMin;
    }

    // Horizontal push constraint: if left edge reaches or exceeds right edge, push right edge
    if (diMin >= diMax) {
      diMax = diMin + 1;
      xMax = diMax < dataList.length
        ? dataList[diMax].timestamp
        : xMin + tfMs;

      // Update startPoints in extendData to persist the pushed position
      if (event.overlay.extendData?.startPoints) {
        const sp = event.overlay.extendData.startPoints;
        if (sp.length >= 6) {
          // Align all right-side points (TP2: 1, SL2: 2, ENTRY2: 5) to the pushed position
          sp[1].dataIndex = diMax;
          sp[1].timestamp = xMax;
          sp[2].dataIndex = diMax;
          sp[2].timestamp = xMax;
          sp[5].dataIndex = diMax;
          sp[5].timestamp = xMax;
        }
      }
    }
  } else {
    // Right-side anchors
    diMax = targetPt.dataIndex;
    xMax = targetPt.timestamp;

    // Horizontal clamp constraint: right edge cannot cross left edge + 1
    if (diMax <= diMin) {
      diMax = diMin + 1;
      xMax = diMax < dataList.length
        ? dataList[diMax].timestamp
        : xMin + tfMs;
    }
  }

  const newPoints = [
    { timestamp: xMin, value: yTP,    dataIndex: diMin }, // Index 0: TP1
    { timestamp: xMax, value: yTP,    dataIndex: diMax }, // Index 1: TP2
    { timestamp: xMax, value: ySL,    dataIndex: diMax }, // Index 2: SL2
    { timestamp: xMin, value: ySL,    dataIndex: diMin }, // Index 3: SL1
    { timestamp: xMin, value: yEntry, dataIndex: diMin }, // Index 4: ENTRY1
    { timestamp: xMax, value: yEntry, dataIndex: diMax }  // Index 5: ENTRY2
  ];

  // Return geometry to the Drawing Framework — it owns overrideOverlay and synchronization.
  return { points: newPoints } satisfies ToolMutationResult;
};

// ─── Tool Exports ─────────────────────────────────────────────────────────────

export const LongPositionTool: ToolDefinition = {
  id: 'longPosition',
  name: 'Long position',
  icon: LongPositionIcon as any,
  group: 'forecast',
  settingsSchema: [
    { id: 'profitColor',                label: 'Profit Fill Color',           type: 'color',   defaultValue: 'rgba(76, 175, 80, 0.12)' },
    { id: 'lossColor',                  label: 'Loss Fill Color',             type: 'color',   defaultValue: 'rgba(244, 67, 54, 0.12)' },
    { id: 'lineColor',                  label: 'Entry Line Color',            type: 'color',   defaultValue: '#808285' },
    { id: 'textColor',                  label: 'Text Color',                  type: 'color',   defaultValue: '#ffffff' },
    { id: 'showLines',                  label: 'Show Lines',                  type: 'boolean', defaultValue: false },
    { id: 'showActivationLine',         label: 'Show Activation Line',        type: 'boolean', defaultValue: true },
    { id: 'activationLineColor',        label: 'Activation Line Color',       type: 'color',   defaultValue: '#808285' },
    { id: 'activationLineStyle',        label: 'Activation Line Style',       type: 'select',  defaultValue: 'dashed' },
    { id: 'activationLineWidth',        label: 'Activation Line Width',       type: 'number',  defaultValue: 1 },
    { id: 'showActivationHighlight',    label: 'Show Activation Highlight',   type: 'boolean', defaultValue: true },
    { id: 'activationHighlightOpacity', label: 'Activation Highlight Opacity',type: 'number',  defaultValue: 0.28 },
    { id: 'showMarkers',                label: 'Show Markers',                type: 'boolean', defaultValue: true },
    { id: 'initialSizePercent',         label: 'Initial Size (%)',            type: 'number',  defaultValue: 18 },
    { id: 'alwaysShowStats',            label: 'Always Show Stats',           type: 'boolean', defaultValue: true }
  ],
  defaultTemplates: [{
    id: 'default',
    name: 'Default',
    commonSettings: {
      profitColor:                'rgba(76, 175, 80, 0.12)',
      lossColor:                  'rgba(244, 67, 54, 0.12)',
      lineColor:                  '#808285',
      textColor:                  '#ffffff',
      showLines:                  false,
      showActivationLine:         true,
      activationLineColor:        '#808285',
      activationLineStyle:        'dashed',
      activationLineWidth:        1,
      showActivationHighlight:    true,
      activationHighlightOpacity: 0.28,
      showMarkers:                true,
      initialSizePercent:         18,
      alwaysShowStats:            true
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
    { id: 'profitColor',                label: 'Profit Fill Color',           type: 'color',   defaultValue: 'rgba(76, 175, 80, 0.12)' },
    { id: 'lossColor',                  label: 'Loss Fill Color',             type: 'color',   defaultValue: 'rgba(244, 67, 54, 0.12)' },
    { id: 'lineColor',                  label: 'Entry Line Color',            type: 'color',   defaultValue: '#808285' },
    { id: 'textColor',                  label: 'Text Color',                  type: 'color',   defaultValue: '#ffffff' },
    { id: 'showLines',                  label: 'Show Lines',                  type: 'boolean', defaultValue: false },
    { id: 'showActivationLine',         label: 'Show Activation Line',        type: 'boolean', defaultValue: true },
    { id: 'activationLineColor',        label: 'Activation Line Color',       type: 'color',   defaultValue: '#808285' },
    { id: 'activationLineStyle',        label: 'Activation Line Style',       type: 'select',  defaultValue: 'dashed' },
    { id: 'activationLineWidth',        label: 'Activation Line Width',       type: 'number',  defaultValue: 1 },
    { id: 'showActivationHighlight',    label: 'Show Activation Highlight',   type: 'boolean', defaultValue: true },
    { id: 'activationHighlightOpacity', label: 'Activation Highlight Opacity',type: 'number',  defaultValue: 0.28 },
    { id: 'showMarkers',                label: 'Show Markers',                type: 'boolean', defaultValue: true },
    { id: 'initialSizePercent',         label: 'Initial Size (%)',            type: 'number',  defaultValue: 18 },
    { id: 'alwaysShowStats',            label: 'Always Show Stats',           type: 'boolean', defaultValue: true }
  ],
  defaultTemplates: [{
    id: 'default',
    name: 'Default',
    commonSettings: {
      profitColor:                'rgba(76, 175, 80, 0.12)',
      lossColor:                  'rgba(244, 67, 54, 0.12)',
      lineColor:                  '#808285',
      textColor:                  '#ffffff',
      showLines:                  false,
      showActivationLine:         true,
      activationLineColor:        '#808285',
      activationLineStyle:        'dashed',
      activationLineWidth:        1,
      showActivationHighlight:    true,
      activationHighlightOpacity: 0.28,
      showMarkers:                true,
      initialSizePercent:         18,
      alwaysShowStats:            true
    }
  }],
  createOverlayDef:  () => createRiskRewardOverlayDef('shortPosition', false),
  onDrawEnd:         (event: any) => onDrawEndRiskReward(event, false),
  onPressedMoving:   (event: any, draggedIndex: number) => onPressedMovingRiskReward(event, draggedIndex, false)
};
