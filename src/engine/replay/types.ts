import type { KLineData } from '@/utils/dataUtils';

export interface ReplayBookmark {
  readonly id: string;
  readonly index: number;
  readonly timestamp: number;
  readonly label: string;
  readonly note?: string;
  readonly createdAt: number;
  readonly isCheckpoint: boolean;
}

export interface ReplaySessionConfig {
  readonly symbol: string;
  readonly historicalData: KLineData[];
  readonly startIndex: number;
  readonly initialBookmarks?: ReplayBookmark[];
}

export type ReplayStatus = 'READY' | 'PAUSED' | 'COMPLETED' | 'ERROR';

export interface ReplaySessionState {
  readonly status: ReplayStatus;
  readonly currentIndex: number;
  readonly currentTimestamp: number;
  readonly viewportRange: ReplayViewportState;
  readonly bookmarks: ReplayBookmark[];
}

export interface ReplayTimelineState {
  readonly currentIndex: number;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly selectionStart: number | null;
  readonly selectionEnd: number | null;
  readonly bookmarks: ReplayBookmark[];
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
  addBookmark(index: number, label: string, note?: string, isCheckpoint?: boolean): ReplayBookmark;
  removeBookmark(id: string): void;
  updateBookmark(id: string, updates: { label?: string; note?: string }): void;
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
