export type ThemeMode = 'light' | 'amoled' | 'dark' | 'custom';

export interface ThemeTokens {
  // App & Slot Containers
  bgApp: string;
  bgSlot: string;

  // Surfaces & Panels
  bgSurface: string;
  bgSurfaceElevated: string;
  bgModal: string;
  bgOverlay: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Borders, Dividers & Outlines
  borderDefault: string;
  borderSubdued: string;
  borderFocus: string;

  // Interactive & Accents
  accentPrimary: string;
  accentHover: string;
  accentMuted: string;
  surfaceHover: string;
  surfaceActive: string;

  // Status Alerts & Indicators
  statusSuccess: string;
  statusError: string;
  statusWarning: string;
  statusInfo: string;
}

export interface CustomThemePalette {
  bgApp: string;
  bgSurface: string;
  bgSurfaceElevated: string;
  bgModal: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderDefault: string;
  accentPrimary: string;
  statusSuccess: string;
  statusWarning: string;
  statusError: string;
}

export const DEFAULT_CUSTOM_THEME: CustomThemePalette = {
  bgApp: '#131722',
  bgSurface: '#1e222d',
  bgSurfaceElevated: '#2a2e39',
  bgModal: '#1e222d',
  textPrimary: '#ffffff',
  textSecondary: '#b2b5be',
  textMuted: '#6b7280',
  borderDefault: '#363c4e',
  accentPrimary: '#6366f1',
  statusSuccess: '#089981',
  statusWarning: '#FF6D00',
  statusError: '#F23645',
};

// Built-in theme token mappings
export const BUILTIN_THEMES: Record<'light' | 'amoled' | 'dark', ThemeTokens> = {
  // Current visual identity (Violet/Dark TradingView-inspired style)
  dark: {
    bgApp: '#131722',
    bgSlot: '#181b26',
    bgSurface: '#1e222d',
    bgSurfaceElevated: '#2a2e39',
    bgModal: '#1e222d',
    bgOverlay: 'rgba(0, 0, 0, 0.65)',

    textPrimary: '#ffffff',
    textSecondary: '#b2b5be',
    textMuted: '#6b7280',
    textInverse: '#ffffff',

    borderDefault: '#363c4e',
    borderSubdued: '#282d3b',
    borderFocus: '#6366f1',

    accentPrimary: '#6366f1',
    accentHover: '#4f46e5',
    accentMuted: 'rgba(99, 102, 241, 0.15)',
    surfaceHover: '#2a2e39',
    surfaceActive: '#363a45',

    statusSuccess: '#089981',
    statusError: '#F23645',
    statusWarning: '#FF6D00',
    statusInfo: '#2962FF',
  },

  // AMOLED Dark Theme (True Black #000000 + OLED High Contrast)
  amoled: {
    bgApp: '#000000',
    bgSlot: '#000000',
    bgSurface: '#0a0a0a',
    bgSurfaceElevated: '#171717',
    bgModal: '#0a0a0a',
    bgOverlay: 'rgba(0, 0, 0, 0.85)',

    textPrimary: '#ffffff',
    textSecondary: '#a3a3a3',
    textMuted: '#525252',
    textInverse: '#ffffff',

    borderDefault: '#383838',
    borderSubdued: '#222222',
    borderFocus: '#3b82f6',

    accentPrimary: '#3b82f6',
    accentHover: '#2563eb',
    accentMuted: 'rgba(59, 130, 246, 0.15)',
    surfaceHover: '#171717',
    surfaceActive: '#262626',

    statusSuccess: '#10b981',
    statusError: '#ef4444',
    statusWarning: '#f59e0b',
    statusInfo: '#3b82f6',
  },

  // Light Theme (Clean slate light palette with high-contrast text and borders)
  light: {
    bgApp: '#f8fafc',
    bgSlot: '#ffffff',
    bgSurface: '#ffffff',
    bgSurfaceElevated: '#f1f5f9',
    bgModal: '#ffffff',
    bgOverlay: 'rgba(15, 23, 42, 0.4)',

    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    textInverse: '#ffffff',

    borderDefault: '#cbd5e1',
    borderSubdued: '#e2e8f0',
    borderFocus: '#2563eb',

    accentPrimary: '#2563eb',
    accentHover: '#1d4ed8',
    accentMuted: 'rgba(37, 99, 235, 0.12)',
    surfaceHover: '#f1f5f9',
    surfaceActive: '#e2e8f0',

    statusSuccess: '#10b981',
    statusError: '#ef4444',
    statusWarning: '#f59e0b',
    statusInfo: '#2563eb',
  },
};

/**
 * Converts hex color string to rgba format with specified alpha opacity.
 */
function hexToRgba(hex: string, alpha: number): string {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return `rgba(99, 102, 241, ${alpha})`;
  }
  const cleanHex = hex.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length >= 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Resolves full ThemeTokens object for any given mode or custom palette configuration.
 */
export const getThemeTokens = (
  mode: ThemeMode,
  customPalette?: Partial<CustomThemePalette>
): ThemeTokens => {
  if (mode === 'custom') {
    const custom = { ...DEFAULT_CUSTOM_THEME, ...customPalette };
    return {
      bgApp: custom.bgApp,
      bgSlot: custom.bgApp,
      bgSurface: custom.bgSurface,
      bgSurfaceElevated: custom.bgSurfaceElevated,
      bgModal: custom.bgModal,
      bgOverlay: 'rgba(0, 0, 0, 0.75)',

      textPrimary: custom.textPrimary,
      textSecondary: custom.textSecondary,
      textMuted: custom.textMuted || '#6b7280',
      textInverse: '#ffffff',

      borderDefault: custom.borderDefault,
      borderSubdued: custom.borderDefault,
      borderFocus: custom.accentPrimary,

      accentPrimary: custom.accentPrimary,
      accentHover: custom.accentPrimary,
      accentMuted: hexToRgba(custom.accentPrimary, 0.18),
      surfaceHover: custom.bgSurfaceElevated,
      surfaceActive: custom.bgSurfaceElevated,

      statusSuccess: custom.statusSuccess || '#089981',
      statusError: custom.statusError || '#F23645',
      statusWarning: custom.statusWarning || '#FF6D00',
      statusInfo: custom.accentPrimary,
    };
  }

  return BUILTIN_THEMES[mode] || BUILTIN_THEMES.dark;
};

/**
 * Returns the corresponding chart canvas background color for a given theme mode.
 */
export function getThemeChartBackground(mode: ThemeMode, customTheme?: CustomThemePalette): string {
  switch (mode) {
    case 'amoled':
      return '#000000';
    case 'light':
      return '#ffffff';
    case 'custom':
      return customTheme?.bgApp || '#131722';
    case 'dark':
    default:
      return '#131722';
  }
}
