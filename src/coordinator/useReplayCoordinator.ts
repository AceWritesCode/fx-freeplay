import { useState, useEffect, useRef } from 'react';
import { useReplayStore, useLayoutStore } from '@/store';
import type { SlotConfig } from '@/store/types';
import { replayEngine, findCandleIndexByTimestamp, replayVisibilityBoundary } from '@/engine/replay';
import { REPLAY_MASK_INDICATOR_NAME } from '@/engine/charting/indicators/ReplayMaskIndicator';

import type { ReplaySession } from '@/engine/replay';
import { getTrueOffsetRightDistance } from '@/engine/charting';
import { applyAxisRange } from '@/engine/workspace';


export function useReplayCoordinator(
  chartInstancesRef: React.MutableRefObject<(any | null)[]>,
  chartContainersRef: React.MutableRefObject<(HTMLDivElement | null)[]>,
  allTimeframesData: Record<string, any[]>,
  activeTimeframe: string,
  pendingCutAnimation: React.MutableRefObject<any>,
  capturedOffsetRef: React.MutableRefObject<number | null>,
  wasManualScaleRef: React.MutableRefObject<boolean>,
  capturedYAxisRangeRef: React.MutableRefObject<any>,
  loadDataForSlot: (index: number, chart: any, options?: { preserveOffset?: boolean; customOffset?: number | null }) => Promise<void>,
  settings?: any,
  isSwitchingTimeframeRef?: React.MutableRefObject<boolean>
) {
  // Store Hooks
  const {
    isReplayActive,
    replayCurrentTimestamp,
    replaySpeed,
    isReplayPlaying,
    isAutoShiftEnabled,
    setIsReplayActive,
    setReplayCurrentTimestamp,
    setIsReplayPlaying,
    setBookmarks,
    setIsAutoShiftEnabled,
    resetReplay,
  } = useReplayStore();

  const {
    activeChartIndex,
    slots,
  } = useLayoutStore();

  // Local state for cut point selection
  const [isSelectingCutPoint, setIsSelectingCutPoint] = useState<boolean>(false);
  const [cutPointHoverX, setCutPointHoverX] = useState<number | null>(null);

  // Active replay session ref
  const sessionRef = useRef<ReplaySession | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Keep track of timestamps/offsets to manage animations and data slicing accurately
  const lastSyncedReplayTimestampRef = useRef<number | null>(null);
  const lastSyncedSlotsRef = useRef<SlotConfig[] | null>(null);
  const lastReplayActiveRef = useRef<boolean>(false);
  const loadDataForSlotRef = useRef(loadDataForSlot);
  loadDataForSlotRef.current = loadDataForSlot;

  // Ref for active exit animation frame
  const exitAnimationIdRef = useRef<number | null>(null);

  const handleReplayStepForward = () => {
    const session = sessionRef.current || replayEngine.getActiveSession();
    if (!session || !isReplayActive) {
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
      return;
    }

    session.stepBackward();
  };

  const exitReplayMode = () => {
    if (exitAnimationIdRef.current) {
      cancelAnimationFrame(exitAnimationIdRef.current);
      exitAnimationIdRef.current = null;
    }

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

    const session = sessionRef.current || replayEngine.getActiveSession();
    const currentTs = session?.getState().currentTimestamp ?? replayCurrentTimestamp;
    const fullData = allTimeframesData[activeTimeframe] || [];
    const slicedIndex = (currentTs !== null && fullData.length > 0)
      ? findCandleIndexByTimestamp(fullData, currentTs)
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

    // Reset visibility boundary and trigger canvas repaint for all chart slots
    replayVisibilityBoundary.reset();
    slots.forEach((_, idx) => {
      const c = chartInstancesRef.current[idx];
      if (c) {
        if (typeof c.setLeftMinVisibleBarCount === 'function') {
          c.setLeftMinVisibleBarCount(2);
        }
        if (typeof c.setMaxOffsetLeftDistance === 'function') {
          c.setMaxOffsetLeftDistance(10000);
        }
        if (typeof c.setMaxOffsetRightDistance === 'function') {
          c.setMaxOffsetRightDistance(10000);
        }
        if (typeof c.overrideIndicator === 'function') {
          c.overrideIndicator({ name: REPLAY_MASK_INDICATOR_NAME });
        }
        if (typeof c.updatePane === 'function') {
          c.updatePane(3, 'candle_pane');
        }
        c.resize();
      }
    });


    const resetRatio = settings?.resetViewOffsetRatio ?? 0.5;

    // Adjust scroll positions for other slots in multi-chart layout without reloading/resetting data
    slots.forEach((slot, idx) => {
      if (idx === activeChartIndex) return;
      const otherChart = chartInstancesRef.current[idx];
      if (!otherChart || !slot?.symbol) return;
      const otherFull = allTimeframesData[slot.timeframe] || [];

      if (otherFull.length > 0) {
        (otherChart as any)._isProgrammaticScroll = true;
        const otherWidth = otherChart.getSize()?.width || 800;
        const otherTargetOffset = otherWidth * resetRatio;
        otherChart.setOffsetRightDistance(otherTargetOffset);
        requestAnimationFrame(() => {
          otherChart.setOffsetRightDistance(otherTargetOffset);
          (otherChart as any)._isProgrammaticScroll = false;
        });
      }
    });

    if (!chart || fullData.length === 0) {
      return;
    }

    if (slicedIndex === -1) {
      // Replay had no sliced index (e.g. exited before cutting) - keep current view intact
      return;
    }

    // Geometry & bar calculation
    const lastIndex = fullData.length - 1;
    const remainingCandles = Math.max(0, lastIndex - slicedIndex);
    const chartSize = chart.getSize();
    const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
    const barSpaceVal = chart.getBarSpace();
    let space = 6;
    if (typeof barSpaceVal === 'number') space = barSpaceVal;
    else if (typeof barSpaceVal === 'object' && barSpaceVal) space = barSpaceVal.bar || 6;

    const targetOffset = chartWidth * resetRatio;
    const currentCandleOffset = currentOffset !== null ? currentOffset : targetOffset;

    // Restore manual Y-axis scale so candle heights don't jump
    if (wasManualScaleRef.current && capturedYAxisRangeRef.current) {
      const p = chart.getDrawPaneById?.('candle_pane');
      const ya = p?.getYAxisComponents?.()?.[0];
      if (ya) {
        applyAxisRange(ya, capturedYAxisRangeRef.current.from, capturedYAxisRangeRef.current.to);
        ya.setAutoCalcTickFlag?.(false);
      }
    }


    // startOffset positions candle slicedIndex at its exact current on-screen pixel (zero visual jump)
    const startOffset = currentCandleOffset - (remainingCandles * space);
    const endOffset = targetOffset;
    const distance = Math.abs(endOffset - startOffset);

    // Lock position immediately at startOffset so slicedIndex starts without any visual jump
    chart.setOffsetRightDistance(startOffset);

    // If already at or very close to reset view point, lock immediately without unnecessary slide
    if (distance < 5 || remainingCandles === 0) {
      chart.setOffsetRightDistance(endOffset);
      requestAnimationFrame(() => {
        chart.setOffsetRightDistance(endOffset);
        (chart as any)._isProgrammaticScroll = false;
      });
      return;
    }

    // Dynamic duration scaled from 200ms (few remaining candles) to 550ms (hundreds of candles)
    const duration = Math.min(550, Math.max(200, Math.round(200 + (distance / chartWidth) * 350)));
    const startTime = performance.now();

    const animate = (now: number) => {
      const activeChart = chartInstancesRef.current[activeChartIndex];
      if (!activeChart) return;

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startOffset + (endOffset - startOffset) * eased;

      activeChart.setOffsetRightDistance(current);

      if (progress < 1) {
        exitAnimationIdRef.current = requestAnimationFrame(animate);
      } else {
        activeChart.setOffsetRightDistance(endOffset);
        exitAnimationIdRef.current = null;
        (activeChart as any)._isProgrammaticScroll = false;

        if (wasManualScaleRef.current && capturedYAxisRangeRef.current) {
          const p = activeChart.getDrawPaneById?.('candle_pane');
          const ya = p?.getYAxisComponents?.()?.[0];
          if (ya) {
            applyAxisRange(ya, capturedYAxisRangeRef.current.from, capturedYAxisRangeRef.current.to);
            ya.setAutoCalcTickFlag?.(false);
          }
        }
      }
    };

    exitAnimationIdRef.current = requestAnimationFrame(animate);
  };

  const handleSelectCutPoint = (timestamp: number, clickX?: number) => {
    setIsSelectingCutPoint(false);
    setCutPointHoverX(null);

    const fullData = allTimeframesData[activeTimeframe] || [];
    const startIndex = findCandleIndexByTimestamp(fullData, timestamp);
    if (startIndex === -1) {
      return;
    }

    // Store the pending cut animation so the data sync effect can slide the chart in
    if (clickX !== undefined) {
      const chart = chartInstancesRef.current[activeChartIndex];
      const chartSize = chart ? chart.getSize() : null;
      const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
      pendingCutAnimation.current = {
        timestamp,
        clickX,
        savedOffset: chartWidth / 2,
      };
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
        setBookmarks(state.bookmarks);
        if (state.status === 'COMPLETED') {
          setIsReplayPlaying(false);
        }
      });
      unsubscribeRef.current = unsub;

      setIsReplayActive(true);
      setIsReplayPlaying(false);

      // Initialize visibility boundary, scroll boundary, and position viewport to cut point
      replayVisibilityBoundary.setReplayState(true, timestamp);
      slots.forEach((slot, idx) => {
        const c = chartInstancesRef.current[idx];
        if (!c || !slot?.symbol) return;

        const slotFullData = (allTimeframesData[slot.timeframe]?.length > 0)
          ? allTimeframesData[slot.timeframe]
          : ((c.getDataList?.() || []) as any[]);

        if (slotFullData.length > 0) {
          const lastRevealed = findCandleIndexByTimestamp(slotFullData, timestamp);
          if (lastRevealed !== -1) {
            const N = slotFullData.length;
            const K = lastRevealed;
            const H = Math.max(0, N - 1 - K);
            if (typeof c.setLeftMinVisibleBarCount === 'function') {
              c.setLeftMinVisibleBarCount(H + 1);
            }

            const chartSize = c.getSize();
            const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
            const resetRatio = settings?.resetViewOffsetRatio ?? 0.5;
            const targetOffset = chartWidth * resetRatio;

            const barSpaceVal = c.getBarSpace();
            let space = 6;
            if (typeof barSpaceVal === 'number') space = barSpaceVal;
            else if (typeof barSpaceVal === 'object' && barSpaceVal) space = (barSpaceVal as any).bar || 6;

            const hiddenWidth = H * space;
            const effectiveOffset = targetOffset - hiddenWidth;

            (c as any)._isProgrammaticScroll = true;
            c.setOffsetRightDistance(effectiveOffset);
            requestAnimationFrame(() => {
              c.setOffsetRightDistance(effectiveOffset);
              (c as any)._isProgrammaticScroll = false;
            });
          }
        }

        if (typeof c.overrideIndicator === 'function') {
          c.overrideIndicator({ name: REPLAY_MASK_INDICATOR_NAME });
        }
        if (typeof c.updatePane === 'function') {
          c.updatePane(3, 'candle_pane');
        }
        c.resize();
      });

    } catch (err) {
      console.error('[ReplayCoordinator] Failed to create replay session:', err);
      setIsReplayActive(false);
      setIsReplayPlaying(false);
    }
  };

  const handleAddBookmark = (label: string, note?: string, isCheckpoint = false) => {
    const session = sessionRef.current || replayEngine.getActiveSession();
    if (session) {
      const state = session.getState();
      session.getTimeline().addBookmark(state.currentIndex, label, note, isCheckpoint);
      // Timeline addBookmark updates timeline state, which notifies subscribers and updates Zustand
    }
  };

  const handleRemoveBookmark = (id: string) => {
    const session = sessionRef.current || replayEngine.getActiveSession();
    if (session) {
      session.getTimeline().removeBookmark(id);
    }
  };

  const handleUpdateBookmark = (id: string, updates: { label?: string; note?: string }) => {
    const session = sessionRef.current || replayEngine.getActiveSession();
    if (session) {
      session.getTimeline().updateBookmark(id, updates);
    }
  };

  const handleJumpToBookmark = (id: string) => {
    const session = sessionRef.current || replayEngine.getActiveSession();
    if (session) {
      const bookmark = session.getState().bookmarks.find((b) => b.id === id);
      if (bookmark) {
        session.jumpTo(bookmark.index);
      }
    }
  };

  // Manage Autoplay Replay Timer Loop (Interval scheduling is now owned by Coordinator)
  useEffect(() => {
    let intervalId: any = null;
    if (isReplayActive && isReplayPlaying) {
      intervalId = setInterval(() => {
        if (isSwitchingTimeframeRef?.current) {
          return;
        }
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
        clearInterval(intervalId);
      }
    };
  }, [isReplayActive, isReplayPlaying, replaySpeed, activeTimeframe]);

  // Clean up session subscriptions and animation on unmount
  useEffect(() => {
    return () => {
      if (exitAnimationIdRef.current) {
        cancelAnimationFrame(exitAnimationIdRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // ─── Replay State Synchronization Effect ────────────────────────────────
  const prevReplayTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isReplayActive || replayCurrentTimestamp === null) {
      lastSyncedReplayTimestampRef.current = null;
      lastSyncedSlotsRef.current = null;

      if (lastReplayActiveRef.current) {
        lastReplayActiveRef.current = false;
        replayVisibilityBoundary.reset();
        slots.forEach((_, index) => {
          const chart = chartInstancesRef.current[index];
          if (chart) {
            if (typeof chart.setLeftMinVisibleBarCount === 'function') {
              chart.setLeftMinVisibleBarCount(2);
            }
            if (typeof chart.setMaxOffsetLeftDistance === 'function') {
              chart.setMaxOffsetLeftDistance(10000);
            }
            if (typeof chart.setMaxOffsetRightDistance === 'function') {
              chart.setMaxOffsetRightDistance(10000);
            }
          }
        });
      }
      prevReplayTimestampRef.current = null;
      return;
    }

    prevReplayTimestampRef.current = replayCurrentTimestamp;
    lastReplayActiveRef.current = isReplayActive;

    // Synchronize replay visibility boundary and trigger replay mask repaint
    replayVisibilityBoundary.setReplayState(true, replayCurrentTimestamp);

    slots.forEach((slot, index) => {
      const chart = chartInstancesRef.current[index];
      if (!chart || !slot.symbol) return;

      const fullData = (allTimeframesData[slot.timeframe]?.length > 0)
        ? allTimeframesData[slot.timeframe]
        : ((chart.getDataList?.() || []) as any[]);

      if (fullData.length > 0 && typeof chart.setLeftMinVisibleBarCount === 'function') {
        const minBars = replayVisibilityBoundary.getLeftMinVisibleBarCount(fullData);
        chart.setLeftMinVisibleBarCount(minBars);
      }

      const isActiveSlot = index === activeChartIndex;

      if (typeof chart.overrideIndicator === 'function') {
        chart.overrideIndicator({ name: REPLAY_MASK_INDICATOR_NAME });
      }
      if (typeof chart.updatePane === 'function') {
        chart.updatePane(3, 'candle_pane');
      }
      chart.resize();

      // Handle auto-shift scroll adjustment when enabled using Reset View positioning
      const isAutoShift = useReplayStore.getState().isAutoShiftEnabled;
      if (isAutoShift && isActiveSlot) {
        const fullData = allTimeframesData[slot.timeframe] || [];
        if (fullData.length > 0 && replayCurrentTimestamp !== null) {
          const lastRevealedIndex = findCandleIndexByTimestamp(fullData, replayCurrentTimestamp);
          if (lastRevealedIndex !== -1) {
            const chartSize = chart.getSize();
            const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
            const resetRatio = settings?.resetViewOffsetRatio ?? 0.5;
            const targetOffset = chartWidth * resetRatio;

            const barSpaceVal = chart.getBarSpace();
            let space = 6;
            if (typeof barSpaceVal === 'number') space = barSpaceVal;
            else if (typeof barSpaceVal === 'object' && barSpaceVal) space = (barSpaceVal as any).bar || 6;

            const remainingCandles = Math.max(0, (fullData.length - 1) - lastRevealedIndex);
            const hiddenWidth = remainingCandles * space;
            const effectiveOffset = targetOffset - hiddenWidth;

            (chart as any)._isProgrammaticScroll = true;
            chart.setOffsetRightDistance(effectiveOffset);
            requestAnimationFrame(() => {
              (chart as any)._isProgrammaticScroll = false;
            });
          }
        }
      }
    });
  }, [replayCurrentTimestamp, isReplayActive, slots, activeChartIndex, allTimeframesData]);





  // ─── Cut-Point Pickup Line DOM Event Listeners ───────────────────────────
  // Binds click (capture phase), mousemove and mouseleave on the active chart
  // container when replay cut-point selection mode is active.
  useEffect(() => {
    const container = chartContainersRef.current[activeChartIndex];
    const chart = chartInstancesRef.current[activeChartIndex];
    if (!container || !chart) return;

    const handleContainerClick = (event: MouseEvent) => {
      if (!isSelectingCutPoint) return;

      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const result = chart.convertFromPixel({ x, y });
      if (result) {
        const dataPoint = Array.isArray(result) ? result[0] : result;
        if (dataPoint) {
          let timestamp = dataPoint.timestamp;
          if (!timestamp && typeof dataPoint.dataIndex === 'number') {
            const dataIndex = Math.round(dataPoint.dataIndex);
            const fullData = allTimeframesData[activeTimeframe];
            if (fullData) {
              if (dataIndex >= 0 && dataIndex < fullData.length) {
                timestamp = fullData[dataIndex].timestamp;
              } else if (dataIndex >= fullData.length) {
                timestamp = fullData[fullData.length - 1].timestamp;
              } else {
                timestamp = fullData[0].timestamp;
              }
            }
          }
          if (timestamp) {
            handleSelectCutPoint(timestamp, x);
          }
        }
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isSelectingCutPoint) return;
      const rect = container.getBoundingClientRect();
      setCutPointHoverX(event.clientX - rect.left);
    };

    const handleMouseLeave = () => {
      setCutPointHoverX(null);
    };

    if (isSelectingCutPoint) {
      container.addEventListener('click', handleContainerClick, true);
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      container.removeEventListener('click', handleContainerClick, true);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isSelectingCutPoint, activeTimeframe, allTimeframesData, activeChartIndex]);

  const handleToggleAutoShift = () => {
    const next = !isAutoShiftEnabled;
    setIsAutoShiftEnabled(next);

    if (next && isReplayActive) {
      // Re-center on the current replay candle
      chartInstancesRef.current.forEach((chart, idx) => {
        if (!chart) return;
        const slot = slots[idx];
        if (!slot?.symbol) return;
        const chartSize = chart.getSize();
        const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
        const resetRatio = settings?.resetViewOffsetRatio ?? 0.5;
        const targetOffset = chartWidth * resetRatio;

        const fullData = allTimeframesData[slot.timeframe] || [];
        const currentIdx = replayCurrentTimestamp !== null
          ? findCandleIndexByTimestamp(fullData, replayCurrentTimestamp)
          : -1;
        if (currentIdx !== -1) {
          const barSpaceVal = chart.getBarSpace();
          let space = 6;
          if (typeof barSpaceVal === 'number') space = barSpaceVal;
          else if (typeof barSpaceVal === 'object' && barSpaceVal) space = (barSpaceVal as any).bar || 6;

          const remainingCandles = Math.max(0, (fullData.length - 1) - currentIdx);
          const hiddenWidth = remainingCandles * space;
          const effectiveOffset = targetOffset - hiddenWidth;

          (chart as any)._isProgrammaticScroll = true;
          chart.setOffsetRightDistance(effectiveOffset);
          requestAnimationFrame(() => {
            (chart as any)._isProgrammaticScroll = false;
          });
        }
      });
    }
  };

  // Keep track of replayCurrentTimestamp in ref to avoid re-triggering session recreation on every replay tick
  const replayCurrentTimestampRef = useRef<number | null>(replayCurrentTimestamp);
  replayCurrentTimestampRef.current = replayCurrentTimestamp;

  // Keep sessionRef synchronized when activeTimeframe changes during active replay
  const lastActiveTimeframeRef = useRef<string>(activeTimeframe);
  useEffect(() => {
    if (!isReplayActive) {
      lastActiveTimeframeRef.current = activeTimeframe;
      return;
    }
    if (lastActiveTimeframeRef.current === activeTimeframe) {
      return;
    }
    lastActiveTimeframeRef.current = activeTimeframe;

    const fullData = allTimeframesData[activeTimeframe] || [];
    const currentTs = replayCurrentTimestampRef.current;
    if (fullData.length === 0 || currentTs === null) {
      return;
    }

    const candleIdx = findCandleIndexByTimestamp(fullData, currentTs);
    if (candleIdx !== -1) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      try {
        const session = replayEngine.createSession({
          symbol: slots[activeChartIndex]?.symbol || 'INGEST',
          historicalData: fullData,
          startIndex: candleIdx,
        });
        sessionRef.current = session;
        session.setStatus('PAUSED');

        const unsub = session.subscribe((state) => {
          setReplayCurrentTimestamp(state.currentTimestamp);
          setBookmarks(state.bookmarks);
          if (state.status === 'COMPLETED') {
            setIsReplayPlaying(false);
          }
        });
        unsubscribeRef.current = unsub;
      } catch (err) {
        console.error('[ReplayCoordinator] Failed to sync session on timeframe switch:', err);
      }
    }
  }, [activeTimeframe, isReplayActive, allTimeframesData, slots, activeChartIndex, setReplayCurrentTimestamp, setBookmarks, setIsReplayPlaying]);

  const handleShiftReplayToAvailableData = (slotIndex?: number) => {
    const targetIdx = slotIndex ?? activeChartIndex;
    const slot = slots[targetIdx];
    if (!slot || !slot.symbol) return;
    const fullData = allTimeframesData[slot.timeframe] || [];
    if (fullData.length === 0) return;

    const firstCandle = fullData[0];
    const firstTimestamp = firstCandle.timestamp;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    try {
      const session = replayEngine.createSession({
        symbol: slot.symbol,
        historicalData: fullData,
        startIndex: 0,
      });
      sessionRef.current = session;
      session.setStatus('PAUSED');

      const unsub = session.subscribe((state) => {
        setReplayCurrentTimestamp(state.currentTimestamp);
        setBookmarks(state.bookmarks);
        if (state.status === 'COMPLETED') {
          setIsReplayPlaying(false);
        }
      });
      unsubscribeRef.current = unsub;
    } catch (err) {
      console.error('[ReplayCoordinator] Failed to recreate replay session on shift:', err);
    }

    // Ensure the chart viewport centers on the newly shifted candle
    const activeChart = chartInstancesRef.current[activeChartIndex];
    const chartSize = activeChart ? activeChart.getSize() : null;
    const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
    const resetRatio = settings?.resetViewOffsetRatio ?? 0.5;
    capturedOffsetRef.current = chartWidth * resetRatio;

    setReplayCurrentTimestamp(firstTimestamp);
    setIsReplayPlaying(false);
  };

  const handleJumpToDate = (targetTimestamp: number) => {
    const fullData = allTimeframesData[activeTimeframe] || [];
    if (fullData.length === 0) return;

    let closestCandle = fullData[0];
    for (let i = 0; i < fullData.length; i++) {
      if (fullData[i].timestamp <= targetTimestamp) {
        closestCandle = fullData[i];
      } else {
        break;
      }
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const startIndex = findCandleIndexByTimestamp(fullData, closestCandle.timestamp);

    try {
      const session = replayEngine.createSession({
        symbol: slots[activeChartIndex]?.symbol || 'INGEST',
        historicalData: fullData,
        startIndex: startIndex !== -1 ? startIndex : 0,
      });

      sessionRef.current = session;
      session.setStatus('PAUSED');

      const unsub = session.subscribe((state) => {
        setReplayCurrentTimestamp(state.currentTimestamp);
        setBookmarks(state.bookmarks);
        if (state.status === 'COMPLETED') {
          setIsReplayPlaying(false);
        }
      });
      unsubscribeRef.current = unsub;
    } catch (err) {
      console.error('[ReplayCoordinator] Failed to recreate replay session on jump to date:', err);
    }

    // Position chart viewports to the target candle using the preferred reset view offset
    slots.forEach((slot, idx) => {
      const c = chartInstancesRef.current[idx];
      if (!c || !slot?.symbol) return;

      const slotFullData = (allTimeframesData[slot.timeframe]?.length > 0)
        ? allTimeframesData[slot.timeframe]
        : ((c.getDataList?.() || []) as any[]);

      if (slotFullData.length > 0) {
        const lastRevealed = findCandleIndexByTimestamp(slotFullData, closestCandle.timestamp);
        if (lastRevealed !== -1) {
          const H = Math.max(0, slotFullData.length - 1 - lastRevealed);
          if (typeof c.setLeftMinVisibleBarCount === 'function') {
            c.setLeftMinVisibleBarCount(H + 1);
          }

          const chartSize = c.getSize();
          const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
          const resetRatio = settings?.resetViewOffsetRatio ?? 0.5;
          const targetOffset = chartWidth * resetRatio;

          const barSpaceVal = c.getBarSpace();
          let space = 6;
          if (typeof barSpaceVal === 'number') space = barSpaceVal;
          else if (typeof barSpaceVal === 'object' && barSpaceVal) space = (barSpaceVal as any).bar || 6;

          const hiddenWidth = H * space;
          const effectiveOffset = targetOffset - hiddenWidth;

          (c as any)._isProgrammaticScroll = true;
          c.setOffsetRightDistance(effectiveOffset);
          requestAnimationFrame(() => {
            c.setOffsetRightDistance(effectiveOffset);
            (c as any)._isProgrammaticScroll = false;
          });
        }
      }
    });

    setReplayCurrentTimestamp(closestCandle.timestamp);
    setIsReplayPlaying(false);
  };

  return {
    isSelectingCutPoint,
    setIsSelectingCutPoint,
    cutPointHoverX,
    setCutPointHoverX,
    isAutoShiftEnabled,
    handleToggleAutoShift,
    handleReplayStepForward,
    handleReplayStepBackward,
    exitReplayMode,
    handleSelectCutPoint,
    handleAddBookmark,
    handleRemoveBookmark,
    handleUpdateBookmark,
    handleJumpToBookmark,
    handleShiftReplayToAvailableData,
    handleJumpToDate,
  };
}
