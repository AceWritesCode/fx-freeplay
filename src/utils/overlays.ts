import { registerOverlay } from 'klinecharts';

export function snapPointToCandle(event: any, rawX: number, rawY: number) {
  // Always read mode from the live chart-level flag so drag events on
  // pre-existing overlays still respect the current magnet state.
  const mode: string = event.chart._magnetMode ?? event.overlay.mode ?? 'normal';
  if (mode !== 'normal_magnet' && mode !== 'weak_magnet' && mode !== 'strong_magnet') {
    return null;
  }
  const point = event.chart.convertFromPixel([{ x: rawX, y: rawY }], { paneId: 'candle_pane' })[0];
  if (!point) return null;

  const dataList = event.chart.getDataList();
  if (!dataList || dataList.length === 0) return null;

  const rawIndex = Math.round(point.dataIndex);
  const dataIndex = Math.max(0, Math.min(dataList.length - 1, rawIndex));
  const candle = dataList[dataIndex];
  if (!candle) return null;

  const prices = [candle.open, candle.high, candle.low, candle.close];
  let closestPrice = prices[0];
  let minPriceDiff = Math.abs(point.value - closestPrice);
  for (let i = 1; i < prices.length; i++) {
    const diff = Math.abs(point.value - prices[i]);
    if (diff < minPriceDiff) {
      minPriceDiff = diff;
      closestPrice = prices[i];
    }
  }

  const sensitivity = event.overlay.modeSensitivity;

  if (mode === 'strong_magnet') {
    // 999999 = always snap (user set slider to 100). Otherwise use pixel threshold.
    if (sensitivity === undefined || sensitivity >= 999999) {
      return {
        value: closestPrice,
        timestamp: point.timestamp,
        dataIndex: point.dataIndex
      };
    }
    // Proximity-based snap for strong mode when user reduced from "always"
    const closestPixelResult = event.chart.convertToPixel(
      [{ timestamp: candle.timestamp, value: closestPrice }],
      { paneId: 'candle_pane' }
    );
    const closestPixelY = closestPixelResult?.[0]?.y;
    if (closestPixelY !== undefined && Math.abs(rawY - closestPixelY) <= sensitivity) {
      return {
        value: closestPrice,
        timestamp: point.timestamp,
        dataIndex: point.dataIndex
      };
    }
    return null;
  }

  if (mode === 'normal_magnet' || mode === 'weak_magnet') {
    const defaultSens = mode === 'normal_magnet' ? 30 : 10;
    const proximitySens = sensitivity || defaultSens;
    const closestPixelResult = event.chart.convertToPixel(
      [{ timestamp: candle.timestamp, value: closestPrice }],
      { paneId: 'candle_pane' }
    );
    const closestPixelY = closestPixelResult?.[0]?.y;
    if (closestPixelY !== undefined) {
      const pixelDist = Math.abs(rawY - closestPixelY);
      if (pixelDist <= proximitySens) {
        return {
          value: closestPrice,
          timestamp: point.timestamp,
          dataIndex: point.dataIndex
        };
      }
    }
  }

  return null;
}

