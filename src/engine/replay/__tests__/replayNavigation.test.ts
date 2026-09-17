import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findCandleIndexByTimestamp,
  getNextReplayTimestamp,
  getPrevReplayTimestamp
} from '../replayNavigation.ts';
import type { KLineData } from '../../../utils/dataUtils.ts';

describe('replayNavigation - findCandleIndexByTimestamp Binary Search', () => {
  const sampleData: KLineData[] = [
    { timestamp: 1000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
    { timestamp: 2000, open: 1.5, high: 2.5, low: 1.0, close: 2.0, volume: 100 },
    { timestamp: 3000, open: 2.0, high: 3.0, low: 1.5, close: 2.5, volume: 100 },
    { timestamp: 4000, open: 2.5, high: 3.5, low: 2.0, close: 3.0, volume: 100 },
    { timestamp: 5000, open: 3.0, high: 4.0, low: 2.5, close: 3.5, volume: 100 },
  ];

  it('handles empty or null dataset', () => {
    assert.equal(findCandleIndexByTimestamp([], 3000), -1);
    assert.equal(findCandleIndexByTimestamp(null as any, 3000), -1);
    assert.equal(findCandleIndexByTimestamp(undefined as any, 3000), -1);
  });

  it('handles single-candle dataset', () => {
    const singleData: KLineData[] = [
      { timestamp: 2000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 }
    ];
    // Before
    assert.equal(findCandleIndexByTimestamp(singleData, 1000), -1);
    // Exact match
    assert.equal(findCandleIndexByTimestamp(singleData, 2000), 0);
    // After
    assert.equal(findCandleIndexByTimestamp(singleData, 3000), 0);
  });

  it('finds exact timestamp matches', () => {
    assert.equal(findCandleIndexByTimestamp(sampleData, 1000), 0);
    assert.equal(findCandleIndexByTimestamp(sampleData, 2000), 1);
    assert.equal(findCandleIndexByTimestamp(sampleData, 3000), 2);
    assert.equal(findCandleIndexByTimestamp(sampleData, 4000), 3);
    assert.equal(findCandleIndexByTimestamp(sampleData, 5000), 4);
  });

  it('finds correct floor index for timestamp between two candles', () => {
    assert.equal(findCandleIndexByTimestamp(sampleData, 1500), 0);
    assert.equal(findCandleIndexByTimestamp(sampleData, 2999), 1);
    assert.equal(findCandleIndexByTimestamp(sampleData, 3001), 2);
    assert.equal(findCandleIndexByTimestamp(sampleData, 4999), 3);
  });

  it('returns -1 for timestamps strictly before the first candle', () => {
    assert.equal(findCandleIndexByTimestamp(sampleData, 0), -1);
    assert.equal(findCandleIndexByTimestamp(sampleData, 999), -1);
    assert.equal(findCandleIndexByTimestamp(sampleData, -1000), -1);
  });

  it('returns last index for timestamps at or after the last candle', () => {
    assert.equal(findCandleIndexByTimestamp(sampleData, 5000), 4);
    assert.equal(findCandleIndexByTimestamp(sampleData, 5001), 4);
    assert.equal(findCandleIndexByTimestamp(sampleData, 100000), 4);
  });

  it('validates step forward and step backward replay helpers with binary search', () => {
    assert.equal(getNextReplayTimestamp(sampleData, 1000), 2000);
    assert.equal(getNextReplayTimestamp(sampleData, 2500), 3000);
    assert.equal(getNextReplayTimestamp(sampleData, 5000), null);

    assert.equal(getPrevReplayTimestamp(sampleData, 3000), 2000);
    assert.equal(getPrevReplayTimestamp(sampleData, 2500), 1000);
    assert.equal(getPrevReplayTimestamp(sampleData, 1000), null);
    assert.equal(getPrevReplayTimestamp(sampleData, 500), null);
  });

  it('guarantees exact equivalence with linear search across 50,000 candles', () => {
    const largeData: KLineData[] = [];
    const baseTime = 1600000000000;
    const interval = 60000; // 1 minute
    const count = 50000;

    for (let i = 0; i < count; i++) {
      largeData.push({
        timestamp: baseTime + i * interval,
        open: 1.1000,
        high: 1.1050,
        low: 1.0950,
        close: 1.1020,
        volume: 50
      });
    }

    const linearSearch = (data: KLineData[], ts: number): number => {
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].timestamp <= ts) {
          return i;
        }
      }
      return -1;
    };

    const testTimestamps = [
      baseTime - 1000,
      baseTime,
      baseTime + 30000,
      baseTime + 100 * interval,
      baseTime + 100 * interval + 15000,
      baseTime + 25000 * interval,
      baseTime + 25000 * interval + 45000,
      baseTime + 49999 * interval,
      baseTime + 50000 * interval,
      baseTime + 100000 * interval
    ];

    for (const ts of testTimestamps) {
      const expected = linearSearch(largeData, ts);
      const actual = findCandleIndexByTimestamp(largeData, ts);
      assert.equal(actual, expected, `Mismatch for timestamp ${ts}: expected ${expected}, got ${actual}`);
    }
  });
});
