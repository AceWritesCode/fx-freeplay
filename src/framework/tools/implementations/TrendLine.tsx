import type { ToolDefinition } from '../ToolRegistry';

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
  const customSettings = overlay?.extendData?.customSettings || {};
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
      
      // Text configurations
      const text = customSettings.text || '';
      const textColor = customSettings.textColor || '#2196F3';
      const fontSize = customSettings.fontSize || 14;
      const isBold = !!customSettings.bold;
      const isItalic = !!customSettings.italic;
      const textValign = customSettings.textPosition?.vertical || 'middle';
      const textHalign = customSettings.textPosition?.horizontal || 'right';
      
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
        const width = bounding?.width ?? 1000;
        const height = bounding?.height ?? 500;

        // Compute line endpoints (extrapolate for extend type)
        let lineCoords = [...coordinates];
        if (extendType === 'left' || extendType === 'both') {
          lineCoords[0] = extrapolateLine(coordinates[0], coordinates[1], 'left', width, height);
        }
        if (extendType === 'right' || extendType === 'both') {
          lineCoords[1] = extrapolateLine(coordinates[0], coordinates[1], 'right', width, height);
        }

        // Main line
        figures.push({
          type: 'line',
          attrs: { coordinates: lineCoords },
          styles: {
            style,
            color: lineColor,
            size: lineWidth,
            dashedValue
          },
          ignoreEvent: false,
        });

        // Custom Text Annotation
        if (text) {
          let tx = (coordinates[0].x + coordinates[1].x) / 2;
          let ty = (coordinates[0].y + coordinates[1].y) / 2;
          
          if (textHalign === 'left') tx = Math.min(coordinates[0].x, coordinates[1].x) - 10;
          else if (textHalign === 'right') tx = Math.max(coordinates[0].x, coordinates[1].x) + 10;
          
          if (textValign === 'top') ty = Math.min(coordinates[0].y, coordinates[1].y) - 15;
          else if (textValign === 'bottom') ty = Math.max(coordinates[0].y, coordinates[1].y) + 15;

          figures.push({
            type: 'text',
            attrs: {
              x: tx,
              y: ty,
              text: text,
              align: textHalign,
              baseline: textValign === 'top' ? 'bottom' : (textValign === 'bottom' ? 'top' : 'middle')
            },
            styles: {
              color: textColor,
              size: fontSize,
              weight: isBold ? 'bold' : 'normal',
              style: isItalic ? 'italic' : 'normal'
            },
            ignoreEvent: true
          });
        }

        // Selection point grab handles / fake lock circles
        if ((overlay?.extendData as any)?.isSelected) {
          const isLocked = overlay?.lock || false;
          if (isLocked) {
            coordinates.forEach((coord: any) => {
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
            });
          }
        }
      }
      return figures;
    }
  })
};
