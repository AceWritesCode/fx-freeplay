import type { ToolDefinition, ToolMutationResult } from '../ToolRegistry';
import { snapPointToCandle } from '@/engine/charting';
import { Type } from 'lucide-react';

const isOverlayVisible = (overlay: any, _chart: any) => {
  const customSettings = (overlay?.extendData as any)?.customSettings || {};
  const visibility = customSettings.visibility;
  if (!visibility) return true;
  return true;
};

// Fixed internal horizontal padding constant for equal left and right breathing room (10px left, 10px right)
const PADDING_HORIZONTAL = 10;

/**
 * Helper to measure single character width at a given font size.
 */
const getSingleCharWidth = (fontSize: number): number => {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = `${fontSize}px sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`;
      return ctx.measureText('W').width * 1.05;
    }
  }
  return fontSize * 0.65;
};

/**
 * Character-level wrapping algorithm.
 * Breaks text EXACTLY when available width ends at character boundaries,
 * without waiting for spaces or word boundaries.
 */
const getWrappedLines = (text: string, maxPixelWidth: number, fontSize: number): string[] => {
  if (!text) return [''];

  const getWidth = (str: string) => {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = `${fontSize}px sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`;
        return ctx.measureText(str).width * 1.05;
      }
    }
    return str.length * (fontSize * 0.65);
  };

  const lines: string[] = [];
  const rawLines = text.split('\n');

  for (const rawLine of rawLines) {
    if (rawLine === '') {
      lines.push('');
      continue;
    }

    let currentLine = '';

    for (let i = 0; i < rawLine.length; i++) {
      const char = rawLine[i];
      const testLine = currentLine + char;
      const testWidth = getWidth(testLine);

      if (testWidth > maxPixelWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
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
      const isAnchored = !!customSettings.isAnchored;
      const isSelected = (overlay.extendData as any)?.isSelected;
      const isHovered = (overlay.extendData as any)?.isHovered;
      const isDragging = (overlay.extendData as any)?.draggedIndex !== undefined && (overlay.extendData as any)?.draggedIndex !== null;

      const textColor = customSettings.textColor || '#2196F3';
      const textContent = customSettings.text || 'Add text';
      const fontSize = customSettings.fontSize || 14;
      const textAlign = customSettings.textAlign || 'left';

      const p1 = coordinates[0]; // Top-left position (Point 0)

      // Minimum box width = width of 1 character at current font size + horizontal padding (left + right)
      const singleCharW = getSingleCharWidth(fontSize);
      const minBoxWidth = Math.ceil(singleCharW + PADDING_HORIZONTAL * 2);

      // Width is fixed in screen pixels (boxWidth) so chart zooming/squeezing NEVER distorts the text box!
      const configuredWidth = customSettings.boxWidth !== undefined ? customSettings.boxWidth : 180;
      let w = Math.max(minBoxWidth, configuredWidth);
      let x = p1.x;
      let y = p1.y;

      // Anchor mode effect: effective ONLY outside edit mode (when not selected/dragging)
      if (isAnchored) {
        if (!isSelected && !isDragging) {
          if (!customSettings.pinnedPixelPosition) {
            customSettings.pinnedPixelPosition = { x: p1.x, y: p1.y, width: w };
          }
          x = customSettings.pinnedPixelPosition.x;
          y = customSettings.pinnedPixelPosition.y;
          w = Math.max(minBoxWidth, customSettings.pinnedPixelPosition.width || w);
        } else {
          // Inside edit mode: edit freely, clear pinned position so it always updates fresh
          if (customSettings.pinnedPixelPosition) {
            delete customSettings.pinnedPixelPosition;
          }
        }
      } else {
        if (customSettings.pinnedPixelPosition) {
          delete customSettings.pinnedPixelPosition;
        }
      }

      // Available width for character-level wrapping = boxWidth - leftPadding - rightPadding
      const availWidth = Math.max(singleCharW, w - PADDING_HORIZONTAL * 2);

      // Character-level text wrapping
      const lines = getWrappedLines(textContent, availWidth, fontSize);

      // Calculate dynamic line height and total box height automatically
      const lineHeight = Math.max(16, Math.round(fontSize * 1.35));
      const topPadding = 8;
      const bottomPadding = 8;
      const h = Math.max(32, lines.length * lineHeight + topPadding + bottomPadding);

      // Center-right resize handle coordinate
      const targetHandleX = x + w;
      const targetHandleY = y + h / 2;

      const overlayPoints = (overlay?.points as any[]);

      if (!isDragging && isSelected && chart && overlay?.id && Array.isArray(overlayPoints) && overlayPoints.length >= 2) {
        const diffX = Math.abs((coordinates[1]?.x ?? targetHandleX) - targetHandleX);
        const diffY = Math.abs((coordinates[1]?.y ?? targetHandleY) - targetHandleY);
        if (diffX > 2 || diffY > 4) {
          const p2Target = (chart.convertFromPixel(
            [{ x: targetHandleX, y: targetHandleY }],
            { paneId: 'candle_pane' }
          ) as any[])?.[0];
          if (p2Target) {
            setTimeout(() => {
              chart.overrideOverlay({
                id: overlay.id,
                points: [
                  overlayPoints[0],
                  {
                    timestamp: p2Target.timestamp,
                    value: p2Target.value ?? overlayPoints[0].value,
                    dataIndex: p2Target.dataIndex
                  }
                ]
              });
            }, 0);
          }
        }
      }

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

      // Calculate text X position and alignment based on textAlign setting
      let textX = x + PADDING_HORIZONTAL;
      let textAlignStyle = 'left';

      if (textAlign === 'center') {
        textX = x + w / 2;
        textAlignStyle = 'center';
      } else if (textAlign === 'right') {
        textX = x + w - PADDING_HORIZONTAL;
        textAlignStyle = 'right';
      }

      // Render each wrapped line of text inside the box with fixed consistent horizontal padding
      lines.forEach((lineStr, index) => {
        const lineY = y + topPadding + index * lineHeight + lineHeight / 2;
        figures.push({
          type: 'text',
          attrs: {
            x: textX,
            y: lineY,
            text: lineStr,
            baseline: 'middle',
            align: textAlignStyle
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

      // Center-Right Resize Handle (Point 1) visible in edit mode / selection
      if (isSelected || isHovered) {
        const isLocked = overlay.lock || false;
        if (!isLocked) {
          figures.push({
            type: 'circle',
            attrs: { x: targetHandleX, y: targetHandleY, r: 5 },
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
    const points = (event.overlay.points as any[]) || [];
    if (points.length === 0) return;

    const p1 = points[0];
    const defaultBoxWidth = 180;

    const p1Pixel = event.chart.convertToPixel([p1], { paneId: 'candle_pane' })?.[0];
    let p2Target: any = null;
    if (p1Pixel) {
      p2Target = event.chart.convertFromPixel(
        [{ x: p1Pixel.x + defaultBoxWidth, y: p1Pixel.y + 16 }],
        { paneId: 'candle_pane' }
      )?.[0];
    }

    const p2 = p2Target || { timestamp: p1.timestamp + 60, value: p1.value, dataIndex: (p1.dataIndex ?? 0) + 1 };

    // Geometry is strictly 2 points: [p1 (position), p2 (center-right width anchor)]
    const newPoints = [
      { timestamp: p1.timestamp, value: p1.value, dataIndex: p1.dataIndex },
      { timestamp: p2.timestamp, value: p2.value ?? p1.value, dataIndex: p2.dataIndex }
    ];

    const newExtendData = {
      ...(event.overlay.extendData || {}),
      customSettings: {
        ...(event.overlay.extendData?.customSettings || {}),
        boxWidth: defaultBoxWidth
      }
    };

    event.chart.overrideOverlay({
      id: event.overlay.id,
      points: newPoints,
      extendData: newExtendData
    });
  },

  onPressedMoving: (event: any, draggedIndex: number | null) => {
    const points = [...((event.overlay.points as any[]) || [])];
    if (points.length < 2) return false;

    const customSettings = (event.overlay?.extendData as any)?.customSettings || {};
    // Clear any stale pinned position so edit/drag mode always updates fresh
    if (customSettings.pinnedPixelPosition) {
      delete customSettings.pinnedPixelPosition;
    }
    if (customSettings.fixedPixelPosition) {
      delete customSettings.fixedPixelPosition;
    }

    const mousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];
    if (!mousePt) return false;

    const snapped = snapPointToCandle(event, event.x, event.y);
    const targetPt = snapped || mousePt;

    const startPoints = (event.overlay.extendData as any)?.startPoints;
    const startP1 = startPoints?.[0] || points[0];
    const startP2 = startPoints?.[1] || points[1];

    const fontSize = customSettings.fontSize || 14;
    const singleCharW = getSingleCharWidth(fontSize);
    const minBoxWidth = Math.ceil(singleCharW + PADDING_HORIZONTAL * 2);

    if (draggedIndex === 1) {
      // STRICTLY RESIZE WIDTH ONLY when dragging anchor index 1!
      const p1Pixel = event.chart.convertToPixel([startP1], { paneId: 'candle_pane' })?.[0] || { x: event.x, y: event.y };
      const newWidth = Math.max(minBoxWidth, event.x - p1Pixel.x);

      const newExtendData = {
        ...(event.overlay.extendData || {}),
        customSettings: {
          ...customSettings,
          boxWidth: newWidth
        }
      };

      const p2Target = event.chart.convertFromPixel(
        [{ x: p1Pixel.x + newWidth, y: p1Pixel.y + 16 }],
        { paneId: 'candle_pane' }
      )?.[0];

      // Left/top position (points[0]) MUST REMAIN STRICTLY FIXED!
      points[0] = {
        timestamp: startP1.timestamp,
        value: startP1.value,
        dataIndex: startP1.dataIndex
      };

      // Only points[1] (width anchor) is updated
      points[1] = p2Target ? {
        timestamp: p2Target.timestamp,
        value: startP2.value,
        dataIndex: p2Target.dataIndex
      } : {
        timestamp: startP2.timestamp,
        value: startP2.value,
        dataIndex: startP2.dataIndex
      };

      return { points, extendData: newExtendData };
    } else {
      // Body drag: move the ENTIRE text box together!
      const dt = targetPt.timestamp - startP1.timestamp;
      const dv = targetPt.value - startP1.value;
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
        value: startP2.value + dv,
        dataIndex: startP2.dataIndex !== undefined ? startP2.dataIndex + dDi : undefined
      };

      return { points } satisfies ToolMutationResult;
    }
  }
};
