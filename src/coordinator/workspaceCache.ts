import type { KLineData } from '@/utils/dataUtils';

// Static, in-memory cache for raw 1-minute candlestick data to isolate heavy payloads from React state diffing
const rawDataCache = new Map<string, KLineData[]>();

// Static, in-memory cache for timezone-adjusted timeframe data to avoid repeated IndexedDB reads and timezone conversions
const timezoneAdjustedCache = new Map<string, Record<string, KLineData[]>>();

// Static, in-memory cache for symbol profiles to avoid IndexedDB reads during symbol switching
const symbolProfileCache = new Map<string, any>();

/**
 * Accessors and mutators for raw 1-minute candlestick data cache
 */
export function getRawDataCache(symbol: string): KLineData[] | undefined {
  return rawDataCache.get(symbol);
}

export function hasRawDataCache(symbol: string): boolean {
  return rawDataCache.has(symbol);
}

export function setRawDataCache(symbol: string, data: KLineData[]): void {
  rawDataCache.set(symbol, data);
}

export function clearRawDataCache(): void {
  rawDataCache.clear();
}

/**
 * Accessors and mutators for timezone-adjusted timeframe data cache
 */
export function getTimezoneAdjustedCache(symbol: string): Record<string, KLineData[]> | undefined {
  return timezoneAdjustedCache.get(symbol);
}

export function getTimezoneAdjustedBars(symbol: string, tf: string): KLineData[] | undefined {
  return timezoneAdjustedCache.get(symbol)?.[tf];
}

export function setTimezoneAdjustedBars(symbol: string, tf: string, bars: KLineData[]): void {
  let symbolEntry = timezoneAdjustedCache.get(symbol);
  if (!symbolEntry) {
    symbolEntry = {};
    timezoneAdjustedCache.set(symbol, symbolEntry);
  }
  symbolEntry[tf] = bars;
}

export function clearTimezoneAdjustedCache(): void {
  timezoneAdjustedCache.clear();
}

/**
 * Accessors and mutators for symbol profile cache
 */
export function getSymbolProfileCache(symbol: string): any | undefined {
  return symbolProfileCache.get(symbol);
}

export function hasSymbolProfileCache(symbol: string): boolean {
  return symbolProfileCache.has(symbol);
}

export function setSymbolProfileCache(symbol: string, profile: any): void {
  symbolProfileCache.set(symbol, profile);
}

export function clearSymbolProfileCache(): void {
  symbolProfileCache.clear();
}

/**
 * Clear all in-memory workspace market data caches
 */
export function clearWorkspaceCaches(): void {
  rawDataCache.clear();
  timezoneAdjustedCache.clear();
  symbolProfileCache.clear();
}
