import { create } from 'zustand';
import type { DrawingInstance, FolderItem } from './types';

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

  // Symbol-Keyed Store Actions
  setSymbolDrawings: (symbol: string, drawings: DrawingItem[]) => void;
  addSymbolDrawing: (symbol: string, drawing: DrawingItem) => void;
  updateSymbolDrawing: (symbol: string, id: string, updates: Partial<DrawingItem>) => void;
  removeSymbolDrawing: (symbol: string, id: string) => void;
  clearSymbolDrawings: (symbol: string) => void;
  getSymbolDrawings: (symbol: string) => DrawingItem[];

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

  // Symbol-Keyed Actions
  setSymbolDrawings: (symbol, drawings) => {
    if (!symbol) return;
    const key = symbol.toUpperCase();
    set((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [key]: drawings,
      },
    }));
  },

  addSymbolDrawing: (symbol, drawing) => {
    if (!symbol || !drawing) return;
    const key = symbol.toUpperCase();
    set((state) => {
      const existing = state.drawingsBySymbol[key] || [];
      if (existing.some((d) => d.id === drawing.id)) {
        return {
          drawingsBySymbol: {
            ...state.drawingsBySymbol,
            [key]: existing.map((d) => (d.id === drawing.id ? { ...d, ...drawing } : d)),
          },
        };
      }
      return {
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [key]: [...existing, drawing],
        },
      };
    });
  },

  updateSymbolDrawing: (symbol, id, updates) => {
    if (!symbol || !id) return;
    const key = symbol.toUpperCase();
    set((state) => {
      const existing = state.drawingsBySymbol[key] || [];
      return {
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [key]: existing.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        },
      };
    });
  },

  removeSymbolDrawing: (symbol, id) => {
    if (!symbol || !id) return;
    const key = symbol.toUpperCase();
    set((state) => {
      const existing = state.drawingsBySymbol[key] || [];
      return {
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [key]: existing.filter((d) => d.id !== id),
        },
      };
    });
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
  },

  getSymbolDrawings: (symbol) => {
    if (!symbol) return [];
    const key = symbol.toUpperCase();
    return get().drawingsBySymbol[key] || [];
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
