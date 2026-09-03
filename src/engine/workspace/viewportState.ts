import { getTrueOffsetRightDistance } from '@/engine/charting';

export interface ViewportScaleState {
  offset: number | null;
  wasManualScale: boolean;
  yAxisRange: { from: number; to: number } | null;
}

/**
 * Captures the current right offset distance and manual Y-axis scale of a chart.
 */
export function captureChartViewport(chart: any): ViewportScaleState {
  if (!chart) {
    return { offset: null, wasManualScale: false, yAxisRange: null };
  }

  const offset = getTrueOffsetRightDistance(chart);

  let wasManualScale = false;
  let yAxisRange: { from: number; to: number } | null = null;

  const pane = chart.getDrawPaneById?.('candle_pane');
  const yAxis = pane?.getYAxisComponents?.()?.[0];
  if (yAxis) {
    wasManualScale = !yAxis.getAutoCalcTickFlag();
    if (wasManualScale) {
      const r = yAxis.getRange();
      if (r && !isNaN(r.from) && !isNaN(r.to) && r.from < r.to) {
        yAxisRange = r;
      } else {
        wasManualScale = false;
      }
    }
  }

  return { offset, wasManualScale, yAxisRange };
}

/**
 * Restores the captured scroll offset and manual Y-axis range to a chart.
 */
export function restoreChartViewport(
  chart: any,
  state: ViewportScaleState,
  baseScrollIndex: number,
  isSymbolSwitch: boolean = false,
  offsetRatio: number = 0.5
): void {
  if (!chart || baseScrollIndex < 0) return;

  let space = 6;
  const barSpaceVal = chart.getBarSpace();
  if (barSpaceVal) {
    if (typeof barSpaceVal === 'number') space = barSpaceVal;
    else if (typeof barSpaceVal === 'object') space = barSpaceVal.bar || 6;
  }

  const offsetVal = state.offset;
  if (offsetVal !== null && offsetVal !== 0 && !isSymbolSwitch) {
    const barsOffset = Math.round(offsetVal / space);
    const targetScrollIndex = baseScrollIndex + barsOffset;
    chart.scrollToDataIndex(targetScrollIndex);
  } else {
    const chartWidth = chart.getSize() && chart.getSize().width > 0 ? chart.getSize().width : 800;
    const targetOffset = chartWidth * offsetRatio;
    const defaultBars = Math.round(targetOffset / space);
    const defaultScrollIndex = baseScrollIndex + defaultBars;
    chart.scrollToDataIndex(defaultScrollIndex);
    chart.setOffsetRightDistance(targetOffset);
  }

  if (state.wasManualScale && state.yAxisRange && !isSymbolSwitch) {
    const pane = chart.getDrawPaneById?.('candle_pane');
    const yAxis = pane?.getYAxisComponents?.()?.[0];
    if (yAxis) {
      yAxis.setRange(state.yAxisRange.from, state.yAxisRange.to);
    }
  }
}
