import type { ReplayEngine, ReplaySession, ReplaySessionConfig } from './types';
import { ReplaySessionImpl } from './ReplaySessionImpl';

export class ReplayEngineImpl implements ReplayEngine {
  private activeSession: ReplaySession | null = null;

  public createSession(config: ReplaySessionConfig): ReplaySession {
    this.destroySession();
    this.activeSession = new ReplaySessionImpl(config);
    return this.activeSession;
  }

  public getActiveSession(): ReplaySession | null {
    return this.activeSession;
  }

  public destroySession(): void {
    if (this.activeSession) {
      // Clear references to free up memory
      this.activeSession = null;
    }
  }
}

export const replayEngine = new ReplayEngineImpl();
