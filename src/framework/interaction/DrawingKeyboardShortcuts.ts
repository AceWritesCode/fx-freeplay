import { isEditableElement } from './ModifierKeyTracker';

export interface DrawingKeyboardShortcutsOptions {
  activeTool: string | null;
  selectedOverlayIds: string[];
  onDeleteSelected: () => void;
  onCancelTool: () => void;
  onClearSelection: () => void;
}

export class DrawingKeyboardShortcuts {
  private _options: DrawingKeyboardShortcutsOptions;
  private _cleanupFn: (() => void) | null = null;

  constructor(options: DrawingKeyboardShortcutsOptions) {
    this._options = options;
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  public updateOptions(options: DrawingKeyboardShortcutsOptions): void {
    this._options = options;
  }

  public attach(): void {
    this.detach();

    window.addEventListener('keydown', this._handleKeyDown);
    this._cleanupFn = () => {
      window.removeEventListener('keydown', this._handleKeyDown);
    };
  }

  public detach(): void {
    if (this._cleanupFn) {
      this._cleanupFn();
      this._cleanupFn = null;
    }
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (isEditableElement(e.target)) return;

    // 1. Delete / Backspace: delete selected drawings
    if ((e.key === 'Delete' || e.key === 'Backspace') && !this._options.activeTool) {
      if (this._options.selectedOverlayIds.length > 0) {
        e.preventDefault();
        this._options.onDeleteSelected();
      }
    }

    // 2. Escape: cancel active drawing session or clear selection
    if (e.key === 'Escape') {
      if (this._options.activeTool) {
        this._options.onCancelTool();
      } else if (this._options.selectedOverlayIds.length > 0) {
        this._options.onClearSelection();
      }
    }
  }
}
