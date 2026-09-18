import type { KLineData } from '@/utils/dataUtils';
import type { ChartSettings } from '@/config';
import { shiftCandlesTimezone, getTimeframeMinutes } from '@/domain/market/timeframeUtils';
import { resample1mToTimeframe } from '@/utils/dataUtils';

/**
 * Builds the timezone-adjusted timeframe cache dictionary.
 * Shifts raw 1m data exactly once and resamples all requested unique timeframes.
 */
export const buildTimeframeCache = (
  raw1m: KLineData[],
  s: ChartSettings,
  activeTimeframes: string | string[]
): Record<string, KLineData[]> => {
  const baseData = shiftCandlesTimezone(
    raw1m,
    s.timezoneAdjustmentEnabled,
    s.brokerTimezoneOffset,
    s.userTimezoneOffset
  );

  const newTimeframesData: Record<string, KLineData[]> = {
    '1m': baseData,
  };

  const timeframes = Array.isArray(activeTimeframes)
    ? activeTimeframes
    : (activeTimeframes ? [activeTimeframes] : []);

  for (const tf of timeframes) {
    if (tf && tf !== '1m' && !newTimeframesData[tf]) {
      newTimeframesData[tf] = resample1mToTimeframe(baseData, getTimeframeMinutes(tf));
    }
  }

  return newTimeframesData;
};

