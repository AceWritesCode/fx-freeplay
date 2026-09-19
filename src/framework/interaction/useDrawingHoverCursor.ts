import { useEffect } from 'react';
import { DrawingChartAdapter, getOriginalDrawingId, runWorkspaceReconciliation } from '@/engine/charting';
import { useDrawingStore } from '@/store';

export interface DrawingHoverCursorConfig {
  chartContainersRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
  chartInstancesRef: React.MutableRefObject<(any | null)[]>;
  selectedOverlayIds: string[];
  hoveredOverlayId: string | null;
  setHoveredOverlayId: (id: string | null) => void;
  handleSelectOverlayIds: (ids: string[]) => void;
  drawingCoord: {
    activeTool: string | null;
    setActiveTool: (t: string | null) => void;
    syncAllDrawings: () => void;
    setDrawingTrigger: React.Dispatch<React.SetStateAction<number>>;
  };
  isDrawingSettingsOpen?: boolean;
  selectedCursorId?: string;
}

const ERASER_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="rgba(239,68,68,0.25)" stroke="#ef4444" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="#ef4444"/></svg>`;
const ERASER_CURSOR = `url("data:image/svg+xml;base64,${btoa(ERASER_CURSOR_SVG)}") 12 12, crosshair`;

export const getDotCursor = (): string => {
  let color = '#ffffff';
  if (typeof document !== 'undefined') {
    const computed = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
    if (computed) color = computed;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="3.5" fill="${color}"/></svg>`;
  return `url("data:image/svg+xml;base64,${btoa(svg)}") 8 8, crosshair`;
};

export interface PromotedOverlayInfo {
  id: string;
  originalZLevel: number;
  temporaryZLevel: number;
}

const getNaturalZLevel = (chart: any, ov: any): number => {
  if (chart?._promotedOverlayInfo && chart._promotedOverlayInfo.id === ov?.id) {
    return chart._promotedOverlayInfo.originalZLevel;
  }
  return typeof ov?.zLevel === 'number' ? ov.zLevel : 0;
};

const isPromotedOverlaySelected = (chart: any, selectedIds?: string[]): boolean => {
  if (!chart?._promotedOverlayInfo) return false;
  const promotedId = chart._promotedOverlayInfo.id;
  const canonicalId = getOriginalDrawingId(promotedId);
  const ids = (selectedIds && selectedIds.length > 0) ? selectedIds : chart._selectedOverlayIds;
  return Array.isArray(ids) && (ids.includes(promotedId) || ids.includes(canonicalId));
};

/**
 * Custom hook to manage global mouse interactions, brush stroke finalization,
 * empty space click deselection, and anchor/body hover hit testing with cursor management.
 */
