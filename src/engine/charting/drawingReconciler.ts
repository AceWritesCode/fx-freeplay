import { useDrawingStore, useLayoutStore } from '@/store';
import {
  calculateWorkspaceSyncPlan,
  type SyncEngineInput,
  type WorkspaceSyncPlan,
} from './drawingSyncEngine';
import { DrawingChartAdapter } from './drawingChartAdapter';

/**
 * drawingReconciler.ts
 *
 * Bridge connecting the pure DrawingSyncEngine to KLineCharts view slots.
 *
 * ARCHITECTURAL DIRECTION:
 *   STORE -> SYNC ENGINE (PLAN) -> RECONCILER -> CHART ADAPTER -> KLINECHARTS
 *
 * RECONCILER GUARANTEES:
 * 1. STRICTLY TOP-DOWN: Never mutates useDrawingStore or infers deletion from missing chart overlays.
 * 2. VIEW ADAPTER DRIVEN: Uses DrawingChartAdapter for ALL KLineCharts operations.
 * 3. CONDITIONAL REPAINT: Invalidates candle_pane ONLY on slots where overlays were created, updated, or removed.
 * 4. PURE VIEW SYNCHRONIZATION: Does NOT invoke business rules or calculate desired overlays directly.
 */

let isReconcilingDrawingsFlag = false;

/**
 * Returns true if drawingReconciler is currently performing programmatic overlay updates/removals.
 */
export function isReconcilingDrawings(): boolean {
  return isReconcilingDrawingsFlag;
}

/**
 * Reconciles the workspace's visible chart slots to match the calculated
 * WorkspaceSyncPlan derived from authoritative useDrawingStore state.
 *
 * @param slots Visible layout slots with assigned symbols and timeframes
 * @param chartInstancesRef Reference to KLineCharts chart instances
 * @param activeIndex Currently active chart slot index
 * @param isDrawingSyncEnabled Global drawing sync toggle flag
 */
