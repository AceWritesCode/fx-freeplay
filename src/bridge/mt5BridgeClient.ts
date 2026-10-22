/**
 * MT5 Bridge Service Client
 * Provides TypeScript methods to interact with Electron's MT5 bridge IPC.
 */

export interface TerminalInfo {
  name: string;
  install_path: string;
  exe_path: string;
}

export interface SystemCheckResult {
  python_installed: boolean;
  python_version?: string;
  mt5_package_installed: boolean;
  terminals_count: number;
  terminals: TerminalInfo[];
  terminal_running: boolean;
  error?: string;
}

export interface ActiveChartInfo {
  symbol: string;
  period_size: string;
  timeframe: string;
  mtime: number;
  profile: string;
}

export interface SyncChartResult {
  success: boolean;
  symbol: string;
  active_timeframe: string;
  total_bars_imported: number;
  db_path: string;
  profile: {
    symbol: string;
    digits: number;
    point: number;
    description: string;
  };
  timeframes_data?: Record<string, any[]>;
  error?: string;
}

export interface TradableSymbolInfo {
  name: string;
  description: string;
  path: string;
  category: string;
  subCategory: string;
  digits: number;
  point: number;
  spread: number;
  bid: number;
  ask: number;
  selected: boolean;
}

export interface TradableSymbolsResult {
  categories: string[];
  symbols: TradableSymbolInfo[];
  count: number;
}

export interface LiveTickData {
  bid: number;
  ask: number;
  last: number;
  spread: number;
  time_msc: number;
}

export interface LiveStreamUpdate {
  type: 'stream_update' | 'stream_error';
  symbol: string;
  timeframe: string;
  tick?: LiveTickData;
  bars?: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  error?: string;
}

interface ElectronBridgeAPI {
  checkSystem: () => Promise<{ status: string; data?: SystemCheckResult; error?: string; python_missing?: boolean }>;
  listTerminals: () => Promise<{ status: string; data?: TerminalInfo[]; error?: string }>;
  getActiveChart: (params?: { terminal_path?: string }) => Promise<{ status: string; data?: ActiveChartInfo; error?: string }>;
  syncChart: (params?: { terminal_path?: string; bar_count?: number; db_path?: string }) => Promise<{ status: string; data?: SyncChartResult; error?: string }>;
  getTradableSymbols: (params?: { terminal_path?: string }) => Promise<{ status: string; data?: TradableSymbolsResult; error?: string }>;
  getSymbolsTicks: (params: { symbols: string[]; terminal_path?: string }) => Promise<{ status: string; data?: { success: boolean; ticks: Record<string, LiveTickData> }; error?: string }>;
  getStoredSeries: (params: { symbol: string; timeframe: string; db_path?: string }) => Promise<{ status: string; data?: { symbol: string; timeframe: string; bars_count: number; bars: any[] }; error?: string }>;
  fetchTimeframe: (params: { symbol: string; timeframe: string; bar_count?: number; terminal_path?: string; db_path?: string }) => Promise<{ status: string; data?: { symbol: string; timeframe: string; bars_count: number; bars: any[] }; error?: string }>;
  refreshIncremental: (params: { symbol: string; timeframe: string; terminal_path?: string; db_path?: string }) => Promise<{ status: string; data?: { symbol: string; timeframe: string; new_bars_count: number; new_bars: any[] }; error?: string }>;
  subscribeStream: (params: { symbol: string; timeframe: string; terminal_path?: string; db_path?: string }) => Promise<{ status: string; streaming?: boolean; error?: string }>;
  unsubscribeStream: () => Promise<{ status: string; streaming?: boolean; error?: string }>;
  onLiveFeed: (callback: (data: LiveStreamUpdate) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: {
      openExternal: (url: string) => void;
      setStartup: (settings: { login: boolean; hidden: boolean }) => void;
      setThemeMode?: (mode: string) => void;
      minimizeWindow?: () => void;
      toggleMaximizeWindow?: () => void;
      closeWindow?: () => void;
      isMaximized?: () => Promise<boolean>;
      mt5?: ElectronBridgeAPI;
    };
  }
}

