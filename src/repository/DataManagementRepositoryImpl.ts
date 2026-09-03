import { STORES, executeTx } from './db';
import type {
  DataManagementRepository,
  CategoryStorageSummary,
  StorageRecordItem,
} from './DataManagementRepository';

export class DataManagementRepositoryImpl implements DataManagementRepository {
  async getStorageOverview(): Promise<CategoryStorageSummary[]> {
    const categories: CategoryStorageSummary[] = [];

    // 1. Market Bars (CSV Candle Datasets)
    try {
      const keys = await executeTx<IDBValidKey[]>(STORES.MARKET_BARS, 'readonly', (store) => store.getAllKeys());
      let totalCandles = 0;
      let totalBytes = 0;

      for (const key of keys) {
        const keyStr = String(key);
        const val = await executeTx<any>(STORES.MARKET_BARS, 'readonly', (store) => store.get(keyStr));
        if (Array.isArray(val)) {
          totalCandles += val.length;
          totalBytes += JSON.stringify(val).length;
        }
      }

      categories.push({
        id: 'market_bars',
        name: 'Market Data (CSV Bars)',
        description: 'Imported OHLCV candle datasets grouped by symbol and timeframe.',
        type: 'market_data',
        recordCount: keys.length,
        estimatedSizeBytes: totalBytes,
      });
    } catch (err) {
      console.error('[DataManagementRepository] Failed to inspect market_bars store:', err);
      categories.push({
        id: 'market_bars',
        name: 'Market Data (CSV Bars)',
        description: 'Imported OHLCV candle datasets grouped by symbol and timeframe.',
        type: 'market_data',
        recordCount: 0,
        estimatedSizeBytes: 0,
      });
    }

    // 2. Chart Drawings
    try {
      const keys = await executeTx<IDBValidKey[]>(STORES.DRAWINGS, 'readonly', (store) => store.getAllKeys());
      let totalDrawings = 0;
      let totalBytes = 0;

      for (const key of keys) {
        const keyStr = String(key);
        const val = await executeTx<any>(STORES.DRAWINGS, 'readonly', (store) => store.get(keyStr));
        if (Array.isArray(val)) {
          totalDrawings += val.length;
          totalBytes += JSON.stringify(val).length;
        }
      }

      categories.push({
        id: 'drawings',
        name: 'Chart Drawings',
        description: 'User-created chart drawing objects saved per symbol.',
        type: 'drawings',
        recordCount: totalDrawings,
        estimatedSizeBytes: totalBytes,
      });
    } catch (err) {
      console.error('[DataManagementRepository] Failed to inspect drawings store:', err);
      categories.push({
        id: 'drawings',
        name: 'Chart Drawings',
        description: 'User-created chart drawing objects saved per symbol.',
        type: 'drawings',
        recordCount: 0,
        estimatedSizeBytes: 0,
      });
    }

    // 3. Watchlist & Symbol Profiles
    try {
      const keys = await executeTx<IDBValidKey[]>(STORES.WATCHLIST, 'readonly', (store) => store.getAllKeys());
      let totalItems = 0;
      let totalBytes = 0;

      for (const key of keys) {
        const keyStr = String(key);
        const val = await executeTx<any>(STORES.WATCHLIST, 'readonly', (store) => store.get(keyStr));
        if (keyStr === 'watchlist_symbols' && Array.isArray(val)) {
          totalItems += val.length;
        } else {
          totalItems += 1;
        }
        if (val) {
          totalBytes += JSON.stringify(val).length;
        }
      }

      categories.push({
        id: 'watchlist',
        name: 'Watchlist & Profiles',
        description: 'Imported symbol watchlists, active symbol state, and symbol metadata profiles.',
        type: 'watchlist',
        recordCount: totalItems,
        estimatedSizeBytes: totalBytes,
      });
    } catch (err) {
      console.error('[DataManagementRepository] Failed to inspect watchlist store:', err);
      categories.push({
        id: 'watchlist',
        name: 'Watchlist & Profiles',
        description: 'Imported symbol watchlists, active symbol state, and symbol metadata profiles.',
        type: 'watchlist',
        recordCount: 0,
        estimatedSizeBytes: 0,
      });
    }

    // 4. Workspace Layouts
    try {
      const val = await executeTx<any>(STORES.WORKSPACE_LAYOUT, 'readonly', (store) => store.get('active_layout'));
      const sizeBytes = val ? JSON.stringify(val).length : 0;
      categories.push({
        id: 'workspace_layout',
        name: 'Workspace Layouts',
        description: 'Saved window grid layouts, slot symbol configurations, and sync settings.',
        type: 'workspace_layout',
        recordCount: val ? 1 : 0,
        estimatedSizeBytes: sizeBytes,
      });
    } catch (err) {
      console.error('[DataManagementRepository] Failed to inspect workspace_layout store:', err);
      categories.push({
        id: 'workspace_layout',
        name: 'Workspace Layouts',
        description: 'Saved window grid layouts, slot symbol configurations, and sync settings.',
        type: 'workspace_layout',
        recordCount: 0,
        estimatedSizeBytes: 0,
      });
    }

    // 5. Application Settings
    try {
      const val = await executeTx<any>(STORES.SETTINGS, 'readonly', (store) => store.get('app_settings'));
      const sizeBytes = val ? JSON.stringify(val).length : 0;
      categories.push({
        id: 'settings',
        name: 'Application Preferences',
        description: 'Global chart settings, price precision, timezone, and theme preferences.',
        type: 'settings',
        recordCount: val ? 1 : 0,
        estimatedSizeBytes: sizeBytes,
      });
    } catch (err) {
      console.error('[DataManagementRepository] Failed to inspect settings store:', err);
      categories.push({
        id: 'settings',
        name: 'Application Preferences',
        description: 'Global chart settings, price precision, timezone, and theme preferences.',
        type: 'settings',
        recordCount: 0,
        estimatedSizeBytes: 0,
      });
    }

    // 6. Drawing Templates & LocalStorage Presets
    try {
      let templateCount = 0;
      let templateBytes = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('fx_templates_') || key.startsWith('fx_folders_') || key === 'fx_custom_theme_presets' || key === 'fx_recent_colors')) {
          templateCount += 1;
          const val = localStorage.getItem(key);
          if (val) {
            templateBytes += val.length;
          }
        }
      }

      categories.push({
        id: 'drawing_templates',
        name: 'Drawing Templates & Presets',
        description: 'Saved drawing tool style templates, drawing folder hierarchies, and custom theme presets.',
        type: 'drawing_templates',
        recordCount: templateCount,
        estimatedSizeBytes: templateBytes,
      });
    } catch (err) {
      console.error('[DataManagementRepository] Failed to inspect localStorage templates:', err);
      categories.push({
        id: 'drawing_templates',
        name: 'Drawing Templates & Presets',
        description: 'Saved drawing tool style templates, drawing folder hierarchies, and custom theme presets.',
        type: 'drawing_templates',
        recordCount: 0,
        estimatedSizeBytes: 0,
      });
    }

    return categories;
  }

  async getCategoryRecords(
    categoryId: string,
    page = 1,
    pageSize = 20,
    searchQuery = ''
  ): Promise<{ items: StorageRecordItem[]; totalCount: number }> {
    const items: StorageRecordItem[] = [];

    if (categoryId === 'market_bars') {
      const keys = await executeTx<IDBValidKey[]>(STORES.MARKET_BARS, 'readonly', (store) => store.getAllKeys());
      for (const key of keys) {
        const keyStr = String(key);
        if (searchQuery && !keyStr.toLowerCase().includes(searchQuery.toLowerCase())) continue;

        const val = await executeTx<any>(STORES.MARKET_BARS, 'readonly', (store) => store.get(keyStr));
        const candleCount = Array.isArray(val) ? val.length : 0;
        const sizeBytes = val ? JSON.stringify(val).length : 0;
        const [symbol, timeframe] = keyStr.split(':');

        items.push({
          id: keyStr,
          category: 'market_bars',
          title: `${symbol || keyStr} (${timeframe || '1m'})`,
          subtitle: `${candleCount.toLocaleString()} OHLCV Candles`,
          sizeBytes,
          metadata: { symbol, timeframe, candleCount },
        });
      }
    } else if (categoryId === 'drawings') {
      const keys = await executeTx<IDBValidKey[]>(STORES.DRAWINGS, 'readonly', (store) => store.getAllKeys());
      for (const key of keys) {
        const symbol = String(key);
        const val = await executeTx<any>(STORES.DRAWINGS, 'readonly', (store) => store.get(symbol));
        if (Array.isArray(val)) {
          val.forEach((drawing: any) => {
            if (searchQuery && !drawing.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !drawing.id?.toLowerCase().includes(searchQuery.toLowerCase())) {
              return;
            }
            const sizeBytes = JSON.stringify(drawing).length;
            items.push({
              id: `${symbol}::${drawing.id}`,
              category: 'drawings',
              title: `${drawing.name || 'Drawing'} (${symbol})`,
              subtitle: `ID: ${drawing.id} • Points: ${drawing.points?.length || 0}`,
              sizeBytes,
              metadata: { symbol, drawingId: drawing.id, drawing },
            });
          });
        }
      }
    } else if (categoryId === 'watchlist') {
      const val = await executeTx<any[]>(STORES.WATCHLIST, 'readonly', (store) => store.get('watchlist_symbols'));
      if (Array.isArray(val)) {
        for (const item of val) {
          if (searchQuery && !item.name?.toLowerCase().includes(searchQuery.toLowerCase())) continue;
          const profile = await executeTx<any>(STORES.WATCHLIST, 'readonly', (store) => store.get(`profile:${item.name}`));
          const sizeBytes = JSON.stringify(item).length + (profile ? JSON.stringify(profile).length : 0);
          items.push({
            id: item.name,
            category: 'watchlist',
            title: item.name,
            subtitle: profile ? 'Watchlist Symbol • Custom Profile' : 'Watchlist Symbol',
            sizeBytes,
            metadata: { name: item.name, symbol: item.name, profile: profile || null },
          });
        }
      }
    } else if (categoryId === 'drawing_templates') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('fx_templates_') || key.startsWith('fx_folders_') || key === 'fx_custom_theme_presets' || key === 'fx_recent_colors')) {
          if (searchQuery && !key.toLowerCase().includes(searchQuery.toLowerCase())) continue;
          const val = localStorage.getItem(key);
          const sizeBytes = val ? val.length : 0;
          let parsedVal: any = val;
          try {
            parsedVal = val ? JSON.parse(val) : val;
          } catch (e) {}
          items.push({
            id: key,
            category: 'drawing_templates',
            title: key,
            subtitle: key.startsWith('fx_templates_') ? 'Drawing Tool Template' : 'LocalStorage Preset',
            sizeBytes,
            metadata: { key, value: parsedVal },
          });
        }
      }
    } else if (categoryId === 'workspace_layout') {
      const val = await executeTx<any>(STORES.WORKSPACE_LAYOUT, 'readonly', (store) => store.get('active_layout'));
      if (val) {
        items.push({
          id: 'active_layout',
          category: 'workspace_layout',
          title: `Active Layout (${val.layoutType || '1'})`,
          subtitle: `${val.slots?.length || 0} Slots Configured`,
          sizeBytes: JSON.stringify(val).length,
          metadata: val,
        });
      }
    } else if (categoryId === 'settings') {
      const val = await executeTx<any>(STORES.SETTINGS, 'readonly', (store) => store.get('app_settings'));
      if (val) {
        items.push({
          id: 'app_settings',
          category: 'settings',
          title: 'Global Application Settings',
          subtitle: `Timezone: ${val.timezone || 'UTC'} • Theme: ${val.theme || 'dark'}`,
          sizeBytes: JSON.stringify(val).length,
          metadata: val,
        });
      }
    }

    const start = (page - 1) * pageSize;
    const paginatedItems = items.slice(start, start + pageSize);

    return {
      items: paginatedItems,
      totalCount: items.length,
    };
  }

  async deleteRecord(categoryId: string, recordId: string): Promise<void> {
    if (categoryId === 'market_bars') {
      await executeTx(STORES.MARKET_BARS, 'readwrite', (store) => store.delete(recordId));
    } else if (categoryId === 'drawings') {
      const [symbol, drawingId] = recordId.split('::');
      if (symbol && drawingId) {
        const key = symbol.toUpperCase();
        const existing = (await executeTx<any[]>(STORES.DRAWINGS, 'readonly', (store) => store.get(key))) || [];
        const updated = existing.filter((d: any) => d.id !== drawingId);
        await executeTx(STORES.DRAWINGS, 'readwrite', (store) => store.put(updated, key));
        // Synchronize in-memory useDrawingStore
        try {
          const { useDrawingStore } = await import('@/store');
          useDrawingStore.getState().removeSymbolDrawing(key, drawingId);
        } catch (e) {
          console.warn('[DataManagementRepository] Store sync warning:', e);
        }
      }
    } else if (categoryId === 'watchlist') {
      const existingWatchlist = (await executeTx<any[]>(STORES.WATCHLIST, 'readonly', (store) => store.get('watchlist_symbols'))) || [];
      const updatedWatchlist = existingWatchlist.filter((item: any) => item.name !== recordId);
      await executeTx(STORES.WATCHLIST, 'readwrite', (store) => store.put(updatedWatchlist, 'watchlist_symbols'));
      await executeTx(STORES.WATCHLIST, 'readwrite', (store) => store.delete(`profile:${recordId}`));
      try {
        const { useWatchlistStore } = await import('@/store');
        useWatchlistStore.setState((state) => ({
          watchlistSymbols: state.watchlistSymbols.filter((s) => s.name !== recordId),
        }));
      } catch (e) {
        console.warn('[DataManagementRepository] Store sync warning:', e);
      }
    } else if (categoryId === 'drawing_templates') {
      localStorage.removeItem(recordId);
    } else if (categoryId === 'workspace_layout') {
      await executeTx(STORES.WORKSPACE_LAYOUT, 'readwrite', (store) => store.delete(recordId));
    } else if (categoryId === 'settings') {
      await executeTx(STORES.SETTINGS, 'readwrite', (store) => store.delete(recordId));
    }
  }

  async deleteCategoryRecords(categoryId: string, recordIds: string[]): Promise<void> {
    for (const recordId of recordIds) {
      await this.deleteRecord(categoryId, recordId);
    }
  }

  async clearCategory(categoryId: string): Promise<void> {
    if (categoryId === 'market_bars') {
      await executeTx(STORES.MARKET_BARS, 'readwrite', (store) => store.clear());
    } else if (categoryId === 'drawings') {
      await executeTx(STORES.DRAWINGS, 'readwrite', (store) => store.clear());
      try {
        const { useDrawingStore } = await import('@/store');
        useDrawingStore.setState({ drawingsBySymbol: {} });
      } catch (e) {
        console.warn('[DataManagementRepository] Store sync warning:', e);
      }
    } else if (categoryId === 'watchlist') {
      await executeTx(STORES.WATCHLIST, 'readwrite', (store) => store.clear());
      try {
        const { useWatchlistStore } = await import('@/store');
        useWatchlistStore.setState({ watchlistSymbols: [], activeWatchlistSymbol: null });
      } catch (e) {
        console.warn('[DataManagementRepository] Store sync warning:', e);
      }
    } else if (categoryId === 'workspace_layout') {
      await executeTx(STORES.WORKSPACE_LAYOUT, 'readwrite', (store) => store.clear());
    } else if (categoryId === 'settings') {
      await executeTx(STORES.SETTINGS, 'readwrite', (store) => store.clear());
    } else if (categoryId === 'drawing_templates') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('fx_templates_') || key.startsWith('fx_folders_') || key === 'fx_custom_theme_presets' || key === 'fx_recent_colors')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  }

  async performFactoryReset(): Promise<void> {
    // 1. Clear all IndexedDB stores in FXFreeplayDB
    const storeNames = [
      STORES.MARKET_BARS,
      STORES.WATCHLIST,
      STORES.WORKSPACE_LAYOUT,
      STORES.DRAWINGS,
      STORES.SETTINGS,
      STORES.METADATA,
    ];
    for (const storeName of storeNames) {
      try {
        await executeTx(storeName, 'readwrite', (store) => store.clear());
      } catch (err) {
        console.warn(`[DataManagementRepository] Failed to clear store ${storeName}:`, err);
      }
    }

    // 2. Clear app-owned LocalStorage keys
    const appPrefixes = [
      'fx_',
      'layout_',
      'tv_clone_',
      'active_watchlist_symbol',
      'active_timeframe',
    ];
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && appPrefixes.some((prefix) => key.startsWith(prefix) || key === prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // 3. Reset in-memory Zustand stores to factory default state
    try {
      const {
        useDrawingStore,
        useWatchlistStore,
        useLayoutStore,
        useSettingsStore,
        useReplayStore,
        useDataManagementStore,
      } = await import('@/store');

      useDrawingStore.setState({
        drawingsBySymbol: {},
        folders: [],
        selectedOverlayIds: [],
      });

      useWatchlistStore.setState({
        watchlistSymbols: [],
        activeWatchlistSymbol: null,
        savedFolderHandle: null,
        savedFolderHandles: [],
        symbolFilesMap: {},
        importMode: 'single',
      });

      useLayoutStore.setState({
        layoutType: '1',
        slots: [{ symbol: '', timeframe: '1m' }],
        layoutSizes: { '1': [100] },
        syncSymbol: false,
        syncInterval: false,
        syncCrosshair: true,
        syncTime: true,
        syncDateRange: false,
        syncDrawings: true,
      });

      const { PRESET_SETTINGS } = await import('@/config');
      useSettingsStore.setState({
        settings: PRESET_SETTINGS.classic,
        customTimeframes: [],
      });

      useReplayStore.getState().resetReplay();

      useDataManagementStore.setState({
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
      });
    } catch (err) {
      console.warn('[DataManagementRepository] Failed to reset Zustand stores:', err);
    }

    // 4. Clear in-memory market data caches
    try {
      const { clearWorkspaceCaches } = await import('@/coordinator/useWorkspaceCoordinator');
      clearWorkspaceCaches();
    } catch (err) {
      console.warn('[DataManagementRepository] Failed to clear workspace caches:', err);
    }
  }
}

export const dataManagementRepository = new DataManagementRepositoryImpl();
