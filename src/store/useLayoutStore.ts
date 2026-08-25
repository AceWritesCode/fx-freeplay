import { create } from 'zustand';
import type { SlotConfig, LayoutSizes } from './types';

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
  setInitialState: (config: Partial<LayoutState>) => void;
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

export const DEFAULT_SLOTS: SlotConfig[] = [
  { symbol: null, timeframe: '1m' },
  { symbol: null, timeframe: '1m' },
  { symbol: null, timeframe: '1m' },
  { symbol: null, timeframe: '1m' },
];

export const DEFAULT_LAYOUT_SIZES: LayoutSizes = {
  '2v': [50, 50],
  '2h': [50, 50],
  '3v': [33.33, 33.33, 33.34],
  '3h': [33.33, 33.33, 33.34],
  '3g1_main': [66.66, 33.34],
  '3g1_sub': [50, 50],
  '3g2_main': [66.66, 33.34],
  '3g2_sub': [50, 50],
  '3g3_main': [33.34, 66.66],
  '3g3_sub': [50, 50],
  '3g4_main': [50, 50],
  '3g4_sub': [50, 50],
  '4_main': [50, 50],
  '4_sub1': [50, 50],
  '4_sub2': [50, 50],
  '4g_main': [50, 50],
  '4g_left': [50, 50],
  '4g_right': [50, 50],
  '4v': [25, 25, 25, 25],
  '4h': [25, 25, 25, 25],
};

export const useLayoutStore = create<LayoutState>((set) => ({
  layoutType: '1',
  activeChartIndex: 0,
  slots: DEFAULT_SLOTS,
  layoutSizes: DEFAULT_LAYOUT_SIZES,

  syncSymbol: true,
  syncInterval: true,
  syncCrosshair: true,
  syncTime: true,
  syncDateRange: true,
  syncDrawings: true,

  setInitialState: (config) =>
    set((state) => ({ ...state, ...config })),

  setLayoutType: (type) =>
    set(() => ({ layoutType: type })),

  setActiveChartIndex: (index) =>
    set(() => ({ activeChartIndex: index })),

  setSlots: (newSlots) =>
    set(() => ({ slots: newSlots })),

  updateSlot: (index, update) =>
    set((state) => {
      const updatedSlots = [...state.slots];
      updatedSlots[index] = { ...updatedSlots[index], ...update };
      return { slots: updatedSlots };
    }),

  setLayoutSizes: (sizes) =>
    set((state) => ({
      layoutSizes: { ...state.layoutSizes, ...sizes },
    })),

  setSyncSetting: (key, val) =>
    set(() => ({ [key]: val })),
}));
