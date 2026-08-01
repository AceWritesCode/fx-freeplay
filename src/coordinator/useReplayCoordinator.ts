import { useState, useEffect, useRef } from 'react';
import { useReplayStore, useLayoutStore } from '@/store';
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
    setBookmarks,
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

  // Synchronize slots data slices when replay timestamp changes.
  // Restores scroll offset and runs the cut-point slide-in animation.
  useEffect(() => {
    if (!isReplayActive || replayCurrentTimestamp === null) return;

    slots.forEach((slot, index) => {
      const chart = chartInstancesRef.current[index];
      if (!chart || !slot.symbol) return;

      const isActiveSlot = index === activeChartIndex;
      const tf = slot.timeframe;
      const fullData = allTimeframesData[tf] || [];
      if (fullData.length === 0) return;

      const idx = findCandleIndexByTimestamp(fullData, replayCurrentTimestamp);
      const visibleData = idx !== -1 ? fullData.slice(0, idx + 1) : [];

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
      }

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

      // Restore scroll offset after data reset (active slot only)
      if (isActiveSlot && tempOffset !== null) {
        console.log(`[DEBUG] dataSync - Restoring offsetRightDistance: ${tempOffset}`);
        chart.setOffsetRightDistance(tempOffset);
      }

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
  }, [replayCurrentTimestamp, isReplayActive, slots, allTimeframesData, activeChartIndex]);

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

  return {
    isSelectingCutPoint,
    setIsSelectingCutPoint,
    cutPointHoverX,
    setCutPointHoverX,
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
