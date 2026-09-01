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

          // Clear selection & reset active tool to Crosshair on empty space click (unless dialog is open or clicking on UI)
          const container = chartContainersRef.current[index];
          if (container) {
            const rect = container.getBoundingClientRect();
            const clickInside =
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom;

            const isUIInteraction =
              isDrawingSettingsOpen ||
              (e.target instanceof Element &&
                (!!e.target.closest('[data-floating-ui], .drawing-floating-toolbar, [data-no-deselect], [role="dialog"]') ||
                  !!e.target.closest('button, input, select, textarea, [role="button"], [role="dialog"], [role="menu"]')));

            if (clickInside && !isUIInteraction) {
              setTimeout(() => {
                if (!chart._clickedOnOverlay && !chart._activeDrawingId) {
                  handleSelectOverlayIds([]);
                  if (
                    drawingCoord.activeTool &&
                    drawingCoord.activeTool !== 'eraser' &&
                    drawingCoord.activeTool !== 'measure' &&
                    drawingCoord.activeTool !== 'brush' &&
                    drawingCoord.activeTool !== 'highlighter'
                  ) {
                    drawingCoord.setActiveTool(null);
                    chart.setScrollEnabled(true);
                    chart.setZoomEnabled(true);
                  }
                }
                chart._clickedOnOverlay = false;
              }, 50);
            }
          }
        }
      });
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
        return;
      }

      const chart = chartInstancesRef.current[activeIndex];
      if (!chart) return;

      if (drawingCoord.activeTool && drawingCoord.activeTool !== 'brush' && drawingCoord.activeTool !== 'highlighter' && drawingCoord.activeTool !== 'eraser') return;

      const overlays = chart.getOverlays();
      const interactiveOverlays = overlays.filter(
        (ov: any) =>
          ov.id !== 'custom_price_line_overlay' &&
          ov.name !== 'customPriceLine' &&
          ov.id !== 'session_breaks_overlay' &&
          ov.name !== 'sessionBreaks'
      );

      const selectedOverlays = interactiveOverlays.filter(
        (ov: any) =>
          selectedOverlayIds.includes(ov.id) ||
          selectedOverlayIds.includes(`sync_${ov.id}_from_${activeIndex}`)
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
      const candidatesForAnchor = selectedOverlays.length > 0 ? selectedOverlays : interactiveOverlays;
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
          if (Array.isArray(pts)) {
            pts.forEach((pt: any, idx: number) => {
              if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
                const dist = Math.sqrt((pt.x - xVal) ** 2 + (pt.y - yVal) ** 2);
                if (dist < minDistance) {
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
        if (ov.points && ['rectangle', 'fxText', 'longPosition', 'shortPosition'].includes(ov.name)) {
          const pts = chart.convertToPixel(ov.points, { paneId: 'candle_pane' });
          if (pts && pts.length >= 2) {
            const xCoords = pts
              .map((p: any) => p?.x)
              .filter((v: any): v is number => typeof v === 'number' && Number.isFinite(v));
            const yCoords = pts
              .map((p: any) => p?.y)
              .filter((v: any): v is number => typeof v === 'number' && Number.isFinite(v));
            if (xCoords.length >= 2 && yCoords.length >= 2) {
              const minX = Math.min(...xCoords);
              const maxX = Math.max(...xCoords);
              const minY = Math.min(...yCoords);
              const maxY = Math.max(...yCoords);

              if (xVal >= minX && xVal <= maxX && yVal >= minY && yVal <= maxY) {
                hoveredInteractiveOverlay = ov;
                isInsideBody = true;
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
              hoveredInteractiveOverlay = ov;
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

      const nextHoveredId = hoveredInteractiveOverlay?.id || null;
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
      } else if (isInsideBody) {
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
