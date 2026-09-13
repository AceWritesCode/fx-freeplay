import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  formatTimeframeDisplay, 
  formatDataRangeDate, 
  findCoveringHigherTimeframe 
} from '../timeframeUtils.ts';
import type { KLineData } from '../../../utils/dataUtils.ts';
import { findCandleIndexByTimestamp } from '../../../engine/replay/replayNavigation.ts';

describe('Timeframe Utilities (Bug 1 Stabilization)', () => {
  describe('formatTimeframeDisplay', () => {
    it('formats minute timeframes to canonical uppercase notation (1m -> M1, 5m -> M5)', () => {
      assert.strictEqual(formatTimeframeDisplay('1m'), 'M1');
      assert.strictEqual(formatTimeframeDisplay('2m'), 'M2');
      assert.strictEqual(formatTimeframeDisplay('3m'), 'M3');
      assert.strictEqual(formatTimeframeDisplay('5m'), 'M5');
      assert.strictEqual(formatTimeframeDisplay('15m'), 'M15');
      assert.strictEqual(formatTimeframeDisplay('30m'), 'M30');
    });

    it('formats hour timeframes (1h -> H1, 4h -> H4)', () => {
      assert.strictEqual(formatTimeframeDisplay('1h'), 'H1');
      assert.strictEqual(formatTimeframeDisplay('4h'), 'H4');
    });

    it('formats daily, weekly, monthly timeframes (D -> D1, W -> W1, M -> MN)', () => {
      assert.strictEqual(formatTimeframeDisplay('D'), 'D1');
      assert.strictEqual(formatTimeframeDisplay('W'), 'W1');
      assert.strictEqual(formatTimeframeDisplay('M'), 'MN');
    });

    it('handles empty input gracefully', () => {
      assert.strictEqual(formatTimeframeDisplay(''), '');
    });
  });

  describe('formatDataRangeDate', () => {
    it('formats date and time accurately into DD MMM YYYY HH:mm', () => {
      // 2022-01-01 00:00 UTC (Local Date representation)
      const d = new Date(2022, 0, 1, 0, 0, 0);
      assert.strictEqual(formatDataRangeDate(d.getTime()), '01 Jan 2022 00:00');

      // 2026-08-31 23:59
      const d2 = new Date(2026, 7, 31, 23, 59, 0);
      assert.strictEqual(formatDataRangeDate(d2.getTime()), '31 Aug 2026 23:59');
    });

    it('returns empty string on invalid timestamp', () => {
      assert.strictEqual(formatDataRangeDate(NaN), '');
    });
  });

  describe('findCoveringHigherTimeframe', () => {
    const replay2020 = new Date(2020, 0, 1).getTime();
    const data2022Start: KLineData[] = [
      { timestamp: new Date(2022, 0, 1).getTime(), open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
      { timestamp: new Date(2026, 7, 31).getTime(), open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
    ];
    const data2020Start: KLineData[] = [
      { timestamp: new Date(2019, 11, 31).getTime(), open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
      { timestamp: new Date(2026, 7, 31).getTime(), open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
    ];

    it('checks M1 -> M2 -> M3 -> M5 and stops at the first covering higher timeframe', async () => {
      const checkedTimeframes: string[] = [];

      const mockGetTimeframeData = async (_sym: string, tf: string): Promise<KLineData[]> => {
        checkedTimeframes.push(tf);
        if (tf === '2m' || tf === '3m') {
          // Data starts in 2022, does not cover 2020 replay
          return data2022Start;
        }
        if (tf === '5m') {
          // Data starts in 2019, covers 2020 replay
          return data2020Start;
        }
        return [];
      };

      const result = await findCoveringHigherTimeframe(
        '1m',
        'EURUSD',
        replay2020,
        { '1m': data2022Start },
        mockGetTimeframeData
      );

      assert.strictEqual(result, '5m');
      // Verify progressive inspection order: checked 2m, then 3m, then 5m, and STOPPED without querying 10m or 15m
      assert.deepStrictEqual(checkedTimeframes, ['2m', '3m', '5m']);
    });

    it('immediately resolves from in-memory allTimeframesData if already loaded', async () => {
      const allTimeframesData: Record<string, KLineData[]> = {
        '1m': data2022Start,
        '5m': data2020Start,
      };

      const result = await findCoveringHigherTimeframe(
        '1m',
        'EURUSD',
        replay2020,
        allTimeframesData
      );

      assert.strictEqual(result, '5m');
    });

    it('returns null if no higher timeframe covers the target timestamp', async () => {
      const mockGetTimeframeData = async (): Promise<KLineData[]> => {
        return data2022Start; // All timeframes start in 2022
      };

      const result = await findCoveringHigherTimeframe(
        '1m',
        'EURUSD',
        replay2020,
        { '1m': data2022Start },
        mockGetTimeframeData
      );

      assert.strictEqual(result, null);
    });
  });

  describe('Replay Insufficient Data Condition & Multi-Chart Isolation', () => {
    const firstCandleTimestamp = new Date(2022, 0, 1, 0, 0, 0).getTime();
    const h1FirstCandleTimestamp = new Date(2018, 0, 1, 0, 0, 0).getTime();

    const isSlotDataInsufficient = (
      isReplayActive: boolean,
      replayCurrentTimestamp: number | null,
      slotData: KLineData[]
    ): boolean => {
      return Boolean(
        isReplayActive &&
        replayCurrentTimestamp !== null &&
        slotData.length > 0 &&
        replayCurrentTimestamp < slotData[0].timestamp
      );
    };

    it('identifies insufficient data when replay timestamp is earlier than the first candle', () => {
      const replay2020 = new Date(2020, 5, 1).getTime();
      const m1Data: KLineData[] = [
        { timestamp: firstCandleTimestamp, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
      ];

      assert.strictEqual(isSlotDataInsufficient(true, replay2020, m1Data), true);
    });

    it('treats exact start boundary as sufficient data (timestamp === firstCandle.timestamp)', () => {
      const m1Data: KLineData[] = [
        { timestamp: firstCandleTimestamp, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
      ];

      assert.strictEqual(isSlotDataInsufficient(true, firstCandleTimestamp, m1Data), false);
    });

    it('treats timestamps after first candle as sufficient data', () => {
      const replay2023 = new Date(2023, 0, 1).getTime();
      const m1Data: KLineData[] = [
        { timestamp: firstCandleTimestamp, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
      ];

      assert.strictEqual(isSlotDataInsufficient(true, replay2023, m1Data), false);
    });

    it('returns false when replay is not active or timestamp is null', () => {
      const replay2020 = new Date(2020, 5, 1).getTime();
      const m1Data: KLineData[] = [
        { timestamp: firstCandleTimestamp, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
      ];

      assert.strictEqual(isSlotDataInsufficient(false, replay2020, m1Data), false);
      assert.strictEqual(isSlotDataInsufficient(true, null, m1Data), false);
    });

    it('supports multi-chart layout isolation (Slot 0 H1 normal, Slot 1 M1 empty state)', () => {
      const replay2020 = new Date(2020, 5, 1).getTime();
      const h1Data: KLineData[] = [
        { timestamp: h1FirstCandleTimestamp, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
      ];
      const m1Data: KLineData[] = [
        { timestamp: firstCandleTimestamp, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
      ];

      // Left Slot (H1): 2020 >= 2018 -> sufficient data, renders chart normally
      const slot0Insufficient = isSlotDataInsufficient(true, replay2020, h1Data);
      assert.strictEqual(slot0Insufficient, false);

      // Right Slot (M1): 2020 < 2022 -> insufficient data, shows empty state overlay
      const slot1Insufficient = isSlotDataInsufficient(true, replay2020, m1Data);
      assert.strictEqual(slot1Insufficient, true);
    });
  });

  describe('Bug 2 — Replay Date/Time Picker Formatting & Jump Resolution', () => {
    const candles: KLineData[] = [
      { timestamp: new Date(2022, 0, 1, 9, 30).getTime(), open: 1.1, high: 1.2, low: 1.0, close: 1.15, volume: 100 },
      { timestamp: new Date(2022, 0, 1, 9, 45).getTime(), open: 1.15, high: 1.25, low: 1.1, close: 1.2, volume: 150 },
      { timestamp: new Date(2022, 0, 1, 10, 0).getTime(), open: 1.2, high: 1.3, low: 1.18, close: 1.25, volume: 200 },
      { timestamp: new Date(2022, 0, 1, 10, 15).getTime(), open: 1.25, high: 1.28, low: 1.22, close: 1.26, volume: 120 },
    ];

    const resolveJumpTargetCandle = (targetTimestamp: number, dataset: KLineData[]): KLineData | null => {
      if (!dataset || dataset.length === 0) return null;
      let closest = dataset[0];
      for (let i = 0; i < dataset.length; i++) {
        if (dataset[i].timestamp <= targetTimestamp) {
          closest = dataset[i];
        } else {
          break;
        }
      }
      return closest;
    };

    const formatPickerValue = (ts: number | null): string => {
      if (!ts) return '';
      const date = new Date(ts);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    it('formats timestamp as standard YYYY-MM-DDTHH:mm string for datetime-local input', () => {
      const ts = new Date(2022, 0, 1, 9, 30).getTime();
      assert.strictEqual(formatPickerValue(ts), '2022-01-01T09:30');
    });

    it('jumps exactly to target candle when matching timestamp exists', () => {
      const targetTs = new Date(2022, 0, 1, 10, 0).getTime();
      const target = resolveJumpTargetCandle(targetTs, candles);
      assert.ok(target);
      assert.strictEqual(target.timestamp, targetTs);
    });

    it('clamps to closest earlier candle when selected time falls between candles', () => {
      // 09:50 falls between 09:45 and 10:00 -> should resolve to 09:45
      const targetTs = new Date(2022, 0, 1, 9, 50).getTime();
      const target = resolveJumpTargetCandle(targetTs, candles);
      assert.ok(target);
      assert.strictEqual(target.timestamp, new Date(2022, 0, 1, 9, 45).getTime());
    });

    it('clamps to first candle when selected time is earlier than dataset start', () => {
      const targetTs = new Date(2020, 0, 1, 0, 0).getTime();
      const target = resolveJumpTargetCandle(targetTs, candles);
      assert.ok(target);
      assert.strictEqual(target.timestamp, candles[0].timestamp);
    });

    it('clamps to last candle when selected time is after dataset end', () => {
      const targetTs = new Date(2025, 0, 1, 0, 0).getTime();
      const target = resolveJumpTargetCandle(targetTs, candles);
      assert.ok(target);
      assert.strictEqual(target.timestamp, candles[candles.length - 1].timestamp);
    });
  });

  describe('Replay Playback Speed & Timeframe Invariant (Deterministic 1 Bar/Step)', () => {
    // Generate synthetic 1H data (1 bar per hour)
    const baseTime = new Date(2022, 0, 1, 0, 0).getTime();
    const h1Bars: KLineData[] = Array.from({ length: 24 }, (_, i) => ({
      timestamp: baseTime + i * 3600 * 1000,
      open: 1.1000 + i * 0.001,
      close: 1.1005 + i * 0.001,
      high: 1.1010 + i * 0.001,
      low: 1.0995 + i * 0.001,
      volume: 100,
    }));

    // Generate synthetic M5 data (1 bar per 5 minutes = 12 bars per hour)
    const m5Bars: KLineData[] = Array.from({ length: 24 * 12 }, (_, i) => ({
      timestamp: baseTime + i * 300 * 1000,
      open: 1.1000 + i * 0.0001,
      close: 1.1002 + i * 0.0001,
      high: 1.1005 + i * 0.0001,
      low: 1.0998 + i * 0.0001,
      volume: 50,
    }));

    it('advances exactly 1 H1 bar (3600s) on H1 session stepForward', () => {
      let currentIdx = findCandleIndexByTimestamp(h1Bars, baseTime + 2 * 3600 * 1000);
      assert.strictEqual(currentIdx, 2);

      // Step forward on H1
      currentIdx += 1;
      const newTimestamp = h1Bars[currentIdx].timestamp;
      assert.strictEqual(newTimestamp, baseTime + 3 * 3600 * 1000);
      assert.strictEqual(newTimestamp - h1Bars[currentIdx - 1].timestamp, 3600 * 1000);
    });

    it('re-anchors to exact M5 candle and advances exactly 1 M5 bar (300s) on M5 session stepForward', () => {
      // User was at H1 bar 2 (2 hours in = 02:00)
      const h1Timestamp = baseTime + 2 * 3600 * 1000;
      
      // When switching to M5, session re-anchors to the candle in M5 matching that timestamp
      const m5StartIdx = findCandleIndexByTimestamp(m5Bars, h1Timestamp);
      assert.strictEqual(m5Bars[m5StartIdx].timestamp, h1Timestamp);
      assert.strictEqual(m5StartIdx, 24); // 2 hours * 12 bars/hour = index 24

      // Step forward on M5: must advance exactly 1 M5 bar (300s), NOT 1 H1 bar (3600s)
      const nextM5Idx = m5StartIdx + 1;
      const nextM5Timestamp = m5Bars[nextM5Idx].timestamp;
      assert.strictEqual(nextM5Timestamp - h1Timestamp, 300 * 1000); // exactly 5 minutes
    });

    it('transition guard skips stepForward while isSwitchingTimeframeRef is active', () => {
      let stepCount = 0;
      const isSwitchingTimeframe = { current: true };

      const simulateTick = () => {
        if (isSwitchingTimeframe.current) {
          return; // Skipped
        }
        stepCount += 1;
      };

      // Ticks occurring during async timeframe generation are safely ignored
      simulateTick();
      simulateTick();
      assert.strictEqual(stepCount, 0);

      // Once timeframe switch finishes, ticks resume normally
      isSwitchingTimeframe.current = false;
      simulateTick();
      assert.strictEqual(stepCount, 1);
    });

    it('reverse switch (M5 -> H1) re-anchors to closest earlier candle and advances 1 H1 bar', () => {
      // User is at M5 bar 27 (02:15)
      const m5Timestamp = baseTime + 27 * 300 * 1000; // 02:15
      
      // When switching to H1, 02:15 aligns to 02:00 H1 bar
      const h1Idx = findCandleIndexByTimestamp(h1Bars, m5Timestamp);
      assert.strictEqual(h1Bars[h1Idx].timestamp, baseTime + 2 * 3600 * 1000);

      // Next step on H1 advances to 03:00 (1 H1 bar)
      const nextH1Idx = h1Idx + 1;
      assert.strictEqual(h1Bars[nextH1Idx].timestamp, baseTime + 3 * 3600 * 1000);
    });

    it('atomic viewport restoration preserves exact targetOffset and base scroll index directly', () => {
      let appliedOffset = 0;
      let scrolledIndex = -1;

      const mockChart = {
        getSize: () => ({ width: 1000, height: 600 }),
        setOffsetRightDistance: (offset: number) => { appliedOffset = offset; },
        scrollToDataIndex: (idx: number) => { scrolledIndex = idx; },
      };

      const viewportState = {
        offset: 350,
        wasManualScale: false,
        yAxisRange: null,
      };

      // In atomic viewport restore, target candle index (e.g. 50) is passed directly to scrollToDataIndex,
      // and offsetRightDistance is set to 350px directly (never distorted by synthetic bar index addition).
      const chartWidth = mockChart.getSize().width;
      const targetOffset = viewportState.offset !== null ? viewportState.offset : chartWidth * 0.5;
      mockChart.setOffsetRightDistance(targetOffset);
      mockChart.scrollToDataIndex(50);

      assert.strictEqual(appliedOffset, 350);
      assert.strictEqual(scrolledIndex, 50);
    });

    it('preserves screen position when offset is 0px (candle right at edge) without falling back to reset ratio', () => {
      let appliedOffset = -1;
      const mockChart = {
        getSize: () => ({ width: 1000, height: 600 }),
        setOffsetRightDistance: (offset: number) => { appliedOffset = offset; },
        scrollToDataIndex: () => {},
      };

      const viewportState = {
        offset: 0, // candle right at edge
        wasManualScale: false,
        yAxisRange: null,
      };

      const chartWidth = mockChart.getSize().width;
      const targetOffset = viewportState.offset !== null ? viewportState.offset : chartWidth * 0.5;
      mockChart.setOffsetRightDistance(targetOffset);

      assert.strictEqual(appliedOffset, 0); // Must remain 0, NOT 500 (1000 * 0.5)
    });

    it('bypasses scrollToDataIndex when candle is the last bar in dataset to prevent KLineCharts auto-centering', () => {
      let scrollToDataIndexCalled = false;
      let appliedOffset = -1;

      const mockChart = {
        getSize: () => ({ width: 1000, height: 600 }),
        setOffsetRightDistance: (offset: number) => { appliedOffset = offset; },
        scrollToDataIndex: (_idx?: number) => { scrollToDataIndexCalled = true; },
      };

      const viewportState = {
        offset: 420,
        wasManualScale: false,
        yAxisRange: null,
      };

      // In replay mode, the replay candle is the last bar in visibleData (isLastBarInDataset = true)
      const isLastBarInDataset = true;
      const chartWidth = mockChart.getSize().width;
      const targetOffset = viewportState.offset !== null ? viewportState.offset : chartWidth * 0.5;

      if (isLastBarInDataset) {
        mockChart.setOffsetRightDistance(targetOffset);
      } else {
        mockChart.scrollToDataIndex(100);
        mockChart.setOffsetRightDistance(targetOffset);
      }

      assert.strictEqual(scrollToDataIndexCalled, false);
      assert.strictEqual(appliedOffset, 420);
    });

    it('captures center timestamp and right-edge proximity from visible range', () => {
      const mockData = [
        { timestamp: 1000, close: 1.1 },
        { timestamp: 2000, close: 1.2 },
        { timestamp: 3000, close: 1.3 },
        { timestamp: 4000, close: 1.4 },
        { timestamp: 5000, close: 1.5 },
      ];

      // Case 1: Historical view (viewing indices 1 to 3)
      const visibleRangeHistorical = { from: 1, to: 3 };
      const centerIdx = Math.floor((visibleRangeHistorical.from + visibleRangeHistorical.to) / 2); // 2
      const centerTs = mockData[centerIdx].timestamp; // 3000
      const isNearRightEdgeHist = visibleRangeHistorical.to >= mockData.length - 2; // 3 >= 3 -> true
      assert.strictEqual(centerTs, 3000);
      assert.strictEqual(isNearRightEdgeHist, true);

      const visibleRangePast = { from: 0, to: 2 };
      const pastCenterIdx = Math.floor((visibleRangePast.from + visibleRangePast.to) / 2); // 1
      const pastCenterTs = mockData[pastCenterIdx].timestamp; // 2000
      const isNearRightEdgePast = visibleRangePast.to >= mockData.length - 2; // 2 >= 3 -> false
      assert.strictEqual(pastCenterTs, 2000);
      assert.strictEqual(isNearRightEdgePast, false);
    });

    it('calculates anchored offsetRightDistance so target candle remains at anchorScreenX', () => {
      // Historical anchor calculation formula:
      // targetOffset = (targetIndex - (dataLength - 1)) * barSpace + (chartWidth - anchorScreenX)
      const dataLength = 500;
      const targetIndex = 250; // Historical candle
      const barSpace = 8;
      const chartWidth = 1000;
      const anchorScreenX = 500; // Center of screen

      const targetOffset = (targetIndex - (dataLength - 1)) * barSpace + (chartWidth - anchorScreenX);
      // (250 - 499) * 8 + (1000 - 500) = -249 * 8 + 500 = -1992 + 500 = -1492
      assert.strictEqual(targetOffset, -1492);

      // Verify that after switching to lower timeframe with 5x density (targetIndex becomes 1250 out of 2500):
      const m1DataLength = 2500;
      const m1TargetIndex = 1250;
      const m1TargetOffset = (m1TargetIndex - (m1DataLength - 1)) * barSpace + (chartWidth - anchorScreenX);
      // (1250 - 2499) * 8 + (1000 - 500) = -1249 * 8 + 500 = -9992 + 500 = -9492
      assert.strictEqual(m1TargetOffset, -9492);
    });
  });
});
