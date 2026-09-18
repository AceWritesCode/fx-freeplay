import { describe, it, expect } from 'vitest';
import { calculateHeikinAshi, toPresentationData } from '../heikinAshi';
import type { KLineData } from '../dataUtils';

describe('Heikin Ashi Calculation', () => {
  it('returns empty array for empty inputs', () => {
    expect(calculateHeikinAshi([])).toEqual([]);
  });

  it('calculates the first candle correctly', () => {
    const raw: KLineData[] = [
      {
        timestamp: 1000,
        open: 10,
        high: 15,
        low: 5,
        close: 12,
        volume: 100,
        turnover: 1200,
      },
    ];

    const result = calculateHeikinAshi(raw);
    expect(result).toHaveLength(1);

    // HA Close = (10 + 15 + 5 + 12) / 4 = 32 / 4 = 8
    // HA Open (first) = (10 + 12) / 2 = 11
    // HA High = max(15, 11, 8) = 15
    // HA Low = min(5, 11, 8) = 5
    expect(result[0].close).toBe(8);
    expect(result[0].open).toBe(11);
    expect(result[0].high).toBe(15);
    expect(result[0].low).toBe(5);
    expect(result[0].timestamp).toBe(1000);
    expect(result[0].volume).toBe(100);
    expect(result[0].turnover).toBe(1200);
  });

  it('calculates subsequent candles recursively using previous HA open and close', () => {
    const raw: KLineData[] = [
      { timestamp: 1000, open: 10, high: 15, low: 5, close: 12 },
      { timestamp: 2000, open: 12, high: 20, low: 10, close: 18 },
    ];

    const result = calculateHeikinAshi(raw);
    expect(result).toHaveLength(2);

    // Candle 1: HA Open = 11, HA Close = 8
    // Candle 2:
    // HA Close = (12 + 20 + 10 + 18) / 4 = 60 / 4 = 15
    // HA Open = (prevHA Open + prevHA Close) / 2 = (11 + 8) / 2 = 9.5
    // HA High = max(20, 9.5, 15) = 20
    // HA Low = min(10, 9.5, 15) = 9.5
    expect(result[1].close).toBe(15);
    expect(result[1].open).toBe(9.5);
    expect(result[1].high).toBe(20);
    expect(result[1].low).toBe(9.5);
    expect(result[1].timestamp).toBe(2000);
  });

  it('clamps high and low when HA open or close exceed raw high or low', () => {
    const raw: KLineData[] = [
      { timestamp: 1000, open: 100, high: 105, low: 95, close: 100 },
      // Extreme jump where previous average drags HA open above current high
      { timestamp: 2000, open: 50, high: 52, low: 48, close: 50 },
    ];

    const result = calculateHeikinAshi(raw);
    // Candle 1: HA Open = 100, HA Close = 100
    // Candle 2:
    // HA Close = (50 + 52 + 48 + 50) / 4 = 50
    // HA Open = (100 + 100) / 2 = 100
    // Raw High = 52. HA High must be max(52, 100, 50) = 100
    // Raw Low = 48. HA Low must be min(48, 100, 50) = 48
    expect(result[1].open).toBe(100);
    expect(result[1].close).toBe(50);
    expect(result[1].high).toBe(100);
    expect(result[1].low).toBe(48);
  });

  it('does not mutate original input candles', () => {
    const raw: KLineData[] = [
      { timestamp: 1000, open: 10, high: 15, low: 5, close: 12 },
    ];
    const rawCopy = JSON.parse(JSON.stringify(raw));

    calculateHeikinAshi(raw);
    expect(raw).toEqual(rawCopy);
  });

  it('toPresentationData helper routes candlestick, line, and heikin_ashi properly', () => {
    const raw: KLineData[] = [
      { timestamp: 1000, open: 10, high: 15, low: 5, close: 12 },
    ];

    expect(toPresentationData(raw, 'candlestick')).toBe(raw);
    expect(toPresentationData(raw, 'line')).toBe(raw);
    expect(toPresentationData(raw, undefined)).toBe(raw);

    const ha = toPresentationData(raw, 'heikin_ashi');
    expect(ha).not.toBe(raw);
    expect(ha[0].open).toBe(11);
    expect(ha[0].close).toBe(8);
  });
});
