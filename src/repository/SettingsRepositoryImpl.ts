import type { ChartSettings, TimeframeOption } from '@/config';
import type { SettingsRepository } from './types';
import { executeTx, STORES } from './db';

const SETTINGS_KEY = 'global_settings';
const CUSTOM_TIMEFRAMES_KEY = 'custom_timeframes';

export class SettingsRepositoryImpl implements SettingsRepository {
  async getSettings(): Promise<ChartSettings | null> {
    const settings = await executeTx<ChartSettings | undefined>(
      STORES.SETTINGS,
      'readonly',
      (store) => store.get(SETTINGS_KEY)
    );
    return settings || null;
  }

  async saveSettings(settings: ChartSettings): Promise<void> {
    await executeTx(STORES.SETTINGS, 'readwrite', (store) => store.put(settings, SETTINGS_KEY));
  }

  async getCustomTimeframes(): Promise<TimeframeOption[]> {
    const tfs = await executeTx<TimeframeOption[] | undefined>(
      STORES.SETTINGS,
      'readonly',
      (store) => store.get(CUSTOM_TIMEFRAMES_KEY)
    );
    return tfs || [];
  }

  async saveCustomTimeframes(tfList: TimeframeOption[]): Promise<void> {
    await executeTx(STORES.SETTINGS, 'readwrite', (store) =>
      store.put(tfList, CUSTOM_TIMEFRAMES_KEY)
    );
  }
}
