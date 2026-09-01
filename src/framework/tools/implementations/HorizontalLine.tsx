import type { ToolDefinition } from '../ToolRegistry';
import { drawGrabHandles, drawArrowHeads, isOverlayVisible } from '../toolUtils';

const HorizontalLineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const HorizontalLineTool: ToolDefinition = {
  id: 'horizontalLine',
  name: 'Horizontal Line',
  icon: HorizontalLineIcon,
  group: 'lines',
  hotkey: 'Alt + H',
  
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
    name: 'horizontalLine',
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
        const pStart = { x: 0, y: coordinates[0].y };
        const pEnd = { x: bounding.width, y: coordinates[0].y };
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
