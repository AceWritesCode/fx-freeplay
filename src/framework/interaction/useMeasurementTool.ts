import { useEffect, useRef } from 'react';

export interface MeasurementToolConfig {
  chartContainersRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
  chartInstancesRef: React.MutableRefObject<(any | null)[]>;
  activeTool: string | null;
  activeChartIndex: number;
  setActiveTool: (tool: string | null) => void;
}

interface MeasurementState {
  isActive: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  chartIndex: number;
  isComplete: boolean;
}

export function useMeasurementTool({
  chartContainersRef,
  chartInstancesRef,
  activeTool,
  activeChartIndex,
  setActiveTool,
}: MeasurementToolConfig) {
  const measurementRef = useRef<MeasurementState | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const setActiveToolRef = useRef(setActiveTool);
  setActiveToolRef.current = setActiveTool;

  useEffect(() => {
    const container = chartContainersRef.current[activeChartIndex];
    const chart = chartInstancesRef.current[activeChartIndex];
    if (!container || !chart) return;

    // Helper: format volume
    const formatVolume = (vol: number): string => {
      if (!vol || isNaN(vol)) return '0';
      if (vol >= 1e9) return (vol / 1e9).toFixed(2) + ' B';
      if (vol >= 1e6) return (vol / 1e6).toFixed(2) + ' M';
      if (vol >= 1e3) return (vol / 1e3).toFixed(2) + ' K';
      return vol.toLocaleString();
    };

    // Helper: format duration
    const formatDuration = (timeMs: number): string => {
      if (!timeMs || isNaN(timeMs)) return '0m';
      const totalMinutes = Math.max(1, Math.round(timeMs / 60000));
      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const minutes = totalMinutes % 60;

      if (days > 0) {
        return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
      }
      if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      }
      return `${minutes}m`;
    };

    // Render measurement box, coordinate lines with arrows, and info card
    const renderMeasurement = () => {
      const state = measurementRef.current;
      const pCanvas = previewCanvasRef.current;
      if (!state || !pCanvas) return;

      const ctx = pCanvas.getContext('2d');
      if (!ctx) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Update canvas dimensions if necessary
      if (pCanvas.width !== rect.width * dpr || pCanvas.height !== rect.height * dpr) {
        pCanvas.width = rect.width * dpr;
        pCanvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const { startX, startY, currentX, currentY } = state;
      const left = Math.min(startX, currentX);
      const right = Math.max(startX, currentX);
      const top = Math.min(startY, currentY);
      const bottom = Math.max(startY, currentY);
      const width = right - left;
      const height = bottom - top;

      if (width < 2 && height < 2) {
        ctx.restore();
        return;
      }

      // Convert pixel points to chart coordinate data
      const startCoord = chart.convertFromPixel({ x: startX, y: startY }, { paneId: 'candle_pane' });
      const endCoord = chart.convertFromPixel({ x: currentX, y: currentY }, { paneId: 'candle_pane' });

      const startPrice = startCoord?.value ?? 0;
      const endPrice = endCoord?.value ?? 0;
      const priceDiff = endPrice - startPrice;
      const isPositive = priceDiff >= 0;

      // Color scheme based on positive/negative
      const themeColor = isPositive ? '#2962FF' : '#F23645';
      const fillColor = isPositive ? 'rgba(41, 98, 255, 0.22)' : 'rgba(242, 54, 69, 0.22)';
      const textColor = '#ffffff';

      // 1. Shaded area
      ctx.fillStyle = fillColor;
      ctx.fillRect(left, top, width, height);

      // 2. Coordinate lines with arrows
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1.25;

      const centerX = left + width / 2;
      const centerY = top + height / 2;

      // Horizontal line across center
      ctx.beginPath();
      ctx.moveTo(left, centerY);
      ctx.lineTo(right, centerY);
      ctx.stroke();

      // Horizontal arrow at the right or left edge
      const arrowSize = 6;
      if (currentX >= startX) {
        // Pointing right
        ctx.beginPath();
        ctx.moveTo(right - arrowSize, centerY - arrowSize / 1.5);
        ctx.lineTo(right, centerY);
        ctx.lineTo(right - arrowSize, centerY + arrowSize / 1.5);
        ctx.stroke();
      } else {
        // Pointing left
        ctx.beginPath();
        ctx.moveTo(left + arrowSize, centerY - arrowSize / 1.5);
        ctx.lineTo(left, centerY);
        ctx.lineTo(left + arrowSize, centerY + arrowSize / 1.5);
        ctx.stroke();
      }

      // Vertical line across center
      ctx.beginPath();
      ctx.moveTo(centerX, top);
      ctx.lineTo(centerX, bottom);
      ctx.stroke();

      // Vertical arrow at top or bottom edge
      if (isPositive) {
        // Pointing UP
        ctx.beginPath();
        ctx.moveTo(centerX - arrowSize / 1.5, top + arrowSize);
        ctx.lineTo(centerX, top);
        ctx.lineTo(centerX + arrowSize / 1.5, top + arrowSize);
        ctx.stroke();
      } else {
        // Pointing DOWN
        ctx.beginPath();
        ctx.moveTo(centerX - arrowSize / 1.5, bottom - arrowSize);
        ctx.lineTo(centerX, bottom);
        ctx.lineTo(centerX + arrowSize / 1.5, bottom - arrowSize);
        ctx.stroke();
      }

      // 3. Compute measurement metrics
      const pricePercent = startPrice !== 0 ? (priceDiff / startPrice) * 100 : 0;

      // Estimate ticks / points (e.g. priceDiff / 0.01)
      const absDiff = Math.abs(priceDiff);
      let precision = 2;
      if (absDiff < 0.01 && absDiff > 0) precision = 5;
      else if (absDiff < 1 && absDiff > 0) precision = 4;
      else if (absDiff >= 1000) precision = 2;

      const diffStr = (priceDiff >= 0 ? '' : '−') + Math.abs(priceDiff).toFixed(precision);
      const percentStr = `(${pricePercent >= 0 ? '' : '−'}${Math.abs(pricePercent).toFixed(2)}%)`;
      
      const tickUnit = precision === 2 ? 0.01 : precision === 4 ? 0.0001 : 0.00001;
      const ticks = Math.round(priceDiff / tickUnit);
      const ticksStr = (ticks >= 0 ? '' : '−') + Math.abs(ticks).toLocaleString();
      const line1 = `${diffStr} ${percentStr} ${ticksStr}`;

      // Bars and duration
      const startDataIdx = startCoord?.dataIndex ?? 0;
      const endDataIdx = endCoord?.dataIndex ?? 0;
      const barCount = Math.abs(endDataIdx - startDataIdx) + 1;

      const startTime = startCoord?.timestamp ?? 0;
      const endTime = endCoord?.timestamp ?? 0;
      const timeDiff = Math.abs(endTime - startTime);
      const durationStr = formatDuration(timeDiff);
      const line2 = `${barCount} ${barCount === 1 ? 'bar' : 'bars'}, ${durationStr}`;

      // Volume in range
      let totalVolume = 0;
      const dataList = chart.getDataList?.() || [];
      if (dataList.length > 0) {
        const minIdx = Math.max(0, Math.min(startDataIdx, endDataIdx));
        const maxIdx = Math.min(dataList.length - 1, Math.max(startDataIdx, endDataIdx));
        for (let i = minIdx; i <= maxIdx; i++) {
          totalVolume += dataList[i]?.volume || dataList[i]?.turnover || 0;
        }
      }
      const line3 = `Vol ${formatVolume(totalVolume)}`;

      // 4. Draw Info Card Pill
      const cardWidth = 140;
      const cardHeight = 64;
      const cardRadius = 6;

      let cardX = centerX - cardWidth / 2;
      // Clamp card inside chart bounds horizontally
      cardX = Math.max(8, Math.min(rect.width - cardWidth - 8, cardX));

      // Position card above if positive, below if negative
      let cardY: number;
      if (isPositive) {
        cardY = top - cardHeight - 8;
        if (cardY < 8) cardY = bottom + 8; // Flip if out of view
      } else {
        cardY = bottom + 8;
        if (cardY + cardHeight > rect.height - 8) cardY = top - cardHeight - 8; // Flip if out of view
      }

      // Draw Card Background
      ctx.fillStyle = themeColor;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
      ctx.fill();

      // Draw Card Text
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = '600 11.5px "Noto Sans", -apple-system, sans-serif';
      ctx.fillText(line1, cardX + cardWidth / 2, cardY + 16);

      ctx.font = '500 11px "Noto Sans", -apple-system, sans-serif';
      ctx.fillText(line2, cardX + cardWidth / 2, cardY + 34);

      ctx.font = '500 11px "Noto Sans", -apple-system, sans-serif';
      ctx.fillText(line3, cardX + cardWidth / 2, cardY + 50);

      ctx.restore();
    };

    const clearMeasurementCanvas = () => {
      const pCanvas = previewCanvasRef.current;
      if (pCanvas) {
        const ctx = pCanvas.getContext('2d');
        if (ctx) {
          const rect = container.getBoundingClientRect();
          ctx.clearRect(0, 0, rect.width, rect.height);
        }
      }
      measurementRef.current = null;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;

      const target = e.target as Element;
      if (
        target &&
        (target.closest('[data-floating-ui], .drawing-floating-toolbar, [data-no-deselect], [role="dialog"]') ||
          target.closest('button, input, select, textarea, [role="button"], [role="menu"]'))
      ) {
        return;
      }

      // If we already have a completed measurement on canvas, dismiss it on next click
      if (measurementRef.current?.isComplete) {
        clearMeasurementCanvas();
        if (activeToolRef.current === 'measure') {
          setActiveToolRef.current(null);
        }
        return;
      }

      const isShift = e.shiftKey;
      const isMeasureTool = activeToolRef.current === 'measure';

      if (!isMeasureTool && !isShift) {
        return;
      }

      // Avoid conflict if another tool like eraser or brush is actively running
      if (!isMeasureTool && (activeToolRef.current === 'eraser' || activeToolRef.current === 'brush' || activeToolRef.current === 'highlighter')) {
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

      // Create preview canvas if not present
      let pCanvas = container.querySelector('.measurement-preview-canvas') as HTMLCanvasElement;
      if (!pCanvas) {
        pCanvas = document.createElement('canvas');
        pCanvas.className = 'measurement-preview-canvas';
        pCanvas.style.position = 'absolute';
        pCanvas.style.top = '0';
        pCanvas.style.left = '0';
        pCanvas.style.width = '100%';
        pCanvas.style.height = '100%';
        pCanvas.style.pointerEvents = 'none';
        pCanvas.style.zIndex = '36';
        container.appendChild(pCanvas);
      }
      previewCanvasRef.current = pCanvas;

      measurementRef.current = {
        isActive: true,
        startX,
        startY,
        currentX: startX,
        currentY: startY,
        chartIndex: activeChartIndex,
        isComplete: false,
      };

      renderMeasurement();
    };

    const handlePointerMove = (e: PointerEvent) => {
      const state = measurementRef.current;
      if (!state || !state.isActive || state.isComplete) return;

      const rect = container.getBoundingClientRect();
      state.currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      state.currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      renderMeasurement();
    };

    const handlePointerUp = () => {
      const state = measurementRef.current;
      if (!state || !state.isActive || state.isComplete) return;

      state.isActive = false;
      state.isComplete = true; // Mark complete but keep visible on screen!

      chart.setScrollEnabled(true);
      chart.setZoomEnabled(true);

      renderMeasurement();
    };

    // Global keydown to dismiss measurement on Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && measurementRef.current) {
        clearMeasurementCanvas();
        if (activeToolRef.current === 'measure') {
          setActiveToolRef.current(null);
        }
      }
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);

      if (previewCanvasRef.current) {
        previewCanvasRef.current.remove();
        previewCanvasRef.current = null;
      }
      measurementRef.current = null;
    };
  }, [activeTool, activeChartIndex, chartContainersRef, chartInstancesRef, setActiveTool]);
}
