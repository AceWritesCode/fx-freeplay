/**
 * Chart Registry Module
 *
 * Provides a lightweight registry to access active KLineChart instances
 * for cross-cutting engines (such as the Screenshot Engine and Sync Engines)
 * without violating component boundaries.
 */

import { getTimeframeMs } from './syncEngine';

export interface KLineChartViewportProvider {
  getDataList: () => { timestamp: number }[];
  getVisibleRange: () => { realFrom: number; realTo: number } | null;
}

const chartRegistry: (KLineChartViewportProvider | null)[] = [null, null, null, null];

export function registerChartInstance(slotIndex: number, chart: unknown): void {
  if (slotIndex >= 0 && slotIndex < 4) {
    chartRegistry[slotIndex] = (chart as KLineChartViewportProvider) || null;
  }
}

export function unregisterChartInstance(slotIndex: number): void {
  if (slotIndex >= 0 && slotIndex < 4) {
    chartRegistry[slotIndex] = null;
  }
}

export function getChartInstance(slotIndex: number): KLineChartViewportProvider | null {
  return chartRegistry[slotIndex] || null;
}

export function getAllChartInstances(): (KLineChartViewportProvider | null)[] {
  return [...chartRegistry];
}

export interface VisibleDateRange {
  fromTimestamp: number;
  toTimestamp: number;
  hasData: boolean;
}

/**
 * Computes the exact visible date/time range currently shown on the chart viewport.
 * Uses chart.getVisibleRange() and chart.getDataList().
 */
export function getChartVisibleDateRange(slotIndex: number, timeframe = '1m'): VisibleDateRange | null {
  const chart = chartRegistry[slotIndex];
  if (!chart || typeof chart.getDataList !== 'function' || typeof chart.getVisibleRange !== 'function') {
    return null;
  }

  const dataList = chart.getDataList();
  const visibleRange = chart.getVisibleRange();

  if (!dataList || dataList.length === 0 || !visibleRange) {
    return null;
  }

  const tfMs = getTimeframeMs(timeframe);

  const fromIdx = Math.round(visibleRange.realFrom);
  let t1: number;
  if (fromIdx < 0) {
    t1 = dataList[0].timestamp + fromIdx * tfMs;
  } else if (fromIdx >= dataList.length) {
    t1 = dataList[dataList.length - 1].timestamp + (fromIdx - (dataList.length - 1)) * tfMs;
  } else {
    t1 = dataList[fromIdx].timestamp;
  }

  const toIdx = Math.round(visibleRange.realTo);
  let t2: number;
  if (toIdx < 0) {
    t2 = dataList[0].timestamp + toIdx * tfMs;
  } else if (toIdx >= dataList.length) {
    t2 = dataList[dataList.length - 1].timestamp + (toIdx - (dataList.length - 1)) * tfMs;
  } else {
    t2 = dataList[toIdx].timestamp;
  }

  if (isNaN(t1) || isNaN(t2)) {
    return null;
  }

  return {
    fromTimestamp: Math.min(t1, t2),
    toTimestamp: Math.max(t1, t2),
    hasData: true,
  };
}