export function reconcileWorkspace(
  slots: { symbol: string | null; timeframe: string }[],
  chartInstancesRef: React.MutableRefObject<(any | null)[]>,
  activeIndex: number = 0,
  isDrawingSyncEnabled: boolean = useLayoutStore.getState().syncDrawings
): void {
  if (!slots || slots.length === 0 || !chartInstancesRef || !chartInstancesRef.current) {
    return;
  }

  isReconcilingDrawingsFlag = true;
  try {
    // 1. Read authoritative drawing storage
    const drawingsBySymbol = useDrawingStore.getState().drawingsBySymbol;

    // 2. Prepare immutable engine input context
    const engineInput: SyncEngineInput = {
      drawingsBySymbol,
      visibleSlots: slots,
      activeIndex,
      isDrawingSyncEnabled,
    };

    // 3. Calculate deterministic workspace sync plan
    const syncPlan: WorkspaceSyncPlan = calculateWorkspaceSyncPlan(engineInput);

    // 4. Declaratively reconcile each slot plan to the corresponding chart instance
    syncPlan.slotPlans.forEach((slotPlan) => {
      const chart = chartInstancesRef.current[slotPlan.slotIndex];
      if (!chart) return;

    // Read current chart overlays using DrawingChartAdapter ONLY
    const currentOverlays = DrawingChartAdapter.getOverlays(chart);
    const desiredOverlays = slotPlan.desiredOverlays;

    let slotModified = false;

    // Step A: Remove stale overlays (overlays currently on chart but not in desiredOverlays map)
    currentOverlays.forEach((ov: any) => {
      // Ignore system indicator/price line overlays
      if (
        ov.id === 'custom_price_line_overlay' ||
        ov.name === 'customPriceLine' ||
        ov.id === 'session_breaks_overlay' ||
        ov.name === 'sessionBreaks'
      ) {
        return;
      }

      // Synced projections are NEVER user drawing sessions
      const isSyncCopy = typeof ov.id === 'string' && ov.id.startsWith('sync_');

      // Ignore overlays currently in-progress / being drawn by the user
      const isActivelyDrawing = !isSyncCopy && (
        (chart._activeDrawingId && ov.id === chart._activeDrawingId) ||
        (typeof ov.currentStep === 'number' && typeof ov.totalStep === 'number' && ov.currentStep < ov.totalStep && (!ov.points || ov.points.length === 0))
      );

      if (isActivelyDrawing) {
        return;
      }

      if (!desiredOverlays.has(ov.id)) {
        DrawingChartAdapter.removeOverlay(chart, ov.id);
        slotModified = true;
      }
    });

    // Step B: Create missing overlays or update modified overlays
    desiredOverlays.forEach((desiredItem, overlayId) => {
      const d = desiredItem.drawing;
      const existingOv = currentOverlays.find((o: any) => o.id === overlayId);

      if (existingOv) {
        // Protect overlays actively being dragged/edited or currently selected on the primary slot
        const isActivelyEditing =
          (chart._activeDraggingIndex !== undefined && chart._activeDraggingIndex !== null) ||
          (existingOv.extendData?.draggedIndex !== undefined && existingOv.extendData?.draggedIndex !== null);

        const isSelectedOnPrimary =
          slotPlan.isPrimarySlot &&
          Array.isArray(chart._selectedOverlayIds) &&
          chart._selectedOverlayIds.includes(overlayId);

        if (isActivelyEditing || isSelectedOnPrimary) {
          return;
        }

        // Check if points, lock, visible, or extendData changed in store
        const pointsChanged = JSON.stringify(existingOv.points) !== JSON.stringify(d.points);
        const lockChanged = existingOv.lock !== d.lock;
        const visibleChanged = existingOv.visible !== (d.visible !== false);
        const extendDataChanged = JSON.stringify(existingOv.extendData) !== JSON.stringify(d.extendData || {});

        if (pointsChanged || lockChanged || visibleChanged || extendDataChanged) {
          DrawingChartAdapter.overrideOverlay(chart, {
            id: overlayId,
            points: JSON.parse(JSON.stringify(d.points)),
            lock: d.lock,
            visible: d.visible !== false,
            extendData: JSON.parse(JSON.stringify(d.extendData || {})),
            styles: d.styles,
          });
          slotModified = true;
        }
      } else {
        // Create missing overlay instance on target chart slot
        DrawingChartAdapter.createOverlay(chart, {
          name: d.name,
          id: overlayId,
          paneId: d.paneId || 'candle_pane',
          points: JSON.parse(JSON.stringify(d.points)),
          lock: d.lock,
          visible: d.visible !== false,
          extendData: JSON.parse(JSON.stringify(d.extendData || {})),
          styles: d.styles,
        });
        slotModified = true;
      }
    });

    // Step C: Conditionally invalidate candle_pane widget if overlays were created, updated, or removed
    if (slotModified) {
      DrawingChartAdapter.invalidatePane(chart, 'candle_pane');
    }
  });
  } finally {
    isReconcilingDrawingsFlag = false;
  }
}

/**
 * Legacy compatibility alias for existing reconcileChartsFromStore calls.
 */
export function reconcileChartsFromStore(
  _symbol: string,
  slots: { symbol: string | null; timeframe: string }[],
  chartInstancesRef: React.MutableRefObject<(any | null)[]>,
  activeIndex: number = 0
): void {
  const syncDrawings = useLayoutStore.getState().syncDrawings;
  reconcileWorkspace(slots, chartInstancesRef, activeIndex, syncDrawings);
}

/**
 * Universal Storage-First Reconciliation Trigger.
 * Reads current workspace layout state and executes reconcileWorkspace().
 */
export function runWorkspaceReconciliation(
  chartInstancesRef: React.MutableRefObject<(any | null)[]>
): void {
  if (!chartInstancesRef || !chartInstancesRef.current) return;
  const { slots, activeChartIndex, syncDrawings } = useLayoutStore.getState();
  reconcileWorkspace(slots, chartInstancesRef, activeChartIndex, syncDrawings);
}
