import React from 'react';
import type { ToolDefinition, ToolMutationResult } from '../ToolRegistry.ts';
import { isOverlayVisible } from '../toolUtils.ts';
import {
  SHARED_TEXT_FONT_FAMILY,
  getSharedTextLineHeight,
  getSingleCharWidth,
  getWrappedTextLines,
  measureSharedText,
  computeCompositeTextLayout,
  type SharedTextMetrics,
  type CompositeTextLayoutOptions,
  type CompositeTextLayoutResult,
} from '../sharedTextLayout.ts';

// Shared typography constants
export const TEXT_FONT_FAMILY = SHARED_TEXT_FONT_FAMILY;
export const PADDING_HORIZONTAL = 10;
export const TOP_PADDING = 8;
export const BOTTOM_PADDING = 8;

export {
  getSharedTextLineHeight,
  getSingleCharWidth,
  getWrappedTextLines,
  measureSharedText,
  computeCompositeTextLayout,
  type SharedTextMetrics,
  type CompositeTextLayoutOptions,
  type CompositeTextLayoutResult,
};

export const TextIcon = ({ className = 'w-5 h-5', style }: { className?: string; style?: React.CSSProperties } = {}) =>
  React.createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 28 28', className, style },
    React.createElement('path', {
      fill: 'currentColor',
      d: 'M8 6.5c0-.28.22-.5.5-.5H14v16h-2v1h5v-1h-2V6h5.5c.28 0 .5.22.5.5V9h1V6.5c0-.83-.67-1.5-1.5-1.5h-12C7.67 5 7 5.67 7 6.5V9h1V6.5Z'
    })
  );

export const TextTool: ToolDefinition = {
  id: 'text',
  name: 'Text',
  icon: TextIcon,
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
      const placeholderMetrics = measureSharedText('Add text', fontSize, isBold, isItalic);
      const initialBoxWidth = Math.ceil(placeholderMetrics.width + PADDING_HORIZONTAL * 2);
      const configuredWidth = customSettings.boxWidth !== undefined ? customSettings.boxWidth : initialBoxWidth;

      let x = p1.x;
      let y = p1.y;
      let boxWidth = configuredWidth;

      // Anchor mode effect: effective ONLY outside edit mode (when not selected/dragging)
      if (isAnchored) {
        if (!isSelected && !isDragging) {
          if (!customSettings.pinnedPixelPosition) {
            customSettings.pinnedPixelPosition = { x: p1.x, y: p1.y, width: boxWidth };
          }
          x = customSettings.pinnedPixelPosition.x;
          y = customSettings.pinnedPixelPosition.y;
          boxWidth = customSettings.pinnedPixelPosition.width || boxWidth;
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

      const isEditMode = isSelected || isHovered || isDragging;
      const displayText = hasText ? actualText : (isEditMode ? 'Add text' : '');

      const layout = computeCompositeTextLayout({
        origin: { x, y },
        text: displayText,
        fontSize,
        isBold,
        isItalic,
        textAlign,
        boxWidth,
        paddingX: PADDING_HORIZONTAL,
        paddingY: TOP_PADDING,
      });

      const targetHandleX = layout.resizeHandle.x;
      const targetHandleY = layout.resizeHandle.y;

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
      const shouldShowBorder = showBorder || isSelected || isHovered || isDragging || !hasText;

      // 1. Main text box outline rect (stroke + background fill)
      figures.push({
        type: 'rect',
        attrs: {
          x: layout.box.x,
          y: layout.box.y,
          width: layout.box.width,
          height: layout.box.height,
        },
        styles: {
          style: hasBg ? 'stroke_fill' : 'stroke',
          color: hasBg ? bg : 'transparent',
          borderColor: shouldShowBorder ? textColor : 'transparent',
          borderSize: shouldShowBorder ? 1 : 0,
          borderStyle: 'solid',
          borderRadius: 2,
        },
        ignoreEvent: false
      });

      // 2. Center-Right Resize Handle (Point 1) visible in edit mode / selection
      if (isSelected || isHovered) {
        const isLocked = overlay.lock || false;
        if (!isLocked) {
          figures.push({
            type: 'circle',
            attrs: { x: targetHandleX, y: targetHandleY, r: isSelected ? 4 : 4.5 },
            styles: {
              style: 'stroke_fill',
              color: '#ffffff',
              borderColor: textColor,
              borderSize: isSelected ? 2 : 1
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
    const customSettings = (event.overlay?.extendData as any)?.customSettings || {};
    const fontSize = customSettings.fontSize || 14;
    const isBold = !!customSettings.bold;
    const isItalic = !!customSettings.italic;

    const placeholderMetrics = measureSharedText('Add text', fontSize, isBold, isItalic);
    const initialBoxWidth = Math.ceil(placeholderMetrics.width + PADDING_HORIZONTAL * 2);

    const p1Pixel = event.chart.convertToPixel([p1], { paneId: 'candle_pane' })?.[0];
    let p2Target: any = null;
    if (p1Pixel) {
      p2Target = event.chart.convertFromPixel(
        [{ x: p1Pixel.x + initialBoxWidth, y: p1Pixel.y + 16 }],
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
        boxWidth: initialBoxWidth,
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
