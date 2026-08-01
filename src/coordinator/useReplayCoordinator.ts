import { useState, useEffect, useRef } from 'react';
import { useReplayStore, useLayoutStore } from '@/store';
import { replayEngine, findCandleIndexByTimestamp } from '@/engine/replay';
import type { ReplaySession } from '@/engine/replay';
import { getTrueOffsetRightDistance } from '@/engine/charting';

export function useReplayCoordinator(
  chartInstancesRef: React.MutableRefObject<(any | null)[]>,
  _chartContainersRef: React.MutableRefObject<(HTMLDivElement | null)[]>,
  allTimeframesData: Record<string, any[]>,
  activeTimeframe: string,
  _pendingCutAnimation: React.MutableRefObject<any>,
  capturedOffsetRef: React.MutableRefObject<number | null>,
  wasManualScaleRef: React.MutableRefObject<boolean>,
  capturedYAxisRangeRef: React.MutableRefObject<any>
) {
  // Store Hooks
  const {
    isReplayActive,
    replayCurrentTimestamp,
    replaySpeed,
    isReplayPlaying,
    setIsReplayActive,
    setReplayCurrentTimestamp,
    setIsReplayPlaying,
    resetReplay,
  } = useReplayStore();

  const {
    activeChartIndex,
    slots,
  } = useLayoutStore();

  // Local state for cut point selection
  const [isSelectingCutPoint, setIsSelectingCutPoint] = useState<boolean>(false);
  const [cutPointHoverX, setCutPointHoverX] = useState<number | null>(null);

  // References to track the active session and its event subscriptions
  const sessionRef = useRef<ReplaySession | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const handleReplayStepForward = () => {
    const session = sessionRef.current || replayEngine.getActiveSession();
    if (!session || !isReplayActive) {
      console.warn('[DEBUG] handleReplayStepForward - Replay session is not active.');
      return;
    }

    const state = session.stepForward();
    if (state.status === 'COMPLETED') {
      setIsReplayPlaying(false);
    }
  };

  const handleReplayStepBackward = () => {
    const session = sessionRef.current || replayEngine.getActiveSession();
    if (!session || !isReplayActive) {
      console.warn('[DEBUG] handleReplayStepBackward - Replay session is not active.');
      return;
    }

    session.stepBackward();
  };

  const exitReplayMode = () => {
    console.log('[DEBUG] exitReplayMode - Exiting Replay Mode. Restoring full dataset.');

    const chart = chartInstancesRef.current[activeChartIndex];
    const currentOffset = chart ? getTrueOffsetRightDistance(chart) : null;
    capturedOffsetRef.current = currentOffset;

    let wasManual = false;
    let range = null;
    if (chart) {
      const pane = chart.getDrawPaneById?.('candle_pane');
      const yAxis = pane?.getYAxisComponents?.()?.[0];
      if (yAxis) {
        wasManual = !yAxis.getAutoCalcTickFlag();
        if (wasManual) {
          const r = yAxis.getRange();
          if (r && !isNaN(r.from) && !isNaN(r.to) && r.from < r.to) {
            range = r;
          } else {
            wasManual = false;
          }
        }
      }
    }
    wasManualScaleRef.current = wasManual;
    capturedYAxisRangeRef.current = range;

    const fullData = allTimeframesData[activeTimeframe] || [];
    const slicedIndex = (replayCurrentTimestamp !== null && fullData)
      ? findCandleIndexByTimestamp(fullData, replayCurrentTimestamp)
      : -1;

    // Unsubscribe and destroy active session
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    replayEngine.destroySession();
    sessionRef.current = null;

    resetReplay();
    setIsSelectingCutPoint(false);

    // Restore full data to chart
    if (chart) {
      chart.setDataLoader({
        getBars: ({ type: loadType, callback }: any) => {
          if (loadType === 'init') {
            console.log(`[DEBUG] exitReplayMode dataLoader - Ingesting full dataset (${fullData.length} bars)`);
            callback(fullData);
          } else {
            callback([]);
          }
        },
      });
      chart.resetData();

      if (slicedIndex !== -1) {
        console.log(`[DEBUG] exitReplayMode - Snapping to sliced index ${slicedIndex}/${fullData.length - 1} at offset ${currentOffset}`);
        chart.scrollToDataIndex(slicedIndex);

        let offsetBars = 0;
        if (currentOffset !== null && currentOffset !== 0) {
          const barSpaceVal = chart.getBarSpace();
          let space = 6;
          if (barSpaceVal) {
            if (typeof barSpaceVal === 'number') {
              space = barSpaceVal;
            } else if (typeof barSpaceVal === 'object') {
              space = barSpaceVal.bar || 6;
            }
          }
          offsetBars = Math.round(currentOffset / space);
        }
        const targetIndex = fullData.length - 1 + offsetBars;

        setTimeout(() => {
          const activeChart = chartInstancesRef.current[activeChartIndex];
          if (activeChart) {
            console.log(`[DEBUG] exitReplayMode - Animating scroll to target index ${targetIndex} (last index ${fullData.length - 1} + ${offsetBars} offset bars) over 700ms`);
            activeChart.scrollToDataIndex(targetIndex, 700);

            if (wasManualScaleRef.current && capturedYAxisRangeRef.current) {
              const p = activeChart.getDrawPaneById?.('candle_pane');
              const ya = p?.getYAxisComponents?.()?.[0];
              if (ya) {
                ya.setRange(capturedYAxisRangeRef.current.from, capturedYAxisRangeRef.current.to);
              }
            }
          }
        }, 50);
      }
    }
  };

  const handleSelectCutPoint = (timestamp: number) => {
    console.log(`[DEBUG] selectCutPoint - Initializing replay session from: ${new Date(timestamp).toLocaleString()}`);
    setIsSelectingCutPoint(false);
    setCutPointHoverX(null);

    const fullData = allTimeframesData[activeTimeframe] || [];
    const startIndex = findCandleIndexByTimestamp(fullData, timestamp);
    if (startIndex === -1) {
      console.warn('[DEBUG] handleSelectCutPoint - Start index not found for timestamp:', timestamp);
      return;
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    try {
      const session = replayEngine.createSession({
        symbol: slots[activeChartIndex]?.symbol || 'INGEST',
        historicalData: fullData,
        startIndex: startIndex,
      });

      sessionRef.current = session;
      session.setStatus('PAUSED');

      const unsub = session.subscribe((state) => {
        setReplayCurrentTimestamp(state.currentTimestamp);
        if (state.status === 'COMPLETED') {
          setIsReplayPlaying(false);
        }
      });
      unsubscribeRef.current = unsub;

      setIsReplayActive(true);
      setIsReplayPlaying(false);
    } catch (err) {
      console.error('[ReplayCoordinator] Failed to create replay session:', err);
      setIsReplayActive(false);
      setIsReplayPlaying(false);
    }
  };

  // Manage Autoplay Replay Timer Loop (Interval scheduling is now owned by Coordinator)
  useEffect(() => {
    let intervalId: any = null;
    if (isReplayActive && isReplayPlaying && replayCurrentTimestamp !== null) {
      console.log(`[DEBUG] autoplay loop - Starting Interval timer. Interval: ${replaySpeed}s.`);
      intervalId = setInterval(() => {
        const session = sessionRef.current || replayEngine.getActiveSession();
        if (session) {
          const state = session.stepForward();
          if (state.status === 'COMPLETED') {
            setIsReplayPlaying(false);
          }
        }
      }, replaySpeed * 1000);
    }
    return () => {
      if (intervalId) {
        console.log('[DEBUG] autoplay loop - Clearing Interval timer.');
        clearInterval(intervalId);
      }
    };
  }, [isReplayActive, isReplayPlaying, replayCurrentTimestamp, replaySpeed]);

  // Clean up session subscriptions on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      replayEngine.destroySession();
    };
  }, []);

  // Synchronize slots data slices when replay timestamp changes
  useEffect(() => {
    if (!isReplayActive || replayCurrentTimestamp === null) return;

    slots.forEach((slot, index) => {
      const chart = chartInstancesRef.current[index];
      if (!chart || !slot.symbol) return;

      const tf = slot.timeframe;
      const fullData = allTimeframesData[tf] || [];
      const visibleData = fullData.filter((d) => d.timestamp <= replayCurrentTimestamp);

      chart.setDataLoader({
        getBars: ({ type: loadType, callback }: any) => {
          if (loadType === 'init') {
            callback(visibleData);
          } else {
            callback([]);
          }
        },
      });
      chart.resetData();
    });
  }, [replayCurrentTimestamp, isReplayActive, slots, allTimeframesData]);

  return {
    isSelectingCutPoint,
    setIsSelectingCutPoint,
    cutPointHoverX,
    setCutPointHoverX,
    handleReplayStepForward,
    handleReplayStepBackward,
    exitReplayMode,
    handleSelectCutPoint,
  };
}
