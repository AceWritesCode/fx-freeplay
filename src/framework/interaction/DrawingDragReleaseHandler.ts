import { isEditableElement } from './ModifierKeyTracker.ts';
import { isExclusiveMarqueeMode } from './MarqueeSelectionHandler.ts';
import { snapPointToCandle, calculateAngleSnapPoint, isAngleSnapSupportedTool } from '../../engine/charting/snapping.ts';
import { replayVisibilityBoundary } from '../../engine/replay/ReplayVisibilityBoundary.ts';

function invalidateOverlayPane(chart: any, paneId: string = 'candle_pane'): void {
  if (!chart) return;
  try {
    if (typeof chart.updatePane === 'function') {
      chart.updatePane(1, paneId);
    }
    const chartStore = chart._chartStore || (typeof chart.getChartStore === 'function' ? chart.getChartStore() : null);
    if (chartStore && typeof chartStore.getPaneStore === 'function') {
      const panes = chartStore.getPaneStore().getPanes();
      if (Array.isArray(panes)) {
        panes.forEach((pane: any) => {
          if (typeof pane.getWidget === 'function') {
            pane.getWidget()?.invalidate?.();
          }
        });
      }
    }
  } catch (_) {}
}

export interface DrawingDragReleaseOptions {
  chartContainersRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
  chartInstancesRef: React.MutableRefObject<(any | null)[]>;
  activeTool: string | null;
  isSpacePressedRef?: React.MutableRefObject<boolean>;
}

interface DragState {
  chart: any;
  chartStore: any;
  container: HTMLDivElement;
  slotIndex: number;
  overlay: any;
  paneId: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  hasDragged: boolean;
  startStep: number;
}

function convertCoordinateToPoint(
  chart: any,
  overlay: any,
  paneId: string,
  x: number,
  y: number
): { timestamp?: number; dataIndex?: number; value?: number } {
  try {
    const snapped = snapPointToCandle({ chart, overlay }, x, y);
    if (snapped && isFinite(snapped.value)) {
      return snapped;
    }
  } catch (_) {}

  try {
    const res = chart.convertFromPixel({ x, y }, { paneId });
    const pt = Array.isArray(res) ? res[0] : res;
    if (pt) {
      if (replayVisibilityBoundary.isActive()) {
        const dataList = typeof chart?.getDataList === 'function' ? chart.getDataList() : null;
        if (dataList && dataList.length > 0) {
          return replayVisibilityBoundary.clampPointToRevealedBoundary(pt, dataList);
        }
      }
      return pt;
    }
  } catch (_) {}

  return {};
}


/**
 * Handles click-drag-release creation for two-anchor drawing tools (totalStep === 3)
 * as well as Shift-held second-anchor commit during click-click creation.
 */
export class DrawingDragReleaseHandler {
  private _options: DrawingDragReleaseOptions;
  private _dragState: DragState | null = null;
  private _cleanupFn: (() => void) | null = null;
  private _lastMousePos: { clientX: number; clientY: number } | null = null;

  constructor(options: DrawingDragReleaseOptions) {
    this._options = options;
    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._handleCancel = this._handleCancel.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
  }

  public updateOptions(options: DrawingDragReleaseOptions): void {
    this._options = options;
    // If the active tool was cancelled or changed while dragging, abort active drag
    if (!options.activeTool && this._dragState) {
      this._handleCancel();
    }
  }

  public attach(): void {
    this.detach();

    const containers = this._options.chartContainersRef.current.filter(
      (c): c is HTMLDivElement => c !== null
    );

    // Capture phase on containers ensures we establish drag state before internal canvas handlers
    containers.forEach((container) => {
      container.addEventListener('mousedown', this._handleMouseDown, true);
    });

    window.addEventListener('mousemove', this._handleMouseMove);
    window.addEventListener('mouseup', this._handleMouseUp);
    window.addEventListener('blur', this._handleCancel);
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);

