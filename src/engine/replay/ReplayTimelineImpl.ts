import type { ReplayTimeline, ReplayTimelineState, ReplayViewport } from './types';
import { ReplayViewportImpl } from './ReplayViewportImpl';

export class ReplayTimelineImpl implements ReplayTimeline {
  private currentIndex: number;
  private readonly startIndex: number;
  private readonly endIndex: number;
  private selectionStart: number | null = null;
  private selectionEnd: number | null = null;
  private bookmarks: number[] = [];
  private readonly viewport: ReplayViewport;

  constructor(endIndex: number, startIndex: number) {
    this.endIndex = endIndex;
    this.startIndex = Math.max(0, Math.min(startIndex, endIndex));
    this.currentIndex = this.startIndex;
    this.viewport = new ReplayViewportImpl(endIndex, startIndex);
  }

  public stepForward(): ReplayTimelineState {
    if (this.currentIndex >= this.endIndex) {
      return this.getState();
    }

    this.currentIndex += 1;
    this.viewport.updateViewport(this.currentIndex, this.viewport.getRange().windowSize);
    return this.getState();
  }

  public stepBackward(): ReplayTimelineState {
    if (this.currentIndex <= 0) {
      return this.getState();
    }

    this.currentIndex -= 1;
    this.viewport.updateViewport(this.currentIndex, this.viewport.getRange().windowSize);
    return this.getState();
  }

  public jumpTo(index: number): ReplayTimelineState {
    const target = Math.max(0, Math.min(index, this.endIndex));
    this.currentIndex = target;
    this.viewport.updateViewport(this.currentIndex, this.viewport.getRange().windowSize);
    return this.getState();
  }

  public reset(): ReplayTimelineState {
    this.currentIndex = this.startIndex;
    this.viewport.updateViewport(this.currentIndex, this.viewport.getRange().windowSize);
    return this.getState();
  }

  public setSelection(start: number | null, end: number | null): void {
    this.selectionStart = start;
    this.selectionEnd = end;
  }

  public addBookmark(index: number): void {
    if (!this.bookmarks.includes(index)) {
      this.bookmarks.push(index);
      this.bookmarks.sort((a, b) => a - b);
    }
  }

  public removeBookmark(index: number): void {
    this.bookmarks = this.bookmarks.filter((b) => b !== index);
  }

  public getState(): ReplayTimelineState {
    return {
      currentIndex: this.currentIndex,
      startIndex: this.startIndex,
      endIndex: this.endIndex,
      selectionStart: this.selectionStart,
      selectionEnd: this.selectionEnd,
      bookmarks: this.bookmarks,
    };
  }

  public getViewport(): ReplayViewport {
    return this.viewport;
  }
}
