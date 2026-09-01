import { useEffect, useRef, useState, useCallback } from 'react';
import { getChartBarSpace, getTrueOffsetRightDistance } from '@/engine/charting';

export interface ZoomToolConfig {
  chartContainersRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
  chartInstancesRef: React.MutableRefObject<(any | null)[]>;
  activeTool: string | null;
  activeChartIndex: number;
  setActiveTool: (tool: string | null) => void;
}

interface ZoomHistoryEntry {
  chartIndex: number;
  barSpace: number;
  offsetRightDistance: number;
  yAxisRange: {
    wasManual: boolean;
    from?: number;
    to?: number;
  } | null;
}

export function useZoomTool({
  chartContainersRef,
  chartInstancesRef,
  activeTool,
  activeChartIndex,
  setActiveTool,
}: ZoomToolConfig) {
  const isDraggingRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const savedZoomStateRef = useRef<ZoomHistoryEntry | null>(null);
  const [canZoomOut, setCanZoomOut] = useState(false);

  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const setActiveToolRef = useRef(setActiveTool);
  setActiveToolRef.current = setActiveTool;

  const zoomOut = useCallback(() => {
    const previousState = savedZoomStateRef.current;
    savedZoomStateRef.current = null;
    setCanZoomOut(false);

    if (previousState) {
      const chart = chartInstancesRef.current[previousState.chartIndex];
      if (chart) {
        chart.setBarSpace(previousState.barSpace);
        chart.setOffsetRightDistance(previousState.offsetRightDistance);

        const pane =
          chart.getDrawPaneById?.('candle_pane') ||
          (chart as any)._chartStore?.getPaneStore?.()?.getPaneById?.('candle_pane');
        const yAxis = pane?.getYAxisComponents?.()?.[0] || (chart as any)._candlePaneYAxis;

        if (yAxis) {
          if (
            previousState.yAxisRange?.wasManual &&
            typeof previousState.yAxisRange.from === 'number' &&
            typeof previousState.yAxisRange.to === 'number' &&
            isFinite(previousState.yAxisRange.from) &&
            isFinite(previousState.yAxisRange.to) &&
            previousState.yAxisRange.to > previousState.yAxisRange.from
          ) {
            const minP = previousState.yAxisRange.from;
            const maxP = previousState.yAxisRange.to;
            const span = maxP - minP;
            try {
              yAxis.setRange({
                from: minP,
                to: maxP,
                range: span,
                realFrom: minP,
                realTo: maxP,
                realRange: span,
              });
              yAxis.setAutoCalcTickFlag?.(false);
            } catch (_) {
              yAxis.setAutoCalcTickFlag?.(true);
            }
          } else {
            yAxis.setAutoCalcTickFlag?.(true);
          }
        }

        if (pane) {
          if (typeof pane.getWidget === 'function' && typeof pane.getWidget()?.invalidate === 'function') {
            pane.getWidget().invalidate();
          } else if (typeof pane.requestInvalidate === 'function') {
            pane.requestInvalidate();
          } else if (typeof pane.invalidate === 'function') {
            pane.invalidate();
          }
        }
      }
    }
  }, [chartInstancesRef]);

  useEffect(() => {
    const container = chartContainersRef.current[activeChartIndex];
    const chart = chartInstancesRef.current[activeChartIndex];
    if (!container || !chart) return;

    if (activeTool === 'zoomIn') {
      container.style.cursor = 'crosshair';
      const canvases = container.querySelectorAll('canvas');
      canvases.forEach((c) => {
        c.style.cursor = 'crosshair';
      });
    }

    const clearPreview = () => {
      const pCanvas = previewCanvasRef.current;
      if (pCanvas) {
        const ctx = pCanvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
          ctx.restore();
        }
      }
      isDraggingRef.current = false;
      startPosRef.current = null;
    };

    const renderSelection = (currentX: number, currentY: number) => {
      const pCanvas = previewCanvasRef.current;
      const startPos = startPosRef.current;
      if (!pCanvas || !startPos) return;

      const ctx = pCanvas.getContext('2d');
      if (!ctx) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      if (pCanvas.width !== rect.width * dpr || pCanvas.height !== rect.height * dpr) {
        pCanvas.width = rect.width * dpr;
        pCanvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      ctx.restore();

      ctx.save();
      ctx.scale(dpr, dpr);

      const left = Math.min(startPos.x, currentX);
      const right = Math.max(startPos.x, currentX);
      const top = Math.min(startPos.y, currentY);
      const bottom = Math.max(startPos.y, currentY);
      const width = right - left;
      const height = bottom - top;

      if (width > 2 || height > 2) {
        ctx.fillStyle = 'rgba(41, 98, 255, 0.25)';
        ctx.fillRect(left, top, width, height);

        ctx.strokeStyle = 'rgba(41, 98, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(left, top, width, height);
      }

      ctx.restore();
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (activeToolRef.current !== 'zoomIn') return;

      const target = e.target as Element;
      if (
        target &&
        (target.closest('[data-floating-ui], .drawing-floating-toolbar, [data-no-deselect], [role="dialog"]') ||
          target.closest('button, input, select, textarea, [role="button"], [role="menu"]'))
      ) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      if (startX < 0 || startX > rect.width || startY < 0 || startY > rect.height) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      chart.setScrollEnabled(false);
      chart.setZoomEnabled(false);

      isDraggingRef.current = true;
      startPosRef.current = { x: startX, y: startY };

      let pCanvas = container.querySelector('.zoom-preview-canvas') as HTMLCanvasElement;
      if (!pCanvas) {
        pCanvas = document.createElement('canvas');
        pCanvas.className = 'zoom-preview-canvas';
        pCanvas.style.position = 'absolute';
        pCanvas.style.top = '0';
        pCanvas.style.left = '0';
        pCanvas.style.width = '100%';
        pCanvas.style.height = '100%';
        pCanvas.style.pointerEvents = 'none';
        pCanvas.style.zIndex = '37';
        container.appendChild(pCanvas);
      }
      previewCanvasRef.current = pCanvas;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !startPosRef.current) return;

      const rect = container.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      renderSelection(currentX, currentY);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDraggingRef.current || !startPosRef.current) return;

      const startPos = startPosRef.current;
      const rect = container.getBoundingClientRect();
      const endX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const endY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      clearPreview();
      chart.setScrollEnabled(true);
      chart.setZoomEnabled(true);

      const dx = Math.abs(endX - startPos.x);
      const dy = Math.abs(endY - startPos.y);

      if (dx >= 10 || dy >= 10) {
        const pane =
          chart.getDrawPaneById?.('candle_pane') ||
          (chart as any)._chartStore?.getPaneStore?.()?.getPaneById?.('candle_pane');
        const yAxis = pane?.getYAxisComponents?.()?.[0] || (chart as any)._candlePaneYAxis;

        if (!savedZoomStateRef.current) {
          // Record baseline zoom state prior to zoom in
          const currentBarSpace = getChartBarSpace(chart);
          const currentOffset = getTrueOffsetRightDistance(chart);

          let wasManual = false;
          let prevFrom: number | undefined;
          let prevTo: number | undefined;
          if (yAxis) {
            wasManual = typeof yAxis.getAutoCalcTickFlag === 'function' ? !yAxis.getAutoCalcTickFlag() : false;
            const r = typeof yAxis.getRange === 'function' ? yAxis.getRange() : null;
            if (r && typeof r.from === 'number' && typeof r.to === 'number') {
              prevFrom = r.from;
              prevTo = r.to;
            }
          }

          savedZoomStateRef.current = {
            chartIndex: activeChartIndex,
            barSpace: currentBarSpace,
            offsetRightDistance: currentOffset,
            yAxisRange: {
              wasManual,
              from: prevFrom,
              to: prevTo,
            },
          };
          setCanZoomOut(true);
        }

        // Convert start and end points to chart data coordinates safely
        const rawStart = chart.convertFromPixel([{ x: startPos.x, y: startPos.y }], { paneId: 'candle_pane' });
        const startCoord = Array.isArray(rawStart) ? rawStart[0] : rawStart;

        const rawEnd = chart.convertFromPixel([{ x: endX, y: endY }], { paneId: 'candle_pane' });
        const endCoord = Array.isArray(rawEnd) ? rawEnd[0] : rawEnd;

        const dataList = chart.getDataList?.() || [];
        if (dataList.length > 0 && startCoord && endCoord) {
          // 1. Time / Bar Range Zoom (X-axis)
          if (typeof startCoord.dataIndex === 'number' && typeof endCoord.dataIndex === 'number') {
            const fromIdx = Math.max(0, Math.min(startCoord.dataIndex, endCoord.dataIndex));
            const toIdx = Math.min(dataList.length - 1, Math.max(startCoord.dataIndex, endCoord.dataIndex));
            const visibleBarsCount = Math.max(2, toIdx - fromIdx + 1);

            const chartWidth = chart.getSize()?.width || rect.width || 800;
            const desiredBarSpace = chartWidth / visibleBarsCount;

            chart.setBarSpace(desiredBarSpace);
            const actualSpace = getChartBarSpace(chart);
            const offsetRightDistance = (toIdx - dataList.length) * actualSpace;
            chart.setOffsetRightDistance(offsetRightDistance);
          }

          // 2. Price Range Zoom (Y-axis)
          const startPrice =
            typeof yAxis?.convertFromPixel === 'function'
              ? yAxis.convertFromPixel(startPos.y)
              : startCoord?.value;
          const endPrice =
            typeof yAxis?.convertFromPixel === 'function'
              ? yAxis.convertFromPixel(endY)
              : endCoord?.value;

          if (
            dy >= 20 &&
            typeof startPrice === 'number' &&
            typeof endPrice === 'number' &&
            isFinite(startPrice) &&
            isFinite(endPrice) &&
            !isNaN(startPrice) &&
            !isNaN(endPrice) &&
            yAxis
          ) {
            const minPrice = Math.min(startPrice, endPrice);
            const maxPrice = Math.max(startPrice, endPrice);
            const priceSpan = maxPrice - minPrice;

            if (priceSpan > 0.000001 && minPrice > 0) {
              try {
                yAxis.setRange({
                  from: minPrice,
                  to: maxPrice,
                  range: priceSpan,
                  realFrom: minPrice,
                  realTo: maxPrice,
                  realRange: priceSpan,
                });
                yAxis.setAutoCalcTickFlag?.(false);
              } catch (_) {
                yAxis.setAutoCalcTickFlag?.(true);
              }
            } else {
              yAxis.setAutoCalcTickFlag?.(true);
            }
          } else if (yAxis) {
            // Auto-calculate Y-axis based on visible candles in the zoomed time range
            yAxis.setAutoCalcTickFlag?.(true);
          }

          if (pane) {
            if (typeof pane.getWidget === 'function' && typeof pane.getWidget()?.invalidate === 'function') {
              pane.getWidget().invalidate();
            } else if (typeof pane.requestInvalidate === 'function') {
              pane.requestInvalidate();
            } else if (typeof pane.invalidate === 'function') {
              pane.invalidate();
            }
          }
        }
      }

      setActiveToolRef.current(null);
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      if (previewCanvasRef.current) {
        previewCanvasRef.current.remove();
        previewCanvasRef.current = null;
      }
    };
  }, [activeTool, activeChartIndex, chartContainersRef, chartInstancesRef]);

  return {
    canZoomOut,
    zoomOut,
  };
}
