import type { ReplaySession, ReplaySessionConfig, ReplaySessionState, ReplayStatus, ReplayTimeline } from './types';
import { ReplayTimelineImpl } from './ReplayTimelineImpl';

export class ReplaySessionImpl implements ReplaySession {
  private readonly config: ReplaySessionConfig;
  private readonly timeline: ReplayTimeline;
  private status: ReplayStatus;
  private subscribers: Set<(state: ReplaySessionState) => void>;

  constructor(config: ReplaySessionConfig) {
    if (!config) {
      throw new Error('Replay session configuration is missing.');
    }
    if (!config.symbol || config.symbol.trim() === '') {
      throw new Error('Replay session configuration error: Symbol is required.');
    }
    if (!config.historicalData || config.historicalData.length === 0) {
      throw new Error('Replay session configuration error: Historical data cannot be empty.');
    }
    if (config.startIndex < 0 || config.startIndex >= config.historicalData.length) {
      throw new Error(`Replay session configuration error: Start index ${config.startIndex} is out of bounds (0 to ${config.historicalData.length - 1}).`);
    }

    this.config = config;
    const maxIndex = config.historicalData.length - 1;
    this.timeline = new ReplayTimelineImpl(
      maxIndex,
      config.startIndex,
      (idx) => this.getTimestamp(idx),
      config.initialBookmarks
    );
    this.status = 'READY';
    this.subscribers = new Set();
  }

  private getTimestamp(index: number): number {
    const bar = this.config.historicalData[index];
    return bar ? bar.timestamp : 0;
  }

  private notify(): void {
    const state = this.getState();
    this.subscribers.forEach((callback) => {
      try {
        callback(state);
      } catch (err) {
        console.error('[ReplaySession] Error in subscriber callback:', err);
      }
    });
  }

  public stepForward(): ReplaySessionState {
    if (this.status === 'COMPLETED' || this.status === 'ERROR') {
      return this.getState();
    }

    const tState = this.timeline.getState();
    if (tState.currentIndex >= tState.endIndex) {
      this.status = 'COMPLETED';
      this.notify();
      return this.getState();
    }

    const updatedTimeline = this.timeline.stepForward();
    if (updatedTimeline.currentIndex === updatedTimeline.endIndex) {
      this.status = 'COMPLETED';
    }

    this.notify();
    return this.getState();
  }

  public stepBackward(): ReplaySessionState {
    if (this.status === 'ERROR') {
      return this.getState();
    }

    const tState = this.timeline.getState();
    if (tState.currentIndex <= 0) {
      return this.getState();
    }

    this.timeline.stepBackward();
    if (this.status === 'COMPLETED') {
      this.status = 'READY';
    }

    this.notify();
    return this.getState();
  }

  public jumpTo(index: number): ReplaySessionState {
    if (this.status === 'ERROR') {
      return this.getState();
    }

    const updatedTimeline = this.timeline.jumpTo(index);
    if (updatedTimeline.currentIndex === updatedTimeline.endIndex) {
      this.status = 'COMPLETED';
    } else if (this.status === 'COMPLETED') {
      this.status = 'READY';
    }

    this.notify();
    return this.getState();
  }

  public reset(): ReplaySessionState {
    this.timeline.reset();
    this.status = 'READY';
    this.notify();
    return this.getState();
  }

  public subscribe(callback: (state: ReplaySessionState) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getState());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public getState(): ReplaySessionState {
    const tState = this.timeline.getState();
    return {
      status: this.status,
      currentIndex: tState.currentIndex,
      currentTimestamp: this.getTimestamp(tState.currentIndex),
      viewportRange: this.timeline.getViewport().getRange(),
      bookmarks: tState.bookmarks,
    };
  }

  public getConfig(): ReplaySessionConfig {
    return this.config;
  }

  public setStatus(status: ReplayStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.notify();
  }

  public getTimeline(): ReplayTimeline {
    return this.timeline;
  }
}
