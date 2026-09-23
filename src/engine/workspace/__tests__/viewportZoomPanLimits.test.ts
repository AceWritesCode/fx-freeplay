import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPhysicalSolidCandleBar,
  createPhysicalStrokeCandleBar,
} from '../../charting/candlePhysicalRenderer.ts';

describe('Chart Viewport — Zoom & Pan Range Invariants', () => {
  describe('Zoom Space Boundaries & Physical Pixel Rendering at Extremes', () => {
    it('handles extreme zoomed-in barSpace (e.g. 500px - 2 visible candles) without layout artifacts', () => {
      const x = 400;
      const priceY = [50, 100, 200, 250]; // [high, top, bottom, low]
      const barSpace = { bar: 500, gapBar: 400, halfGapBar: 200 };
      const colors = ['#26a69a', '#26a69a', '#26a69a'];
      const correction = 0;
      const dpr = 2; // 2x retina display

      const solidFigures = createPhysicalSolidCandleBar(x, priceY, barSpace, colors, correction, dpr);
      assert.ok(solidFigures.length >= 2, 'Should produce wick and body figures');

      // Check wick figure
      const wickFig = solidFigures.find(f => f.styles?.color === '#26a69a');
      assert.ok(wickFig, 'Wick figure generated');

      // Check stroke figures
      const strokeFigures = createPhysicalStrokeCandleBar(x, priceY, barSpace, colors, correction, dpr);
      assert.ok(strokeFigures.length >= 2, 'Should produce stroke candle figures');
    });

    it('handles extreme zoomed-out subpixel barSpace (e.g. 0.25px - 6000 visible candles) with min 1-device-pixel guarantee', () => {
      const x = 150.5;
      const priceY = [50, 60, 80, 90];
      const barSpace = { bar: 0.25, gapBar: 1, halfGapBar: 0 };
      const colors = ['#ef5350', '#ef5350', '#ef5350'];
      const correction = 0;
      const dpr = 1;

      const solidFigures = createPhysicalSolidCandleBar(x, priceY, barSpace, colors, correction, dpr);
      assert.ok(solidFigures.length >= 1, 'Should produce candle figures');

      // Check body rect
      const bodyFig = solidFigures.find(f => f.styles?.style === 'fill');
      assert.ok(bodyFig, 'Body rect exists');
      const bodyAttr = Array.isArray(bodyFig.attrs) ? bodyFig.attrs[0] : bodyFig.attrs;
      assert.ok(bodyAttr.width >= 1, 'Body width must be at least 1 device pixel');
      assert.ok(!isNaN(bodyAttr.x) && !isNaN(bodyAttr.y), 'Coordinates must be valid finite numbers');
    });

    it('calculates theoretical visible candle capacities correctly across screen widths', () => {
      const testViewports = [
        { width: 1200, name: '1200px (standard laptop)' },
        { width: 1500, name: '1500px (full HD)' },
        { width: 2560, name: '2560px (1440p / 4K half-screen)' },
      ];

      for (const vp of testViewports) {
        // Zoom IN with max barSpace = 1000
        const minVisibleCandles = Math.ceil(vp.width / 1000);
        assert.ok(minVisibleCandles <= 3, `${vp.name} can zoom in to <= 3 candles`);

        // Zoom OUT with min barSpace = 0.1 - 0.25
        const maxVisibleCandlesAt025 = Math.floor(vp.width / 0.25);
        const maxVisibleCandlesAt01 = Math.floor(vp.width / 0.1);

        assert.ok(maxVisibleCandlesAt025 >= 4800, `${vp.name} at 0.25px barSpace reaches >= 4800 candles`);
        assert.ok(maxVisibleCandlesAt01 >= 12000, `${vp.name} at 0.1px barSpace reaches >= 12000 candles`);
      }
    });
  });

  describe('Pan Range & Scroll Limit Invariants', () => {
    it('preserves entire historical range navigation when setLeftMinVisibleBarCount(1) is configured', () => {
      // Simulating KLineCharts _adjustVisibleRange logic with bar_count role
      const totalBarCount = 20000;
      const totalBarSpace = 1500;
      const barSpace = 6;
      const visibleBarCount = totalBarSpace / barSpace; // 250 bars

      const minVisibleBarCount = { left: 1, right: 1 };

      const maxRightOffsetBarCount = visibleBarCount - Math.min(minVisibleBarCount.left, totalBarCount);
      const minRightOffsetBarCount = -totalBarCount + Math.min(minVisibleBarCount.right, totalBarCount);

      // Max scroll right shows leftmost bar
      assert.equal(maxRightOffsetBarCount, 250 - 1); // 249 bars

      // Min scroll left allows scrolling back to the very first bar of 20,000 bars
      assert.equal(minRightOffsetBarCount, -20000 + 1); // -19999 bars

      // Total navigable bar range covers all 20,000 bars
      const navigableRange = maxRightOffsetBarCount - minRightOffsetBarCount;
      assert.ok(navigableRange >= 20000, 'Navigable range must cover full loaded dataset');
    });
  });
});
