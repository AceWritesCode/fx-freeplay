import { isExclusiveMarqueeMode } from './MarqueeSelectionHandler.ts';

/**
 * Authoritative predicate to determine whether an existing overlay is permitted
 * to enter the drag / move / edit lifecycle (onPressedMoveStart, onPressedMoving, onPressedMoveEnd).
 *
 * Invariant:
 * When a drawing creation tool is active (activeTool !== null, _activeDrawingId !== null,
 * or progressOverlay is actively drawing), drawing creation holds 100% exclusive ownership
 * of all canvas pointer gestures. Existing overlays MUST remain completely inert.
 *
 * Only when no drawing creation tool is active (and not in exclusive marquee mode)
 * is overlay dragging/editing permitted.
 */
export function isOverlayDragAllowed(chart: any, event?: any, overlay?: any): boolean {
  if (!chart && !event?.chart) return false;

  const targetChart = chart || event?.chart;
  const eventChart = event?.chart;
  const targetOverlay = overlay || event?.overlay;

  // 1. System overlays and locked overlays are NEVER draggable as user drawings
  if (targetOverlay) {
    if (
      targetOverlay.id === 'custom_price_line_overlay' ||
      targetOverlay.name === 'customPriceLine' ||
      targetOverlay.id === 'session_breaks_overlay' ||
      targetOverlay.name === 'sessionBreaks' ||
      targetOverlay.lock === true
    ) {
      return false;
    }
  }

  // 2. Exclusive Marquee Selection mode locks out all overlay dragging
  if (isExclusiveMarqueeMode(targetChart, event)) {
    return false;
  }

  // 3. Active drawing creation tool on either chart reference locks out existing overlay dragging
  const activeTool = targetChart?._activeTool || eventChart?._activeTool;
  if (activeTool !== null && activeTool !== undefined && activeTool !== '') {
    return false;
  }

  // 4. Armed active drawing ID locks out existing overlay dragging
  const activeDrawingId = targetChart?._activeDrawingId || eventChart?._activeDrawingId;
  if (activeDrawingId !== null && activeDrawingId !== undefined && activeDrawingId !== '') {
    return false;
  }

  // 5. In-progress overlay actively drawing in chart store locks out existing overlay dragging
  const chartStore = targetChart?.getChartStore?.() || targetChart?._chartStore ||
    eventChart?.getChartStore?.() || eventChart?._chartStore;

  if (chartStore) {
    const progressInfo = chartStore.getProgressOverlayInfo?.();
    if (progressInfo?.overlay?.isDrawing?.()) {
      return false;
    }
  }

  // 6. Price-axis (Y-axis) and Time-axis (X-axis) figures represent axis levels,
  // not the interactive drawing body, and must never enter the overlay drag lifecycle.
  if (event?.figureKey === 'yAxisFigures' || event?.figureKey === 'xAxisFigures') {
    return false;
  }

  return true;
}

export { isExclusiveMarqueeMode };
