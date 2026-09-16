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

/**
 * Tools that support angle snapping to 45-degree increments when Shift is held.
 */
export function isAngleSnapSupportedTool(toolOrOverlayName?: string): boolean {
  if (!toolOrOverlayName) return false;
  return toolOrOverlayName === 'trendLine' || toolOrOverlayName === 'ray' || toolOrOverlayName === 'arrow';
}

/**
 * Calculates the snapped target coordinate in chart data space so that the vector
 * from pBase to target snaps to the nearest 45-degree increment (PI / 4).
 * Reuses the exact projection and coordinate conversion logic established in drawing editing.
 */
export function calculateAngleSnapPoint(
  chart: any,
  pBase: any,
  targetPixelX: number,
  targetPixelY: number,
  paneId: string = 'candle_pane'
): { timestamp?: number; dataIndex?: number; value?: number } | null {
  if (!chart || !pBase) return null;

  try {
    const pixels = chart.convertToPixel([pBase], { paneId });
    if (!pixels || pixels.length === 0 || !pixels[0]) return null;

    const x1 = pixels[0].x;
    const y1 = pixels[0].y;
    const x2 = targetPixelX;
    const y2 = targetPixelY;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r <= 0) return null;

    const angle = Math.atan2(dy, dx);
    const angleSteps = Math.PI / 4;
    const nearestStep = Math.round(angle / angleSteps);
    const snappedAngle = nearestStep * angleSteps;

    const projLength = dx * Math.cos(snappedAngle) + dy * Math.sin(snappedAngle);
    const x2_snapped = x1 + projLength * Math.cos(snappedAngle);
    const y2_snapped = y1 + projLength * Math.sin(snappedAngle);

    const snappedPoints = chart.convertFromPixel([{ x: x2_snapped, y: y2_snapped }], { paneId });
    if (snappedPoints) {
      const pt = Array.isArray(snappedPoints) ? snappedPoints[0] : snappedPoints;
      if (pt) return pt;
    }
  } catch (_) {}

  return null;
}
