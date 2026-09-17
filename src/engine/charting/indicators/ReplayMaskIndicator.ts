/**
 * ReplayMaskIndicator.ts
 *
 * Custom KLineCharts indicator for rendering the Bar Replay mask.
 * Obscures future candles after the replay boundary timestamp.
 */

import { registerIndicator } from 'klinecharts';
import type { IndicatorTemplate } from 'klinecharts';
import { replayVisibilityBoundary } from '@/engine/replay/ReplayVisibilityBoundary';
import { useSettingsStore } from '@/store';
import { getThemeChartBackground } from '@/config';

export const REPLAY_MASK_INDICATOR_NAME = 'replayMask';

let isRegistered = false;

export function registerReplayMaskIndicator(): void {
  if (isRegistered) {
    return;
  }

  const template: IndicatorTemplate = {
    name: REPLAY_MASK_INDICATOR_NAME,
    shortName: '',
    zLevel: 1, // Renders ON TOP of candle bars and wicks
    shouldOhlc: false,
    shouldFormatBigNumber: false,
    visible: true,

    calc: () => [],
    figures: [],
    shouldUpdate: () => ({ calc: false, draw: true }),

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

    draw: ({ ctx, chart, bounding, xAxis }) => {
      if (!replayVisibilityBoundary.isActive()) {
        return true;
      }

      const ts = replayVisibilityBoundary.getCurrentTimestamp();
      if (!ts) {
        return true;
      }

      const boundingWidth = bounding.width;
      const boundingHeight = bounding.height;
      if (boundingWidth <= 0 || boundingHeight <= 0) {
        return true;
      }

      let maskX: number | null | undefined = null;


      if (xAxis && typeof xAxis.convertTimestampToPixel === 'function') {
        maskX = xAxis.convertTimestampToPixel(ts);
      }

      if (maskX === null || maskX === undefined || isNaN(maskX)) {
        try {
          const pixelResult = chart.convertToPixel(
            [{ timestamp: ts, value: 0 }],
            { paneId: 'candle_pane' }
          );
          if (Array.isArray(pixelResult) && pixelResult[0] && Number.isFinite(pixelResult[0].x)) {
            maskX = pixelResult[0].x;
          }
        } catch {
          maskX = null;
        }
      }

      if (maskX === null || maskX === undefined || isNaN(maskX)) {
        return true;
      }

      const barSpaceVal = typeof chart.getBarSpace === 'function' ? chart.getBarSpace() : 6;
      let barWidth = 6;
      if (typeof barSpaceVal === 'number') {
        barWidth = barSpaceVal;
      } else if (typeof barSpaceVal === 'object' && barSpaceVal) {
        barWidth = (barSpaceVal as any).bar || 6;
      }

      const maskStartX = maskX + (barWidth / 2) + 1;
      const maskWidth = Math.max(0, boundingWidth - maskStartX);

      if (maskWidth <= 0) {
        return true;
      }

      // Dynamic theme background color resolution
      const settingsStore = useSettingsStore.getState();
      const settings = settingsStore.settings;
      const themeMode = settingsStore.themeMode;
      const customTheme = settingsStore.customTheme;

      const maskColor =
        settings?.background ||
        (typeof getThemeChartBackground === 'function'
          ? getThemeChartBackground(themeMode, customTheme)
          : '#121418');

      ctx.fillStyle = maskColor;
      ctx.fillRect(maskStartX, 0, maskWidth, boundingHeight);

      return true;
    },
  };

  registerIndicator(template);
  isRegistered = true;
}
