/**
 * Checks if an event target is an editable input or inside a text editor.
 */
export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    (target as any).isContentEditable ||
    target.closest('[data-floating-ui="true"]') !== null ||
    target.closest('[data-no-deselect="true"]') !== null ||
    target.closest('input') !== null ||
    target.closest('textarea') !== null
  );
}

export interface ModifierKeyState {
  isCtrlPressed: boolean;
  isShiftPressed: boolean;
  isAltPressed: boolean;
  isMetaPressed: boolean;
  isSpacePressed: boolean;
}

export class ModifierKeyTracker {
  private _state: ModifierKeyState = {
    isCtrlPressed: false,
    isShiftPressed: false,
    isAltPressed: false,
    isMetaPressed: false,
    isSpacePressed: false,
  };

  private _listeners: Set<(state: ModifierKeyState) => void> = new Set();
  private _cleanupFn: (() => void) | null = null;

  constructor() {
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handleBlur = this._handleBlur.bind(this);
    this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
  }

  public start(): void {
    if (this._cleanupFn) return;

    window.addEventListener('keydown', this._handleKeyDown, true);
    window.addEventListener('keyup', this._handleKeyUp, true);
    window.addEventListener('blur', this._handleBlur);
    document.addEventListener('visibilitychange', this._handleVisibilityChange);

    this._cleanupFn = () => {
      window.removeEventListener('keydown', this._handleKeyDown, true);
      window.removeEventListener('keyup', this._handleKeyUp, true);
      window.removeEventListener('blur', this._handleBlur);
      document.removeEventListener('visibilitychange', this._handleVisibilityChange);
    };
  }

  public stop(): void {
    if (this._cleanupFn) {
      this._cleanupFn();
      this._cleanupFn = null;
    }
    this._resetState();
  }

  public getState(): ModifierKeyState {
    return { ...this._state };
  }

  public get isCtrlPressed(): boolean {
    return this._state.isCtrlPressed || this._state.isMetaPressed;
  }

  public get isShiftPressed(): boolean {
    return this._state.isShiftPressed;
  }

  public get isAltPressed(): boolean {
    return this._state.isAltPressed;
  }

  public get isSpacePressed(): boolean {
    return this._state.isSpacePressed;
  }

  public subscribe(listener: (state: ModifierKeyState) => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    // If user is editing text in an input, do not track drawing modifiers
    if (isEditableElement(e.target)) return;

    let changed = false;
    if (e.key === 'Control' && !this._state.isCtrlPressed) {
      this._state.isCtrlPressed = true;
      changed = true;
    }
    if (e.key === 'Meta' && !this._state.isMetaPressed) {
      this._state.isMetaPressed = true;
      changed = true;
    }
    if (e.key === 'Shift' && !this._state.isShiftPressed) {
      this._state.isShiftPressed = true;
      changed = true;
    }
    if (e.key === 'Alt' && !this._state.isAltPressed) {
      this._state.isAltPressed = true;
      changed = true;
    }
    if ((e.key === ' ' || e.code === 'Space') && !this._state.isSpacePressed) {
      this._state.isSpacePressed = true;
      changed = true;
    }

    if (changed) {
      this._notify();
    }
  }

  private _handleKeyUp(e: KeyboardEvent): void {
    let changed = false;
    if (e.key === 'Control' && this._state.isCtrlPressed) {
      this._state.isCtrlPressed = false;
      changed = true;
    }
    if (e.key === 'Meta' && this._state.isMetaPressed) {
      this._state.isMetaPressed = false;
      changed = true;
    }
    if (e.key === 'Shift' && this._state.isShiftPressed) {
      this._state.isShiftPressed = false;
      changed = true;
    }
    if (e.key === 'Alt' && this._state.isAltPressed) {
      this._state.isAltPressed = false;
      changed = true;
    }
    if ((e.key === ' ' || e.code === 'Space') && this._state.isSpacePressed) {
      this._state.isSpacePressed = false;
      changed = true;
    }

    if (changed) {
      this._notify();
    }
  }

  private _handleBlur(): void {
    this._resetState();
  }

  private _handleVisibilityChange(): void {
    if (document.hidden) {
      this._resetState();
    }
  }

  private _resetState(): void {
    if (
      this._state.isCtrlPressed ||
      this._state.isMetaPressed ||
      this._state.isShiftPressed ||
      this._state.isAltPressed ||
      this._state.isSpacePressed
    ) {
      this._state = {
        isCtrlPressed: false,
        isShiftPressed: false,
        isAltPressed: false,
        isMetaPressed: false,
        isSpacePressed: false,
      };
      this._notify();
    }
  }

  private _notify(): void {
    const state = this.getState();
    this._listeners.forEach((fn) => fn(state));
  }
}
