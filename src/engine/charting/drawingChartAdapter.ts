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

import { getInteractiveOverlayOptions } from '@/utils/overlays';

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
  static invalidatePane(chart: any, _paneId: string = 'candle_pane'): void {
    if (!chart) return;
    try {
      // 1. Invalidate all KLineCharts canvas pane widgets directly
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

      // 2. Trigger KLineCharts layout redraw pass by setting current offset distance
      if (typeof chart.getOffsetRightDistance === 'function' && typeof chart.setOffsetRightDistance === 'function') {
        chart.setOffsetRightDistance(chart.getOffsetRightDistance());
      } else if (typeof chart.resize === 'function') {
        chart.resize();
      }
    } catch (_) {}
  }
}
