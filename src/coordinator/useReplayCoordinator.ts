import { useState, useEffect, useRef } from 'react';
import { useReplayStore, useLayoutStore } from '@/store';
import type { SlotConfig } from '@/store/types';
import { replayEngine, findCandleIndexByTimestamp } from '@/engine/replay';
import type { ReplaySession } from '@/engine/replay';
import { getTrueOffsetRightDistance } from '@/engine/charting';

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
  settings?: any
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

    const resetRatio = settings?.resetViewOffsetRatio ?? 0.5;

    // Restore full data to other slots in multi-chart layout
    slots.forEach((slot, idx) => {
      if (idx === activeChartIndex) return;
      const otherChart = chartInstancesRef.current[idx];
      if (!otherChart || !slot?.symbol) return;
      const otherFull = allTimeframesData[slot.timeframe] || [];
      if (otherFull.length > 0) {
        (otherChart as any)._isProgrammaticScroll = true;
        otherChart.setDataLoader({
          getBars: ({ type: loadType, callback }: any) => {
            if (loadType === 'init') callback(otherFull);
            else callback([]);
          },
        });
        otherChart.resetData();
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

    // Ingest full dataset into active chart
    (chart as any)._isProgrammaticScroll = true;
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

    // Restore manual Y-axis scale so candle heights don't jump
    if (wasManualScaleRef.current && capturedYAxisRangeRef.current) {
      const p = chart.getDrawPaneById?.('candle_pane');
      const ya = p?.getYAxisComponents?.()?.[0];
      if (ya) {
        ya.setRange(capturedYAxisRangeRef.current.from, capturedYAxisRangeRef.current.to);
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
            ya.setRange(capturedYAxisRangeRef.current.from, capturedYAxisRangeRef.current.to);
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
  }, [isReplayActive, isReplayPlaying, replaySpeed]);

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

    lastSyncedReplayTimestampRef.current = replayCurrentTimestamp;
    lastSyncedSlotsRef.current = slots;
    lastReplayActiveRef.current = isReplayActive;

    slots.forEach(async (slot, index) => {
      const chart = chartInstancesRef.current[index];
      if (!chart || !slot.symbol) return;

      const isActiveSlot = index === activeChartIndex;

      // Capture scroll offset and Y-axis state BEFORE data reload (active slot only)
      let currentOffset: number | null = null;
      let yAxis: any = null;
      let wasManualScale = false;
      let prevRange: any = null;
      if (isActiveSlot) {
        currentOffset = capturedOffsetRef.current !== null
          ? capturedOffsetRef.current
          : getTrueOffsetRightDistance(chart);
        if (capturedOffsetRef.current !== null) {
          capturedOffsetRef.current = null;
        }
        const pane = chart.getDrawPaneById?.('candle_pane');
        yAxis = pane?.getYAxisComponents?.()?.[0];
        wasManualScale = yAxis ? !yAxis.getAutoCalcTickFlag() : false;
        prevRange = wasManualScale && yAxis ? yAxis.getRange() : null;
      }

      // Check for pending cut animation to override the starting offset
      const anim = isActiveSlot ? pendingCutAnimation.current : null;
      let tempOffset = currentOffset;
      if (anim && anim.timestamp === replayCurrentTimestamp && currentOffset !== null) {
        const chartSize = chart.getSize();
        const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
        tempOffset = chartWidth - anim.clickX;
        console.log(`[DEBUG] dataSync - Cut animation offset override: ${tempOffset} (clickX: ${anim.clickX})`);
      } else if (!useReplayStore.getState().isAutoShiftEnabled && prevTimestamp !== null && currentOffset !== null) {
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

              tempOffset = currentOffset - (deltaBars * space);
              console.log(`[DEBUG] dataSync - Auto Shift OFF: adjusting offset by -${deltaBars * space}px to keep viewport stationary (new offset: ${tempOffset})`);
            }
          }
        }
      }

      // Reload data for this slot using loadDataForSlot with preserved/custom offset
      (chart as any)._isProgrammaticScroll = true;
      await loadDataForSlotRef.current(
        index,
        chart,
        isActiveSlot && tempOffset !== null
          ? { customOffset: tempOffset }
          : { preserveOffset: true }
      );
      requestAnimationFrame(() => {
        (chart as any)._isProgrammaticScroll = false;
      });

      // Restore or unlock Y-axis scale (active slot only)
      if (isActiveSlot && yAxis) {
        if (wasManualScale && prevRange) {
          console.log('[DEBUG] dataSync - Restoring manual Y-axis range:', prevRange);
          yAxis.setRange({ ...prevRange });
          yAxis.setAutoCalcTickFlag(false);
        } else {
          yAxis.setAutoCalcTickFlag(true);
        }
      }

      // Run the cut-point slide-in animation (active slot, consumed once)
      if (isActiveSlot && anim && anim.timestamp === replayCurrentTimestamp && tempOffset !== null) {
        pendingCutAnimation.current = null;
        const startTime = performance.now();
        const startOffset = tempOffset;
        const endOffset = anim.savedOffset;
        const duration = 700;
        console.log(`[DEBUG] dataSync - Animating offset: ${startOffset} to ${endOffset} over ${duration}ms`);
        const animate = (time: number) => {
          const activeChart = chartInstancesRef.current[activeChartIndex];
          if (!activeChart || !isReplayActive) return;
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          activeChart.setOffsetRightDistance(startOffset + (endOffset - startOffset) * eased);
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            console.log(`[DEBUG] dataSync - Animation done. Final offset: ${endOffset}`);
            activeChart.setOffsetRightDistance(endOffset);
          }
        };
        requestAnimationFrame(animate);
      }
    });
  }, [replayCurrentTimestamp, isReplayActive, slots, activeChartIndex, loadDataForSlot]);

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
  };
}