export const mt5BridgeClient = {
  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI?.mt5;
  },

  openExternal(url: string) {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  },

  async checkSystem(): Promise<SystemCheckResult> {
    if (!this.isAvailable()) {
      return {
        python_installed: false,
        mt5_package_installed: false,
        terminals_count: 0,
        terminals: [],
        terminal_running: false,
        error: 'Bridge is only available in the FX Freeplay desktop application.',
      };
    }
    const res = await window.electronAPI!.mt5!.checkSystem();
    if (res.status === 'ok' && res.data) {
      return res.data;
    }
    return {
      python_installed: !res.python_missing,
      mt5_package_installed: false,
      terminals_count: 0,
      terminals: [],
      terminal_running: false,
      error: res.error || 'Failed to check system dependencies.',
    };
  },

  async listTerminals(): Promise<TerminalInfo[]> {
    if (!this.isAvailable()) return [];
    const res = await window.electronAPI!.mt5!.listTerminals();
    return res.status === 'ok' && res.data ? res.data : [];
  },

  async getActiveChart(terminalPath?: string): Promise<ActiveChartInfo | null> {
    if (!this.isAvailable()) return null;
    const res = await window.electronAPI!.mt5!.getActiveChart({ terminal_path: terminalPath });
    return res.status === 'ok' && res.data ? res.data : null;
  },

  async syncChart(terminalPath?: string, barCount: number = 50000): Promise<SyncChartResult> {
    if (!this.isAvailable()) {
      throw new Error('Bridge is only available in the desktop application.');
    }
    const res = await window.electronAPI!.mt5!.syncChart({ terminal_path: terminalPath, bar_count: barCount });
    if (res.status === 'ok' && res.data) {
      return res.data;
    }
    throw new Error(res.error || 'Failed to synchronize chart data from MetaTrader 5.');
  },

  async getTradableSymbols(terminalPath?: string): Promise<TradableSymbolsResult> {
    if (!this.isAvailable() || !window.electronAPI?.mt5?.getTradableSymbols) {
      return { categories: [], symbols: [], count: 0 };
    }
    try {
      const res = await window.electronAPI.mt5.getTradableSymbols({ terminal_path: terminalPath });
      if (res.status === 'ok' && res.data) {
        return res.data;
      }
    } catch (e) {
      console.warn('[mt5BridgeClient] Failed to get tradable symbols:', e);
    }
    return { categories: [], symbols: [], count: 0 };
  },

  async getSymbolsTicks(symbols: string[], terminalPath?: string): Promise<Record<string, LiveTickData>> {
    if (!this.isAvailable() || !window.electronAPI?.mt5?.getSymbolsTicks || symbols.length === 0) {
      return {};
    }
    try {
      const res = await window.electronAPI.mt5.getSymbolsTicks({ symbols, terminal_path: terminalPath });
      if (res.status === 'ok' && res.data?.ticks) {
        return res.data.ticks;
      }
    } catch (e) {
      console.warn('[mt5BridgeClient] Failed to get symbols ticks:', e);
    }
    return {};
  },

  async getStoredSeries(symbol: string, timeframe: string): Promise<any[]> {
    if (!this.isAvailable() || !window.electronAPI?.mt5?.getStoredSeries) return [];
    try {
      const res = await window.electronAPI.mt5.getStoredSeries({ symbol, timeframe });
      if (res.status === 'ok' && res.data?.bars) {
        return res.data.bars;
      }
    } catch (e) {
      console.warn(`[mt5BridgeClient] Failed to read stored series for ${symbol} (${timeframe}):`, e);
    }
    return [];
  },

  async fetchTimeframe(symbol: string, timeframe: string, barCount: number = 50000, terminalPath?: string): Promise<any[]> {
    if (!this.isAvailable()) return [];
    try {
      const res = await window.electronAPI!.mt5!.fetchTimeframe({
        symbol,
        timeframe,
        bar_count: barCount,
        terminal_path: terminalPath,
      });
      if (res.status === 'ok' && res.data?.bars) {
        return res.data.bars;
      }
    } catch (e) {
      console.warn(`[mt5BridgeClient] Failed to fetch timeframe ${timeframe} for ${symbol}:`, e);
    }
    return [];
  },

  async refreshIncremental(symbol: string, timeframe: string, terminalPath?: string): Promise<{ new_bars_count: number; new_bars: any[] }> {
    if (!this.isAvailable()) return { new_bars_count: 0, new_bars: [] };
    try {
      const res = await window.electronAPI!.mt5!.refreshIncremental({
        symbol,
        timeframe,
        terminal_path: terminalPath,
      });
      if (res.status === 'ok' && res.data) {
        return res.data;
      }
    } catch (e) {
      console.warn(`[mt5BridgeClient] Failed to refresh incremental bars for ${symbol} (${timeframe}):`, e);
    }
    return { new_bars_count: 0, new_bars: [] };
  },

  async subscribeStream(symbol: string, timeframe: string, terminalPath?: string, dbPath?: string): Promise<boolean> {
    if (!this.isAvailable() || !window.electronAPI?.mt5?.subscribeStream) return false;
    try {
      const res = await window.electronAPI.mt5.subscribeStream({
        symbol,
        timeframe,
        terminal_path: terminalPath,
        db_path: dbPath,
      });
      return res.status === 'ok';
    } catch (e) {
      console.warn(`[mt5BridgeClient] Failed to subscribe stream for ${symbol} (${timeframe}):`, e);
      return false;
    }
  },

  async unsubscribeStream(): Promise<boolean> {
    if (!this.isAvailable() || !window.electronAPI?.mt5?.unsubscribeStream) return false;
    try {
      const res = await window.electronAPI.mt5.unsubscribeStream();
      return res.status === 'ok';
    } catch (e) {
      console.warn('[mt5BridgeClient] Failed to unsubscribe stream:', e);
      return false;
    }
  },

  onLiveFeed(callback: (data: LiveStreamUpdate) => void): () => void {
    if (!this.isAvailable() || !window.electronAPI?.mt5?.onLiveFeed) {
      return () => {};
    }
    return window.electronAPI.mt5.onLiveFeed(callback);
  },
};