    this._cleanupFn = () => {
      containers.forEach((container) => {
        container.removeEventListener('mousedown', this._handleMouseDown, true);
      });
      window.removeEventListener('mousemove', this._handleMouseMove);
      window.removeEventListener('mouseup', this._handleMouseUp);
      window.removeEventListener('blur', this._handleCancel);
      window.removeEventListener('keydown', this._handleKeyDown);
      window.removeEventListener('keyup', this._handleKeyUp);
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

    // Must have an active drawing tool selected
    if (!this._options.activeTool) return;

    // Ignore if Ctrl/Meta is pressed (exclusive marquee selection mode)
    if (e.ctrlKey || e.metaKey) return;

    // Ignore if Space key is pressed (pan navigation mode)
    if (this._options.isSpacePressedRef?.current) return;

    // Ignore clicks on UI elements (floating toolbar, dialogs, buttons, menus)
    const target = e.target as Element;
    if (
      target &&
      typeof target.closest === 'function' &&
      (target.closest('[data-floating-ui], .drawing-floating-toolbar, [data-no-deselect], [role="dialog"]') ||
        target.closest('button, input, select, textarea, [role="button"], [role="menu"]'))
    ) {
      return;
    }

    const container = (e.currentTarget || e.target) as HTMLDivElement;
    const containers = this._options.chartContainersRef.current;
    const slotIndex = containers.findIndex((c) => c && (c === container || c.contains(container)));
    if (slotIndex === -1) return;

    const chart = this._options.chartInstancesRef.current[slotIndex];
    if (!chart) return;

    // Must not be in marquee selection mode
    if (isExclusiveMarqueeMode(chart, e)) return;

    const chartStore = (chart as any).getChartStore?.() || (chart as any)._chartStore;
    if (!chartStore) return;

    // Must NOT intercept if user pressed on an existing completed overlay figure (move/edit gesture)
    const pressedInfo = chartStore.getPressedOverlayInfo?.();
    if (pressedInfo?.overlay) return;

    // Must have an in-progress overlay
    const progressInfo = chartStore.getProgressOverlayInfo?.();
    if (!progressInfo || !progressInfo.overlay) return;

    const overlay = progressInfo.overlay;

    // Constraint: MUST be a two-anchor tool (totalStep === 3)
    if (overlay.totalStep !== 3) return;

    const isShift = e.shiftKey || chart._isShiftPressedRef?.current || false;
    const isAngleSnapTool = isAngleSnapSupportedTool(overlay.name);
    const isInitialStep = overlay.currentStep === 1;
    const isShiftStep2 = overlay.currentStep === 2 && isShift && isAngleSnapTool;

    // Constraint: MUST be in step 1 (drag-release candidate) OR step 2 with Shift held on angle-snap tool
    if (!overlay.isDrawing?.() || (!isInitialStep && !isShiftStep2)) {
      return;
    }

    const targetContainer = containers[slotIndex]!;
    const box = targetContainer.getBoundingClientRect();
    const startX = e.clientX - box.left;
    const startY = e.clientY - box.top;

    if (startX < 0 || startX > box.width || startY < 0 || startY > box.height) {
      return;
    }

    this._dragState = {
      chart,
      chartStore,
      container: targetContainer,
      slotIndex,
      overlay,
      paneId: progressInfo.paneId || 'candle_pane',
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX,
      startY,
      hasDragged: false,
      startStep: overlay.currentStep,
    };
  }

