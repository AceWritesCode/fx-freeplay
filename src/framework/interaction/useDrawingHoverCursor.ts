import { useEffect } from 'react';
import { DrawingChartAdapter } from '@/engine/charting';

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
}

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
}: DrawingHoverCursorConfig) {
  useEffect(() => {
    const handleMouseDown = () => {
      chartInstancesRef.current.forEach((chart) => {
        if (chart) chart._isMouseDown = true;
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      chartInstancesRef.current.forEach((chart, index) => {
        if (chart) {
          chart._isMouseDown = false;
          if (chart._activeTool === 'brush' || chart._activeTool === 'highlighter') {
            const overlays = chart.getOverlays();
            const activeBrush = overlays.find(
              (ov: any) => (ov.name === 'brush' || ov.name === 'highlighter') && ov.points.length < 9999
            );
            if (activeBrush) {
              const brushPoints = activeBrush.extendData?.brushPoints || [];
              if (brushPoints.length > 0) {
                const chartPoints = chart.convertFromPixel(brushPoints, { paneId: 'candle_pane' });
                chart.overrideOverlay({
                  id: activeBrush.id,
                  points: chartPoints,
                  totalStep: chartPoints.length,
                });
                chart.overrideOverlay({
                  id: activeBrush.id,
                  extendData: {
                    ...(activeBrush.extendData || {}),
                    brushPoints: [],
                  },
                });
                drawingCoord.setActiveTool(null);
                chart.setScrollEnabled(true);
                chart.setZoomEnabled(true);
                setTimeout(() => {
                  drawingCoord.syncAllDrawings();
                  drawingCoord.setDrawingTrigger((prev) => prev + 1);
                }, 50);
              }
            }
          }

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
                  if (drawingCoord.activeTool) {
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

      if (drawingCoord.activeTool) return;

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

      if (isMouseDown && activeDraggingOverlay) {
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
          ['trendLine', 'ray', 'horizontalRay', 'horizontalLine', 'verticalLine'].includes(ov.name)
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
          if (
            pts &&
            pts[0] &&
            pts[1] &&
            Number.isFinite(pts[0].x) &&
            Number.isFinite(pts[0].y) &&
            Number.isFinite(pts[1].x) &&
            Number.isFinite(pts[1].y)
          ) {
            const p1 = pts[0];
            const p2 = pts[1];
            const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
            let dist = Infinity;
            if (l2 > 0) {
              let t = ((xVal - p1.x) * (p2.x - p1.x) + (yVal - p1.y) * (p2.y - p1.y)) / l2;
              t = Math.max(0, Math.min(1, t));
              dist = Math.sqrt((xVal - (p1.x + t * (p2.x - p1.x))) ** 2 + (yVal - (p1.y + t * (p2.y - p1.y))) ** 2);
            }
            if (dist <= 12) {
              hoveredInteractiveOverlay = ov;
            }
          }
        }
      });

      const nextHoveredId = hoveredInteractiveOverlay?.id || null;
      if (hoveredOverlayId !== nextHoveredId) {
        setHoveredOverlayId(nextHoveredId);
      }

      // Maintain isHovered state cleanly without layout resets
      interactiveOverlays.forEach((ov: any) => {
        if (
          [
            'rectangle',
            'fxText',
            'text',
            'longPosition',
            'shortPosition',
            'trendLine',
            'ray',
            'horizontalRay',
            'horizontalLine',
            'verticalLine',
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
      if (isAnchorHit && targetOverlayForAnchor) {
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

      const finalCursor = isInsideBody ? 'grab' : 'default';
      if (container.style.cursor !== finalCursor) {
        container.style.cursor = finalCursor;
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
  ]);
}
