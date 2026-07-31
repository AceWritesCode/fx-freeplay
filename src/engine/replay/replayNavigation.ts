import type { KLineData } from '@/utils/dataUtils';

/**
 * Searches the candle data array from right to left to find the index of the candle
 * whose timestamp is less than or equal to the target timestamp.
 */
export const findCandleIndexByTimestamp = (data: KLineData[], timestamp: number): number => {
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].timestamp <= timestamp) {
      return i;
    }
  }
  return -1;
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
