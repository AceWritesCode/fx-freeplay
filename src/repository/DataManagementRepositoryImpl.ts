import { STORES, executeTx } from './db';
import type {
  DataManagementRepository,
  CategoryStorageSummary,
  StorageRecordItem,
} from './DataManagementRepository';

function isDrawingTemplateOrPresetKey(key: string): boolean {
  return (
    key.startsWith('fx_templates_') ||
    key.startsWith('fx_default_settings_') ||
    key.startsWith('fx_folders_') ||
    key === 'fx_favorite_tools' ||
    key === 'fx_favorite_toolbar_pos' ||
    key === 'fx_favorite_toolbar_open' ||
    key === 'fx_recent_colors' ||
    key === 'fx_custom_theme' ||
    key === 'fx_saved_custom_themes' ||
    key === 'fx_custom_theme_presets'
  );
}

function isApplicationSettingLocalStorageKey(key: string): boolean {
  return (
    key === 'fx_theme_mode' ||
    key === 'fx_sync_chart_bg' ||
    key === 'fx_magnet_mode' ||
    key === 'tv_clone_settings'
  );
}

function isWorkspaceLayoutLocalStorageKey(key: string): boolean {
  return (
    key === 'layout_type' ||
    key === 'layout_slots' ||
    key === 'layout_sizes' ||
    key === 'active_layout_config'
  );
}

