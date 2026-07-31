import { create } from 'zustand';
import type { SlotConfig, LayoutSizes } from './types';
import { persistenceService } from '@/engine/workspace/persistence';

interface LayoutState {
  layoutType: string;
  activeChartIndex: number;
  slots: SlotConfig[];
  layoutSizes: LayoutSizes;

  // Synchronization settings
  syncSymbol: boolean;
  syncInterval: boolean;
  syncCrosshair: boolean;
  syncTime: boolean;
  syncDateRange: boolean;
  syncDrawings: boolean;

  // Actions
  setLayoutType: (type: string) => void;
  setActiveChartIndex: (index: number) => void;
  setSlots: (slots: SlotConfig[]) => void;
  updateSlot: (index: number, update: Partial<SlotConfig>) => void;
  setLayoutSizes: (sizes: LayoutSizes) => void;
  setSyncSetting: (
    key: 'syncSymbol' | 'syncInterval' | 'syncCrosshair' | 'syncTime' | 'syncDateRange' | 'syncDrawings',
    val: boolean
  ) => void;
}

const DEFAULT_SLOTS: SlotConfig[] = [
  { symbol: null, timeframe: '1m' },
  { symbol: null, timeframe: '1m' },
  { symbol: null, timeframe: '1m' },
  { symbol: null, timeframe: '1m' },
];

const DEFAULT_LAYOUT_SIZES: LayoutSizes = {
  '2v': [50, 50],
  '2h': [50, 50],
  '3v': [33.33, 33.33, 33.34],
  '3h': [33.33, 33.33, 33.34],
  '3g1_main': [66.66, 33.34],
  '3g1_sub': [50, 50],
  '3g2_main': [66.66, 33.34],
  '3g2_sub': [50, 50],
  '4g_main': [50, 50],
  '4g_left': [50, 50],
  '4g_right': [50, 50],
  '4v': [25, 25, 25, 25],
  '4h': [25, 25, 25, 25],
};

const SYNC_KEY_MAP = {
  syncSymbol: 'SYNC_SYMBOL',
  syncInterval: 'SYNC_INTERVAL',
  syncCrosshair: 'SYNC_CROSSHAIR',
  syncTime: 'SYNC_TIME',
  syncDateRange: 'SYNC_DATE_RANGE',
  syncDrawings: 'SYNC_DRAWINGS',
} as const;

export const useLayoutStore = create<LayoutState>((set) => {
  // Restore layout parameters from persistenceService
  const initialLayoutType = persistenceService.getLayoutType();
  const initialSlots = persistenceService.getLayoutSlots() || DEFAULT_SLOTS;
  const initialLayoutSizes = (persistenceService.getLayoutSizes() as any) || DEFAULT_LAYOUT_SIZES;

  return {
    layoutType: initialLayoutType,
    activeChartIndex: 0,
    slots: initialSlots,
    layoutSizes: initialLayoutSizes,

    syncSymbol: persistenceService.getSyncSetting('SYNC_SYMBOL'),
    syncInterval: persistenceService.getSyncSetting('SYNC_INTERVAL'),
    syncCrosshair: persistenceService.getSyncSetting('SYNC_CROSSHAIR'),
    syncTime: persistenceService.getSyncSetting('SYNC_TIME'),
    syncDateRange: persistenceService.getSyncSetting('SYNC_DATE_RANGE'),
    syncDrawings: persistenceService.getSyncSetting('SYNC_DRAWINGS'),

    setLayoutType: (type) =>
      set(() => {
        persistenceService.setLayoutType(type);
        return { layoutType: type };
      }),

    setActiveChartIndex: (index) =>
      set(() => ({
        activeChartIndex: index,
      })),

    setSlots: (newSlots) =>
      set(() => {
        persistenceService.setLayoutSlots(newSlots);
        return { slots: newSlots };
      }),

    updateSlot: (index, update) =>
      set((state) => {
        const updatedSlots = [...state.slots];
        updatedSlots[index] = { ...updatedSlots[index], ...update };
        persistenceService.setLayoutSlots(updatedSlots);
        return { slots: updatedSlots };
      }),

    setLayoutSizes: (sizes) =>
      set((state) => {
        const updatedSizes = { ...state.layoutSizes, ...sizes };
        persistenceService.setLayoutSizes(updatedSizes as any);
        return { layoutSizes: updatedSizes };
      }),

    setSyncSetting: (key, val) =>
      set(() => {
        const apiKey = SYNC_KEY_MAP[key];
        persistenceService.setSyncSetting(apiKey, val);
        return { [key]: val };
      }),
  };
});