export function useDrawingHoverCursor({
  chartContainersRef,
  chartInstancesRef,
  selectedOverlayIds,
  hoveredOverlayId,
  setHoveredOverlayId,
  handleSelectOverlayIds,
  drawingCoord,
  isDrawingSettingsOpen = false,
  selectedCursorId = 'cross',
}: DrawingHoverCursorConfig) {
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      chartInstancesRef.current.forEach((chart) => {
        if (chart) chart._isMouseDown = true;
      });

      if (drawingCoord.activeTool === 'eraser') {
        for (let i = 0; i < chartContainersRef.current.length; i++) {
          const container = chartContainersRef.current[i];
          const chart = chartInstancesRef.current[i];
          if (container && chart) {
            const rect = container.getBoundingClientRect();
            if (
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom
            ) {
              const xVal = e.clientX - rect.left;
              const yVal = e.clientY - rect.top;
              const overlays = chart.getOverlays();
              const interactiveOverlays = overlays.filter(
                (ov: any) =>
                  ov.id !== 'custom_price_line_overlay' &&
                  ov.name !== 'customPriceLine' &&
                  ov.id !== 'session_breaks_overlay' &&
                  ov.name !== 'sessionBreaks'
              );

              for (const ov of interactiveOverlays) {
                if (ov.points && Array.isArray(ov.points)) {
                  const cleanPts = ov.points.map((p: any) => ({
                    ...(p.timestamp !== undefined ? { timestamp: p.timestamp } : {}),
                    ...(p.dataIndex !== undefined ? { dataIndex: p.dataIndex } : {}),
                    value: p.value,
                  }));
                  let pts = chart.convertToPixel(cleanPts, { paneId: 'candle_pane' });
                  if (!pts || !Array.isArray(pts) || pts.some((p: any) => !p || typeof p.x !== 'number')) {
                    pts = chart.convertToPixel(ov.points, { paneId: 'candle_pane' });
                  }
                  if (Array.isArray(pts) && pts.length > 0) {
                    let hit = false;
                    for (const pt of pts) {
                      if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
                        if (Math.sqrt((pt.x - xVal) ** 2 + (pt.y - yVal) ** 2) <= 18) {
                          hit = true;
                          break;
                        }
                      }
                    }
                    if (!hit && pts.length >= 2) {
                      for (let j = 0; j < pts.length - 1; j++) {
                        const p1 = pts[j];
                        const p2 = pts[j + 1];
                        if (p1 && p2 && Number.isFinite(p1.x) && Number.isFinite(p1.y) && Number.isFinite(p2.x) && Number.isFinite(p2.y)) {
                          const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
                          let dist = Infinity;
                          if (l2 > 0) {
                            let t = ((xVal - p1.x) * (p2.x - p1.x) + (yVal - p1.y) * (p2.y - p1.y)) / l2;
                            t = Math.max(0, Math.min(1, t));
                            dist = Math.sqrt((xVal - (p1.x + t * (p2.x - p1.x))) ** 2 + (yVal - (p1.y + t * (p2.y - p1.y))) ** 2);
                          } else {
                            dist = Math.sqrt((xVal - p1.x) ** 2 + (yVal - p1.y) ** 2);
                          }
                          if (dist <= 18) {
                            hit = true;
                            break;
                          }
                        }
                      }
                    }
                    if (hit) {
                      const originalId = getOriginalDrawingId(ov.id);
                      useDrawingStore.getState().removeSymbolDrawingById(originalId);
                      runWorkspaceReconciliation(chartInstancesRef);
                      chart._clickedOnOverlay = true;
                      break;
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      chartInstancesRef.current.forEach((chart, index) => {
        if (chart) {
          chart._isMouseDown = false;

          if (chart._promotedOverlayInfo) {
            const isSelected = isPromotedOverlaySelected(chart, selectedOverlayIds);
            if (!isSelected) {
              const container = chartContainersRef.current[index];
              if (container) {
                const rect = container.getBoundingClientRect();
                const xVal = e.clientX - rect.left;
                const yVal = e.clientY - rect.top;
                const ov = chart.getOverlays().find((o: any) => o.id === chart._promotedOverlayInfo.id);
                let nearAnchor = false;
                if (ov && ov.points) {
                  const cleanPts = ov.points.map((p: any) => ({
                    ...(p.timestamp !== undefined ? { timestamp: p.timestamp } : {}),
                    ...(p.dataIndex !== undefined ? { dataIndex: p.dataIndex } : {}),
                    value: p.value,
                  }));
                  let pts = chart.convertToPixel(cleanPts, { paneId: 'candle_pane' });
                  if (!pts || !Array.isArray(pts) || pts.some((p: any) => !p || typeof p.x !== 'number')) {
                    pts = chart.convertToPixel(ov.points, { paneId: 'candle_pane' });
                  }
                  if (Array.isArray(pts)) {
                    nearAnchor = pts.some((pt: any) => pt && typeof pt.x === 'number' && typeof pt.y === 'number' && Math.sqrt((pt.x - xVal) ** 2 + (pt.y - yVal) ** 2) <= 16);
                  }
                }
                if (!nearAnchor) {
                  DrawingChartAdapter.restorePromotedOverlay(chart);
                }
              }
            }
          }
        }
      });

      // Clear selection & reset active tool on empty viewport click (unless clicking on selected item, tree item, or interactive UI)
      const isTreeItemClick =
        e.target instanceof Element &&
        !!e.target.closest('[data-object-tree-item], [data-object-tree-folder], [data-object-tree-candles]');

      const isUIInteraction =
        isDrawingSettingsOpen ||
        (e.target instanceof Element &&
          (!!e.target.closest('[data-floating-ui], .drawing-floating-toolbar, [data-no-deselect], [role="dialog"], [role="menu"], [role="listbox"]') ||
            !!e.target.closest('button, input, select, textarea, [role="button"], [role="menuitem"]')));

      if (!isTreeItemClick && !isUIInteraction) {
        setTimeout(() => {
          const clickedOnAnyOverlay = chartInstancesRef.current.some((c: any) => c?._clickedOnOverlay);
          const activeDrawingInProgress = chartInstancesRef.current.some((c: any) => !!c?._activeDrawingId);

          if (!clickedOnAnyOverlay && !activeDrawingInProgress) {
            handleSelectOverlayIds([]);
            if (
              drawingCoord.activeTool &&
              drawingCoord.activeTool !== 'eraser' &&
              drawingCoord.activeTool !== 'measure' &&
              drawingCoord.activeTool !== 'zoomIn' &&
              drawingCoord.activeTool !== 'brush' &&
              drawingCoord.activeTool !== 'highlighter'
            ) {
              drawingCoord.setActiveTool(null);
              chartInstancesRef.current.forEach((c: any) => {
                if (c) {
                  c.setScrollEnabled?.(true);
                  c.setZoomEnabled?.(true);
                }
              });
            }
          }

          chartInstancesRef.current.forEach((c: any) => {
            if (c) c._clickedOnOverlay = false;
          });
        }, 50);
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      let activeIndex = -1;
      let containerRect: DOMRect | null = null;
      for (let i = 0; i < chartContainersRef.current.length; i++) {
        const container = chartContainersRef.current[i];
        if (container) {
          const rect = container.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            activeIndex = i;
            containerRect = rect;
            break;
          }
        }
      }

      if (activeIndex === -1 || !containerRect) {
        if (hoveredOverlayId !== null) {
          setHoveredOverlayId(null);
        }
        chartInstancesRef.current.forEach((c: any) => {
          if (c) {
            c._isBodyHovered = false;
            c._isAnchorHovered = false;
            c._hoveredOverlay = null;
            c._preparedDuplicate = null;
          }
          if (c?._promotedOverlayInfo && !c._isMouseDown) {
            if (!isPromotedOverlaySelected(c, selectedOverlayIds)) {
              DrawingChartAdapter.restorePromotedOverlay(c);
            }
          }
        });
        return;
      }

      chartInstancesRef.current.forEach((c: any, idx: number) => {
        if (idx !== activeIndex && c) {
          c._isBodyHovered = false;
          c._isAnchorHovered = false;
          c._hoveredOverlay = null;
          c._preparedDuplicate = null;
          if (c._promotedOverlayInfo && !c._isMouseDown) {
            if (!isPromotedOverlaySelected(c, selectedOverlayIds)) {
              DrawingChartAdapter.restorePromotedOverlay(c);
            }
          }
        }
      });

      const chart = chartInstancesRef.current[activeIndex];
      if (!chart) return;

      if (chart._isMarqueeSelecting) {
        if (hoveredOverlayId !== null) {
          setHoveredOverlayId(null);
        }
        chart._isBodyHovered = false;
        chart._isAnchorHovered = false;
        chart._hoveredOverlay = null;
        chart._preparedDuplicate = null;
        return;
      }

      if (drawingCoord.activeTool && drawingCoord.activeTool !== 'brush' && drawingCoord.activeTool !== 'highlighter' && drawingCoord.activeTool !== 'eraser') return;

      const overlays = chart.getOverlays();
      const interactiveOverlays = overlays.filter(
        (ov: any) =>
          ov.id !== 'custom_price_line_overlay' &&
          ov.name !== 'customPriceLine' &&
          ov.id !== 'session_breaks_overlay' &&
          ov.name !== 'sessionBreaks'
      );

      if (chart._promotedOverlayInfo && !interactiveOverlays.some((ov: any) => ov.id === chart._promotedOverlayInfo.id)) {
        chart._promotedOverlayInfo = null;
      }

      const selectedOverlays = interactiveOverlays.filter(
        (ov: any) =>
          selectedOverlayIds.includes(ov.id) ||
          selectedOverlayIds.includes(`sync_${ov.id}_from_${activeIndex}`) ||
          selectedOverlayIds.includes(getOriginalDrawingId(ov.id))
      );

      const isMouseDown = chart._isMouseDown || false;
      const activeDraggingOverlay =
        interactiveOverlays.find(
          (ov: any) => ov.extendData?.draggedIndex !== undefined && ov.extendData?.draggedIndex !== null
        ) || (isMouseDown ? selectedOverlays[0] : null);

      const container = chartContainersRef.current[activeIndex];
      if (!container) return;

      if (isMouseDown && activeDraggingOverlay && drawingCoord.activeTool !== 'eraser') {
        if (container.style.cursor !== 'grabbing') {
          container.style.cursor = 'grabbing';
        }
        return;
      }

      // 1. Prioritize anchor hit-testing across all interactive overlays
      let targetOverlayForAnchor: any = null;
      let closestIndex = -1;
      let minDistance = Infinity;

      const xVal = e.clientX - containerRect.left;
      const yVal = e.clientY - containerRect.top;
      const candidatesForAnchor = interactiveOverlays;
      candidatesForAnchor.forEach((ov: any) => {
        if (ov.points && Array.isArray(ov.points)) {
          const cleanPts = ov.points.map((p: any) => ({
            ...(p.timestamp !== undefined ? { timestamp: p.timestamp } : {}),
            ...(p.dataIndex !== undefined ? { dataIndex: p.dataIndex } : {}),
            value: p.value,
          }));
          let pts = chart.convertToPixel(cleanPts, { paneId: 'candle_pane' });
          if (!pts || !Array.isArray(pts) || pts.some((p: any) => !p || typeof p.x !== 'number')) {
            pts = chart.convertToPixel(ov.points, { paneId: 'candle_pane' });
          }
          if ((ov.name === 'brush' || ov.name === 'highlighter') && Array.isArray(pts) && pts.length >= 2) {
            pts = [pts[0], pts[pts.length - 1]];
          }
          if ((ov.name === 'fxText' || ov.name === 'text') && Array.isArray(pts) && pts[0]) {
            const cs = ov.extendData?.customSettings || {};
            const boxW = cs.boxWidth !== undefined ? cs.boxWidth : 180;
            const fontSize = cs.fontSize || 14;
            const lineHeight = Math.max(16, Math.round(fontSize * 1.35));
            const boxH = Math.max(32, 16 + lineHeight);
            pts = [
              { x: pts[0].x, y: pts[0].y },
              { x: pts[0].x + boxW, y: pts[0].y + boxH / 2 },
            ];
          }
          if (ov.name === 'rectangle' && Array.isArray(pts) && pts.length === 2 && pts[0] && pts[1]) {
            const p1 = pts[0];
            const p2 = pts[1];
            pts = [
              { x: p1.x, y: p1.y },
              { x: p2.x, y: p1.y },
              { x: p2.x, y: p2.y },
              { x: p1.x, y: p2.y },
              { x: (p1.x + p2.x) / 2, y: p1.y },
              { x: p2.x, y: (p1.y + p2.y) / 2 },
              { x: (p1.x + p2.x) / 2, y: p2.y },
              { x: p1.x, y: (p1.y + p2.y) / 2 },
            ];
          }
          if (Array.isArray(pts)) {
            pts.forEach((pt: any, idx: number) => {
              if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
                const dist = Math.sqrt((pt.x - xVal) ** 2 + (pt.y - yVal) ** 2);
                const isCloser = dist < minDistance - 0.001;
                const isTied = Math.abs(dist - minDistance) <= 0.001;
                const hasHigherZ = targetOverlayForAnchor
                  ? getNaturalZLevel(chart, ov) > getNaturalZLevel(chart, targetOverlayForAnchor)
                  : true;
                if (isCloser || (isTied && hasHigherZ)) {
                  minDistance = dist;
                  closestIndex = idx;
                  targetOverlayForAnchor = ov;
                }
              }
            });
          }
        }
      });

      const isAnchorHit = minDistance <= 16;

      // 2. Perform body/line hit-testing for interactive overlays
      let hoveredInteractiveOverlay: any = null;
      let isInsideBody = false;

      interactiveOverlays.forEach((ov: any) => {
        const currentHoveredZ = hoveredInteractiveOverlay ? getNaturalZLevel(chart, hoveredInteractiveOverlay) : -Infinity;
        const thisZ = getNaturalZLevel(chart, ov);

        if (ov.points && ['rectangle', 'fxText', 'longPosition', 'shortPosition', 'fibonacciRetracement'].includes(ov.name)) {
          const pts = chart.convertToPixel(ov.points, { paneId: 'candle_pane' });
          if (pts && pts.length >= 2) {
            const xCoords = pts
              .map((p: any) => p?.x)
              .filter((v: any): v is number => typeof v === 'number' && Number.isFinite(v));
            const yCoords = pts
              .map((p: any) => p?.y)
              .filter((v: any): v is number => typeof v === 'number' && Number.isFinite(v));
            if (xCoords.length >= 2 && yCoords.length >= 2) {
              let minX = Math.min(...xCoords);
              let maxX = Math.max(...xCoords);
              const minY = Math.min(...yCoords);
              const maxY = Math.max(...yCoords);

              if (ov.name === 'fibonacciRetracement') {
                const cs = ov.extendData?.customSettings || {};
                const chartWidth = chart.getWidth ? chart.getWidth() : 2000;
                if (cs.extend === 'left') {
                  minX = 0;
                } else if (cs.extend === 'right') {
                  maxX = chartWidth;
                } else if (cs.extend === 'both') {
                  minX = 0;
                  maxX = chartWidth;
                }
              }

              if (xVal >= minX && xVal <= maxX && yVal >= minY && yVal <= maxY) {
                if (thisZ >= currentHoveredZ) {
                  hoveredInteractiveOverlay = ov;
                  isInsideBody = true;
                }
              }
            }
          }
        } else if (
          ov.points &&
          ov.points.length >= 2 &&
          ['brush', 'highlighter', 'trendLine', 'ray', 'arrow', 'horizontalRay', 'horizontalLine', 'verticalLine', 'curve', 'path', 'circle'].includes(ov.name)
        ) {
          const cleanPts = ov.points.map((p: any) => ({
            ...(p.timestamp !== undefined ? { timestamp: p.timestamp } : {}),
            ...(p.dataIndex !== undefined ? { dataIndex: p.dataIndex } : {}),
            value: p.value,
          }));
          let pts = chart.convertToPixel(cleanPts, { paneId: 'candle_pane' });
          if (!pts || !Array.isArray(pts) || pts.some((p: any) => !p || typeof p.x !== 'number')) {
            pts = chart.convertToPixel(ov.points, { paneId: 'candle_pane' });
          }
          if (Array.isArray(pts) && pts.length >= 2) {
            let minDistToStroke = Infinity;
            for (let i = 0; i < pts.length - 1; i++) {
              const p1 = pts[i];
              const p2 = pts[i + 1];
              if (p1 && p2 && Number.isFinite(p1.x) && Number.isFinite(p1.y) && Number.isFinite(p2.x) && Number.isFinite(p2.y)) {
                const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
                let dist = Infinity;
                if (l2 > 0) {
                  let t = ((xVal - p1.x) * (p2.x - p1.x) + (yVal - p1.y) * (p2.y - p1.y)) / l2;
                  t = Math.max(0, Math.min(1, t));
                  dist = Math.sqrt((xVal - (p1.x + t * (p2.x - p1.x))) ** 2 + (yVal - (p1.y + t * (p2.y - p1.y))) ** 2);
                } else {
                  dist = Math.sqrt((xVal - p1.x) ** 2 + (yVal - p1.y) ** 2);
                }
                if (dist < minDistToStroke) {
                  minDistToStroke = dist;
                }
              }
            }
            if (minDistToStroke <= 14) {
              if (thisZ >= currentHoveredZ) {
                hoveredInteractiveOverlay = ov;
                isInsideBody = true;
              }
            }
          }
        }
      });

      // Eraser continuous swipe-erase during mouse drag
      if (drawingCoord.activeTool === 'eraser' && isMouseDown) {
        const hitTarget = hoveredInteractiveOverlay || (isAnchorHit ? targetOverlayForAnchor : null);
        if (hitTarget) {
          const originalId = getOriginalDrawingId(hitTarget.id);
          useDrawingStore.getState().removeSymbolDrawingById(originalId);
          runWorkspaceReconciliation(chartInstancesRef);
          chart._clickedOnOverlay = true;
        }
      }

      // An anchor hit unconditionally wins over any body hit
      const isAnchorHovered = !!(isAnchorHit && targetOverlayForAnchor);
      const isBodyHovered = !isAnchorHovered && !!hoveredInteractiveOverlay;
      const winningOverlay = isAnchorHovered ? targetOverlayForAnchor : hoveredInteractiveOverlay;
      const nextHoveredId = winningOverlay?.id || null;

      chart._isBodyHovered = isBodyHovered;
      chart._isAnchorHovered = isAnchorHovered;
      chart._hoveredOverlay = winningOverlay || null;

      // ── Ctrl+Hover Duplicate Preparation (Armed in memory) ────────────────
      const isCtrl = chart._isCtrlPressedRef?.current || e.ctrlKey || e.metaKey || false;
      if (isCtrl && isBodyHovered && hoveredInteractiveOverlay && !isAnchorHovered) {
        const rawId = hoveredInteractiveOverlay.id;
        const originalId = getOriginalDrawingId(rawId);
        const resolved = useDrawingStore.getState().findSymbolByDrawingId(originalId);
        const targetSymbol = resolved?.symbol || chart._symbol;
        if (resolved?.drawing && targetSymbol) {
          if (!chart._preparedDuplicate || chart._preparedDuplicate.sourceId !== originalId) {
            chart._preparedDuplicate = {
              sourceId: originalId,
              symbol: targetSymbol,
              cloneId: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              preparedData: {
                ...resolved.drawing,
                points: JSON.parse(JSON.stringify(resolved.drawing.points || [])),
                extendData: resolved.drawing.extendData
                  ? JSON.parse(JSON.stringify(resolved.drawing.extendData))
                  : undefined,
              },
            };
          }
        } else {
          chart._preparedDuplicate = null;
        }
      } else {
        chart._preparedDuplicate = null;
      }
      // ─────────────────────────────────────────────────────────────────────

      // Handle temporary z-level promotion for hidden drawing anchor hover
      const isActivelyDragging =
        (chart._isMouseDown && activeDraggingOverlay) ||
        chart._activeDraggingIndex !== null;

      if (!isActivelyDragging && drawingCoord.activeTool !== 'eraser') {
        if (isAnchorHit && targetOverlayForAnchor) {
          const targetId = targetOverlayForAnchor.id;
          DrawingChartAdapter.promoteOverlay(chart, targetId);
        } else {
          if (chart._promotedOverlayInfo) {
            if (!isPromotedOverlaySelected(chart, selectedOverlayIds)) {
              DrawingChartAdapter.restorePromotedOverlay(chart);
              if (selectedOverlayIds && selectedOverlayIds.length === 1) {
                DrawingChartAdapter.promoteOverlay(chart, selectedOverlayIds[0]);
              }
            }
          } else if (selectedOverlayIds && selectedOverlayIds.length === 1) {
            DrawingChartAdapter.promoteOverlay(chart, selectedOverlayIds[0]);
          }
        }
      }

      if (hoveredOverlayId !== nextHoveredId) {
        setHoveredOverlayId(nextHoveredId);
      }

      // Maintain isHovered state cleanly without layout resets
      interactiveOverlays.forEach((ov: any) => {
        if (
          [
            'brush',
            'highlighter',
            'rectangle',
            'fxText',
            'text',
            'longPosition',
            'shortPosition',
            'trendLine',
            'ray',
            'arrow',
            'horizontalRay',
            'horizontalLine',
            'verticalLine',
            'curve',
            'path',
            'circle',
            'fibonacciRetracement',
          ].includes(ov.name)
        ) {
          const isCurrentlyHovered = ov.id === nextHoveredId;
          if (ov.extendData?.isHovered !== isCurrentlyHovered) {
            chart.overrideOverlay({
              id: ov.id,
              extendData: {
                ...(ov.extendData || {}),
                isHovered: isCurrentlyHovered,
              },
            });
            DrawingChartAdapter.invalidatePane(chart);
          }
        }
      });

      // 3. Apply the interaction state locally on the chart
      if (isAnchorHit && targetOverlayForAnchor && drawingCoord.activeTool !== 'eraser') {
        const targetOverlay = targetOverlayForAnchor;
        const currentHoveredIdx = targetOverlay.extendData?.hoveredAnchorIndex;

        // Clean up hoveredAnchorIndex on all other overlays
        interactiveOverlays.forEach((ov: any) => {
          if (
            ov.id !== targetOverlay.id &&
            ov.extendData?.hoveredAnchorIndex !== null &&
            ov.extendData?.hoveredAnchorIndex !== undefined
          ) {
            chart.overrideOverlay({
              id: ov.id,
              extendData: {
                ...(ov.extendData || {}),
                hoveredAnchorIndex: null,
              },
            });
          }
        });

        if (currentHoveredIdx !== closestIndex) {
          chart.overrideOverlay({
            id: targetOverlay.id,
            extendData: {
              ...(targetOverlay.extendData || {}),
              hoveredAnchorIndex: closestIndex,
            },
          });
        }

        const nextCursor = 'pointer';
        if (container.style.cursor !== nextCursor) {
          container.style.cursor = nextCursor;
        }
        const canvases = container.querySelectorAll('canvas');
        canvases.forEach((c) => {
          if (c.style.cursor !== nextCursor) {
            c.style.cursor = nextCursor;
          }
        });
        return;
      }

      // Clean up hoveredAnchorIndexes when not near anchors
      interactiveOverlays.forEach((ov: any) => {
        if (ov.extendData?.hoveredAnchorIndex !== undefined && ov.extendData?.hoveredAnchorIndex !== null) {
          chart.overrideOverlay({
            id: ov.id,
            extendData: {
              ...(ov.extendData || {}),
              hoveredAnchorIndex: null,
            },
          });
        }
      });

      let baseCursor = 'crosshair';
      if (selectedCursorId === 'arrow') {
        baseCursor = 'default';
      } else if (selectedCursorId === 'dot') {
        baseCursor = getDotCursor();
      } else if (selectedCursorId === 'eraser' || drawingCoord.activeTool === 'eraser') {
        baseCursor = ERASER_CURSOR;
      }

      let finalCursor = baseCursor;
      if (chart._isSpacePressedRef?.current) {
        finalCursor = isMouseDown ? 'grabbing' : 'grab';
      } else if (drawingCoord.activeTool === 'eraser') {
        finalCursor = ERASER_CURSOR;
      } else if (isBodyHovered || isInsideBody) {
        finalCursor = 'grab';
      } else if (drawingCoord.activeTool === 'brush' || drawingCoord.activeTool === 'highlighter') {
        finalCursor = isAnchorHit ? 'pointer' : 'crosshair';
      }

      if (container.style.cursor !== finalCursor) {
        container.style.cursor = finalCursor;
        const canvases = container.querySelectorAll('canvas');
        canvases.forEach((c) => {
          c.style.cursor = finalCursor;
        });
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      chartInstancesRef.current.forEach((c: any) => {
        if (c?._promotedOverlayInfo) {
          if (!isPromotedOverlaySelected(c, selectedOverlayIds)) {
            try {
              DrawingChartAdapter.restorePromotedOverlay(c);
            } catch {}
          }
        }
      });
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [
    chartContainersRef,
    chartInstancesRef,
    selectedOverlayIds,
    hoveredOverlayId,
    setHoveredOverlayId,
    handleSelectOverlayIds,
    drawingCoord,
    isDrawingSettingsOpen,
    selectedCursorId,
  ]);
}
