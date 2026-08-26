import { useDrawingStore, type DrawingItem } from '@/store';

/**
 * Pure, standalone reconciliation function.
 * Declaratively updates KLineCharts slot overlay instances based on authoritative
 * store state in useDrawingStore for the specified symbol.
 *
 * DOES NOT modify existing handlers or legacy syncAllDrawings() pathways.
 */
export function reconcileChartsFromStore(
  symbol: string,
  slots: { symbol: string | null; timeframe: string }[],
  chartInstancesRef: React.MutableRefObject<(any | null)[]>,
  activeIndex: number = 0
): void {
  if (!symbol) return;
  const storeSymbolKey = symbol.toUpperCase();
  const drawings: DrawingItem[] = useDrawingStore.getState().getSymbolDrawings(storeSymbolKey);

  const visibleCount = slots.length;

  for (let i = 0; i < visibleCount; i++) {
    const chart = chartInstancesRef.current[i];
    if (!chart) continue;

    const slotSymbol = slots[i]?.symbol;
    if (!slotSymbol || slotSymbol.toUpperCase() !== storeSymbolKey) {
      continue;
    }

    const currentOverlays = (chart as any).getOverlays();
    const isPrimarySlot = i === activeIndex;

    // Desired overlays set for this slot
    const desiredOverlayIds = new Set<string>();
    const desiredOverlaysMap = new Map<string, DrawingItem>();

    drawings.forEach((d) => {
      const targetId = isPrimarySlot ? d.id : `sync_${d.id}_from_${activeIndex}`;
      desiredOverlayIds.add(targetId);
      desiredOverlaysMap.set(targetId, d);
    });

    let slotNeedsInvalidate = false;

    // 1. Remove stale drawing overlays
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

      if (!desiredOverlayIds.has(ov.id)) {
        (chart as any).removeOverlay({ id: ov.id });
        slotNeedsInvalidate = true;
      }
    });

    // 2. Create or update desired drawing overlays
    drawings.forEach((d) => {
      const targetId = isPrimarySlot ? d.id : `sync_${d.id}_from_${activeIndex}`;
      const existingOv = currentOverlays.find((o: any) => o.id === targetId);

      if (existingOv) {
        const pointsChanged = JSON.stringify(existingOv.points) !== JSON.stringify(d.points);
        const lockChanged = existingOv.lock !== d.lock;
        const visibleChanged = existingOv.visible !== (d.visible !== false);
        const extendDataChanged = JSON.stringify(existingOv.extendData) !== JSON.stringify(d.extendData || {});

        if (pointsChanged || lockChanged || visibleChanged || extendDataChanged) {
          (chart as any).overrideOverlay({
            id: targetId,
            points: JSON.parse(JSON.stringify(d.points)),
            lock: d.lock,
            visible: d.visible !== false,
            extendData: JSON.parse(JSON.stringify(d.extendData || {})),
            styles: d.styles,
          });
          slotNeedsInvalidate = true;
        }
      } else {
        (chart as any).createOverlay({
          name: d.name,
          id: targetId,
          paneId: d.paneId || 'candle_pane',
          points: JSON.parse(JSON.stringify(d.points)),
          lock: d.lock,
          visible: d.visible !== false,
          extendData: JSON.parse(JSON.stringify(d.extendData || {})),
          styles: d.styles,
        });
        slotNeedsInvalidate = true;
      }
    });

    // 3. Force canvas repaint pass if overlays were modified or removed
    if (slotNeedsInvalidate) {
      const pane = (chart as any).getDrawPaneById?.('candle_pane');
      if (pane) {
        if (typeof pane.getWidget === 'function' && typeof pane.getWidget()?.invalidate === 'function') {
          pane.getWidget().invalidate();
        } else if (typeof pane.requestInvalidate === 'function') {
          pane.requestInvalidate();
        } else if (typeof pane.invalidate === 'function') {
          pane.invalidate();
        }
      }
    }
  }
}
