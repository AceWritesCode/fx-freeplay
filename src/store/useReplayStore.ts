import { create } from 'zustand';

interface ReplayState {
  isReplayActive: boolean;
  replayCurrentTimestamp: number | null;
  replaySpeed: number;
  isReplayPlaying: boolean;

  // Actions
  setIsReplayActive: (active: boolean) => void;
  setReplayCurrentTimestamp: (ts: number | null) => void;
  setReplaySpeed: (speed: number) => void;
  setIsReplayPlaying: (playing: boolean) => void;
  resetReplay: () => void;
}

export const useReplayStore = create<ReplayState>((set) => ({
  isReplayActive: false,
  replayCurrentTimestamp: null,
  replaySpeed: 1,
  isReplayPlaying: false,

  setIsReplayActive: (active) => set(() => ({ isReplayActive: active })),
  setReplayCurrentTimestamp: (ts) => set(() => ({ replayCurrentTimestamp: ts })),
  setReplaySpeed: (speed) => set(() => ({ replaySpeed: speed })),
  setIsReplayPlaying: (playing) => set(() => ({ isReplayPlaying: playing })),
  resetReplay: () =>
    set(() => ({
      isReplayActive: false,
      replayCurrentTimestamp: null,
      replaySpeed: 1,
      isReplayPlaying: false,
    })),
}));
