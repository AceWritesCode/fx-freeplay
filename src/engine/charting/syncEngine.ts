import { getLayoutChartCount } from '@/domain/market/timeframeUtils';

/**
 * Returns the timeframe duration in milliseconds.
 */
export const getTimeframeMs = (tf: string): number => {
  const match = tf.match(/^(\d+)?([mhdDWM])$/);
  if (!match) return 60 * 1000;
  const num = parseInt(match[1] || '1', 10);
  const unit = match[2];
  if (unit === 'm') return num * 60 * 1000;
  if (unit === 'h') return num * 60 * 60 * 1000;
  if (unit === 'd' || unit === 'D') return num * 24 * 60 * 60 * 1000;
  if (unit === 'W') return num * 7 * 24 * 60 * 60 * 1000;
  if (unit === 'M') return num * 30 * 24 * 60 * 60 * 1000;
  return 60 * 1000;
};

/**
 * Gets the current bar spacing for the given chart instance safely.
 */
export const getChartBarSpace = (chart: any): number => {
  const space = chart.getBarSpace();
  if (typeof space === 'object' && space !== null) {
    return space.bar || space.barSpace || 6;
  }
  if (typeof space === 'number') {
    return space;
  }
  return 6;
};

/**
 * Gets the offset from the right edge in pixels.
 */
export const getTrueOffsetRightDistance = (chart: any): number => {
  if (chart && chart._chartStore && typeof chart._chartStore._lastBarRightSideDiffBarCount === 'number') {
    const space = getChartBarSpace(chart);
    return chart._chartStore._lastBarRightSideDiffBarCount * space;
  }
  return chart ? chart.getOffsetRightDistance() : 0;
};

/**
 * Finds the index in the candle array matching the timestamp.
 * Interpolates index position if timestamp falls between points or outside ranges.
 */
export const findDataIndexByTimestamp = (data: any[], timestamp: number, tfMs: number): number => {
  if (data.length === 0) return 0;
  if (timestamp < data[0].timestamp) {
    const diff = data[0].timestamp - timestamp;
    return -Math.round(diff / tfMs);
  }
  if (timestamp > data[data.length - 1].timestamp) {
    const diff = timestamp - data[data.length - 1].timestamp;
    return (data.length - 1) + Math.round(diff / tfMs);
  }
  let low = 0;
  let high = data.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (data[mid].timestamp === timestamp) return mid;
    if (data[mid].timestamp < timestamp) low = mid + 1;
    else high = mid - 1;
  }
  if (low >= data.length) return data.length - 1;
  if (high < 0) return 0;
  return Math.abs(data[low].timestamp - timestamp) < Math.abs(data[high].timestamp - timestamp) ? low : high;
};

/**
 * Finds the index of the largest candle timestamp less than or equal to the target timestamp.
 */
