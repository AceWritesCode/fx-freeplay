import type { WatchlistSymbol } from '@/store/types';
import type { WatchlistRepository } from './types';
import { executeTx, STORES } from './db';

const KEYS = {
  SYMBOLS: 'watchlist_symbols',
  FOLDER_HANDLES: 'folder_handles',
  IMPORT_MODE: 'import_mode',
  ACTIVE_SYMBOL: 'active_symbol',
};

export class WatchlistRepositoryImpl implements WatchlistRepository {
  async getWatchlistSymbols(): Promise<WatchlistSymbol[]> {
    const symbols = await executeTx<WatchlistSymbol[] | undefined>(
      STORES.WATCHLIST,
      'readonly',
      (store) => store.get(KEYS.SYMBOLS)
    );
    return symbols || [];
  }

  async saveWatchlistSymbols(symbols: WatchlistSymbol[]): Promise<void> {
    await executeTx(STORES.WATCHLIST, 'readwrite', (store) => store.put(symbols, KEYS.SYMBOLS));
  }

  async getFolderHandles(): Promise<any[]> {
    const handles = await executeTx<any[] | undefined>(
      STORES.WATCHLIST,
      'readonly',
      (store) => store.get(KEYS.FOLDER_HANDLES)
    );
    return handles || [];
  }

  async saveFolderHandles(handles: any[]): Promise<void> {
    await executeTx(STORES.WATCHLIST, 'readwrite', (store) =>
      store.put(handles, KEYS.FOLDER_HANDLES)
    );
  }

  async getImportMode(): Promise<'single' | 'folder'> {
    const mode = await executeTx<'single' | 'folder' | undefined>(
      STORES.WATCHLIST,
      'readonly',
      (store) => store.get(KEYS.IMPORT_MODE)
    );
    return mode || 'single';
  }

  async saveImportMode(mode: 'single' | 'folder'): Promise<void> {
    await executeTx(STORES.WATCHLIST, 'readwrite', (store) => store.put(mode, KEYS.IMPORT_MODE));
  }

  async getActiveSymbol(): Promise<string | null> {
    const symbol = await executeTx<string | undefined>(
      STORES.WATCHLIST,
      'readonly',
      (store) => store.get(KEYS.ACTIVE_SYMBOL)
    );
    return symbol || null;
  }

  async saveActiveSymbol(symbol: string | null): Promise<void> {
    await executeTx(STORES.WATCHLIST, 'readwrite', (store) =>
      store.put(symbol, KEYS.ACTIVE_SYMBOL)
    );
  }

  async getSymbolProfile(symbol: string): Promise<any | null> {
    const profile = await executeTx<any | undefined>(
      STORES.METADATA,
      'readonly',
      (store) => store.get(`profile:${symbol.toUpperCase()}`)
    );
    return profile || null;
  }

  async saveSymbolProfile(symbol: string, profile: any): Promise<void> {
    await executeTx(STORES.METADATA, 'readwrite', (store) =>
      store.put(profile, `profile:${symbol.toUpperCase()}`)
    );
  }

  async deleteSymbolProfile(symbol: string): Promise<void> {
    await executeTx(STORES.METADATA, 'readwrite', (store) =>
      store.delete(`profile:${symbol.toUpperCase()}`)
    );
  }

  async clearAllSymbolProfiles(): Promise<void> {
    await executeTx(STORES.METADATA, 'readwrite', (store) => store.clear());
  }
}
