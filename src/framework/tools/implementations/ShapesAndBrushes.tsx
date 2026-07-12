import type { ToolDefinition } from '../ToolRegistry';
import { snapPointToCandle } from '../../../utils/overlays';

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const BrushIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <g fill="currentColor" fillRule="nonzero">
      <path d="M1.789 23l.859-.854.221-.228c.18-.19.38-.409.597-.655.619-.704 1.238-1.478 1.815-2.298.982-1.396 1.738-2.776 2.177-4.081 1.234-3.667 5.957-4.716 8.923-1.263 3.251 3.785-.037 9.38-5.379 9.38h-9.211zm9.211-1c4.544 0 7.272-4.642 4.621-7.728-2.45-2.853-6.225-2.015-7.216.931-.474 1.408-1.273 2.869-2.307 4.337-.599.852-1.241 1.653-1.882 2.383l-.068.078h6.853z" />
      <path d="M18.182 6.002l-1.419 1.286c-1.031.935-1.075 2.501-.096 3.48l1.877 1.877c.976.976 2.553.954 3.513-.045l5.65-5.874-.721-.693-5.65 5.874c-.574.596-1.507.609-2.086.031l-1.877-1.877c-.574-.574-.548-1.48.061-2.032l1.419-1.286-.672-.741z" />
    </g>
  </svg>
);

const HighlighterIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 23" className={className}>
    <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M13.402 0L6.78144 6.71532C6.67313 6.82518 6.5917 6.95862 6.54354 7.10518L5.13578 11.3889C4.89843 12.1111 5.08375 12.9074 5.61449 13.4458L5.68264 13.5149L0 19.2789L8.12695 22.4056L11.2874 19.1999L11.3556 19.269C11.8863 19.8073 12.6713 19.9953 13.3834 19.7546L17.6013 18.3285C17.7493 18.2784 17.8835 18.1945 17.9931 18.0832L24.6912 11.2892L23.9857 10.5837L17.515 17.147L7.70658 7.19818L14.1076 0.705575L13.402 0ZM6.07573 11.7067L7.24437 8.15061L16.576 17.6158L13.0701 18.8012C12.7141 18.9215 12.3215 18.8275 12.0562 18.5584L6.31509 12.7351C6.04972 12.466 5.95706 12.0678 6.07573 11.7067ZM6.30539 14.3045L10.509 18.5682L7.87935 21.2355L1.78414 18.8904L6.30539 14.3045Z" />
  </svg>
);

const ArrowIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <g fill="currentColor">
      <path fillRule="nonzero" d="M7.354 21.354l14-14-.707-.707-14 14z" />
      <path d="M21 7l-8 3 5 5z" />
      <path fillRule="nonzero" d="M22.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM5.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z" />
    </g>
  </svg>
);

const RectangleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <g fill="currentColor" fillRule="nonzero">
      <path d="M7.5 6h13v-1h-13z" id="Line" />
      <path d="M7.5 23h13v-1h-13z" />
      <path d="M5 7.5v13h1v-13z" />
      <path d="M22 7.5v13h1v-13z" />
      <path d="M5.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM22.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM22.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM5.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z" />
    </g>
  </svg>
);

const PathIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <path fill="currentColor" d="M11 10.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm4 7a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm11-8.8V13h1V7h-6v1h4.3l-7.42 7.41a2.49 2.49 0 0 0-2.76 0l-3.53-3.53a2.5 2.5 0 1 0-4.17 0L1 18.29l.7.71 6.42-6.41a2.49 2.49 0 0 0 2.76 0l3.53 3.53a2.5 2.5 0 1 0 4.17 0z" />
  </svg>
);

const CircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} fill="none">
    <path stroke="currentColor" d="M16 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
    <path fill="currentColor" fillRule="evenodd" d="M4.5 14a9.5 9.5 0 0 1 18.7-2.37 2.5 2.5 0 0 0 0 4.74A9.5 9.5 0 0 1 4.5 14Zm19.7 2.5a10.5 10.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5ZM22.5 14a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
  </svg>
);

const CurveIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <g fill="currentColor" fillRule="nonzero">
      <path d="M6.256 20.652c.548-3.024 1.607-5.962 3.329-8.312l-.807-.591c-1.825 2.493-2.933 5.565-3.506 8.725l.984.178z" />
      <path d="M12.243 9.657c2.365-1.764 5.345-2.846 8.416-3.402l-.178-.984c-3.21.581-6.326 1.712-8.836 3.584l.598.802z" />
      <path d="M10.5 12c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM22.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM5.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z" />
    </g>
  </svg>
);

