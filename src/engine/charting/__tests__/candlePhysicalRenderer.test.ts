if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    navigator: { userAgent: 'node' },
    devicePixelRatio: 1,
  };
}

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPhysicalSolidCandleBar,
  createPhysicalStrokeCandleBar,
  patchCandlePhysicalRendering,
  registerPhysicalRectFigure,
  initializeCandlePhysicalRendering,
} from '../candlePhysicalRenderer.ts';
import { drawPhysicalRect } from '../figurePhysicalRenderer.ts';

describe('Physical-Pixel Candle Rendering (candlePhysicalRenderer.ts)', () => {
  const priceY = [100, 120, 180, 200]; // Sorted: open/close/high/low pixels
  const barSpace = { bar: 10, gapBar: 8, halfGapBar: 4 };
  const colors = ['#26a69a', '#26a69a', '#474f66'];
  const correction = 1;

  describe('drawPhysicalRect', () => {
    it('applies subpixel stroke offset correction for 1-physical-pixel border', () => {
      let strokedRect: any = null;
      let strokeCalled = false;
      let lineWidthSet = 0;

      const mockCtx: any = {
        beginPath: () => {},
        closePath: () => {},
        fill: () => {},
        stroke: () => {
          strokeCalled = true;
        },
        rect: (x: number, y: number, w: number, h: number) => {
          strokedRect = { x, y, w, h };
        },
        setLineDash: () => {},
        set lineWidth(val: number) {
          lineWidthSet = val;
        },
      };

      const dpr = 1.75;
      const borderSize = 1 / dpr; // 1 physical px

      drawPhysicalRect(
        mockCtx,
        { x: 10, y: 20, width: 30, height: 40 },
        { style: 'stroke', borderColor: '#26a69a', borderSize },
        dpr
      );

      assert.equal(strokeCalled, true);
      assert.equal(lineWidthSet, borderSize);

      // Correction for odd physical px border is 0.5 * borderSize
      const expectedCorrection = 0.5 * borderSize;
      assert.ok(Math.abs(strokedRect.x - (10 + expectedCorrection)) < 1e-9);
      assert.ok(Math.abs(strokedRect.y - (20 + expectedCorrection)) < 1e-9);
      assert.ok(Math.abs(strokedRect.w - (30 - expectedCorrection * 2)) < 1e-9);
      assert.ok(Math.abs(strokedRect.h - (40 - expectedCorrection * 2)) < 1e-9);
    });
  });

  describe('createPhysicalSolidCandleBar', () => {
    it('renders disjoint upper and lower wicks (1 physical-pixel width) across multiple DPR values', () => {
      const dprs = [1, 1.25, 1.5, 1.75, 2, 2.5, 3];

      for (const dpr of dprs) {
        const figures = createPhysicalSolidCandleBar(100, priceY, barSpace, colors, correction, dpr);
        assert.ok(figures.length >= 2, `Expected at least 2 figures for solid bar at DPR=${dpr}`);

        const wickFig = figures[0];
        assert.equal(wickFig.name, 'rect');
        assert.equal(wickFig.styles.color, '#474f66');
        assert.equal(wickFig.styles.style, 'fill');
        assert.equal(Array.isArray(wickFig.attrs), true);
        assert.equal(wickFig.attrs.length, 2, 'Expected 2 disjoint wick segments (upper and lower)');

        const [upperWick, lowerWick] = wickFig.attrs;
        const pSize = 1 / dpr;

        // Upper wick: high (100) -> bodyTop (120)
        assert.equal(upperWick.width, pSize);
        assert.equal(upperWick.x, Math.floor(100 * dpr) / dpr);
        assert.equal(upperWick.y, Math.floor(100 * dpr) / dpr);
        assert.equal(upperWick.height, (Math.floor(120 * dpr) - Math.floor(100 * dpr)) / dpr);

        // Lower wick: bodyBottom (180) -> low (200)
        const expectedBodyTop = Math.floor(120 * dpr);
        const expectedBodyH = Math.max(1, Math.round((180 - 120) * dpr));
        const expectedBodyBottom = expectedBodyTop + expectedBodyH;
        assert.equal(lowerWick.width, pSize);
        assert.equal(lowerWick.x, Math.floor(100 * dpr) / dpr);
        assert.equal(lowerWick.y, expectedBodyBottom / dpr);
        assert.equal(lowerWick.height, (Math.floor(200 * dpr) - expectedBodyBottom) / dpr);
      }
    });

    it('renders only upper wick when candle has no lower shadow (low === close/open)', () => {
      const dpr = 1.75;
      const noLowerShadowPriceY = [100, 120, 180, 180]; // low = 180 = bodyBottom
      const figures = createPhysicalSolidCandleBar(100, noLowerShadowPriceY, barSpace, colors, correction, dpr);

      const wickFig = figures[0];
      assert.equal(wickFig.name, 'rect');
      // Only 1 wick segment (upper)
      assert.equal(Array.isArray(wickFig.attrs), false);
      assert.equal(wickFig.attrs.y, Math.floor(100 * dpr) / dpr);
      assert.equal(wickFig.attrs.height, (Math.floor(120 * dpr) - Math.floor(100 * dpr)) / dpr);
    });

    it('renders only lower wick when candle has no upper shadow (high === open/close)', () => {
      const dpr = 1.75;
      const noUpperShadowPriceY = [120, 120, 180, 200]; // high = 120 = bodyTop
      const figures = createPhysicalSolidCandleBar(100, noUpperShadowPriceY, barSpace, colors, correction, dpr);

      const wickFig = figures[0];
      assert.equal(wickFig.name, 'rect');
      // Only 1 wick segment (lower)
      assert.equal(Array.isArray(wickFig.attrs), false);
      const expectedBodyBottom = Math.floor(120 * dpr) + Math.round((180 - 120) * dpr);
      assert.equal(wickFig.attrs.y, expectedBodyBottom / dpr);
      assert.equal(wickFig.attrs.height, (Math.floor(200 * dpr) - expectedBodyBottom) / dpr);
    });

    it('renders zero wicks when candle has neither upper nor lower shadow (Marubozu)', () => {
      const dpr = 1.75;
      const marubozuPriceY = [120, 120, 180, 180]; // high = 120, low = 180
      const figures = createPhysicalSolidCandleBar(100, marubozuPriceY, barSpace, colors, correction, dpr);

      // Only body figure emitted, no wick figure
      assert.equal(figures.length, 1);
      assert.equal(figures[0].name, 'rect');
      assert.equal(figures[0].styles.color, '#26a69a');
    });

    it('renders Doji candle (open === close) with 1-physical-pixel body and clean wicks', () => {
      const dpr = 1.75;
      const dojiPriceY = [100, 150, 150, 200]; // open = close = 150
      const figures = createPhysicalSolidCandleBar(100, dojiPriceY, barSpace, colors, correction, dpr);

      assert.equal(figures.length, 2);
      const wickFig = figures[0];
      assert.equal(Array.isArray(wickFig.attrs), true);
      assert.equal(wickFig.attrs.length, 2);

      const bodyFig = figures[1];
      // Doji body height is exactly 1 physical px (1/DPR)
      assert.equal(bodyFig.attrs.height, 1 / dpr);
      assert.equal(bodyFig.attrs.y, Math.floor(150 * dpr) / dpr);
    });

    it('renders crisp 1-physical-pixel filled border bars when border color differs from body color', () => {
      const dprs = [1, 1.25, 1.5, 1.75, 2];
      const distinctColors = ['#26a69a', '#000000', '#474f66']; // body: green, border: black

      for (const dpr of dprs) {
        const figures = createPhysicalSolidCandleBar(100, priceY, barSpace, distinctColors, correction, dpr);
        // Wick + Interior Fill + 4 Border Bars = 3 figure objects
        assert.equal(figures.length, 3, `Expected 3 figures (wick, interior, 4-bar border) at DPR=${dpr}`);

        const interiorFig = figures[1];
        assert.equal(interiorFig.name, 'rect');
        assert.equal(interiorFig.styles.style, 'fill');
        assert.equal(interiorFig.styles.color, '#26a69a');

        const borderFig = figures[2];
        assert.equal(borderFig.name, 'rect');
        assert.equal(borderFig.styles.style, 'fill');
        assert.equal(borderFig.styles.color, '#000000');
        assert.equal(Array.isArray(borderFig.attrs), true);
        assert.equal(borderFig.attrs.length, 4, 'Expected 4 border bars (top, bottom, left, right)');

        const [topBar, bottomBar, leftBar, rightBar] = borderFig.attrs;
        const pSize = 1 / dpr;

        // Top bar thickness is exactly 1 physical px (1/DPR)
        assert.equal(topBar.height, pSize);
        // Bottom bar thickness is exactly 1 physical px (1/DPR)
        assert.equal(bottomBar.height, pSize);
        // Left bar width is exactly 1 physical px (1/DPR)
        assert.equal(leftBar.width, pSize);
        // Right bar width is exactly 1 physical px (1/DPR)
        assert.equal(rightBar.width, pSize);
      }
    });

    it('renders single filled body when border color matches body color', () => {
      const dpr = 1.75;
      const matchingColors = ['#26a69a', '#26a69a', '#474f66'];
      const figures = createPhysicalSolidCandleBar(100, priceY, barSpace, matchingColors, correction, dpr);

      assert.equal(figures.length, 2);
      const bodyFig = figures[1];
      assert.equal(bodyFig.styles.style, 'fill');
      assert.equal(bodyFig.styles.color, '#26a69a');
    });

    it('safely handles narrow candles (<= 2 physical pixels) without negative dimensions or inverted geometry', () => {
      const dpr = 1.75;
      const narrowBarSpace = { bar: 2, gapBar: 1, halfGapBar: 0.5 };
      const distinctColors = ['#26a69a', '#000000', '#474f66'];
      const figures = createPhysicalSolidCandleBar(100, priceY, narrowBarSpace, distinctColors, 0, dpr);

      assert.equal(figures.length, 2);
      const bodyFig = figures[1];
      assert.equal(bodyFig.styles.style, 'fill');
      assert.equal(bodyFig.styles.color, '#000000');
      assert.ok(bodyFig.attrs.width > 0);
      assert.ok(bodyFig.attrs.height > 0);
    });

    it('preserves KLineCharts dynamic barSpace and ~4:1 body-to-gap geometry', () => {
      const figures = createPhysicalSolidCandleBar(100, priceY, barSpace, colors, correction, 1.75);
      const bodyFig = figures[1];

      // Body X = floor((100 - 4) * 1.75) / 1.75 = floor(168) / 1.75 = 96
      assert.equal(bodyFig.attrs.x, 96);
      // Body Width = round((8 + 1) * 1.75) / 1.75 = round(15.75) / 1.75 = 16 / 1.75
      assert.equal(bodyFig.attrs.width, 16 / 1.75);
      // Body Height = round((180 - 120) * 1.75) / 1.75 = round(105) / 1.75 = 60
      assert.equal(bodyFig.attrs.height, 60);
      assert.equal(bodyFig.attrs.y, 120);
    });
  });

  describe('createPhysicalStrokeCandleBar', () => {
    it('renders 1 physical-pixel top and bottom wicks and hollow body border bars', () => {
      const dpr = 1.75;
      const figures = createPhysicalStrokeCandleBar(100, priceY, barSpace, colors, correction, dpr);

      assert.equal(figures.length, 2);

      const wickFig = figures[0];
      assert.equal(wickFig.name, 'rect');
      assert.equal(Array.isArray(wickFig.attrs), true);
      assert.equal(wickFig.attrs.length, 2);

      // Top wick
      assert.equal(wickFig.attrs[0].width, 1 / dpr);
      assert.equal(wickFig.attrs[0].y, Math.floor(100 * dpr) / dpr);
      assert.equal(wickFig.attrs[0].height, (Math.floor(120 * dpr) - Math.floor(100 * dpr)) / dpr);

      // Bottom wick
      assert.equal(wickFig.attrs[1].width, 1 / dpr);
      assert.equal(wickFig.attrs[1].y, Math.floor(180 * dpr) / dpr);
      assert.equal(wickFig.attrs[1].height, (Math.floor(200 * dpr) - Math.floor(180 * dpr)) / dpr);

      // Hollow body border
      const bodyFig = figures[1];
      assert.equal(bodyFig.styles.style, 'fill');
      assert.equal(Array.isArray(bodyFig.attrs), true);
      assert.equal(bodyFig.attrs.length, 4);
    });
  });

  describe('patchCandlePhysicalRendering & initialization', () => {
    it('safely patches chart CandleBarView prototype idempotently', () => {
      const mockProto: any = {};
      const mockWidget = { _candleBarView: Object.create(mockProto) };
      const mockChart = {
        _candlePane: {
          getMainWidget: () => mockWidget,
        },
      };

      patchCandlePhysicalRendering(mockChart);
      assert.equal(mockProto._isPhysicalPixelPatched, true);
      assert.equal(typeof mockProto._createSolidBar, 'function');
      assert.equal(typeof mockProto._createStrokeBar, 'function');

      // Second call should be a no-op
      patchCandlePhysicalRendering(mockChart);
      assert.equal(mockProto._isPhysicalPixelPatched, true);
    });

    it('handles null or invalid chart instances gracefully without throwing', () => {
      assert.doesNotThrow(() => {
        patchCandlePhysicalRendering(null);
        patchCandlePhysicalRendering({});
        patchCandlePhysicalRendering({ _candlePane: null });
        initializeCandlePhysicalRendering(undefined);
      });
    });
  });
});
