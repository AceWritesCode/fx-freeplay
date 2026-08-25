import type { WorkspaceLayoutConfig, WorkspaceLayoutRepository } from './types';
import { executeTx, STORES } from './db';

const LAYOUT_KEY = 'current_layout_config';

export class WorkspaceLayoutRepositoryImpl implements WorkspaceLayoutRepository {
  async getLayoutConfig(): Promise<WorkspaceLayoutConfig | null> {
    const config = await executeTx<WorkspaceLayoutConfig | undefined>(
      STORES.WORKSPACE_LAYOUT,
      'readonly',
      (store) => store.get(LAYOUT_KEY)
    );
    return config || null;
  }

  async saveLayoutConfig(configUpdate: Partial<WorkspaceLayoutConfig>): Promise<void> {
    const existing = (await this.getLayoutConfig()) || {
      layoutType: '1',
      slots: [
        { symbol: null, timeframe: '1m' },
        { symbol: null, timeframe: '1m' },
        { symbol: null, timeframe: '1m' },
        { symbol: null, timeframe: '1m' },
      ],
      layoutSizes: {
        '2v': [50, 50],
        '2h': [50, 50],
        '3v': [33.33, 33.33, 33.34],
        '3h': [33.33, 33.33, 33.34],
        '3g1_main': [66.66, 33.34],
        '3g1_sub': [50, 50],
        '3g2_main': [66.66, 33.34],
        '3g2_sub': [50, 50],
        '4g_main': [50, 50],
        '4g_left': [50, 50],
        '4g_right': [50, 50],
        '4v': [25, 25, 25, 25],
        '4h': [25, 25, 25, 25],
      },
      syncSettings: {
        syncSymbol: true,
        syncInterval: true,
        syncCrosshair: true,
        syncTime: true,
        syncDateRange: true,
        syncDrawings: true,
      },
    };

    const merged: WorkspaceLayoutConfig = {
      layoutType: configUpdate.layoutType ?? existing.layoutType,
      slots: configUpdate.slots ?? existing.slots,
      layoutSizes: configUpdate.layoutSizes
        ? { ...existing.layoutSizes, ...configUpdate.layoutSizes }
        : existing.layoutSizes,
      syncSettings: {
        ...existing.syncSettings,
        ...(configUpdate.syncSettings || {}),
      },
    };

    await executeTx(STORES.WORKSPACE_LAYOUT, 'readwrite', (store) =>
      store.put(merged, LAYOUT_KEY)
    );
  }
}