function formatToolLabel(toolName: string): string {
  if (!toolName) return 'Tool';
  const spaced = toolName.replace(/([A-Z])/g, ' $1').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

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
        // Exclude folders:* keys from pure drawings count
        if (keyStr.startsWith('folders:')) continue;

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
      const keys = await executeTx<IDBValidKey[]>(STORES.WORKSPACE_LAYOUT, 'readonly', (store) => store.getAllKeys());
      let totalBytes = 0;
      let recordCount = 0;

      for (const key of keys) {
        const val = await executeTx<any>(STORES.WORKSPACE_LAYOUT, 'readonly', (store) => store.get(String(key)));
        if (val) {
          recordCount += 1;
          totalBytes += JSON.stringify(val).length;
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && isWorkspaceLayoutLocalStorageKey(k)) {
          const val = localStorage.getItem(k);
          if (val) {
            recordCount += 1;
            totalBytes += val.length;
          }
        }
      }

      categories.push({
        id: 'workspace_layout',
        name: 'Workspace Layouts',
        description: 'Saved window grid layouts, slot symbol configurations, and sync settings.',
        type: 'workspace_layout',
        recordCount,
        estimatedSizeBytes: totalBytes,
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
      const keys = await executeTx<IDBValidKey[]>(STORES.SETTINGS, 'readonly', (store) => store.getAllKeys());
      let totalBytes = 0;
      let recordCount = 0;

      for (const key of keys) {
        const val = await executeTx<any>(STORES.SETTINGS, 'readonly', (store) => store.get(String(key)));
        if (val) {
          recordCount += 1;
          totalBytes += JSON.stringify(val).length;
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && isApplicationSettingLocalStorageKey(k)) {
          const val = localStorage.getItem(k);
          if (val) {
            recordCount += 1;
            totalBytes += val.length;
          }
        }
      }

      categories.push({
        id: 'settings',
        name: 'Application Preferences',
        description: 'Global chart settings, price precision, timezone, and theme preferences.',
        type: 'settings',
        recordCount,
        estimatedSizeBytes: totalBytes,
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
        if (key && isDrawingTemplateOrPresetKey(key)) {
          templateCount += 1;
          const val = localStorage.getItem(key);
          if (val) {
            templateBytes += val.length;
          }
        }
      }

      // Also check IndexedDB for folders:* records in DRAWINGS store
      const drawingKeys = await executeTx<IDBValidKey[]>(STORES.DRAWINGS, 'readonly', (store) => store.getAllKeys());
      for (const dKey of drawingKeys) {
        const kStr = String(dKey);
        if (kStr.startsWith('folders:')) {
          const val = await executeTx<any>(STORES.DRAWINGS, 'readonly', (store) => store.get(kStr));
          if (val) {
            templateCount += 1;
            templateBytes += JSON.stringify(val).length;
          }
        }
      }

      categories.push({
        id: 'drawing_templates',
        name: 'Drawing Templates & Presets',
        description: 'Saved drawing tool style templates, tool default properties, favorite tools, and theme presets.',
        type: 'drawing_templates',
        recordCount: templateCount,
        estimatedSizeBytes: templateBytes,
      });
    } catch (err) {
      console.error('[DataManagementRepository] Failed to inspect localStorage templates:', err);
      categories.push({
        id: 'drawing_templates',
        name: 'Drawing Templates & Presets',
        description: 'Saved drawing tool style templates, tool default properties, favorite tools, and theme presets.',
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
        if (key && isDrawingTemplateOrPresetKey(key)) {
          if (searchQuery && !key.toLowerCase().includes(searchQuery.toLowerCase())) continue;
          const val = localStorage.getItem(key);
          const sizeBytes = val ? val.length : 0;
          let parsedVal: any = val;
          try {
            parsedVal = val ? JSON.parse(val) : val;
          } catch (e) {}

          let title = key;
          let subtitle = 'Template / Preset';

          if (key.startsWith('fx_templates_')) {
            const toolName = key.replace('fx_templates_', '');
            title = `${formatToolLabel(toolName)} Templates`;
            const count = Array.isArray(parsedVal) ? parsedVal.length : 1;
            subtitle = `${count} Saved Template(s)`;
          } else if (key.startsWith('fx_default_settings_')) {
            const toolName = key.replace('fx_default_settings_', '');
            title = `${formatToolLabel(toolName)} Default Style`;
            subtitle = 'Tool Default Properties (Colors, Styles, Opacity)';
          } else if (key.startsWith('fx_folders_')) {
            const sym = key.replace('fx_folders_', '');
            title = `Drawing Folders (${sym.toUpperCase()})`;
            const count = Array.isArray(parsedVal) ? parsedVal.length : 0;
            subtitle = `${count} Folder(s) Configured`;
          } else if (key === 'fx_favorite_tools') {
            title = 'Favorite Drawing Tools';
            const count = Array.isArray(parsedVal) ? parsedVal.length : 0;
            subtitle = `${count} Pinned Tools`;
          } else if (key === 'fx_favorite_toolbar_pos') {
            title = 'Favorite Toolbar Position';
            subtitle = `Floating Coordinates: X=${parsedVal?.x ?? 0}, Y=${parsedVal?.y ?? 0}`;
          } else if (key === 'fx_favorite_toolbar_open') {
            title = 'Favorite Toolbar Visible';
            subtitle = `Visible: ${val}`;
          } else if (key === 'fx_recent_colors') {
            title = 'Recent Color Palette';
            const count = Array.isArray(parsedVal) ? parsedVal.length : 0;
            subtitle = `${count} Color Swatches`;
          } else if (key === 'fx_custom_theme') {
            title = 'Active Custom Theme';
            subtitle = 'Custom Colors & Token Palette';
          } else if (key === 'fx_saved_custom_themes' || key === 'fx_custom_theme_presets') {
            title = 'Custom Theme Presets';
            const count = Array.isArray(parsedVal) ? parsedVal.length : 0;
            subtitle = `${count} Saved Theme Preset(s)`;
          }

          items.push({
            id: key,
            category: 'drawing_templates',
            title,
            subtitle,
            sizeBytes,
            metadata: { key, value: parsedVal },
          });
        }
      }

      // Also include IndexedDB folders if present in DRAWINGS store
      const drawingKeys = await executeTx<IDBValidKey[]>(STORES.DRAWINGS, 'readonly', (store) => store.getAllKeys());
      for (const dKey of drawingKeys) {
        const kStr = String(dKey);
        if (kStr.startsWith('folders:')) {
          if (searchQuery && !kStr.toLowerCase().includes(searchQuery.toLowerCase())) continue;
          const val = await executeTx<any>(STORES.DRAWINGS, 'readonly', (store) => store.get(kStr));
          if (val) {
            const sym = kStr.replace('folders:', '');
            const count = Array.isArray(val) ? val.length : 0;
            items.push({
              id: `idb:${kStr}`,
              category: 'drawing_templates',
              title: `Drawing Folders DB (${sym.toUpperCase()})`,
              subtitle: `${count} Folder(s) in IndexedDB`,
              sizeBytes: JSON.stringify(val).length,
              metadata: { key: kStr, folders: val },
            });
          }
        }
      }
    } else if (categoryId === 'workspace_layout') {
      const keys = await executeTx<IDBValidKey[]>(STORES.WORKSPACE_LAYOUT, 'readonly', (store) => store.getAllKeys());
      for (const key of keys) {
        const keyStr = String(key);
        if (searchQuery && !keyStr.toLowerCase().includes(searchQuery.toLowerCase())) continue;
        const val = await executeTx<any>(STORES.WORKSPACE_LAYOUT, 'readonly', (store) => store.get(keyStr));
        if (val) {
          const slotCount = Array.isArray(val.slots) ? val.slots.length : 0;
          const assignedCount = Array.isArray(val.slots) ? val.slots.filter((s: any) => s?.symbol).length : 0;
          const title = keyStr === 'current_layout_config' ? 'Current Workspace Layout' : keyStr;
          const subtitle = `Layout Type: ${val.layoutType || '1'} • ${assignedCount}/${slotCount} Active Slots`;
          items.push({
            id: keyStr,
            category: 'workspace_layout',
            title,
            subtitle,
            sizeBytes: JSON.stringify(val).length,
            metadata: val,
          });
        }
      }

      // Also include any localStorage layout keys
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && isWorkspaceLayoutLocalStorageKey(k)) {
          if (searchQuery && !k.toLowerCase().includes(searchQuery.toLowerCase())) continue;
          const raw = localStorage.getItem(k);
          let parsed: any = raw;
          try {
            parsed = raw ? JSON.parse(raw) : raw;
          } catch {}
          items.push({
            id: `ls:${k}`,
            category: 'workspace_layout',
            title: `Layout Cache: ${k}`,
            subtitle: typeof parsed === 'object' && parsed !== null ? `${Object.keys(parsed).length} Entries` : String(parsed),
            sizeBytes: raw ? raw.length : 0,
            metadata: { key: k, value: parsed },
          });
        }
      }
    } else if (categoryId === 'settings') {
      const keys = await executeTx<IDBValidKey[]>(STORES.SETTINGS, 'readonly', (store) => store.getAllKeys());
      for (const key of keys) {
        const keyStr = String(key);
        if (searchQuery && !keyStr.toLowerCase().includes(searchQuery.toLowerCase())) continue;
        const val = await executeTx<any>(STORES.SETTINGS, 'readonly', (store) => store.get(keyStr));
        if (val) {
          let title = keyStr;
          let subtitle = 'Application Setting';
          if (keyStr === 'global_settings') {
            title = 'Global Chart & Application Settings';
            subtitle = `Precision: ${val.pricePrecision ?? 'Auto'} • Timezone: ${val.userTimezoneLabel || 'UTC'} • Candle, Grid & Scales`;
          } else if (keyStr === 'custom_timeframes') {
            title = 'Custom Timeframes';
            subtitle = `${Array.isArray(val) ? val.length : 0} Custom Timeframe Option(s)`;
          }
          items.push({
            id: keyStr,
            category: 'settings',
            title,
            subtitle,
            sizeBytes: JSON.stringify(val).length,
            metadata: val,
          });
        }
      }

      // Also include localStorage application preferences
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && isApplicationSettingLocalStorageKey(k)) {
          if (searchQuery && !k.toLowerCase().includes(searchQuery.toLowerCase())) continue;
          const raw = localStorage.getItem(k);
          let parsed: any = raw;
          try {
            parsed = raw ? JSON.parse(raw) : raw;
          } catch {}
          let title = k;
          let subtitle = 'Preference';
          if (k === 'fx_theme_mode') {
            title = 'Theme Mode Preference';
            subtitle = `Active Theme: ${raw}`;
          } else if (k === 'fx_sync_chart_bg') {
            title = 'Sync Chart Background with Theme';
            subtitle = `Enabled: ${raw}`;
          } else if (k === 'fx_magnet_mode') {
            title = 'Magnet Snapping Mode';
            subtitle = `Active Mode: ${raw}`;
          } else if (k === 'tv_clone_settings') {
            title = 'Legacy Chart Settings Mirror';
            subtitle = 'Synchronized Chart Settings';
          }
          items.push({
            id: `ls:${k}`,
            category: 'settings',
            title,
            subtitle,
            sizeBytes: raw ? raw.length : 0,
            metadata: { key: k, value: parsed },
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
      if (recordId.startsWith('idb:')) {
        const key = recordId.replace('idb:', '');
        await executeTx(STORES.DRAWINGS, 'readwrite', (store) => store.delete(key));
      } else {
        localStorage.removeItem(recordId);
      }
    } else if (categoryId === 'workspace_layout') {
      if (recordId.startsWith('ls:')) {
        const key = recordId.replace('ls:', '');
        localStorage.removeItem(key);
      } else {
        await executeTx(STORES.WORKSPACE_LAYOUT, 'readwrite', (store) => store.delete(recordId));
      }
    } else if (categoryId === 'settings') {
      if (recordId.startsWith('ls:')) {
        const key = recordId.replace('ls:', '');
        localStorage.removeItem(key);
      } else {
        await executeTx(STORES.SETTINGS, 'readwrite', (store) => store.delete(recordId));
      }
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
      const keysToRemove = ['layout_type', 'layout_slots', 'layout_sizes', 'active_layout_config'];
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } else if (categoryId === 'settings') {
      await executeTx(STORES.SETTINGS, 'readwrite', (store) => store.clear());
      const keysToRemove = ['fx_theme_mode', 'fx_sync_chart_bg', 'fx_magnet_mode', 'tv_clone_settings'];
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } else if (categoryId === 'drawing_templates') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && isDrawingTemplateOrPresetKey(key)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // Also clear folder entries in DRAWINGS store
      const drawingKeys = await executeTx<IDBValidKey[]>(STORES.DRAWINGS, 'readonly', (store) => store.getAllKeys());
      for (const dKey of drawingKeys) {
        const kStr = String(dKey);
        if (kStr.startsWith('folders:')) {
          await executeTx(STORES.DRAWINGS, 'readwrite', (store) => store.delete(kStr));
        }
      }
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
