import { getTrueOffsetRightDistance, getChartBarSpace, findFloorIndexByTimestamp } from '../charting/syncEngine.ts';

export interface ViewportScaleState {
  offset: number | null;
  wasManualScale: boolean;
  yAxisRange: { from: number; to: number } | null;
  centerTimestamp?: number | null;
  isNearRightEdge?: boolean;
  barSpace?: number;
  anchorTimestamp?: number | null;
  anchorScreenX?: number;
  anchorPrice?: number | null;
  anchorRatio?: number; // anchorScreenY / paneHeight (normalized in [0, 1])
  priceSpan?: number | null; // to - from (vertical scale)
  manualRange?: { from: number; to: number } | null;
  rightEdgeOffset?: number | null;
}

/**
 * Safely applies a [from, to] range to a KLineCharts Y-axis component.
 * Ensures all required internal fields (range, real*, display*) are populated
 * as numbers, preventing createTicksImp from dividing by NaN and rendering "NaN".
 */
export function applyAxisRange(yAxis: any, from: number, to: number): void {
  const span = to - from;
  if (!yAxis || isNaN(from) || isNaN(to) || span <= 0) return;
  yAxis.setRange({
    from,
    to,
    range: span,
    realFrom: from,
    realTo: to,
    realRange: span,
    displayFrom: from,
    displayTo: to,
    displayRange: span,
  });
}

/**
 * Captures the current right offset distance, candle width (barSpace),
 * center/anchor candle timestamp and screen X coordinate,
 * right-edge proximity, and minimal vertical state (anchorPrice, anchorRatio, priceSpan, manualRange).
 */
export function captureChartViewport(chart: any): ViewportScaleState {
  if (!chart) {
    return {
      offset: null,
      wasManualScale: false,
      yAxisRange: null,
      centerTimestamp: null,
      isNearRightEdge: true,
      barSpace: 6,
      anchorTimestamp: null,
      anchorScreenX: 400,
      anchorPrice: null,
      anchorRatio: 0.5,
      priceSpan: null,
      manualRange: null,
      rightEdgeOffset: null,
    };
  }

  const offset = getTrueOffsetRightDistance(chart);
  const barSpace = getChartBarSpace(chart);
  const chartSize = chart.getSize?.();
  const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;

  let wasManualScale = false;
  let manualRange: { from: number; to: number } | null = null;
  let centerTimestamp: number | null = null;
  let isNearRightEdge = true;
  let anchorTimestamp: number | null = null;
  let anchorScreenX = Math.round(chartWidth / 2);
  let anchorPrice: number | null = null;
  let anchorRatio = 0.5;
  let priceSpan: number | null = null;

  let centerIdx = -1;
  const dataList = chart.getDataList?.() || [];

  try {
    const visibleRange = chart.getVisibleRange?.();
    if (visibleRange && dataList.length > 0) {
      const fromIdx = Math.max(0, Math.min(dataList.length - 1, Math.floor(visibleRange.from)));
      const toIdx = Math.max(0, Math.min(dataList.length - 1, Math.ceil(visibleRange.to)));
      centerIdx = Math.floor((fromIdx + toIdx) / 2);
      if (dataList[centerIdx]?.timestamp) {
        centerTimestamp = dataList[centerIdx].timestamp;
        anchorTimestamp = dataList[centerIdx].timestamp;
      }
      isNearRightEdge = visibleRange.to >= dataList.length - 2;

      // Determine screen coordinate for the center anchor
      const pane = chart.getDrawPaneById?.('candle_pane');
      const xAxis = pane?.getXAxisComponent?.();
      if (xAxis && typeof xAxis.convertToPixel === 'function') {
        const px = xAxis.convertToPixel(centerIdx);
        if (typeof px === 'number' && !isNaN(px) && px > 0 && px < chartWidth) {
          anchorScreenX = px;
        }
      }
    }
  } catch (_) {}

  const pane = chart.getDrawPaneById?.('candle_pane');
  const yAxis = pane?.getYAxisComponents?.()?.[0];
  if (yAxis) {
    const bounding = yAxis.getBounding?.() || pane?.getMainWidget?.()?.getBounding?.();
    const paneHeight = bounding?.height || 0;

    wasManualScale = !yAxis.getAutoCalcTickFlag();
    const r = yAxis.getRange();
    if (r && !isNaN(r.from) && !isNaN(r.to) && r.from < r.to) {
      priceSpan = r.to - r.from;
      if (wasManualScale) {
        manualRange = { from: r.from, to: r.to };
      }
    } else {
      wasManualScale = false;
    }

    // Determine anchor price and screen-Y ratio in local pane coordinate space
    if (dataList.length > 0) {
      const anchorIdx = (isNearRightEdge || centerIdx < 0)
        ? dataList.length - 1
        : centerIdx;
      const candle = dataList[anchorIdx];
      if (candle && typeof candle.close === 'number' && !isNaN(candle.close)) {
        anchorPrice = candle.close;
        if (typeof yAxis.convertToPixel === 'function' && paneHeight > 0) {
          const py = yAxis.convertToPixel(anchorPrice);
          if (typeof py === 'number' && !isNaN(py) && py >= 0 && py <= paneHeight) {
            anchorRatio = py / paneHeight;
          }
        }
      }
    }

    // Fallback if anchorPrice or anchorRatio couldn't be determined from candle
    if (anchorPrice === null && paneHeight > 0 && typeof yAxis.convertFromPixel === 'function') {
      anchorRatio = 0.5;
      anchorPrice = yAxis.convertFromPixel(paneHeight / 2);
    }
  }

  return {
    offset,
    wasManualScale,
    yAxisRange: manualRange,
    centerTimestamp,
    isNearRightEdge,
    barSpace,
    anchorTimestamp,
    anchorScreenX,
    anchorPrice,
    anchorRatio,
    priceSpan,
    manualRange,
    rightEdgeOffset: offset,
  };
}

