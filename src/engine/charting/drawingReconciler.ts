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
        // Protect overlays actively being mouse-dragged
        const isActivelyEditing =
          (chart._activeDraggingIndex !== undefined && chart._activeDraggingIndex !== null) ||
          (existingOv.extendData?.draggedIndex !== undefined && existingOv.extendData?.draggedIndex !== null);

        if (isActivelyEditing) {
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

/**
 * Checkpoint 1 — Generic Live Mirror Engine Helper
 *
 * Propagates live transient overlay updates (points, styles, extendData) from a source
 * chart slot to all other visible chart slots displaying the same symbol.
 *
 * Used during active dragging (onPressedMoving) and live in-progress drawing creation.
 * ZERO data is written to Zustand or IndexedDB during this transient mirroring pass.
 */
export function mirrorLiveOverlayUpdate(
  sourceChart: any,
  overlayId: string,
  updates: { points?: any[]; styles?: any; extendData?: any },
  chartInstancesRef?: React.MutableRefObject<(any | null)[]>
): void {
  if (!sourceChart || !overlayId) return;

  const layoutState = useLayoutStore.getState();
  const { slots, syncDrawings } = layoutState;
  const visibleCount = slots ? slots.length : 0;

  // Requirement 1: Work ONLY when multi-chart layout is active & Drawing Sync is ON
  if (visibleCount <= 1 || !syncDrawings) {
    return;
  }

  // Identify source slot index
  const sourceSlotIndex = typeof sourceChart._chartIndex === 'number'
    ? sourceChart._chartIndex
    : layoutState.activeChartIndex;

  // Identify source chart symbol
  const sourceSymbol = sourceChart._symbol || slots[sourceSlotIndex]?.symbol;
  if (!sourceSymbol) return;

  const sourceSymbolKey = sourceSymbol.toUpperCase();

  // Identify canonical original ID (strip any sync_ prefix if called on a projection)
  const syncMatch = overlayId.match(/^sync_(.+)_from_(\d+)$/);
  const originalId = syncMatch ? syncMatch[1] : overlayId;
  const creatorSlotIndex = syncMatch ? parseInt(syncMatch[2], 10) : sourceSlotIndex;

  // Target sync overlay ID format for matching slots
  const targetSyncOverlayId = `sync_${originalId}_from_${creatorSlotIndex}`;

  // Read chartInstances reference
  const charts = chartInstancesRef?.current || [];

  // Dynamically iterate over ALL visible chart slots (never hardcode chart numbers)
  for (let slotIndex = 0; slotIndex < visibleCount; slotIndex++) {
    // Skip the source chart slot itself
    if (slotIndex === sourceSlotIndex) continue;

    const targetSlot = slots[slotIndex];
    const targetSymbolKey = targetSlot?.symbol ? targetSlot.symbol.toUpperCase() : null;

    // Requirement: Find every other visible chart currently displaying the same symbol
    if (targetSymbolKey !== sourceSymbolKey) continue;

    const targetChart = charts[slotIndex];
    if (!targetChart) continue;

    // Locate corresponding projection on target chart
    const existingOv = DrawingChartAdapter.getOverlayById(targetChart, targetSyncOverlayId);

    if (existingOv) {
      // Projection exists: update it with latest live points/styles/extendData
      DrawingChartAdapter.overrideOverlay(targetChart, {
        id: targetSyncOverlayId,
        ...(updates.points ? { points: JSON.parse(JSON.stringify(updates.points)) } : {}),
        ...(updates.styles ? { styles: updates.styles } : {}),
        ...(updates.extendData ? { extendData: JSON.parse(JSON.stringify(updates.extendData)) } : {}),
      });
    } else {
      // Projection does not exist yet (e.g. first-time drawing creation in progress): create read-only projection
      const sourceOv = DrawingChartAdapter.getOverlayById(sourceChart, overlayId);
      if (sourceOv) {
        DrawingChartAdapter.createOverlay(targetChart, {
          name: sourceOv.name,
          id: targetSyncOverlayId,
          paneId: sourceOv.paneId || 'candle_pane',
          points: JSON.parse(JSON.stringify(updates.points || sourceOv.points || [])),
          lock: sourceOv.lock,
          visible: sourceOv.visible !== false,
          extendData: JSON.parse(JSON.stringify(updates.extendData || sourceOv.extendData || {})),
          styles: updates.styles || sourceOv.styles,
        });
      }
    }

    // Immediately invalidate/repaint target chart canvas
    DrawingChartAdapter.invalidatePane(targetChart);
  }
}
