import { create } from 'zustand';
import type { DrawingInstance, FolderItem } from './types';
import { drawingRepository } from '@/repository';

export interface DrawingItem {
  id: string;
  name: string;
  points: any[];
  extendData?: Record<string, any>;
  lock?: boolean;
  visible?: boolean;
  symbol?: string;
  [key: string]: any;
}

interface DrawingState {
  // Authoritative Symbol-Keyed State
  drawingsBySymbol: Record<string, DrawingItem[]>;
  
  // Legacy / UI Selection & Folder State
  drawings: DrawingInstance[];
  folders: FolderItem[];
  selectedOverlayIds: string[];

  // IndexedDB Bridge & Symbol-Keyed Store Actions
  loadSymbolDrawings: (symbol: string) => Promise<DrawingItem[]>;
  loadAllSymbolDrawings: (symbols: string[]) => Promise<Record<string, DrawingItem[]>>;
  setSymbolDrawings: (symbol: string, drawings: DrawingItem[]) => void;
  addSymbolDrawing: (symbol: string, drawing: DrawingItem) => void;
  updateSymbolDrawing: (symbol: string, id: string, updates: Partial<DrawingItem>) => void;
  removeSymbolDrawing: (symbol: string, id: string) => void;
  clearSymbolDrawings: (symbol: string) => void;
  getSymbolDrawings: (symbol: string) => DrawingItem[];
  findSymbolByDrawingId: (id: string) => { symbol: string; drawing: DrawingItem } | null;
  removeSymbolDrawingById: (id: string) => void;

  // General & Legacy Store Actions
  setDrawings: (drawings: DrawingInstance[]) => void;
  addDrawing: (drawing: DrawingInstance) => void;
  updateDrawing: (id: string, updates: Partial<DrawingInstance>) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
  
  setFolders: (folders: FolderItem[] | ((prev: FolderItem[]) => FolderItem[])) => void;
  addFolder: (folder: FolderItem) => void;
  updateFolder: (id: string, updates: Partial<FolderItem>) => void;
  removeFolder: (id: string) => void;
  setSelectedOverlayIds: (ids: string[] | ((prev: string[]) => string[])) => void;
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
  drawingsBySymbol: {},
  drawings: [],
  folders: [],
  selectedOverlayIds: [],

