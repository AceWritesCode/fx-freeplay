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

