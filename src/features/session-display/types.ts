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

export const DEFAULT_CUSTOM_SESSIONS: SessionConfig[] = [
  {
    id: 'custom_1',
    name: 'Custom 1',
    enabled: false,
    startTime: '17:00',
    endTime: '16:45',
    color: 'rgba(233, 30, 99, 0.15)', // Pink / Red family
    isCustom: true,
  },
  {
    id: 'custom_2',
    name: 'Custom 2',
    enabled: false,
    startTime: '12:00',
    endTime: '15:00',
    color: 'rgba(156, 39, 176, 0.15)', // Purple family
    isCustom: true,
  },
  {
    id: 'custom_3',
    name: 'Custom 3',
    enabled: false,
    startTime: '20:00',
    endTime: '23:00',
    color: 'rgba(255, 152, 0, 0.15)', // Orange family
    isCustom: true,
  },
];

export const DEFAULT_SESSION_DISPLAY_SETTINGS: SessionDisplaySettings = {
  enabled: true,
  timezone: 'auto',
  sessionScope: 'all',
  builtInSessions: DEFAULT_BUILT_IN_SESSIONS,
  customSessions: DEFAULT_CUSTOM_SESSIONS,
};
