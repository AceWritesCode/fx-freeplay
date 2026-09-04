import type { CaptureTarget, CanvasTargetInfo } from '../types';

export interface TargetResolutionResult {
  target: CaptureTarget;
  boundingRects: DOMRect[];
  badgeLabel: string;
  badgePosition: { top: number; left: number };
}

/**
 * Queries all visible chart slot containers in the DOM.
 */
export function getVisibleChartSlots(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-chart-slot-index]'));
}

/**
 * Returns true if the application is currently displaying only a single chart.
 */
export function isSingleChartMode(): boolean {
  return getVisibleChartSlots().length <= 1;
}

/**
 * Retrieves the canvas target info for the first/only chart slot in single-chart mode.
 */
export function getSingleChartTarget(): CanvasTargetInfo {
  const slots = getVisibleChartSlots();
  const firstSlot = slots[0];
  if (!firstSlot) {
    return { slotIndex: 0, symbol: null, timeframe: undefined };
  }
  const slotIndexAttr = firstSlot.getAttribute('data-chart-slot-index');
  const slotIndex = slotIndexAttr ? parseInt(slotIndexAttr, 10) : 0;
  const symbol = firstSlot.getAttribute('data-chart-symbol') || null;
  const timeframe = firstSlot.getAttribute('data-chart-timeframe') || undefined;
  return { slotIndex, symbol, timeframe };
}

/**
 * Pure DOM target resolution helper.
 * Resolves the capture target and its screen bounding boxes based on cursor coordinates.
 *
 * Rules:
 * 1. Pointer over a specific chart slot ([data-chart-slot-index]):
 *    -> Target: 'canvas'
 *    -> Highlight: single chart slot rect
 *    -> Label: "Chart X • SYMBOL • TIMEFRAME"
 *
 * 2. Pointer outside any chart slot (Header, sidebar, toolbar, gutter, empty space):
 *    -> Target: 'workspace'
 *    -> Highlight: all visible chart slots
 *    -> Label: "Entire Workspace"
 */
export function resolveTargetAtPoint(
  clientX: number,
  clientY: number
): TargetResolutionResult | null {
  // Query all mounted chart slot containers in the DOM
  const slotElements = getVisibleChartSlots();

  if (slotElements.length === 0) {
    return null;
  }

  // Check if cursor point intersects a chart slot element
  const elementAtPoint = document.elementFromPoint(clientX, clientY);
  const hoveredSlot = elementAtPoint?.closest<HTMLElement>('[data-chart-slot-index]');

  if (hoveredSlot) {
    const slotIndexAttr = hoveredSlot.getAttribute('data-chart-slot-index');
    const slotIndex = slotIndexAttr ? parseInt(slotIndexAttr, 10) : 0;
    const symbol = hoveredSlot.getAttribute('data-chart-symbol') || undefined;
    const timeframe = hoveredSlot.getAttribute('data-chart-timeframe') || undefined;
    const rect = hoveredSlot.getBoundingClientRect();

    const canvasInfo: CanvasTargetInfo = {
      slotIndex,
      symbol: symbol || null,
      timeframe,
    };

    const labelSegments: string[] = [`Chart ${slotIndex + 1}`];
    if (symbol) labelSegments.push(symbol);
    if (timeframe) labelSegments.push(timeframe.toUpperCase());

    return {
      target: {
        type: 'canvas',
        canvas: canvasInfo,
      },
      boundingRects: [rect],
      badgeLabel: labelSegments.join(' • '),
      badgePosition: {
        top: Math.max(16, rect.top + 16),
        left: Math.max(16, rect.left + 16),
      },
    };
  }

  // Cursor is outside all chart slots: highlight entire workspace
  const allSlotRects = slotElements.map((el) => el.getBoundingClientRect());
  const firstRect = allSlotRects[0];

  return {
    target: {
      type: 'workspace',
    },
    boundingRects: allSlotRects,
    badgeLabel: `Entire Workspace (${slotElements.length} ${slotElements.length === 1 ? 'Chart' : 'Charts'})`,
    badgePosition: firstRect
      ? { top: Math.max(16, firstRect.top + 16), left: Math.max(16, firstRect.left + 16) }
      : { top: 60, left: 60 },
  };
}
