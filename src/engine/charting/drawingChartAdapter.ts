/**
 * DrawingChartAdapter
 *
 * Low-level view adapter for KLineCharts overlay operations.
 *
 * WHAT BELONGS HERE:
 * - Direct calls to KLineCharts instance methods (createOverlay, overrideOverlay, removeOverlay, getOverlays).
 * - Canvas pane invalidation / repaint triggers.
 * - Low-level overlay options normalization.
 *
 * WHAT MUST NOT BELONG HERE:
 * - Zustand store reads, writes, or state dispatches.
 * - Business logic or multi-chart sync decision calculations.
 * - IndexedDB transactions or persistence logic.
 * - Multi-chart routing or symbol isolation rules.
 */

export interface ChartOverlayOptions {
  name: string;
  id: string;
  paneId?: string;
  points?: any[];
  lock?: boolean;
  visible?: boolean;
  extendData?: Record<string, any>;
  styles?: Record<string, any>;
  mode?: string;
  modeSensitivity?: number;
  [key: string]: any;
}

import { getInteractiveOverlayOptions } from '../../utils/overlays.ts';

export class DrawingChartAdapter {
  /**
   * Creates an overlay instance on a KLineCharts chart slot.
   */
  static createOverlay(chart: any, options: ChartOverlayOptions): void {
    if (!chart || !options || !options.id) return;

    const isOriginal = typeof options.id === 'string' && !options.id.startsWith('sync_');

    if (isOriginal) {
      const interactiveOptions = getInteractiveOverlayOptions(
        options.name,
        { current: chart },
        { current: [chart] },
        { current: false },
        () => {},
        () => {}
      );

      chart.createOverlay({
        paneId: 'candle_pane',
        ...interactiveOptions,
        ...options,
        extendData: {
          ...(interactiveOptions.extendData || {}),
          ...(options.extendData || {}),
        },
        onDrawEnd: interactiveOptions.onDrawEnd,
        onRemoved: interactiveOptions.onRemoved,
        onMouseEnter: interactiveOptions.onMouseEnter,
        onMouseLeave: interactiveOptions.onMouseLeave,
        onClick: interactiveOptions.onClick,
        onPressedMoveStart: interactiveOptions.onPressedMoveStart,
        onPressedMoving: interactiveOptions.onPressedMoving,
        onPressedMoveEnd: interactiveOptions.onPressedMoveEnd,
      });
    } else {
      chart.createOverlay({
        paneId: 'candle_pane',
        ...options,
      });
    }
  }

  /**
   * Updates/overrides properties of an existing overlay on a KLineCharts chart slot.
   */
  static overrideOverlay(chart: any, options: Partial<ChartOverlayOptions> & { id: string }): void {
    if (!chart || !options || !options.id) return;
    chart.overrideOverlay(options);
  }

  /**
   * Removes an overlay from a KLineCharts chart slot by ID.
   */
  static removeOverlay(chart: any, overlayId: string): void {
    if (!chart || !overlayId) return;
    chart.removeOverlay({ id: overlayId });
  }

  /**
   * Retrieves all overlay objects attached to a KLineCharts chart slot.
   */
  static getOverlays(chart: any): any[] {
    if (!chart || typeof chart.getOverlays !== 'function') return [];
    return chart.getOverlays() || [];
  }

  /**
   * Finds a specific overlay on a KLineCharts chart slot by ID.
   */
  static getOverlayById(chart: any, overlayId: string): any | null {
    const overlays = this.getOverlays(chart);
    return overlays.find((ov: any) => ov.id === overlayId) || null;
  }

  /**
   * Checks whether an overlay exists on a KLineCharts chart slot by ID.
   */
  static hasOverlay(chart: any, overlayId: string): boolean {
    return !!this.getOverlayById(chart, overlayId);
  }

