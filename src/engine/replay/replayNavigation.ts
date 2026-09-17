import type { KLineData } from '@/utils/dataUtils';

/**
 * Binary searches the candle data array (sorted ascending by timestamp) to find the
 * greatest index whose timestamp is less than or equal to the target timestamp (floor index).
 * Returns -1 if the dataset is empty or if all candles are strictly after the target timestamp.
 */
export const findCandleIndexByTimestamp = (data: KLineData[], timestamp: number): number => {
  if (!data || data.length === 0) return -1;

  let low = 0;
  let high = data.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (data[mid].timestamp <= timestamp) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
};

/**
 * Calculates the next timestamp in the dataset to step forward.
 * Returns null if the end of the dataset is reached.
 */
export const getNextReplayTimestamp = (data: KLineData[], currentTimestamp: number): number | null => {
  const currentIndex = findCandleIndexByTimestamp(data, currentTimestamp);
  if (currentIndex === -1 || currentIndex >= data.length - 1) {
    return null;
  }
  return data[currentIndex + 1].timestamp;
};

/**
 * Calculates the previous timestamp in the dataset to step backward.
 * Returns null if we cannot step back further.
 */
export const getPrevReplayTimestamp = (data: KLineData[], currentTimestamp: number): number | null => {
  const currentIndex = findCandleIndexByTimestamp(data, currentTimestamp);
  if (currentIndex <= 0) {
    return null;
  }
  return data[currentIndex - 1].timestamp;
};
