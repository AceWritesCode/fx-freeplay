import { useEffect, useRef } from 'react';
import { useDrawingStore } from '@/store';
import { DrawingChartAdapter, runWorkspaceReconciliation } from '@/engine/charting';

export interface BrushDrawingConfig {
  chartContainersRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
  chartInstancesRef: React.MutableRefObject<(any | null)[]>;
  activeTool: string | null;
  activeChartIndex: number;
  slots: any[];
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

  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const onSelectOverlayIdsRef = useRef(onSelectOverlayIds);
  onSelectOverlayIdsRef.current = onSelectOverlayIds;
  const setActiveToolRef = useRef(setActiveTool);
  setActiveToolRef.current = setActiveTool;
  const syncAllDrawingsRef = useRef(syncAllDrawings);
  syncAllDrawingsRef.current = syncAllDrawings;
  const setDrawingTriggerRef = useRef(setDrawingTrigger);
  setDrawingTriggerRef.current = setDrawingTrigger;

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (activeTool !== 'brush' && activeTool !== 'highlighter') {
      // If tool deactivated while drawing, clean up
      if (previewCanvasRef.current) {
        previewCanvasRef.current.remove();
        previewCanvasRef.current = null;
      }
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

    // Load current default tool settings (brush or highlighter)
    const isHighlighter = activeTool === 'highlighter';
    brushSettingsRef.current = {
      lineColor: isHighlighter ? 'rgba(33, 150, 243, 0.4)' : '#2196F3',
      lineWidth: isHighlighter ? 32 : 3,
    };
    try {
      const savedTemplates = localStorage.getItem(`fx_templates_${activeTool}`);
      if (savedTemplates) {
        const parsed = JSON.parse(savedTemplates);
        const def = parsed.find((t: any) => t.id === 'default') || parsed[0];
        if (def && def.commonSettings) {
          brushSettingsRef.current = {
            lineColor: def.commonSettings.lineColor || brushSettingsRef.current.lineColor,
            lineWidth: def.commonSettings.lineWidth || brushSettingsRef.current.lineWidth,
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

      const rect = container.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      if (startX < 0 || startX > rect.width || startY < 0 || startY > rect.height) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Clear previous selection so focus moves to the new stroke
      onSelectOverlayIdsRef.current([]);

      // Temporarily disable chart pan/zoom while drawing
      chart.setScrollEnabled(false);
      chart.setZoomEnabled(false);

      // Determine order and folder group
      let activeGroupId: string | undefined = undefined;
      try {
        const folders = useDrawingStore.getState().folders;
        const activeFolder = folders.find((f: any) => !f.isCollapsed && !f.isLocked && f.isVisible);
        activeGroupId = activeFolder?.id || undefined;
      } catch (err) {
        console.debug('[useBrushDrawing] Folder resolution error:', err);
      }

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

      // Setup dedicated high-performance hardware-accelerated preview canvas
      let pCanvas = container.querySelector('.brush-preview-canvas') as HTMLCanvasElement;
      if (!pCanvas) {
        pCanvas = document.createElement('canvas');
        pCanvas.className = 'brush-preview-canvas';
        pCanvas.style.position = 'absolute';
        pCanvas.style.top = '0';
        pCanvas.style.left = '0';
        pCanvas.style.width = '100%';
        pCanvas.style.height = '100%';
        pCanvas.style.pointerEvents = 'none';
        pCanvas.style.zIndex = '30';
        container.appendChild(pCanvas);
      }
      const dpr = window.devicePixelRatio || 1;
      pCanvas.width = rect.width * dpr;
      pCanvas.height = rect.height * dpr;
      const ctx = pCanvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.strokeStyle = brushSettingsRef.current.lineColor;
        ctx.lineWidth = brushSettingsRef.current.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
      }
      previewCanvasRef.current = pCanvas;

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
        // Record smooth high-frequency point trail (minimum 1.5px movement)
        if (dist >= 1.5) {
          pts.push({ x: curX, y: curY });

          const ctx = previewCanvasRef.current?.getContext('2d');
          if (ctx) {
            ctx.lineTo(curX, curY);
            ctx.stroke();
          }
        }
      }
    };

    const finalizeStroke = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);

      // Clean up live preview canvas
      if (previewCanvasRef.current) {
        previewCanvasRef.current.remove();
        previewCanvasRef.current = null;
      }

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

      const currentSymbol = (slotsRef.current[activeChartIndex]?.symbol || 'INGEST').toUpperCase();

      const cleanExtendData = {
        order: activeOrderRef.current,
        groupId: activeGroupIdRef.current,
        sourceSlotIndex: activeChartIndex,
        customSettings: {
          lineColor: brushSettingsRef.current.lineColor,
          lineWidth: brushSettingsRef.current.lineWidth,
        },
      };

      const targetToolName = activeToolRef.current || activeTool || 'brush';

      const drawingObj = {
        id: targetId,
        name: targetToolName,
        points: cleanChartPoints,
        extendData: cleanExtendData,
        lock: false,
        visible: true,
        symbol: currentSymbol,
      };

      // 1. Commit to authoritative Zustand store
      useDrawingStore.getState().addSymbolDrawing(currentSymbol, drawingObj);

      // 2. Create overlay on chart instance with interactive handlers
      DrawingChartAdapter.createOverlay(chartInstance, {
        name: targetToolName,
        id: targetId,
        totalStep: 2,
        needDefaultPointFigure: false,
        needDefaultXAxisFigure: false,
        needDefaultYAxisFigure: false,
        points: cleanChartPoints,
        extendData: {
          ...cleanExtendData,
          isLiveDrawing: false,
          liveBrushPoints: undefined,
        },
      });
      DrawingChartAdapter.invalidatePane(chartInstance, 'candle_pane');

      // 3. Immediately select the newly created brush stroke
      onSelectOverlayIdsRef.current([targetId]);
      chartInstance._clickedOnOverlay = true;
      if (chartInstance._setSelectedOverlayIds) {
        chartInstance._setSelectedOverlayIds([targetId]);
      }

      // 4. Reconcile across all chart slots
      syncAllDrawingsRef.current();
      runWorkspaceReconciliation(chartInstancesRef);

      // 5. Trigger UI notification (tool remains active for continuous freehand painting)
      setDrawingTriggerRef.current((prev) => prev + 1);
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
    isSpacePressedRef,
  ]);
}

