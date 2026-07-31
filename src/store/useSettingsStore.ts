import { create } from 'zustand';
import type { ChartSettings, TimeframeOption } from './types';
import { PRESET_SETTINGS } from '@/config';
import { persistenceService } from '@/engine/workspace/persistence';

interface SettingsState {
  settings: ChartSettings;
  customTimeframes: TimeframeOption[];

  // Actions
  setSettings: (settings: Partial<ChartSettings>) => void;
  resetSettings: () => void;
  addCustomTimeframe: (tf: TimeframeOption) => void;
  removeCustomTimeframe: (value: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => {
  // Load initial settings from persistenceService or fallback to classic presets
  const savedSettings = persistenceService.getSettings();
  const initialSettings = savedSettings
    ? { ...PRESET_SETTINGS.classic, ...savedSettings }
    : PRESET_SETTINGS.classic;

  // Load initial custom timeframes from localStorage
  const savedTfs = localStorage.getItem('tv_clone_custom_timeframes');
  const initialTfs = savedTfs ? JSON.parse(savedTfs) : [];

  return {
    settings: initialSettings,
    customTimeframes: initialTfs,

    setSettings: (newSettings) =>
      set((state) => {
        const updated = { ...state.settings, ...newSettings };
        persistenceService.setSettings(updated);
        return { settings: updated };
      }),

    resetSettings: () =>
      set(() => {
        const defaultSettings = PRESET_SETTINGS.classic;
        persistenceService.setSettings(defaultSettings);
        return { settings: defaultSettings };
      }),

    addCustomTimeframe: (tf) =>
      set((state) => {
        const updated = [...state.customTimeframes, tf];
        localStorage.setItem('tv_clone_custom_timeframes', JSON.stringify(updated));
        return { customTimeframes: updated };
      }),

    removeCustomTimeframe: (value) =>
      set((state) => {
        const updated = state.customTimeframes.filter((t) => t.value !== value);
        localStorage.setItem('tv_clone_custom_timeframes', JSON.stringify(updated));
        return { customTimeframes: updated };
      }),
  };
});
