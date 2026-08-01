import type { ReplayViewport, ReplayViewportState } from './types';

export class ReplayViewportImpl implements ReplayViewport {
  private visibleIndexStart: number;
  private visibleIndexEnd: number;
  private windowSize: number;
  private readonly maxIndex: number;

  constructor(maxIndex: number, startIndex: number) {
    this.maxIndex = maxIndex;
    this.windowSize = 200; // Default window size to render in chart views
    this.visibleIndexEnd = Math.min(maxIndex, startIndex);
    this.visibleIndexStart = Math.max(0, this.visibleIndexEnd - this.windowSize + 1);
  }

  public updateViewport(centerIndex: number, windowSize: number): ReplayViewportState {
    this.windowSize = windowSize;
    this.visibleIndexEnd = Math.min(this.maxIndex, centerIndex);
    this.visibleIndexStart = Math.max(0, this.visibleIndexEnd - this.windowSize + 1);
    return this.getRange();
  }

  public getRange(): ReplayViewportState {
    return {
      visibleIndexStart: this.visibleIndexStart,
      visibleIndexEnd: this.visibleIndexEnd,
      windowSize: this.windowSize,
    };
  }
}
