import type { ToolDefinition, ToolMutationResult } from '../ToolRegistry';
import { snapPointToCandle } from '@/engine/charting';
import { drawGrabHandles } from '../toolUtils';
import { Type } from 'lucide-react';

const isOverlayVisible = (overlay: any, _chart: any) => {
  const customSettings = (overlay?.extendData as any)?.customSettings || {};
  const visibility = customSettings.visibility;
  if (!visibility) return true;
  return true;
};

export const TextTool: ToolDefinition = {
  id: 'text',
  name: 'Text',
  icon: Type,
  group: 'text',
  settingsSchema: [
    { id: 'text', label: 'Text', type: 'color', defaultValue: 'Text' },
    { id: 'textColor', label: 'Text Color', type: 'color', defaultValue: '#2196F3' },
    { id: 'fontSize', label: 'Font Size', type: 'number', defaultValue: 14, min: 10, max: 48, step: 1 }
  ],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: { text: 'Text', textColor: '#2196F3', fontSize: 14 } }],
  
  createOverlayDef: () => ({
    name: 'fxText',
    totalStep: 2,
    needDefaultPointFigure: false,
    createPointFigures: ({ overlay, coordinates, chart }) => {
      if (chart && !isOverlayVisible(overlay, chart)) {
        return [];
      }
      if (coordinates.length === 0) return [];

      const customSettings = (overlay?.extendData as any)?.customSettings || {};
      const lineColor = customSettings.textColor || '#2196F3';
      const lineWidth = 1;
      const fillColor = 'rgba(33, 150, 243, 0.08)';

      let x = 0, y = 0, w = 150, h = 60;

      if (coordinates.length === 1) {
        x = coordinates[0].x;
        y = coordinates[0].y;
      } else {
        const p1 = coordinates[0];
        const p2 = coordinates.length >= 8 ? coordinates[2] : coordinates[1];
        x = Math.min(p1.x, p2.x);
        y = Math.min(p1.y, p2.y);
        w = Math.abs(p1.x - p2.x);
        h = Math.abs(p1.y - p2.y);
      }

      const figures: any[] = [];

      // Main rectangle body (copy from Rectangle mechanics for Goal 1)
      figures.push({
        type: 'rect',
        attrs: { x, y, width: w, height: h },
        styles: {
          style: 'stroke_fill',
          color: fillColor,
          borderColor: lineColor,
          borderSize: lineWidth,
          borderStyle: 'solid'
        },
        ignoreEvent: false
      });

      // Grab Handles if selected or hovered (copied from Rectangle for Goal 1)
      const isSelected = (overlay.extendData as any)?.isSelected;
      const isHovered = (overlay.extendData as any)?.isHovered;
      if (isSelected || isHovered) {
        drawGrabHandles(figures, coordinates, overlay.lock || false);
      }

      return figures;
    }
  }),

  onDrawEnd: (event: any) => {
    const points = event.overlay.points;
    if (points.length === 0) return;

    const p1 = points[0];
    let p2 = points[1];

    if (!p2) {
      // One-click creation: calculate default offset (150px wide x 60px high)
      const p1Pixel = event.chart.convertToPixel([p1], { paneId: 'candle_pane' })?.[0];
      if (p1Pixel) {
        const p2Target = event.chart.convertFromPixel(
          [{ x: p1Pixel.x + 150, y: p1Pixel.y + 60 }],
          { paneId: 'candle_pane' }
        )?.[0];
        if (p2Target) {
          p2 = p2Target;
        }
      }
    }

    if (!p2) {
      p2 = { timestamp: p1.timestamp, value: p1.value, dataIndex: p1.dataIndex };
    }

    const xMin = Math.min(p1.timestamp, p2.timestamp);
    const xMax = Math.max(p1.timestamp, p2.timestamp);
    const diMin = (p1.dataIndex !== undefined && p2.dataIndex !== undefined)
      ? (p1.timestamp <= p2.timestamp ? p1.dataIndex : p2.dataIndex)
      : p1.dataIndex;
    const diMax = (p1.dataIndex !== undefined && p2.dataIndex !== undefined)
      ? (p1.timestamp <= p2.timestamp ? p2.dataIndex : p1.dataIndex)
      : p1.dataIndex;
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
      case 0: xMin = x; yMin = y; diMin = di; break;
      case 1: xMax = x; yMin = y; diMax = di; break;
      case 2: xMax = x; yMax = y; diMax = di; break;
      case 3: xMin = x; yMax = y; diMin = di; break;
      case 4: yMin = y; break;
      case 5: yMax = y; break;
      case 6: xMin = x; diMin = di; break;
      case 7: xMax = x; diMax = di; break;
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

    return { points } satisfies ToolMutationResult;
  }
};
