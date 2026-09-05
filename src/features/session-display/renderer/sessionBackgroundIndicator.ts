/**
 * sessionBackgroundIndicator.ts
 *
 * Defines and registers the custom KLineCharts indicator for Session Display backgrounds.
 *
 * CRITICAL ARCHITECTURAL GUARANTEES:
 * 1. Rendering behind candles:
 *    - Uses KLineCharts `registerIndicator` with `zLevel: -1`.
 *    - In KLineCharts IndicatorView (`node_modules/klinecharts/dist/index.esm.js` line 8177):
 *      `if (indicator.zLevel < 0) { ctx.globalCompositeOperation = 'destination-over'; }`
 *    - Since `CandleWidget.updateMain` draws candles *before* `this._indicatorView.draw(ctx)`,
 *      `destination-over` composites the session rectangles strictly BEHIND candle bars and wicks!
 * 2. Complete isolation from drawing tools:
 *    - Indicators are completely separate from overlays (`chart.getOverlays()`).
 *    - ObjectTreePanel, drawingReconciler, eraser tools, and marquee selection do not inspect indicators.
 * 3. Complete suppression of chart legend and tooltips:
 *    - `shortName: ''`
 *    - `createTooltipDataSource: () => ({ name: '', calcParamsText: '', legends: [], features: [] })`
 *    - `styles: { tooltip: { showRule: 'none' } }`
 * 4. Pure engine delegation:
 *    - Delegates all occurrence calculations to `calculateSessionOccurrences`.
 *    - Does NOT duplicate timezone, DST, or latest-session logic.
 * 5. Deterministic geometry:
 *    - Uses `computeSessionPixelBounds` to safely convert UTC timestamps to pixel coordinates
 *      and perform horizontal viewport clipping.
 *    - Fills `bounding.height` (the candle plot area) without covering price/time scales.
 */

import { registerIndicator } from 'klinecharts';
import type { IndicatorTemplate } from 'klinecharts';
import { useSessionDisplayStore } from '../store/useSessionDisplayStore.ts';
import { calculateSessionOccurrences } from '../engine/calculateSessionOccurrences.ts';
import { computeSessionPixelBounds } from './sessionGeometry.ts';

export const SESSION_BACKGROUNDS_INDICATOR_NAME = 'sessionBackgrounds';

let isRegistered = false;

/**
 * Registers the custom sessionBackgrounds indicator template with KLineCharts.
 * Safe to call multiple times (idempotent).
 */
export function registerSessionBackgroundIndicator(): void {
  if (isRegistered) {
    return;
  }

  const template: IndicatorTemplate = {
    name: SESSION_BACKGROUNDS_INDICATOR_NAME,
    shortName: '',
    zLevel: -1, // Triggers ctx.globalCompositeOperation = 'destination-over' behind candles
    shouldOhlc: false,
    shouldFormatBigNumber: false,
    visible: true,

    // Suppress default indicator series & calculations
    calc: () => [],
    figures: [],

    // Suppress all tooltips and legend text in the upper-left chart header
    styles: {
      tooltip: {
        showRule: 'none',
      },
    },
    createTooltipDataSource: () => ({
      name: '',
      calcParamsText: '',
      legends: [],
      features: [],
    }),

    /**
     * Custom indicator draw lifecycle hook.
     * Returning `true` informs KLineCharts that figures are bypassed and custom rendering is complete.
     */
    draw: ({ ctx, chart, bounding, xAxis }) => {
      // 1. Check master settings
      const settings = useSessionDisplayStore.getState().settings;
      if (!settings || !settings.enabled) {
        return true;
      }

      const dataList = chart.getDataList();
      if (!dataList || dataList.length === 0) {
        return true;
      }

      const boundingWidth = bounding.width;
      const boundingHeight = bounding.height;
      if (boundingWidth <= 0 || boundingHeight <= 0) {
        return true;
      }

      // 2. Determine visible viewport time range in UTC milliseconds
      const visibleRange = chart.getVisibleRange();
      const fromIndex = Math.max(0, Math.min(dataList.length - 1, Math.floor(visibleRange.from)));
      const toIndex = Math.max(0, Math.min(dataList.length - 1, Math.ceil(visibleRange.to)));

      const firstVisibleBar = dataList[fromIndex];
      const lastVisibleBar = dataList[toIndex];

      if (!firstVisibleBar || !lastVisibleBar) {
        return true;
      }

      // Add a generous buffer (e.g. 7 days before and after) to ensure sessions
      // crossing viewport edges are fully discovered by the generator
      const BUFFER_MS = 7 * 24 * 60 * 60 * 1000;
      const visibleStart = Math.max(0, firstVisibleBar.timestamp - BUFFER_MS);
      const visibleEnd = lastVisibleBar.timestamp + BUFFER_MS;

      // 3. Obtain current chart / application time
      // Use the latest visible candle bar timestamp, or the last loaded bar if in live mode
      const latestBar = dataList[dataList.length - 1];
      const currentTime = latestBar ? latestBar.timestamp : Date.now();

      // Retrieve application active timezone label attached to chart instance if present
      const chartWithMetadata = chart as unknown as { _appTimezone?: string };
      const appTimezone = chartWithMetadata._appTimezone || undefined;

      // 4. Calculate session occurrences via pure Step 3 engine
      const calculationResult = calculateSessionOccurrences({
        settings,
        visibleStart,
        visibleEnd,
        currentTime,
        appTimezone,
      });

      const { occurrences } = calculationResult;
      if (!occurrences || occurrences.length === 0) {
        return true;
      }

      // 5. Render translucent background rectangles for each occurrence
      // Safe coordinate converter from timestamp to pixel
      const convertTimestampToPixel = (ts: number): number | null => {
        try {
          // In KLineCharts, convertToPixel on xAxis Component or Chart converts timestamp/dataIndex
          if (xAxis && typeof xAxis.convertTimestampToPixel === 'function') {
            return xAxis.convertTimestampToPixel(ts);
          }

          // Fallback via chart.convertToPixel
          const pixelResult = chart.convertToPixel(
            [{ timestamp: ts, value: 0 }],
            { paneId: 'candle_pane' }
          );
          if (Array.isArray(pixelResult) && pixelResult[0] && Number.isFinite(pixelResult[0].x)) {
            return pixelResult[0].x ?? null;
          }
          return null;
        } catch {
          return null;
        }
      };

      for (const occ of occurrences) {
        const bounds = computeSessionPixelBounds(
          occ.startTimestamp,
          occ.endTimestamp,
          convertTimestampToPixel,
          boundingWidth
        );

        if (!bounds) {
          continue;
        }

        ctx.fillStyle = occ.color;
        ctx.fillRect(bounds.leftX, 0, bounds.width, boundingHeight);
      }

      return true; // Bypasses figure generation
    },
  };

  registerIndicator(template);
  isRegistered = true;
}
