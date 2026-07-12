import type { ToolDefinition } from '../ToolRegistry';

const HorizontalRayIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <g fill="currentColor" fillRule="nonzero">
      <path d="M8.5 15h16.5v-1h-16.5z" />
      <path d="M6.5 16c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z" />
    </g>
  </svg>
);

export const HorizontalRayTool: ToolDefinition = {
  id: 'horizontalRay',
  name: 'Horizontal ray',
  icon: HorizontalRayIcon,
  group: 'lines',
  hotkey: 'Alt + J',
  
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
        { label: 'Dashed', value: 'dashed' }
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
    name: 'horizontalRay',
    totalStep: 2,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ overlay, coordinates, bounding }) => {
      // Temporary placeholder: draw a horizontal ray to the right
      const customSettings = (overlay?.extendData as any)?.customSettings || {};
      const lineColor = customSettings.lineColor || '#2196F3';
      const lineWidth = customSettings.lineWidth || 1;
      const figures: any[] = [];
      if (coordinates.length === 1 && bounding) {
        figures.push({
          type: 'line',
          attrs: { coordinates: [{ x: coordinates[0].x, y: coordinates[0].y }, { x: bounding.width, y: coordinates[0].y }] },
          styles: {
            color: lineColor,
            size: lineWidth
          }
        });
      }
      return figures;
    }
  })
};
