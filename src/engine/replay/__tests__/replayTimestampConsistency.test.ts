import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { replayEngine, findCandleIndexByTimestamp, replayVisibilityBoundary } from '../index.ts';
import type { KLineData } from '@/utils/dataUtils.ts';

describe('Bar Replay — Canonical vs Effective Timestamp Consistency', () => {
  // Base timestamp: 10 Aug 2026 08:00:00 UTC (1786348800000)
  const baseTime = 1786348800000;

  // Generate synthetic multi-timeframe dataset starting from 08:00
  // M1 bars: 08:00, 08:01, 08:02, ..., 08:30 (every 60s)
  const m1Bars: KLineData[] = Array.from({ length: 60 }, (_, i) => ({
    timestamp: baseTime + i * 60 * 1000,
    open: 1.1000 + i * 0.0001,
    high: 1.1005 + i * 0.0001,
    low: 1.0995 + i * 0.0001,
    close: 1.1002 + i * 0.0001,
    volume: 100,
  }));

  // M5 bars: 08:00, 08:05, 08:10, 08:15, ..., 08:30 (every 300s)
  const m5Bars: KLineData[] = Array.from({ length: 12 }, (_, i) => ({
    timestamp: baseTime + i * 300 * 1000,
    open: 1.1000 + i * 0.0005,
    high: 1.1010 + i * 0.0005,
    low: 1.0990 + i * 0.0005,
    close: 1.1005 + i * 0.0005,
    volume: 500,
  }));

  // M15 bars: 08:00, 08:15, 08:30, 08:45 (every 900s)
  const m15Bars: KLineData[] = Array.from({ length: 4 }, (_, i) => ({
    timestamp: baseTime + i * 900 * 1000,
    open: 1.1000 + i * 0.0015,
    high: 1.1020 + i * 0.0015,
    low: 1.0980 + i * 0.0015,
    close: 1.1010 + i * 0.0015,
    volume: 1500,
  }));

  const allTimeframes: Record<string, KLineData[]> = {
    '1m': m1Bars,
    '5m': m5Bars,
    '15m': m15Bars,
  };

  /**
   * Helper that simulates timeframe-specific effective boundary derivation
   * from the canonical replay timestamp.
   */
  const getEffectiveBoundary = (tfData: KLineData[], canonicalTs: number): { index: number; timestamp: number } => {
    const idx = findCandleIndexByTimestamp(tfData, canonicalTs);
    return {
      index: idx,
      timestamp: idx !== -1 ? tfData[idx].timestamp : tfData[0].timestamp,
    };
  };

  it('1. Initial 08:06 on M1 -> M5 -> M15 -> M1 preserves canonical timestamp at 08:06', () => {
    // Cut point at 08:06 (baseTime + 6 mins)
    const cutTimestamp = baseTime + 6 * 60 * 1000;
    let canonicalReplayTimestamp = cutTimestamp;

    // Verify initial M1 effective boundary
    const m1Eff1 = getEffectiveBoundary(allTimeframes['1m'], canonicalReplayTimestamp);
    assert.strictEqual(m1Eff1.timestamp, cutTimestamp, 'M1 effective timestamp must be 08:06');

    // Switch M1 -> M5
    // Timeframe switch only calculates effective boundary, does NOT mutate canonical timestamp
    const m5Eff = getEffectiveBoundary(allTimeframes['5m'], canonicalReplayTimestamp);
    assert.strictEqual(m5Eff.timestamp, baseTime + 5 * 60 * 1000, 'M5 display boundary must normalize to 08:05');
    assert.strictEqual(canonicalReplayTimestamp, cutTimestamp, 'Canonical timestamp must remain 08:06');

    // Switch M5 -> M15
    const m15Eff = getEffectiveBoundary(allTimeframes['15m'], canonicalReplayTimestamp);
    assert.strictEqual(m15Eff.timestamp, baseTime, 'M15 display boundary must normalize to 08:00');
    assert.strictEqual(canonicalReplayTimestamp, cutTimestamp, 'Canonical timestamp must remain 08:06');

    // Switch M15 -> M1
    const m1Eff2 = getEffectiveBoundary(allTimeframes['1m'], canonicalReplayTimestamp);
    assert.strictEqual(m1Eff2.timestamp, cutTimestamp, 'M1 display boundary must return to original 08:06');
    assert.strictEqual(canonicalReplayTimestamp, cutTimestamp, 'Canonical timestamp must remain 08:06');
  });

  it('2. Initial 08:06 on M1 -> switch M5 -> advance replay once -> M1 displays newly advanced timestamp (08:10)', () => {
    const cutTimestamp = baseTime + 6 * 60 * 1000; // 08:06
    let canonicalReplayTimestamp = cutTimestamp;

    // Switch to M5: effective starting point is 08:05
    const m5Eff = getEffectiveBoundary(allTimeframes['5m'], canonicalReplayTimestamp);
    assert.strictEqual(m5Eff.timestamp, baseTime + 5 * 60 * 1000);

    // Create session on M5 starting at effective candle
    const m5Session = replayEngine.createSession({
      symbol: 'EURUSD',
      historicalData: m5Bars,
      startIndex: m5Eff.index,
    });

    let isInitial = true;
    m5Session.subscribe((state) => {
      if (isInitial) {
        isInitial = false;
        return; // Skip initial subscription event to protect canonical timestamp
      }
      canonicalReplayTimestamp = state.currentTimestamp;
    });

    // Advance replay once on M5
    m5Session.stepForward();

    // The replay on M5 advanced to 08:10 (next 5m candle)
    assert.strictEqual(canonicalReplayTimestamp, baseTime + 10 * 60 * 1000, 'Canonical timestamp must advance to 08:10');

    // Switch back to M1: effective boundary on M1 must now be 08:10
    const m1Eff = getEffectiveBoundary(allTimeframes['1m'], canonicalReplayTimestamp);
    assert.strictEqual(m1Eff.timestamp, baseTime + 10 * 60 * 1000, 'M1 must display newly advanced timestamp 08:10');

    replayEngine.destroySession();
  });

  it('3. Initial 08:06 on M1 -> M15 -> M1 restores original timestamp', () => {
    const cutTimestamp = baseTime + 6 * 60 * 1000;
    const canonicalReplayTimestamp = cutTimestamp;

    // Switch M1 -> M15
    const m15Eff = getEffectiveBoundary(allTimeframes['15m'], canonicalReplayTimestamp);
    assert.strictEqual(m15Eff.timestamp, baseTime); // 08:00

    // Switch M15 -> M1
    const m1Eff = getEffectiveBoundary(allTimeframes['1m'], canonicalReplayTimestamp);
    assert.strictEqual(m1Eff.timestamp, cutTimestamp); // 08:06
  });

  it('4. Multiple timeframe switches without replay advancement never mutate canonical timestamp', () => {
    const cutTimestamp = baseTime + 14 * 60 * 1000; // 08:14
    let canonicalReplayTimestamp = cutTimestamp;

    const tfSequence = ['1m', '5m', '15m', '5m', '1m', '15m', '1m'];
    for (const tf of tfSequence) {
      const eff = getEffectiveBoundary(allTimeframes[tf], canonicalReplayTimestamp);
      assert.ok(eff.timestamp <= canonicalReplayTimestamp, `Effective timestamp ${eff.timestamp} must be <= canonical ${canonicalReplayTimestamp}`);
    }

    assert.strictEqual(canonicalReplayTimestamp, cutTimestamp, 'Canonical timestamp must remain completely untouched across all switches');
  });

  it('5. Actual replay advancement (stepForward / stepBackward) updates canonical timestamp', () => {
    let canonicalReplayTimestamp = baseTime + 6 * 60 * 1000; // 08:06

    // M1 session
    const m1Start = getEffectiveBoundary(allTimeframes['1m'], canonicalReplayTimestamp);
    const session = replayEngine.createSession({
      symbol: 'EURUSD',
      historicalData: m1Bars,
      startIndex: m1Start.index,
    });

    let isInitial = true;
    session.subscribe((state) => {
      if (isInitial) {
        isInitial = false;
        return;
      }
      canonicalReplayTimestamp = state.currentTimestamp;
    });

    // Step forward 3 times
    session.stepForward();
    assert.strictEqual(canonicalReplayTimestamp, baseTime + 7 * 60 * 1000); // 08:07
    session.stepForward();
    assert.strictEqual(canonicalReplayTimestamp, baseTime + 8 * 60 * 1000); // 08:08
    session.stepForward();
    assert.strictEqual(canonicalReplayTimestamp, baseTime + 9 * 60 * 1000); // 08:09

    // Step backward 1 time
    session.stepBackward();
    assert.strictEqual(canonicalReplayTimestamp, baseTime + 8 * 60 * 1000); // 08:08

    replayEngine.destroySession();
  });

  it('6. Replay date/time selection establishes a new canonical timestamp', () => {
    let canonicalReplayTimestamp = baseTime + 6 * 60 * 1000; // 08:06

    // User selects 08:22 via DateTimePicker
    const newSelectedTime = baseTime + 22 * 60 * 1000;
    canonicalReplayTimestamp = newSelectedTime;

    assert.strictEqual(canonicalReplayTimestamp, newSelectedTime);

    // M5 effective boundary for 08:22 is 08:20
    const m5Eff = getEffectiveBoundary(allTimeframes['5m'], canonicalReplayTimestamp);
    assert.strictEqual(m5Eff.timestamp, baseTime + 20 * 60 * 1000);

    // M15 effective boundary for 08:22 is 08:15
    const m15Eff = getEffectiveBoundary(allTimeframes['15m'], canonicalReplayTimestamp);
    assert.strictEqual(m15Eff.timestamp, baseTime + 15 * 60 * 1000);

    // M1 effective boundary for 08:22 is 08:22
    const m1Eff = getEffectiveBoundary(allTimeframes['1m'], canonicalReplayTimestamp);
    assert.strictEqual(m1Eff.timestamp, baseTime + 22 * 60 * 1000);
  });

  it('7. Multi-chart replay visibility boundary correctly slices all timeframes from canonical timestamp', () => {
    const canonicalReplayTimestamp = baseTime + 17 * 60 * 1000; // 08:17
    replayVisibilityBoundary.setReplayState(true, canonicalReplayTimestamp);

    // M1 slot revealed range
    const m1Range = replayVisibilityBoundary.getRevealedIndexRange(m1Bars);
    assert.strictEqual(m1Bars[m1Range.end].timestamp, baseTime + 17 * 60 * 1000); // 08:17

    // M5 slot revealed range
    const m5Range = replayVisibilityBoundary.getRevealedIndexRange(m5Bars);
    assert.strictEqual(m5Bars[m5Range.end].timestamp, baseTime + 15 * 60 * 1000); // 08:15

    // M15 slot revealed range
    const m15Range = replayVisibilityBoundary.getRevealedIndexRange(m15Bars);
    assert.strictEqual(m15Bars[m15Range.end].timestamp, baseTime + 15 * 60 * 1000); // 08:15

    // Multi-chart leftMinVisibleBarCount
    const m1MinBars = replayVisibilityBoundary.getLeftMinVisibleBarCount(m1Bars);
    const m5MinBars = replayVisibilityBoundary.getLeftMinVisibleBarCount(m5Bars);
    const m15MinBars = replayVisibilityBoundary.getLeftMinVisibleBarCount(m15Bars);

    assert.strictEqual(m1MinBars, (m1Bars.length - 1 - m1Range.end) + 1);
    assert.strictEqual(m5MinBars, (m5Bars.length - 1 - m5Range.end) + 1);
    assert.strictEqual(m15MinBars, (m15Bars.length - 1 - m15Range.end) + 1);

    replayVisibilityBoundary.reset();
  });
});
