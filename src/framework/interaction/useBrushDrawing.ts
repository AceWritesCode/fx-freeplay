import { useEffect, useRef } from 'react';
import { useDrawingStore } from '@/store';
import { DrawingChartAdapter, runWorkspaceReconciliation } from '@/engine/charting';

export interface BrushDrawingConfig {
  chartContainersRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
  chartInstancesRef: React.MutableRefObject<(any | null)[]>;
  activeTool: string | null;
  activeChartIndex: number;
  slots: any[];
  hoveredOverlayId: string | null;
  isSpacePressedRef: React.MutableRefObject<boolean>;
  onSelectOverlayIds: (ids: string[]) => void;
  setActiveTool: (tool: string | null) => void;
  syncAllDrawings: () => void;
  setDrawingTrigger: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * Custom hook providing a continuous freehand drawing lifecycle for the Brush tool:
 * pointerdown -> pointermove (high-frequency pixel stream) -> pointerup (chart coord conversion & store commit).
 */
export function useBrushDrawing({
  chartContainersRef,
  chartInstancesRef,
  activeTool,
  activeChartIndex,
  slots,
  hoveredOverlayId,
  isSpacePressedRef,
  onSelectOverlayIds,
  setActiveTool,
  syncAllDrawings,
  setDrawingTrigger,
}: BrushDrawingConfig) {
  const isDrawingRef = useRef(false);
  const livePointsRef = useRef<{ x: number; y: number }[]>([]);
  const drawingIdRef = useRef<string | null>(null);
  const activeChartRef = useRef<any | null>(null);
  const activeOrderRef = useRef<number>(1);
  const activeGroupIdRef = useRef<string | undefined>(undefined);
  const brushSettingsRef = useRef<{ lineColor: string; lineWidth: number }>({ lineColor: '#2196F3', lineWidth: 3 });

  useEffect(() => {
    if (activeTool !== 'brush') {
      // If tool deactivated while drawing, clean up
      if (isDrawingRef.current && drawingIdRef.current && activeChartRef.current) {
        activeChartRef.current.removeOverlay({ id: drawingIdRef.current });
        activeChartRef.current.setScrollEnabled(true);
        activeChartRef.current.setZoomEnabled(true);
      }
      isDrawingRef.current = false;
      drawingIdRef.current = null;
      livePointsRef.current = [];
      return;
    }

    const container = chartContainersRef.current[activeChartIndex];
    const chart = chartInstancesRef.current[activeChartIndex];
    if (!container || !chart) return;

    // Load current default brush settings
    try {
      const savedTemplates = localStorage.getItem('fx_templates_brush');
      if (savedTemplates) {
        const parsed = JSON.parse(savedTemplates);
        const def = parsed.find((t: any) => t.id === 'default') || parsed[0];
        if (def && def.commonSettings) {
          brushSettingsRef.current = {
            lineColor: def.commonSettings.lineColor || '#2196F3',
            lineWidth: def.commonSettings.lineWidth || 3,
          };
        }
      }
    } catch (_) {}

    const handlePointerDown = (e: PointerEvent) => {
      // Only handle primary button (left-click)
      if (e.button !== 0) return;

      // If Space is held, Brush drawing is suspended (allows navigation / moving / clicking existing drawings)
      if (isSpacePressedRef?.current) return;

      // Ignore clicks on floating UI, dialogs, buttons, toolbars
      const target = e.target as Element;
      if (
        target &&
        (target.closest('[data-floating-ui], .drawing-floating-toolbar, [data-no-deselect], [role="dialog"]') ||
          target.closest('button, input, select, textarea, [role="button"], [role="menu"]'))
      ) {
        return;
      }

      // If pointer is over an existing drawing / anchor, do not start a new brush stroke (allows selecting & dragging existing drawing)
      if (hoveredOverlayId) {
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

      // Clear previous selection so focus moves to the new stroke
      onSelectOverlayIds([]);

      // Temporarily disable chart pan/zoom while drawing
      chart.setScrollEnabled(false);
      chart.setZoomEnabled(false);

      // Determine order and folder group
      const currentSymbol = slots[activeChartIndex]?.symbol || 'INGEST';
      let activeGroupId: string | undefined = undefined;
      try {
        const folderSettings = localStorage.getItem(`fx_folders_${currentSymbol}`);
        const parsedFolders = folderSettings ? JSON.parse(folderSettings) : [];
        const activeFolder = parsedFolders.find((f: any) => !f.isCollapsed && !f.isLocked && f.isVisible);
        activeGroupId = activeFolder?.id || undefined;
      } catch (_) {}

      const overlays = (chart as any).getOverlays?.() || [];
      const maxOrder = overlays.reduce((max: number, ov: any) => {
        const order = ov.extendData?.order ?? 0;
        return order > max ? order : max;
      }, 0);
      const newOrder = maxOrder + 1;

      const newDrawingId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      isDrawingRef.current = true;
      drawingIdRef.current = newDrawingId;
      activeChartRef.current = chart;
      activeOrderRef.current = newOrder;
      activeGroupIdRef.current = activeGroupId;
      livePointsRef.current = [{ x: startX, y: startY }];

      // Create live freehand preview overlay
      const startChartPoint = chart.convertFromPixel([{ x: startX, y: startY }], { paneId: 'candle_pane' });
      chart.createOverlay({
        name: 'brush',
        id: newDrawingId,
        totalStep: 2,
        needDefaultPointFigure: false,
        needDefaultXAxisFigure: false,
        needDefaultYAxisFigure: false,
        points: startChartPoint || [],
        extendData: {
          order: newOrder,
          groupId: activeGroupId,
          sourceSlotIndex: activeChartIndex,
          customSettings: {
            lineColor: brushSettingsRef.current.lineColor,
            lineWidth: brushSettingsRef.current.lineWidth,
          },
          isLiveDrawing: true,
          liveBrushPoints: [{ x: startX, y: startY }],
        },
      });

      try {
        container.setPointerCapture(e.pointerId);
      } catch (_) {}

      window.addEventListener('pointermove', handlePointerMove, { passive: false });
      window.addEventListener('pointerup', handlePointerUp, { passive: false });
      window.addEventListener('pointercancel', handlePointerCancel, { passive: false });
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current || !drawingIdRef.current || !activeChartRef.current) return;

      const rect = container.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;

      const pts = livePointsRef.current;
      const lastPt = pts[pts.length - 1];

      if (lastPt) {
        const dist = Math.sqrt((curX - lastPt.x) ** 2 + (curY - lastPt.y) ** 2);
        // Record smooth high-frequency point trail (minimum 2px movement)
        if (dist >= 2) {
          pts.push({ x: curX, y: curY });

          activeChartRef.current.overrideOverlay({
            id: drawingIdRef.current,
            extendData: {
              order: activeOrderRef.current,
              groupId: activeGroupIdRef.current,
              sourceSlotIndex: activeChartIndex,
              customSettings: {
                lineColor: brushSettingsRef.current.lineColor,
                lineWidth: brushSettingsRef.current.lineWidth,
              },
              isLiveDrawing: true,
              liveBrushPoints: [...pts],
            },
          });
          DrawingChartAdapter.invalidatePane(activeChartRef.current, 'candle_pane');
        }
      }
    };

    const finalizeStroke = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);

      if (!isDrawingRef.current || !drawingIdRef.current || !activeChartRef.current) {
        return;
      }

      isDrawingRef.current = false;
      const targetId = drawingIdRef.current;
      const chartInstance = activeChartRef.current;
      const pts = livePointsRef.current;

      drawingIdRef.current = null;
      activeChartRef.current = null;
      livePointsRef.current = [];

      // Restore pan and zoom on chart
      chartInstance.setScrollEnabled(true);
      chartInstance.setZoomEnabled(true);

      // If user merely clicked with no drag movement, discard the stroke without creating a phantom line
      if (pts.length < 2) {
        chartInstance.removeOverlay({ id: targetId });
        return;
      }

      // Convert recorded pixel path to chart candle coordinates ({ timestamp, value, dataIndex })
      const rawChartPoints = chartInstance.convertFromPixel(pts, { paneId: 'candle_pane' });
      if (!rawChartPoints || rawChartPoints.length < 2) {
        chartInstance.removeOverlay({ id: targetId });
        return;
      }

      const cleanChartPoints = rawChartPoints
        .filter((p: any) => p && typeof p.value === 'number' && Number.isFinite(p.value))
        .map((p: any) => ({
          ...(p.timestamp !== undefined ? { timestamp: p.timestamp } : {}),
          ...(p.dataIndex !== undefined ? { dataIndex: p.dataIndex } : {}),
          value: p.value,
        }));

      if (cleanChartPoints.length < 2) {
        chartInstance.removeOverlay({ id: targetId });
        return;
      }

      const currentSymbol = (slots[activeChartIndex]?.symbol || 'INGEST').toUpperCase();

      const cleanExtendData = {
        order: activeOrderRef.current,
        groupId: activeGroupIdRef.current,
        sourceSlotIndex: activeChartIndex,
        customSettings: {
          lineColor: brushSettingsRef.current.lineColor,
          lineWidth: brushSettingsRef.current.lineWidth,
        },
      };

      const drawingObj = {
        id: targetId,
        name: 'brush',
        points: cleanChartPoints,
        extendData: cleanExtendData,
        lock: false,
        visible: true,
        symbol: currentSymbol,
      };

      // 1. Commit to authoritative Zustand store
      useDrawingStore.getState().addSymbolDrawing(currentSymbol, drawingObj);

      // 2. Override overlay with finalized candle points and clean extendData (clearing liveBrushPoints)
      chartInstance.overrideOverlay({
        id: targetId,
        points: cleanChartPoints,
        extendData: {
          ...cleanExtendData,
          isLiveDrawing: false,
          liveBrushPoints: undefined,
        },
      });
      DrawingChartAdapter.invalidatePane(chartInstance, 'candle_pane');

      // 3. Immediately select the newly created brush stroke
      onSelectOverlayIds([targetId]);
      chartInstance._clickedOnOverlay = true;
      if (chartInstance._setSelectedOverlayIds) {
        chartInstance._setSelectedOverlayIds([targetId]);
      }

      // 4. Reconcile across all chart slots
      syncAllDrawings();
      runWorkspaceReconciliation(chartInstancesRef);

      // 5. Trigger UI notification (tool remains active for continuous freehand painting)
      setDrawingTrigger((prev) => prev + 1);
    };

    const handlePointerUp = (e: PointerEvent) => {
      e.preventDefault();
      finalizeStroke();
    };

    const handlePointerCancel = () => {
      finalizeStroke();
    };

    container.addEventListener('pointerdown', handlePointerDown);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [
    activeTool,
    activeChartIndex,
    chartContainersRef,
    chartInstancesRef,
    slots,
    hoveredOverlayId,
    isSpacePressedRef,
    onSelectOverlayIds,
    setActiveTool,
    syncAllDrawings,
    setDrawingTrigger,
  ]);
}
