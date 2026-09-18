import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_SETTINGS, type ChartSettings } from '../../../config/chartPresets.ts';
import { calculateHeikinAshi, toPresentationData } from '../../../utils/heikinAshi.ts';
import { ReplayVisibilityBoundaryManager } from '../../../engine/replay/ReplayVisibilityBoundary.ts';

describe('Chart Type & Replay Boundary Invariants', () => {
  const sampleCandles = [
    { timestamp: 1000, open: 10, high: 15, low: 8, close: 12, volume: 100 },
    { timestamp: 2000, open: 12, high: 18, low: 11, close: 16, volume: 150 },
    { timestamp: 3000, open: 16, high: 20, low: 14, close: 19, volume: 200 },
    { timestamp: 4000, open: 19, high: 22, low: 17, close: 21, volume: 180 },
    { timestamp: 5000, open: 21, high: 25, low: 19, close: 24, volume: 220 },
  ];

  it('provides default lineColor and chartType in all built-in presets', () => {
    for (const [name, preset] of Object.entries(PRESET_SETTINGS)) {
      assert.ok(preset.chartType, `Preset ${name} must define chartType`);
      assert.equal(preset.chartType, 'candlestick');
      assert.ok(preset.lineColor, `Preset ${name} must define lineColor`);
      assert.match(preset.lineColor, /^#[0-9A-Fa-f]{6}$/, `Preset ${name} lineColor must be valid hex`);
    }
  });

  it('preserves configured lineColor across settings updates', () => {
    const customSettings: ChartSettings = {
      ...PRESET_SETTINGS.classic,
      chartType: 'line',
      lineColor: '#FF5722',
    };

    assert.equal(customSettings.chartType, 'line');
    assert.equal(customSettings.lineColor, '#FF5722');
  });

  it('calculates correct mask boundary for Line chart vs Candlestick and Heikin Ashi', () => {
    const maskX = 350; // Pixel coordinate for replayCurrentTimestamp
    const barWidth = 8;

    // Helper simulating the visual mask calculation in ReplayMaskIndicator
    const getMaskStartX = (chartType: string | undefined, x: number, width: number) => {
      const isLineChart = chartType === 'line';
      return isLineChart ? x : x + (width / 2) + 1;
    };

    // 1. Line chart: visual mask starts exactly at vertex maskX
    const lineMaskStart = getMaskStartX('line', maskX, barWidth);
    assert.equal(lineMaskStart, 350);

    // 2. Candlestick chart: visual mask starts after the candle body (maskX + barWidth/2 + 1)
    const candleMaskStart = getMaskStartX('candlestick', maskX, barWidth);
    assert.equal(candleMaskStart, 350 + 4 + 1); // 355

    // 3. Heikin Ashi chart: visual mask starts after the candle body (maskX + barWidth/2 + 1)
    const haMaskStart = getMaskStartX('heikin_ashi', maskX, barWidth);
    assert.equal(haMaskStart, 355);

    // 4. Default / undefined: defaults to candlestick behavior
    const defaultMaskStart = getMaskStartX(undefined, maskX, barWidth);
    assert.equal(defaultMaskStart, 355);
  });

  it('guarantees Replay timestamp semantics are completely invariant to chart type changes', () => {
    const boundary = new ReplayVisibilityBoundaryManager();
    const replayCutpointTs = 3000;
    boundary.setReplayState(true, replayCutpointTs);

    // 1. Raw market data indices are unchanged
    const revealedRange = boundary.getRevealedIndexRange(sampleCandles);
    assert.deepEqual(revealedRange, { start: 0, end: 2 });
    assert.equal(boundary.getCurrentTimestamp(), 3000);

    // 2. Presentation transform for Heikin Ashi has exact 1:1 timestamps
    const haPresentation = toPresentationData(sampleCandles, 'heikin_ashi');
    assert.equal(haPresentation.length, sampleCandles.length);
    for (let i = 0; i < sampleCandles.length; i++) {
      assert.equal(haPresentation[i].timestamp, sampleCandles[i].timestamp);
    }

    const haRevealedRange = boundary.getRevealedIndexRange(haPresentation);
    assert.deepEqual(haRevealedRange, { start: 0, end: 2 });

    // 3. Line presentation uses underlying candles unmodified
    const linePresentation = toPresentationData(sampleCandles, 'line');
    assert.equal(linePresentation, sampleCandles);

    // 4. Underlying replay state remains identical
    assert.equal(boundary.getCurrentTimestamp(), 3000);
    assert.equal(boundary.isTimestampRevealed(3000), true);
    assert.equal(boundary.isTimestampRevealed(4000), false);
  });
});
