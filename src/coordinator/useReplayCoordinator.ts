import { useState, useEffect, useRef } from 'react';
import { useReplayStore, useLayoutStore } from '@/store';
import type { SlotConfig } from '@/store/types';
import { replayEngine, findCandleIndexByTimestamp, replayVisibilityBoundary } from '@/engine/replay';

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
        if (typeof c.updatePane === 'function') {
          c.updatePane(0, 'candle_pane');
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

    console.log(`[DEBUG] exitReplayMode - Smooth dynamic exit slide: slicedIndex=${slicedIndex}, currentCandleOffset=${currentCandleOffset}px, remaining=${remainingCandles}, startOffset=${startOffset}px, targetOffset=${endOffset}px, distance=${distance}px`);

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
        console.log(`[DEBUG] exitReplayMode - Slide finished. Last candle locked at reset view offset: ${endOffset}px`);
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
    console.log(`[DEBUG] selectCutPoint - Initializing replay session from: ${new Date(timestamp).toLocaleString()}`);
    setIsSelectingCutPoint(false);
    setCutPointHoverX(null);

    const fullData = allTimeframesData[activeTimeframe] || [];
    const startIndex = findCandleIndexByTimestamp(fullData, timestamp);
    if (startIndex === -1) {
      console.warn('[DEBUG] handleSelectCutPoint - Start index not found for timestamp:', timestamp);
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
      console.log(`[DEBUG] handleSelectCutPoint - Stored pendingCutAnimation: clickX=${clickX}, savedOffset=${chartWidth / 2}`);
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

      // Initialize visibility boundary and trigger replay mask repaint
      replayVisibilityBoundary.setReplayState(true, timestamp);
      slots.forEach((slot, idx) => {
        const c = chartInstancesRef.current[idx];
        if (c && slot?.symbol) {
          if (typeof c.updatePane === 'function') {
            c.updatePane(0, 'candle_pane');
          }
          c.resize();
        }
      });


      // Align active chart camera viewport to selected cut point
      const activeChart = chartInstancesRef.current[activeChartIndex];
      if (activeChart) {
        const chartSize = activeChart.getSize();
        const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
        const resetRatio = settings?.resetViewOffsetRatio ?? 0.5;
        const targetOffset = chartWidth * resetRatio;

        const barSpaceVal = activeChart.getBarSpace();
        let barSpace = 6;
        if (typeof barSpaceVal === 'number') {
          barSpace = barSpaceVal;
        } else if (typeof barSpaceVal === 'object' && barSpaceVal) {
          barSpace = (barSpaceVal as any).bar || 6;
        }

        const remainingCandles = Math.max(0, (fullData.length - 1) - startIndex);
        const hiddenWidth = remainingCandles * barSpace;

        const effectiveTargetOffset = targetOffset - hiddenWidth;
        const startOffset = clickX !== undefined ? (chartWidth - clickX) - hiddenWidth : effectiveTargetOffset;

        (activeChart as any)._isProgrammaticScroll = true;
        activeChart.setOffsetRightDistance(startOffset);

        if (Math.abs(effectiveTargetOffset - startOffset) > 2) {
          const startTime = performance.now();
          const duration = 500;
          const animate = (time: number) => {
            const chartInst = chartInstancesRef.current[activeChartIndex];
            if (!chartInst) return;
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentOffset = startOffset + (effectiveTargetOffset - startOffset) * eased;
            chartInst.setOffsetRightDistance(currentOffset);
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              chartInst.setOffsetRightDistance(effectiveTargetOffset);
              (chartInst as any)._isProgrammaticScroll = false;
            }
          };
          requestAnimationFrame(animate);
        } else {
          activeChart.setOffsetRightDistance(effectiveTargetOffset);
          (activeChart as any)._isProgrammaticScroll = false;
        }
      }

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
      console.log(`[DEBUG] autoplay loop - Starting Interval timer. Interval: ${replaySpeed}s on timeframe ${activeTimeframe}.`);
      intervalId = setInterval(() => {
        if (isSwitchingTimeframeRef?.current) {
          console.log('[DEBUG] autoplay loop - Skipping stepForward during active timeframe switch.');
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
        console.log('[DEBUG] autoplay loop - Clearing Interval timer.');
        clearInterval(intervalId);
      }
    };
  }, [isReplayActive, isReplayPlaying, replaySpeed, activeTimeframe]);

  // Pause replay playback during manual chart click/drag interaction, resume on mouse release
  const isReplayPausedByDragRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isReplayActive) {
      isReplayPausedByDragRef.current = false;
      return;
    }

    const handleChartMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const replayState = useReplayStore.getState();
      if (replayState.isReplayActive && replayState.isReplayPlaying) {
        console.log('[DEBUG] Chart click/drag detected during replay: pausing playback');
        isReplayPausedByDragRef.current = true;
        replayState.setIsReplayPlaying(false);
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (e.button !== 0 && (e.buttons !== undefined && e.buttons !== 0)) return;
      if (isReplayPausedByDragRef.current) {
        console.log('[DEBUG] Chart click released: resuming replay playback from last candle');
        isReplayPausedByDragRef.current = false;
        const replayState = useReplayStore.getState();
        if (replayState.isReplayActive && !replayState.isReplayPlaying) {
          replayState.setIsReplayPlaying(true);
        }
      }
    };

    const handleWindowBlur = () => {
      if (isReplayPausedByDragRef.current) {
        isReplayPausedByDragRef.current = false;
      }
    };

    const containers = chartContainersRef.current;
    containers.forEach((container) => {
      if (container) {
        container.addEventListener('mousedown', handleChartMouseDown, { capture: true });
      }
    });
    window.addEventListener('mouseup', handleWindowMouseUp, { capture: true });
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      containers.forEach((container) => {
        if (container) {
          container.removeEventListener('mousedown', handleChartMouseDown, { capture: true });
        }
      });
      window.removeEventListener('mouseup', handleWindowMouseUp, { capture: true });
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isReplayActive, chartContainersRef, slots]);

  // Clean up session subscriptions and animation on unmount
  useEffect(() => {
    return () => {
      if (exitAnimationIdRef.current) {
        cancelAnimationFrame(exitAnimationIdRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      replayEngine.destroySession();
    };
  }, []);

  // Synchronize slots data slices when replay timestamp changes.
  // Restores scroll offset and runs the cut-point slide-in animation.
  useEffect(() => {
    if (!isReplayActive || replayCurrentTimestamp === null) {
      lastSyncedReplayTimestampRef.current = null;
      lastSyncedSlotsRef.current = null;
      lastReplayActiveRef.current = false;
      return;
    }

    const prevTimestamp = lastSyncedReplayTimestampRef.current;
    const isTimestampChanged = prevTimestamp !== replayCurrentTimestamp;
    const isSlotsChanged = lastSyncedSlotsRef.current !== slots;
    const isReplayActiveChanged = lastReplayActiveRef.current !== isReplayActive;

    if (!isTimestampChanged && !isSlotsChanged && !isReplayActiveChanged) {
      return;
    }

    if (isSwitchingTimeframeRef?.current) {
      console.log('[DEBUG] replay dataSync - Skipping sync during active timeframe switch transition.');
      lastSyncedReplayTimestampRef.current = replayCurrentTimestamp;
      lastSyncedSlotsRef.current = slots;
      lastReplayActiveRef.current = isReplayActive;
      return;
    }

    lastSyncedReplayTimestampRef.current = replayCurrentTimestamp;
    lastSyncedSlotsRef.current = slots;
    lastReplayActiveRef.current = isReplayActive;

    // Synchronize replay visibility boundary and trigger replay mask repaint
    replayVisibilityBoundary.setReplayState(true, replayCurrentTimestamp);

    slots.forEach((slot, index) => {
      const chart = chartInstancesRef.current[index];
      if (!chart || !slot.symbol) return;

      const isActiveSlot = index === activeChartIndex;

      if (typeof chart.updatePane === 'function') {
        chart.updatePane(0, 'candle_pane');
      }
      chart.resize();



      // Handle optional auto-shift scroll adjustment without resetting chart data
      if (!useReplayStore.getState().isAutoShiftEnabled && prevTimestamp !== null && isActiveSlot) {
        const currentOffset = getTrueOffsetRightDistance(chart);
        const fullData = allTimeframesData[slot.timeframe] || [];
        if (fullData.length > 0) {
          const prevIdx = findCandleIndexByTimestamp(fullData, prevTimestamp);
          const currIdx = findCandleIndexByTimestamp(fullData, replayCurrentTimestamp);
          if (prevIdx !== -1 && currIdx !== -1) {
            const deltaBars = currIdx - prevIdx;
            if (deltaBars !== 0) {
              const barSpaceVal = chart.getBarSpace();
              let space = 6;
              if (typeof barSpaceVal === 'number') space = barSpaceVal;
              else if (typeof barSpaceVal === 'object' && barSpaceVal) space = barSpaceVal.bar || 6;

              const tempOffset = currentOffset - (deltaBars * space);
              chart.setOffsetRightDistance(tempOffset);
            }
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
      console.log(`[DEBUG] cutpoint click - X=${event.clientX}, Y=${event.clientY}`);

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
            console.log(`[DEBUG] cutpoint click - Resolved: ${new Date(timestamp).toLocaleString()}`);
            handleSelectCutPoint(timestamp, x);
          } else {
            console.error('[DEBUG] cutpoint click - Failed to resolve timestamp.', dataPoint);
          }
        }
      } else {
        console.warn('[DEBUG] cutpoint click - convertFromPixel returned null.');
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
      console.log('[DEBUG] cutpoint hook - Active. Binding click + cursor listeners.');
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
        const targetOffset = chartWidth * 0.5;

        (chart as any)._isProgrammaticScroll = true;
        chart.setOffsetRightDistance(targetOffset);
        const fullData = allTimeframesData[slot.timeframe] || [];
        const currentIdx = replayCurrentTimestamp !== null
          ? findCandleIndexByTimestamp(fullData, replayCurrentTimestamp)
          : -1;
        if (currentIdx !== -1) {
          chart.scrollToDataIndex(currentIdx);
        }
        requestAnimationFrame(() => {
          chart.setOffsetRightDistance(targetOffset);
          (chart as any)._isProgrammaticScroll = false;
        });
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
      console.log(`[DEBUG] ReplayCoordinator - Timeframe changed to ${activeTimeframe}. Re-anchoring session at index ${candleIdx}.`);
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

    console.log(`[DEBUG] handleShiftReplayToAvailableData - Shifting replay to ${slot.timeframe} start: ${new Date(firstTimestamp).toLocaleString()}`);

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

    console.log(`[DEBUG] handleJumpToDate - Jumping replay to: ${new Date(closestCandle.timestamp).toLocaleString()}`);

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

    // Ensure the chart viewport centers on the newly jumped candle using the preferred reset view offset
    const activeChart = chartInstancesRef.current[activeChartIndex];
    const chartSize = activeChart ? activeChart.getSize() : null;
    const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
    const resetRatio = settings?.resetViewOffsetRatio ?? 0.5;
    capturedOffsetRef.current = chartWidth * resetRatio;

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
