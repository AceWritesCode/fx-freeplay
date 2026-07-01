import { registerOverlay } from 'klinecharts';

export function snapPointToCandle(event: any, rawX: number, rawY: number) {
  // Always read mode from the live chart-level flag so drag events on
  // pre-existing overlays still respect the current magnet state.
  const mode: string = event.chart._magnetMode ?? event.overlay.mode ?? 'normal';
  if (mode !== 'normal_magnet' && mode !== 'weak_magnet' && mode !== 'strong_magnet') {
    return null;
  }
  const point = event.chart.convertFromPixel([{ x: rawX, y: rawY }], { paneId: 'candle_pane' })[0];
  if (!point) return null;

  const dataList = event.chart.getDataList();
  if (!dataList || dataList.length === 0) return null;

  const rawIndex = Math.round(point.dataIndex);
  const dataIndex = Math.max(0, Math.min(dataList.length - 1, rawIndex));
  const candle = dataList[dataIndex];
  if (!candle) return null;

  const prices = [candle.open, candle.high, candle.low, candle.close];
  let closestPrice = prices[0];
  let minPriceDiff = Math.abs(point.value - closestPrice);
  for (let i = 1; i < prices.length; i++) {
    const diff = Math.abs(point.value - prices[i]);
    if (diff < minPriceDiff) {
      minPriceDiff = diff;
      closestPrice = prices[i];
    }
  }

  const sensitivity = event.overlay.modeSensitivity;

  if (mode === 'strong_magnet') {
    // 999999 = always snap (user set slider to 100). Otherwise use pixel threshold.
    if (sensitivity === undefined || sensitivity >= 999999) {
      return {
        value: closestPrice,
        timestamp: point.timestamp,
        dataIndex: point.dataIndex
      };
    }
    // Proximity-based snap for strong mode when user reduced from "always"
    const closestPixelResult = event.chart.convertToPixel(
      [{ timestamp: candle.timestamp, value: closestPrice }],
      { paneId: 'candle_pane' }
    );
    const closestPixelY = closestPixelResult?.[0]?.y;
    if (closestPixelY !== undefined && Math.abs(rawY - closestPixelY) <= sensitivity) {
      return {
        value: closestPrice,
        timestamp: point.timestamp,
        dataIndex: point.dataIndex
      };
    }
    return null;
  }

  if (mode === 'normal_magnet' || mode === 'weak_magnet') {
    const defaultSens = mode === 'normal_magnet' ? 30 : 10;
    const proximitySens = sensitivity || defaultSens;
    const closestPixelResult = event.chart.convertToPixel(
      [{ timestamp: candle.timestamp, value: closestPrice }],
      { paneId: 'candle_pane' }
    );
    const closestPixelY = closestPixelResult?.[0]?.y;
    if (closestPixelY !== undefined) {
      const pixelDist = Math.abs(rawY - closestPixelY);
      if (pixelDist <= proximitySens) {
        return {
          value: closestPrice,
          timestamp: point.timestamp,
          dataIndex: point.dataIndex
        };
      }
    }
  }

  return null;
}

export function registerCustomOverlays() {
  // Custom drawing tools (rect, priceChannel) have been removed for the new framework.
  // Their original code is backed up in src/utils/old-overlays-backup.ts.

  // 1. Custom Last Price Line (Unclamped)
  registerOverlay({
    name: 'customPriceLine',
    totalStep: 0,
    needDefaultPointFigure: false,
    createPointFigures: ({ chart, yAxis, bounding }: any) => {
      if (!chart._showPriceLine) return [];

      const dataList = chart.getDataList();
      if (dataList.length === 0) return [];
      const lastData = dataList[dataList.length - 1];
      if (!lastData) return [];

      const close = lastData.close;
      const open = lastData.open;

      // Calculate Y coordinate without clamping
      const priceY = yAxis.convertToPixel(close);

      // Determine color
      let color = chart._priceLineColor || '#2196f3';
      if (chart._priceLineUseCandleColor) {
        const prevData = dataList[dataList.length - 2];
        const comparePrice = prevData ? prevData.close : open;
        if (close > comparePrice) {
          color = chart._bullColor || '#26a69a';
        } else if (close < comparePrice) {
          color = chart._bearColor || '#ef5350';
        } else {
          color = '#8b93a6';
        }
      }

      const width = bounding?.width ?? 1000;

      return [
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x: 0, y: priceY },
              { x: width, y: priceY }
            ]
          },
          styles: {
            style: chart._priceLineStyle || 'dashed',
            color: color,
            size: chart._priceLineSize || 1,
            dashedValue: [4, 4]
          }
        }
      ];
    }
  });

  // 2. Customizable Session Breaks overlay (draws vertical lines at day transitions)
  registerOverlay({
    name: 'sessionBreaks',
    totalStep: 0,
    createPointFigures: ({ chart, bounding }: any) => {
      if (!chart._showSessionBreaks) {
        return [];
      }

      // Check period and hide session breaks on Daily, Weekly, and Monthly charts to avoid clutter
      const period = chart.getPeriod?.();
      if (period && (period.type === 'day' || period.type === 'week' || period.type === 'month')) {
        return [];
      }

      const dataList = chart.getDataList();
      if (!dataList || dataList.length === 0) return [];

      const figures: any[] = [];
      const height = bounding?.height ?? 800;
      const color = chart._sessionBreaksColor || 'rgba(139, 147, 166, 0.4)';
      const style = chart._sessionBreaksStyle || 'dashed';
      const size = chart._sessionBreaksSize || 1;

      // Find all transitions of days
      const dayTransitionIndices: number[] = [];
      for (let i = 1; i < dataList.length; i++) {
        const prevCandle = dataList[i - 1];
        const currCandle = dataList[i];
        if (!prevCandle || !currCandle) continue;

        const prevDate = new Date(prevCandle.timestamp);
        const currDate = new Date(currCandle.timestamp);
        
        // Date transition check using local functions to match chart's X-axis date formatting
        const isNewDay = prevDate.getDate() !== currDate.getDate() ||
                         prevDate.getMonth() !== currDate.getMonth() ||
                         prevDate.getFullYear() !== currDate.getFullYear();

        if (isNewDay) {
          dayTransitionIndices.push(i);
        }
      }

      // Convert only those day transitions to lines
      dayTransitionIndices.forEach(idx => {
        const candle = dataList[idx];
        const xResult = chart.convertToPixel(
          [{ timestamp: candle.timestamp, value: candle.close }],
          { paneId: 'candle_pane' }
        );
        const x = xResult?.[0]?.x;
        if (x !== undefined && !isNaN(x)) {
          figures.push({
            type: 'line',
            attrs: {
              coordinates: [
                { x, y: 0 },
                { x, y: height }
              ]
            },
            styles: {
              style: style,
              color: color,
              size: size,
              dashedValue: [4, 4]
            }
          });
        }
      });

      return figures;
    }
  });
}