// ─── Timeframe Visibility Helper ─────────────────────────────────────────────

const parseTimeframe = (tf: string) => {
  const match = tf.match(/^(\d+)([a-zA-Z]+)$/);
  if (!match) return { value: 1, unit: 'minutes' };
  const val = parseInt(match[1]);
  const unitChar = match[2];
  let unit = 'minutes';
  if (unitChar === 's') unit = 'seconds';
  else if (unitChar === 'm') unit = 'minutes';
  else if (unitChar === 'h' || unitChar === 'H') unit = 'hours';
  else if (unitChar === 'd' || unitChar === 'D') unit = 'days';
  else if (unitChar === 'w' || unitChar === 'W') unit = 'weeks';
  else if (unitChar === 'M') unit = 'months';
  return { value: val, unit };
};

const isOverlayVisible = (overlay: any, chart: any) => {
  const customSettings = (overlay?.extendData as any)?.customSettings || {};
  const visibility = customSettings.visibility;
  if (!visibility) return true; // Default visible
  
  const tf = chart?._loadedTimeframe || '1m';
  const { value, unit } = parseTimeframe(tf);
  
  const rule = visibility[unit];
  if (!rule) return true;
  if (!rule.show) return false;
  
  if (rule.min !== undefined && value < rule.min) return false;
  if (rule.max !== undefined && value > rule.max) return false;
  
  return true;
};

// ─── Grab Handle Styles Helper ───────────────────────────────────────────────

const drawGrabHandles = (figures: any[], coordinates: any[], isLocked: boolean) => {
  coordinates.forEach((coord: any) => {
    if (!coord) return;
    if (isLocked) {
      figures.push({
        type: 'circle',
        attrs: { x: coord.x, y: coord.y, r: 2.5 },
        styles: {
          style: 'fill',
          color: '#474a59',
          borderColor: '#6a6d7c',
          borderSize: 1.5
        },
        ignoreEvent: true
      });
    } else {
      figures.push({
        type: 'circle',
        attrs: { x: coord.x, y: coord.y, r: 4.5 },
        styles: {
          style: 'fill',
          color: '#ffffff',
          borderColor: '#2196F3',
          borderSize: 1.5
        },
        ignoreEvent: true
      });
    }
  });
};

// ─── 1. Brush / Highlighter Tool ──────────────────────────────────────────────

const createBrushOverlayDef = (id: string, isHighlighter: boolean) => ({
  name: id,
  totalStep: 9999,
  needDefaultPointFigure: false,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false,
  createPointFigures: ({ overlay, coordinates, chart }: any) => {
    if (chart && !isOverlayVisible(overlay, chart)) {
      return [];
    }

    const customSettings = (overlay?.extendData as any)?.customSettings || {};
    const color = customSettings.lineColor || (isHighlighter ? 'rgba(255, 235, 59, 0.4)' : '#2196F3');
    const width = customSettings.lineWidth || (isHighlighter ? 10 : 3);

    // Collect points in extendData while drawing
    const pts = chart.convertToPixel(overlay.points, { paneId: 'candle_pane' });

    // Handle mouse drag accumulation during drawing
    if (coordinates.length > 0 && (!overlay.points || overlay.points.length <= 2)) {
      const currentPoints = (overlay.extendData as any)?.brushPoints || [];
      const movingPoint = coordinates[coordinates.length - 1];

      if (movingPoint) {
        if (currentPoints.length === 0) {
          currentPoints.push(movingPoint);
          overlay.extendData = { ...(overlay.extendData as any), brushPoints: currentPoints };
        } else {
          const lastPt = currentPoints[currentPoints.length - 1];
          const dist = Math.sqrt((movingPoint.x - lastPt.x) ** 2 + (movingPoint.y - lastPt.y) ** 2);
          if (dist > 3) {
            currentPoints.push(movingPoint);
            overlay.extendData = { ...(overlay.extendData as any), brushPoints: currentPoints };
          }
        }
      }
    }

    const renderPoints = (overlay.points && overlay.points.length > 2)
      ? pts
      : ((overlay.extendData as any)?.brushPoints || coordinates);

    if (renderPoints.length < 2) return [];

    const figures: any[] = [];
    
    // Draw connecting segments
    figures.push({
      type: 'line',
      attrs: { coordinates: renderPoints },
      styles: {
        style: 'solid',
        color: color,
        size: width,
        lineCap: 'round',
        lineJoin: 'round'
      },
      ignoreEvent: false
    });

    // Draw grab handles at start/end if selected
    if ((overlay.extendData as any)?.isSelected && renderPoints.length > 0) {
      const isLocked = overlay.lock || false;
      const handles = [renderPoints[0], renderPoints[renderPoints.length - 1]];
      drawGrabHandles(figures, handles, isLocked);
    }

    return figures;
  },
  onDrawEnd: (event: any) => {
    const brushPoints = (event.overlay.extendData as any)?.brushPoints || [];
    if (brushPoints.length > 0) {
      const chartPoints = event.chart.convertFromPixel(brushPoints, { paneId: 'candle_pane' });
      event.chart.overrideOverlay({
        id: event.overlay.id,
        points: chartPoints
      });
    }
  }
});

