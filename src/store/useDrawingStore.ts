import { create } from 'zustand';
import type { DrawingInstance, FolderItem } from './types';

interface DrawingState {
  drawings: DrawingInstance[];
  folders: FolderItem[];
  selectedOverlayIds: string[];

  // Actions
  setDrawings: (drawings: DrawingInstance[]) => void;
  addDrawing: (drawing: DrawingInstance) => void;
  updateDrawing: (id: string, updates: Partial<DrawingInstance>) => void;
  removeDrawing: (id: string) => void;
  setFolders: (folders: FolderItem[] | ((prev: FolderItem[]) => FolderItem[])) => void;
  addFolder: (folder: FolderItem) => void;
  updateFolder: (id: string, updates: Partial<FolderItem>) => void;
  removeFolder: (id: string) => void;
  setSelectedOverlayIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  clearDrawings: () => void;
}

export const useDrawingStore = create<DrawingState>((set) => ({
  drawings: [],
  folders: [],
  selectedOverlayIds: [],

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
  
  clearDrawings: () => set(() => ({ drawings: [], selectedOverlayIds: [] })),
}));