  /**
   * Forces an immediate repaint pass on a KLineCharts chart's HTML5 canvas widget.
   */
  static invalidatePane(chart: any, paneId: string = 'candle_pane'): void {
    if (!chart) return;
    try {
      // 1. Invalidate all KLineCharts canvas pane widgets directly (non-viewport-mutating)
      if (chart._chartStore && typeof chart._chartStore.getPaneStore === 'function') {
        const panes = chart._chartStore.getPaneStore().getPanes();
        if (Array.isArray(panes)) {
          panes.forEach((pane: any) => {
            if (typeof pane.getWidget === 'function') {
              pane.getWidget()?.invalidate?.();
            }
          });
        }
      }

      // 2. Non-mutating layer update pass for overlay canvas layer if supported
      if (typeof chart.updatePane === 'function') {
        chart.updatePane(2, paneId);
      }
    } catch (_) {}
  }

  /**
   * Temporarily promotes an overlay to the visual front (zLevel above all existing overlays).
   * Saves the original natural zLevel in chart._promotedOverlayInfo.
   * If another overlay was already promoted on this chart, restores it first.
   */
  static promoteOverlay(chart: any, overlayId: string): void {
    if (!chart || !overlayId) return;

    // If another overlay is currently promoted, restore it first before querying overlays
    if (chart._promotedOverlayInfo) {
      const currentPromotedId = chart._promotedOverlayInfo.id;
      const matchesTarget =
        currentPromotedId === overlayId ||
        currentPromotedId === `sync_${overlayId}` ||
        (overlayId.startsWith('sync_') && currentPromotedId === overlayId.replace('sync_', ''));

      if (matchesTarget) {
        // Already promoted to this exact target
        return;
      }

      this.restorePromotedOverlay(chart);
    }

    // Query overlays fresh after any restoration
    const overlays = this.getOverlays(chart);
    const targetOverlay = overlays.find((ov: any) =>
      ov.id === overlayId ||
      ov.id === `sync_${overlayId}` ||
      (overlayId.startsWith('sync_') && ov.id === overlayId.replace('sync_', ''))
    );
    if (!targetOverlay) return;

    const actualId = targetOverlay.id;

    // Determine max natural zLevel across all overlays on this chart
    let maxNaturalZ = 0;
    overlays.forEach((ov: any) => {
      const z = typeof ov.zLevel === 'number' ? ov.zLevel : 0;
      if (z > maxNaturalZ) {
        maxNaturalZ = z;
      }
    });

    const naturalZ = typeof targetOverlay.zLevel === 'number' ? targetOverlay.zLevel : 0;
    const temporaryZLevel = maxNaturalZ + 1;

    chart._promotedOverlayInfo = {
      id: actualId,
      originalZLevel: naturalZ,
      temporaryZLevel,
    };

    try {
      chart.overrideOverlay({
        id: actualId,
        zLevel: temporaryZLevel,
      });
      this.invalidatePane(chart);
    } catch (_) {}
  }

  /**
   * Restores a temporarily promoted overlay back to its original natural zLevel.
   * If specific overlayId is provided, restores only if that overlay is currently promoted.
   * If overlayId is omitted, restores whatever overlay is currently promoted.
   */
  static restorePromotedOverlay(chart: any, overlayId?: string): void {
    if (!chart || !chart._promotedOverlayInfo) return;

    if (overlayId) {
      const currentId = chart._promotedOverlayInfo.id;
      const matches =
        currentId === overlayId ||
        currentId === `sync_${overlayId}` ||
        (overlayId.startsWith('sync_') && currentId === overlayId.replace('sync_', ''));
      if (!matches) return;
    }

    const { id, originalZLevel } = chart._promotedOverlayInfo;
    chart._promotedOverlayInfo = null;

    try {
      chart.overrideOverlay({
        id,
        zLevel: originalZLevel,
      });
      this.invalidatePane(chart);
    } catch (_) {}
  }

  /**
   * Returns current promoted overlay info on the given chart instance, if any.
   */
  static getPromotedOverlayInfo(chart: any): { id: string; originalZLevel: number; temporaryZLevel: number } | null {
    return chart?._promotedOverlayInfo || null;
  }
}
