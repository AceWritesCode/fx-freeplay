import type { KLineData } from '@/utils/dataUtils';
import type { ChartSettings, TimeframeOption } from '@/config';
import type { WatchlistSymbol, SlotConfig, LayoutSizes } from '@/store/types';

export interface MigrationScript {
  version: number;
  description: string;
  up: (db: IDBDatabase) => void | Promise<void>;
}

export interface WorkspaceLayoutConfig {
  layoutType: string;
  slots: SlotConfig[];
  layoutSizes: LayoutSizes;
  syncSettings: {
    syncSymbol: boolean;
    syncInterval: boolean;
    syncCrosshair: boolean;
    syncTime: boolean;
    syncDateRange: boolean;
    syncDrawings: boolean;
  };
}

export interface MarketDataRepository {
  getSymbols(): Promise<string[]>;
  getBars(symbol: string, timeframe: string): Promise<KLineData[]>;
  saveBars(symbol: string, timeframe: string, bars: KLineData[]): Promise<void>;
  deleteBars(symbol: string): Promise<void>;
  clearAll(): Promise<void>;
}

export interface WatchlistRepository {
  getWatchlistSymbols(): Promise<WatchlistSymbol[]>;
  saveWatchlistSymbols(symbols: WatchlistSymbol[]): Promise<void>;
  getFolderHandles(): Promise<any[]>;
  saveFolderHandles(handles: any[]): Promise<void>;
  getImportMode(): Promise<'single' | 'folder'>;
  saveImportMode(mode: 'single' | 'folder'): Promise<void>;
  getActiveSymbol(): Promise<string | null>;
  saveActiveSymbol(symbol: string | null): Promise<void>;
}

export interface WorkspaceLayoutRepository {
  getLayoutConfig(): Promise<WorkspaceLayoutConfig | null>;
  saveLayoutConfig(config: Partial<WorkspaceLayoutConfig>): Promise<void>;
}

export interface DrawingRepository {
  getDrawings(symbol: string): Promise<any[]>;
  saveDrawings(symbol: string, drawings: any[]): Promise<void>;
  clearDrawings(symbol: string): Promise<void>;
}

export interface SettingsRepository {
  getSettings(): Promise<ChartSettings | null>;
  saveSettings(settings: ChartSettings): Promise<void>;
  getCustomTimeframes(): Promise<TimeframeOption[]>;
  saveCustomTimeframes(tfList: TimeframeOption[]): Promise<void>;
}
