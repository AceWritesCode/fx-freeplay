import { ModifierKeyTracker, isEditableElement } from './ModifierKeyTracker.ts';
import { doesOverlayIntersectRect } from '../../engine/charting/geometry.ts';

export interface MarqueeSelectionOptions {
  chartContainersRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
  chartInstancesRef: React.MutableRefObject<(any | null)[]>;
  modifierTracker: ModifierKeyTracker;
  activeTool: string | null;
  onSelectOverlayIds: (ids: string[]) => void;
  selectedOverlayIds: string[];
}

/**
 * Authoritative predicate to determine whether an interaction is occurring
 * in exclusive marquee selection or Ctrl multi-select mode.
 *
 * In this mode, all drawing body dragging, anchor dragging, and overlay coordinate mutations
 * are strictly forbidden.
 */
export function isExclusiveMarqueeMode(chart: any, event?: any): boolean {
  if (chart?._isMarqueeSelecting) return true;
  if (event?.chart?._isMarqueeSelecting) return true;
  if (chart?._isCtrlPressedRef?.current) return true;
  if (event?.chart?._isCtrlPressedRef?.current) return true;
  if ((event as any)?.originalEvent?.ctrlKey || (event as any)?.originalEvent?.metaKey) return true;
  if ((event as any)?.event?.ctrlKey || (event as any)?.event?.metaKey) return true;
  return false;
}

export class MarqueeSelectionHandler {
  private _options: MarqueeSelectionOptions;
  private _cleanupFn: (() => void) | null = null;
  private _mouseDownPos: { x: number; y: number } | null = null;
  private _activeContainer: HTMLDivElement | null = null;
  private _activeChart: any = null;
  private _isMarqueeActive: boolean = false;

  constructor(options: MarqueeSelectionOptions) {
    this._options = options;
    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleCancel = this._handleCancel.bind(this);
  }

  public updateOptions(options: MarqueeSelectionOptions): void {
    this._options = options;
  }

  public attach(): void {
    this.detach();

    const containers = this._options.chartContainersRef.current.filter(
      (c): c is HTMLDivElement => c !== null
    );

    // Capture-phase listener on containers guarantees interaction-state authority
    // is established BEFORE any internal canvas event listener executes.
    containers.forEach((container) => {
      container.addEventListener('mousedown', this._handleMouseDown, true);
    });

    window.addEventListener('mousemove', this._handleMouseMove);
    window.addEventListener('mouseup', this._handleMouseUp);
    window.addEventListener('blur', this._handleCancel);
    window.addEventListener('keydown', this._handleKeyDown);

    this._cleanupFn = () => {
      containers.forEach((container) => {
        container.removeEventListener('mousedown', this._handleMouseDown, true);
      });
      window.removeEventListener('mousemove', this._handleMouseMove);
      window.removeEventListener('mouseup', this._handleMouseUp);
      window.removeEventListener('blur', this._handleCancel);
      window.removeEventListener('keydown', this._handleKeyDown);
      this._handleCancel();
    };
  }

  public detach(): void {
    if (this._cleanupFn) {
      this._cleanupFn();
      this._cleanupFn = null;
    }
  }

  private _handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return; // Left click only
    if (isEditableElement(e.target)) return;

    const isCtrl = this._options.modifierTracker.isCtrlPressed || e.ctrlKey || e.metaKey;
    if (!isCtrl) return;

    const container = (e.currentTarget || e.target) as HTMLDivElement;
    const containers = this._options.chartContainersRef.current;
    const slotIndex = containers.findIndex((c) => c && (c === container || c.contains(container)));
    if (slotIndex === -1) return;

    const chart = this._options.chartInstancesRef.current[slotIndex];
    if (!chart) return;

    const targetContainer = containers[slotIndex]!;
    this._mouseDownPos = { x: e.clientX, y: e.clientY };
    this._activeContainer = targetContainer;
    this._activeChart = chart;
    this._isMarqueeActive = true;