export const BrushTool: ToolDefinition = {
  id: 'brush',
  name: 'Brush',
  icon: BrushIcon,
  group: 'shapes',
  settingsSchema: [
    { id: 'lineColor', label: 'Color', type: 'color', defaultValue: '#2196F3' },
    { id: 'lineWidth', label: 'Width', type: 'number', defaultValue: 3, min: 1, max: 10, step: 1 }
  ],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: { lineWidth: 3, lineColor: '#2196F3' } }],
  createOverlayDef: () => createBrushOverlayDef('brush', false)
};

export const HighlighterTool: ToolDefinition = {
  id: 'highlighter',
  name: 'Highlighter',
  icon: HighlighterIcon,
  group: 'shapes',
  settingsSchema: [
    { id: 'lineColor', label: 'Color', type: 'color', defaultValue: 'rgba(255, 235, 59, 0.4)' },
    { id: 'lineWidth', label: 'Width', type: 'number', defaultValue: 10, min: 5, max: 25, step: 1 }
  ],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: { lineWidth: 10, lineColor: 'rgba(255, 235, 59, 0.4)' } }],
  createOverlayDef: () => createBrushOverlayDef('highlighter', true)
};

// ─── 2. Arrow Tool ───────────────────────────────────────────────────────────

export const ArrowTool: ToolDefinition = {
  id: 'arrow',
  name: 'Arrow',
  icon: ArrowIcon,
  group: 'shapes',
  settingsSchema: [
    { id: 'lineColor', label: 'Color', type: 'color', defaultValue: '#2196F3' },
    { id: 'lineWidth', label: 'Width', type: 'number', defaultValue: 1, min: 1, max: 5, step: 1 }
  ],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: { lineWidth: 1, lineColor: '#2196F3' } }],
  createOverlayDef: () => ({
    name: 'arrow',
    totalStep: 3,
    needDefaultPointFigure: false,
    createPointFigures: ({ overlay, coordinates, chart }) => {
      if (chart && !isOverlayVisible(overlay, chart)) {
        return [];
      }

      if (coordinates.length < 2) return [];

      const customSettings = (overlay?.extendData as any)?.customSettings || {};
      const lineColor = customSettings.lineColor || '#2196F3';
      const lineWidth = customSettings.lineWidth || 1;

      const p1 = coordinates[0];
      const p2 = coordinates[1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const angle = Math.atan2(dy, dx);
      const headLength = 12 + lineWidth; 

      // Arrowhead points
      const pLeft = {
        x: p2.x - headLength * Math.cos(angle - Math.PI / 6),
        y: p2.y - headLength * Math.sin(angle - Math.PI / 6)
      };
      const pRight = {
        x: p2.x - headLength * Math.cos(angle + Math.PI / 6),
        y: p2.y - headLength * Math.sin(angle + Math.PI / 6)
      };

      const figures: any[] = [];

      // Shaft line
      figures.push({
        type: 'line',
        attrs: { coordinates: [p1, p2] },
        styles: { color: lineColor, size: lineWidth },
        ignoreEvent: false
      });

      // Head Polygon
      figures.push({
        type: 'polygon',
        attrs: { coordinates: [p2, pLeft, pRight] },
        styles: { style: 'fill', color: lineColor },
        ignoreEvent: true
      });

      // Grab Handles
      if ((overlay.extendData as any)?.isSelected) {
        drawGrabHandles(figures, coordinates, overlay.lock || false);
      }

      return figures;
    }
  })
};

// ─── 3. Rectangle Tool (8-point control) ─────────────────────────────────────

