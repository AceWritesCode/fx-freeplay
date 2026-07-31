import type { ChartSettings } from '@/config';

const KEYS = {
  LAYOUT_TYPE: 'layout_type',
  LAYOUT_SLOTS: 'layout_slots',
  LAYOUT_SIZES: 'layout_sizes',
  SYNC_SYMBOL: 'sync_symbol',
  SYNC_INTERVAL: 'sync_interval',
  SYNC_CROSSHAIR: 'sync_crosshair',
  SYNC_TIME: 'sync_time',
  SYNC_DATE_RANGE: 'sync_date_range',
  SYNC_DRAWINGS: 'sync_drawings',
  IMPORT_MODE: 'tv_clone_import_mode',
  SETTINGS: 'tv_clone_settings',
  ACTIVE_WATCHLIST_SYMBOL: 'active_watchlist_symbol',
  ACTIVE_TIMEFRAME: 'active_timeframe'
};

export const persistenceService = {
  getLayoutType: (fallback = '1'): string => {
    return localStorage.getItem(KEYS.LAYOUT_TYPE) || fallback;
  },
  setLayoutType: (val: string): void => {
    localStorage.setItem(KEYS.LAYOUT_TYPE, val);
  },
  getLayoutSlots: (): any[] | null => {
    const saved = localStorage.getItem(KEYS.LAYOUT_SLOTS);
    return saved ? JSON.parse(saved) : null;
  },
  setLayoutSlots: (slots: any[]): void => {
    localStorage.setItem(KEYS.LAYOUT_SLOTS, JSON.stringify(slots));
  },
  getLayoutSizes: (): number[] | null => {
    const saved = localStorage.getItem(KEYS.LAYOUT_SIZES);
    return saved ? JSON.parse(saved) : null;
  },
  setLayoutSizes: (sizes: number[]): void => {
    localStorage.setItem(KEYS.LAYOUT_SIZES, JSON.stringify(sizes));
  },
  getSyncSetting: (key: 'SYNC_SYMBOL' | 'SYNC_INTERVAL' | 'SYNC_CROSSHAIR' | 'SYNC_TIME' | 'SYNC_DATE_RANGE' | 'SYNC_DRAWINGS', fallback = true): boolean => {
    const saved = localStorage.getItem(KEYS[key]);
    return saved !== null ? saved !== 'false' : fallback;
  },
  setSyncSetting: (key: 'SYNC_SYMBOL' | 'SYNC_INTERVAL' | 'SYNC_CROSSHAIR' | 'SYNC_TIME' | 'SYNC_DATE_RANGE' | 'SYNC_DRAWINGS', val: boolean): void => {
    localStorage.setItem(KEYS[key], String(val));
  },
  getImportMode: (fallback: 'single' | 'folder' = 'single'): 'single' | 'folder' => {
    return (localStorage.getItem(KEYS.IMPORT_MODE) as 'single' | 'folder') || fallback;
  },
  setImportMode: (mode: 'single' | 'folder'): void => {
    localStorage.setItem(KEYS.IMPORT_MODE, mode);
  },
  getSettings: (): ChartSettings | null => {
    const saved = localStorage.getItem(KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : null;
  },
  setSettings: (settings: ChartSettings): void => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },
  getActiveWatchlistSymbol: (): string | null => {
    return localStorage.getItem(KEYS.ACTIVE_WATCHLIST_SYMBOL);
  },
  setActiveWatchlistSymbol: (symbol: string): void => {
    localStorage.setItem(KEYS.ACTIVE_WATCHLIST_SYMBOL, symbol);
  },
  getActiveTimeframe: (fallback = '1m'): string => {
    return localStorage.getItem(KEYS.ACTIVE_TIMEFRAME) || fallback;
  },
  setActiveTimeframe: (tf: string): void => {
    localStorage.setItem(KEYS.ACTIVE_TIMEFRAME, tf);
  },
  clearActiveSession: (): void => {
    localStorage.removeItem(KEYS.ACTIVE_WATCHLIST_SYMBOL);
    localStorage.removeItem(KEYS.ACTIVE_TIMEFRAME);
    localStorage.removeItem(KEYS.IMPORT_MODE);
  },
  getWatchlistSymbolSettings: (key: string): any => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  },
  setWatchlistSymbolSettings: (key: string, data: any): void => {
    localStorage.setItem(key, JSON.stringify(data));
  }
};