  private _handleMouseMove(e: MouseEvent): void {
    this._lastMousePos = { clientX: e.clientX, clientY: e.clientY };

    if (!this._dragState) return;

    const dx = e.clientX - this._dragState.startClientX;
    const dy = e.clientY - this._dragState.startClientY;
    const manhattanDist = Math.abs(dx) + Math.abs(dy);

    // Check 5px threshold (matching KLineCharts ManhattanDistance.CancelClick)
    if (!this._dragState.hasDragged) {
      if (manhattanDist < 5) {
        return; // Still within click tolerance
      }
      this._dragState.hasDragged = true;

      // Commit Anchor 1 at the initial mousedown coordinate and advance to step 2
      if (this._dragState.overlay.isStart?.() || this._dragState.overlay.currentStep === 1) {
        const startPoint = convertCoordinateToPoint(
          this._dragState.chart,
          this._dragState.overlay,
          this._dragState.paneId,
          this._dragState.startX,
          this._dragState.startY
        );

        this._dragState.chartStore.updateProgressOverlayInfo?.(this._dragState.paneId, true);
        this._dragState.overlay.stepDrawingModeEventMoveForDrawing?.(startPoint);
        this._dragState.overlay.nextStep?.(); // Current step advances to 2
      }
    }

    // While dragging, update Anchor 2 preview position and redraw
    if (this._dragState.hasDragged) {
      e.preventDefault();
      const box = this._dragState.container.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(box.width, e.clientX - box.left));
      const currentY = Math.max(0, Math.min(box.height, e.clientY - box.top));

      const isShift = e.shiftKey ||
        this._options.chartInstancesRef.current[this._dragState.slotIndex]?._isShiftPressedRef?.current ||
        false;

      let currentPoint: any;
      if (isShift && isAngleSnapSupportedTool(this._dragState.overlay.name)) {
        const pBase = this._dragState.overlay.points?.[0];
        const snappedAnglePt = pBase
          ? calculateAngleSnapPoint(this._dragState.chart, pBase, currentX, currentY, this._dragState.paneId)
          : null;
        currentPoint = snappedAnglePt || convertCoordinateToPoint(
          this._dragState.chart,
          this._dragState.overlay,
          this._dragState.paneId,
          currentX,
          currentY
        );
      } else {
        currentPoint = convertCoordinateToPoint(
          this._dragState.chart,
          this._dragState.overlay,
          this._dragState.paneId,
          currentX,
          currentY
        );
      }

      this._dragState.overlay.stepDrawingModeEventMoveForDrawing?.(currentPoint);
      this._dragState.overlay.onDrawing?.({
        chart: this._dragState.chart,
        overlay: this._dragState.overlay,
        x: currentX,
        y: currentY,
        shiftKey: isShift,
      });

      invalidateOverlayPane(this._dragState.chart, this._dragState.paneId);
    }
  }

  private _handleMouseUp(e: MouseEvent): void {
    if (!this._dragState) return;

    const state = this._dragState;
    this._dragState = null;

    const isShift = e.shiftKey ||
      state.chart?._isShiftPressedRef?.current ||
      false;

    const isShiftAngleSnapCommit =
      !state.hasDragged &&
      state.startStep === 2 &&
      isShift &&
      isAngleSnapSupportedTool(state.overlay.name);

    if (state.hasDragged || isShiftAngleSnapCommit) {
      // Commit Anchor 2 at release/click point and complete drawing
      const box = state.container.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(box.width, e.clientX - box.left));
      const currentY = Math.max(0, Math.min(box.height, e.clientY - box.top));

      let endPoint: any;
      if (isShift && isAngleSnapSupportedTool(state.overlay.name)) {
        const pBase = state.overlay.points?.[0];
        const snappedAnglePt = pBase
          ? calculateAngleSnapPoint(state.chart, pBase, currentX, currentY, state.paneId)
          : null;
        const rawPt = convertCoordinateToPoint(state.chart, state.overlay, state.paneId, currentX, currentY);
        endPoint = snappedAnglePt || rawPt;
      } else {
        endPoint = convertCoordinateToPoint(
          state.chart,
          state.overlay,
          state.paneId,
          currentX,
          currentY
        );
      }

      state.overlay.stepDrawingModeEventMoveForDrawing?.(endPoint);
      state.overlay.nextStep?.(); // Current step becomes OVERLAY_DRAW_STEP_FINISHED (-1)

      if (!state.overlay.isDrawing?.()) {
        state.chartStore.progressOverlayComplete?.();
        state.overlay.onDrawEnd?.({
          chart: state.chart,
          overlay: state.overlay,
          x: currentX,
          y: currentY,
          shiftKey: isShift,
        });

        invalidateOverlayPane(state.chart, state.paneId);
      }
    }
  }

  private _handleKeyUp(e: KeyboardEvent): void {
    if (e.key === 'Shift') {
      this._updateAngleSnapPreview();
    }
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this._handleCancel();
      return;
    }
    if (e.key === 'Shift') {
      this._updateAngleSnapPreview();
    }
  }

  private _updateAngleSnapPreview(): void {
    if (!this._lastMousePos) return;

    // 1. If currently dragging in drag-release mode:
    if (this._dragState && this._dragState.hasDragged) {
      const box = this._dragState.container.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(box.width, this._lastMousePos.clientX - box.left));
      const currentY = Math.max(0, Math.min(box.height, this._lastMousePos.clientY - box.top));

      const chart = this._dragState.chart;
      const overlay = this._dragState.overlay;
      const isShift = chart?._isShiftPressedRef?.current || false;

      let currentPoint: any;
      if (isShift && isAngleSnapSupportedTool(overlay.name)) {
        const pBase = overlay.points?.[0];
        const snappedAnglePt = pBase
          ? calculateAngleSnapPoint(chart, pBase, currentX, currentY, this._dragState.paneId)
          : null;
        currentPoint = snappedAnglePt || convertCoordinateToPoint(
          chart,
          overlay,
          this._dragState.paneId,
          currentX,
          currentY
        );
      } else {
        currentPoint = convertCoordinateToPoint(
          chart,
          overlay,
          this._dragState.paneId,
          currentX,
          currentY
        );
      }

      overlay.stepDrawingModeEventMoveForDrawing?.(currentPoint);
      overlay.onDrawing?.({
        chart,
        overlay,
        x: currentX,
        y: currentY,
        shiftKey: isShift,
      });
      invalidateOverlayPane(chart, this._dragState.paneId);
      return;
    }

    // 2. If in click-click mode: Anchor 1 already committed (currentStep === 2)
    const containers = this._options.chartContainersRef.current;
    const charts = this._options.chartInstancesRef.current;
    for (let i = 0; i < charts.length; i++) {
      const chart = charts[i];
      const container = containers[i];
      if (!chart || !container) continue;

      const chartStore = chart.getChartStore?.() || chart._chartStore;
      const progressInfo = chartStore?.getProgressOverlayInfo?.();
      if (!progressInfo || !progressInfo.overlay) continue;

      const overlay = progressInfo.overlay;
      if (overlay.currentStep === 2 && isAngleSnapSupportedTool(overlay.name)) {
        const box = container.getBoundingClientRect();
        const currentX = Math.max(0, Math.min(box.width, this._lastMousePos.clientX - box.left));
        const currentY = Math.max(0, Math.min(box.height, this._lastMousePos.clientY - box.top));

        const isShift = chart._isShiftPressedRef?.current || false;
        const pBase = overlay.points?.[0];

        let currentPoint: any;
        if (isShift && pBase) {
          const paneId = progressInfo.paneId || 'candle_pane';
          const snappedAnglePt = calculateAngleSnapPoint(chart, pBase, currentX, currentY, paneId);

          currentPoint = snappedAnglePt || convertCoordinateToPoint(
            chart,
            overlay,
            paneId,
            currentX,
            currentY
          );
        } else {
          currentPoint = convertCoordinateToPoint(
            chart,
            overlay,
            progressInfo.paneId || 'candle_pane',
            currentX,
            currentY
          );
        }

        overlay.stepDrawingModeEventMoveForDrawing?.(currentPoint);
        overlay.onDrawing?.({
          chart,
          overlay,
          x: currentX,
          y: currentY,
          shiftKey: isShift,
        });
        invalidateOverlayPane(chart, progressInfo.paneId || 'candle_pane');
      }
    }
  }

  private _handleCancel(): void {
    this._dragState = null;
  }
}