export const RectangleTool: ToolDefinition = {
  id: 'rectangle',
  name: 'Rectangle',
  icon: RectangleIcon,
  group: 'shapes',
  hotkey: 'Alt + Shift + R',
  settingsSchema: [
    { id: 'lineColor', label: 'Border Color', type: 'color', defaultValue: '#2196F3' },
    { id: 'lineWidth', label: 'Border Size', type: 'number', defaultValue: 1, min: 1, max: 5, step: 1 },
    { id: 'lineStyle', label: 'Border Style', type: 'lineStyle', defaultValue: 'solid' },
    { id: 'fillColor', label: 'Fill Background', type: 'color', defaultValue: 'rgba(33, 150, 243, 0.1)' }
  ],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: { lineWidth: 1, lineColor: '#2196F3', fillColor: 'rgba(33, 150, 243, 0.1)' } }],
  
  createOverlayDef: () => ({
    name: 'rectangle',
    totalStep: 3,
    needDefaultPointFigure: false,
    createPointFigures: ({ overlay, coordinates, chart }) => {
      if (chart && !isOverlayVisible(overlay, chart)) {
        return [];
      }
      if (coordinates.length < 2) return [];

      const customSettings = (overlay?.extendData as any)?.customSettings || {};
      const lineColor = customSettings.lineColor || '#2196F3';
      const lineWidth = customSettings.lineWidth || 1;
      const fillColor = customSettings.fillBackground !== false ? (customSettings.fillColor || 'rgba(33, 150, 243, 0.1)') : 'transparent';
      const lineStyle = customSettings.lineStyle || 'solid';

      let style = 'solid';
      let dashedValue = [4, 4];
      if (lineStyle === 'dashed') {
        style = 'dashed';
      } else if (lineStyle === 'dotted') {
        style = 'dashed';
        dashedValue = [2, 2];
      }

      const p1 = coordinates[0];
      const p2 = coordinates.length >= 8 ? coordinates[2] : coordinates[1];

      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const w = Math.abs(p1.x - p2.x);
      const h = Math.abs(p1.y - p2.y);

      const figures: any[] = [];

      // Main rectangle body
      figures.push({
        type: 'rect',
        attrs: { x, y, width: w, height: h },
        styles: {
          style: 'stroke_fill',
          color: fillColor,
          borderColor: lineColor,
          borderSize: lineWidth,
          borderStyle: style,
          borderDashedValue: dashedValue
        },
        ignoreEvent: false
      });

      // 8 Grab Handles if selected
      if ((overlay.extendData as any)?.isSelected && coordinates.length >= 8) {
        drawGrabHandles(figures, coordinates, overlay.lock || false);
      }

      return figures;
    }
  }),

  onDrawEnd: (event: any) => {
    const points = event.overlay.points;
    if (points.length < 2) return;

    const p1 = points[0];
    const p2 = points[1];

    const xMin = Math.min(p1.timestamp, p2.timestamp);
    const xMax = Math.max(p1.timestamp, p2.timestamp);
    const diMin = p1.timestamp < p2.timestamp ? p1.dataIndex : p2.dataIndex;
    const diMax = p1.timestamp < p2.timestamp ? p2.dataIndex : p1.dataIndex;
    const yMin = Math.min(p1.value, p2.value);
    const yMax = Math.max(p1.value, p2.value);

    const xMid = (xMin + xMax) / 2;
    const yMid = (yMin + yMax) / 2;
    const diMid = (diMin !== undefined && diMax !== undefined) ? Math.round((diMin + diMax) / 2) : undefined;

    const newPoints = [
      { timestamp: xMin, value: yMin, dataIndex: diMin }, // 0: top-left
      { timestamp: xMax, value: yMin, dataIndex: diMax }, // 1: top-right
      { timestamp: xMax, value: yMax, dataIndex: diMax }, // 2: bottom-right
      { timestamp: xMin, value: yMax, dataIndex: diMin }, // 3: bottom-left
      { timestamp: xMid, value: yMin, dataIndex: diMid }, // 4: top-center
      { timestamp: xMid, value: yMax, dataIndex: diMid }, // 5: bottom-center
      { timestamp: xMin, value: yMid, dataIndex: diMin }, // 6: left-center
      { timestamp: xMax, value: yMid, dataIndex: diMax }  // 7: right-center
    ];

    event.chart.overrideOverlay({
      id: event.overlay.id,
      points: newPoints
    });
  },

  onPressedMoving: (event: any, draggedIndex: number) => {
    const points = [...event.overlay.points];
    if (points.length < 8) return false;

    const mousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];
    if (!mousePt) return false;

    const snapped = snapPointToCandle(event, event.x, event.y);
    const targetPt = snapped || mousePt;

    const x = targetPt.timestamp;
    const y = targetPt.value;
    const di = targetPt.dataIndex;

    const startPoints = (event.overlay.extendData as any)?.startPoints;

    let xMin = startPoints ? startPoints[0].timestamp : points[0].timestamp;
    let xMax = startPoints ? startPoints[2].timestamp : points[2].timestamp;
    let diMin = startPoints ? startPoints[0].dataIndex : points[0].dataIndex;
    let diMax = startPoints ? startPoints[2].dataIndex : points[2].dataIndex;
    let yMin = startPoints ? startPoints[0].value : points[0].value;
    let yMax = startPoints ? startPoints[2].value : points[2].value;

    switch (draggedIndex) {
      case 0: // top-left
        xMin = x; yMin = y; diMin = di; break;
      case 1: // top-right
        xMax = x; yMin = y; diMax = di; break;
      case 2: // bottom-right
        xMax = x; yMax = y; diMax = di; break;
      case 3: // bottom-left
        xMin = x; yMax = y; diMin = di; break;
      case 4: // top-center
        yMin = y; break;
      case 5: // bottom-center
        yMax = y; break;
      case 6: // left-center
        xMin = x; diMin = di; break;
      case 7: // right-center
        xMax = x; diMax = di; break;
    }

    const xMid = (xMin + xMax) / 2;
    const yMid = (yMin + yMax) / 2;
    const diMid = (diMin !== undefined && diMax !== undefined) ? Math.round((diMin + diMax) / 2) : undefined;

    points[0] = { timestamp: xMin, value: yMin, dataIndex: diMin };
    points[1] = { timestamp: xMax, value: yMin, dataIndex: diMax };
    points[2] = { timestamp: xMax, value: yMax, dataIndex: diMax };
    points[3] = { timestamp: xMin, value: yMax, dataIndex: diMin };
    points[4] = { timestamp: xMid, value: yMin, dataIndex: diMid };
    points[5] = { timestamp: xMid, value: yMax, dataIndex: diMid };
    points[6] = { timestamp: xMin, value: yMid, dataIndex: diMin };
    points[7] = { timestamp: xMax, value: yMid, dataIndex: diMax };

    event.chart.overrideOverlay({
      id: event.overlay.id,
      points
    });

    return true;
  }
};

