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
 * Checkpoint 1 — Ownership Resolver
 *
 * Pure function that dynamically calculates the authoritative owner slot index
 * for a drawing based on current layout slots, symbol distribution, and sync settings.
 */
export function resolveDrawingOwnerSlot(
  drawing: DrawingItem,
  visibleSlots: { symbol: string | null; timeframe: string }[],
  _isDrawingSyncEnabled: boolean
): number | null {
  const visibleCount = visibleSlots ? visibleSlots.length : 0;
  if (visibleCount === 0 || !drawing || !drawing.symbol) {
    return null;
  }

  const drawingSymbol = drawing.symbol.toUpperCase();

  // Find index of the first visible slot displaying drawingSymbol
  let firstSlotIndexForSymbol = -1;
  for (let i = 0; i < visibleCount; i++) {
    const slotSymbol = visibleSlots[i]?.symbol ? visibleSlots[i].symbol!.toUpperCase() : null;
    if (slotSymbol === drawingSymbol) {
      firstSlotIndexForSymbol = i;
      break;
    }
  }

  if (firstSlotIndexForSymbol === -1) {
    // No visible slot is currently displaying this drawing's symbol
    return null;
  }

  if (visibleCount === 1) {
    // Rule 1: Single-chart layout -> Slot 0 is the dynamic owner
    return 0;
  }

  // Check if tagged sourceSlotIndex is valid and the slot at that index currently displays drawingSymbol
  const taggedSlotIndex = typeof drawing.extendData?.sourceSlotIndex === 'number'
    ? drawing.extendData.sourceSlotIndex
    : -1;

  if (taggedSlotIndex >= 0 && taggedSlotIndex < visibleCount) {
    const taggedSlotSymbol = visibleSlots[taggedSlotIndex]?.symbol
      ? visibleSlots[taggedSlotIndex].symbol!.toUpperCase()
      : null;

    if (taggedSlotSymbol === drawingSymbol) {
      return taggedSlotIndex;
    }
  }

  // Fallback for untagged drawings or if creator slot no longer displays drawingSymbol
  return firstSlotIndexForSymbol;
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
  const isSingleChart = visibleCount === 1;

  const slotPlans: SlotSyncPlan[] = [];

  for (let slotIndex = 0; slotIndex < visibleCount; slotIndex++) {
    const slot = visibleSlots[slotIndex];
    const slotSymbol = slot?.symbol ? slot.symbol.toUpperCase() : null;
    const isPrimarySlot = slotIndex === validActiveIndex;
    const desiredOverlays = new Map<string, DesiredOverlayItem>();

    if (slotSymbol) {
      const symbolDrawings = drawingsBySymbol[slotSymbol] || [];

      symbolDrawings.forEach((d) => {
        // Checkpoint 2: Dynamically resolve authoritative owner slot for drawing d
        const ownerSlotIndex = resolveDrawingOwnerSlot(d, visibleSlots, isDrawingSyncEnabled);

        if (ownerSlotIndex === null) {
          return;
        }

        // Immutable creator slot metadata
        const creatorSlotIndex = typeof d.extendData?.sourceSlotIndex === 'number'
          ? d.extendData.sourceSlotIndex
          : 0;

        if (isSingleChart) {
          // Single-chart layout: render canonical drawings relevant to visible symbol as original overlays (no sync copies)
          desiredOverlays.set(d.id, {
            originalId: d.id,
            overlayId: d.id,
            sourceSlotIndex: creatorSlotIndex,
            targetSlotIndex: 0,
            symbol: slotSymbol,
            isSyncedCopy: false,
            drawing: d,
          });
        } else {
          // Multi-chart layout
          if (ownerSlotIndex === slotIndex) {
            // Owner slot renders original canonical drawing
            desiredOverlays.set(d.id, {
              originalId: d.id,
              overlayId: d.id,
              sourceSlotIndex: creatorSlotIndex,
              targetSlotIndex: slotIndex,
              symbol: slotSymbol,
              isSyncedCopy: false,
              drawing: d,
            });
          } else if (isDrawingSyncEnabled) {
            // Sync ON -> Non-owner slot renders synced copy projection
            const syncOverlayId = `sync_${d.id}_from_${creatorSlotIndex}`;
            desiredOverlays.set(syncOverlayId, {
              originalId: d.id,
              overlayId: syncOverlayId,
              sourceSlotIndex: creatorSlotIndex,
              targetSlotIndex: slotIndex,
              symbol: slotSymbol,
              isSyncedCopy: true,
              drawing: d,
            });
          }
          // Sync OFF & ownerSlotIndex !== slotIndex -> 0 overlay added
        }
      });
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
