import type { DrawingItem } from '@/store';

/**
 * drawingSyncEngine.ts
 *
 * Standalone, pure state-calculation engine for drawing synchronization.
 *
 * ARCHITECTURAL BOUNDARY:
 * - Pure deterministic function:Same Input -> Same Output.
 * - MUST NOT import KLineCharts or access chart instances.
 * - MUST NOT query DOM or window.
 * - MUST NOT call createOverlay, overrideOverlay, removeOverlay, or invalidate.
 * - MUST NOT call Zustand hooks or access external state directly.
 * - MUST NOT read or write IndexedDB.
 * - MUST NOT schedule timers or callbacks.
 * - MUST NOT mutate input objects.
 *
 * STORAGE IS THE SINGLE SOURCE OF TRUTH.
 * Charts are disposable rendering targets.
 */

/**
 * Immutable input context passed into pure sync engine calculation.
 */
export interface SyncEngineInput {
  /** Symbol-keyed map of authoritative drawing arrays from store */
  drawingsBySymbol: Record<string, DrawingItem[]>;
  /** Array of visible layout grid slots and their assigned symbol/timeframe */
  visibleSlots: { symbol: string | null; timeframe: string }[];
  /** Index of currently active chart slot */
  activeIndex: number;
  /** Global drawing synchronization toggle flag */
  isDrawingSyncEnabled: boolean;
}

/**
 * Descriptor for a single overlay shape that SHOULD exist on a chart slot.
 */
export interface DesiredOverlayItem {
  /** Authoritative source drawing ID in store */
  originalId: string;
  /** Actual overlay ID to render on KLineCharts instance (original ID or sync_ copy ID) */
  overlayId: string;
  /** Index of the slot that owns the original drawing source */
  sourceSlotIndex: number;
  /** Target slot index where this overlay should be rendered */
  targetSlotIndex: number;
  /** Target chart symbol */
  symbol: string;
  /** Flag indicating if this item is a synced copy from another slot */
  isSyncedCopy: boolean;
  /** Complete drawing definition object */
  drawing: DrawingItem;
}

/**
 * Desired state plan for a single visible chart slot.
 */
export interface SlotSyncPlan {
  slotIndex: number;
  symbol: string | null;
  isPrimarySlot: boolean;
  /** Map of desired overlayId -> DesiredOverlayItem */
  desiredOverlays: Map<string, DesiredOverlayItem>;
}

/**
 * Deterministic workspace sync plan output by drawingSyncEngine.
 */
export interface WorkspaceSyncPlan {
  slotPlans: SlotSyncPlan[];
}

/**
 * Calculates the deterministic workspace sync plan for the current workspace state.
 *
 * Answers: "For the current workspace state, what overlays SHOULD each chart contain?"
 */
export function calculateWorkspaceSyncPlan(input: SyncEngineInput): WorkspaceSyncPlan {
  const { drawingsBySymbol, visibleSlots, activeIndex, isDrawingSyncEnabled } = input;
  const visibleCount = visibleSlots ? visibleSlots.length : 0;
  const validActiveIndex = activeIndex >= 0 && activeIndex < visibleCount ? activeIndex : 0;
  const activeSlotSymbol = visibleSlots && visibleSlots[validActiveIndex]?.symbol
    ? visibleSlots[validActiveIndex].symbol!.toUpperCase()
    : null;

  const slotPlans: SlotSyncPlan[] = [];

  for (let slotIndex = 0; slotIndex < visibleCount; slotIndex++) {
    const slot = visibleSlots[slotIndex];
    const slotSymbol = slot?.symbol ? slot.symbol.toUpperCase() : null;
    const isPrimarySlot = slotIndex === validActiveIndex;
    const desiredOverlays = new Map<string, DesiredOverlayItem>();

    if (slotSymbol) {
      if (isPrimarySlot) {
        // RULE 1: Active slot receives original drawings belonging to activeSlotSymbol
        const symbolDrawings = drawingsBySymbol[slotSymbol] || [];
        symbolDrawings.forEach((d) => {
          desiredOverlays.set(d.id, {
            originalId: d.id,
            overlayId: d.id,
            sourceSlotIndex: slotIndex,
            targetSlotIndex: slotIndex,
            symbol: slotSymbol,
            isSyncedCopy: false,
            drawing: d,
          });
        });
      } else {
        // Target slot (slotIndex !== validActiveIndex)
        if (isDrawingSyncEnabled && activeSlotSymbol && slotSymbol === activeSlotSymbol) {
          // RULE 2: Same symbol + sync ON -> Target slot receives synced copies of active slot's drawings
          const activeSymbolDrawings = drawingsBySymbol[activeSlotSymbol] || [];
          activeSymbolDrawings.forEach((d) => {
            const syncOverlayId = `sync_${d.id}_from_${validActiveIndex}`;
            desiredOverlays.set(syncOverlayId, {
              originalId: d.id,
              overlayId: syncOverlayId,
              sourceSlotIndex: validActiveIndex,
              targetSlotIndex: slotIndex,
              symbol: slotSymbol,
              isSyncedCopy: true,
              drawing: d,
            });
          });
        } else {
          // RULE 3 & 4: Different symbols OR Sync OFF -> Target slot receives drawings from its OWN symbol container
          const ownSymbolDrawings = drawingsBySymbol[slotSymbol] || [];
          ownSymbolDrawings.forEach((d) => {
            desiredOverlays.set(d.id, {
              originalId: d.id,
              overlayId: d.id,
              sourceSlotIndex: slotIndex,
              targetSlotIndex: slotIndex,
              symbol: slotSymbol,
              isSyncedCopy: false,
              drawing: d,
            });
          });
        }
      }
    }

    slotPlans.push({
      slotIndex,
      symbol: slotSymbol,
      isPrimarySlot,
      desiredOverlays,
    });
  }

  return { slotPlans };
}
