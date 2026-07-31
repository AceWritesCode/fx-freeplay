import type { KLineData } from '@/utils/dataUtils';
import type { ChartSettings } from '@/config';
import { shiftCandlesTimezone, getTimeframeMinutes } from '@/domain/market/timeframeUtils';
import { resample1mToTimeframe } from '@/utils/dataUtils';

/**
 * Builds the timezone-adjusted timeframe cache dictionary.
 */
export const buildTimeframeCache = (
  raw1m: KLineData[],
  s: ChartSettings,
  activeTimeframe: string
): Record<string, KLineData[]> => {
  const baseData = shiftCandlesTimezone(
    raw1m,
    s.timezoneAdjustmentEnabled,
    s.brokerTimezoneOffset,
    s.userTimezoneOffset
  );

  const newTimeframesData: Record<string, KLineData[]> = {
    '1m': baseData
  };

  if (activeTimeframe && activeTimeframe !== '1m') {
    newTimeframesData[activeTimeframe] = resample1mToTimeframe(baseData, getTimeframeMinutes(activeTimeframe));
  }

  return newTimeframesData;
};

/**
 * Shifts the active replay timestamp if timezone offsets shift.
 */
export const calculateAlignedReplayTimestamp = (
  replayCurrentTimestamp: number | null,
  isReplayActive: boolean,
  oldSettings: ChartSettings,
  newSettings: ChartSettings
): number | null => {
  if (!isReplayActive || replayCurrentTimestamp === null) return replayCurrentTimestamp;
  const oldDiff = oldSettings.timezoneAdjustmentEnabled ? (oldSettings.userTimezoneOffset - oldSettings.brokerTimezoneOffset) : 0;
  const newDiff = newSettings.timezoneAdjustmentEnabled ? (newSettings.userTimezoneOffset - newSettings.brokerTimezoneOffset) : 0;
  const diffMs = (newDiff - oldDiff) * 60 * 1000;
  return replayCurrentTimestamp + diffMs;
};

/**
 * Resolves raw 1m candlestick list for a watchlist symbol from in-memory cache or active state.
 */
export const getRawDataForSymbol = (
  symbolName: string | null,
  watchlistSymbols: any[],
  assetName: string,
  raw1mData: KLineData[]
): KLineData[] => {
  if (!symbolName) return [];
  const watchlistMatch = watchlistSymbols.find(s => s.name === symbolName);
  if (watchlistMatch && watchlistMatch.raw1m && watchlistMatch.raw1m.length > 0) {
    return watchlistMatch.raw1m;
  }
  if (symbolName === assetName) {
    return raw1mData;
  }
  return [];
};

/**
 * Supplemental 1m CSV data loader for custom timeframe chart slots.
 */
export const getRaw1mDataForSupplement = async (
  symbolName: string,
  currentFilesMap: Record<string, Record<string, File>>,
  watchlistSymbols: any[],
  assetName: string,
  raw1mData: KLineData[],
  parseCSVFn: (text: string) => any
): Promise<KLineData[]> => {
  const rawInMemory = getRawDataForSymbol(symbolName, watchlistSymbols, assetName, raw1mData);
  if (rawInMemory && rawInMemory.length > 0) {
    return rawInMemory;
  }
  const files = currentFilesMap[symbolName];
  if (files && files['1m']) {
    try {
      const text = await files['1m'].text();
      const parsed = parseCSVFn(text);
      if (parsed.parsedCount > 0) {
        return parsed.data;
      }
    } catch (err) {
      console.error(`[DEBUG] getRaw1mDataForSupplement - failed to parse 1m file for ${symbolName}:`, err);
    }
  }
  return [];
};

/**
 * Merges and supplements local timeframe cached data list with adjusted 1m kline candles.
 */
export const supplementTimeframeData = (
  tfData: KLineData[],
  rawData1m: KLineData[],
  tf: string,
  timezoneAdjustmentEnabled: boolean,
  userTimezoneOffset: number,
  brokerTimezoneOffset: number
): KLineData[] => {
  if (rawData1m.length === 0 || tfData.length === 0) return tfData;
  const minutes = getTimeframeMinutes(tf);
  if (minutes === 1) return tfData;

  const lastTfTimestamp = tfData[tfData.length - 1].timestamp;

  let adjusted1m = rawData1m;
  if (timezoneAdjustmentEnabled) {
    const offsetDiffMs = (userTimezoneOffset - brokerTimezoneOffset) * 60 * 1000;
    adjusted1m = rawData1m.map(c => ({
      ...c,
      timestamp: c.timestamp + offsetDiffMs
    }));
  }

  const resampled1m = resample1mToTimeframe(adjusted1m, minutes);
  if (resampled1m.length === 0) return tfData;

  const mergeStartIndex = resampled1m.findIndex(c => c.timestamp >= lastTfTimestamp);
  if (mergeStartIndex !== -1) {
    const newCandles = resampled1m.slice(mergeStartIndex);
    const baseTfData = tfData.filter(c => c.timestamp < lastTfTimestamp);
    return [...baseTfData, ...newCandles];
  }
  return tfData;
};