/**
 * Restores the captured viewport to a chart:
 * - Restores candle width / barSpace
 * - If near right edge (present/live), preserves right edge offset
 * - If historical view, calculates exact anchored offsetRightDistance so anchorTimestamp
 *   remains at the same screen-space coordinate anchorScreenX
 * - Restores vertical price scale and position:
 *   - Manual scale: restores manualRange with setAutoCalcTickFlag(false)
 *   - Auto scale: temporarily overrides auto-scaling to keep anchorPrice at anchorRatio with priceSpan,
 *     and automatically re-engages auto-scaling on subsequent user navigation (scroll/drag) or double-click.
 */
export function restoreChartViewport(
  chart: any,
  state: ViewportScaleState,
  baseScrollIndex: number,
  isSymbolSwitch: boolean = false,
  offsetRatio: number = 0.5,
  isHistoricalView: boolean = false
): void {
  if (!chart) return;

  (chart as any)._isProgrammaticScroll = true;

  const dataList = chart.getDataList?.() || [];
  const chartSize = chart.getSize?.();
  const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;

  // 1. Preserve candle width / barSpace
  const targetBarSpace = state.barSpace || getChartBarSpace(chart) || 6;
  if (typeof chart.setBarSpace === 'function') {
    chart.setBarSpace(targetBarSpace);
  }

  if (isSymbolSwitch) {
    // Reset view for symbol switches
    const targetOffset = chartWidth * offsetRatio;
    const defaultBars = Math.round(targetOffset / targetBarSpace);
    const defaultScrollIndex = (dataList.length > 0 ? dataList.length - 1 : baseScrollIndex) + defaultBars;
    chart.scrollToDataIndex(defaultScrollIndex);
    chart.setOffsetRightDistance(targetOffset);
  } else if (isHistoricalView && dataList.length > 0) {
    // Historical Viewport Restoration:
    // Anchor targetIndex at anchorScreenX:
    // offsetRightDistance = (targetIndex - (dataList.length - 1)) * barSpace + (chartWidth - anchorScreenX)
    const targetTimestamp = state.anchorTimestamp ?? state.centerTimestamp;
    let targetIndex = -1;
    if (targetTimestamp !== null && targetTimestamp !== undefined) {
      targetIndex = findFloorIndexByTimestamp(dataList, targetTimestamp);
    }
    if (targetIndex < 0) {
      targetIndex = baseScrollIndex >= 0 ? Math.min(baseScrollIndex, dataList.length - 1) : Math.floor(dataList.length / 2);
    }

    const anchorScreenX = (state.anchorScreenX !== undefined && state.anchorScreenX > 0)
      ? state.anchorScreenX
      : chartWidth / 2;

    const targetOffset = (targetIndex - (dataList.length - 1)) * targetBarSpace + (chartWidth - anchorScreenX);

    chart.setOffsetRightDistance(targetOffset);
    chart.scrollToDataIndex(targetIndex);
  } else {
    // Right-edge / Present Viewport Restoration:
    const offsetVal = state.offset;
    const lastIndex = dataList.length > 0 ? dataList.length - 1 : baseScrollIndex;
    if (offsetVal !== null && offsetVal !== undefined) {
      const barsOffset = Math.round(offsetVal / targetBarSpace);
      const targetScrollIndex = lastIndex + barsOffset;
      chart.scrollToDataIndex(targetScrollIndex);
      chart.setOffsetRightDistance(offsetVal);
    } else {
      const targetOffset = chartWidth * offsetRatio;
      const defaultBars = Math.round(targetOffset / targetBarSpace);
      const defaultScrollIndex = lastIndex + defaultBars;
      chart.scrollToDataIndex(defaultScrollIndex);
      chart.setOffsetRightDistance(targetOffset);
    }
  }

  // 2. Vertical Price-Axis Restoration
  if (!isSymbolSwitch) {
    const pane = chart.getDrawPaneById?.('candle_pane');
    const yAxis = pane?.getYAxisComponents?.()?.[0];
    if (yAxis) {
      if (state.wasManualScale && (state.manualRange || state.yAxisRange)) {
        // User was in manual scale mode: restore exact manual range
        const mRange = state.manualRange || state.yAxisRange!;
        applyAxisRange(yAxis, mRange.from, mRange.to);
        yAxis.setAutoCalcTickFlag(false);
        chart.layout?.({ measureWidth: true, update: true, buildYAxisTick: true });
      } else if (!state.wasManualScale && state.priceSpan && state.priceSpan > 0 && state.anchorPrice !== null && state.anchorPrice !== undefined) {
        // User was in auto-scale mode:
        // Calculate target range that places anchorPrice at anchorRatio with preserved priceSpan
        const ratio = (typeof state.anchorRatio === 'number' && !isNaN(state.anchorRatio))
          ? Math.max(0.05, Math.min(0.95, state.anchorRatio))
          : 0.5;
        const targetTo = state.anchorPrice + ratio * state.priceSpan;
        const targetFrom = state.anchorPrice - (1 - ratio) * state.priceSpan;

        applyAxisRange(yAxis, targetFrom, targetTo);
        yAxis.setAutoCalcTickFlag(false);
        chart.layout?.({ measureWidth: true, update: true, buildYAxisTick: true });

        // Temporarily override: re-engage auto-scale when user subsequently navigates (scrolls or pans)
        const reengageAutoScale = () => {
          try {
            chart.unsubscribeAction?.('onScroll', reengageAutoScale);
            chart.unsubscribeAction?.('onZoom', reengageAutoScale);
          } catch (_) {}
          if (!yAxis.getAutoCalcTickFlag?.()) {
            yAxis.setAutoCalcTickFlag?.(true);
            chart.layout?.({ measureWidth: true, update: true, buildYAxisTick: true });
          }
        };

        try {
          // Remove any previous listener before subscribing
          if ((chart as any)._reengageAutoScaleHandler) {
            chart.unsubscribeAction?.('onScroll', (chart as any)._reengageAutoScaleHandler);
            chart.unsubscribeAction?.('onZoom', (chart as any)._reengageAutoScaleHandler);
          }
          (chart as any)._reengageAutoScaleHandler = reengageAutoScale;
          chart.subscribeAction?.('onScroll', reengageAutoScale);
          chart.subscribeAction?.('onZoom', reengageAutoScale);
        } catch (_) {}
      }
    }
  }

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      (chart as any)._isProgrammaticScroll = false;
    });
  } else {
    (chart as any)._isProgrammaticScroll = false;
  }
}