  // Load from IndexedDB into store state
  loadSymbolDrawings: async (symbol: string) => {
    if (!symbol) return [];
    const key = symbol.toUpperCase();
    try {
      const saved = await drawingRepository.getDrawings(key);
      const items = saved || [];
      set((state) => ({
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [key]: items,
        },
      }));
      return items;
    } catch (err) {
      console.error(`[useDrawingStore] Failed to load drawings for ${key}:`, err);
      return [];
    }
  },

  loadAllSymbolDrawings: async (symbols: string[]) => {
    if (!symbols || symbols.length === 0) return {};
    const nextMap: Record<string, DrawingItem[]> = { ...get().drawingsBySymbol };
    await Promise.all(
      symbols.map(async (sym) => {
        if (!sym) return;
        const key = sym.toUpperCase();
        try {
          const saved = await drawingRepository.getDrawings(key);
          nextMap[key] = saved || [];
        } catch (err) {
          console.error(`[useDrawingStore] Failed to pre-load drawings for ${key}:`, err);
          nextMap[key] = nextMap[key] || [];
        }
      })
    );
    set({ drawingsBySymbol: nextMap });
    return nextMap;
  },

  // Symbol-Keyed Actions (Auto-persisted to IndexedDB)
  setSymbolDrawings: (symbol, drawings) => {
    if (!symbol) return;
    const key = symbol.toUpperCase();
    set((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [key]: drawings,
      },
    }));
    drawingRepository.saveDrawings(key, drawings);
  },

  addSymbolDrawing: (symbol, drawing) => {
    if (!symbol || !drawing) return;
    const key = symbol.toUpperCase();
    let updatedList: DrawingItem[] = [];
    set((state) => {
      const existing = state.drawingsBySymbol[key] || [];
      if (existing.some((d) => d.id === drawing.id)) {
        updatedList = existing.map((d) => (d.id === drawing.id ? { ...d, ...drawing } : d));
      } else {
        updatedList = [...existing, drawing];
      }
      return {
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [key]: updatedList,
        },
      };
    });
    drawingRepository.saveDrawings(key, updatedList);
  },

  updateSymbolDrawing: (symbol, id, updates) => {
    if (!symbol || !id) return;
    const key = symbol.toUpperCase();
    let updatedList: DrawingItem[] = [];
    set((state) => {
      const existing = state.drawingsBySymbol[key] || [];
      updatedList = existing.map((d) => {
        if (d.id === id) {
          const mergedExtendData = updates.extendData
            ? {
                ...d.extendData,
                ...updates.extendData,
                // IMMUTABLE INVARIANT: sourceSlotIndex can never be altered or lost after creation
                sourceSlotIndex: d.extendData?.sourceSlotIndex ?? updates.extendData?.sourceSlotIndex ?? 0,
              }
            : d.extendData;

          return {
            ...d,
            ...updates,
            extendData: mergedExtendData,
          };
        }
        return d;
      });
      return {
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [key]: updatedList,
        },
      };
    });
    drawingRepository.saveDrawings(key, updatedList);
  },

  removeSymbolDrawing: (symbol, id) => {
    if (!symbol || !id) return;
    const key = symbol.toUpperCase();
    let updatedList: DrawingItem[] = [];
    set((state) => {
      const existing = state.drawingsBySymbol[key] || [];
      updatedList = existing.filter((d) => d.id !== id);
      return {
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [key]: updatedList,
        },
      };
    });
    drawingRepository.saveDrawings(key, updatedList);
  },

  clearSymbolDrawings: (symbol) => {
    if (!symbol) return;
    const key = symbol.toUpperCase();
    set((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [key]: [],
      },
    }));
    drawingRepository.clearDrawings(key);
  },

  getSymbolDrawings: (symbol) => {
    if (!symbol) return [];
    return get().drawingsBySymbol[symbol.toUpperCase()] || [];
  },

  findSymbolByDrawingId: (id) => {
    if (!id) return null;
    const syncMatch = id.match(/^sync_(.+)_from_(\d+)$/);
    const targetId = syncMatch ? syncMatch[1] : id;

    const drawingsBySymbol = get().drawingsBySymbol;
    for (const symbol in drawingsBySymbol) {
      const drawing = drawingsBySymbol[symbol]?.find((d) => d.id === targetId);
      if (drawing) {
        return { symbol, drawing };
      }
    }
    return null;
  },

  removeSymbolDrawingById: (id) => {
    if (!id) return;
    const syncMatch = id.match(/^sync_(.+)_from_(\d+)$/);
    const originalId = syncMatch ? syncMatch[1] : id;

    const resolved = get().findSymbolByDrawingId(originalId);
    if (resolved) {
      get().removeSymbolDrawing(resolved.symbol, originalId);
    }
  },

  // Legacy Actions (Preserved for compatibility)
  setDrawings: (drawings) => set(() => ({ drawings })),

  addDrawing: (drawing) => set((state) => ({ drawings: [...state.drawings, drawing] })),

  updateDrawing: (id, updates) =>
    set((state) => ({
      drawings: state.drawings.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),

  removeDrawing: (id) =>
    set((state) => ({
      drawings: state.drawings.filter((d) => d.id !== id),
    })),

  clearDrawings: () => set(() => ({ drawings: [], selectedOverlayIds: [] })),

  setFolders: (folders) =>
    set((state) => ({
      folders: typeof folders === 'function' ? folders(state.folders) : folders,
    })),

  addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),

  updateFolder: (id, updates) =>
    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),

  removeFolder: (id) =>
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
    })),

  setSelectedOverlayIds: (ids) =>
    set((state) => ({
      selectedOverlayIds: typeof ids === 'function' ? ids(state.selectedOverlayIds) : ids,
    })),
}));