// ─── 4. Path Tool ────────────────────────────────────────────────────────────

export const PathTool: ToolDefinition = {
  id: 'path',
  name: 'Path',
  icon: PathIcon,
  group: 'shapes',
  settingsSchema: [
    { id: 'lineColor', label: 'Color', type: 'color', defaultValue: '#2196F3' },
    { id: 'lineWidth', label: 'Width', type: 'number', defaultValue: 1, min: 1, max: 5, step: 1 },
    { id: 'lineStyle', label: 'Style', type: 'lineStyle', defaultValue: 'solid' }
  ],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: { lineWidth: 1, lineColor: '#2196F3' } }],
  createOverlayDef: () => ({
    name: 'path',
    totalStep: 99,
    needDefaultPointFigure: false,
    createPointFigures: ({ overlay, coordinates, chart }) => {
      if (chart && !isOverlayVisible(overlay, chart)) {
        return [];
      }
      if (coordinates.length < 2) return [];

      const customSettings = (overlay?.extendData as any)?.customSettings || {};
      const lineColor = customSettings.lineColor || '#2196F3';
      const lineWidth = customSettings.lineWidth || 1;
      const lineStyle = customSettings.lineStyle || 'solid';

      let style = 'solid';
      let dashedValue = [4, 4];
      if (lineStyle === 'dashed') {
        style = 'dashed';
      } else if (lineStyle === 'dotted') {
        style = 'dashed';
        dashedValue = [2, 2];
      }

      const figures: any[] = [];
      figures.push({
        type: 'line',
        attrs: { coordinates },
        styles: { style, color: lineColor, size: lineWidth, dashedValue },
        ignoreEvent: false
      });

      if ((overlay.extendData as any)?.isSelected) {
        drawGrabHandles(figures, coordinates, overlay.lock || false);
      }

      return figures;
    }
  })
};

// ─── 5. Circle Tool ──────────────────────────────────────────────────────────

