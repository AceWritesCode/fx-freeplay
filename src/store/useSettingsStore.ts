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
  getStoredSyncChartBackground,
  storeSyncChartBackground,
} from '@/utils/themeApplier';
import { resolveVisibleScaleTextColor, resolveVisibleScaleLineColor, resolveVisibleCrosshairTextColor } from '@/utils/chartFormatters';

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
  settings: {
    ...PRESET_SETTINGS.classic,
    syncChartBackgroundWithTheme: getStoredSyncChartBackground(),
  },
  customTimeframes: [],
  themeMode: getStoredThemeMode(),
  customTheme: getStoredCustomTheme(),

  setInitialState: (settings, customTimeframes) => {
    const mode = getStoredThemeMode();
    const custom = getStoredCustomTheme();
    const storedSync = getStoredSyncChartBackground();
    applyThemeToDOM(getThemeTokens(mode, custom));
    const syncEnabled = settings.syncChartBackgroundWithTheme ?? storedSync;
    const mergedSettings: ChartSettings = {
      chartType: 'candlestick',
      lineColor: '#2962FF',
      ...settings,
      syncChartBackgroundWithTheme: syncEnabled,
    };
    if (syncEnabled) {
      mergedSettings.background = getThemeChartBackground(mode, custom);
      if (mergedSettings.backgroundType === 'None') {
        mergedSettings.backgroundType = 'Solid';
      }
    }
    const effectiveBg = mergedSettings.backgroundType === 'None'
      ? getThemeChartBackground(mode, custom)
      : mergedSettings.background;
    mergedSettings.scalesTextColor = resolveVisibleScaleTextColor(mergedSettings.scalesTextColor, effectiveBg);
    mergedSettings.scalesLinesColor = resolveVisibleScaleLineColor(mergedSettings.scalesLinesColor, effectiveBg);
    const crosshairLabelBg = mergedSettings.crosshairLabelBgColor || mergedSettings.crosshairColor || '#363c4e';
    mergedSettings.crosshairTextColor = resolveVisibleCrosshairTextColor(mergedSettings.crosshairTextColor || '#ffffff', crosshairLabelBg);

    set(() => ({ settings: mergedSettings, customTimeframes, themeMode: mode, customTheme: custom }));
  },

  setSettings: (newSettings) => {
    if (newSettings.syncChartBackgroundWithTheme !== undefined) {
      storeSyncChartBackground(newSettings.syncChartBackgroundWithTheme);
    }
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

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
          scalesTextColor: resolveVisibleScaleTextColor(state.settings.scalesTextColor, bg),
          scalesLinesColor: resolveVisibleScaleLineColor(state.settings.scalesLinesColor, bg),
          ...(state.settings.backgroundType === 'None' ? { backgroundType: 'Solid' as const } : {}),
        },
      }));
    } else {
      set((state) => {
        const effectiveBg = state.settings.backgroundType === 'None'
          ? getThemeChartBackground(mode, custom)
          : state.settings.background;
        return {
          themeMode: mode,
          settings: {
            ...state.settings,
            scalesTextColor: resolveVisibleScaleTextColor(state.settings.scalesTextColor, effectiveBg),
            scalesLinesColor: resolveVisibleScaleLineColor(state.settings.scalesLinesColor, effectiveBg),
          },
        };
      });
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
            scalesTextColor: resolveVisibleScaleTextColor(state.settings.scalesTextColor, updatedCustom.bgApp),
            scalesLinesColor: resolveVisibleScaleLineColor(state.settings.scalesLinesColor, updatedCustom.bgApp),
            ...(state.settings.backgroundType === 'None' ? { backgroundType: 'Solid' as const } : {}),
          },
        }));
        return;
      }
    }
    set(() => ({ customTheme: updatedCustom }));
  },
}));
