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
