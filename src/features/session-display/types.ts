export type BuiltInSessionId = 
  | 'asia'
  | 'sydney'
  | 'tokyo'
  | 'frankfurt'
  | 'london'
  | 'newYork';

export const BUILT_IN_SESSION_IDS: readonly BuiltInSessionId[] = [
  'asia',
  'sydney',
  'tokyo',
  'frankfurt',
  'london',
  'newYork',
] as const;

export function isBuiltInSessionId(id: string): id is BuiltInSessionId {
  return (BUILT_IN_SESSION_IDS as readonly string[]).includes(id);
}

export type SessionId = BuiltInSessionId | string;

export interface SessionConfig {
  id: SessionId;
  name: string;
  enabled: boolean;
  startTime: string; // "HH:mm" in 24-hour format
  endTime: string;   // "HH:mm" in 24-hour format
  color: string;     // Hex or RGBA color string (supports built-in alpha/transparency)
  isCustom?: boolean;
}

export type SessionScope = 'all' | 'latest';

export interface SessionDisplaySettings {
  enabled: boolean; // Master toggle
  timezone: string; // 'auto' (tracks active app/chart timezone) or explicit IANA timezone string
  sessionScope: SessionScope; // 'all' (Show All historical sessions) | 'latest' (Show Latest session only)
  builtInSessions: Record<BuiltInSessionId, SessionConfig>;
  customSessions: SessionConfig[]; // Stable unique IDs, array preserves display order
}

export const DEFAULT_BUILT_IN_SESSIONS: Record<BuiltInSessionId, SessionConfig> = {
  asia: {
    id: 'asia',
    name: 'Asia',
    enabled: true,
    startTime: '18:00',
    endTime: '03:01',
    color: 'rgba(0, 188, 212, 0.15)', // Aqua / Cyan
    isCustom: false,
  },
  sydney: {
    id: 'sydney',
    name: 'Sydney',
    enabled: false,
    startTime: '18:00',
    endTime: '02:01',
    color: 'rgba(38, 198, 218, 0.15)', // Aqua / Cyan
    isCustom: false,
  },
  tokyo: {
    id: 'tokyo',
    name: 'Tokyo',
    enabled: false,
    startTime: '19:00',
    endTime: '03:01',
    color: 'rgba(0, 172, 193, 0.15)', // Aqua / Cyan
    isCustom: false,
  },
  frankfurt: {
    id: 'frankfurt',
    name: 'Frankfurt',
    enabled: false,
    startTime: '02:00',
    endTime: '10:01',
    color: 'rgba(41, 98, 255, 0.15)', // Blue family
    isCustom: false,
  },
  london: {
    id: 'london',
    name: 'London',
    enabled: true,
    startTime: '03:00',
    endTime: '11:01',
    color: 'rgba(38, 166, 154, 0.15)', // Green family
    isCustom: false,
  },
  newYork: {
    id: 'newYork',
    name: 'New York',
    enabled: true,
    startTime: '08:00',
    endTime: '16:01',
    color: 'rgba(255, 82, 82, 0.15)', // Pink / Red family
    isCustom: false,
  },
};

export const DEFAULT_CUSTOM_SESSIONS: SessionConfig[] = [];

export const DEFAULT_SESSION_DISPLAY_SETTINGS: SessionDisplaySettings = {
  enabled: true,
  timezone: 'auto',
  sessionScope: 'all',
  builtInSessions: DEFAULT_BUILT_IN_SESSIONS,
  customSessions: DEFAULT_CUSTOM_SESSIONS,
};

/**
 * Represents a single calculated session occurrence.
 * All timestamps are in UTC epoch milliseconds.
 * Interval convention: [startTimestamp, endTimestamp) - half-open interval.
 */
export interface SessionOccurrence {
  /** Deterministic unique ID: `${sessionId}_${startTimestamp}` */
  id: string;
  /** Configured session id ('london', 'custom_1', etc.) */
  sessionId: string;
  /** Display name of the session ('London', 'Custom 1', etc.) */
  sessionName: string;
  /** UTC epoch timestamp in milliseconds when the session starts (inclusive) */
  startTimestamp: number;
  /** UTC epoch timestamp in milliseconds when the session ends (exclusive) */
  endTimestamp: number;
  /** Color assigned to the session (RGBA or HEX string) */
  color: string;
  /** Whether this is a custom user session */
  isCustom: boolean;
}

/**
 * Input parameters for the Session Calculation Engine.
 */
export interface CalculateSessionsParams {
  /** Session display settings (visibility, timezone, scope, built-in sessions, custom sessions) */
  settings: SessionDisplaySettings;
  /** Start of visible chart viewport in UTC epoch milliseconds (inclusive) */
  visibleStart: number;
  /** End of visible chart viewport in UTC epoch milliseconds (exclusive) */
  visibleEnd: number;
  /** Current or replay chart time in UTC epoch milliseconds */
  currentTime: number;
  /**
   * Application-level active timezone label or IANA string (e.g. '(UTC-4) New York' or 'America/New_York').
   * Used when settings.timezone === 'auto'.
   */
  appTimezone?: string;
}

/**
 * Result returned by the Session Calculation Engine for consumption by Step 4 (Renderer).
 */
export interface SessionCalculationResult {
  /** Calculated session occurrences overlapping the viewport (and filtered by latest if active) */
  occurrences: SessionOccurrence[];
  /** Effective IANA timezone used for wall-clock boundary calculations */
  effectiveTimezone: string;
  /** Active session scope: 'all' | 'latest' */
  scope: SessionScope;
}

