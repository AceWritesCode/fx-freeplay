import React from 'react';
import type { ToolDefinition } from '../ToolRegistry.ts';
import { drawGrabHandles, drawArrowHeads, isOverlayVisible, computeLineSegmentsWithTextGap } from '../toolUtils.ts';

// SVG icon for TrendLine matching TradingView
const TrendLineIcon = ({ className = "w-5 h-5", style }: { className?: string; style?: React.CSSProperties }) =>
  React.createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 28 28', className, style },
    React.createElement(
      'g',
      { fill: 'currentColor', fillRule: 'nonzero' },
      React.createElement('path', { d: 'M7.354 21.354l14-14-.707-.707-14 14z' }),
      React.createElement('path', { d: 'M22.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM5.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z' })
    )
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

export const TrendLineTool: ToolDefinition = {
  id: 'trendLine',
  name: 'Trendline',
  icon: TrendLineIcon,
  group: 'lines',
  hotkey: 'Alt + T',
  
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
    needDefaultPointFigure: false,
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
      if (coordinates.length === 1) {
        drawGrabHandles(figures, coordinates, false);
        return figures;
      }
      if (coordinates.length === 2) {
        const width = bounding?.width ?? 1000;
        const height = bounding?.height ?? 500;

        // Compute line endpoints (extrapolate for extend type)
        let p1 = { ...coordinates[0] };
        let p2 = { ...coordinates[1] };
        if (extendType === 'left' || extendType === 'both') {
          p1 = extrapolateLine(coordinates[0], coordinates[1], 'left', width, height);
        }
        if (extendType === 'right' || extendType === 'both') {
          p2 = extrapolateLine(coordinates[0], coordinates[1], 'right', width, height);
        }

        const hasActualText = typeof text === 'string' && text.trim() !== '';
        const isLineDrawn = overlay?.points && overlay.points.length >= 2;
        const isSelected = (overlay?.extendData as any)?.isSelected || false;
        const isHovered = (overlay?.extendData as any)?.isHovered || false;
        const isEditingText = (overlay?.extendData as any)?.isEditingText || false;

        let textToShow = '';
        if (hasActualText) {
          textToShow = text;
        } else if (isLineDrawn && (isSelected || isHovered || isEditingText)) {
          textToShow = '+ Add text';
        }

        const drawSegments = computeLineSegmentsWithTextGap(
          p1,
          p2,
          textToShow,
          textHalign,
          textValign,
          fontSize,
          isBold,
          isItalic
        );

        // 1. Transparent full-length line figure for reliable event hit-testing across text gaps
        figures.push({
          type: 'line',
          attrs: { coordinates: [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }] },
          styles: {
            style: 'solid',
            color: 'transparent',
            size: Math.max(lineWidth, 8)
          },
          ignoreEvent: false,
        });

        // 2. Draw visible line segments (with text gap if active)
        drawSegments.forEach(seg => {
          figures.push({
            type: 'line',
            attrs: { coordinates: [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }] },
            styles: {
              style,
              color: lineColor,
              size: lineWidth,
              dashedValue
            },
            ignoreEvent: false,
          });
        });

        // 3. Draw arrowheads at endpoints based on startArrow and endArrow settings
        const startArrow = customSettings.startArrow || 'normal';
        const endArrow = customSettings.endArrow || (overlay.name === 'arrow' ? 'arrow' : 'normal');
        drawArrowHeads(figures, coordinates[0], coordinates[1], startArrow, endArrow, lineColor, lineWidth);

        // Selection / In-progress creation / Hover grab handles
        const isDrawing = chart && (chart as any)._activeDrawingId === overlay?.id;
        if (isSelected || isHovered || isDrawing) {
          drawGrabHandles(figures, coordinates, overlay?.lock || false, isSelected || isDrawing);
        }
      }
      return figures;
    }
  })
};
