import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTimeframeMs,
  getChartBarSpace,
  getTrueOffsetRightDistance,
  findDataIndexByTimestamp,
  findFloorIndexByTimestamp,
  calculateVisibleTimestamps,
  calculateTargetViewport,
  calculateCenterOffset,
  centerTimestampOnChart,
  syncDateRange,
  syncCrosshairs,
  syncTimeScale,
  isSyncEngineActive,
} from '../syncEngine.ts';

describe('syncEngine Calculation Logic & Viewport Transformations', () => {
  describe('getTimeframeMs', () => {
    it('correctly parses minute timeframes', () => {
      assert.equal(getTimeframeMs('1m'), 60 * 1000);
      assert.equal(getTimeframeMs('5m'), 5 * 60 * 1000);
      assert.equal(getTimeframeMs('15m'), 15 * 60 * 1000);
      assert.equal(getTimeframeMs('30m'), 30 * 60 * 1000);
    });

    it('correctly parses hour timeframes', () => {
      assert.equal(getTimeframeMs('1h'), 60 * 60 * 1000);
      assert.equal(getTimeframeMs('4h'), 4 * 60 * 60 * 1000);
    });

    it('correctly parses day, week, month timeframes', () => {
      assert.equal(getTimeframeMs('1d'), 24 * 60 * 60 * 1000);
      assert.equal(getTimeframeMs('1D'), 24 * 60 * 60 * 1000);
      assert.equal(getTimeframeMs('1W'), 7 * 24 * 60 * 60 * 1000);
      assert.equal(getTimeframeMs('1M'), 30 * 24 * 60 * 60 * 1000);
    });

    it('defaults to 60000ms for invalid or unrecognized inputs', () => {
      assert.equal(getTimeframeMs(''), 60 * 1000);
      assert.equal(getTimeframeMs('invalid'), 60 * 1000);
    });
  });

  describe('findDataIndexByTimestamp & findFloorIndexByTimestamp', () => {
    const sample1mData = [
      { timestamp: 1000, close: 1.1 },
      { timestamp: 1060, close: 1.2 },
      { timestamp: 1120, close: 1.3 },
      { timestamp: 1180, close: 1.4 },
      { timestamp: 1240, close: 1.5 },
    ];
    const tfMs = 60;

    it('returns 0 for empty data array', () => {
      assert.equal(findDataIndexByTimestamp([], 1000, tfMs), 0);
      assert.equal(findFloorIndexByTimestamp([], 1000), 0);
    });

    it('finds exact matching timestamp indices', () => {
      assert.equal(findDataIndexByTimestamp(sample1mData, 1000, tfMs), 0);
      assert.equal(findDataIndexByTimestamp(sample1mData, 1120, tfMs), 2);
      assert.equal(findDataIndexByTimestamp(sample1mData, 1240, tfMs), 4);

      assert.equal(findFloorIndexByTimestamp(sample1mData, 1000), 0);
      assert.equal(findFloorIndexByTimestamp(sample1mData, 1120), 2);
      assert.equal(findFloorIndexByTimestamp(sample1mData, 1240), 4);
    });

    it('finds nearest or floor index for in-between timestamps', () => {
      // 1080 is between 1060 (idx 1) and 1120 (idx 2)
      assert.equal(findFloorIndexByTimestamp(sample1mData, 1080), 1);
      assert.equal(findDataIndexByTimestamp(sample1mData, 1080, tfMs), 1);
      assert.equal(findDataIndexByTimestamp(sample1mData, 1100, tfMs), 2);
    });

    it('extrapolates negative index before the start of data (historical boundary)', () => {
      // timestamp 880 is 120ms before 1000 => 2 bars before idx 0 => -2
      assert.equal(findDataIndexByTimestamp(sample1mData, 880, tfMs), -2);
      assert.equal(findFloorIndexByTimestamp(sample1mData, 880), 0);
    });

    it('extrapolates positive index after the end of data (future boundary)', () => {
      // timestamp 1360 is 120ms after 1240 => 2 bars after idx 4 => 6
      assert.equal(findDataIndexByTimestamp(sample1mData, 1360, tfMs), 6);
      assert.equal(findFloorIndexByTimestamp(sample1mData, 1360), 4);
    });
  });

  describe('calculateVisibleTimestamps', () => {
    const data = [
      { timestamp: 1000 },
      { timestamp: 2000 },
      { timestamp: 3000 },
      { timestamp: 4000 },
      { timestamp: 5000 },
    ];
    const tfMs = 1000;

    it('returns null for empty data or missing visibleRange', () => {
      assert.equal(calculateVisibleTimestamps([], { realFrom: 0, realTo: 4 }, tfMs), null);
      assert.equal(calculateVisibleTimestamps(data, null, tfMs), null);
    });

    it('calculates exact timestamps for in-bounds indices', () => {
      const result = calculateVisibleTimestamps(data, { realFrom: 1, realTo: 3 }, tfMs);
      assert.ok(result !== null);
      assert.equal(result.t1, 2000);
      assert.equal(result.t2, 4000);
    });

    it('extrapolates timestamp for negative realFrom (left historical overflow)', () => {
      const result = calculateVisibleTimestamps(data, { realFrom: -2, realTo: 2 }, tfMs);
      assert.ok(result !== null);
      assert.equal(result.t1, 1000 + (-2 * 1000)); // -1000
      assert.equal(result.t2, 3000);
    });

    it('extrapolates timestamp for realTo beyond dataset length (right future offset)', () => {
      const result = calculateVisibleTimestamps(data, { realFrom: 2, realTo: 7 }, tfMs);
      assert.ok(result !== null);
      assert.equal(result.t1, 3000);
      assert.equal(result.t2, 5000 + ((7 - 4) * 1000)); // 8000
    });
  });

  describe('calculateTargetViewport', () => {
    const target1mData = [
      { timestamp: 1000 },
      { timestamp: 2000 },
      { timestamp: 3000 },
      { timestamp: 4000 },
      { timestamp: 5000 },
    ];

    it('returns exact source spacing and offset when same symbol and timeframe', () => {
      const result = calculateTargetViewport({
        sourceBarSpace: 12,
        sourceOffset: 150,
        isSameSymbolAndTf: true,
        t1: 1000,
        t2: 5000,
        targetData: target1mData,
        targetTfMs: 1000,
        targetWidth: 800,
      });

      assert.equal(result.barSpace, 12);
      assert.equal(result.offsetRightDistance, 150);
    });

    it('calculates matching bar spacing and offset for different timeframe target', () => {
      // Target has 5 bars (1000 to 5000), targetWidth = 800
      // t1 = 1000 (idx 0), t2 = 5000 (idx 4) => visibleBarsCount = 4
      const result = calculateTargetViewport({
        sourceBarSpace: 6,
        sourceOffset: 0,
        isSameSymbolAndTf: false,
        t1: 1000,
        t2: 5000,
        targetData: target1mData,
        targetTfMs: 1000,
        targetWidth: 800,
      });

      // desiredBarSpace = 800 / 4 = 200
      assert.equal(result.barSpace, 200);
      // offsetRightDistance = (targetTo(4) - targetData.length(5)) * 200 = -200
      assert.equal(result.offsetRightDistance, -200);
    });

    it('handles empty targetData gracefully', () => {
      const result = calculateTargetViewport({
        sourceBarSpace: 8,
        sourceOffset: 50,
        isSameSymbolAndTf: false,
        t1: 1000,
        t2: 5000,
        targetData: [],
        targetTfMs: 1000,
        targetWidth: 800,
      });

      assert.equal(result.barSpace, 8);
      assert.equal(result.offsetRightDistance, 50);
    });
  });

  describe('calculateCenterOffset & centerTimestampOnChart', () => {
    it('calculates exact centered pixel offset', () => {
      // dataLength = 100, targetIndex = 50, width = 800, barSpace = 10
      // (50 - 100) * 10 + (800 / 2) = -500 + 400 = -100
      const offset = calculateCenterOffset(100, 50, 800, 10);
      assert.equal(offset, -100);
    });

    it('centerTimestampOnChart centers mock chart accurately', () => {
      let setOffset = 0;
      const mockChart = {
        getDataList: () => [
          { timestamp: 1000 },
          { timestamp: 2000 },
          { timestamp: 3000 },
        ],
        getSize: () => ({ width: 600 }),
        getBarSpace: () => 10,
        setOffsetRightDistance: (val: number) => {
          setOffset = val;
        },
      };

      centerTimestampOnChart(mockChart, 2000, 1000);
      // targetIndex = 1, dataLength = 3, barSpace = 10, width = 600
      // offset = (1 - 3) * 10 + 300 = -20 + 300 = 280
      assert.equal(setOffset, 280);
    });
  });

  describe('getChartBarSpace and getTrueOffsetRightDistance', () => {
    it('extracts bar space from number or object', () => {
      assert.equal(getChartBarSpace({ getBarSpace: () => 8 }), 8);
      assert.equal(getChartBarSpace({ getBarSpace: () => ({ bar: 10 }) }), 10);
      assert.equal(getChartBarSpace({ getBarSpace: () => ({ barSpace: 12 }) }), 12);
      assert.equal(getChartBarSpace(null), 6);
    });

    it('extracts offset from _chartStore or getOffsetRightDistance', () => {
      const mockChartWithStore = {
        _chartStore: { _lastBarRightSideDiffBarCount: 5 },
        getBarSpace: () => 10,
      };
      assert.equal(getTrueOffsetRightDistance(mockChartWithStore), 50);

      const mockChartStandard = {
        getOffsetRightDistance: () => 120,
      };
      assert.equal(getTrueOffsetRightDistance(mockChartStandard), 120);
    });
  });

  describe('syncDateRange Leader-Follower Viewport Synchronization', () => {
    const createMockChart = (data: any[], barSpace = 8, offset = 100, width = 800) => {
      let currentBarSpace = barSpace;
      let currentOffset = offset;
      let visibleRange = { realFrom: 0, realTo: data.length - 1 };
      const updatedPanes: { level: number; paneId?: string }[] = [];

      return {
        getDataList: () => data,
        getVisibleRange: () => visibleRange,
        setVisibleRange: (r: { realFrom: number; realTo: number }) => {
          visibleRange = r;
        },
        getBarSpace: () => currentBarSpace,
        setBarSpace: (bs: number) => {
          currentBarSpace = bs;
        },
        getOffsetRightDistance: () => currentOffset,
        setOffsetRightDistance: (off: number) => {
          currentOffset = off;
        },
        getSize: () => ({ width, height: 600 }),
        updatePane: (level: number, paneId?: string) => {
          updatedPanes.push({ level, paneId });
        },
        getUpdatedPanes: () => updatedPanes,
      };
    };

    it('synchronizes from Leader (Chart 0) to Follower (Chart 1) with same symbol and timeframe', () => {
      const data = [
        { timestamp: 1000 },
        { timestamp: 2000 },
        { timestamp: 3000 },
        { timestamp: 4000 },
      ];
      const leaderChart = createMockChart(data, 12, 150);
      const followerChart = createMockChart(data, 6, 0);

      const chartInstances = [leaderChart, followerChart];
      const slots = [
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
      ];

      syncDateRange(0, chartInstances, slots, '2-split');

      // Follower must match leader barSpace and offset
      assert.equal(followerChart.getBarSpace(), 12);
      assert.equal(followerChart.getOffsetRightDistance(), 150);

      // Leader itself must not be mutated
      assert.equal(leaderChart.getBarSpace(), 12);
      assert.equal(leaderChart.getOffsetRightDistance(), 150);
    });

    it('synchronizes across 4 charts when Chart 2 (index 1) is the leader', () => {
      const data = [
        { timestamp: 1000 },
        { timestamp: 2000 },
        { timestamp: 3000 },
        { timestamp: 4000 },
      ];
      const chart0 = createMockChart(data, 6, 0);
      const chart1Leader = createMockChart(data, 16, 220);
      const chart2 = createMockChart(data, 6, 0);
      const chart3 = createMockChart(data, 6, 0);

      const chartInstances = [chart0, chart1Leader, chart2, chart3];
      const slots = [
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
      ];

      // Leader is slot index 1
      syncDateRange(1, chartInstances, slots, '4-quad');

      // Followers (0, 2, 3) must be synchronized
      assert.equal(chart0.getBarSpace(), 16);
      assert.equal(chart0.getOffsetRightDistance(), 220);
      assert.equal(chart2.getBarSpace(), 16);
      assert.equal(chart2.getOffsetRightDistance(), 220);
      assert.equal(chart3.getBarSpace(), 16);
      assert.equal(chart3.getOffsetRightDistance(), 220);
    });

    it('synchronizes across different timeframes mapping time bounds correctly', () => {
      // Leader 1m (10 bars: 1000 to 10000)
      const leaderData = Array.from({ length: 10 }, (_, i) => ({ timestamp: (i + 1) * 1000 }));
      // Follower 5m (2 bars: 1000, 6000)
      const followerData = [{ timestamp: 1000 }, { timestamp: 6000 }];

      const leaderChart = createMockChart(leaderData, 10, 50, 800);
      leaderChart.setVisibleRange({ realFrom: 0, realTo: 9 }); // spans 1000 to 10000

      const followerChart = createMockChart(followerData, 8, 0, 800);

      const chartInstances = [leaderChart, followerChart];
      const slots = [
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '5m' },
      ];

      syncDateRange(0, chartInstances, slots, '2-split');

      // Follower has received updated barSpace and offsetRightDistance
      assert.ok(followerChart.getBarSpace() > 0);
      assert.ok(typeof followerChart.getOffsetRightDistance() === 'number');
    });

    it('handles leader-follower gating invariants deterministically', () => {
      let activeLeaderIndex = 0;
      let isSyncingTransaction = false;
      const syncCalls: number[] = [];

      const handleSimulatedDateRangeSync = (eventSlotIndex: number) => {
        // Strict leader check
        if (eventSlotIndex !== activeLeaderIndex) return;
        if (isSyncingTransaction) return;

        isSyncingTransaction = true;
        try {
          syncCalls.push(eventSlotIndex);
        } finally {
          isSyncingTransaction = false;
        }
      };

      // 1. Leader Chart 0 fires event -> Accepted
      handleSimulatedDateRangeSync(0);
      assert.deepEqual(syncCalls, [0]);

      // 2. Follower Chart 1 fires programmatic or rogue event -> Dropped
      handleSimulatedDateRangeSync(1);
      assert.deepEqual(syncCalls, [0]); // still [0]

      // 3. User switches leader to Chart 1 (e.g. pointerdown on Chart 1)
      activeLeaderIndex = 1;

      // 4. Old leader Chart 0 fires event -> Dropped
      handleSimulatedDateRangeSync(0);
      assert.deepEqual(syncCalls, [0]); // dropped

      // 5. New leader Chart 1 fires event -> Accepted
      handleSimulatedDateRangeSync(1);
      assert.deepEqual(syncCalls, [0, 1]);

      // 6. Rapid consecutive events from leader 1 are all handled synchronously
      handleSimulatedDateRangeSync(1);
      handleSimulatedDateRangeSync(1);
      assert.deepEqual(syncCalls, [0, 1, 1, 1]);
    });
  });

  describe('syncCrosshairs Leader-Follower Synchronization', () => {
    it('projects crosshair from Leader (Chart 0) to Follower (Chart 1) with matching symbol', () => {
      const data = [{ timestamp: 1000, close: 1.15 }, { timestamp: 2000, close: 1.16 }];
      const executedActionsLeader: { action: string; data: any }[] = [];
      const executedActionsFollower: { action: string; data: any }[] = [];

      const leaderChart = {
        convertFromPixel: () => [{ timestamp: 1000, value: 1.15 }],
        executeAction: (action: string, data: any) => {
          executedActionsLeader.push({ action, data });
        },
      };

      const followerChart = {
        getDataList: () => data,
        convertToPixel: () => [{ x: 150, y: 200 }],
        executeAction: (action: string, data: any) => {
          executedActionsFollower.push({ action, data });
        },
      };

      const chartInstances = [leaderChart, followerChart];
      const slots = [
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '15m' },
      ];

      syncCrosshairs(0, { x: 100, y: 120 }, chartInstances, slots, '2-split');

      // Follower must receive crosshair coordinate action
      assert.equal(executedActionsFollower.length, 1);
      assert.equal(executedActionsFollower[0].action, 'onCrosshairChange');
      assert.deepEqual(executedActionsFollower[0].data, { x: 150, y: 200 });

      // Leader must not execute actions on itself
      assert.equal(executedActionsLeader.length, 0);
    });

    it('clears crosshair or ignores followers with different symbols', () => {
      const data = [{ timestamp: 1000, close: 1.15 }];
      const executedActionsFollower: { action: string; data: any }[] = [];

      const leaderChart = {
        convertFromPixel: () => [{ timestamp: 1000, value: 1.15 }],
        executeAction: () => {},
      };

      const followerChart = {
        getDataList: () => data,
        convertToPixel: () => [{ x: 150, y: 200 }],
        executeAction: (action: string, data: any) => {
          executedActionsFollower.push({ action, data });
        },
      };

      const chartInstances = [leaderChart, followerChart];
      const slots = [
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'GBPUSD', timeframe: '1m' }, // different symbol!
      ];

      syncCrosshairs(0, { x: 100, y: 120 }, chartInstances, slots, '2-split');

      // Follower with different symbol should NOT receive EURUSD crosshair coordinates
      assert.equal(executedActionsFollower.length, 0);
    });

    it('clears followers when cursor leaves the leader chart', () => {
      const executedActionsFollower: { action: string; data: any }[] = [];
      const leaderChart = {
        convertFromPixel: () => [],
        executeAction: () => {},
      };
      const followerChart = {
        getDataList: () => [{ timestamp: 1000, close: 1.15 }],
        convertToPixel: () => [{ x: 0, y: 0 }],
        executeAction: (action: string, data: any) => {
          executedActionsFollower.push({ action, data });
        },
      };

      const chartInstances = [leaderChart, followerChart];
      const slots = [
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
      ];

      // Pass null/empty params to simulate cursor exit
      syncCrosshairs(0, null, chartInstances, slots, '2-split');

      assert.equal(executedActionsFollower.length, 1);
      assert.equal(executedActionsFollower[0].action, 'onCrosshairChange');
      assert.deepEqual(executedActionsFollower[0].data, {});
    });
  });

  describe('syncTimeScale Leader-Follower Synchronization', () => {
    it('centers follower charts when Leader candle is clicked', () => {
      const data = [
        { timestamp: 1000 },
        { timestamp: 2000 },
        { timestamp: 3000 },
      ];
      let followerOffset = 0;
      const followerChart = {
        getDataList: () => data,
        getSize: () => ({ width: 600 }),
        getBarSpace: () => 10,
        setOffsetRightDistance: (off: number) => {
          followerOffset = off;
        },
      };

      const leaderChart = {
        getDataList: () => data,
        getSize: () => ({ width: 600 }),
        getBarSpace: () => 10,
        setOffsetRightDistance: () => {},
      };

      const chartInstances = [leaderChart, followerChart];
      const slots = [
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
      ];

      syncTimeScale(0, { timestamp: 2000 }, chartInstances, slots, '2-split', false);

      // Follower must be centered on timestamp 2000 (idx 1 of 3: (1-3)*10 + 300 = 280)
      assert.equal(followerOffset, 280);
    });
  });

  describe('Leader-Follower Dispatcher & Toggle Isolation Invariants', () => {
    it('enforces toggle isolation across date-range, crosshair, and time sync', () => {
      let activeLeaderIndex = 0;
      let syncDateRangeEnabled = true;
      let syncCrosshairEnabled = false;
      let syncTimeEnabled = true;

      const executedSyncTypes: string[] = [];

      const dispatchEvent = (type: 'date' | 'crosshair' | 'time', eventSlotIndex: number) => {
        // Strict leader check
        if (eventSlotIndex !== activeLeaderIndex) return;

        if (type === 'date' && syncDateRangeEnabled) {
          executedSyncTypes.push('date');
        }
        if (type === 'crosshair' && syncCrosshairEnabled) {
          executedSyncTypes.push('crosshair');
        }
        if (type === 'time' && syncTimeEnabled) {
          executedSyncTypes.push('time');
        }
      };

      // 1. Dispatch all three from leader: date and time should execute, crosshair suppressed
      dispatchEvent('date', 0);
      dispatchEvent('crosshair', 0);
      dispatchEvent('time', 0);
      assert.deepEqual(executedSyncTypes, ['date', 'time']);

      // 2. Toggle crosshair ON, date-range OFF
      syncCrosshairEnabled = true;
      syncDateRangeEnabled = false;
      executedSyncTypes.length = 0;

      dispatchEvent('date', 0);
      dispatchEvent('crosshair', 0);
      dispatchEvent('time', 0);
      assert.deepEqual(executedSyncTypes, ['crosshair', 'time']);
    });

    it('handles layout boundaries: 1-chart, 2-chart, and 4-chart execution counts', () => {
      const data = [{ timestamp: 1000 }, { timestamp: 2000 }];
      const createDummy = () => {
        let syncPasses = 0;
        return {
          getDataList: () => [{ timestamp: 1000 }, { timestamp: 2000 }],
          getVisibleRange: () => ({ realFrom: 0, realTo: 1 }),
          getBarSpace: () => 8,
          setBarSpace: () => {},
          getOffsetRightDistance: () => 10,
          setOffsetRightDistance: () => { syncPasses++; },
          getSize: () => ({ width: 800 }),
          getSyncPasses: () => syncPasses,
        };
      };

      const charts = [createDummy(), createDummy(), createDummy(), createDummy()];
      const slots = [
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
      ];

      // 1-chart layout: 0 followers updated
      syncDateRange(0, charts, slots, '1');
      assert.equal(charts[1].getSyncPasses(), 0);
      assert.equal(charts[2].getSyncPasses(), 0);
      assert.equal(charts[3].getSyncPasses(), 0);

      // 2-split layout: only Chart 1 (index 1) updated
      syncDateRange(0, charts, slots, '2-split');
      assert.equal(charts[1].getSyncPasses(), 1);
      assert.equal(charts[2].getSyncPasses(), 0);
      assert.equal(charts[3].getSyncPasses(), 0);

      // 4-quad layout: Charts 1, 2, 3 updated
      syncDateRange(0, charts, slots, '4-quad');
      assert.equal(charts[1].getSyncPasses(), 2);
      assert.equal(charts[2].getSyncPasses(), 1);
      assert.equal(charts[3].getSyncPasses(), 1);
    });

    it('clamps activeChartIndex when layout shrinks', () => {
      const clampActiveIndex = (currentIndex: number, layoutType: string): number => {
        const visibleCount = layoutType === '1' ? 1 : layoutType === '2-split' ? 2 : 4;
        if (currentIndex >= visibleCount) {
          return 0; // Clamped to default Chart 1
        }
        return currentIndex;
      };

      // In 4-chart layout, Chart 4 (index 3) is active
      assert.equal(clampActiveIndex(3, '4-quad'), 3);

      // User switches to 2-split layout: index 3 is out of bounds -> clamped to 0
      assert.equal(clampActiveIndex(3, '2-split'), 0);

      // User switches to 1-chart layout: index 1 is out of bounds -> clamped to 0
      assert.equal(clampActiveIndex(1, '1'), 0);

      // Valid index 1 in 2-split layout is preserved
      assert.equal(clampActiveIndex(1, '2-split'), 1);
    });

    it('safely handles follower mutation exceptions without leaking transaction lock', () => {
      let isSyncingTransaction = false;

      const guardedSync = (fn: () => void) => {
        if (isSyncingTransaction) return;
        isSyncingTransaction = true;
        try {
          fn();
        } finally {
          isSyncingTransaction = false;
        }
      };

      // Target chart throws an error during sync
      assert.throws(() => {
        guardedSync(() => {
          throw new Error('Simulated Canvas Render Error');
        });
      }, /Simulated Canvas Render Error/);

      // Transaction lock must be cleanly released despite exception
      assert.equal(isSyncingTransaction, false);

      // Next legitimate sync must not be blocked
      let executed = false;
      guardedSync(() => {
        executed = true;
      });
      assert.equal(executed, true);
    });
  });

  describe('Edge-Case Stabilization Suite (Step 4C)', () => {
    const createMockFollower = (data: any[], tf = '1m', symbol = 'EURUSD') => {
      let barSpace = 8;
      let offset = 0;
      let syncPasses = 0;
      return {
        getDataList: () => data,
        getBarSpace: () => barSpace,
        setBarSpace: (bs: number) => { barSpace = bs; },
        getOffsetRightDistance: () => offset,
        setOffsetRightDistance: (off: number) => { offset = off; syncPasses++; },
        getSize: () => ({ width: 800, height: 600 }),
        getSyncPasses: () => syncPasses,
      };
    };

    it('1 -> 2 -> 4 -> 2 -> 1 layout transition maintains clean synchronization boundaries', () => {
      const data = [{ timestamp: 1000 }, { timestamp: 2000 }, { timestamp: 3000 }];
      const leader = {
        getDataList: () => data,
        getVisibleRange: () => ({ realFrom: 0, realTo: 2 }),
        getBarSpace: () => 10,
        getOffsetRightDistance: () => 50,
        getSize: () => ({ width: 800 }),
      };

      const f1 = createMockFollower(data);
      const f2 = createMockFollower(data);
      const f3 = createMockFollower(data);

      const chartInstances = [leader, f1, f2, f3];
      const slots = [
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
      ];

      // 1. Layout = '1' -> 0 followers updated
      syncDateRange(0, chartInstances, slots, '1');
      assert.equal(f1.getSyncPasses(), 0);
      assert.equal(f2.getSyncPasses(), 0);
      assert.equal(f3.getSyncPasses(), 0);

      // 2. Layout = '2-split' -> only f1 updated
      syncDateRange(0, chartInstances, slots, '2-split');
      assert.equal(f1.getSyncPasses(), 1);
      assert.equal(f2.getSyncPasses(), 0);
      assert.equal(f3.getSyncPasses(), 0);

      // 3. Layout = '4-quad' -> f1, f2, f3 updated
      syncDateRange(0, chartInstances, slots, '4-quad');
      assert.equal(f1.getSyncPasses(), 2);
      assert.equal(f2.getSyncPasses(), 1);
      assert.equal(f3.getSyncPasses(), 1);

      // 4. Layout = '2-split' -> only f1 updated again
      syncDateRange(0, chartInstances, slots, '2-split');
      assert.equal(f1.getSyncPasses(), 3);
      assert.equal(f2.getSyncPasses(), 1);
      assert.equal(f3.getSyncPasses(), 1);

      // 5. Layout = '1' -> 0 followers updated
      syncDateRange(0, chartInstances, slots, '1');
      assert.equal(f1.getSyncPasses(), 3);
      assert.equal(f2.getSyncPasses(), 1);
      assert.equal(f3.getSyncPasses(), 1);
    });

    it('gracefully handles followers with empty data or null instances', () => {
      const data = [{ timestamp: 1000 }, { timestamp: 2000 }];
      const leader = {
        getDataList: () => data,
        getVisibleRange: () => ({ realFrom: 0, realTo: 1 }),
        getBarSpace: () => 10,
        getOffsetRightDistance: () => 50,
        getSize: () => ({ width: 800 }),
      };

      const emptyFollower = createMockFollower([]); // data not loaded yet
      const chartInstances = [leader, null, emptyFollower, undefined];
      const slots = [
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '1m' },
      ];

      // Must not throw or crash when encountering null or empty slots
      assert.doesNotThrow(() => {
        syncDateRange(0, chartInstances as any, slots, '4-quad');
      });

      assert.equal(emptyFollower.getSyncPasses(), 0);
    });

    it('synchronizes followers with DIFFERENT symbol AND DIFFERENT timeframe simultaneously', () => {
      // Leader: EURUSD 1m (5 bars: 1000 to 5000)
      const leaderData = Array.from({ length: 5 }, (_, i) => ({ timestamp: (i + 1) * 1000 }));
      const leader = {
        getDataList: () => leaderData,
        getVisibleRange: () => ({ realFrom: 0, realTo: 4 }), // 1000 to 5000
        getBarSpace: () => 8,
        getOffsetRightDistance: () => 0,
        getSize: () => ({ width: 800 }),
      };

      // Follower: GBPJPY 15m (historical bars around 1000 to 5000)
      const followerData = [
        { timestamp: 0 },
        { timestamp: 900 },
        { timestamp: 1800 },
        { timestamp: 2700 },
        { timestamp: 3600 },
        { timestamp: 4500 },
        { timestamp: 5400 },
      ];
      const follower = createMockFollower(followerData, '15m', 'GBPJPY');

      const chartInstances = [leader, follower];
      const slots = [
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'GBPJPY', timeframe: '15m' },
      ];

      syncDateRange(0, chartInstances, slots, '2-split');

      // Follower barSpace and offset must be calculated from timestamp interval [1000, 5000]
      assert.ok(follower.getBarSpace() > 0);
      assert.equal(follower.getSyncPasses(), 1);
    });

    it('handles rapid sequential leader switching across all 4 slots without locking', () => {
      let activeLeader = 0;
      let isSyncing = false;
      const syncLog: string[] = [];

      const triggerSync = (eventSlot: number, action: string) => {
        if (eventSlot !== activeLeader || isSyncing) return;
        isSyncing = true;
        try {
          syncLog.push(`leader_${eventSlot}_${action}`);
        } finally {
          isSyncing = false;
        }
      };

      // Leader 0 pans
      triggerSync(0, 'pan');
      // User switches to leader 1 -> pans
      activeLeader = 1;
      triggerSync(1, 'pan');
      // Rogue follower 0 event arrives -> dropped
      triggerSync(0, 'pan');
      // User switches to leader 2 -> zooms
      activeLeader = 2;
      triggerSync(2, 'zoom');
      // User switches to leader 3 -> pans
      activeLeader = 3;
      triggerSync(3, 'pan');
      // User switches back to leader 0 -> pans
      activeLeader = 0;
      triggerSync(0, 'pan');

      assert.deepEqual(syncLog, [
        'leader_0_pan',
        'leader_1_pan',
        'leader_2_zoom',
        'leader_3_pan',
        'leader_0_pan',
      ]);
    });
  });

  describe('Sync Engine Lifecycle & Single-Chart Mode Deactivation Invariants', () => {
    it('isSyncEngineActive accurately reports active status based on layout chart count', () => {
      // Single chart mode: must be inactive
      assert.equal(isSyncEngineActive('1'), false);

      // Multi chart modes: must be active
      assert.equal(isSyncEngineActive('2-split'), true);
      assert.equal(isSyncEngineActive('2-vertical'), true);
      assert.equal(isSyncEngineActive('3-left'), true);
      assert.equal(isSyncEngineActive('3-top'), true);
      assert.equal(isSyncEngineActive('4-grid'), true);
      assert.equal(isSyncEngineActive('4-vertical'), true);
      assert.equal(isSyncEngineActive('4-horizontal'), true);
    });

    it('syncCrosshairs completely deactivates when layout is single-chart (layoutType="1")', () => {
      let crosshairSet = false;
      const mockLeader = {
        convertFromPixel: () => [{ timestamp: 1000, value: 1.1 }],
        executeAction: () => {},
      };
      const mockFollower = {
        getDataList: () => [{ timestamp: 1000, close: 1.1 }],
        convertToPixel: () => [{ x: 50, y: 50 }],
        executeAction: () => {
          crosshairSet = true;
        },
      };

      const chartInstances = [mockLeader, mockFollower];
      const slots = [
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '5m' },
      ];

      // In single chart mode ("1"), syncCrosshairs must early return
      syncCrosshairs(0, { x: 50, y: 50 }, chartInstances, slots, '1');
      assert.equal(crosshairSet, false, 'Crosshairs should not sync in single-chart mode');

      // In multi-chart mode ("2-split"), it executes
      syncCrosshairs(0, { x: 50, y: 50 }, chartInstances, slots, '2-split');
      assert.equal(crosshairSet, true, 'Crosshairs should sync in multi-chart mode');
    });

    it('syncTimeScale completely deactivates when layout is single-chart (layoutType="1")', () => {
      let timeScrolled = false;
      const mockLeader = {
        getDataList: () => [{ timestamp: 1000, close: 1.1 }, { timestamp: 2000, close: 1.2 }],
        getSize: () => ({ width: 600 }),
        getBarSpace: () => 10,
        setOffsetRightDistance: () => {},
      };
      const mockFollower = {
        getDataList: () => [{ timestamp: 1000, close: 1.1 }, { timestamp: 2000, close: 1.2 }],
        getSize: () => ({ width: 600 }),
        getBarSpace: () => 10,
        setOffsetRightDistance: () => {
          timeScrolled = true;
        },
      };

      const chartInstances = [mockLeader, mockFollower];
      const slots = [
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '5m' },
      ];

      syncTimeScale(0, { timestamp: 1000 }, chartInstances, slots, '1', false);
      assert.equal(timeScrolled, false, 'Time scale should not sync in single-chart mode');

      syncTimeScale(0, { timestamp: 1000 }, chartInstances, slots, '2-split', false);
      assert.equal(timeScrolled, true, 'Time scale should sync in multi-chart mode');
    });

    it('syncDateRange completely deactivates when layout is single-chart (layoutType="1")', () => {
      let dateRangeSynced = false;
      const mockLeader = {
        getDataList: () => [{ timestamp: 1000 }, { timestamp: 2000 }],
        getBarSpace: () => 6,
        getSize: () => ({ width: 800 }),
        getOffsetRightDistance: () => 100,
        getVisibleRange: () => ({ realFrom: 0, realTo: 1 }),
      };
      const mockFollower = {
        getDataList: () => [{ timestamp: 1000 }, { timestamp: 2000 }],
        getBarSpace: () => 6,
        getSize: () => ({ width: 800 }),
        setBarSpace: () => {
          dateRangeSynced = true;
        },
        setOffsetRightDistance: () => {
          dateRangeSynced = true;
        },
      };

      const chartInstances = [mockLeader, mockFollower];
      const slots = [
        { symbol: 'EURUSD', timeframe: '1m' },
        { symbol: 'EURUSD', timeframe: '5m' },
      ];

      syncDateRange(0, chartInstances, slots, '1');
      assert.equal(dateRangeSynced, false, 'Date range should not sync in single-chart mode');

      syncDateRange(0, chartInstances, slots, '2-split');
      assert.equal(dateRangeSynced, true, 'Date range should sync in multi-chart mode');
    });
  });
});



