/**
 * A pure, platform-independent class that handles playback timing scheduling
 * using setInterval and clearInterval.
 */
export class ReplayTimer {
  private intervalId: any = null;
  private onTick: () => void;
  private speedSeconds: number;

  constructor(onTick: () => void, speedSeconds: number) {
    this.onTick = onTick;
    this.speedSeconds = speedSeconds;
  }

  public start(): void {
    this.stop();
    this.intervalId = setInterval(() => {
      this.onTick();
    }, this.speedSeconds * 1000);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public setSpeed(speedSeconds: number): void {
    this.speedSeconds = speedSeconds;
    if (this.isActive()) {
      this.start();
    }
  }

  public isActive(): boolean {
    return this.intervalId !== null;
  }
}