export const CircleTool: ToolDefinition = {
  id: 'circle',
  name: 'Circle',
  icon: CircleIcon,
  group: 'shapes',
  settingsSchema: [
    { id: 'lineColor', label: 'Border Color', type: 'color', defaultValue: '#2196F3' },
    { id: 'lineWidth', label: 'Border Size', type: 'number', defaultValue: 1, min: 1, max: 5, step: 1 },
    { id: 'fillColor', label: 'Fill Background', type: 'color', defaultValue: 'rgba(33, 150, 243, 0.1)' }
  ],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: { lineWidth: 1, lineColor: '#2196F3', fillColor: 'rgba(33, 150, 243, 0.1)' } }],
  createOverlayDef: () => ({
    name: 'circle',
    totalStep: 3,
    needDefaultPointFigure: false,
    createPointFigures: ({ overlay, coordinates, chart }) => {
      if (chart && !isOverlayVisible(overlay, chart)) {
        return [];
      }
      if (coordinates.length < 2) return [];

      const customSettings = (overlay?.extendData as any)?.customSettings || {};
      const lineColor = customSettings.lineColor || '#2196F3';
      const lineWidth = customSettings.lineWidth || 1;
      const fillColor = customSettings.fillBackground !== false ? (customSettings.fillColor || 'rgba(33, 150, 243, 0.1)') : 'transparent';

      const center = coordinates[0];
      const outer = coordinates[1];
      const r = Math.sqrt((outer.x - center.x) ** 2 + (outer.y - center.y) ** 2);

      const figures: any[] = [];
      figures.push({
        type: 'circle',
        attrs: { x: center.x, y: center.y, r },
        styles: {
          style: 'stroke_fill',
          color: fillColor,
          borderColor: lineColor,
          borderSize: lineWidth
        },
        ignoreEvent: false
      });

      if ((overlay.extendData as any)?.isSelected) {
        drawGrabHandles(figures, coordinates, overlay.lock || false);
      }

      return figures;
    }
  })
};

// ─── 6. Curve Tool (3-point quadratic Bezier) ─────────────────────────────────

export const CurveTool: ToolDefinition = {
  id: 'curve',
  name: 'Curve',
  icon: CurveIcon,
  group: 'shapes',
  settingsSchema: [
    { id: 'lineColor', label: 'Color', type: 'color', defaultValue: '#2196F3' },
    { id: 'lineWidth', label: 'Width', type: 'number', defaultValue: 1, min: 1, max: 5, step: 1 },
    { id: 'lineStyle', label: 'Style', type: 'lineStyle', defaultValue: 'solid' }
  ],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: { lineWidth: 1, lineColor: '#2196F3' } }],
  createOverlayDef: () => ({
    name: 'curve',
    totalStep: 4,
    needDefaultPointFigure: false,
    createPointFigures: ({ overlay, coordinates, chart }) => {
      if (chart && !isOverlayVisible(overlay, chart)) {
        return [];
      }
      if (coordinates.length < 2) return [];

      const customSettings = (overlay?.extendData as any)?.customSettings || {};
      const lineColor = customSettings.lineColor || '#2196F3';
      const lineWidth = customSettings.lineWidth || 1;
      const lineStyle = customSettings.lineStyle || 'solid';

      let style = 'solid';
      let dashedValue = [4, 4];
      if (lineStyle === 'dashed') {
        style = 'dashed';
      } else if (lineStyle === 'dotted') {
        style = 'dashed';
        dashedValue = [2, 2];
      }

      const p0 = coordinates[0];
      const p1 = coordinates[1];
      const p2 = coordinates.length >= 3 ? coordinates[2] : { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };

      // Generate quadratic Bezier segments
      const curvePoints: { x: number; y: number }[] = [];
      const segmentsCount = 30;
      for (let i = 0; i <= segmentsCount; i++) {
        const t = i / segmentsCount;
        const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p2.x + t ** 2 * p1.x;
        const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p2.y + t ** 2 * p1.y;
        curvePoints.push({ x, y });
      }

      const figures: any[] = [];
      figures.push({
        type: 'line',
        attrs: { coordinates: curvePoints },
        styles: { style, color: lineColor, size: lineWidth, dashedValue },
        ignoreEvent: false
      });

      // Show handles at control points if selected
      if ((overlay.extendData as any)?.isSelected) {
        const handles = coordinates.length >= 3 ? coordinates : [p0, p1];
        drawGrabHandles(figures, handles, overlay.lock || false);
      }

      return figures;
    }
  })
};
