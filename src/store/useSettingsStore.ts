import { create } from 'zustand';
import type { ChartSettings, TimeframeOption } from './types';
import type { ThemeMode, CustomThemePalette } from '@/config';
import {
  PRESET_SETTINGS,
  getThemeTokens,
  getThemeChartBackground,
} from '@/config';
import {
  applyThemeToDOM,
  getStoredThemeMode,
  storeThemeMode,
  getStoredCustomTheme,
  storeCustomTheme,
} from '@/utils/themeApplier';

interface SettingsState {
  settings: ChartSettings;
  customTimeframes: TimeframeOption[];
  themeMode: ThemeMode;
  customTheme: CustomThemePalette;

  // Actions
  setSettings: (settings: Partial<ChartSettings>) => void;
  setInitialState: (settings: ChartSettings, customTimeframes: TimeframeOption[]) => void;
  resetSettings: () => void;
  addCustomTimeframe: (tf: TimeframeOption) => void;
  removeCustomTimeframe: (value: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setCustomTheme: (custom: Partial<CustomThemePalette>) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: PRESET_SETTINGS.classic,
  customTimeframes: [],
  themeMode: getStoredThemeMode(),
  customTheme: getStoredCustomTheme(),

  setInitialState: (settings, customTimeframes) => {
    const mode = getStoredThemeMode();
    const custom = getStoredCustomTheme();
    applyThemeToDOM(getThemeTokens(mode, custom));
    set(() => ({ settings, customTimeframes, themeMode: mode, customTheme: custom }));
  },

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

  setThemeMode: (mode) => {
    storeThemeMode(mode);
    const custom = get().customTheme;
    applyThemeToDOM(getThemeTokens(mode, custom));
    if (get().settings.syncChartBackgroundWithTheme) {
      const bg = getThemeChartBackground(mode, custom);
      set((state) => ({
        themeMode: mode,
        settings: {
          ...state.settings,
          background: bg,
          ...(state.settings.backgroundType === 'None' ? { backgroundType: 'Solid' as const } : {}),
        },
      }));
    } else {
      set(() => ({ themeMode: mode }));
    }
  },

  setCustomTheme: (newCustom) => {
    const updatedCustom = { ...get().customTheme, ...newCustom };
    storeCustomTheme(updatedCustom);
    if (get().themeMode === 'custom') {
      applyThemeToDOM(getThemeTokens('custom', updatedCustom));
      if (get().settings.syncChartBackgroundWithTheme) {
        set((state) => ({
          customTheme: updatedCustom,
          settings: {
            ...state.settings,
            background: updatedCustom.bgApp,
            ...(state.settings.backgroundType === 'None' ? { backgroundType: 'Solid' as const } : {}),
          },
        }));
        return;
      }
    }
    set(() => ({ customTheme: updatedCustom }));
  },
}));