    // Authoritative interaction state: set on the chart immediately
    chart._isMarqueeSelecting = true;
    this._options.chartInstancesRef.current.forEach((c) => {
      if (c) c._isMarqueeSelecting = true;
    });
  }

  private _handleMouseMove(e: MouseEvent): void {
    if (!this._activeContainer || !this._activeChart || !this._mouseDownPos || !this._isMarqueeActive) return;

    const rect = this._activeContainer.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const startX = this._mouseDownPos.x - rect.left;
    const startY = this._mouseDownPos.y - rect.top;

    const dx = Math.abs(startX - currentX);
    const dy = Math.abs(startY - currentY);

    let div = this._activeContainer.querySelector('#selection-box-indicator') as HTMLDivElement;
    if (!div && (dx > 4 || dy > 4)) {
      div = document.createElement('div');
      div.id = 'selection-box-indicator';
      div.style.position = 'absolute';
      div.style.border = '1.5px dashed var(--accent-primary, #6366f1)';
      div.style.backgroundColor = 'var(--accent-muted, rgba(99, 102, 241, 0.15))';
      div.style.borderRadius = '2px';
      div.style.pointerEvents = 'none';
      div.style.zIndex = '50';
      div.style.left = `${startX}px`;
      div.style.top = `${startY}px`;
      div.style.width = '0px';
      div.style.height = '0px';
      this._activeContainer.appendChild(div);

      // Disable chart scroll & zoom while dragging marquee
      this._activeChart.setScrollEnabled(false);
      this._activeChart.setZoomEnabled(false);
    }

    if (div) {
      // Prevent default browser text/drag selection behavior while box is active
      e.preventDefault();

      const xMin = Math.min(startX, currentX);
      const yMin = Math.min(startY, currentY);
      const w = Math.abs(startX - currentX);
      const h = Math.abs(startY - currentY);

      div.style.left = `${xMin}px`;
      div.style.top = `${yMin}px`;
      div.style.width = `${w}px`;
      div.style.height = `${h}px`;
    }
  }

  private _handleMouseUp(e: MouseEvent): void {
    const startPos = this._mouseDownPos;
    const activeChart = this._activeChart;
    const activeContainer = this._activeContainer;
    const wasMarquee = this._isMarqueeActive;

    this._mouseDownPos = null;
    this._isMarqueeActive = false;

    // Reset marquee state on chart instances
    if (activeChart) {
      activeChart._isMarqueeSelecting = false;
    }
    this._options.chartInstancesRef.current.forEach((c) => {
      if (c) c._isMarqueeSelecting = false;
    });

    if (activeContainer && activeChart && wasMarquee) {
      const div = activeContainer.querySelector('#selection-box-indicator');
      if (div) {
        // Restore scroll and zoom
        if (!this._options.activeTool) {
          activeChart.setScrollEnabled(true);
          activeChart.setZoomEnabled(true);
        }

        // Set temporary flag to ignore trailing overlay onClick after marquee drag
        activeChart._justFinishedMarquee = true;
        setTimeout(() => {
          if (activeChart) activeChart._justFinishedMarquee = false;
          this._options.chartInstancesRef.current.forEach((c) => {
            if (c) c._justFinishedMarquee = false;
          });
        }, 100);

        const rect = activeContainer.getBoundingClientRect();
        const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

        if (startPos) {
          const startX = startPos.x - rect.left;
          const startY = startPos.y - rect.top;

          const xMin = Math.min(startX, currentX);
          const xMax = Math.max(startX, currentX);
          const yMin = Math.min(startY, currentY);
          const yMax = Math.max(startY, currentY);

          div.remove();

          const dx = xMax - xMin;
          const dy = yMax - yMin;

          if (dx > 4 && dy > 4) {
            const overlays = activeChart.getOverlays();
            const newlySelected: string[] = [];
            overlays.forEach((ov: any) => {
              if (
                ov.id === 'custom_price_line_overlay' ||
                ov.name === 'customPriceLine' ||
                ov.id === 'session_breaks_overlay' ||
                ov.name === 'sessionBreaks'
              )
                return;
              if (doesOverlayIntersectRect(ov, xMin, xMax, yMin, yMax, activeChart)) {
                newlySelected.push(ov.id);
              }
            });
            this._options.onSelectOverlayIds(newlySelected);
          }
        }
      }
    }

    this._activeContainer = null;
    this._activeChart = null;
  }

  private _handleCancel(): void {
    if (this._activeChart) {
      this._activeChart._isMarqueeSelecting = false;
      if (!this._options.activeTool) {
        this._activeChart.setScrollEnabled(true);
        this._activeChart.setZoomEnabled(true);
      }
    }
    this._options.chartInstancesRef.current.forEach((c) => {
      if (c) c._isMarqueeSelecting = false;
    });
    this._cleanupIndicator();
    this._mouseDownPos = null;
    this._activeContainer = null;
    this._activeChart = null;
    this._isMarqueeActive = false;
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this._isMarqueeActive) {
      this._handleCancel();
    }
  }

  private _cleanupIndicator(): void {
    if (this._activeContainer) {
      const div = this._activeContainer.querySelector('#selection-box-indicator');
      if (div) div.remove();
    }
  }
}
