/**
 * ActiveSessionBanners.tsx
 *
 * Renders native top-right status banners displaying currently active sessions
 * and candle-based countdowns to session close.
 *
 * CRITICAL ARCHITECTURAL RULES:
 * 1. Derives remaining time strictly from the authoritative chart candle timestamp:
 *    dataList[dataList.length - 1]?.timestamp.
 * 2. Absolutely NO Date.now(), system wall-clock, or artificial interval timers.
 * 3. Positioned in the top-right corner of each chart slot.
 * 4. Stacks multiple active sessions cleanly and deterministically.
 */

import React, { useCallback, useSyncExternalStore } from 'react';
import { useSessionDisplayStore } from '../store/useSessionDisplayStore.ts';
import { useReplayStore } from '@/store';
import { calculateSessionOccurrences } from '../engine/calculateSessionOccurrences.ts';
import { getActiveSessions, getOpaqueColor } from '../engine/activeSessionDerivation.ts';

interface ChartInstanceWithData {
  getDataList?: () => Array<{ timestamp: number }> | undefined;
  subscribeAction?: (action: string, callback: () => void) => void;
  unsubscribeAction?: (action: string, callback: () => void) => void;
  _appTimezone?: string;
}

interface ActiveSessionBannersProps {
  chartInstancesRef: React.MutableRefObject<(unknown | null)[]>;
  slotIndex: number;
  slotInfo?: { symbol: string | null; timeframe: string };
}

export const ActiveSessionBanners: React.FC<ActiveSessionBannersProps> = ({
  chartInstancesRef,
  slotIndex,
}) => {
  const settings = useSessionDisplayStore((state) => state.settings);
  const replayCurrentTimestamp = useReplayStore((state) => state.replayCurrentTimestamp);
  const isReplayActive = useReplayStore((state) => state.isReplayActive);

  // Subscribe to chart instance events via useSyncExternalStore
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const chart = chartInstancesRef.current[slotIndex] as ChartInstanceWithData | null;
      if (!chart || typeof chart.subscribeAction !== 'function') {
        return () => {};
      }

      try {
        chart.subscribeAction('onVisibleRangeChange', onStoreChange);
        chart.subscribeAction('onScroll', onStoreChange);
      } catch {
        // Ignored for non-standard/mock charts
      }

      return () => {
        try {
          chart.unsubscribeAction?.('onVisibleRangeChange', onStoreChange);
          chart.unsubscribeAction?.('onScroll', onStoreChange);
        } catch {
          // Ignored
        }
      };
    },
    [chartInstancesRef, slotIndex]
  );

  // Snapshot string "currentCandleTime|appTimezone" - compared by value to prevent tearing/infinite loops
  const getSnapshot = useCallback((): string => {
    const chart = chartInstancesRef.current[slotIndex] as ChartInstanceWithData | null;
    if (!chart || typeof chart.getDataList !== 'function') {
      return '';
    }
    const dataList = chart.getDataList();
    if (!Array.isArray(dataList) || dataList.length === 0) {
      return '';
    }

    let currentCandleTime = dataList[dataList.length - 1]?.timestamp ?? null;
    if (isReplayActive && replayCurrentTimestamp !== null) {
      currentCandleTime = replayCurrentTimestamp;
    }

    if (!currentCandleTime || !Number.isFinite(currentCandleTime)) {
      return '';
    }

    return `${currentCandleTime}|${chart._appTimezone || ''}`;
  }, [chartInstancesRef, slotIndex, isReplayActive, replayCurrentTimestamp]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => '');

  if (!settings || !settings.enabled || !snapshot) {
    return null;
  }

  const separatorIndex = snapshot.indexOf('|');
  const currentCandleTime = Number(snapshot.slice(0, separatorIndex));
  const appTimezone = snapshot.slice(separatorIndex + 1) || undefined;

  if (!Number.isFinite(currentCandleTime)) {
    return null;
  }

  const BUFFER_MS = 7 * 24 * 60 * 60 * 1000;
  const visibleStart = Math.max(0, currentCandleTime - BUFFER_MS);
  const visibleEnd = currentCandleTime + BUFFER_MS;

  const { occurrences } = calculateSessionOccurrences({
    settings,
    visibleStart,
    visibleEnd,
    currentTime: currentCandleTime,
    appTimezone,
  });

  const activeSessions = getActiveSessions(occurrences, currentCandleTime);
  if (activeSessions.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="active-session-banners"
      className="absolute top-2 right-3 z-20 flex flex-col gap-1 items-end pointer-events-none select-none"
    >
      {activeSessions.map(({ occurrence, formattedRemaining }) => {
        const opaqueColor = getOpaqueColor(occurrence.color);
        return (
          <div
            key={occurrence.id}
            data-session-id={occurrence.sessionId}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-elevated/85 backdrop-blur-sm border border-border-sub text-[10px] font-bold text-txt-primary shadow-sm"
          >
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0 shadow-xs"
              style={{ backgroundColor: opaqueColor }}
            />
            <span className="uppercase tracking-wide">{occurrence.sessionName}</span>
            <span className="text-txt-muted ml-1 font-mono tracking-tight">
              {formattedRemaining}
            </span>
          </div>
        );
      })}
    </div>
  );
};
