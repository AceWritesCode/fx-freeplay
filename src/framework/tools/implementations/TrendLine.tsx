import type { ToolDefinition } from '../ToolRegistry';
import { drawGrabHandles, drawArrowHeads, isOverlayVisible } from '../toolUtils';

// Simple SVG icon for TrendLine
const TrendLineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="7" r="2" />
  </svg>
);

// Robust extrapolation calculation
const extrapolateLine = (
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  targetSide: 'left' | 'right',
  width: number,
  height: number
) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  if (Math.abs(dx) < 0.0001) {
    // Near vertical line
    if (targetSide === 'left') {
      return { x: p1.x, y: p1.y < p2.y ? -100 : height + 100 };
    } else {
      return { x: p1.x, y: p1.y < p2.y ? height + 100 : -100 };
    }
  }

  const slope = dy / dx;

  if (targetSide === 'left') {
    // Extrapolate in the direction of left side (past p1)
    const targetX = dx > 0 ? -100 : width + 100;
    const targetY = p1.y + slope * (targetX - p1.x);
    return { x: targetX, y: targetY };
  } else {
    // Extrapolate in the direction of right side (past p2)
    const targetX = dx > 0 ? width + 100 : -100;
    const targetY = p2.y + slope * (targetX - p2.x);
    return { x: targetX, y: targetY };
  }
};

export const TrendLineTool: ToolDefinition = {
  id: 'trendLine',
  name: 'Trendline',
  icon: TrendLineIcon,
  group: 'lines',
  hotkey: 'Alt + T',
  
  settingsSchema: [
    {
      id: 'lineColor',
      label: 'Line Color',
      type: 'color',
      defaultValue: '#2196F3'
    },
    {
      id: 'lineWidth',
      label: 'Line Width',
      type: 'number',
      defaultValue: 1,
      min: 1,
      max: 5,
      step: 1
    },
    {
      id: 'lineStyle',
      label: 'Line Style',
      type: 'select',
      defaultValue: 'solid',
      options: [
        { label: 'Solid', value: 'solid' },
        { label: 'Dashed', value: 'dashed' },
        { label: 'Dotted', value: 'dotted' }
      ]
    },
    {
      id: 'arrowType',
      label: 'Arrow',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Starting Point', value: 'start' },
        { label: 'End Point', value: 'end' },
        { label: 'Both', value: 'both' }
      ]
    }
  ],
  
  defaultTemplates: [
    {
      id: 'default',
      name: 'Default',
      commonSettings: {
        lineWidth: 1,
        lineStyle: 'solid',
        arrowType: 'none'
      }
    }
  ],

  createOverlayDef: () => ({
    name: 'trendLine',
    totalStep: 3,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ overlay, coordinates, chart, bounding }) => {
      // 1. Timeframe Visibility Filter
      if (chart && !isOverlayVisible(overlay, chart)) {
        return [];
      }

      const customSettings = (overlay?.extendData as any)?.customSettings || {};
      const lineColor = customSettings.lineColor || '#2196F3';
      const lineWidth = customSettings.lineWidth || 1;
      const lineStyle = customSettings.lineStyle || 'solid';
      const extendType = customSettings.extendType || 'none';
      const arrowType = customSettings.arrowType || 'none';
      
      let style = 'solid';
      let dashedValue = [4, 4];
      if (lineStyle === 'dashed') {
        style = 'dashed';
        dashedValue = [6, 6];
      } else if (lineStyle === 'dotted') {
        style = 'dashed';
        dashedValue = [2, 3];
      }

      const figures: any[] = [];
      if (coordinates.length === 1) {
        drawGrabHandles(figures, coordinates, false);
        return figures;
      }
      if (coordinates.length === 2) {
        const width = bounding?.width ?? 1000;
        const height = bounding?.height ?? 500;

        // Compute line endpoints (extrapolate for extend type)
        let p1 = { ...coordinates[0] };
        let p2 = { ...coordinates[1] };
        if (extendType === 'left' || extendType === 'both') {
          p1 = extrapolateLine(coordinates[0], coordinates[1], 'left', width, height);
        }
        if (extendType === 'right' || extendType === 'both') {
          p2 = extrapolateLine(coordinates[0], coordinates[1], 'right', width, height);
        }

        // 1. Transparent full-length line figure for reliable event hit-testing
        figures.push({
          type: 'line',
          attrs: { coordinates: [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }] },
          styles: {
            style: 'solid',
            color: 'transparent',
            size: Math.max(lineWidth, 8)
          },
          ignoreEvent: false,
        });

        // 2. Draw visible line
        figures.push({
          type: 'line',
          attrs: { coordinates: [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }] },
          styles: {
            style,
            color: lineColor,
            size: lineWidth,
            dashedValue
          },
          ignoreEvent: false,
        });

        // 3. Draw arrowheads at anchor points based on arrowType setting ('none' | 'start' | 'end' | 'both')
        drawArrowHeads(figures, coordinates[0], coordinates[1], arrowType, lineColor, lineWidth);

        // 4. Selection / In-progress creation / Hover grab handles
        const isDrawing = chart && (chart as any)._activeDrawingId === overlay?.id;
        const isSelected = (overlay?.extendData as any)?.isSelected || false;
        const isHovered = (overlay?.extendData as any)?.isHovered || false;
        if (isSelected || isHovered || isDrawing) {
          drawGrabHandles(figures, coordinates, overlay?.lock || false);
        }
      }
      return figures;
    }
  })
};
