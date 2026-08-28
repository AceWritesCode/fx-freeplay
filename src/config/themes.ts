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
  borderDefault: string;
  accentPrimary: string;
}

export const DEFAULT_CUSTOM_THEME: CustomThemePalette = {
  bgApp: '#131722',
  bgSurface: '#1e222d',
  bgSurfaceElevated: '#2a2e39',
  bgModal: '#1e222d',
  textPrimary: '#ffffff',
  textSecondary: '#b2b5be',
  borderDefault: '#2a2e39',
  accentPrimary: '#6366f1',
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

    borderDefault: '#2a2e39',
    borderSubdued: '#363a45',
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

  // AMOLED Dark Theme (True Black #000000 + Neutral High Contrast)
  amoled: {
    bgApp: '#000000',
    bgSlot: '#000000',
    bgSurface: '#0d0d0d',
    bgSurfaceElevated: '#1a1a1a',
    bgModal: '#0d0d0d',
    bgOverlay: 'rgba(0, 0, 0, 0.85)',

    textPrimary: '#ffffff',
    textSecondary: '#a3a3a3',
    textMuted: '#525252',
    textInverse: '#000000',

    borderDefault: '#262626',
    borderSubdued: '#171717',
    borderFocus: '#ffffff',

    accentPrimary: '#ffffff',
    accentHover: '#e5e5e5',
    accentMuted: 'rgba(255, 255, 255, 0.12)',
    surfaceHover: '#1a1a1a',
    surfaceActive: '#262626',

    statusSuccess: '#10b981',
    statusError: '#ef4444',
    statusWarning: '#f59e0b',
    statusInfo: '#3b82f6',
  },

  // Light Theme (Clean slate light palette)
  light: {
    bgApp: '#f8fafc',
    bgSlot: '#ffffff',
    bgSurface: '#ffffff',
    bgSurfaceElevated: '#f1f5f9',
    bgModal: '#ffffff',
    bgOverlay: 'rgba(15, 23, 42, 0.4)',

    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    textInverse: '#ffffff',

    borderDefault: '#e2e8f0',
    borderSubdued: '#f1f5f9',
    borderFocus: '#2563eb',

    accentPrimary: '#2563eb',
    accentHover: '#1d4ed8',
    accentMuted: 'rgba(37, 99, 235, 0.1)',
    surfaceHover: '#f1f5f9',
    surfaceActive: '#e2e8f0',

    statusSuccess: '#10b981',
    statusError: '#ef4444',
    statusWarning: '#f59e0b',
    statusInfo: '#2563eb',
  },
};

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
      bgOverlay: 'rgba(0, 0, 0, 0.7)',

      textPrimary: custom.textPrimary,
      textSecondary: custom.textSecondary,
      textMuted: '#71717a',
      textInverse: '#ffffff',

      borderDefault: custom.borderDefault,
      borderSubdued: custom.borderDefault,
      borderFocus: custom.accentPrimary,

      accentPrimary: custom.accentPrimary,
      accentHover: custom.accentPrimary,
      accentMuted: 'rgba(99, 102, 241, 0.15)',
      surfaceHover: custom.bgSurfaceElevated,
      surfaceActive: custom.bgSurfaceElevated,

      statusSuccess: '#089981',
      statusError: '#F23645',
      statusWarning: '#FF6D00',
      statusInfo: '#2962FF',
    };
  }

  return BUILTIN_THEMES[mode] || BUILTIN_THEMES.dark;
};
