import type { ToolDefinition, ToolMutationResult } from '../ToolRegistry';
import { snapPointToCandle } from '@/engine/charting';
import { Type } from 'lucide-react';

const isOverlayVisible = (overlay: any, _chart: any) => {
  const customSettings = (overlay?.extendData as any)?.customSettings || {};
  const visibility = customSettings.visibility;
  if (!visibility) return true;
  return true;
};

/**
 * Helper to split text into lines based on canvas width and font size.
 * Handles both explicit newlines ('\n') and automatic word wrapping.
 */
const getWrappedLines = (text: string, maxPixelWidth: number, fontSize: number): string[] => {
  if (!text) return [''];

  const getWidth = (str: string) => {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = `${fontSize}px sans-serif`;
        return ctx.measureText(str).width;
      }
    }
    return str.length * (fontSize * 0.58);
  };

  const lines: string[] = [];
  const rawLines = text.split('\n');

  for (const rawLine of rawLines) {
    if (rawLine === '') {
      lines.push('');
      continue;
    }

    const words = rawLine.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = getWidth(testLine);

      if (testWidth > maxPixelWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : [''];
};

export const TextTool: ToolDefinition = {
  id: 'text',
  name: 'Text',
  icon: Type,
  group: 'text',
  settingsSchema: [
    { id: 'text', label: 'Text', type: 'color', defaultValue: 'Add text' },
    { id: 'textColor', label: 'Text Color', type: 'color', defaultValue: '#2196F3' },
    { id: 'fontSize', label: 'Font Size', type: 'number', defaultValue: 14, min: 10, max: 48, step: 1 }
  ],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: { text: 'Add text', textColor: '#2196F3', fontSize: 14 } }],
  
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
      const textColor = customSettings.textColor || '#2196F3';
      const textContent = customSettings.text || 'Add text';
      const fontSize = customSettings.fontSize || 14;

      const p1 = coordinates[0]; // Top-left position
      const p2 = coordinates[1]; // Center-right width anchor

      const x = p1.x;
      const y = p1.y;
      const w = Math.max(60, p2.x - p1.x);

      // Available width inside text box (with 4px padding on left & right)
      const availWidth = Math.max(20, w - 8);

      // Wrap text into lines based on availWidth and fontSize
      const lines = getWrappedLines(textContent, availWidth, fontSize);

      // Calculate dynamic line height and total box height automatically
      const lineHeight = Math.max(16, Math.round(fontSize * 1.35));
      const topPadding = 6;
      const bottomPadding = 6;
      const h = Math.max(32, lines.length * lineHeight + topPadding + bottomPadding);

      const figures: any[] = [];

      // Main text box outline rect (border only, no background fill)
      figures.push({
        type: 'rect',
        attrs: { x, y, width: w, height: h },
        styles: {
          style: 'stroke',
          color: 'transparent',
          borderColor: textColor,
          borderSize: 1,
          borderStyle: 'solid'
        },
        ignoreEvent: false
      });

      // Render each wrapped line of text inside the box
      lines.forEach((lineStr, index) => {
        const lineY = y + topPadding + index * lineHeight + lineHeight / 2;
        figures.push({
          type: 'text',
          attrs: {
            x: x + 4,
            y: lineY,
            text: lineStr,
            baseline: 'middle',
            align: 'left'
          },
          styles: {
            color: textColor,
            size: fontSize,
            family: 'sans-serif',
            backgroundColor: 'transparent'
          },
          ignoreEvent: false
        });
      });

      // EXACTLY ONE VISIBLE ANCHOR: Center-Right Resize Handle
      // Positioned vertically centered on the dynamic height (h) of the text box
      const isSelected = (overlay.extendData as any)?.isSelected;
      const isHovered = (overlay.extendData as any)?.isHovered;
      if (isSelected || isHovered) {
        const isLocked = overlay.lock || false;
        if (!isLocked) {
          const handleX = p1.x + w;
          const handleY = y + h / 2;
          figures.push({
            type: 'circle',
            attrs: { x: handleX, y: handleY, r: 5 },
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
