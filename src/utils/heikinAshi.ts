import type { KLineData } from './dataUtils';

/**
 * Calculates Heikin Ashi candlesticks from standard OHLC candlestick series.
 *
 * Formula:
 * - HA Close = (Open + High + Low + Close) / 4
 * - HA Open (first candle) = (Open + Close) / 2
 * - HA Open (subsequent) = (Previous HA Open + Previous HA Close) / 2
 * - HA High = Max(High, HA Open, HA Close)
 * - HA Low = Min(Low, HA Open, HA Close)
 * - Timestamp, volume, and turnover are preserved identically from raw data.
 *
 * This is purely a presentation transform; it never mutates input candles.
 */
export function calculateHeikinAshi(candles: KLineData[]): KLineData[] {
  if (!candles || candles.length === 0) {
    return [];
  }

  const result: KLineData[] = new Array(candles.length);

  for (let i = 0; i < candles.length; i++) {
    const raw = candles[i];
    const haClose = (raw.open + raw.high + raw.low + raw.close) / 4;

    let haOpen: number;
    if (i === 0) {
      haOpen = (raw.open + raw.close) / 2;
    } else {
      const prevHa = result[i - 1];
      haOpen = (prevHa.open + prevHa.close) / 2;
    }

    const haHigh = Math.max(raw.high, haOpen, haClose);
    const haLow = Math.min(raw.low, haOpen, haClose);

    result[i] = {
      ...raw,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
    };
  }

  return result;
}

/**
 * Helper to get presentation candles based on chart type.
 */
export function toPresentationData(
  candles: KLineData[],
  chartType?: 'candlestick' | 'line' | 'heikin_ashi' | string
): KLineData[] {
  if (!candles || candles.length === 0) return [];
  if (chartType === 'heikin_ashi') {
    return calculateHeikinAshi(candles);
  }
  return candles;
}
