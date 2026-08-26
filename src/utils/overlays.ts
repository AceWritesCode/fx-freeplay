import { registerOverlay } from 'klinecharts';
import { snapPointToCandle, isReconcilingDrawings, runWorkspaceReconciliation } from '@/engine/charting';
import { useDrawingStore, useLayoutStore } from '@/store';

import { initializeToolFramework, ToolRegistry } from '../framework/tools';

export function syncSyncedCopyToOriginal(_chart: any, _overlayId: string, _overrideOptions: any) {
  // Deprecated legacy function: storage is the single source of truth under storage-first architecture.
  return;
}

export function registerCustomOverlays() {
  // Initialize new tool framework
  initializeToolFramework();

  // Custom drawing tools (rect, priceChannel) have been removed for the new framework.
  // Their original code is backed up in src/utils/old-overlays-backup.ts.

  // 1. Custom Last Price Line (Unclamped)
  registerOverlay({
    name: 'customPriceLine',
    totalStep: 0,
    needDefaultPointFigure: false,
    createPointFigures: ({ chart, yAxis, bounding }: any) => {
      if (!chart._showPriceLine) return [];

      const dataList = chart.getDataList();
      if (dataList.length === 0) return [];
      const lastData = dataList[dataList.length - 1];
      if (!lastData) return [];

      const close = lastData.close;
      const open = lastData.open;

      // Calculate Y coordinate without clamping
      const priceY = yAxis.convertToPixel(close);

      // Determine color
      let color = chart._priceLineColor || '#2196f3';
      if (chart._priceLineUseCandleColor) {
        const prevData = dataList[dataList.length - 2];
        const comparePrice = prevData ? prevData.close : open;
        if (close > comparePrice) {
          color = chart._bullColor || '#26a69a';
        } else if (close < comparePrice) {
          color = chart._bearColor || '#ef5350';
        } else {
          color = '#8b93a6';
        }
      }

      const width = bounding?.width ?? 1000;

      return [
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x: 0, y: priceY },
              { x: width, y: priceY }
            ]
          },
          styles: {
            style: chart._priceLineStyle || 'dashed',
            color: color,
            size: chart._priceLineSize || 1,
            dashedValue: [4, 4]
          }
        }
      ];
    }
  });

  // 2. Customizable Session Breaks overlay (draws vertical lines at day transitions)
  registerOverlay({
    name: 'sessionBreaks',
    totalStep: 2,           // needs at least 1 point so createPointFigures gets called
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ chart, bounding }: any) => {
      if (!chart._showSessionBreaks) {
        return [];
      }

      // Hide session breaks on Daily, Weekly, and Monthly charts to avoid clutter
      const tf: string = chart._loadedTimeframe || '1m';
      if (tf === 'D' || tf === 'W' || tf === 'M') {
        return [];
      }

      const dataList = chart.getDataList();
      if (!dataList || dataList.length === 0) return [];

      const figures: any[] = [];
      const height = bounding?.height ?? 800;
      const color = chart._sessionBreaksColor || 'rgba(139, 147, 166, 0.4)';
      const style = chart._sessionBreaksStyle || 'dashed';
      const size = chart._sessionBreaksSize || 1;

      // Find all transitions of days
      const dayTransitionIndices: number[] = [];
      for (let i = 1; i < dataList.length; i++) {
        const prevCandle = dataList[i - 1];
        const currCandle = dataList[i];
        if (!prevCandle || !currCandle) continue;

        const prevDate = new Date(prevCandle.timestamp);
        const currDate = new Date(currCandle.timestamp);
        
        const isNewDay = prevDate.getDate() !== currDate.getDate() ||
                         prevDate.getMonth() !== currDate.getMonth() ||
                         prevDate.getFullYear() !== currDate.getFullYear();

        if (isNewDay) {
          dayTransitionIndices.push(i);
        }
      }

      // Convert only those day transitions to lines
      dayTransitionIndices.forEach(idx => {
        const candle = dataList[idx];
        const xResult = chart.convertToPixel(
          [{ timestamp: candle.timestamp, value: candle.close }],
          { paneId: 'candle_pane' }
        );
        const x = xResult?.[0]?.x;
        if (x !== undefined && !isNaN(x)) {
          figures.push({
            type: 'line',
            attrs: {
              coordinates: [
                { x, y: 0 },
                { x, y: height }
              ]
            },
            styles: {
              style: style,
              color: color,
              size: size,
              dashedValue: [4, 4]
            }
          });
        }
      });

      return figures;
    }
  });
}

