export type SessionId = 
  | 'asia'
  | 'sydney'
  | 'tokyo'
  | 'frankfurt'
  | 'london'
  | 'newYork'
  | 'custom';

export interface SessionConfig {
  id: SessionId;
  name: string;
  enabled: boolean;
  startTime: string; // "HH:mm" in 24-hour format
  endTime: string;   // "HH:mm" in 24-hour format
  color: string;     // Hex or RGBA color string (supports built-in alpha/transparency)
}

export interface SessionDisplaySettings {
  enabled: boolean; // Master toggle
  timezone: string; // Fixed to "New York" for V1
  sessions: Record<SessionId, SessionConfig>;
}

export const DEFAULT_SESSION_DISPLAY_SETTINGS: SessionDisplaySettings = {
  enabled: true,
  timezone: 'New York',
  sessions: {
    asia: {
      id: 'asia',
      name: 'Asia',
      enabled: true,
      startTime: '18:00',
      endTime: '03:01',
      color: 'rgba(0, 188, 212, 0.15)', // Aqua / Cyan
    },
    sydney: {
      id: 'sydney',
      name: 'Sydney',
      enabled: false,
      startTime: '18:00',
      endTime: '02:01',
      color: 'rgba(38, 198, 218, 0.15)', // Aqua / Cyan
    },
    tokyo: {
      id: 'tokyo',
      name: 'Tokyo',
      enabled: false,
      startTime: '19:00',
      endTime: '03:01',
      color: 'rgba(0, 172, 193, 0.15)', // Aqua / Cyan
    },
    frankfurt: {
      id: 'frankfurt',
      name: 'Frankfurt',
      enabled: false,
      startTime: '02:00',
      endTime: '10:01',
      color: 'rgba(41, 98, 255, 0.15)', // Blue family
    },
    london: {
      id: 'london',
      name: 'London',
      enabled: true,
      startTime: '03:00',
      endTime: '11:01',
      color: 'rgba(38, 166, 154, 0.15)', // Green family
    },
    newYork: {
      id: 'newYork',
      name: 'New York',
      enabled: true,
      startTime: '08:00',
      endTime: '16:01',
      color: 'rgba(255, 82, 82, 0.15)', // Pink / Red family
    },
    custom: {
      id: 'custom',
      name: 'Custom',
      enabled: false,
      startTime: '17:00',
      endTime: '16:45',
      color: 'rgba(233, 30, 99, 0.15)', // Pink / Red family
    },
  },
};
