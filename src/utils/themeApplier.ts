import type { ThemeTokens, ThemeMode, CustomThemePalette } from '@/config/themes';
import { getThemeTokens, DEFAULT_CUSTOM_THEME } from '@/config/themes';

const THEME_MODE_KEY = 'fx_theme_mode';
const CUSTOM_THEME_KEY = 'fx_custom_theme';

/**
 * Applies semantic ThemeTokens to DOM root documentElement via CSS custom properties.
 */
export const applyThemeToDOM = (tokens: ThemeTokens): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // App & Surfaces
  root.style.setProperty('--bg-app', tokens.bgApp);
  root.style.setProperty('--bg-slot', tokens.bgSlot);
  root.style.setProperty('--bg-surface', tokens.bgSurface);
  root.style.setProperty('--bg-surface-elevated', tokens.bgSurfaceElevated);
  root.style.setProperty('--bg-modal', tokens.bgModal);
  root.style.setProperty('--bg-overlay', tokens.bgOverlay);

  // Typography
  root.style.setProperty('--text-primary', tokens.textPrimary);
  root.style.setProperty('--text-secondary', tokens.textSecondary);
  root.style.setProperty('--text-muted', tokens.textMuted);
  root.style.setProperty('--text-inverse', tokens.textInverse);

  // Borders & Outlines
  root.style.setProperty('--border-default', tokens.borderDefault);
  root.style.setProperty('--border-subdued', tokens.borderSubdued);
  root.style.setProperty('--border-focus', tokens.borderFocus);

  // Accents & Interactive
  root.style.setProperty('--accent-primary', tokens.accentPrimary);
  root.style.setProperty('--accent-hover', tokens.accentHover);
  root.style.setProperty('--accent-muted', tokens.accentMuted);
  root.style.setProperty('--surface-hover', tokens.surfaceHover);
  root.style.setProperty('--surface-active', tokens.surfaceActive);

  // Status Alerts
  root.style.setProperty('--status-success', tokens.statusSuccess);
  root.style.setProperty('--status-error', tokens.statusError);
  root.style.setProperty('--status-warning', tokens.statusWarning);
  root.style.setProperty('--status-info', tokens.statusInfo);
};

/**
 * Gets persisted ThemeMode from localStorage or defaults to 'dark'.
 */
export const getStoredThemeMode = (): ThemeMode => {
  if (typeof localStorage === 'undefined') return 'dark';
  const mode = localStorage.getItem(THEME_MODE_KEY) as ThemeMode;
  if (mode === 'light' || mode === 'amoled' || mode === 'dark' || mode === 'custom') {
    return mode;
  }
  return 'dark';
};

/**
 * Persists ThemeMode to localStorage.
 */
export const storeThemeMode = (mode: ThemeMode): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(THEME_MODE_KEY, mode);
};

/**
 * Gets persisted CustomThemePalette from localStorage.
 */
export const getStoredCustomTheme = (): CustomThemePalette => {
  if (typeof localStorage === 'undefined') return DEFAULT_CUSTOM_THEME;
  try {
    const raw = localStorage.getItem(CUSTOM_THEME_KEY);
    if (raw) {
      return { ...DEFAULT_CUSTOM_THEME, ...JSON.parse(raw) };
    }
  } catch (e) {}
  return DEFAULT_CUSTOM_THEME;
};

/**
 * Persists CustomThemePalette to localStorage.
 */
export const storeCustomTheme = (palette: CustomThemePalette): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(palette));
  } catch (e) {}
};

/**
 * Hydrates DOM CSS variables immediately from localStorage on startup.
 */
export const initThemeFromStorage = (): void => {
  const mode = getStoredThemeMode();
  const custom = getStoredCustomTheme();
  const tokens = getThemeTokens(mode, custom);
  applyThemeToDOM(tokens);
};
