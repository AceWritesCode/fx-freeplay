/**
 * useSessionBackgroundRenderer.ts
 *
 * Manages the attachment, lifecycle, and repaint synchronization of the
 * `sessionBackgrounds` indicator across active chart instances.
 *
 * Responsibilities:
 * - Subscribes to `useSessionDisplayStore` changes (master switch, sessions, colors, timezone, scope).
 * - Requests lightweight indicator repaints without resetting chart data or scrolling.
 * - Ensures zero duplication of indicators or event listeners.
 */

import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useSessionDisplayStore } from '../store/useSessionDisplayStore.ts';
import type { SessionDisplaySettings } from '../types.ts';

interface ChartInstanceWithCustomProps {
  _appTimezone?: string;
  updatePane?: (level: number, paneId?: string) => void;
  _chartStore?: {
    getPaneStore?: () => {
      getPanes?: () => Array<{
        getId?: () => string;
        getWidget?: () => {
          invalidate?: () => void;
        };
      }>;
    };
  };
}

interface UseSessionBackgroundRendererProps {
  chartInstancesRef: MutableRefObject<(ChartInstanceWithCustomProps | null)[]>;
  appTimezone?: string;
}

/**
 * Triggers a lightweight repaint pass for the session backgrounds indicator
 * on the given chart instance without altering viewports, data lists, or overlays.
 */
export function invalidateSessionBackgrounds(chart: ChartInstanceWithCustomProps | null): void {
  if (!chart) return;
  try {
    // 1. Invalidate candle_pane main canvas (level 0: UpdateLevel.Main)
    if (typeof chart.updatePane === 'function') {
      chart.updatePane(0, 'candle_pane');
    }

    // 2. Direct widget invalidation on the canvas pane if available
    if (chart._chartStore && typeof chart._chartStore.getPaneStore === 'function') {
      const panes = chart._chartStore.getPaneStore()?.getPanes?.();
      if (Array.isArray(panes)) {
        panes.forEach((pane) => {
          if (pane.getId?.() === 'candle_pane' && typeof pane.getWidget === 'function') {
            pane.getWidget()?.invalidate?.();
          }
        });
      }
    }
  } catch {
    // Non-blocking fallback
  }
}

/**
 * React hook to synchronize Session Display store changes with chart instances.
 */
export function useSessionBackgroundRenderer({
  chartInstancesRef,
  appTimezone,
}: UseSessionBackgroundRendererProps): void {
  const prevSettingsRef = useRef<SessionDisplaySettings | null>(null);

  // Keep chart._appTimezone synced whenever appTimezone changes
  useEffect(() => {
    chartInstancesRef.current.forEach((chart) => {
      if (chart) {
        chart._appTimezone = appTimezone;
      }
    });
  }, [appTimezone, chartInstancesRef]);

  // Subscribe to useSessionDisplayStore changes
  useEffect(() => {
    const unsubscribe = useSessionDisplayStore.subscribe((state) => {
      const nextSettings = state.settings;
      if (prevSettingsRef.current === nextSettings) {
        return;
      }
      prevSettingsRef.current = nextSettings;

      // Invalidate each active chart instance to trigger an immediate canvas redraw
      chartInstancesRef.current.forEach((chart) => {
        if (chart) {
          invalidateSessionBackgrounds(chart);
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [chartInstancesRef]);
}