import { initializeToolFramework } from '../framework/tools';

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
  syncAllDrawings: () => void,
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
      if (chartInstanceRef.current) {
        chartInstanceRef.current._justFinishedDrawingId = event.overlay.id;
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
      setActiveTool(null);
      
      // Auto-select the newly created drawing so the floating toolbar appears immediately
      if (chartInstanceRef.current && chartInstanceRef.current._setSelectedOverlayIds) {
        chartInstanceRef.current._setSelectedOverlayIds([event.overlay.id]);
      }

      setTimeout(() => syncAllDrawings(), 50);
      return true;
    },
    onRemoved: (event: any) => {
      const syncMatch = event.overlay.id?.match(/^sync_(.+)_from_(\d+)$/);
      if (syncMatch) {
        const originalId = syncMatch[1];
        const sourceIndex = parseInt(syncMatch[2]);
        const sourceChart = chartInstancesRef.current[sourceIndex];
        if (sourceChart) {
          sourceChart.removeOverlay({ id: originalId });
        }
      }
      setTimeout(() => syncAllDrawings(), 50);
    },
    onMouseEnter: (event: any) => {
      event.chart.overrideOverlay({
        id: event.overlay.id,
        extendData: {
          ...(event.overlay.extendData || {}),
          isHovered: true
        }
      });
      const syncMatch = event.overlay.id?.match(/^sync_(.+)_from_(\d+)$/);
      if (syncMatch) {
        const originalId = syncMatch[1];
        const sourceIndex = parseInt(syncMatch[2]);
        const sourceChart = chartInstancesRef.current[sourceIndex];
        if (sourceChart) {
          const originalOverlay = sourceChart.getOverlays().find((o: any) => o.id === originalId);
          if (originalOverlay) {
            sourceChart.overrideOverlay({
              id: originalId,
              extendData: {
                ...(originalOverlay.extendData || {}),
                isHovered: true
              }
            });
            if (sourceChart._onHoverChange) {
              sourceChart._onHoverChange();
            }
          }
        }
      }
      event.chart.resize();
      if (event.chart._onHoverChange) {
        event.chart._onHoverChange();
      }
      return true;
    },
    onMouseLeave: (event: any) => {
      event.chart.overrideOverlay({
        id: event.overlay.id,
        extendData: {
          ...(event.overlay.extendData || {}),
          isHovered: false
        }
      });
      const syncMatch = event.overlay.id?.match(/^sync_(.+)_from_(\d+)$/);
      if (syncMatch) {
        const originalId = syncMatch[1];
        const sourceIndex = parseInt(syncMatch[2]);
        const sourceChart = chartInstancesRef.current[sourceIndex];
        if (sourceChart) {
          const originalOverlay = sourceChart.getOverlays().find((o: any) => o.id === originalId);
          if (originalOverlay) {
            sourceChart.overrideOverlay({
              id: originalId,
              extendData: {
                ...(originalOverlay.extendData || {}),
                isHovered: false
              }
            });
            if (sourceChart._onHoverChange) {
              sourceChart._onHoverChange();
            }
          }
        }
      }
      event.chart.resize();
      if (event.chart._onHoverChange) {
        event.chart._onHoverChange();
      }
      return true;
    },
    onPressedMoveStart: (event: any) => {
      const pts = event.chart.convertToPixel(event.overlay.points, { paneId: 'candle_pane' });
      let closestIndex = 0;
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
      const isHandle = minDistance < 12;
      const startMousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];
      event.chart.overrideOverlay({
        id: event.overlay.id,
        extendData: { 
          draggedIndex: isHandle ? closestIndex : null,
          startPoints: JSON.parse(JSON.stringify(event.overlay.points)),
          startMousePt
        }
      });

      if (event.chart._initMultiMove) {
        event.chart._initMultiMove(event);
      }
    },
    onPressedMoving: (event: any) => {
      const draggedIndex = event.overlay.extendData?.draggedIndex;
      if (draggedIndex === undefined) return;

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
        }

        if (event.chart._handleMultiMove) {
          event.chart._handleMultiMove(event);
        }
        if (event.chart._onDrawingSync) {
          event.chart._onDrawingSync();
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
                  if (event.chart._onDrawingSync) {
                    event.chart._onDrawingSync();
                  }
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
      if (event.chart._onDrawingSync) {
        event.chart._onDrawingSync();
      }
    },
    onClick: (event: any) => {
      const id = event.overlay.id;
      if (event.chart._activeTool === 'eraser') {
        const syncMatch = id?.match(/^sync_(.+)_from_(\d+)$/);
        if (syncMatch) {
          const originalId = syncMatch[1];
          const sourceIndex = parseInt(syncMatch[2]);
          const sourceChart = event.chart._chartInstancesRef?.current?.[sourceIndex];
          if (sourceChart) {
            sourceChart.removeOverlay({ id: originalId });
          }
        }
        event.chart.removeOverlay({ id });
        setTimeout(() => {
          if (event.chart._onDrawingSync) {
            event.chart._onDrawingSync();
          }
        }, 50);
        return true;
      }
      if (event.chart._justFinishedDrawingId === id) {
        event.chart._justFinishedDrawingId = null;
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
