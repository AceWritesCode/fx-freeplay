import type { PersistedCaptureDefaults } from '../types';

const STORAGE_KEY = 'fx_capture_defaults_v1';

export const INITIAL_CAPTURE_DEFAULTS: PersistedCaptureDefaults = {
  rememberSettings: false,
  rememberSettingsPerType: {
    screenshot: false,
    video: false,
    gif: false,
  },
  screenshot: {
    format: 'png',
    quality: 0.92,
    resolutionScale: 1,
    copyToClipboard: false,
    saveToDevice: true,
    includeWatermark: false,
    feedbackMode: 'preview',
  },
  video: {
    areaMode: 'canvas',
    format: 'webm',
    resolution: '1080p',
    fps: 60,
    quality: 'high',
    includeMicrophone: false,
    countdownSeconds: 3,
  },
  gif: {
    fps: 15,
    quality: 'standard',
    maxDurationSeconds: 10,
    loop: true,
    resolutionScale: 1,
  },
};

/**
 * Loads persisted capture defaults from localStorage.
 */
export function loadPersistedCaptureDefaults(): PersistedCaptureDefaults {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...INITIAL_CAPTURE_DEFAULTS };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_CAPTURE_DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      rememberSettings: Boolean(parsed.rememberSettings),
      rememberSettingsPerType: {
        screenshot: Boolean(parsed.rememberSettingsPerType?.screenshot ?? parsed.rememberSettings),
        video: Boolean(parsed.rememberSettingsPerType?.video ?? parsed.rememberSettings),
        gif: Boolean(parsed.rememberSettingsPerType?.gif ?? parsed.rememberSettings),
      },
      screenshot: { ...INITIAL_CAPTURE_DEFAULTS.screenshot, ...(parsed.screenshot || {}) },
      video: {
        ...INITIAL_CAPTURE_DEFAULTS.video,
        ...(parsed.video || {}),
        areaMode:
          parsed.video?.areaMode === 'custom'
            ? 'custom'
            : 'canvas',
      },
      gif: { ...INITIAL_CAPTURE_DEFAULTS.gif, ...(parsed.gif || {}) },
    };
  } catch (err) {
    console.warn('[Capture] Failed to parse persisted capture defaults:', err);
    return { ...INITIAL_CAPTURE_DEFAULTS };
  }
}

/**
 * Saves persisted capture defaults to localStorage.
 */
export function savePersistedCaptureDefaults(defaults: PersistedCaptureDefaults): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch (err) {
    console.warn('[Capture] Failed to save persisted capture defaults:', err);
  }
}

/**
 * Resets persisted capture defaults to system factory values.
 */
export function resetPersistedCaptureDefaults(): PersistedCaptureDefaults {
  const fresh: PersistedCaptureDefaults = {
    rememberSettings: false,
    rememberSettingsPerType: {
      screenshot: false,
      video: false,
      gif: false,
    },
    screenshot: { ...INITIAL_CAPTURE_DEFAULTS.screenshot },
    video: { ...INITIAL_CAPTURE_DEFAULTS.video },
    gif: { ...INITIAL_CAPTURE_DEFAULTS.gif },
  };
  savePersistedCaptureDefaults(fresh);
  return fresh;
}
