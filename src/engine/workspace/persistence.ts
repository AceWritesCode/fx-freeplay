import type { ChartSettings } from '@/config';
import {
  settingsRepository,
  workspaceLayoutRepository,
  watchlistRepository,
} from '@/repository';

export const persistenceService = {
  getLayoutType: (fallback = '1'): string => {
    // Fallback sync reading for initial state
    return localStorage.getItem('layout_type') || fallback;
  },
  setLayoutType: (val: string): void => {
    localStorage.setItem('layout_type', val);
    workspaceLayoutRepository.saveLayoutConfig({ layoutType: val });
  },
  getLayoutSlots: (): any[] | null => {
    const saved = localStorage.getItem('layout_slots');
    return saved ? JSON.parse(saved) : null;
  },
  setLayoutSlots: (slots: any[]): void => {
    localStorage.setItem('layout_slots', JSON.stringify(slots));
    workspaceLayoutRepository.saveLayoutConfig({ slots });
  },
  getLayoutSizes: (): any | null => {
    const saved = localStorage.getItem('layout_sizes');
    return saved ? JSON.parse(saved) : null;
  },
  setLayoutSizes: (sizes: any): void => {
    localStorage.setItem('layout_sizes', JSON.stringify(sizes));
    workspaceLayoutRepository.saveLayoutConfig({ layoutSizes: sizes });
  },
  getSyncSetting: (
    key: 'SYNC_SYMBOL' | 'SYNC_INTERVAL' | 'SYNC_CROSSHAIR' | 'SYNC_TIME' | 'SYNC_DATE_RANGE' | 'SYNC_DRAWINGS',
    fallback = true
  ): boolean => {
    const saved = localStorage.getItem(key);
    return saved !== null ? saved !== 'false' : fallback;
  },
  setSyncSetting: (
    key: 'SYNC_SYMBOL' | 'SYNC_INTERVAL' | 'SYNC_CROSSHAIR' | 'SYNC_TIME' | 'SYNC_DATE_RANGE' | 'SYNC_DRAWINGS',
    val: boolean
  ): void => {
    localStorage.setItem(key, String(val));
    const syncPropMap = {
      SYNC_SYMBOL: 'syncSymbol',
      SYNC_INTERVAL: 'syncInterval',
      SYNC_CROSSHAIR: 'syncCrosshair',
      SYNC_TIME: 'syncTime',
      SYNC_DATE_RANGE: 'syncDateRange',
      SYNC_DRAWINGS: 'syncDrawings',
    };
    const propName = syncPropMap[key];
    if (propName) {
      workspaceLayoutRepository.saveLayoutConfig({
        syncSettings: { [propName]: val } as any,
      });
    }
  },
  getImportMode: (fallback: 'single' | 'folder' = 'single'): 'single' | 'folder' => {
    return (localStorage.getItem('tv_clone_import_mode') as 'single' | 'folder') || fallback;
  },
  setImportMode: (mode: 'single' | 'folder'): void => {
    localStorage.setItem('tv_clone_import_mode', mode);
    watchlistRepository.saveImportMode(mode);
  },
  getSettings: (): ChartSettings | null => {
    const saved = localStorage.getItem('tv_clone_settings');
    return saved ? JSON.parse(saved) : null;
  },
  setSettings: (settings: ChartSettings): void => {
    localStorage.setItem('tv_clone_settings', JSON.stringify(settings));
    settingsRepository.saveSettings(settings);
  },
  getActiveWatchlistSymbol: (): string | null => {
    return localStorage.getItem('active_watchlist_symbol');
  },
  setActiveWatchlistSymbol: (symbol: string): void => {
    if (symbol) localStorage.setItem('active_watchlist_symbol', symbol);
    watchlistRepository.saveActiveSymbol(symbol);
  },
  getActiveTimeframe: (fallback = '1m'): string => {
    return localStorage.getItem('active_timeframe') || fallback;
  },
  setActiveTimeframe: (tf: string): void => {
    localStorage.setItem('active_timeframe', tf);
  },
  clearActiveSession: (): void => {
    localStorage.removeItem('active_watchlist_symbol');
    localStorage.removeItem('active_timeframe');
    localStorage.removeItem('tv_clone_import_mode');
    watchlistRepository.saveActiveSymbol(null);
  },
  getWatchlistSymbolSettings: (key: string): any => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  },
  setWatchlistSymbolSettings: (key: string, data: any): void => {
    localStorage.setItem(key, JSON.stringify(data));
  },
};
