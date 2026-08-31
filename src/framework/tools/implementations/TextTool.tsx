import type { ToolDefinition, ToolMutationResult } from '../ToolRegistry';
import { Type } from 'lucide-react';

const isOverlayVisible = (overlay: any, _chart: any) => {
  const customSettings = (overlay?.extendData as any)?.customSettings || {};
  const visibility = customSettings.visibility;
  if (!visibility) return true;
  return true;
};

// Fixed font stack constant shared exactly between canvas drawing and HTML textarea
export const TEXT_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// Fixed internal horizontal padding constant for equal left and right breathing room (10px left, 10px right)
export const PADDING_HORIZONTAL = 10;
export const TOP_PADDING = 8;
export const BOTTOM_PADDING = 8;

/**
 * Helper to measure single character width at a given font size.
 */
const getSingleCharWidth = (fontSize: number, isBold: boolean = false): number => {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px ${TEXT_FONT_FAMILY}`;
      return ctx.measureText('W').width * 1.05;
    }
  }
  return fontSize * (isBold ? 0.72 : 0.65);
};

/**
 * Character-level wrapping algorithm.
 * Breaks text EXACTLY when available width ends at character boundaries,
 * without waiting for spaces or word boundaries.
 */
const getWrappedLines = (text: string, maxPixelWidth: number, fontSize: number, isBold: boolean = false): string[] => {
  if (!text) return [''];

  const getWidth = (str: string) => {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px ${TEXT_FONT_FAMILY}`;
        return ctx.measureText(str).width * 1.05;
      }
    }
    return str.length * (fontSize * (isBold ? 0.72 : 0.65));
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
    { id: 'text', label: 'Text', type: 'color', defaultValue: '' },
    { id: 'textColor', label: 'Text Color', type: 'color', defaultValue: '#2196F3' },
    { id: 'fillColor', label: 'Background Color', type: 'color', defaultValue: 'rgba(33, 150, 243, 0.15)' },
    { id: 'fillBackground', label: 'Fill Background', type: 'boolean', defaultValue: false },
    { id: 'showBorder', label: 'Border', type: 'boolean', defaultValue: true },
    { id: 'fontSize', label: 'Font Size', type: 'number', defaultValue: 14, min: 10, max: 48, step: 1 }
  ],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: { text: '', textColor: '#2196F3', fontSize: 14 } }],
  
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
      const actualText = typeof customSettings.text === 'string' ? customSettings.text : '';
      const hasText = actualText.trim().length > 0 && actualText !== 'Add text';
      const fontSize = customSettings.fontSize || 14;
      const textAlign = customSettings.textAlign || 'left';
      const isBold = !!customSettings.bold;
      const isItalic = !!customSettings.italic;
      const showBorder = customSettings.showBorder !== false;

      const fillBackground = customSettings.fillBackground ?? (customSettings.backgroundColor || customSettings.fillColor ? true : false);
      const bg = customSettings.fillColor || customSettings.backgroundColor || 'transparent';
      const hasBg = fillBackground && bg && bg !== 'transparent';

      const p1 = coordinates[0]; // Top-left position (Point 0)

      // Minimum box width = width of 1 character at current font size + horizontal padding (left + right)
      const singleCharW = getSingleCharWidth(fontSize, isBold);
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

      // Display text: if actual user text is present, use it; otherwise in edit mode show placeholder 'Add text'
      const isEditMode = isSelected || isHovered || isDragging;
      const displayText = hasText ? actualText : (isEditMode ? 'Add text' : '');
      const isPlaceholder = !hasText && isEditMode;

      // Character-level text wrapping
      const lines = getWrappedLines(displayText || ' ', availWidth, fontSize, isBold);

      // Calculate dynamic line height and total box height automatically
      const lineHeight = Math.max(16, Math.round(fontSize * 1.35));
      const h = Math.max(32, lines.length * lineHeight + TOP_PADDING + BOTTOM_PADDING);

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

      // If showBorder is false, border disappears after exiting edit mode if the box has text
      const shouldShowBorder = showBorder || isSelected || isHovered || isDragging || !hasText;

      // Main text box outline rect (stroke + background fill)
      figures.push({
        type: 'rect',
        attrs: { x, y, width: w, height: h },
        styles: {
          style: hasBg ? 'stroke_fill' : 'stroke',
          color: hasBg ? bg : 'transparent',
          borderColor: shouldShowBorder ? textColor : 'transparent',
          borderSize: shouldShowBorder ? 1 : 0,
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

      // Render each wrapped line of text inside the box ONLY when not in edit mode (not selected)
      // When isSelected, FloatingTextToolEditor renders the text cleanly so canvas text is NEVER duplicated!
      if (displayText && !isSelected) {
        lines.forEach((lineStr, index) => {
          const lineY = y + TOP_PADDING + index * lineHeight;
          figures.push({
            type: 'text',
            attrs: {
              x: textX,
              y: lineY,
              text: lineStr,
              baseline: 'top',
              align: textAlignStyle
            },
            styles: {
              color: isPlaceholder ? 'rgba(128, 130, 133, 0.65)' : textColor,
              size: fontSize,
              family: TEXT_FONT_FAMILY,
              weight: isBold ? 'bold' : 'normal',
              style: isItalic ? 'italic' : 'normal',
              backgroundColor: 'transparent'
            },
            ignoreEvent: false
          });
        });
      }

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
        boxWidth: defaultBoxWidth,
        showBorder: true,
        text: ''
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

    const startPoints = (event.overlay.extendData as any)?.startPoints;
    const startP1 = startPoints?.[0] || points[0];
    const startP2 = startPoints?.[1] || points[1];

    const fontSize = customSettings.fontSize || 14;
    const isBold = !!customSettings.bold;
    const singleCharW = getSingleCharWidth(fontSize, isBold);
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
      // Body drag: translate entire text box by mouse delta relative to where user grabbed it!
      const startMousePixel = (event.overlay.extendData as any)?.startMousePixel;
      const startPointsPixels = (event.overlay.extendData as any)?.startPointsPixels;

      if (startPoints && startMousePixel && startPointsPixels && Array.isArray(startPointsPixels)) {
        const dx = event.x - startMousePixel.x;
        const dy = event.y - startMousePixel.y;

        const targetPixels = startPointsPixels.map((pt: any) => ({
          x: pt.x + dx,
          y: pt.y + dy
        }));

        const convertedPoints = event.chart.convertFromPixel(targetPixels, { paneId: 'candle_pane' });

        if (convertedPoints && convertedPoints.length === startPoints.length) {
          const newPoints = startPoints.map((pt: any, i: number) => {
            const conv = convertedPoints[i];
            return {
              ...pt,
              timestamp: conv?.timestamp ?? pt.timestamp,
              value: conv?.value ?? pt.value,
              ...(conv?.dataIndex !== undefined ? { dataIndex: conv.dataIndex } : {})
            };
          });

          return { points: newPoints } satisfies ToolMutationResult;
        }
      }

      return false;
    }
  }
};
