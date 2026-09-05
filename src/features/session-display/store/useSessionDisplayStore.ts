import { create } from 'zustand';
import type {
  SessionConfig,
  SessionDisplaySettings,
  SessionId,
} from '../types';
import {
  DEFAULT_SESSION_DISPLAY_SETTINGS,
  isBuiltInSessionId,
} from '../types';
import {
  loadCachedSessionDisplaySettings,
  saveCachedSessionDisplaySettings,
  sanitizeSessionDisplaySettings,
} from '../utils/sessionDisplayPersistence';
import { settingsRepository } from '@/repository';

export interface SessionDisplayState {
  settings: SessionDisplaySettings;
  isLoaded: boolean;

  // Actions
  setInitialState: (settings: SessionDisplaySettings) => void;
  setMasterEnabled: (enabled: boolean) => void;
  setTimezone: (timezone: string) => void;
  updateSession: (id: SessionId, updates: Partial<Omit<SessionConfig, 'id'>>) => void;
  addCustomSession: (initial?: Partial<SessionConfig>) => string;
  removeCustomSession: (id: string) => void;
  resetToDefaults: () => void;
}

/**
 * Generates a stable unique ID for a newly created custom session.
 */
function generateCustomSessionId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Helper to persist settings to both synchronous localStorage cache and durable IndexedDB.
 */
function persistSettings(settings: SessionDisplaySettings): void {
  saveCachedSessionDisplaySettings(settings);
  settingsRepository.saveSessionDisplaySettings(settings).catch((err) => {
    console.error('[SessionDisplayStore] Failed to save settings to IndexedDB:', err);
  });
}

// Preset color palette for new custom sessions (subtle alpha tints)
const CUSTOM_COLOR_PALETTE = [
  'rgba(156, 39, 176, 0.15)', // Purple
  'rgba(255, 152, 0, 0.15)',  // Orange
  'rgba(0, 150, 136, 0.15)',  // Teal
  'rgba(233, 30, 99, 0.15)',  // Pink
  'rgba(63, 81, 181, 0.15)',  // Indigo
  'rgba(139, 195, 74, 0.15)', // Light Green
];

export const useSessionDisplayStore = create<SessionDisplayState>((set, get) => ({
  // Synchronously initialize from local storage cache for immediate 0ms hydration
  settings: loadCachedSessionDisplaySettings(),
  isLoaded: true,

  setInitialState: (newSettings) => {
    const sanitized = sanitizeSessionDisplaySettings(newSettings);
    set({ settings: sanitized, isLoaded: true });
    // Keep local cache synchronized with the authoritative repository data
    saveCachedSessionDisplaySettings(sanitized);
  },

  setMasterEnabled: (enabled) => {
    const updated: SessionDisplaySettings = {
      ...get().settings,
      enabled,
    };
    set({ settings: updated });
    persistSettings(updated);
  },

  setTimezone: (timezone) => {
    const updated: SessionDisplaySettings = {
      ...get().settings,
      timezone,
    };
    set({ settings: updated });
    persistSettings(updated);
  },

  updateSession: (id, updates) => {
    const current = get().settings;

    if (isBuiltInSessionId(id)) {
      // Update built-in session
      const existing = current.builtInSessions[id];
      if (!existing) return;

      const updatedBuiltIns = {
        ...current.builtInSessions,
        [id]: {
          ...existing,
          ...updates,
          id, // ID must remain immutable
        },
      };

      const updated: SessionDisplaySettings = {
        ...current,
        builtInSessions: updatedBuiltIns,
      };

      set({ settings: updated });
      persistSettings(updated);
    } else {
      // Update custom session by its stable unique ID
      const updatedCustoms = current.customSessions.map((session) => {
        if (session.id === id) {
          return {
            ...session,
            ...updates,
            id, // ID must remain immutable
            isCustom: true,
          };
        }
        return session;
      });

      const updated: SessionDisplaySettings = {
        ...current,
        customSessions: updatedCustoms,
      };

      set({ settings: updated });
      persistSettings(updated);
    }
  },

  addCustomSession: (initial) => {
    const current = get().settings;
    const newId = generateCustomSessionId();

    // Determine default name based on count or next index
    const customCount = current.customSessions.length;
    const defaultName = `Custom ${customCount + 1}`;
    const paletteIndex = customCount % CUSTOM_COLOR_PALETTE.length;
    const defaultColor = CUSTOM_COLOR_PALETTE[paletteIndex];

    const newSession: SessionConfig = {
      id: newId,
      name: initial?.name || defaultName,
      enabled: initial?.enabled ?? true,
      startTime: initial?.startTime || '12:00',
      endTime: initial?.endTime || '15:00',
      color: initial?.color || defaultColor,
      isCustom: true,
    };

    const updated: SessionDisplaySettings = {
      ...current,
      customSessions: [...current.customSessions, newSession],
    };

    set({ settings: updated });
    persistSettings(updated);

    return newId;
  },

  removeCustomSession: (id) => {
    const current = get().settings;
    // Filter out only the session matching the stable ID; remaining sessions preserve identities
    const updatedCustoms = current.customSessions.filter((s) => s.id !== id);

    const updated: SessionDisplaySettings = {
      ...current,
      customSessions: updatedCustoms,
    };

    set({ settings: updated });
    persistSettings(updated);
  },

  resetToDefaults: () => {
    const defaults = { ...DEFAULT_SESSION_DISPLAY_SETTINGS };
    set({ settings: defaults });
    persistSettings(defaults);
  },
}));
