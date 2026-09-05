import { create } from 'zustand';
import type { ReplayBookmark } from '@/engine/replay';

interface ReplayState {
  isReplayActive: boolean;
  replayCurrentTimestamp: number | null;
  replaySpeed: number;
  isReplayPlaying: boolean;
  bookmarks: ReplayBookmark[];
  isAutoShiftEnabled: boolean;

  // Actions
  setIsReplayActive: (active: boolean) => void;
  setReplayCurrentTimestamp: (ts: number | null) => void;
  setReplaySpeed: (speed: number) => void;
  setIsReplayPlaying: (playing: boolean) => void;
  setBookmarks: (bookmarks: ReplayBookmark[]) => void;
  setIsAutoShiftEnabled: (enabled: boolean) => void;
  resetReplay: () => void;
}

export const useReplayStore = create<ReplayState>((set) => ({
  isReplayActive: false,
  replayCurrentTimestamp: null,
  replaySpeed: 1,
  isReplayPlaying: false,
  bookmarks: [],
  isAutoShiftEnabled: true,

  setIsReplayActive: (active) => set(() => ({ isReplayActive: active })),
  setReplayCurrentTimestamp: (ts) => set(() => ({ replayCurrentTimestamp: ts })),
  setReplaySpeed: (speed) => set(() => ({ replaySpeed: speed })),
  setIsReplayPlaying: (playing) => set(() => ({ isReplayPlaying: playing })),
  setBookmarks: (bookmarks) => set(() => ({ bookmarks })),
  setIsAutoShiftEnabled: (enabled) => set(() => ({ isAutoShiftEnabled: enabled })),
  resetReplay: () =>
    set(() => ({
      isReplayActive: false,
      replayCurrentTimestamp: null,
      replaySpeed: 1,
      isReplayPlaying: false,
      bookmarks: [],
      isAutoShiftEnabled: true,
    })),
}));
