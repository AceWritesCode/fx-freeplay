import { useEffect, useRef } from 'react';
import { useDrawingStore } from '@/store';
import { DrawingChartAdapter, getOriginalDrawingId, runWorkspaceReconciliation } from '@/engine/charting';

export interface EraserDrawingConfig {
  chartContainersRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
  chartInstancesRef: React.MutableRefObject<(any | null)[]>;
  activeTool: string | null;
  activeChartIndex: number;
}

const ERASER_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="rgba(239,68,68,0.25)" stroke="#ef4444" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="#ef4444"/></svg>`;
const ERASER_CURSOR = `url("data:image/svg+xml;base64,${btoa(ERASER_CURSOR_SVG)}") 12 12, crosshair`;

interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

export function useEraserDrawing({
  chartContainersRef,
  chartInstancesRef,
  activeTool,
  activeChartIndex,
}: EraserDrawingConfig) {
  const isErasingRef = useRef(false);
  const trailRef = useRef<TrailPoint[]>([]);
  const markedIdsRef = useRef<Set<string>>(new Set());
  const activeChartRef = useRef<any | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeTool !== 'eraser') {
      // Restore cursor on all containers and canvases
      for (let i = 0; i < chartContainersRef.current.length; i++) {
        const container = chartContainersRef.current[i];
        if (container) {
          container.style.cursor = '';
          const canvases = container.querySelectorAll('canvas');
          canvases.forEach((c) => {
            c.style.cursor = '';
          });
        }
      }

      if (isErasingRef.current && activeChartRef.current) {
        activeChartRef.current.setScrollEnabled(true);
        activeChartRef.current.setZoomEnabled(true);
      }
      if (previewCanvasRef.current) {
        previewCanvasRef.current.remove();
        previewCanvasRef.current = null;
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      isErasingRef.current = false;
      markedIdsRef.current.clear();
      trailRef.current = [];
      return;
    }

    // Set custom eraser cursor on active container and canvases
    const updateContainerCursors = () => {
      for (let i = 0; i < chartContainersRef.current.length; i++) {
        const container = chartContainersRef.current[i];
        if (container) {
          container.style.cursor = ERASER_CURSOR;
          const canvases = container.querySelectorAll('canvas');
          canvases.forEach((c) => {
            c.style.cursor = ERASER_CURSOR;
          });
        }
      }
    };
    updateContainerCursors();

    const container = chartContainersRef.current[activeChartIndex];
    const chart = chartInstancesRef.current[activeChartIndex];
    if (!container || !chart) return;

    // Helper: test if point or segment intersects a drawing
    const checkDrawingIntersection = (p1: { x: number; y: number }, p2: { x: number; y: number }, overlay: any): boolean => {
      if (!overlay.points || !Array.isArray(overlay.points) || overlay.points.length === 0) return false;

      const cleanPts = overlay.points.map((p: any) => ({
        ...(p.timestamp !== undefined ? { timestamp: p.timestamp } : {}),
        ...(p.dataIndex !== undefined ? { dataIndex: p.dataIndex } : {}),
        value: p.value,
      }));
      let pts = chart.convertToPixel(cleanPts, { paneId: 'candle_pane' });
      if (!pts || !Array.isArray(pts) || pts.some((p: any) => !p || typeof p.x !== 'number')) {
        pts = chart.convertToPixel(overlay.points, { paneId: 'candle_pane' });
      }
      if (!Array.isArray(pts) || pts.length === 0) return false;

      // Handle bounding box overlays (rectangle, fxText, text, longPosition, shortPosition)
      if (['rectangle', 'fxText', 'text', 'longPosition', 'shortPosition'].includes(overlay.name) && pts.length >= 2) {
        const xCoords = pts.map((p: any) => p?.x).filter((v: any): v is number => typeof v === 'number' && Number.isFinite(v));
        const yCoords = pts.map((p: any) => p?.y).filter((v: any): v is number => typeof v === 'number' && Number.isFinite(v));
        if (xCoords.length >= 2 && yCoords.length >= 2) {
          const minX = Math.min(...xCoords) - 8;
          const maxX = Math.max(...xCoords) + 8;
          const minY = Math.min(...yCoords) - 8;
          const maxY = Math.max(...yCoords) + 8;

          if (
            (p2.x >= minX && p2.x <= maxX && p2.y >= minY && p2.y <= maxY) ||
            (p1.x >= minX && p1.x <= maxX && p1.y >= minY && p1.y <= maxY)
          ) {
            return true;
          }
        }
      }

      // Handle point & stroke distance testing
      const radius = 16;
      for (const pt of pts) {
        if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
          if (Math.sqrt((pt.x - p2.x) ** 2 + (pt.y - p2.y) ** 2) <= radius) {
            return true;
          }
        }
      }

      if (pts.length >= 2) {
        for (let i = 0; i < pts.length - 1; i++) {
          const seg1 = pts[i];
          const seg2 = pts[i + 1];
          if (seg1 && seg2 && Number.isFinite(seg1.x) && Number.isFinite(seg1.y) && Number.isFinite(seg2.x) && Number.isFinite(seg2.y)) {
            const l2 = (seg2.x - seg1.x) ** 2 + (seg2.y - seg1.y) ** 2;
            let dist = Infinity;
            if (l2 > 0) {
              let t = ((p2.x - seg1.x) * (seg2.x - seg1.x) + (p2.y - seg1.y) * (seg2.y - seg1.y)) / l2;
              t = Math.max(0, Math.min(1, t));
              dist = Math.sqrt((p2.x - (seg1.x + t * (seg2.x - seg1.x))) ** 2 + (p2.y - (seg1.y + t * (seg2.y - seg1.y))) ** 2);
            } else {
              dist = Math.sqrt((p2.x - seg1.x) ** 2 + (p2.y - seg1.y) ** 2);
            }
            if (dist <= radius) {
              return true;
            }
          }
        }
      }

      return false;
    };

    // Render loop for self-erasing fading trail line
    const renderTrailLoop = () => {
      const pCanvas = previewCanvasRef.current;
      if (!pCanvas) return;
      const ctx = pCanvas.getContext('2d');
      if (!ctx) return;

      const rect = container.getBoundingClientRect();
      const now = performance.now();
      const maxAge = 450; // trail points older than 450ms fade and disappear

      // Prune old points
      trailRef.current = trailRef.current.filter((pt) => now - pt.time <= maxAge);

      ctx.clearRect(0, 0, rect.width, rect.height);

      const points = trailRef.current;
      if (points.length >= 2) {
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          const age = now - p2.time;
          const progress = Math.max(0, Math.min(1, 1 - age / maxAge));
          const alpha = progress * 0.55;
          const width = 8 + progress * 10;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
      }

      if (isErasingRef.current || trailRef.current.length > 0) {
        animFrameIdRef.current = requestAnimationFrame(renderTrailLoop);
      } else {
        ctx.clearRect(0, 0, rect.width, rect.height);
        animFrameIdRef.current = null;
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!e.shiftKey) return; // Shift + Click & Drag initiates erasing trail

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

      isErasingRef.current = true;
      activeChartRef.current = chart;
      markedIdsRef.current.clear();
      trailRef.current = [{ x: startX, y: startY, time: performance.now() }];

      // Setup preview canvas
      let pCanvas = container.querySelector('.eraser-preview-canvas') as HTMLCanvasElement;
      if (!pCanvas) {
        pCanvas = document.createElement('canvas');
        pCanvas.className = 'eraser-preview-canvas';
        pCanvas.style.position = 'absolute';
        pCanvas.style.top = '0';
        pCanvas.style.left = '0';
        pCanvas.style.width = '100%';
        pCanvas.style.height = '100%';
        pCanvas.style.pointerEvents = 'none';
        pCanvas.style.zIndex = '35';
        container.appendChild(pCanvas);
      }
      const dpr = window.devicePixelRatio || 1;
      pCanvas.width = rect.width * dpr;
      pCanvas.height = rect.height * dpr;
      const ctx = pCanvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      previewCanvasRef.current = pCanvas;

      // Start animation loop
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = requestAnimationFrame(renderTrailLoop);

      // Test point against all drawings immediately
      const overlays = chart.getOverlays();
      const interactiveOverlays = overlays.filter(
        (ov: any) =>
          ov.id !== 'custom_price_line_overlay' &&
          ov.name !== 'customPriceLine' &&
          ov.id !== 'session_breaks_overlay' &&
          ov.name !== 'sessionBreaks'
      );
      for (const ov of interactiveOverlays) {
        if (checkDrawingIntersection({ x: startX, y: startY }, { x: startX, y: startY }, ov)) {
          const originalId = getOriginalDrawingId(ov.id);
          markedIdsRef.current.add(originalId);
          chart.overrideOverlay({
            id: ov.id,
            extendData: {
              ...(ov.extendData || {}),
              isHovered: true,
            },
          });
          DrawingChartAdapter.invalidatePane(chart);
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      updateContainerCursors();

      if (!isErasingRef.current) return;

      const rect = container.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const lastPoint = trailRef.current[trailRef.current.length - 1] || { x: currentX, y: currentY };
      const currentPoint = { x: currentX, y: currentY, time: performance.now() };
      trailRef.current.push(currentPoint);

      // Check intersection against all overlays
      const overlays = chart.getOverlays();
      const interactiveOverlays = overlays.filter(
        (ov: any) =>
          ov.id !== 'custom_price_line_overlay' &&
          ov.name !== 'customPriceLine' &&
          ov.id !== 'session_breaks_overlay' &&
          ov.name !== 'sessionBreaks'
      );

      for (const ov of interactiveOverlays) {
        const originalId = getOriginalDrawingId(ov.id);
        if (!markedIdsRef.current.has(originalId)) {
          if (checkDrawingIntersection(lastPoint, currentPoint, ov)) {
            markedIdsRef.current.add(originalId);
            chart.overrideOverlay({
              id: ov.id,
              extendData: {
                ...(ov.extendData || {}),
                isHovered: true,
              },
            });
            DrawingChartAdapter.invalidatePane(chart);
          }
        }
      }
    };

    const handlePointerUp = () => {
      if (!isErasingRef.current) return;

      isErasingRef.current = false;
      chart.setScrollEnabled(true);
      chart.setZoomEnabled(true);

      // Batch delete all marked drawings
      if (markedIdsRef.current.size > 0) {
        markedIdsRef.current.forEach((id) => {
          useDrawingStore.getState().removeSymbolDrawingById(id);
        });
        runWorkspaceReconciliation(chartInstancesRef);
      }

      markedIdsRef.current.clear();
      trailRef.current = [];

      if (previewCanvasRef.current) {
        const ctx = previewCanvasRef.current.getContext('2d');
        if (ctx) {
          const rect = container.getBoundingClientRect();
          ctx.clearRect(0, 0, rect.width, rect.height);
        }
      }
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

      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      if (previewCanvasRef.current) {
        previewCanvasRef.current.remove();
        previewCanvasRef.current = null;
      }
    };
  }, [activeTool, activeChartIndex, chartContainersRef, chartInstancesRef]);
}
