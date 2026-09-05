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
  color: string;     // Hex/RGB color string
  transparency: number; // 0 to 100 (0 = solid/opaque, 100 = fully transparent)
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
      color: '#00bcd4', // Aqua / Cyan
      transparency: 85,
    },
    sydney: {
      id: 'sydney',
      name: 'Sydney',
      enabled: false,
      startTime: '18:00',
      endTime: '02:01',
      color: '#26c6da', // Aqua / Cyan
      transparency: 85,
    },
    tokyo: {
      id: 'tokyo',
      name: 'Tokyo',
      enabled: false,
      startTime: '19:00',
      endTime: '03:01',
      color: '#00acc1', // Aqua / Cyan
      transparency: 85,
    },
    frankfurt: {
      id: 'frankfurt',
      name: 'Frankfurt',
      enabled: false,
      startTime: '02:00',
      endTime: '10:01',
      color: '#2962ff', // Blue family
      transparency: 85,
    },
    london: {
      id: 'london',
      name: 'London',
      enabled: true,
      startTime: '03:00',
      endTime: '11:01',
      color: '#26a69a', // Green family
      transparency: 85,
    },
    newYork: {
      id: 'newYork',
      name: 'New York',
      enabled: true,
      startTime: '08:00',
      endTime: '16:01',
      color: '#ff5252', // Pink / Red family
      transparency: 85,
    },
    custom: {
      id: 'custom',
      name: 'Custom',
      enabled: false,
      startTime: '17:00',
      endTime: '16:45',
      color: '#e91e63', // Pink / Red family
      transparency: 85,
    },
  },
};