export function getInteractiveOverlayOptions(
  toolName: string,
  chartInstanceRef: any,
  chartInstancesRef: any,
  isShiftPressedRef: any,
  _syncAllDrawings: () => void,
  setActiveTool: (tool: string | null) => void
) {
  let defaultSettings = {};
  try {
    const saved = localStorage.getItem(`fx_default_settings_${toolName}`);
    if (saved) {
      defaultSettings = JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }

  const overlayOptions: any = {
    name: toolName,
    extendData: {
      customSettings: defaultSettings
    },
    onDrawEnd: (event: any) => {
      const chartIdx = chartInstanceRef.current?._chartIndex ?? 0;
      console.log(`[DRAW CREATED]\ntype: ${toolName}\nid: ${event.overlay.id}\nsourceChart: chart-${chartIdx}`);

      // Call custom tool onDrawEnd hook if defined in registry
      const registeredTool = ToolRegistry.get(toolName);
      if (registeredTool && registeredTool.onDrawEnd) {
        registeredTool.onDrawEnd(event);
      }

      if (chartInstanceRef.current) {
        chartInstanceRef.current._activeDrawingId = null;
        chartInstanceRef.current._clickedOnOverlay = true;
        chartInstanceRef.current.setScrollEnabled(true);
        chartInstanceRef.current.setZoomEnabled(true);

        // Assign active folder if any
        if (chartInstanceRef.current._activeFolderId) {
          chartInstanceRef.current.overrideOverlay({
            id: event.overlay.id,
            extendData: {
              ...event.overlay.extendData,
              folderId: chartInstanceRef.current._activeFolderId
            }
          });
        }
      }
      // Store-first migration: Save newly created drawing object directly to useDrawingStore upfront
      const actualChart = event.chart || chartInstanceRef.current;
      const actualChartIndex = typeof actualChart?._chartIndex === 'number'
        ? actualChart._chartIndex
        : useLayoutStore.getState().activeChartIndex;
      const currentSymbol = actualChart?._symbol || useLayoutStore.getState().slots?.[actualChartIndex]?.symbol;

      if (currentSymbol && event.overlay) {
        const sourceSlotIndex = actualChartIndex;

        const drawingObj = {
          id: event.overlay.id,
          name: event.overlay.name || toolName,
          points: JSON.parse(JSON.stringify(event.overlay.points || [])),
          extendData: {
            ...JSON.parse(JSON.stringify(event.overlay.extendData || {})),
            sourceSlotIndex,
          },
          lock: !!event.overlay.lock,
          visible: event.overlay.visible !== false,
          symbol: currentSymbol.toUpperCase(),
        };
        useDrawingStore.getState().addSymbolDrawing(currentSymbol, drawingObj);
      }

      setActiveTool(null);
      
      // Auto-select the newly created drawing so the floating toolbar appears immediately
      if (chartInstanceRef.current && chartInstanceRef.current._setSelectedOverlayIds) {
        chartInstanceRef.current._setSelectedOverlayIds([event.overlay.id]);
      }

      setTimeout(() => runWorkspaceReconciliation(chartInstancesRef), 50);
      return true;
    },
    onRemoved: (event: any) => {
      if (isReconcilingDrawings()) {
        return;
      }
      const overlayId = event.overlay?.id;
      if (!overlayId) return;

      useDrawingStore.getState().removeSymbolDrawingById(overlayId);
      runWorkspaceReconciliation(chartInstancesRef);
    },
    onMouseEnter: (event: any) => {
      const overrideOpts = {
        extendData: {
          ...(event.overlay.extendData || {}),
          isHovered: true
        }
      };
      event.chart.overrideOverlay({
        id: event.overlay.id,
        ...overrideOpts
      });

      event.chart.resize();
      if (event.chart._onHoverChange) {
        event.chart._onHoverChange();
      }
      return true;
    },
    onMouseLeave: (event: any) => {
      const overrideOpts = {
        extendData: {
          ...(event.overlay.extendData || {}),
          isHovered: false
        }
      };
      event.chart.overrideOverlay({
        id: event.overlay.id,
        ...overrideOpts
      });

      event.chart.resize();
      if (event.chart._onHoverChange) {
        event.chart._onHoverChange();
      }
      return true;
    },
    onPressedMoveStart: (event: any) => {
      event.chart._clickedOnOverlay = true;
      const hoveredIdx = event.overlay.extendData?.hoveredAnchorIndex;
      let isHandle = false;
      let closestIndex = 0;

      if (hoveredIdx !== undefined && hoveredIdx !== null) {
        isHandle = true;
        closestIndex = hoveredIdx;
      } else {
        const pts = event.chart.convertToPixel(event.overlay.points, { paneId: 'candle_pane' });
        let minDistance = Infinity;
        pts.forEach((pt: any, idx: number) => {
          if (pt) {
            const dist = Math.sqrt((pt.x - event.x) ** 2 + (pt.y - event.y) ** 2);
            if (dist < minDistance) {
              minDistance = dist;
              closestIndex = idx;
            }
          }
        });
        isHandle = minDistance < 12;
      }
      if (chartInstanceRef.current) {
        chartInstanceRef.current._activeDraggingIndex = isHandle ? closestIndex : null;
      }

      const startMousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];
      const overrideOpts = {
        extendData: { 
          ...(event.overlay.extendData || {}),
          draggedIndex: isHandle ? closestIndex : null,
          startPoints: JSON.parse(JSON.stringify(event.overlay.points)),
          startMousePt
        }
      };

      event.chart.overrideOverlay({
        id: event.overlay.id,
        ...overrideOpts
      });

      if (event.chart._initMultiMove) {
        event.chart._initMultiMove(event);
      }
    },
    onPressedMoving: (event: any) => {
      const activeDraggingIndex = chartInstanceRef.current?._activeDraggingIndex;
      const draggedIndex = activeDraggingIndex !== undefined
        ? activeDraggingIndex
        : event.overlay.extendData?.draggedIndex;

      if (draggedIndex === undefined) {
        return;
      }

      if (draggedIndex === null) {
        const startPoints = event.overlay.extendData?.startPoints;
        const startMousePt = event.overlay.extendData?.startMousePt;
        const currentMousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];

        if (startPoints && startMousePt && currentMousePt) {
          const deltaTimestamp = currentMousePt.timestamp - startMousePt.timestamp;
          const deltaValue = currentMousePt.value - startMousePt.value;
          const deltaDataIndex = (currentMousePt.dataIndex !== undefined && startMousePt.dataIndex !== undefined)
            ? currentMousePt.dataIndex - startMousePt.dataIndex
            : 0;

          const newPoints = startPoints.map((pt: any) => ({
            ...pt,
            timestamp: pt.timestamp + deltaTimestamp,
            value: pt.value + deltaValue,
            dataIndex: (pt.dataIndex !== undefined) ? pt.dataIndex + deltaDataIndex : undefined
          }));

          event.chart.overrideOverlay({
            id: event.overlay.id,
            points: newPoints
          });
          syncSyncedCopyToOriginal(event.chart, event.overlay.id, { points: newPoints });
        }

        if (event.chart._handleMultiMove) {
          event.chart._handleMultiMove(event);
        }
        return;
      }

      // Call custom tool onPressedMoving hook if defined in registry
      const registeredTool = ToolRegistry.get(toolName);
      if (registeredTool && registeredTool.onPressedMoving) {
        const result = registeredTool.onPressedMoving(event, draggedIndex);
        if (result && typeof result === 'object' && result.points) {
          event.chart.overrideOverlay({
            id: event.overlay.id,
            points: result.points
          });
        }
        return;
      }

      if (toolName === 'trendLine') {
        const points = event.overlay.points;
        if (points && points.length === 2) {
          const movingIndex = draggedIndex;
          const baseIndex = draggedIndex === 0 ? 1 : 0;
          const pBase = points[baseIndex];
          const isShift = isShiftPressedRef?.current || false;
          
          if (isShift && pBase) {
            const pixels = event.chart.convertToPixel([pBase], { paneId: 'candle_pane' });
            if (pixels && pixels.length > 0 && pixels[0]) {
              const x1 = pixels[0].x;
              const y1 = pixels[0].y;
              const x2 = event.x;
              const y2 = event.y;

              const dx = x2 - x1;
              const dy = y2 - y1;
              const r = Math.sqrt(dx * dx + dy * dy);
              if (r > 0) {
                const angle = Math.atan2(dy, dx);
                const angleSteps = Math.PI / 4;
                const nearestStep = Math.round(angle / angleSteps);
                const snappedAngle = nearestStep * angleSteps;

                const projLength = dx * Math.cos(snappedAngle) + dy * Math.sin(snappedAngle);
                const x2_snapped = x1 + projLength * Math.cos(snappedAngle);
                const y2_snapped = y1 + projLength * Math.sin(snappedAngle);

                const snappedPoints = event.chart.convertFromPixel([{ x: x2_snapped, y: y2_snapped }], { paneId: 'candle_pane' });
                if (snappedPoints && snappedPoints.length > 0 && snappedPoints[0]) {
                  const newPoints = [...points];
                  newPoints[movingIndex] = snappedPoints[0];
                  event.chart.overrideOverlay({
                    id: event.overlay.id,
                    points: newPoints
                  });
                  return;
                }
              }
            }
          }
        }
      }

      // Default free movement for any handle — apply magnet snap if active
      const points = event.overlay.points;
      if (points && draggedIndex !== null) {
        const rawX = event.x;
        const rawY = event.y;
        const mode: string = event.chart._magnetMode ?? 'normal';
        let snappedPt = null;

        if (mode !== 'normal') {
          snappedPt = snapPointToCandle(event, rawX, rawY);
        }

        const currentPoints = snappedPt
          ? [snappedPt]
          : event.chart.convertFromPixel([{ x: rawX, y: rawY }], { paneId: 'candle_pane' });
        if (currentPoints && currentPoints.length > 0 && currentPoints[0]) {
          const newPoints = [...points];
          newPoints[draggedIndex] = currentPoints[0];
          event.chart.overrideOverlay({
            id: event.overlay.id,
            points: newPoints
          });
        }
      }
    },
    onPressedMoveEnd: (event: any) => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current._activeDraggingIndex = undefined;
      }
      const overrideOpts = {
        extendData: {
          ...(event.overlay.extendData || {}),
          draggedIndex: null
        }
      };
      event.chart.overrideOverlay({
        id: event.overlay.id,
        ...overrideOpts
      });

      // Storage-First rule: Only an original drawing (not a sync_* copy) updates storage
      const overlayId = event.overlay?.id;
      if (overlayId && !overlayId.startsWith('sync_')) {
        const resolved = useDrawingStore.getState().findSymbolByDrawingId(overlayId);
        const targetSymbol = resolved?.symbol || event.chart?._symbol;

        if (targetSymbol) {
          useDrawingStore.getState().updateSymbolDrawing(targetSymbol, overlayId, {
            points: JSON.parse(JSON.stringify(event.overlay.points || [])),
            extendData: JSON.parse(JSON.stringify(event.overlay.extendData || {})),
          });
          runWorkspaceReconciliation(chartInstancesRef);
        }
      }
    },
    onClick: (event: any) => {
      const rawId = event.overlay.id;
      const syncMatch = rawId?.match(/^sync_(.+)_from_(\d+)$/);
      const id = syncMatch ? syncMatch[1] : rawId;

      if (event.chart._activeTool === 'eraser') {
        useDrawingStore.getState().removeSymbolDrawingById(id);
        runWorkspaceReconciliation(chartInstancesRef);
        return true;
      }
      event.chart._clickedOnOverlay = true;
      if (event.chart._setSelectedOverlayIds) {
        const isCtrl = event.chart._isCtrlPressedRef?.current || false;
        const currentSelected = event.chart._selectedOverlayIds || [];
        if (isCtrl) {
          if (currentSelected.includes(id)) {
            event.chart._setSelectedOverlayIds(currentSelected.filter((x: string) => x !== id));
          } else {
            event.chart._setSelectedOverlayIds([...currentSelected, id]);
          }
        } else {
          event.chart._setSelectedOverlayIds([id]);
        }
      }
      return true;
    }
  };

  return overlayOptions;
}
