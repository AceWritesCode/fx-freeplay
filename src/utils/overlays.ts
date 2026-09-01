import { registerOverlay } from 'klinecharts';
import { snapPointToCandle, isReconcilingDrawings, runWorkspaceReconciliation, mirrorLiveOverlayUpdate, DrawingChartAdapter, getOriginalDrawingId } from '@/engine/charting';
import { useDrawingStore, useLayoutStore } from '@/store';

import { initializeToolFramework, ToolRegistry } from '../framework/tools';

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
  setActiveTool: (tool: string | null) => void,
  handleSelectTool?: (toolName: string) => void
) {
  let defaultSettings: Record<string, any> = {};
  const registeredTool = ToolRegistry.get(toolName) || ToolRegistry.getAll().find((t: any) => t.createOverlayDef?.().name === toolName);
  if (registeredTool) {
    if (registeredTool.defaultTemplates && registeredTool.defaultTemplates.length > 0) {
      defaultSettings = { ...registeredTool.defaultTemplates[0].commonSettings };
    } else if (registeredTool.settingsSchema) {
      registeredTool.settingsSchema.forEach((field: any) => {
        if (field.defaultValue !== undefined) {
          defaultSettings[field.id] = field.defaultValue;
        }
      });
    }
  }

  const lookupKey = registeredTool?.id || toolName;
  try {
    const saved = localStorage.getItem(`fx_default_settings_${lookupKey}`) || localStorage.getItem(`fx_default_settings_${toolName}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      defaultSettings = { ...defaultSettings, ...parsed };
    }
  } catch (e) {
    console.error(e);
  }

  if (lookupKey === 'text' || toolName === 'text' || lookupKey === 'fxText' || toolName === 'fxText') {
    defaultSettings.showBorder = false;
    defaultSettings.fillBackground = false;
  }

  const overlayOptions: any = {
    name: toolName,
    extendData: {
      customSettings: defaultSettings,
      ...(lookupKey === 'text' || toolName === 'text' || lookupKey === 'fxText' || toolName === 'fxText' ? { isNewText: true } : {})
    },
    onDrawEnd: (event: any) => {
      const chartIdx = chartInstanceRef.current?._chartIndex ?? 0;
      console.log(`[DRAW CREATED]\ntype: ${toolName}\nid: ${event.overlay.id}\nsourceChart: chart-${chartIdx}`);

      // Call custom tool onDrawEnd hook if defined in registry (resolving by ID or overlay name)
      const registeredTool = ToolRegistry.get(toolName) || ToolRegistry.getAll().find((t: any) => t.createOverlayDef?.().name === toolName);
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
        const cleanExtendData = JSON.parse(JSON.stringify(event.overlay.extendData || {}));
        delete cleanExtendData.isHovered;
        delete cleanExtendData.isEditingText;
        delete cleanExtendData.hoveredAnchorIndex;
        delete cleanExtendData.draggedIndex;
        delete cleanExtendData.startPoints;
        delete cleanExtendData.startPointsPixels;
        delete cleanExtendData.startMousePixel;
        delete cleanExtendData.startMousePt;
        delete cleanExtendData.liveBrushPoints;
        delete cleanExtendData.isLiveDrawing;

        const drawingObj = {
          id: event.overlay.id,
          name: event.overlay.name || toolName,
          points: JSON.parse(JSON.stringify(event.overlay.points || [])),
          extendData: {
            ...cleanExtendData,
            sourceSlotIndex,
          },
          lock: !!event.overlay.lock,
          visible: event.overlay.visible !== false,
          symbol: currentSymbol.toUpperCase(),
        };
        useDrawingStore.getState().addSymbolDrawing(currentSymbol, drawingObj);
      }

      const stayInDrawingMode = useDrawingStore.getState().isStayInDrawingMode;

      if (stayInDrawingMode && handleSelectTool) {
        // Full re-arm: creates a new overlay, re-disables scroll/zoom, same as clicking the tool again
        // Small timeout so the current draw cycle fully finishes first
        setTimeout(() => {
          handleSelectTool(toolName);
        }, 50);
      } else {
        setActiveTool(null);

        // Auto-select the newly created drawing so the floating toolbar appears immediately
        if (actualChart) {
          actualChart._clickedOnOverlay = true;
        }
        chartInstancesRef.current.forEach((c: any) => {
          if (c) c._clickedOnOverlay = true;
        });
        if (actualChart && actualChart._setSelectedOverlayIds) {
          actualChart._setSelectedOverlayIds([event.overlay.id]);
        }
      }

      runWorkspaceReconciliation(chartInstancesRef);
      if (actualChart && actualChart._onHoverChange) {
        actualChart._onHoverChange();
      }
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

      DrawingChartAdapter.invalidatePane(event.chart);
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

      DrawingChartAdapter.invalidatePane(event.chart);
      if (event.chart._onHoverChange) {
        event.chart._onHoverChange();
      }
      return true;
    },
    onPressedMoveStart: (event: any) => {
      const actualChart = event.chart || chartInstanceRef.current;
      const isEraser = actualChart?._activeTool === 'eraser' || (actualChart?._activeCursorTool === 'eraser');
      if (isEraser) {
        const rawId = event.overlay?.id;
        if (rawId) {
          const id = getOriginalDrawingId(rawId);
          useDrawingStore.getState().removeSymbolDrawingById(id);
          runWorkspaceReconciliation(chartInstancesRef);
        }
        return;
      }

      if (actualChart) {
        actualChart._clickedOnOverlay = true;
      }
      chartInstancesRef.current.forEach((c: any) => {
        if (c) c._clickedOnOverlay = true;
      });

      // ── Anchor hit-test ───────────────────────────────────────────────────
      // IMPORTANT: perform hit-test and set _activeDraggingIndex BEFORE calling
      // _setSelectedOverlayIds. Calling _setSelectedOverlayIds triggers Zustand's
      // selection effect synchronously, which calls runWorkspaceReconciliation.
      // The reconciler checks chart._activeDraggingIndex to decide whether to
      // protect the overlay's extendData from being overwritten. If _activeDraggingIndex
      // is still null at that point, the reconciler wipes extendData.draggedIndex,
      // making onPressedMoving fall through to body-drag even when an anchor was hit.
      const rawPoints = event.overlay.points || [];
      const cleanPoints = rawPoints.map((p: any) => ({
        ...(p.timestamp !== undefined ? { timestamp: p.timestamp } : {}),
        ...(p.dataIndex !== undefined ? { dataIndex: p.dataIndex } : {}),
        value: p.value,
      }));
      let pts = event.chart.convertToPixel(cleanPoints, { paneId: 'candle_pane' });
      if (!pts || !Array.isArray(pts) || pts.some((p: any) => !p || typeof p.x !== 'number')) {
        pts = event.chart.convertToPixel(rawPoints, { paneId: 'candle_pane' });
      }

      const customSettings = event.overlay?.extendData?.customSettings || {};
      if (customSettings.isAnchored && customSettings.pinnedPixelPosition) {
        const fp = customSettings.pinnedPixelPosition;
        pts = [
          { x: fp.x, y: fp.y },
          { x: fp.x + (fp.width || 120), y: fp.y + 16 }
        ];
        const p1Conv = event.chart.convertFromPixel([{ x: fp.x, y: fp.y }], { paneId: 'candle_pane' })?.[0];
        const p2Conv = event.chart.convertFromPixel([{ x: fp.x + (fp.width || 120), y: fp.y + 16 }], { paneId: 'candle_pane' })?.[0];
        if (p1Conv && p2Conv) {
          const nextPoints = [
            { timestamp: p1Conv.timestamp, value: p1Conv.value, dataIndex: p1Conv.dataIndex },
            { timestamp: p2Conv.timestamp, value: p2Conv.value ?? p1Conv.value, dataIndex: p2Conv.dataIndex }
          ];
          event.overlay.points = nextPoints;

          const cleanCustomSettings = { ...customSettings };
          delete cleanCustomSettings.pinnedPixelPosition;
          delete cleanCustomSettings.fixedPixelPosition;

          event.chart.overrideOverlay({
            id: event.overlay.id,
            points: nextPoints,
            extendData: {
              ...(event.overlay.extendData || {}),
              customSettings: cleanCustomSettings
            }
          });

          const originalId = getOriginalDrawingId(event.overlay.id);
          const resolved = useDrawingStore.getState().findSymbolByDrawingId(originalId);
          if (resolved) {
            useDrawingStore.getState().updateSymbolDrawing(resolved.symbol, originalId, {
              points: nextPoints,
              extendData: {
                ...(resolved.drawing.extendData || {}),
                customSettings: cleanCustomSettings
              }
            });
          }
        }
      }

      if (toolName === 'fxText' || toolName === 'text') {
        const p1Pixel = Array.isArray(pts) && pts[0] ? pts[0] : { x: event.x, y: event.y };
        const cs = event.overlay?.extendData?.customSettings || {};
        const boxW = cs.boxWidth !== undefined ? cs.boxWidth : 180;
        const fontSize = cs.fontSize || 14;
        const lineHeight = Math.max(16, Math.round(fontSize * 1.35));
        const boxH = Math.max(32, 16 + lineHeight);
        pts = [
          { x: p1Pixel.x, y: p1Pixel.y },
          { x: p1Pixel.x + boxW, y: p1Pixel.y + boxH / 2 }
        ];
      }

      let minDistance = Infinity;
      let closestIndex = 0;
      if (Array.isArray(pts)) {
        pts.forEach((pt: any, idx: number) => {
          if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
            const dist = Math.sqrt((pt.x - event.x) ** 2 + (pt.y - event.y) ** 2);
            if (dist < minDistance) {
              minDistance = dist;
              closestIndex = idx;
            }
          }
        });
      }

      const isHandle = (toolName !== 'brush' && toolName !== 'highlighter' && event.overlay?.name !== 'brush' && event.overlay?.name !== 'highlighter') && minDistance <= 22;
      const currentDraggedIndex = isHandle ? closestIndex : null;

      // Set drag index on BOTH chart references before selection fires reconciliation
      if (chartInstanceRef.current) {
        chartInstanceRef.current._activeDraggingIndex = currentDraggedIndex;
      }
      if (event.chart) {
        event.chart._activeDraggingIndex = currentDraggedIndex;
      }
      // ─────────────────────────────────────────────────────────────────────

      const rawId = event.overlay.id;
      const id = getOriginalDrawingId(rawId);

      // Now safe to call _setSelectedOverlayIds — reconciler will see the drag index above
      if (actualChart && actualChart._setSelectedOverlayIds && !id.startsWith('sync_')) {
        const isCtrl =
          actualChart?._isCtrlPressedRef?.current ||
          (event as any)?.originalEvent?.ctrlKey ||
          (event as any)?.originalEvent?.metaKey ||
          (event as any)?.event?.ctrlKey ||
          (event as any)?.event?.metaKey ||
          false;
        const currentSelected = useDrawingStore.getState().selectedOverlayIds || actualChart._selectedOverlayIds || [];
        if (!currentSelected.includes(id)) {
          if (!isCtrl) {
            actualChart._setSelectedOverlayIds([id]);
          }
        }
      }

      if (event.overlay) {
        event.overlay.currentPointIndex = isHandle ? closestIndex : -1;
        delete event.overlay.prevPoints;
      }

      const startMousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];
      const startMousePixel = { x: event.x, y: event.y };
      const startPointsPixels = pts || event.chart.convertToPixel(rawPoints, { paneId: 'candle_pane' });

      const overrideOpts = {
        extendData: {
          ...(event.overlay.extendData || {}),
          hoveredAnchorIndex: null, // Clear any stale hover state from previous handle interactions
          draggedIndex: currentDraggedIndex,
          startPoints: JSON.parse(JSON.stringify(event.overlay.points)),
          startPointsPixels,
          startMousePixel,
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
      // Read draggedIndex from extendData if it was set by onPressedMoveStart.
      // Fall back to chart._activeDraggingIndex (set on event.chart directly before selection fires).
      // Note: draggedIndex can be null (body drag) or a number (anchor index). Both are valid values.
      // We check 'draggedIndex' key existence rather than !== undefined to catch the null case.
      let draggedIndex: number | null;
      const extendData = event.overlay.extendData;
      if (extendData && 'draggedIndex' in extendData) {
        draggedIndex = extendData.draggedIndex;
      } else {
        draggedIndex = event.chart?._activeDraggingIndex ?? chartInstanceRef.current?._activeDraggingIndex ?? null;
      }

      // 1. Prioritize custom tool onPressedMoving hook if defined in registry
      const registeredTool = ToolRegistry.get(toolName);
      if (registeredTool && registeredTool.onPressedMoving) {
        const result = registeredTool.onPressedMoving(event, draggedIndex);
        if (result && typeof result === 'object') {
          const overridePayload: any = { id: event.overlay.id };
          if (result.points) overridePayload.points = result.points;
          if ((result as any).extendData) overridePayload.extendData = (result as any).extendData;
          event.chart.overrideOverlay(overridePayload);
          DrawingChartAdapter.invalidatePane(event.chart);
          mirrorLiveOverlayUpdate(event.chart, event.overlay.id, overridePayload, chartInstancesRef);
          return;
        }
      }

      if (draggedIndex === null || toolName === 'brush' || toolName === 'highlighter' || event.overlay?.name === 'brush' || event.overlay?.name === 'highlighter') {
        const startPoints = event.overlay.extendData?.startPoints;
        const startMousePixel = event.overlay.extendData?.startMousePixel;
        const startPointsPixels = event.overlay.extendData?.startPointsPixels;

        if (startPoints && startMousePixel && startPointsPixels && Array.isArray(startPointsPixels)) {
          const dx = event.x - startMousePixel.x;
          const dy = event.y - startMousePixel.y;

          const targetPixels = startPointsPixels.map((pt: any) => ({
            x: pt.x + dx,
            y: pt.y + dy
          }));

          const convertedPoints = event.chart.convertFromPixel(targetPixels, { paneId: 'candle_pane' });

          if (convertedPoints && convertedPoints.length === startPoints.length) {
            const newPoints = startPoints.map((pt: any, i: number) => {
              const conv = convertedPoints[i];
              return {
                ...pt,
                timestamp: conv?.timestamp ?? pt.timestamp,
                value: conv?.value ?? pt.value,
                ...(conv?.dataIndex !== undefined ? { dataIndex: conv.dataIndex } : {})
              };
            });

            event.chart.overrideOverlay({
              id: event.overlay.id,
              points: newPoints
            });
            mirrorLiveOverlayUpdate(event.chart, event.overlay.id, { points: newPoints }, chartInstancesRef);
          }
        }

        if (event.chart._handleMultiMove) {
          event.chart._handleMultiMove(event);
        }
        return;
      }

      const startPoints = event.overlay.extendData?.startPoints;
      const initialPoints = (startPoints && Array.isArray(startPoints) && startPoints.length === event.overlay.points?.length)
        ? startPoints
        : event.overlay.points;

      if (toolName === 'trendLine') {
        if (initialPoints && initialPoints.length === 2) {
          const movingIndex = draggedIndex;
          const baseIndex = draggedIndex === 0 ? 1 : 0;
          const pBase = initialPoints[baseIndex];
          const isAngleSnap = isShiftPressedRef?.current || event.chart?._isCtrlPressedRef?.current || event.chart?._isShiftPressedRef?.current || false;
          
          if (isAngleSnap && pBase) {
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
                  const newPoints = [...initialPoints];
                  newPoints[movingIndex] = snappedPoints[0];
                  event.chart.overrideOverlay({
                    id: event.overlay.id,
                    points: newPoints
                  });
                  mirrorLiveOverlayUpdate(event.chart, event.overlay.id, { points: newPoints }, chartInstancesRef);
                  return;
                }
              }
            }
          }
        }
      }

      // Default free movement for any handle — apply magnet snap if active
      if (initialPoints && draggedIndex !== null) {
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
          const newPoints = [...initialPoints];
          newPoints[draggedIndex] = currentPoints[0];
          event.chart.overrideOverlay({
            id: event.overlay.id,
            points: newPoints
          });
          mirrorLiveOverlayUpdate(event.chart, event.overlay.id, { points: newPoints }, chartInstancesRef);
        }
      } else if (event.overlay && event.overlay.points) {
        // Live in-progress drawing creation point updates
        mirrorLiveOverlayUpdate(event.chart, event.overlay.id, { points: event.overlay.points }, chartInstancesRef);
      }
    },
    onPressedMoveEnd: (event: any) => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current._activeDraggingIndex = null;
      }
      // Mirror on event.chart to stay symmetric with onPressedMoveStart
      if (event.chart) {
        event.chart._activeDraggingIndex = null;
      }
      if (event.overlay) {
        event.overlay.currentPointIndex = -1;
        delete event.overlay.prevPoints;
      }
      const overrideOpts = {
        extendData: {
          ...(event.overlay.extendData || {}),
          hoveredAnchorIndex: null,
          draggedIndex: null,
          startPoints: undefined,
          startPointsPixels: undefined,
          startMousePixel: undefined,
          startMousePt: undefined
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
          const cleanExtendData = JSON.parse(JSON.stringify(event.overlay.extendData || {}));
          delete cleanExtendData.isHovered;
          delete cleanExtendData.isEditingText;
          delete cleanExtendData.hoveredAnchorIndex;
          delete cleanExtendData.draggedIndex;
          delete cleanExtendData.startPoints;
          delete cleanExtendData.startPointsPixels;
          delete cleanExtendData.startMousePixel;
          delete cleanExtendData.startMousePt;

          useDrawingStore.getState().updateSymbolDrawing(targetSymbol, overlayId, {
            points: JSON.parse(JSON.stringify(event.overlay.points || [])),
            extendData: cleanExtendData,
          });
          runWorkspaceReconciliation(chartInstancesRef);
        }
      }
    },
    onClick: (event: any) => {
      const rawId = event.overlay.id;
      const id = getOriginalDrawingId(rawId);

      const actualChart = event.chart || chartInstanceRef.current;
      if (actualChart?._activeTool === 'eraser' || actualChart?._activeCursorTool === 'eraser') {
        useDrawingStore.getState().removeSymbolDrawingById(id);
        runWorkspaceReconciliation(chartInstancesRef);
        return true;
      }
      if (actualChart) {
        actualChart._clickedOnOverlay = true;
      }
      chartInstancesRef.current.forEach((c: any) => {
        if (c) c._clickedOnOverlay = true;
      });
      if (actualChart && actualChart._setSelectedOverlayIds && !id.startsWith('sync_')) {
        const isCtrl =
          actualChart?._isCtrlPressedRef?.current ||
          (event as any)?.originalEvent?.ctrlKey ||
          (event as any)?.originalEvent?.metaKey ||
          (event as any)?.event?.ctrlKey ||
          (event as any)?.event?.metaKey ||
          false;
        const currentSelected = useDrawingStore.getState().selectedOverlayIds || actualChart._selectedOverlayIds || [];
        if (isCtrl) {
          if (currentSelected.includes(id)) {
            actualChart._setSelectedOverlayIds(currentSelected.filter((x: string) => x !== id));
          } else {
            actualChart._setSelectedOverlayIds([...currentSelected, id]);
          }
        } else {
          actualChart._setSelectedOverlayIds([id]);
        }
      }
      return true;
    }
  };

  return overlayOptions;
}
