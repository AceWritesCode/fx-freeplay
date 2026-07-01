import type { ToolDefinition } from '../ToolRegistry';

// Simple SVG icon for TrendLine
const TrendLineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="7" r="2" />
  </svg>
);

export const TrendLineTool: ToolDefinition = {
  id: 'trendLine',
  name: 'Trend Line',
  icon: TrendLineIcon,
  
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
      themeColors: {
        light: { lineColor: '#000000' },
        dark: { lineColor: '#FFFFFF' }
      },
      commonSettings: {
        lineWidth: 1,
        lineStyle: 'solid'
      }
    }
  ],

  createOverlayDef: () => ({
    name: 'trendLine',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ overlay, coordinates }) => {
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
      if (coordinates.length === 2) {
        figures.push({
          type: 'line',
          attrs: { coordinates },
          styles: {
            style,
            color: lineColor,
            size: lineWidth,
            dashedValue
          },
          ignoreEvent: false,
        });

        if ((overlay?.extendData as any)?.isSelected) {
          const isLocked = overlay?.lock || false;
          const pointRadius = isLocked ? 2.5 : 4;
          const borderSize = isLocked ? 1.5 : 2;
          
          coordinates.forEach((coord: any) => {
            figures.push({
              type: 'circle',
              attrs: { x: coord.x, y: coord.y, r: pointRadius },
              styles: {
                style: 'fill',
                color: '#ffffff',
                borderColor: '#2196f3',
                borderSize: borderSize
              },
              ignoreEvent: true
            });
          });
        }
      }
      return figures;
    }
  })
};
