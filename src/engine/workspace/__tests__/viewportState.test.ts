import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAxisRange,
  captureChartViewport,
  restoreChartViewport,
  type ViewportScaleState,
} from '../viewportState.ts';

describe('Vertical Viewport & Price-Axis State Model', () => {
  describe('applyAxisRange', () => {
    it('sets all required KLineCharts AxisRange properties with finite numbers', () => {
      let appliedRange: any = null;
      const mockYAxis = {
        setRange: (r: any) => {
          appliedRange = r;
        },
      };

      applyAxisRange(mockYAxis, 1.1500, 1.1600);

      assert.ok(appliedRange !== null);
      assert.equal(appliedRange.from, 1.1500);
      assert.equal(appliedRange.to, 1.1600);
      assert.ok(Math.abs(appliedRange.range - 0.0100) < 1e-6);
      assert.equal(appliedRange.realFrom, 1.1500);
      assert.equal(appliedRange.realTo, 1.1600);
      assert.ok(Math.abs(appliedRange.realRange - 0.0100) < 1e-6);
      assert.equal(appliedRange.displayFrom, 1.1500);
      assert.equal(appliedRange.displayTo, 1.1600);
      assert.ok(Math.abs(appliedRange.displayRange - 0.0100) < 1e-6);
      assert.ok(!isNaN(appliedRange.displayRange));
    });

    it('gracefully ignores invalid inputs (NaN, inverted range, null axis)', () => {
      let called = false;
      const mockYAxis = {
        setRange: () => {
          called = true;
        },
      };

      applyAxisRange(mockYAxis, NaN, 1.1600);
      assert.equal(called, false);

      applyAxisRange(mockYAxis, 1.1600, 1.1500); // inverted
      assert.equal(called, false);

      applyAxisRange(null, 1.1500, 1.1600);
      assert.equal(called, false);
    });
  });

  describe('captureChartViewport', () => {
    it('captures minimal vertical state for auto-scaled chart in local pane coordinates', () => {
      const paneHeight = 500;
      const anchorCandleClose = 1.1550;
      const anchorPixelY = 250; // exact center of pane (250 / 500 = 0.5)

      const mockYAxis = {
        getAutoCalcTickFlag: () => true, // auto-scale
        getRange: () => ({ from: 1.1500, to: 1.1600 }),
        getBounding: () => ({ height: paneHeight }),
        convertToPixel: (val: number) => (val === anchorCandleClose ? anchorPixelY : 0),
        convertFromPixel: (py: number) => 1.1500 + (1 - py / paneHeight) * 0.01,
      };

      const mockChart = {
        getBarSpace: () => 8,
        getOffsetRightDistance: () => 100,
        getSize: () => ({ width: 800, height: 600 }),
        getVisibleRange: () => ({ from: 10, to: 30 }),
        getDataList: () => {
          const list = [];
          for (let i = 0; i < 50; i++) {
            list.push({ timestamp: 1000 + i * 60, close: i === 20 ? anchorCandleClose : 1.1540 });
          }
          return list;
        },
        getDrawPaneById: () => ({
          getYAxisComponents: () => [mockYAxis],
          getXAxisComponent: () => ({
            convertToPixel: () => 400,
          }),
        }),
      };

      const state = captureChartViewport(mockChart);

      assert.equal(state.wasManualScale, false);
      assert.equal(state.manualRange, null);
      assert.equal(state.anchorPrice, anchorCandleClose);
      assert.equal(state.anchorRatio, 0.5); // 250 / 500
      assert.ok(Math.abs((state.priceSpan || 0) - 0.0100) < 1e-6);
    });

    it('captures manualRange when chart is in manual scale mode', () => {
      const mockYAxis = {
        getAutoCalcTickFlag: () => false, // manual scale
        getRange: () => ({ from: 1.1400, to: 1.1700 }),
        getBounding: () => ({ height: 400 }),
        convertToPixel: () => 200,
      };

      const mockChart = {
        getBarSpace: () => 6,
        getOffsetRightDistance: () => 50,
        getSize: () => ({ width: 800, height: 600 }),
        getVisibleRange: () => ({ from: 0, to: 10 }),
        getDataList: () => [{ timestamp: 1000, close: 1.1550 }],
        getDrawPaneById: () => ({
          getYAxisComponents: () => [mockYAxis],
        }),
      };

      const state = captureChartViewport(mockChart);

      assert.equal(state.wasManualScale, true);
      assert.deepEqual(state.manualRange, { from: 1.1400, to: 1.1700 });
      assert.ok(Math.abs((state.priceSpan || 0) - 0.0300) < 1e-6);
    });
  });

  describe('restoreChartViewport', () => {
    it('restores manualRange and keeps manual mode when wasManualScale is true', () => {
      let appliedRange: any = null;
      let autoCalcFlag: boolean | null = null;
      let layoutCalled = false;

      const mockYAxis = {
        setRange: (r: any) => {
          appliedRange = r;
        },
        setAutoCalcTickFlag: (f: boolean) => {
          autoCalcFlag = f;
        },
      };

      const mockChart = {
        getBarSpace: () => 6,
        setBarSpace: () => {},
        getOffsetRightDistance: () => 100,
        setOffsetRightDistance: () => {},
        scrollToDataIndex: () => {},
        getDataList: () => [{ timestamp: 1000, close: 1.1500 }],
        getSize: () => ({ width: 800, height: 600 }),
        getDrawPaneById: () => ({
          getYAxisComponents: () => [mockYAxis],
        }),
        layout: () => {
          layoutCalled = true;
        },
      };

      const state: ViewportScaleState = {
        offset: 100,
        wasManualScale: true,
        yAxisRange: { from: 1.1400, to: 1.1700 },
        manualRange: { from: 1.1400, to: 1.1700 },
        priceSpan: 0.0300,
      };

      restoreChartViewport(mockChart, state, 0, false, 0.5, false);

      assert.ok(appliedRange !== null);
      assert.equal(appliedRange.from, 1.1400);
      assert.equal(appliedRange.to, 1.1700);
      assert.equal(autoCalcFlag, false);
      assert.equal(layoutCalled, true);
    });

    it('temporarily overrides auto-scaling during timeframe replacement and re-engages auto-scale on user scroll', () => {
      let appliedRange: any = null;
      let autoCalcFlag: boolean = false;
      const subscribedActions: Record<string, () => void> = {};

      const mockYAxis = {
        setRange: (r: any) => {
          appliedRange = r;
        },
        setAutoCalcTickFlag: (f: boolean) => {
          autoCalcFlag = f;
        },
        getAutoCalcTickFlag: () => autoCalcFlag,
      };

      const mockChart = {
        getBarSpace: () => 6,
        setBarSpace: () => {},
        getOffsetRightDistance: () => 100,
        setOffsetRightDistance: () => {},
        scrollToDataIndex: () => {},
        getDataList: () => [{ timestamp: 1000, close: 1.1550 }],
        getSize: () => ({ width: 800, height: 600 }),
        getDrawPaneById: () => ({
          getYAxisComponents: () => [mockYAxis],
        }),
        layout: () => {},
        subscribeAction: (action: string, cb: () => void) => {
          subscribedActions[action] = cb;
        },
        unsubscribeAction: (action: string) => {
          delete subscribedActions[action];
        },
      };

      const state: ViewportScaleState = {
        offset: 100,
        wasManualScale: false,
        yAxisRange: null,
        manualRange: null,
        anchorPrice: 1.1550,
        anchorRatio: 0.5, // vertical center
        priceSpan: 0.0100, // span of 100 pips
      };

      restoreChartViewport(mockChart, state, 0, false, 0.5, false);

      // 1. Check that price action was anchored to the center (targetFrom = 1.1500, targetTo = 1.1600)
      assert.ok(appliedRange !== null);
      assert.ok(Math.abs(appliedRange.from - 1.1500) < 1e-6);
      assert.ok(Math.abs(appliedRange.to - 1.1600) < 1e-6);
      assert.ok(Math.abs(appliedRange.range - 0.0100) < 1e-6);

      // 2. Check that onScroll and onZoom listeners were registered
      assert.ok(typeof subscribedActions['onScroll'] === 'function');
      assert.ok(typeof subscribedActions['onZoom'] === 'function');

      // 3. Simulate user scroll interaction
      subscribedActions['onScroll']();

      // 4. Auto-scale must re-engage (autoCalcFlag becomes true) and listeners unsubscribe
      assert.equal(autoCalcFlag, true);
      assert.equal(subscribedActions['onScroll'], undefined);
      assert.equal(subscribedActions['onZoom'], undefined);
    });
  });
});
