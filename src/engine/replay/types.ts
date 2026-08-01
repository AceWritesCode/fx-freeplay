import type { KLineData } from '@/utils/dataUtils';

export interface ReplaySessionConfig {
  readonly symbol: string;
  readonly historicalData: KLineData[];
  readonly startIndex: number;
}

export type ReplayStatus = 'READY' | 'PAUSED' | 'COMPLETED' | 'ERROR';

export interface ReplaySessionState {
  readonly status: ReplayStatus;
  readonly currentIndex: number;
  readonly currentTimestamp: number;
  readonly viewportRange: ReplayViewportState;
}

export interface ReplayTimelineState {
  readonly currentIndex: number;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly selectionStart: number | null;
  readonly selectionEnd: number | null;
  readonly bookmarks: number[];
}

export interface ReplayViewportState {
  readonly visibleIndexStart: number;
  readonly visibleIndexEnd: number;
  readonly windowSize: number;
}

export interface ReplayViewport {
  updateViewport(centerIndex: number, windowSize: number): ReplayViewportState;
  getRange(): ReplayViewportState;
}

export interface ReplayTimeline {
  stepForward(): ReplayTimelineState;
  stepBackward(): ReplayTimelineState;
  jumpTo(index: number): ReplayTimelineState;
  reset(): ReplayTimelineState;
  setSelection(start: number | null, end: number | null): void;
  addBookmark(index: number): void;
  removeBookmark(index: number): void;
  getState(): ReplayTimelineState;
  getViewport(): ReplayViewport;
}

export interface ReplaySession {
  stepForward(): ReplaySessionState;
  stepBackward(): ReplaySessionState;
  jumpTo(index: number): ReplaySessionState;
  reset(): ReplaySessionState;
  subscribe(callback: (state: ReplaySessionState) => void): () => void;
  getState(): ReplaySessionState;
  getConfig(): ReplaySessionConfig;
  setStatus(status: ReplayStatus): void;
  getTimeline(): ReplayTimeline;
}

export interface ReplayEngine {
  createSession(config: ReplaySessionConfig): ReplaySession;
  getActiveSession(): ReplaySession | null;
  destroySession(): void;
}
