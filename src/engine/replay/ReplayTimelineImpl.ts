import type { ReplayBookmark, ReplayTimeline, ReplayTimelineState, ReplayViewport } from './types';
import { ReplayViewportImpl } from './ReplayViewportImpl';

export class ReplayTimelineImpl implements ReplayTimeline {
  private currentIndex: number;
  private readonly startIndex: number;
  private readonly endIndex: number;
  private selectionStart: number | null = null;
  private selectionEnd: number | null = null;
  private bookmarks: ReplayBookmark[] = [];
  private readonly viewport: ReplayViewport;
  private readonly getTimestamp: (index: number) => number;

  constructor(
    endIndex: number,
    startIndex: number,
    getTimestamp: (index: number) => number,
    initialBookmarks?: ReplayBookmark[]
  ) {
    this.endIndex = endIndex;
    this.startIndex = Math.max(0, Math.min(startIndex, endIndex));
    this.currentIndex = this.startIndex;
    this.getTimestamp = getTimestamp;
    this.viewport = new ReplayViewportImpl(endIndex, startIndex);
    this.bookmarks = initialBookmarks || [];
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

  public addBookmark(index: number, label: string, note?: string, isCheckpoint = false): ReplayBookmark {
    const targetIndex = Math.max(0, Math.min(index, this.endIndex));
    const newBookmark: ReplayBookmark = {
      id: `bk_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      index: targetIndex,
      timestamp: this.getTimestamp(targetIndex),
      label: label,
      note: note,
      createdAt: Date.now(),
      isCheckpoint: isCheckpoint,
    };

    this.bookmarks.push(newBookmark);
    this.bookmarks.sort((a, b) => a.index - b.index);
    return newBookmark;
  }

  public removeBookmark(id: string): void {
    this.bookmarks = this.bookmarks.filter((b) => b.id !== id);
  }

  public updateBookmark(id: string, updates: { label?: string; note?: string }): void {
    this.bookmarks = this.bookmarks.map((b) => {
      if (b.id === id) {
        return {
          ...b,
          label: updates.label !== undefined ? updates.label : b.label,
          note: updates.note !== undefined ? updates.note : b.note,
        };
      }
      return b;
    });
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
