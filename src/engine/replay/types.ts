import type { KLineData } from '@/utils/dataUtils';

export interface ReplaySessionConfig {
  readonly symbol: string;
  readonly historicalData: KLineData[];
  readonly startIndex: number;
}

export type ReplayStatus = 'READY' | 'PAUSED' | 'COMPLETED' | 'ERROR';

export interface ReplaySessionState {
  readonly currentIndex: number;
  readonly currentTimestamp: number;
  readonly status: ReplayStatus;
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
}

export interface ReplayEngine {
  createSession(config: ReplaySessionConfig): ReplaySession;
  getActiveSession(): ReplaySession | null;
  destroySession(): void;
}