export const findFloorIndexByTimestamp = (data: any[], timestamp: number): number => {
  if (data.length === 0) return 0;
  if (timestamp < data[0].timestamp) return 0;
  if (timestamp >= data[data.length - 1].timestamp) return data.length - 1;

  let low = 0;
  let high = data.length - 1;
  let ans = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (data[mid].timestamp <= timestamp) {
      ans = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return ans;
};

/**
 * Recalculates and sets offset to center the given timestamp on the chart.
 */
export const centerTimestampOnChart = (chart: any, timestamp: number, tfMs: number) => {
  const data = chart.getDataList();
  if (data.length === 0) return;
  const targetIndex = findDataIndexByTimestamp(data, timestamp, tfMs);
  const size = chart.getSize();
  const width = size?.width || 800;
  const space = getChartBarSpace(chart);
  const offsetRightDistance = (targetIndex - data.length) * space + (width / 2);
  chart.setOffsetRightDistance(offsetRightDistance);
};

/**
 * Crosshair Synchronization logic.
 */
export const syncCrosshairs = (
  sourceIndex: number,
  params: any,
  chartInstances: any[],
  slots: { symbol: string; timeframe: string }[],
  layoutType: string
) => {
  const visibleCount = getLayoutChartCount(layoutType);
  const sourceChart = chartInstances[sourceIndex];
  if (!sourceChart) return;

  const isCrosshairActive = params && typeof params.x === 'number' && typeof params.y === 'number';

  for (let i = 0; i < visibleCount; i++) {
    if (i === sourceIndex) continue;
    const targetChart = chartInstances[i];
    if (!targetChart) continue;

    if (isCrosshairActive) {
      const sourceSymbol = slots[sourceIndex]?.symbol;
      const targetSymbol = slots[i]?.symbol;
      if (sourceSymbol && targetSymbol && sourceSymbol === targetSymbol) {
        const points = sourceChart.convertFromPixel([{ x: params.x, y: params.y }]);
        if (points && points.length > 0) {
          const { timestamp, value } = points[0];
          if (timestamp !== undefined && value !== undefined) {
            const targetData = targetChart.getDataList();
            if (targetData && targetData.length > 0) {
              const targetIdx = findFloorIndexByTimestamp(targetData, timestamp);
              const coords = targetChart.convertToPixel([{ dataIndex: targetIdx, value }]);
              if (coords && coords.length > 0) {
                const { x, y } = coords[0];
                if (x !== undefined && y !== undefined) {
                  targetChart.executeAction('onCrosshairChange', { x, y });
                }
              }
            }
          }
        }
      }
    } else {
      targetChart.executeAction('onCrosshairChange', {});
    }
  }
};

/**
 * Time Scale / Centering Synchronization logic.
 */
export const syncTimeScale = (
  sourceIndex: number,
  param: any,
  chartInstances: any[],
  slots: { symbol: string; timeframe: string }[],
  layoutType: string,
  syncCrosshairEnabled: boolean
) => {
  const timestamp = param?.data?.current?.timestamp || param?.data?.timestamp || param?.timestamp;
  if (!timestamp) return;

  const visibleCount = getLayoutChartCount(layoutType);
  
  for (let i = 0; i < visibleCount; i++) {
    const targetChart = chartInstances[i];
    if (!targetChart) continue;
    const targetTfMs = getTimeframeMs(slots[i]?.timeframe || '1m');
    centerTimestampOnChart(targetChart, timestamp, targetTfMs);
  }

  if (syncCrosshairEnabled) {
    setTimeout(() => {
      const sourceChart = chartInstances[sourceIndex];
      if (sourceChart) {
        const sourceData = sourceChart.getDataList();
        const sourceIdx = findDataIndexByTimestamp(sourceData, timestamp, getTimeframeMs(slots[sourceIndex]?.timeframe || '1m'));
        const sourceCandle = sourceData[sourceIdx];
        if (sourceCandle) {
          const coords = sourceChart.convertToPixel([{ timestamp, value: sourceCandle.close }]);
          if (coords && coords.length > 0) {
            sourceChart.executeAction('onCrosshairChange', { x: coords[0].x, y: coords[0].y });
          }
        }
      }

      for (let i = 0; i < visibleCount; i++) {
        if (i === sourceIndex) continue;
        const targetChart = chartInstances[i];
        if (!targetChart) continue;

        const targetData = targetChart.getDataList();
        const targetTfMs = getTimeframeMs(slots[i]?.timeframe || '1m');
        const targetIdx = findDataIndexByTimestamp(targetData, timestamp, targetTfMs);
        const targetCandle = targetData[targetIdx];
        if (targetCandle) {
          const coords = targetChart.convertToPixel([{ timestamp, value: targetCandle.close }]);
          if (coords && coords.length > 0) {
            const { x, y } = coords[0];
            if (x !== undefined && y !== undefined) {
              targetChart.executeAction('onCrosshairChange', { x, y });
            }
          }
        }
      }
    }, 50);
  }
};

/**
 * Visible Date Range Synchronization logic.
 */
export const syncDateRange = (
  sourceIndex: number,
  chartInstances: any[],
  slots: { symbol: string; timeframe: string }[],
  layoutType: string
) => {
  const visibleCount = getLayoutChartCount(layoutType);
  const sourceChart = chartInstances[sourceIndex];
  if (!sourceChart) return;

  const sourceData = sourceChart.getDataList();
  const sourceVisibleRange = sourceChart.getVisibleRange();
  if (sourceData.length === 0 || !sourceVisibleRange) return;

  const sourceTfMs = getTimeframeMs(slots[sourceIndex]?.timeframe || '1m');
  
  const fromIdx = Math.round(sourceVisibleRange.realFrom);
  let t1: number;
  if (fromIdx < 0) {
    t1 = sourceData[0].timestamp + fromIdx * sourceTfMs;
  } else if (fromIdx >= sourceData.length) {
    t1 = sourceData[sourceData.length - 1].timestamp + (fromIdx - (sourceData.length - 1)) * sourceTfMs;
  } else {
    t1 = sourceData[fromIdx].timestamp;
  }

  const toIdx = Math.round(sourceVisibleRange.realTo);
  let t2: number;
  if (toIdx < 0) {
    t2 = sourceData[0].timestamp + toIdx * sourceTfMs;
  } else if (toIdx >= sourceData.length) {
    t2 = sourceData[sourceData.length - 1].timestamp + (toIdx - (sourceData.length - 1)) * sourceTfMs;
  } else {
    t2 = sourceData[toIdx].timestamp;
  }

  if (isNaN(t1) || isNaN(t2)) return;

  for (let i = 0; i < visibleCount; i++) {
    if (i === sourceIndex) continue;
    const targetChart = chartInstances[i];
    if (!targetChart) continue;
    
    const targetData = targetChart.getDataList();
    if (targetData.length === 0) continue;

    const targetTfMs = getTimeframeMs(slots[i]?.timeframe || '1m');
    const targetSymbol = slots[i]?.symbol;
    const sourceSymbol = slots[sourceIndex]?.symbol;
    if (sourceSymbol === targetSymbol && slots[i]?.timeframe === slots[sourceIndex]?.timeframe) {
      const oldSpace = getChartBarSpace(sourceChart);
      const oldOffset = getTrueOffsetRightDistance(sourceChart);
      targetChart.setBarSpace(oldSpace);
      targetChart.setOffsetRightDistance(oldOffset);
    } else {
      const targetFrom = findDataIndexByTimestamp(targetData, t1, targetTfMs);
      const targetTo = findDataIndexByTimestamp(targetData, t2, targetTfMs);
      const visibleBarsCount = Math.max(1, targetTo - targetFrom);
      const targetWidth = targetChart.getSize()?.width || 800;
      const desiredBarSpace = targetWidth / visibleBarsCount;
      
      targetChart.setBarSpace(desiredBarSpace);
      const actualSpace = getChartBarSpace(targetChart);
      const offsetRightDistance = (targetTo - targetData.length) * actualSpace;
      
      targetChart.setOffsetRightDistance(offsetRightDistance);
    }
  }
};
