import { create } from 'zustand';
import { dataManagementRepository } from '@/repository';
import type { CategoryStorageSummary, StorageRecordItem } from '@/repository';

export interface DataManagementState {
  // State variables
  overview: CategoryStorageSummary[];
  activeCategoryId: string | null;
  records: StorageRecordItem[];
  totalRecordCount: number;
  page: number;
  pageSize: number;
  searchQuery: string;
  selectedRecordIds: string[];
  isLoadingOverview: boolean;
  isLoadingRecords: boolean;
  error: string | null;

  // Actions
  loadOverview: () => Promise<void>;
  loadCategoryRecords: (
    categoryId?: string,
    page?: number,
    pageSize?: number,
    searchQuery?: string
  ) => Promise<void>;
  setActiveCategory: (categoryId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setPage: (page: number) => void;
  setSelectedRecordIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  toggleRecordSelection: (id: string) => void;
  selectAllRecordsOnPage: () => void;
  clearSelection: () => void;
  refreshOverview: () => Promise<void>;
}

export const useDataManagementStore = create<DataManagementState>((set, get) => ({
  overview: [],
  activeCategoryId: null,
  records: [],
  totalRecordCount: 0,
  page: 1,
  pageSize: 20,
  searchQuery: '',
  selectedRecordIds: [],
  isLoadingOverview: false,
  isLoadingRecords: false,
  error: null,

  loadOverview: async () => {
    set({ isLoadingOverview: true, error: null });
    try {
      const summary = await dataManagementRepository.getStorageOverview();
      set({ overview: summary, isLoadingOverview: false });
    } catch (err: any) {
      console.error('[useDataManagementStore] Failed to load storage overview:', err);
      set({
        error: err.message || 'Failed to load storage overview',
        isLoadingOverview: false,
      });
    }
  },

  refreshOverview: async () => {
    await get().loadOverview();
  },

  loadCategoryRecords: async (categoryId, pageArg, pageSizeArg, searchQueryArg) => {
    const catId = categoryId !== undefined ? categoryId : get().activeCategoryId;
    if (!catId) {
      set({ records: [], totalRecordCount: 0 });
      return;
    }

    const p = pageArg !== undefined ? pageArg : get().page;
    const ps = pageSizeArg !== undefined ? pageSizeArg : get().pageSize;
    const q = searchQueryArg !== undefined ? searchQueryArg : get().searchQuery;

    set({ isLoadingRecords: true, error: null });
    try {
      const result = await dataManagementRepository.getCategoryRecords(catId, p, ps, q);
      set({
        activeCategoryId: catId,
        records: result.items,
        totalRecordCount: result.totalCount,
        page: p,
        pageSize: ps,
        searchQuery: q,
        isLoadingRecords: false,
      });
    } catch (err: any) {
      console.error(`[useDataManagementStore] Failed to load records for category ${catId}:`, err);
      set({
        error: err.message || 'Failed to load category records',
        isLoadingRecords: false,
      });
    }
  },

  setActiveCategory: (categoryId) => {
    set({ activeCategoryId: categoryId, page: 1, searchQuery: '', selectedRecordIds: [], records: [], totalRecordCount: 0 });
    if (categoryId) {
      get().loadCategoryRecords(categoryId, 1, get().pageSize, '');
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query, page: 1 });
    const catId = get().activeCategoryId;
    if (catId) {
      get().loadCategoryRecords(catId, 1, get().pageSize, query);
    }
  },

  setPage: (page) => {
    set({ page });
    const catId = get().activeCategoryId;
    if (catId) {
      get().loadCategoryRecords(catId, page, get().pageSize, get().searchQuery);
    }
  },

  setSelectedRecordIds: (ids) => {
    set((state) => ({
      selectedRecordIds: typeof ids === 'function' ? ids(state.selectedRecordIds) : ids,
    }));
  },

  toggleRecordSelection: (id) => {
    set((state) => {
      const exists = state.selectedRecordIds.includes(id);
      return {
        selectedRecordIds: exists
          ? state.selectedRecordIds.filter((item) => item !== id)
          : [...state.selectedRecordIds, id],
      };
    });
  },

  selectAllRecordsOnPage: () => {
    set((state) => {
      const pageIds = state.records.map((r) => r.id);
      const allSelected = pageIds.every((id) => state.selectedRecordIds.includes(id));
      if (allSelected) {
        return {
          selectedRecordIds: state.selectedRecordIds.filter((id) => !pageIds.includes(id)),
        };
      } else {
        const unique = new Set([...state.selectedRecordIds, ...pageIds]);
        return { selectedRecordIds: Array.from(unique) };
      }
    });
  },

  clearSelection: () => {
    set({ selectedRecordIds: [] });
  },
}));
