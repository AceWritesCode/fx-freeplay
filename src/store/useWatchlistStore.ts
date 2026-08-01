import { create } from 'zustand';
import type { WatchlistSymbol } from './types';

interface WatchlistState {
  watchlistSymbols: WatchlistSymbol[];
  activeWatchlistSymbol: string | null;
  savedFolderHandle: any | null;
  savedFolderHandles: any[];
  symbolFilesMap: Record<string, Record<string, File>>;
  importMode: 'single' | 'folder';

  // Actions
  setInitialState: (config: Partial<WatchlistState>) => void;
  setWatchlistSymbols: (symbols: WatchlistSymbol[]) => void;
  setActiveWatchlistSymbol: (symbol: string | null) => void;
  setSavedFolderHandle: (handle: any | null) => void;
  setSavedFolderHandles: (handles: any[]) => void;
  setSymbolFilesMap: (map: Record<string, Record<string, File>>) => void;
  setImportMode: (mode: 'single' | 'folder') => void;
  addWatchlistSymbol: (name: string) => void;
  removeWatchlistSymbol: (name: string) => void;
}

export const useWatchlistStore = create<WatchlistState>((set) => ({
  watchlistSymbols: [],
  activeWatchlistSymbol: null,
  savedFolderHandle: null,
  savedFolderHandles: [],
  symbolFilesMap: {},
  importMode: 'single',

  setInitialState: (config) =>
    set((state) => ({ ...state, ...config })),

  setWatchlistSymbols: (symbols) => set(() => ({ watchlistSymbols: symbols })),
  
  setActiveWatchlistSymbol: (symbol) => set(() => ({ activeWatchlistSymbol: symbol })),
  
  setSavedFolderHandle: (handle) => set(() => ({ savedFolderHandle: handle })),
  
  setSavedFolderHandles: (handles) => set(() => ({ savedFolderHandles: handles })),
  
  setSymbolFilesMap: (map) => set(() => ({ symbolFilesMap: map })),
  
  setImportMode: (mode) => set(() => ({ importMode: mode })),

  addWatchlistSymbol: (name) =>
    set((state) => {
      if (state.watchlistSymbols.some((s) => s.name === name)) return {};
      return { watchlistSymbols: [...state.watchlistSymbols, { name }] };
    }),

  removeWatchlistSymbol: (name) =>
    set((state) => ({
      watchlistSymbols: state.watchlistSymbols.filter((s) => s.name !== name),
    })),
}));
