import { create } from 'zustand';
import type { FolderItem } from './types';
import { drawingRepository } from '@/repository';
import { getOriginalDrawingId } from '@/engine/charting';
import {
  type SymbolOrderState,
  type DrawingFolderLookup,
  normalizeOrderSequence,
  bringToFront,
  sendToBack,
  bringForward,
  sendBackward,
  moveFolderBlock,
  moveDrawingIntoFolder,
  moveDrawingOutOfFolder,
  insertDrawing,
  duplicateDrawing,
  deleteFromSequence,
  migrateLegacyOrderToCanonical,
} from '@/engine/charting/orderEngine';

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
  
  // UI Selection & Folder State
  folders: FolderItem[];
  selectedOverlayIds: string[];

  // IndexedDB Bridge & Symbol-Keyed Store Actions
  loadSymbolDrawings: (symbol: string) => Promise<DrawingItem[]>;
  loadAllSymbolDrawings: (symbols: string[]) => Promise<Record<string, DrawingItem[]>>;
  setSymbolDrawings: (symbol: string, drawings: DrawingItem[]) => void;
  addSymbolDrawing: (symbol: string, drawing: DrawingItem) => void;
  duplicateSymbolDrawing: (symbol: string, sourceId: string, cloneId: string) => void;
  updateSymbolDrawing: (symbol: string, id: string, updates: Partial<DrawingItem>) => void;
  batchUpdateSymbolDrawings: (
    symbol: string,
    updates: { id: string; updates: Partial<DrawingItem> }[] | ((item: DrawingItem) => Partial<DrawingItem> | null | undefined)
  ) => void;
  batchRemoveSymbolDrawings: (symbol: string, ids: string[]) => void;
  setDrawingsVisibility: (symbol: string, ids: string[], isVisible: boolean) => void;
  setDrawingsLock: (symbol: string, ids: string[], isLocked: boolean) => void;
  removeSymbolDrawing: (symbol: string, id: string) => void;
  clearSymbolDrawings: (symbol: string) => void;
  getSymbolDrawings: (symbol: string) => DrawingItem[];
  findSymbolByDrawingId: (id: string) => { symbol: string; drawing: DrawingItem } | null;
  removeSymbolDrawingById: (id: string) => void;

  // Folder & Selection Actions
  loadSymbolFolders: (symbol: string) => Promise<FolderItem[]>;
  saveSymbolFolders: (symbol: string, folders: FolderItem[]) => Promise<void>;
  createSymbolFolder: (symbol: string, folder?: Partial<FolderItem>, assignedDrawingIds?: string[]) => FolderItem;
  updateSymbolFolder: (symbol: string, id: string, updates: Partial<FolderItem>) => void;
  deleteSymbolFolder: (symbol: string, folderId: string) => void;
  setFolderVisibility: (symbol: string, folderId: string, isVisible: boolean) => void;
  setFolderLock: (symbol: string, folderId: string, isLocked: boolean) => void;
  setFolders: (folders: FolderItem[] | ((prev: FolderItem[]) => FolderItem[])) => void;
  updateFolder: (id: string, updates: Partial<FolderItem>) => void;
  removeFolder: (id: string) => void;
  setSelectedOverlayIds: (ids: string[] | ((prev: string[]) => string[])) => void;

  // Canonical Ordering Actions (Phase 2A & 2B)
  orderStateBySymbol: Record<string, SymbolOrderState>;
  loadSymbolOrderState: (symbol: string) => Promise<SymbolOrderState | null>;
  getSymbolOrderSequence: (symbol: string) => string[];
  setSymbolOrderSequence: (symbol: string, sequence: string[]) => void;
  reorderSymbolItem: (symbol: string, targetId: string, action: 'front' | 'back' | 'forward' | 'backward') => void;
  moveSymbolFolderBlock: (symbol: string, folderId: string, targetId: string, position: 'above' | 'below') => void;
  moveSymbolDrawingFolder: (symbol: string, drawingId: string, targetFolderId: string | null, placement?: 'top' | 'bottom' | 'above_folder' | 'below_folder') => void;

  // Favorite Tools
  favoriteTools: string[];
  isFavoriteToolbarOpen: boolean;
  toggleFavoriteTool: (toolId: string) => void;
  reorderFavoriteTools: (newOrder: string[]) => void;
  setFavoriteToolbarOpen: (open: boolean) => void;

  // Stay in Drawing Mode
  isStayInDrawingMode: boolean;
  setStayInDrawingMode: (active: boolean) => void;
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
  drawingsBySymbol: {},
  folders: [],
  selectedOverlayIds: [],
  favoriteTools: (() => {
    try {
      const saved = localStorage.getItem('fx_favorite_tools');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  })(),
  isFavoriteToolbarOpen: (() => {
    try {
      return localStorage.getItem('fx_favorite_toolbar_open') === 'true';
    } catch (_) {
      return false;
    }
  })(),

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
      // Asynchronously hydrate or migrate canonical order state for this symbol
      get().loadSymbolOrderState(key).catch((err) => {
        console.warn(`[useDrawingStore] Failed to hydrate order state in loadSymbolDrawings for ${key}:`, err);
      });
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
    const existingList = get().drawingsBySymbol[key] || [];
    const isNewDrawing = !existingList.some((d) => d.id === drawing.id);

    // Read current canonical sequence BEFORE updating drawingsBySymbol
    const currentSeq = isNewDrawing ? get().getSymbolOrderSequence(key) : [];

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

    // Synchronize canonical order sequence for new drawings (Phase 2C-4A)
    if (isNewDrawing) {
      const folderId = drawing.extendData?.folderId ?? null;
      const lookup: DrawingFolderLookup = {};
      updatedList.forEach((d) => {
        lookup[d.id] = d.extendData?.folderId;
      });
      const nextSeq = insertDrawing(currentSeq, drawing.id, folderId, lookup);
      get().setSymbolOrderSequence(key, nextSeq);
    }
  },

  duplicateSymbolDrawing: (symbol, sourceId, cloneId) => {
    if (!symbol || !sourceId || !cloneId) return;
    const key = symbol.toUpperCase();
    const existingList = get().drawingsBySymbol[key] || [];
    const sourceItem = existingList.find((d) => d.id === sourceId);
    if (!sourceItem) return;

    // Read current canonical sequence BEFORE updating drawingsBySymbol
    const currentSeq = get().getSymbolOrderSequence(key);

    const clonedItem: DrawingItem = {
      ...sourceItem,
      id: cloneId,
      points: JSON.parse(JSON.stringify(sourceItem.points || [])),
      extendData: sourceItem.extendData ? JSON.parse(JSON.stringify(sourceItem.extendData)) : undefined,
    };

    let updatedList: DrawingItem[] = [];
    set((state) => {
      const existing = state.drawingsBySymbol[key] || [];
      updatedList = [...existing, clonedItem];
      return {
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [key]: updatedList,
        },
      };
    });

    drawingRepository.saveDrawings(key, updatedList);

    // Synchronize canonical order sequence: place duplicate immediately before/in front of source
    const nextSeq = duplicateDrawing(currentSeq, sourceId, cloneId);
    get().setSymbolOrderSequence(key, nextSeq);
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

  batchUpdateSymbolDrawings: (symbol, updates) => {
    if (!symbol || !updates) return;
    const key = symbol.toUpperCase();
    let updatedList: DrawingItem[] = [];
    let hasModified = false;

    set((state) => {
      const existing = state.drawingsBySymbol[key] || [];

      if (typeof updates === 'function') {
        updatedList = existing.map((d) => {
          const itemUpdate = updates(d);
          if (itemUpdate) {
            hasModified = true;
            const mergedExtendData = itemUpdate.extendData
              ? {
                  ...d.extendData,
                  ...itemUpdate.extendData,
                  sourceSlotIndex: d.extendData?.sourceSlotIndex ?? itemUpdate.extendData?.sourceSlotIndex ?? 0,
                }
              : d.extendData;
            return {
              ...d,
              ...itemUpdate,
              extendData: mergedExtendData,
            };
          }
          return d;
        });
      } else {
        const updateMap = new Map(updates.map((u) => [u.id, u.updates]));
        updatedList = existing.map((d) => {
          const itemUpdate = updateMap.get(d.id);
          if (itemUpdate) {
            hasModified = true;
            const mergedExtendData = itemUpdate.extendData
              ? {
                  ...d.extendData,
                  ...itemUpdate.extendData,
                  sourceSlotIndex: d.extendData?.sourceSlotIndex ?? itemUpdate.extendData?.sourceSlotIndex ?? 0,
                }
              : d.extendData;
            return {
              ...d,
              ...itemUpdate,
              extendData: mergedExtendData,
            };
          }
          return d;
        });
      }

      if (!hasModified) return state;

      return {
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [key]: updatedList,
        },
      };
    });

    if (hasModified) {
      drawingRepository.saveDrawings(key, updatedList);
    }
  },

  batchRemoveSymbolDrawings: (symbol, ids) => {
    if (!symbol || !ids || ids.length === 0) return;
    const key = symbol.toUpperCase();
    const idSet = new Set(ids);
    let updatedList: DrawingItem[] = [];
    let hasModified = false;

    set((state) => {
      const existing = state.drawingsBySymbol[key] || [];
      updatedList = existing.filter((d) => {
        if (idSet.has(d.id)) {
          hasModified = true;
          return false;
        }
        return true;
      });

      if (!hasModified) return state;

      return {
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [key]: updatedList,
        },
      };
    });

    if (hasModified) {
      drawingRepository.saveDrawings(key, updatedList);

      // Synchronize canonical order sequence: remove deleted IDs (Phase 2C-4A)
      let nextSeq = get().getSymbolOrderSequence(key);
      ids.forEach((id) => {
        nextSeq = deleteFromSequence(nextSeq, id);
      });
      get().setSymbolOrderSequence(key, nextSeq);
    }
  },

  setDrawingsVisibility: (symbol, ids, isVisible) => {
    if (!symbol || !ids || ids.length === 0) return;
    const key = symbol.toUpperCase();
    const idSet = new Set(ids);
    let updatedList: DrawingItem[] = [];
    let hasModified = false;

    set((state) => {
      const existing = state.drawingsBySymbol[key] || [];
      updatedList = existing.map((d) => {
        if (idSet.has(d.id)) {
          hasModified = true;
          return { ...d, visible: isVisible };
        }
        return d;
      });

      if (!hasModified) return state;

      return {
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [key]: updatedList,
        },
      };
    });

    if (hasModified) {
      drawingRepository.saveDrawings(key, updatedList);
    }
  },

  setDrawingsLock: (symbol, ids, isLocked) => {
    if (!symbol || !ids || ids.length === 0) return;
    const key = symbol.toUpperCase();
    const idSet = new Set(ids);
    let updatedList: DrawingItem[] = [];
    let hasModified = false;

    set((state) => {
      const existing = state.drawingsBySymbol[key] || [];
      updatedList = existing.map((d) => {
        if (idSet.has(d.id)) {
          hasModified = true;
          return { ...d, lock: isLocked };
        }
        return d;
      });

      if (!hasModified) return state;

      return {
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [key]: updatedList,
        },
      };
    });

    if (hasModified) {
      drawingRepository.saveDrawings(key, updatedList);
    }
  },

  removeSymbolDrawing: (symbol, id) => {
    if (!symbol || !id) return;
    get().batchRemoveSymbolDrawings(symbol, [id]);
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
    const targetId = getOriginalDrawingId(id);

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
    const originalId = getOriginalDrawingId(id);

    const resolved = get().findSymbolByDrawingId(originalId);
    if (resolved) {
      get().removeSymbolDrawing(resolved.symbol, originalId);
    }
  },

  loadSymbolFolders: async (symbol: string) => {
    if (!symbol) {
      set({ folders: [] });
      return [];
    }
    try {
      const loaded = await drawingRepository.getFolders(symbol);
      const initialized = (loaded || []).map((f: any, idx: number) => ({
        ...f,
        order: f.order ?? ((loaded || []).length - idx) * 100,
      }));
      set({ folders: initialized });
      return initialized;
    } catch (err) {
      console.error(`[useDrawingStore] Failed to load folders for ${symbol}:`, err);
      set({ folders: [] });
      return [];
    }
  },

  saveSymbolFolders: async (symbol: string, folders: FolderItem[]) => {
    if (!symbol) return;
    set({ folders });
    await drawingRepository.saveFolders(symbol.toUpperCase(), folders);
  },

  createSymbolFolder: (symbol: string, folder?: Partial<FolderItem>, assignedDrawingIds?: string[]) => {
    const symbolKey = (symbol || '').toUpperCase();
    const currentFolders = get().folders;
    const symbolDrawings = symbolKey ? (get().drawingsBySymbol[symbolKey] || []) : [];
    const maxOrder = Math.max(
      0,
      ...currentFolders.map((f) => f.order ?? 0),
      ...symbolDrawings.map((d) => d.extendData?.order ?? 0)
    );

    const newFolder: FolderItem = {
      id: folder?.id || `folder_${Date.now()}`,
      name: folder?.name || `Folder ${currentFolders.length + 1}`,
      isCollapsed: folder?.isCollapsed ?? false,
      isLocked: folder?.isLocked ?? false,
      isVisible: folder?.isVisible ?? true,
      order: folder?.order ?? (maxOrder + 10),
    };

    const nextFolders = [...currentFolders, newFolder];
    let nextStoreDrawings = symbolDrawings;

    if (symbolKey && assignedDrawingIds && assignedDrawingIds.length > 0) {
      nextStoreDrawings = symbolDrawings.map((d) => {
        if (assignedDrawingIds.includes(d.id)) {
          return {
            ...d,
            extendData: {
              ...(d.extendData || {}),
              folderId: newFolder.id,
            },
          };
        }
        return d;
      });
    }

    set((state) => ({
      folders: nextFolders,
      drawingsBySymbol: (symbolKey && assignedDrawingIds && assignedDrawingIds.length > 0) ? {
        ...state.drawingsBySymbol,
        [symbolKey]: nextStoreDrawings,
      } : state.drawingsBySymbol,
    }));

    if (symbolKey) {
      drawingRepository.saveFolders(symbolKey, nextFolders);
      if (assignedDrawingIds && assignedDrawingIds.length > 0) {
        drawingRepository.saveDrawings(symbolKey, nextStoreDrawings);
      }
    }

    return newFolder;
  },

  updateSymbolFolder: (symbol: string, id: string, updates: Partial<FolderItem>) => {
    if (!id) return;
    const nextFolders = get().folders.map((f) => (f.id === id ? { ...f, ...updates } : f));
    set({ folders: nextFolders });
    if (symbol) {
      drawingRepository.saveFolders(symbol.toUpperCase(), nextFolders);
    }
  },

  deleteSymbolFolder: (symbol: string, folderId: string) => {
    if (!folderId) return;
    const symbolKey = (symbol || '').toUpperCase();
    const nextFolders = get().folders.filter((f) => f.id !== folderId);
    let nextDrawings = symbolKey ? (get().drawingsBySymbol[symbolKey] || []) : [];
    let hasModified = false;

    if (symbolKey) {
      nextDrawings = nextDrawings.map((d) => {
        if (d.extendData?.folderId === folderId) {
          hasModified = true;
          return {
            ...d,
            extendData: {
              ...(d.extendData || {}),
              folderId: null,
            },
          };
        }
        return d;
      });
    }

    set((state) => ({
      folders: nextFolders,
      drawingsBySymbol: (symbolKey && hasModified) ? {
        ...state.drawingsBySymbol,
        [symbolKey]: nextDrawings,
      } : state.drawingsBySymbol,
    }));

    if (symbolKey) {
      drawingRepository.saveFolders(symbolKey, nextFolders);
      if (hasModified) {
        drawingRepository.saveDrawings(symbolKey, nextDrawings);
      }
    }
  },

  setFolderVisibility: (symbol: string, folderId: string, isVisible: boolean) => {
    if (!folderId) return;
    const symbolKey = (symbol || '').toUpperCase();
    const nextFolders = get().folders.map((f) => (f.id === folderId ? { ...f, isVisible } : f));
    let nextDrawings = symbolKey ? (get().drawingsBySymbol[symbolKey] || []) : [];
    let hasModified = false;

    if (symbolKey) {
      nextDrawings = nextDrawings.map((d) => {
        if (d.extendData?.folderId === folderId) {
          hasModified = true;
          return { ...d, visible: isVisible };
        }
        return d;
      });
    }

    set((state) => ({
      folders: nextFolders,
      drawingsBySymbol: (symbolKey && hasModified) ? {
        ...state.drawingsBySymbol,
        [symbolKey]: nextDrawings,
      } : state.drawingsBySymbol,
    }));

    if (symbolKey) {
      drawingRepository.saveFolders(symbolKey, nextFolders);
      if (hasModified) {
        drawingRepository.saveDrawings(symbolKey, nextDrawings);
      }
    }
  },

  setFolderLock: (symbol: string, folderId: string, isLocked: boolean) => {
    if (!folderId) return;
    const symbolKey = (symbol || '').toUpperCase();
    const nextFolders = get().folders.map((f) => (f.id === folderId ? { ...f, isLocked } : f));
    let nextDrawings = symbolKey ? (get().drawingsBySymbol[symbolKey] || []) : [];
    let hasModified = false;

    if (symbolKey) {
      nextDrawings = nextDrawings.map((d) => {
        if (d.extendData?.folderId === folderId) {
          hasModified = true;
          return { ...d, lock: isLocked };
        }
        return d;
      });
    }

    set((state) => ({
      folders: nextFolders,
      drawingsBySymbol: (symbolKey && hasModified) ? {
        ...state.drawingsBySymbol,
        [symbolKey]: nextDrawings,
      } : state.drawingsBySymbol,
    }));

    if (symbolKey) {
      drawingRepository.saveFolders(symbolKey, nextFolders);
      if (hasModified) {
        drawingRepository.saveDrawings(symbolKey, nextDrawings);
      }
    }
  },

  setFolders: (folders) =>
    set((state) => ({
      folders: typeof folders === 'function' ? folders(state.folders) : folders,
    })),

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

  toggleFavoriteTool: (toolId: string) => {
    set((state) => {
      const exists = state.favoriteTools.includes(toolId);
      const updated = exists
        ? state.favoriteTools.filter((id) => id !== toolId)
        : [...state.favoriteTools, toolId];
      try {
        localStorage.setItem('fx_favorite_tools', JSON.stringify(updated));
      } catch (_) {}
      return { favoriteTools: updated };
    });
  },

  reorderFavoriteTools: (newOrder: string[]) => {
    try {
      localStorage.setItem('fx_favorite_tools', JSON.stringify(newOrder));
    } catch (_) {}
    set({ favoriteTools: newOrder });
  },

  setFavoriteToolbarOpen: (open: boolean) => {
    try {
      localStorage.setItem('fx_favorite_toolbar_open', String(open));
    } catch (_) {}
    set({ isFavoriteToolbarOpen: open });
  },

  isStayInDrawingMode: false,

  setStayInDrawingMode: (active: boolean) => {
    set({ isStayInDrawingMode: active });
  },

  // Canonical Ordering Actions (Phase 2A & 2B)
  orderStateBySymbol: {},

  loadSymbolOrderState: async (symbol: string) => {
    if (!symbol) return null;
    const key = symbol.toUpperCase();

    // 1. Ensure symbol drawings and folders are loaded first to prevent race conditions
    let drawings = get().drawingsBySymbol[key];
    if (!drawings) {
      drawings = await get().loadSymbolDrawings(key);
    }
    // Also guarantee folders for this symbol are loaded into repository/store
    await drawingRepository.getFolders(key);

    const knownIds = drawings.map((d) => d.id);
    const lookup: DrawingFolderLookup = {};
    drawings.forEach((d) => {
      lookup[d.id] = d.extendData?.folderId;
    });

    try {
      // 2. Attempt to read persisted canonical order state from repository
      const persisted = await drawingRepository.getOrderState(key);

      if (persisted && Array.isArray(persisted.sequence)) {
        // Normalize loaded canonical state against current drawings/folders
        const normalizedSeq = normalizeOrderSequence(persisted.sequence, knownIds, lookup);
        const orderState: SymbolOrderState = {
          symbol: key,
          sequence: normalizedSeq,
          candlesVisible: persisted.candlesVisible ?? true,
        };

        set((state) => ({
          orderStateBySymbol: {
            ...state.orderStateBySymbol,
            [key]: orderState,
          },
        }));

        // If normalization changed the sequence, persist the updated state asynchronously
        if (JSON.stringify(normalizedSeq) !== JSON.stringify(persisted.sequence)) {
          drawingRepository.saveOrderState(key, orderState).catch((err) => {
            console.error(`[useDrawingStore] Failed to update normalized order state for ${key}:`, err);
          });
        }

        return orderState;
      }
    } catch (err) {
      console.warn(`[useDrawingStore] Failed to load order state from repository for ${key}:`, err);
    }

    // 3. No canonical state exists yet -> Deterministically migrate from legacy drawings & folders
    const migratedState = migrateLegacyOrderToCanonical(key, drawings, lookup);

    set((state) => ({
      orderStateBySymbol: {
        ...state.orderStateBySymbol,
        [key]: migratedState,
      },
    }));

    // Asynchronously persist the freshly migrated canonical state
    drawingRepository.saveOrderState(key, migratedState).catch((err) => {
      console.error(`[useDrawingStore] Failed to save migrated order state for ${key}:`, err);
    });

    return migratedState;
  },

  getSymbolOrderSequence: (symbol: string) => {
    if (!symbol) return [];
    const key = symbol.toUpperCase();
    const existing = get().orderStateBySymbol[key]?.sequence;
    const drawings = get().drawingsBySymbol[key] || [];
    const knownIds = drawings.map((d) => d.id);
    const lookup: DrawingFolderLookup = {};
    drawings.forEach((d) => {
      lookup[d.id] = d.extendData?.folderId;
    });

    return normalizeOrderSequence(existing, knownIds, lookup);
  },

  setSymbolOrderSequence: (symbol: string, sequence: string[]) => {
    if (!symbol) return;
    const key = symbol.toUpperCase();
    const drawings = get().drawingsBySymbol[key] || [];
    const knownIds = drawings.map((d) => d.id);
    const lookup: DrawingFolderLookup = {};
    drawings.forEach((d) => {
      lookup[d.id] = d.extendData?.folderId;
    });

    const normalized = normalizeOrderSequence(sequence, knownIds, lookup);
    const nextOrderState: SymbolOrderState = {
      symbol: key,
      sequence: normalized,
      candlesVisible: get().orderStateBySymbol[key]?.candlesVisible ?? true,
    };

    set((state) => ({
      orderStateBySymbol: {
        ...state.orderStateBySymbol,
        [key]: nextOrderState,
      },
    }));

    // Persist canonical order state to repository (Phase 2B)
    drawingRepository.saveOrderState(key, nextOrderState).catch((err) => {
      console.error(`[useDrawingStore] Failed to persist order state for ${key}:`, err);
    });
  },

  reorderSymbolItem: (symbol: string, targetId: string, action: 'front' | 'back' | 'forward' | 'backward') => {
    if (!symbol || !targetId) return;
    const key = symbol.toUpperCase();
    const currentSeq = get().getSymbolOrderSequence(key);
    const drawings = get().drawingsBySymbol[key] || [];
    const lookup: DrawingFolderLookup = {};
    drawings.forEach((d) => {
      lookup[d.id] = d.extendData?.folderId;
    });

    let nextSeq = currentSeq;
    switch (action) {
      case 'front':
        nextSeq = bringToFront(currentSeq, targetId, lookup);
        break;
      case 'back':
        nextSeq = sendToBack(currentSeq, targetId, lookup);
        break;
      case 'forward':
        nextSeq = bringForward(currentSeq, targetId, lookup);
        break;
      case 'backward':
        nextSeq = sendBackward(currentSeq, targetId, lookup);
        break;
    }

    get().setSymbolOrderSequence(key, nextSeq);
  },

  moveSymbolFolderBlock: (symbol: string, folderId: string, targetId: string, position: 'above' | 'below') => {
    if (!symbol || !folderId || !targetId) return;
    const key = symbol.toUpperCase();
    const currentSeq = get().getSymbolOrderSequence(key);
    const drawings = get().drawingsBySymbol[key] || [];
    const lookup: DrawingFolderLookup = {};
    drawings.forEach((d) => {
      lookup[d.id] = d.extendData?.folderId;
    });

    const nextSeq = moveFolderBlock(currentSeq, folderId, targetId, position, lookup);
    get().setSymbolOrderSequence(key, nextSeq);
  },

  moveSymbolDrawingFolder: (symbol: string, drawingId: string, targetFolderId: string | null, placement?: 'top' | 'bottom' | 'above_folder' | 'below_folder') => {
    if (!symbol || !drawingId) return;
    const key = symbol.toUpperCase();
    const currentSeq = get().getSymbolOrderSequence(key);
    const drawings = get().drawingsBySymbol[key] || [];
    const lookup: DrawingFolderLookup = {};
    drawings.forEach((d) => {
      lookup[d.id] = d.extendData?.folderId;
    });

    if (targetFolderId) {
      const { nextSequence } = moveDrawingIntoFolder(
        currentSeq,
        drawingId,
        targetFolderId,
        lookup,
        placement === 'bottom' ? 'bottom' : 'top'
      );
      // Also update folderId in drawing definition
      get().updateSymbolDrawing(key, drawingId, {
        extendData: {
          ...(drawings.find((d) => d.id === drawingId)?.extendData || {}),
          folderId: targetFolderId,
        },
      });
      get().setSymbolOrderSequence(key, nextSequence);
    } else {
      const { nextSequence } = moveDrawingOutOfFolder(
        currentSeq,
        drawingId,
        lookup,
        placement === 'below_folder' ? 'below_folder' : 'above_folder'
      );
      // Dissociate folder in drawing definition
      get().updateSymbolDrawing(key, drawingId, {
        extendData: {
          ...(drawings.find((d) => d.id === drawingId)?.extendData || {}),
          folderId: null,
        },
      });
      get().setSymbolOrderSequence(key, nextSequence);
    }
  },
}));

