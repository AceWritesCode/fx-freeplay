import type { ToolDefinition, ToolMutationResult } from '../ToolRegistry';
import { snapPointToCandle } from '@/engine/charting';
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
    { id: 'text', label: 'Text', type: 'color', defaultValue: 'Add text...' },
    { id: 'textColor', label: 'Text Color', type: 'color', defaultValue: '#2196F3' },
    { id: 'fontSize', label: 'Font Size', type: 'number', defaultValue: 14, min: 10, max: 48, step: 1 }
  ],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: { text: 'Add text...', textColor: '#2196F3', fontSize: 14 } }],
  
  createOverlayDef: () => ({
    name: 'fxText',
    totalStep: 2,
    needDefaultPointFigure: false,
    createPointFigures: ({ overlay, coordinates, chart }) => {
      if (chart && !isOverlayVisible(overlay, chart)) {
        return [];
      }
      
      // Before single click (while moving cursor around canvas): show absolutely nothing!
      if (coordinates.length < 2) {
        return [];
      }

      const customSettings = (overlay?.extendData as any)?.customSettings || {};
      const textColor = customSettings.textColor || '#787b86';
      const textContent = customSettings.text || 'Add text...';
      const fontSize = customSettings.fontSize || 14;

      const p1 = coordinates[0]; // Top-left position
      const p2 = coordinates[1]; // Center-right width anchor

      const x = p1.x;
      const y = p1.y;
      const w = Math.max(60, p2.x - p1.x);
      const h = 32; // Default single-line box height

      const figures: any[] = [];

      // Main text box background (no background/highlight)
      figures.push({
        type: 'rect',
        attrs: { x, y, width: w, height: h },
        styles: {
          style: 'stroke_fill',
          color: 'transparent',
          borderColor: 'transparent',
          borderSize: 0,
          borderStyle: 'solid'
        },
        ignoreEvent: false
      });

      // Text content inside the box
      figures.push({
        type: 'text',
        attrs: {
          x: x + 8,
          y: y + h / 2,
          text: textContent,
          baseline: 'middle',
          align: 'left'
        },
        styles: {
          color: textColor,
          size: fontSize,
          family: 'sans-serif'
        },
        ignoreEvent: false
      });

      // EXACTLY ONE ANCHOR: Center-Right Resize Handle
      const isSelected = (overlay.extendData as any)?.isSelected;
      const isHovered = (overlay.extendData as any)?.isHovered;
      if (isSelected || isHovered) {
        const isLocked = overlay.lock || false;
        if (!isLocked) {
          const handleX = p1.x + w;
          const handleY = y + h / 2;
          figures.push({
            type: 'circle',
            attrs: { cx: handleX, cy: handleY, r: 4.5 },
            styles: {
              style: 'stroke_fill',
              color: '#ffffff',
              borderColor: textColor,
              borderSize: 1.5
            },
            ignoreEvent: false
          });
        }
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
      // Calculate default width (+120px in pixel space converted to candle point)
      const p1Pixel = event.chart.convertToPixel([p1], { paneId: 'candle_pane' })?.[0];
      if (p1Pixel) {
        const p2Target = event.chart.convertFromPixel(
          [{ x: p1Pixel.x + 120, y: p1Pixel.y }],
          { paneId: 'candle_pane' }
        )?.[0];
        if (p2Target) {
          p2 = p2Target;
        }
      }
    }

    if (!p2) {
      p2 = { timestamp: p1.timestamp + 60, value: p1.value, dataIndex: (p1.dataIndex ?? 0) + 1 };
    }

    // Geometry is strictly 2 points: [p1 (position), p2 (center-right width anchor)]
    const newPoints = [
      { timestamp: p1.timestamp, value: p1.value, dataIndex: p1.dataIndex },
      { timestamp: p2.timestamp, value: p1.value, dataIndex: p2.dataIndex }
    ];

    event.chart.overrideOverlay({
      id: event.overlay.id,
      points: newPoints
    });
  },

  onPressedMoving: (event: any, draggedIndex: number) => {
    const points = [...event.overlay.points];
    if (points.length < 2) return false;

    const mousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];
    if (!mousePt) return false;

    const snapped = snapPointToCandle(event, event.x, event.y);
    const targetPt = snapped || mousePt;

    const startPoints = (event.overlay.extendData as any)?.startPoints;
    const startP1 = startPoints?.[0] || points[0];
    const startP2 = startPoints?.[1] || points[1];

    if (draggedIndex === 1) {
      // Center-right anchor: resize width only
      points[1] = {
        timestamp: targetPt.timestamp,
        value: startP1.value,
        dataIndex: targetPt.dataIndex
      };
    } else if (draggedIndex === 0) {
      // Position anchor / body drag: move entire text box
      const dt = targetPt.timestamp - startP1.timestamp;
      const dDi = (targetPt.dataIndex !== undefined && startP1.dataIndex !== undefined)
        ? (targetPt.dataIndex - startP1.dataIndex)
        : 0;

      points[0] = {
        timestamp: targetPt.timestamp,
        value: targetPt.value,
        dataIndex: targetPt.dataIndex
      };
      points[1] = {
        timestamp: startP2.timestamp + dt,
        value: targetPt.value,
        dataIndex: startP2.dataIndex !== undefined ? startP2.dataIndex + dDi : undefined
      };
    }

    return { points } satisfies ToolMutationResult;
  }
};
