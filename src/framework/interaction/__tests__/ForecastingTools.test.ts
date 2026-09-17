import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LongPositionTool, ShortPositionTool } from '../../tools/implementations/ForecastingTools.ts';
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
});
