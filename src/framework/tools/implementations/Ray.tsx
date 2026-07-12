import type { ToolDefinition } from '../ToolRegistry';

// Robust extrapolation calculation extending to the right
const extrapolateRayToRight = (
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
  const targetX = width + 100;
  const targetY = p1.y + slope * (targetX - p1.x);
  return { x: targetX, y: targetY };
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

        // Calculate extrapolated end point always to the right
        const pExtrapolated = extrapolateRayToRight(coordinates[0], coordinates[1], width, height);

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

        // Selection point grab handles / fake lock circles
        if ((overlay?.extendData as any)?.isSelected) {
          const isLocked = overlay?.lock || false;
          coordinates.forEach((coord: any) => {
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
        }
      }
      return figures;
    }
  })
};
