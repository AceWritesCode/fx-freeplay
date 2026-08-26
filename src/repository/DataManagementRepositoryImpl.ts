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
    }

    const start = (page - 1) * pageSize;
    const paginatedItems = items.slice(start, start + pageSize);

    return {
      items: paginatedItems,
      totalCount: items.length,
    };
  }

  // Stubbed mutation methods (To be expanded in Checkpoints 4 & 5)
  async deleteRecord(_categoryId: string, _recordId: string): Promise<void> {
    throw new Error('deleteRecord not implemented in Checkpoint 1 (Inspection layer only)');
  }

  async deleteCategoryRecords(_categoryId: string, _recordIds: string[]): Promise<void> {
    throw new Error('deleteCategoryRecords not implemented in Checkpoint 1 (Inspection layer only)');
  }

  async clearCategory(_categoryId: string): Promise<void> {
    throw new Error('clearCategory not implemented in Checkpoint 1 (Inspection layer only)');
  }

  async performFactoryReset(): Promise<void> {
    throw new Error('performFactoryReset not implemented in Checkpoint 1 (Inspection layer only)');
  }
}

export const dataManagementRepository = new DataManagementRepositoryImpl();
