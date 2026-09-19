import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LongPositionTool, ShortPositionTool } from '../../tools/implementations/ForecastingTools.ts';
import { drawGrabHandles } from '../../tools/toolUtils.ts';
import { replayVisibilityBoundary } from '../../../../src/engine/replay/ReplayVisibilityBoundary.ts';

describe('ForecastingTools - Risk/Reward Multi-Chart Synchronization', () => {
  const createMockYAxis = () => ({
    convertFromPixel: (y: number) => 1.1000 - (y - 100) * 0.0001,
    convertToPixel: (val: number) => 100 + (1.1000 - val) / 0.0001,
    isFromZero: () => false,
  });

  // Mock 1M data: 60 bars (1 bar per minute from 10:00 to 11:00)
  const baseTs = 1700000000000;
  const data1M: any[] = [];
  for (let i = 0; i < 60; i++) {
    const ts = baseTs + i * 60 * 1000;
    // Price moves down from 1.1020 to 1.0980, touches entry 1.1000 at i = 10 (10:10), touches TP 1.1050 at i = 25
    let close = 1.1020;
    let high = 1.1025;
    let low = 1.1015;
    if (i >= 10 && i < 20) {
      low = 1.0995;
      high = 1.1005;
      close = 1.1000;
    } else if (i >= 20) {
      low = 1.1010;
      high = 1.1055;
      close = 1.1050;
    }
    data1M.push({ timestamp: ts, open: close, high, low, close });
  }

  // Mock 5M data: 12 bars (1 bar per 5 minutes from 10:00 to 11:00)
  const data5M: any[] = [];
  for (let i = 0; i < 12; i++) {
    const ts = baseTs + i * 5 * 60 * 1000;
    let low = 1.1015;
    let high = 1.1025;
    let close = 1.1020;
    if (i === 2 || i === 3) { // 10:10 - 10:20 (contains 1M bars 10-19)
      low = 1.0995;
      high = 1.1005;
      close = 1.1000;
    } else if (i >= 4) { // 10:20+
      low = 1.1010;
      high = 1.1055;
      close = 1.1050;
    }
    data5M.push({ timestamp: ts, open: close, high, low, close });
  }

  const createMockChart = (dataList: any[], width: number = 800) => ({
    getDataList: () => dataList,
    getSize: () => ({ width, height: 600 }),
    getBarSpace: () => 10,
    convertToPixel: (points: any[]) => {
      return points.map((p) => {
        let x = 100;
        if (p.timestamp !== undefined) {
          const idx = dataList.findIndex((d) => d.timestamp === p.timestamp);
          x = (idx >= 0 ? idx : (p.dataIndex ?? 0)) * 10;
        } else if (p.dataIndex !== undefined) {
          x = p.dataIndex * 10;
        }
        const y = 100 + (1.1000 - (p.value ?? 1.1000)) / 0.0001;
        return { x, y };
      });
    },
    convertFromPixel: (pixels: any[]) => {
      return pixels.map((px) => ({
        timestamp: baseTs,
        dataIndex: Math.floor(px.x / 10),
        value: 1.1000 - (px.y - 100) * 0.0001,
      }));
    },
    _loadedTimeframe: dataList === data1M ? '1m' : '5m',
  });

  it('LongPosition overlay definition creates active trade figures across 1M and 5M follower charts', () => {
    const overlayDef = LongPositionTool.createOverlayDef?.();
    assert.ok(overlayDef);

    // RR points created on Chart 1 (1M) at 10:05 (i = 5, timestamp baseTs + 5*60*1000)
    const entryTs = baseTs + 5 * 60 * 1000;
    const endTs = baseTs + 35 * 60 * 1000;
    const entryPrice = 1.1000;
    const tpPrice = 1.1050;
    const slPrice = 1.0950;

    // Overlay points carry Chart 1's 1M dataIndex (5 and 35)
    const overlayPoints = [
      { timestamp: entryTs, value: tpPrice, dataIndex: 5 },    // 0: TP left
      { timestamp: endTs, value: tpPrice, dataIndex: 35 },     // 1: TP right
      { timestamp: endTs, value: slPrice, dataIndex: 35 },     // 2: SL right
      { timestamp: entryTs, value: slPrice, dataIndex: 5 },    // 3: SL left
      { timestamp: entryTs, value: entryPrice, dataIndex: 5 }, // 4: Entry left
      { timestamp: endTs, value: entryPrice, dataIndex: 35 }   // 5: Entry right
    ];

    const overlay = {
      id: 'test_rr_1',
      name: 'longPosition',
      points: overlayPoints,
      extendData: { customSettings: { showMarkers: true, showActivationLine: true, showActivationHighlight: true } },
    };

    const chart1M = createMockChart(data1M);
    const chart5M = createMockChart(data5M); // 5M data has length 12 (dataIndex 35 is way out of bounds!)
    const yAxis = createMockYAxis();

    // 1. Replay before activation (at 10:02 = baseTs + 2*60*1000)
    replayVisibilityBoundary.setReplayState(true, baseTs + 2 * 60 * 1000);

    const figures1M_before = overlayDef.createPointFigures({ chart: chart1M, overlay, yAxis });
    const figures5M_before = overlayDef.createPointFigures({ chart: chart5M, overlay, yAxis });

    // No circle markers should exist before activation
    const circleMarkers1M_before = figures1M_before.filter((f: any) => f.type === 'circle');
    const circleMarkers5M_before = figures5M_before.filter((f: any) => f.type === 'circle');
    assert.equal(circleMarkers1M_before.length, 0);
    assert.equal(circleMarkers5M_before.length, 0);

    // 2. Replay reaches activation at 10:15 (baseTs + 15*60*1000) -> in progress
    replayVisibilityBoundary.setReplayState(true, baseTs + 15 * 60 * 1000);

    const figures1M_active = overlayDef.createPointFigures({ chart: chart1M, overlay, yAxis });
    const figures5M_active = overlayDef.createPointFigures({ chart: chart5M, overlay, yAxis });

    // Both Chart 1 (1M) and Chart 2 (5M) must produce circle markers & activation lines
    const circles1M_active = figures1M_active.filter((f: any) => f.type === 'circle');
    const circles5M_active = figures5M_active.filter((f: any) => f.type === 'circle');

    assert.ok(circles1M_active.length >= 2, 'Chart 1 must show activation and exit/progress markers');
    assert.ok(circles5M_active.length >= 2, 'Chart 2 (5M follower) must show activation and exit/progress markers');

    // 3. Replay reaches TP at 10:30 (baseTs + 30*60*1000) -> trade exited
    replayVisibilityBoundary.setReplayState(true, baseTs + 30 * 60 * 1000);

    const figures1M_exited = overlayDef.createPointFigures({ chart: chart1M, overlay, yAxis });
    const figures5M_exited = overlayDef.createPointFigures({ chart: chart5M, overlay, yAxis });

    const circles1M_exited = figures1M_exited.filter((f: any) => f.type === 'circle');
    const circles5M_exited = figures5M_exited.filter((f: any) => f.type === 'circle');

    assert.ok(circles1M_exited.length >= 2, 'Chart 1 must show activation and exit markers on TP');
    assert.ok(circles5M_exited.length >= 2, 'Chart 2 (5M follower) must show activation and exit markers on TP');

    // Clean up replay boundary state
    replayVisibilityBoundary.reset();
  });

  it('ShortPosition overlay definition creates active trade figures across 1M and 5M follower charts', () => {
    const overlayDef = ShortPositionTool.createOverlayDef?.();
    assert.ok(overlayDef);

    const entryTs = baseTs + 5 * 60 * 1000;
    const endTs = baseTs + 35 * 60 * 1000;
    const entryPrice = 1.1020;
    const tpPrice = 1.0980;
    const slPrice = 1.1060;

    const overlayPoints = [
      { timestamp: entryTs, value: tpPrice, dataIndex: 5 },
      { timestamp: endTs, value: tpPrice, dataIndex: 35 },
      { timestamp: endTs, value: slPrice, dataIndex: 35 },
      { timestamp: entryTs, value: slPrice, dataIndex: 5 },
      { timestamp: entryTs, value: entryPrice, dataIndex: 5 },
      { timestamp: endTs, value: entryPrice, dataIndex: 35 }
    ];

    const overlay = {
      id: 'test_rr_short',
      name: 'shortPosition',
      points: overlayPoints,
      extendData: { customSettings: { showMarkers: true, showActivationLine: true, showActivationHighlight: true } },
    };

    const chart1M = createMockChart(data1M);
    const chart5M = createMockChart(data5M);
    const yAxis = createMockYAxis();

    // Replay at 10:15
    replayVisibilityBoundary.setReplayState(true, baseTs + 15 * 60 * 1000);

    const figures1M = overlayDef.createPointFigures({ chart: chart1M, overlay, yAxis });
    const figures5M = overlayDef.createPointFigures({ chart: chart5M, overlay, yAxis });

    const circles1M = figures1M.filter((f: any) => f.type === 'circle');
    const circles5M = figures5M.filter((f: any) => f.type === 'circle');

    assert.ok(circles1M.length >= 2, 'Short position on Chart 1 must show activation and exit markers');
    assert.ok(circles5M.length >= 2, 'Short position on Chart 2 (5M follower) must show activation and exit markers');

    replayVisibilityBoundary.reset();
  });

  describe('RR / Price-Axis Label Interaction & Hit Target Exclusivity', () => {
    it('guarantees Entry, SL, and TP YAxis figures all have ignoreEvent: true', () => {
      const overlayDef = LongPositionTool.createOverlayDef?.();
      assert.ok(overlayDef);

      const overlay = {
        id: 'rr_long_1',
        name: 'longPosition',
        points: [
          { timestamp: baseTs, value: 1.1050 }, // TP
          { timestamp: baseTs + 1000, value: 1.1050 },
          { timestamp: baseTs + 1000, value: 1.0950 }, // SL
          { timestamp: baseTs, value: 1.0950 },
          { timestamp: baseTs, value: 1.1000 }, // Entry
          { timestamp: baseTs + 1000, value: 1.1000 },
        ],
        extendData: {},
      };

      const chart1M = createMockChart(data1M);
      const yAxis = createMockYAxis();
      const bounding = { width: 60, height: 600 };

      const yFigures = overlayDef.createYAxisFigures({ chart: chart1M, overlay, yAxis, bounding });
      assert.equal(yFigures.length, 6, 'Must produce 6 figures (3 rects, 3 text tags for TP, SL, Entry)');

      // Verify EVERY figure has ignoreEvent: true
      yFigures.forEach((fig: any, idx: number) => {
        assert.equal(fig.ignoreEvent, true, `Figure ${idx} (${fig.type}) must have ignoreEvent: true`);
      });
    });

    it('guarantees ShortPosition Entry, SL, and TP YAxis figures all have ignoreEvent: true', () => {
      const overlayDef = ShortPositionTool.createOverlayDef?.();
      assert.ok(overlayDef);

      const overlay = {
        id: 'rr_short_1',
        name: 'shortPosition',
        points: [
          { timestamp: baseTs, value: 1.0950 }, // TP
          { timestamp: baseTs + 1000, value: 1.0950 },
          { timestamp: baseTs + 1000, value: 1.1050 }, // SL
          { timestamp: baseTs, value: 1.1050 },
          { timestamp: baseTs, value: 1.1000 }, // Entry
          { timestamp: baseTs + 1000, value: 1.1000 },
        ],
        extendData: {},
      };

      const chart1M = createMockChart(data1M);
      const yAxis = createMockYAxis();
      const bounding = { width: 60, height: 600 };

      const yFigures = overlayDef.createYAxisFigures({ chart: chart1M, overlay, yAxis, bounding });
      assert.equal(yFigures.length, 6);

      yFigures.forEach((fig: any, idx: number) => {
        assert.equal(fig.ignoreEvent, true, `Short figure ${idx} must have ignoreEvent: true`);
      });
    });

    it('locks out overlay dragging when pointer event originates from yAxisFigures or xAxisFigures', async () => {
      const { isOverlayDragAllowed } = await import('../gestureAuthority.ts');

      const chart = {
        _activeTool: null,
        _activeDrawingId: null,
        _isMarqueeSelecting: false,
      };

      const userOverlay = { id: 'rr_long_1', name: 'longPosition' };

      // 1. Pointer over RR price axis label (figureKey: 'yAxisFigures') -> Drag disallowed (allows price axis pan)
      const yAxisEvent = { chart, overlay: userOverlay, figureKey: 'yAxisFigures' };
      assert.equal(isOverlayDragAllowed(chart, yAxisEvent, userOverlay), false);

      // 2. Pointer over time axis label (figureKey: 'xAxisFigures') -> Drag disallowed
      const xAxisEvent = { chart, overlay: userOverlay, figureKey: 'xAxisFigures' };
      assert.equal(isOverlayDragAllowed(chart, xAxisEvent, userOverlay), false);

      // 3. Pointer over RR drawing body (figureKey: 'pointFigures' or undefined) -> Drag allowed!
      const bodyEvent = { chart, overlay: userOverlay, figureKey: 'pointFigures' };
      assert.equal(isOverlayDragAllowed(chart, bodyEvent, userOverlay), true);
    });

    it('guarantees RR overlay points do not mutate when dragging over price-axis label', async () => {
      const { isOverlayDragAllowed } = await import('../gestureAuthority.ts');

      const initialPoints = [
        { timestamp: baseTs, value: 1.1050 },
        { timestamp: baseTs + 1000, value: 1.1050 },
        { timestamp: baseTs + 1000, value: 1.0950 },
        { timestamp: baseTs, value: 1.0950 },
        { timestamp: baseTs, value: 1.1000 },
        { timestamp: baseTs + 1000, value: 1.1000 },
      ];

      const overlay = {
        id: 'rr_long_1',
        name: 'longPosition',
        points: JSON.parse(JSON.stringify(initialPoints)),
        extendData: {},
      };

      const chartInstance: any = {
        _activeTool: null,
        _activeDrawingId: null,
        _isMarqueeSelecting: false,
        overrideOverlay: (opts: any) => {
          if (opts.points) overlay.points = opts.points;
        },
      };

      const simulateDragOverPriceLabel = (event: any) => {
        if (!isOverlayDragAllowed(event.chart, event, event.overlay)) {
          return; // Blocked: price axis pans instead of moving drawing
        }
        event.chart.overrideOverlay({
          id: event.overlay.id,
          points: [{ timestamp: 9999, value: 9999 }],
        });
      };

      // Pointer down on price-axis label
      simulateDragOverPriceLabel({
        chart: chartInstance,
        overlay,
        figureKey: 'yAxisFigures',
      });

      // Coordinates remain strictly unchanged
      assert.deepEqual(overlay.points, initialPoints);
    });
  });

  describe('RR Activation Logic — Same-Candle Entry + SL Ordering', () => {
    const entryPrice = 1.1000;
    const tpPriceLong = 1.1050;
    const slPriceLong = 1.0950;
    const tpPriceShort = 1.0950;
    const slPriceShort = 1.1050;

    const createLongOverlay = (startTs: number, endTs: number) => ({
      id: 'rr_long_act_test',
      name: 'longPosition',
      points: [
        { timestamp: startTs, value: tpPriceLong },
        { timestamp: endTs, value: tpPriceLong },
        { timestamp: endTs, value: slPriceLong },
        { timestamp: startTs, value: slPriceLong },
        { timestamp: startTs, value: entryPrice },
        { timestamp: endTs, value: entryPrice },
      ],
      extendData: { customSettings: { showMarkers: true, showActivationLine: true, showActivationHighlight: true } },
    });

    const createShortOverlay = (startTs: number, endTs: number) => ({
      id: 'rr_short_act_test',
      name: 'shortPosition',
      points: [
        { timestamp: startTs, value: tpPriceShort },
        { timestamp: endTs, value: tpPriceShort },
        { timestamp: endTs, value: slPriceShort },
        { timestamp: startTs, value: slPriceShort },
        { timestamp: startTs, value: entryPrice },
        { timestamp: endTs, value: entryPrice },
      ],
      extendData: { customSettings: { showMarkers: true, showActivationLine: true, showActivationHighlight: true } },
    });

    it('1. Bullish RR + Bullish activation candle touching Entry + SL -> Activates trade, does NOT hit SL', () => {
      const overlayDef = LongPositionTool.createOverlayDef?.();
      const t0 = baseTs;
      const t1 = baseTs + 60000;
      const t2 = baseTs + 120000;

      // Candle 0: Before trade (no touch)
      // Candle 1: Bullish activation candle touching Entry (1.1000) and SL (1.0950), closing at 1.1010 (open=1.0960, low=1.0940, high=1.1015, close=1.1010)
      // Candle 2: Bullish follow-through (1.1010 -> 1.1030)
      const candles = [
        { timestamp: t0, open: 1.0980, high: 1.0990, low: 1.0970, close: 1.0980 },
        { timestamp: t1, open: 1.0960, high: 1.1015, low: 1.0940, close: 1.1010 }, // Bullish: close > open, touches Entry + SL
        { timestamp: t2, open: 1.1010, high: 1.1030, low: 1.1005, close: 1.1025 },
      ];

      const overlay = createLongOverlay(t0, t2);
      const chart = createMockChart(candles);
      const yAxis = createMockYAxis();

      const figures = overlayDef.createPointFigures({ chart, overlay, yAxis });
      const yStopPixel = yAxis.convertToPixel(slPriceLong);
      const slExitCircles = figures.filter((f: any) => f.type === 'circle' && Math.abs(f.attrs?.y - yStopPixel) < 1e-4);

      // Must NOT exit at SL on activation candle
      assert.equal(slExitCircles.length, 0, 'SL exit circle must not be rendered when bullish activation candle touches SL before entry');
    });

    it('2. Bullish RR + Bearish activation candle touching Entry + SL -> Activates trade, DOES hit SL', () => {
      const overlayDef = LongPositionTool.createOverlayDef?.();
      const t0 = baseTs;
      const t1 = baseTs + 60000;
      const t2 = baseTs + 120000;

      // Candle 1: Bearish activation candle (open=1.0990, high=1.1010, low=1.0940, close=1.0945)
      // Hits Entry first (1.1010 >= 1.1000), then drops to SL (1.0940 <= 1.0950), closing bearish
      const candles = [
        { timestamp: t0, open: 1.0980, high: 1.0990, low: 1.0970, close: 1.0980 },
        { timestamp: t1, open: 1.0990, high: 1.1010, low: 1.0940, close: 1.0945 }, // Bearish: close < open
        { timestamp: t2, open: 1.0945, high: 1.0960, low: 1.0930, close: 1.0950 },
      ];

      const overlay = createLongOverlay(t0, t2);
      const chart = createMockChart(candles);
      const yAxis = createMockYAxis();

      const figures = overlayDef.createPointFigures({ chart, overlay, yAxis });
      const yStopPixel = yAxis.convertToPixel(slPriceLong);
      const slExitCircles = figures.filter((f: any) => f.type === 'circle' && Math.abs(f.attrs?.y - yStopPixel) < 1e-4);

      assert.equal(slExitCircles.length, 1, 'SL exit circle must be rendered at stop price level when bearish activation candle hits SL after entry');
    });

    it('3. Bearish RR + Bearish activation candle touching Entry + SL -> Activates trade, does NOT hit SL', () => {
      const overlayDef = ShortPositionTool.createOverlayDef?.();
      const t0 = baseTs;
      const t1 = baseTs + 60000;
      const t2 = baseTs + 120000;

      // Short: Entry = 1.1000, SL = 1.1050, TP = 1.0950
      // Candle 1: Bearish activation candle (open=1.1040, high=1.1060, low=1.0990, close=1.0995)
      // Opens high, wicks up to SL (1.1060), then plunges down through Entry (1.0990), closing low (1.0995)
      const candles = [
        { timestamp: t0, open: 1.1020, high: 1.1030, low: 1.1010, close: 1.1020 },
        { timestamp: t1, open: 1.1040, high: 1.1060, low: 1.0990, close: 1.0995 }, // Bearish: close < open
        { timestamp: t2, open: 1.0995, high: 1.1000, low: 1.0970, close: 1.0980 },
      ];

      const overlay = createShortOverlay(t0, t2);
      const chart = createMockChart(candles);
      const yAxis = createMockYAxis();

      const figures = overlayDef.createPointFigures({ chart, overlay, yAxis });
      const yStopPixel = yAxis.convertToPixel(slPriceShort);
      const slExitCircles = figures.filter((f: any) => f.type === 'circle' && Math.abs(f.attrs?.y - yStopPixel) < 1e-4);

      assert.equal(slExitCircles.length, 0, 'SL exit circle must not be rendered when bearish activation candle touches SL before entry');
    });

    it('4. Bearish RR + Bullish activation candle touching Entry + SL -> Activates trade, DOES hit SL', () => {
      const overlayDef = ShortPositionTool.createOverlayDef?.();
      const t0 = baseTs;
      const t1 = baseTs + 60000;
      const t2 = baseTs + 120000;

      // Candle 1: Bullish activation candle (open=1.1010, low=1.0990, high=1.1060, close=1.1055)
      // Hits Entry first (1.0990 <= 1.1000), then rallies to SL (1.1060 >= 1.1050), closing bullish
      const candles = [
        { timestamp: t0, open: 1.1020, high: 1.1030, low: 1.1010, close: 1.1020 },
        { timestamp: t1, open: 1.1010, high: 1.1060, low: 1.0990, close: 1.1055 }, // Bullish: close > open
        { timestamp: t2, open: 1.1055, high: 1.1070, low: 1.1040, close: 1.1060 },
      ];

      const overlay = createShortOverlay(t0, t2);
      const chart = createMockChart(candles);
      const yAxis = createMockYAxis();

      const figures = overlayDef.createPointFigures({ chart, overlay, yAxis });
      const yStopPixel = yAxis.convertToPixel(slPriceShort);
      const slExitCircles = figures.filter((f: any) => f.type === 'circle' && Math.abs(f.attrs?.y - yStopPixel) < 1e-4);

      assert.equal(slExitCircles.length, 1, 'SL exit circle must be rendered at stop price level when bullish activation candle hits SL after entry');
    });

    it('5. SL hit on a later candle still exits normally', () => {
      const overlayDef = LongPositionTool.createOverlayDef?.();
      const t0 = baseTs;
      const t1 = baseTs + 60000;
      const t2 = baseTs + 120000;

      // Candle 1: Bullish activation candle (touches Entry + SL, ignored on candle 1)
      // Candle 2: Later candle drops down and hits SL (low=1.0940 <= 1.0950)
      const candles = [
        { timestamp: t0, open: 1.0980, high: 1.0990, low: 1.0970, close: 1.0980 },
        { timestamp: t1, open: 1.0960, high: 1.1015, low: 1.0940, close: 1.1010 }, // Activation candle (ignored SL)
        { timestamp: t2, open: 1.1010, high: 1.1015, low: 1.0940, close: 1.0945 }, // Later candle hits SL!
      ];

      const overlay = createLongOverlay(t0, t2);
      const chart = createMockChart(candles);
      const yAxis = createMockYAxis();

      const figures = overlayDef.createPointFigures({ chart, overlay, yAxis });
      const yStopPixel = yAxis.convertToPixel(slPriceLong);
      const slExitCircles = figures.filter((f: any) => f.type === 'circle' && Math.abs(f.attrs?.y - yStopPixel) < 1e-4);

      assert.equal(slExitCircles.length, 1, 'Later candle hitting SL must register as SL exit');
    });

    it('6. TP hit on activation candle remains unchanged', () => {
      const overlayDef = LongPositionTool.createOverlayDef?.();
      const t0 = baseTs;
      const t1 = baseTs + 60000;

      // Candle 1: Touches Entry (1.1000) and TP (1.1055 >= 1.1050)
      const candles = [
        { timestamp: t0, open: 1.0980, high: 1.0990, low: 1.0970, close: 1.0980 },
        { timestamp: t1, open: 1.0990, high: 1.1060, low: 1.0990, close: 1.1055 },
      ];

      const overlay = createLongOverlay(t0, t1);
      const chart = createMockChart(candles);
      const yAxis = createMockYAxis();

      const figures = overlayDef.createPointFigures({ chart, overlay, yAxis });
      const yTpPixel = yAxis.convertToPixel(tpPriceLong);
      const tpExitCircles = figures.filter((f: any) => f.type === 'circle' && Math.abs(f.attrs?.y - yTpPixel) < 1e-4);

      assert.equal(tpExitCircles.length, 1, 'TP hit on activation candle must be registered');
    });
  });

  describe('RR Box — Corner Anchor Movement Constraints', () => {
    const t0 = baseTs + 10 * 60 * 1000;
    const t1 = baseTs + 30 * 60 * 1000;
    const initialPoints = [
      { timestamp: t0, value: 1.1050, dataIndex: 10 }, // 0: Anchor 1 (TP Left)
      { timestamp: t1, value: 1.1050, dataIndex: 30 }, // 1: Anchor 2 (TP Right)
      { timestamp: t1, value: 1.0950, dataIndex: 30 }, // 2: Anchor 6 (SL Right)
      { timestamp: t0, value: 1.0950, dataIndex: 10 }, // 3: Anchor 5 (SL Left)
      { timestamp: t0, value: 1.1000, dataIndex: 10 }, // 4: Anchor 3 (Entry Left)
      { timestamp: t1, value: 1.1000, dataIndex: 30 }, // 5: Anchor 4 (Entry Right)
    ];

    const createDragChart = (targetPt: { timestamp: number; dataIndex: number; value: number }) => ({
      getDataList: () => data1M,
      _loadedTimeframe: '1m',
      convertFromPixel: () => [targetPt],
      convertToPixel: () => [{ x: 100, y: 100 }],
    });

    it('Anchor 1 (TP Left, index 0) -> VERTICAL ONLY (Y changes, X remains locked)', () => {
      const overlay = {
        id: 'rr_test',
        name: 'longPosition',
        points: initialPoints,
        extendData: { startPoints: initialPoints }
      };
      const tDrag = baseTs + 5 * 60 * 1000; // tried to drag X to index 5
      const chart = createDragChart({ timestamp: tDrag, dataIndex: 5, value: 1.1080 });
      const event = { chart, overlay, x: 50, y: 50 };

      const result: any = LongPositionTool.onPressedMoving?.(event, 0);
      assert.ok(result && result.points, 'Should return updated points');

      // Y updated to 1.1080 for TP
      assert.equal(result.points[0].value, 1.1080);
      assert.equal(result.points[1].value, 1.1080);

      // X remained locked to t0 / index 10 on left, t1 / index 30 on right
      assert.equal(result.points[0].timestamp, t0);
      assert.equal(result.points[0].dataIndex, 10);
      assert.equal(result.points[3].timestamp, t0);
      assert.equal(result.points[3].dataIndex, 10);
      assert.equal(result.points[4].timestamp, t0);
      assert.equal(result.points[4].dataIndex, 10);
      assert.equal(result.points[1].timestamp, t1);
      assert.equal(result.points[1].dataIndex, 30);
    });

    it('Anchor 5 (SL Left, index 3) -> VERTICAL ONLY (Y changes, X remains locked)', () => {
      const overlay = {
        id: 'rr_test',
        name: 'longPosition',
        points: initialPoints,
        extendData: { startPoints: initialPoints }
      };
      const tDrag = baseTs + 5 * 60 * 1000; // tried to drag X to index 5
      const chart = createDragChart({ timestamp: tDrag, dataIndex: 5, value: 1.0920 });
      const event = { chart, overlay, x: 50, y: 50 };

      const result: any = LongPositionTool.onPressedMoving?.(event, 3);
      assert.ok(result && result.points, 'Should return updated points');

      // Y updated to 1.0920 for SL
      assert.equal(result.points[2].value, 1.0920);
      assert.equal(result.points[3].value, 1.0920);

      // X remained locked to t0 / index 10 on left, t1 / index 30 on right
      assert.equal(result.points[3].timestamp, t0);
      assert.equal(result.points[3].dataIndex, 10);
      assert.equal(result.points[0].timestamp, t0);
      assert.equal(result.points[0].dataIndex, 10);
      assert.equal(result.points[4].timestamp, t0);
      assert.equal(result.points[4].dataIndex, 10);
      assert.equal(result.points[2].timestamp, t1);
      assert.equal(result.points[2].dataIndex, 30);
    });

    it('Anchor 3 (Entry Left, index 4) -> FREE movement (both X and Y change)', () => {
      const overlay = {
        id: 'rr_test',
        name: 'longPosition',
        points: initialPoints,
        extendData: { startPoints: initialPoints }
      };
      const tDrag = baseTs + 5 * 60 * 1000;
      const chart = createDragChart({ timestamp: tDrag, dataIndex: 5, value: 1.1010 });
      const event = { chart, overlay, x: 50, y: 50 };

      const result: any = LongPositionTool.onPressedMoving?.(event, 4);
      assert.ok(result && result.points, 'Should return updated points');

      // Y updated to 1.1010 for Entry
      assert.equal(result.points[4].value, 1.1010);
      assert.equal(result.points[5].value, 1.1010);

      // X updated on left edge to tDrag / index 5
      assert.equal(result.points[0].timestamp, tDrag);
      assert.equal(result.points[0].dataIndex, 5);
      assert.equal(result.points[3].timestamp, tDrag);
      assert.equal(result.points[3].dataIndex, 5);
      assert.equal(result.points[4].timestamp, tDrag);
      assert.equal(result.points[4].dataIndex, 5);
    });

    it('Anchor 4 (Entry Right, index 5) -> HORIZONTAL ONLY (X changes, Y remains locked)', () => {
      const overlay = {
        id: 'rr_test',
        name: 'longPosition',
        points: initialPoints,
        extendData: { startPoints: initialPoints }
      };
      const tDrag = baseTs + 40 * 60 * 1000;
      // Tried to drag Y to 1.1030
      const chart = createDragChart({ timestamp: tDrag, dataIndex: 40, value: 1.1030 });
      const event = { chart, overlay, x: 50, y: 50 };

      const result: any = LongPositionTool.onPressedMoving?.(event, 5);
      assert.ok(result && result.points, 'Should return updated points');

      // Y remains locked to baseline 1.1000
      assert.equal(result.points[4].value, 1.1000);
      assert.equal(result.points[5].value, 1.1000);

      // X updated on right edge to tDrag / index 40
      assert.equal(result.points[1].timestamp, tDrag);
      assert.equal(result.points[1].dataIndex, 40);
      assert.equal(result.points[2].timestamp, tDrag);
      assert.equal(result.points[2].dataIndex, 40);
      assert.equal(result.points[5].timestamp, tDrag);
      assert.equal(result.points[5].dataIndex, 40);
    });

    it('Anchor 2 (TP Right, index 1) -> FREE movement (both X and Y change)', () => {
      const overlay = {
        id: 'rr_test',
        name: 'longPosition',
        points: initialPoints,
        extendData: { startPoints: initialPoints }
      };
      const tDrag = baseTs + 40 * 60 * 1000;
      const chart = createDragChart({ timestamp: tDrag, dataIndex: 40, value: 1.1080 });
      const event = { chart, overlay, x: 50, y: 50 };

      const result: any = LongPositionTool.onPressedMoving?.(event, 1);
      assert.ok(result && result.points, 'Should return updated points');

      // Y updated to 1.1080
      assert.equal(result.points[0].value, 1.1080);
      assert.equal(result.points[1].value, 1.1080);

      // X updated on right edge to tDrag / index 40
      assert.equal(result.points[1].timestamp, tDrag);
      assert.equal(result.points[1].dataIndex, 40);
      assert.equal(result.points[2].timestamp, tDrag);
      assert.equal(result.points[2].dataIndex, 40);
      assert.equal(result.points[5].timestamp, tDrag);
      assert.equal(result.points[5].dataIndex, 40);
    });

    it('Anchor 6 (SL Right, index 2) -> FREE movement (both X and Y change)', () => {
      const overlay = {
        id: 'rr_test',
        name: 'longPosition',
        points: initialPoints,
        extendData: { startPoints: initialPoints }
      };
      const tDrag = baseTs + 40 * 60 * 1000;
      const chart = createDragChart({ timestamp: tDrag, dataIndex: 40, value: 1.0920 });
      const event = { chart, overlay, x: 50, y: 50 };

      const result: any = LongPositionTool.onPressedMoving?.(event, 2);
      assert.ok(result && result.points, 'Should return updated points');

      // Y updated to 1.0920
      assert.equal(result.points[2].value, 1.0920);
      assert.equal(result.points[3].value, 1.0920);

      // X updated on right edge to tDrag / index 40
      assert.equal(result.points[1].timestamp, tDrag);
      assert.equal(result.points[1].dataIndex, 40);
      assert.equal(result.points[2].timestamp, tDrag);
      assert.equal(result.points[2].dataIndex, 40);
      assert.equal(result.points[5].timestamp, tDrag);
      assert.equal(result.points[5].dataIndex, 40);
    });

    it('ShortPosition obeys the same anchor movement constraints (Anchors 1 & 5 vertical-only)', () => {
      const shortInitialPoints = [
        { timestamp: t0, value: 1.0950, dataIndex: 10 }, // 0: Anchor 1 (TP Left)
        { timestamp: t1, value: 1.0950, dataIndex: 30 }, // 1: Anchor 2 (TP Right)
        { timestamp: t1, value: 1.1050, dataIndex: 30 }, // 2: Anchor 6 (SL Right)
        { timestamp: t0, value: 1.1050, dataIndex: 10 }, // 3: Anchor 5 (SL Left)
        { timestamp: t0, value: 1.1000, dataIndex: 10 }, // 4: Anchor 3 (Entry Left)
        { timestamp: t1, value: 1.1000, dataIndex: 30 }, // 5: Anchor 4 (Entry Right)
      ];
      const overlay = {
        id: 'rr_short_test',
        name: 'shortPosition',
        points: shortInitialPoints,
        extendData: { startPoints: shortInitialPoints }
      };

      // Test Anchor 1 (TP Left, index 0)
      const tDrag = baseTs + 5 * 60 * 1000;
      const chart1 = createDragChart({ timestamp: tDrag, dataIndex: 5, value: 1.0900 });
      const res1: any = ShortPositionTool.onPressedMoving?.({ chart: chart1, overlay, x: 50, y: 50 }, 0);
      assert.equal(res1.points[0].value, 1.0900);
      assert.equal(res1.points[0].timestamp, t0, 'X must remain locked on Anchor 1');

      // Test Anchor 5 (SL Left, index 3)
      const chart2 = createDragChart({ timestamp: tDrag, dataIndex: 5, value: 1.1080 });
      const res2: any = ShortPositionTool.onPressedMoving?.({ chart: chart2, overlay, x: 50, y: 50 }, 3);
      assert.equal(res2.points[3].value, 1.1080);
      assert.equal(res2.points[3].timestamp, t0, 'X must remain locked on Anchor 5');
    });
  });

  describe('Drawing Anchor — Hover vs Edit Mode Styling', () => {
    it('toolUtils.drawGrabHandles renders 10px diameter with 1px border on hover and 2px border on selected', () => {
      // Hover (isSelected: false)
      const hoverFigures: any[] = [];
      drawGrabHandles(hoverFigures, [{ x: 100, y: 150 }], false, false);
      assert.equal(hoverFigures.length, 1);
      assert.equal(hoverFigures[0].attrs.r, 4.5);
      assert.equal(hoverFigures[0].styles.borderSize, 1);
      assert.equal(hoverFigures[0].styles.color, '#ffffff');
      assert.equal(hoverFigures[0].styles.borderColor, '#2196F3');
      assert.equal(2 * hoverFigures[0].attrs.r + hoverFigures[0].styles.borderSize, 10);

      // Selected (isSelected: true)
      const selectedFigures: any[] = [];
      drawGrabHandles(selectedFigures, [{ x: 100, y: 150 }], false, true);
      assert.equal(selectedFigures.length, 1);
      assert.equal(selectedFigures[0].attrs.r, 4);
      assert.equal(selectedFigures[0].styles.borderSize, 2);
      assert.equal(selectedFigures[0].styles.color, '#ffffff');
      assert.equal(selectedFigures[0].styles.borderColor, '#2196F3');
      assert.equal(2 * selectedFigures[0].attrs.r + selectedFigures[0].styles.borderSize, 10);
    });

    it('LongPositionTool renders 6 anchor circles with 1px border on hover vs 2px border on selected', () => {
      const overlayDef = LongPositionTool.createOverlayDef();
      const mockChart = {
        getDataList: () => [],
        _loadedTimeframe: '1m',
        convertToPixel: (pts: any[]) => pts.map((p, i) => ({ x: 100 + (i % 2) * 100, y: 100 + Math.floor(i / 2) * 50 })),
        convertFromPixel: (pts: any[]) => pts.map((p) => ({ timestamp: 1000, value: 1.1000 })),
      };
      const mockYAxis = {
        convertFromPixel: (y: number) => 1.1000 - (y - 100) * 0.0001,
        convertToPixel: (val: number) => 100 + (1.1000 - val) / 0.0001,
        isFromZero: () => false,
      };

      // Hover
      const overlayHover = {
        id: 'rr_1',
        name: 'longPosition',
        points: [
          { timestamp: 1000, value: 1.1050 },
          { timestamp: 2000, value: 1.1050 },
          { timestamp: 2000, value: 1.0950 },
          { timestamp: 1000, value: 1.0950 },
          { timestamp: 1000, value: 1.1000 },
          { timestamp: 2000, value: 1.1000 }
        ],
        extendData: { isSelected: false, isHovered: true }
      };
      const figuresHover = overlayDef.createPointFigures({ chart: mockChart, overlay: overlayHover, yAxis: mockYAxis });
      const handlesHover = figuresHover.filter((f: any) => f.type === 'circle' && f.styles.color === '#ffffff' && f.styles.borderColor === '#2196F3');
      assert.equal(handlesHover.length, 6);
      handlesHover.forEach((h: any) => {
        assert.equal(h.attrs.r, 4.5);
        assert.equal(h.styles.borderSize, 1);
        assert.equal(2 * h.attrs.r + h.styles.borderSize, 10);
      });

      // Selected
      const overlaySelected = {
        id: 'rr_1',
        name: 'longPosition',
        points: overlayHover.points,
        extendData: { isSelected: true, isHovered: false }
      };
      const figuresSelected = overlayDef.createPointFigures({ chart: mockChart, overlay: overlaySelected, yAxis: mockYAxis });
      const handlesSelected = figuresSelected.filter((f: any) => f.type === 'circle' && f.styles.color === '#ffffff' && f.styles.borderColor === '#2196F3');
      assert.equal(handlesSelected.length, 6);
      handlesSelected.forEach((h: any) => {
        assert.equal(h.attrs.r, 4);
        assert.equal(h.styles.borderSize, 2);
        assert.equal(2 * h.attrs.r + h.styles.borderSize, 10);
      });
    });

    it('ShortPositionTool renders 6 anchor circles with 1px border on hover vs 2px border on selected', () => {
      const overlayDef = ShortPositionTool.createOverlayDef();
      const mockChart = {
        getDataList: () => [],
        _loadedTimeframe: '1m',
        convertToPixel: (pts: any[]) => pts.map((p, i) => ({ x: 100 + (i % 2) * 100, y: 100 + Math.floor(i / 2) * 50 })),
        convertFromPixel: (pts: any[]) => pts.map((p) => ({ timestamp: 1000, value: 1.1000 })),
      };
      const mockYAxis = {
        convertFromPixel: (y: number) => 1.1000 - (y - 100) * 0.0001,
        convertToPixel: (val: number) => 100 + (1.1000 - val) / 0.0001,
        isFromZero: () => false,
      };

      // Hover
      const overlayHover = {
        id: 'rr_short_1',
        name: 'shortPosition',
        points: [
          { timestamp: 1000, value: 1.0950 },
          { timestamp: 2000, value: 1.0950 },
          { timestamp: 2000, value: 1.1050 },
          { timestamp: 1000, value: 1.1050 },
          { timestamp: 1000, value: 1.1000 },
          { timestamp: 2000, value: 1.1000 }
        ],
        extendData: { isSelected: false, isHovered: true }
      };
      const figuresHover = overlayDef.createPointFigures({ chart: mockChart, overlay: overlayHover, yAxis: mockYAxis });
      const handlesHover = figuresHover.filter((f: any) => f.type === 'circle' && f.styles.color === '#ffffff' && f.styles.borderColor === '#2196F3');
      assert.equal(handlesHover.length, 6);
      handlesHover.forEach((h: any) => {
        assert.equal(h.attrs.r, 4.5);
        assert.equal(h.styles.borderSize, 1);
        assert.equal(2 * h.attrs.r + h.styles.borderSize, 10);
      });

      // Selected
      const overlaySelected = {
        id: 'rr_short_1',
        name: 'shortPosition',
        points: overlayHover.points,
        extendData: { isSelected: true, isHovered: false }
      };
      const figuresSelected = overlayDef.createPointFigures({ chart: mockChart, overlay: overlaySelected, yAxis: mockYAxis });
      const handlesSelected = figuresSelected.filter((f: any) => f.type === 'circle' && f.styles.color === '#ffffff' && f.styles.borderColor === '#2196F3');
      assert.equal(handlesSelected.length, 6);
      handlesSelected.forEach((h: any) => {
        assert.equal(h.attrs.r, 4);
        assert.equal(h.styles.borderSize, 2);
        assert.equal(2 * h.attrs.r + h.styles.borderSize, 10);
      });
    });
  });
});

