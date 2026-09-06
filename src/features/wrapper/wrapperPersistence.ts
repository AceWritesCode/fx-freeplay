import type { WrapperSettingsState } from './types';

const WRAPPER_SETTINGS_STORAGE_KEY = 'fx_wrapper_settings';

export const DEFAULT_WRAPPER_SETTINGS: WrapperSettingsState = {
  theme: 'dark',
  launchAtStartup: false,
  startMinimized: false,
  hardwareAcceleration: true,
  autoCheckUpdates: true,
  notificationPreferences: true,
  defaultModuleOnLaunch: 'home',
};

/**
 * Loads wrapper settings from localStorage with validation and fallback.
 */
export function loadWrapperSettings(): WrapperSettingsState {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_WRAPPER_SETTINGS };
  }

  try {
    const raw = localStorage.getItem(WRAPPER_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WRAPPER_SETTINGS };

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        ...DEFAULT_WRAPPER_SETTINGS,
        ...parsed,
      };
    }
    return { ...DEFAULT_WRAPPER_SETTINGS };
  } catch (err) {
    console.warn('[Wrapper] Failed to parse saved wrapper settings, using defaults:', err);
    return { ...DEFAULT_WRAPPER_SETTINGS };
  }
}

/**
 * Resolves the destination module on application launch.
 * Available modules: 'home' and 'charts'.
 * Any other module (e.g. 'journal', 'backtesting', 'research', or unknown) gracefully falls back to 'home'.
 */
export function resolveStartupDestination(targetModule?: string): {
  destination: 'home' | 'charts';
  fallbackReason?: string;
} {
  const target = targetModule?.toLowerCase().trim() || 'home';

  if (target === 'charts') {
    return { destination: 'charts' };
  }

  if (target === 'home') {
    return { destination: 'home' };
  }

  const capitalized = target.charAt(0).toUpperCase() + target.slice(1);
  return {
    destination: 'home',
    fallbackReason: `[Wrapper] Module unavailable: ${capitalized} -> Falling back to Home`,
  };
}

/**
 * Saves wrapper settings to localStorage.
 */
export function saveWrapperSettings(settings: Partial<WrapperSettingsState>): WrapperSettingsState {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_WRAPPER_SETTINGS, ...settings };
  }

  try {
    const current = loadWrapperSettings();
    const merged = { ...current, ...settings };
    localStorage.setItem(WRAPPER_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.error('[Wrapper] Failed to save wrapper settings:', err);
    return { ...DEFAULT_WRAPPER_SETTINGS, ...settings };
  }
}
