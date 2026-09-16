export class ReplayVisibilityBoundaryManager {
  private active: boolean = false;
  private currentTimestamp: number | null = null;

  public setReplayState(active: boolean, timestamp: number | null): void {
    this.active = active;
    this.currentTimestamp = timestamp;
  }

  public isActive(): boolean {
    return this.active;
  }

  public getCurrentTimestamp(): number | null {
    return this.currentTimestamp;
  }

  public isTimestampRevealed(timestamp: number): boolean {
    if (!this.active || this.currentTimestamp === null) {
      return true;
    }
    return timestamp <= this.currentTimestamp;
  }

  public getRevealedIndexRange(dataList: Array<{ timestamp: number }>): { start: number; end: number } {
    if (!dataList || dataList.length === 0) {
      return { start: -1, end: -1 };
    }
    if (!this.active || this.currentTimestamp === null) {
      return { start: 0, end: dataList.length - 1 };
    }

    let end = -1;
    for (let i = 0; i < dataList.length; i++) {
      if (dataList[i].timestamp <= this.currentTimestamp) {
        end = i;
      } else {
        break;
      }
    }

    return {
      start: end !== -1 ? 0 : -1,
      end,
    };
  }

  public getRevealedDataList<T extends { timestamp: number }>(dataList: T[]): T[] {
    if (!dataList || dataList.length === 0) {
      return [];
    }
    if (!this.active || this.currentTimestamp === null) {
      return dataList;
    }

    const { end } = this.getRevealedIndexRange(dataList);
    if (end === -1) {
      return [];
    }
    return dataList.slice(0, end + 1);
  }

  public getEffectiveLastCandle<T extends { timestamp: number }>(dataList: T[]): T | null {
    if (!dataList || dataList.length === 0) {
      return null;
    }
    if (!this.active || this.currentTimestamp === null) {
      return dataList[dataList.length - 1] ?? null;
    }

    const { end } = this.getRevealedIndexRange(dataList);
    if (end === -1) {
      return null;
    }
    return dataList[end] ?? null;
  }

  public clampPointToRevealedBoundary<T extends { timestamp?: number; dataIndex?: number }>(
    point: T,
    dataList: Array<{ timestamp: number }>
  ): T {
    if (!this.active || this.currentTimestamp === null || !point || !dataList || dataList.length === 0) {
      return point;
    }

    const { end } = this.getRevealedIndexRange(dataList);
    if (end === -1) {
      return point;
    }

    const maxCandle = dataList[end];
    if (!maxCandle) {
      return point;
    }

    let isClamped = false;
    const clampedPoint = { ...point };

    if (typeof point.timestamp === 'number' && point.timestamp > maxCandle.timestamp) {
      clampedPoint.timestamp = maxCandle.timestamp;
      isClamped = true;
    }

    if (typeof point.dataIndex === 'number' && point.dataIndex > end) {
      clampedPoint.dataIndex = end;
      if (clampedPoint.timestamp === undefined || (typeof clampedPoint.timestamp === 'number' && clampedPoint.timestamp > maxCandle.timestamp)) {
        clampedPoint.timestamp = maxCandle.timestamp;
      }
      isClamped = true;
    }

    return isClamped ? clampedPoint : point;
  }

  public reset(): void {
    this.active = false;
    this.currentTimestamp = null;
  }

}

export const replayVisibilityBoundary = new ReplayVisibilityBoundaryManager();
