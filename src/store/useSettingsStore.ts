import { create } from 'zustand';
import type { ChartSettings, TimeframeOption } from './types';
import { PRESET_SETTINGS } from '@/config';

interface SettingsState {
  settings: ChartSettings;
  customTimeframes: TimeframeOption[];

  // Actions
  setSettings: (settings: Partial<ChartSettings>) => void;
  setInitialState: (settings: ChartSettings, customTimeframes: TimeframeOption[]) => void;
  resetSettings: () => void;
  addCustomTimeframe: (tf: TimeframeOption) => void;
  removeCustomTimeframe: (value: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: PRESET_SETTINGS.classic,
  customTimeframes: [],

  setInitialState: (settings, customTimeframes) =>
    set(() => ({ settings, customTimeframes })),

  setSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  resetSettings: () =>
    set(() => ({
      settings: PRESET_SETTINGS.classic,
    })),

  addCustomTimeframe: (tf) =>
    set((state) => {
      if (state.customTimeframes.some((t) => t.value === tf.value)) return {};
      return { customTimeframes: [...state.customTimeframes, tf] };
    }),

  removeCustomTimeframe: (value) =>
    set((state) => ({
      customTimeframes: state.customTimeframes.filter((t) => t.value !== value),
    })),
}));
