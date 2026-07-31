import { useState, useEffect } from 'react';
import { useReplayStore, useLayoutStore } from '@/store';
import {
  findCandleIndexByTimestamp,
  getNextReplayTimestamp,
  getPrevReplayTimestamp,
  ReplayTimer,
} from '@/engine/replay';
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

  const handleReplayStepForward = () => {
    const chart = chartInstancesRef.current[activeChartIndex];
    if (!chart || !isReplayActive) {
      console.warn('[DEBUG] handleReplayStepForward - Replay mode is not active or chart is missing.');
      return;
    }

    const fullData = allTimeframesData[activeTimeframe];
    if (!fullData || fullData.length === 0) {
      console.warn('[DEBUG] handleReplayStepForward - Empty or missing data for active timeframe:', activeTimeframe);
      return;
    }

    if (replayCurrentTimestamp === null) {
      console.warn('[DEBUG] handleReplayStepForward - Current replay timestamp is null (no cutpoint selected).');
      return;
    }

    const nextTimestamp = getNextReplayTimestamp(fullData, replayCurrentTimestamp);
    if (nextTimestamp === null) {
      console.log('[DEBUG] handleReplayStepForward - Replay has reached the end of dataset. Pausing autoplay.');
      setIsReplayPlaying(false);
      return;
    }

    console.log(`[DEBUG] handleReplayStepForward - Advancing from ${new Date(replayCurrentTimestamp).toLocaleString()} to ${new Date(nextTimestamp).toLocaleString()}`);
    setReplayCurrentTimestamp(nextTimestamp);
  };

  const handleReplayStepBackward = () => {
    const chart = chartInstancesRef.current[activeChartIndex];
    if (!chart || !isReplayActive || replayCurrentTimestamp === null) {
      console.warn('[DEBUG] handleReplayStepBackward - Replay mode is not active or timestamp is null.');
      return;
    }

    const fullData = allTimeframesData[activeTimeframe];
    if (!fullData || fullData.length === 0) {
      console.warn('[DEBUG] handleReplayStepBackward - Empty or missing data for active timeframe:', activeTimeframe);
      return;
    }

    const prevTimestamp = getPrevReplayTimestamp(fullData, replayCurrentTimestamp);
    if (prevTimestamp === null) {
      console.warn('[DEBUG] handleReplayStepBackward - Cannot step back further.');
      return;
    }

    console.log(`[DEBUG] handleReplayStepBackward - Reverting from ${new Date(replayCurrentTimestamp).toLocaleString()} to ${new Date(prevTimestamp).toLocaleString()}`);
    setReplayCurrentTimestamp(prevTimestamp);
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
    setIsReplayActive(true);
    setIsReplayPlaying(false);
    setReplayCurrentTimestamp(timestamp);
  };

  // Manage Autoplay Replay Timer Loop
  useEffect(() => {
    let timer: ReplayTimer | null = null;
    if (isReplayActive && isReplayPlaying && replayCurrentTimestamp !== null) {
      console.log(`[DEBUG] autoplay hook - Starting ReplayTimer. Speed interval: ${replaySpeed}s per bar.`);
      timer = new ReplayTimer(handleReplayStepForward, replaySpeed);
      timer.start();
    }
    return () => {
      if (timer) {
        console.log('[DEBUG] autoplay hook - Stopping ReplayTimer.');
        timer.stop();
      }
    };
  }, [isReplayActive, isReplayPlaying, replayCurrentTimestamp, replaySpeed, activeTimeframe, allTimeframesData]);

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
