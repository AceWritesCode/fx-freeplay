import type { ToolDefinition } from '../ToolRegistry';

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
    name: 'ray',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ overlay, coordinates }) => {
      // Temporary placeholder: draw a line
      const customSettings = (overlay?.extendData as any)?.customSettings || {};
      const lineColor = customSettings.lineColor || '#2196F3';
      const lineWidth = customSettings.lineWidth || 1;
      const figures: any[] = [];
      if (coordinates.length === 2) {
        figures.push({
          type: 'line',
          attrs: { coordinates: [coordinates[0], coordinates[1]] },
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
