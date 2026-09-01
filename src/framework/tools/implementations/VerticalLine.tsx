import type { ToolDefinition } from '../ToolRegistry';
import { drawGrabHandles, drawArrowHeads, isOverlayVisible } from '../toolUtils';

const VerticalLineIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <g fill="currentColor" fillRule="nonzero">
      <path d="M15 12.5v-8.5h-1v8.5zM14 16.5v8.5h1v-8.5z" />
      <path d="M14.5 16c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z" />
    </g>
  </svg>
);

export const VerticalLineTool: ToolDefinition = {
  id: 'verticalLine',
  name: 'Vertical Line',
  icon: VerticalLineIcon,
  group: 'lines',
  hotkey: 'Alt + V',
  
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
    name: 'verticalLine',
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ overlay, coordinates, chart, bounding }) => {
      if (chart && !isOverlayVisible(overlay, chart)) {
        return [];
      }

      const customSettings = (overlay?.extendData as any)?.customSettings || {};
      const lineColor = customSettings.lineColor || '#2196F3';
      const lineWidth = customSettings.lineWidth || 1;
      const lineStyle = customSettings.lineStyle || 'solid';
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
      if (coordinates.length === 1 && bounding) {
        const pStart = { x: coordinates[0].x, y: 0 };
        const pEnd = { x: coordinates[0].x, y: bounding.height };
        figures.push({
          type: 'line',
          attrs: { coordinates: [pStart, pEnd] },
          styles: {
            style,
            color: lineColor,
            size: lineWidth,
            dashedValue
          },
          ignoreEvent: false
        });

        drawArrowHeads(figures, pStart, pEnd, arrowType, lineColor, lineWidth);

        // Selection / Hover grab handle
        const isSelected = (overlay?.extendData as any)?.isSelected;
        const isHovered = (overlay?.extendData as any)?.isHovered;
        const isDrawing = chart && (chart as any)._activeDrawingId === overlay?.id;
        if (isSelected || isHovered || isDrawing) {
          drawGrabHandles(figures, coordinates, overlay?.lock || false);
        }
      }
      return figures;
    }
  })
};
