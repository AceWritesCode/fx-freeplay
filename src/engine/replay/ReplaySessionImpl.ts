import type { ReplaySession, ReplaySessionConfig, ReplaySessionState, ReplayStatus } from './types';

export class ReplaySessionImpl implements ReplaySession {
  private readonly config: ReplaySessionConfig;
  private currentIndex: number;
  private status: ReplayStatus;
  private subscribers: Set<(state: ReplaySessionState) => void>;

  constructor(config: ReplaySessionConfig) {
    this.config = config;
    this.currentIndex = Math.max(0, Math.min(config.startIndex, config.historicalData.length - 1));
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
    // If completed or error, do not progress
    if (this.status === 'COMPLETED' || this.status === 'ERROR') {
      return this.getState();
    }

    if (this.currentIndex >= this.config.historicalData.length - 1) {
      this.status = 'COMPLETED';
      this.notify();
      return this.getState();
    }

    this.currentIndex += 1;
    
    // If we just stepped onto the last candle, set to completed
    if (this.currentIndex === this.config.historicalData.length - 1) {
      this.status = 'COMPLETED';
    }

    this.notify();
    return this.getState();
  }

  public stepBackward(): ReplaySessionState {
    if (this.status === 'ERROR') {
      return this.getState();
    }

    if (this.currentIndex <= 0) {
      return this.getState();
    }

    this.currentIndex -= 1;
    
    // Reset status from COMPLETED back to READY/PAUSED if we step back
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

    const targetIndex = Math.max(0, Math.min(index, this.config.historicalData.length - 1));
    if (targetIndex === this.currentIndex) {
      return this.getState();
    }

    this.currentIndex = targetIndex;
    if (this.currentIndex === this.config.historicalData.length - 1) {
      this.status = 'COMPLETED';
    } else if (this.status === 'COMPLETED') {
      this.status = 'READY';
    }

    this.notify();
    return this.getState();
  }

  public reset(): ReplaySessionState {
    this.currentIndex = Math.max(0, Math.min(this.config.startIndex, this.config.historicalData.length - 1));
    this.status = 'READY';
    this.notify();
    return this.getState();
  }

  public subscribe(callback: (state: ReplaySessionState) => void): () => void {
    this.subscribers.add(callback);
    // Emit initial state immediately on subscription
    callback(this.getState());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public getState(): ReplaySessionState {
    return {
      currentIndex: this.currentIndex,
      currentTimestamp: this.getTimestamp(this.currentIndex),
      status: this.status,
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
}
