/**
 * types.ts
 *
 * Domain types for the FX Freeplay Desktop Wrapper.
 * Encapsulates navigation targets, module metadata, wrapper settings, and mock updates.
 */

export type WrapperView =
  | 'splash'
  | 'home'
  | 'charts'
  | 'journal'
  | 'backtesting'
  | 'research'
  | 'settings'
  | 'help'
  | 'update';

export type ModuleAvailability = 'available' | 'coming_soon';

export interface AppModuleDef {
  id: 'charts' | 'journal' | 'backtesting' | 'research' | string;
  name: string;
  description: string;
  availability: ModuleAvailability;
  tag?: string;
  category?: string;
}

import type { ThemeMode } from '@/config/themes';

export type SettingsSectionId = 'general' | 'appearance' | 'startup' | 'updates' | 'about';

export interface WrapperSettingsState {
  theme: ThemeMode;
  launchAtStartup: boolean;
  startMinimized: boolean;
  hardwareAcceleration: boolean;
  autoCheckUpdates: boolean;
  notificationPreferences: boolean;
  defaultModuleOnLaunch: string;
}

export type UpdateCheckStatus = 'checking' | 'up_to_date' | 'available' | 'idle';

export interface MockUpdateInfo {
  status: UpdateCheckStatus;
  currentVersion: string;
  latestVersion?: string;
  releaseDate?: string;
  releaseNotes?: string[];
}
