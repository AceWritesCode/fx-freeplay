import type { ToolDefinition } from '../ToolRegistry';
import { drawGrabHandles, drawArrowHeads, isOverlayVisible } from '../toolUtils';

// Robust extrapolation calculation extending in the direction of p2
const extrapolateRay = (
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  width: number,
  height: number
) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  if (Math.abs(dx) < 0.0001) {
    // Near vertical line, extends downwards/upwards depending on dy
    return { x: p1.x, y: dy >= 0 ? height + 100 : -100 };
  }

  const slope = dy / dx;
  const targetX = dx > 0 ? width + 100 : -100;
  const targetY = p1.y + slope * (targetX - p1.x);
  return { x: targetX, y: targetY };
};

const RayIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <g fill="currentColor" fillRule="nonzero">
      <path d="M8.354 20.354l5-5-.707-.707-5 5z" />
      <path d="M16.354 12.354l8-8-.707-.707-8 8z" />
      <path d="M14.5 15c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM6.5 23c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z" />
    </g>
  </svg>
);

export const RayTool: ToolDefinition = {
  id: 'ray',
  name: 'Ray',
  icon: RayIcon,
  group: 'lines',
  
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
    }
  ],
  
  defaultTemplates: [
    {
      id: 'default',
      name: 'Default',
      commonSettings: {
        lineWidth: 1,
        lineStyle: 'solid'
      }
    }
  ],

  createOverlayDef: () => ({
    name: 'ray',
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

      let style = 'solid';
      let dashedValue = [4, 4];
      if (lineStyle === 'dashed') {
        style = 'dashed';
      } else if (lineStyle === 'dotted') {
        style = 'dashed';
        dashedValue = [2, 2];
      }

      const figures: any[] = [];
      if (coordinates.length === 1) {
        drawGrabHandles(figures, coordinates, false);
        return figures;
      }
      if (coordinates.length === 2) {
        const width = bounding?.width ?? 1000;
        const height = bounding?.height ?? 500;

        // Calculate extrapolated end point in the direction of the second anchor
        const pExtrapolated = extrapolateRay(coordinates[0], coordinates[1], width, height);

        figures.push({
          type: 'line',
          attrs: { coordinates: [coordinates[0], pExtrapolated] },
          styles: {
            style,
            color: lineColor,
            size: lineWidth,
            dashedValue
          },
          ignoreEvent: false
        });

        // Draw arrowheads at endpoints based on startArrow and endArrow settings
        const startArrow = customSettings.startArrow || 'normal';
        const endArrow = customSettings.endArrow || 'normal';
        drawArrowHeads(figures, coordinates[0], coordinates[1], startArrow, endArrow, lineColor, lineWidth);

        // Selection / In-progress creation / Hover grab handles
        const isDrawing = chart && (chart as any)._activeDrawingId === overlay?.id;
        const isSelected = (overlay?.extendData as any)?.isSelected;
        const isHovered = (overlay?.extendData as any)?.isHovered;
        if (isSelected || isHovered || isDrawing) {
          drawGrabHandles(figures, coordinates, overlay?.lock || false);
        }
      }
      return figures;
    }
  })
};
