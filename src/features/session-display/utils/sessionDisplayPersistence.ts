import type {
  BuiltInSessionId,
  SessionConfig,
  SessionDisplaySettings,
} from '../types';
import {
  BUILT_IN_SESSION_IDS,
  DEFAULT_BUILT_IN_SESSIONS,
  DEFAULT_CUSTOM_SESSIONS,
  DEFAULT_SESSION_DISPLAY_SETTINGS,
} from '../types';

const STORAGE_KEY = 'fx_session_display_settings_v1';
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Validates whether a given string is a valid 24-hour time format "HH:mm".
 */
function isValidTimeFormat(time: unknown): boolean {
  return typeof time === 'string' && TIME_REGEX.test(time);
}

/**
 * Validates and sanitizes an individual session configuration, falling back to safe defaults if invalid.
 */
function sanitizeSessionConfig(
  raw: unknown,
  fallback: SessionConfig,
  isCustom = false
): SessionConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...fallback, isCustom };
  }

  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : fallback.id;
  const name = typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : fallback.name;
  const enabled = typeof obj.enabled === 'boolean' ? obj.enabled : fallback.enabled;
  const startTime = isValidTimeFormat(obj.startTime) ? (obj.startTime as string) : fallback.startTime;
  const endTime = isValidTimeFormat(obj.endTime) ? (obj.endTime as string) : fallback.endTime;
  const color = typeof obj.color === 'string' && obj.color.trim() ? obj.color.trim() : fallback.color;

  return {
    id,
    name,
    enabled,
    startTime,
    endTime,
    color,
    isCustom,
  };
}

/**
 * Validates, migrates, and sanitizes untrusted raw data into a strictly valid SessionDisplaySettings object.
 */
export function sanitizeSessionDisplaySettings(raw: unknown): SessionDisplaySettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SESSION_DISPLAY_SETTINGS };
  }

  const obj = raw as Record<string, unknown>;
  const enabled = typeof obj.enabled === 'boolean' ? obj.enabled : DEFAULT_SESSION_DISPLAY_SETTINGS.enabled;
  const timezone = typeof obj.timezone === 'string' && obj.timezone.trim()
    ? obj.timezone.trim()
    : DEFAULT_SESSION_DISPLAY_SETTINGS.timezone;

  // 1. Sanitize Built-In Sessions
  const builtInSessions: Record<BuiltInSessionId, SessionConfig> = { ...DEFAULT_BUILT_IN_SESSIONS };
  const rawBuiltIns = (obj.builtInSessions as Record<string, unknown> | undefined);
  const legacySessions = (obj.sessions as Record<string, unknown> | undefined);

  for (const id of BUILT_IN_SESSION_IDS) {
    const defaultSession = DEFAULT_BUILT_IN_SESSIONS[id];
    // Support both new `raw.builtInSessions[id]` and legacy `raw.sessions[id]`
    const candidate = rawBuiltIns?.[id] ?? legacySessions?.[id];
    builtInSessions[id] = sanitizeSessionConfig(candidate, defaultSession, false);
  }

  // 2. Sanitize Custom Sessions with stable identities
  let customSessions: SessionConfig[] = [];

  if (Array.isArray(obj.customSessions)) {
    // Current format: array of custom sessions with stable IDs
    customSessions = obj.customSessions.map((item: unknown, idx: number) => {
      const fallback = DEFAULT_CUSTOM_SESSIONS[idx] ?? {
        id: `custom_${Date.now()}_${idx}`,
        name: `Custom ${idx + 1}`,
        enabled: false,
        startTime: '12:00',
        endTime: '15:00',
        color: 'rgba(156, 39, 176, 0.15)',
        isCustom: true,
      };
      return sanitizeSessionConfig(item, fallback, true);
    });
  } else if (legacySessions && typeof legacySessions === 'object') {
    // Migration from Step 1 legacy format where sessions were under keys 'custom', 'custom2', 'custom3'
    const legacyKeys: [string, string, number][] = [
      ['custom', 'custom_1', 0],
      ['custom2', 'custom_2', 1],
      ['custom3', 'custom_3', 2],
    ];

    for (const [legacyKey, stableId, defaultIdx] of legacyKeys) {
      if (legacySessions[legacyKey]) {
        const fallback = DEFAULT_CUSTOM_SESSIONS[defaultIdx];
        const sanitized = sanitizeSessionConfig(legacySessions[legacyKey], fallback, true);
        sanitized.id = stableId;
        customSessions.push(sanitized);
      }
    }
  }

  // If no custom sessions were parsed or valid, fallback to the 3 standard defaults
  if (customSessions.length === 0) {
    customSessions = DEFAULT_CUSTOM_SESSIONS.map(s => ({ ...s }));
  }

  return {
    enabled,
    timezone,
    builtInSessions,
    customSessions,
  };
}

/**
 * Loads cached session display settings synchronously from localStorage.
 */
export function loadCachedSessionDisplaySettings(): SessionDisplaySettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_SESSION_DISPLAY_SETTINGS };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SESSION_DISPLAY_SETTINGS };
    const parsed = JSON.parse(raw);
    return sanitizeSessionDisplaySettings(parsed);
  } catch (err) {
    console.warn('[SessionDisplayPersistence] Failed to parse cached session settings:', err);
    return { ...DEFAULT_SESSION_DISPLAY_SETTINGS };
  }
}

/**
 * Saves session display settings to localStorage cache.
 */
export function saveCachedSessionDisplaySettings(settings: SessionDisplaySettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('[SessionDisplayPersistence] Failed to save session settings to cache:', err);
  }
}

/**
 * Clears cached session display settings from localStorage.
 */
export function clearCachedSessionDisplaySettings(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[SessionDisplayPersistence] Failed to clear cached session settings:', err);
  }
}
