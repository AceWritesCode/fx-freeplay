import { create } from 'zustand';
import type { WatchlistSymbol } from './types';
import { persistenceService } from '@/engine/workspace/persistence';

interface WatchlistState {
  watchlistSymbols: WatchlistSymbol[];
  activeWatchlistSymbol: string | null;
  savedFolderHandle: any | null;
  savedFolderHandles: any[];
  symbolFilesMap: Record<string, Record<string, File>>;
  importMode: 'single' | 'folder';

  // Actions
  setWatchlistSymbols: (symbols: WatchlistSymbol[]) => void;
  setActiveWatchlistSymbol: (symbol: string | null) => void;
  setSavedFolderHandle: (handle: any | null) => void;
  setSavedFolderHandles: (handles: any[]) => void;
  setSymbolFilesMap: (map: Record<string, Record<string, File>>) => void;
  setImportMode: (mode: 'single' | 'folder') => void;
  addWatchlistSymbol: (name: string) => void;
  removeWatchlistSymbol: (name: string) => void;
}

export const useWatchlistStore = create<WatchlistState>((set) => {
  const initialImportMode = persistenceService.getImportMode();

  return {
    watchlistSymbols: [],
    activeWatchlistSymbol: null,
    savedFolderHandle: null,
    savedFolderHandles: [],
    symbolFilesMap: {},
    importMode: initialImportMode,

    setWatchlistSymbols: (symbols) => set(() => ({ watchlistSymbols: symbols })),
    
    setActiveWatchlistSymbol: (symbol) => set(() => ({ activeWatchlistSymbol: symbol })),
    
    setSavedFolderHandle: (handle) => set(() => ({ savedFolderHandle: handle })),
    
    setSavedFolderHandles: (handles) => set(() => ({ savedFolderHandles: handles })),
    
    setSymbolFilesMap: (map) => set(() => ({ symbolFilesMap: map })),
    
    setImportMode: (mode) =>
      set(() => {
        persistenceService.setImportMode(mode);
        return { importMode: mode };
      }),

    addWatchlistSymbol: (name) =>
      set((state) => {
        if (state.watchlistSymbols.some((s) => s.name === name)) return {};
        const updated = [...state.watchlistSymbols, { name }];
        return { watchlistSymbols: updated };
      }),

    removeWatchlistSymbol: (name) =>
      set((state) => {
        const updated = state.watchlistSymbols.filter((s) => s.name !== name);
        return { watchlistSymbols: updated };
      }),
  };
});
