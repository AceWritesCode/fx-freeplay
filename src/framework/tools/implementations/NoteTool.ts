import React from 'react';
import type { ToolDefinition } from '../ToolRegistry.ts';
import { drawGrabHandles, isOverlayVisible } from '../toolUtils.ts';

// Note SVG icon matching TradingView specification
export const NoteIcon = ({ className = "w-5 h-5", style }: { className?: string; style?: React.CSSProperties } = {}) =>
  React.createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 28 28', className, style },
    React.createElement('path', {
      fill: 'currentColor',
      fillRule: 'evenodd',
      d: 'M5 3h17v13H5V3Zm8 14H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h17a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-8v4.05a2.5 2.5 0 1 1-1 0V17Zm.5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM14 5h3a1 1 0 0 1 1 1v2h-1V6h-3v7h2v1h-5v-1h2V6h-3v2H9V6a1 1 0 0 1 1-1h4Z',
    })
  );

export interface NoteCustomSettings {
  lineColor?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  fillBackground?: boolean;
  backgroundColor?: string;
  showBorder?: boolean;
  borderColor?: string;
  text?: string;
  textColor?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  textValign?: 'top' | 'middle' | 'bottom';
  [key: string]: any;
}

export const DEFAULT_NOTE_SETTINGS: NoteCustomSettings = {
  lineColor: '#2196F3',
  lineWidth: 1,
  lineStyle: 'solid',
  fillBackground: true,
  backgroundColor: '#2196F3',
  showBorder: false,
  borderColor: '#2196F3',
  text: '',
  textColor: '#ffffff',
  fontSize: 14,
  bold: false,
  italic: false,
  textAlign: 'center',
  textValign: 'middle',
};

import {
  SHARED_TEXT_FONT_FAMILY,
  getSharedTextLineHeight,
  measureSharedText,
} from '../sharedTextLayout.ts';

export const NOTE_FONT_FAMILY = SHARED_TEXT_FONT_FAMILY;
export const NOTE_PADDING_X = 10;
export const NOTE_PADDING_Y = 6;

export const getNoteLineHeight = getSharedTextLineHeight;

export type NoteAttachmentSide = 'right' | 'left' | 'top' | 'bottom';

export function computeNoteAttachmentSide(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): NoteAttachmentSide {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  if (dx === 0 && dy === 0) {
    return 'right';
  }

  const angle = Math.atan2(dy, dx); // radians in [-PI, PI]

  // Four 90-degree sectors with boundaries rotated 45 degrees:
  // -45° to +45° -> 'right'
  // +45° to +135° -> 'bottom' (screen Y is positive downwards)
  // +135° to +180° & -180° to -135° -> 'left'
  // -135° to -45° -> 'top' (screen Y is negative upwards)
  if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
    return 'right';
  } else if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
    return 'bottom';
  } else if (angle >= (-3 * Math.PI) / 4 && angle < -Math.PI / 4) {
    return 'top';
  } else {
    return 'left';
  }
}

export interface NoteTextMetrics {
  width: number;
  height: number;
  lines: string[];
  lineWidths: number[];
  lineHeight: number;
}

export function measureNoteText(
  text: string,
  fontSize: number = 14,
  isBold: boolean = false,
  isItalic: boolean = false
): NoteTextMetrics {
  return measureSharedText(text, fontSize, isBold, isItalic, NOTE_FONT_FAMILY);
}

export interface NoteCompositeLayout {
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
    side: NoteAttachmentSide;
  };
  text: {
    lines: string[];
    lineWidths: number[];
    linePositions: Array<{ x: number; y: number; text: string }>;
    totalWidth: number;
    totalHeight: number;
    lineHeight: number;
    align: 'left' | 'center' | 'right';
    baseline: 'top';
  };
  paddingX: number;
  paddingY: number;
}

export function computeCompositeNoteLayout(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  text: string,
  fontSize: number = 14,
  isBold: boolean = false,
  isItalic: boolean = false,
  textAlign: 'left' | 'center' | 'right' = 'center',
  textValign: 'top' | 'middle' | 'bottom' = 'middle'
): NoteCompositeLayout {
  const paddingX = NOTE_PADDING_X;
  const paddingY = NOTE_PADDING_Y;

  const metrics = measureNoteText(text, fontSize, isBold, isItalic);
  let boxWidth = metrics.width + paddingX * 2;
  let boxHeight = metrics.height + paddingY * 2;

  // Round up to even numbers to guarantee integer centers and zero subpixel drift
  boxWidth = Math.ceil(boxWidth / 2) * 2;
  boxHeight = Math.ceil(boxHeight / 2) * 2;

  const side = computeNoteAttachmentSide(p1, p2);
  let boxX = p2.x;
  let boxY = p2.y;

  switch (side) {
    case 'right':
      boxX = p2.x;
      boxY = p2.y - boxHeight / 2;
      break;
    case 'left':
      boxX = p2.x - boxWidth;
      boxY = p2.y - boxHeight / 2;
      break;
    case 'top':
      boxX = p2.x - boxWidth / 2;
      boxY = p2.y - boxHeight;
      break;
    case 'bottom':
      boxX = p2.x - boxWidth / 2;
      boxY = p2.y;
      break;
  }

  boxX = Math.round(boxX);
  boxY = Math.round(boxY);

  // Calculate startY based on textValign
  let contentStartY = boxY + paddingY;
  if (textValign === 'middle') {
    contentStartY = boxY + (boxHeight - metrics.height) / 2;
  } else if (textValign === 'bottom') {
    contentStartY = boxY + boxHeight - paddingY - metrics.height;
  }

  // Calculate X position and canvas align based on textAlign
  let alignX = boxX + boxWidth / 2;
  if (textAlign === 'left') {
    alignX = boxX + paddingX;
  } else if (textAlign === 'right') {
    alignX = boxX + boxWidth - paddingX;
  }

  const linePositions = metrics.lines.map((lineStr, index) => {
    const lineY = contentStartY + index * metrics.lineHeight;
    return {
      x: alignX,
      y: lineY,
      text: lineStr,
    };
  });

  return {
    box: {
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      side,
    },
    text: {
      lines: metrics.lines,
      lineWidths: metrics.lineWidths,
      linePositions,
      totalWidth: metrics.width,
      totalHeight: metrics.height,
      lineHeight: metrics.lineHeight,
      align: textAlign,
      baseline: 'top',
    },
    paddingX,
    paddingY,
  };
}

export function computeNoteBoxDimensions(
  text: string,
  fontSize: number = 14,
  isBold: boolean = false,
  isItalic: boolean = false
): { width: number; height: number; paddingX: number; paddingY: number } {
  const metrics = measureNoteText(text, fontSize, isBold, isItalic);
  const width = Math.ceil((metrics.width + NOTE_PADDING_X * 2) / 2) * 2;
  const height = Math.ceil((metrics.height + NOTE_PADDING_Y * 2) / 2) * 2;
  return {
    width,
    height,
    paddingX: NOTE_PADDING_X,
    paddingY: NOTE_PADDING_Y,
  };
}

export function computeNoteBoxLayout(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  boxWidth: number,
  boxHeight: number
): { x: number; y: number; width: number; height: number; side: NoteAttachmentSide } {
  const side = computeNoteAttachmentSide(p1, p2);
  let x = p2.x;
  let y = p2.y;

  switch (side) {
    case 'right':
      x = p2.x;
      y = p2.y - boxHeight / 2;
      break;
    case 'left':
      x = p2.x - boxWidth;
      y = p2.y - boxHeight / 2;
      break;
    case 'top':
      x = p2.x - boxWidth / 2;
      y = p2.y - boxHeight;
      break;
    case 'bottom':
      x = p2.x - boxWidth / 2;
      y = p2.y;
      break;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(boxWidth),
    height: Math.round(boxHeight),
    side,
  };
}

export const NoteTool: ToolDefinition = {
  id: 'note',
  name: 'Note',
  icon: NoteIcon,
  group: 'text',
  hotkey: '',

  settingsSchema: [
    {
      id: 'lineColor',
      label: 'Line Color',
      type: 'color',
      defaultValue: '#2196F3',
    },
    {
      id: 'lineWidth',
      label: 'Line Width',
      type: 'number',
      defaultValue: 1,
      min: 1,
      max: 5,
      step: 1,
    },
    {
      id: 'lineStyle',
      label: 'Line Style',
      type: 'select',
      defaultValue: 'solid',
      options: [
        { label: 'Solid', value: 'solid' },
        { label: 'Dashed', value: 'dashed' },
      ],
    },
    {
      id: 'fillBackground',
      label: 'Label Background',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'backgroundColor',
      label: 'Background Color',
      type: 'color',
      defaultValue: '#2196F3',
    },
    {
      id: 'showBorder',
      label: 'Label Border',
      type: 'boolean',
      defaultValue: false,
    },
    {
      id: 'borderColor',
      label: 'Border Color',
      type: 'color',
      defaultValue: '#2196F3',
    },
    {
      id: 'text',
      label: 'Text',
      type: 'color',
      defaultValue: '',
    },
    {
      id: 'textColor',
      label: 'Text Color',
      type: 'color',
      defaultValue: '#ffffff',
    },
    {
      id: 'fontSize',
      label: 'Font Size',
      type: 'number',
      defaultValue: 14,
      min: 10,
      max: 48,
      step: 1,
    },
  ],

  defaultTemplates: [
    {
      id: 'default',
      name: 'Default',
      commonSettings: {
        lineColor: '#2196F3',
        lineWidth: 1,
        lineStyle: 'solid',
        fillBackground: true,
        backgroundColor: '#2196F3',
        showBorder: false,
        borderColor: '#2196F3',
        text: '',
        textColor: '#ffffff',
        fontSize: 14,
      },
    },
  ],

  createOverlayDef: () => ({
    name: 'note',
    totalStep: 3,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ overlay, coordinates, chart }) => {
      if (chart && !isOverlayVisible(overlay, chart)) {
        return [];
      }

      const figures: any[] = [];
      const isSelected = (overlay?.extendData as any)?.isSelected || false;
      const isHovered = (overlay?.extendData as any)?.isHovered || false;
      const isDrawing = chart && (chart as any)._activeDrawingId === overlay?.id;

      if (coordinates.length === 1) {
        drawGrabHandles(figures, coordinates, false, true);
        return figures;
      }

      if (coordinates.length >= 2) {
        const customSettings: NoteCustomSettings = {
          ...DEFAULT_NOTE_SETTINGS,
          ...((overlay?.extendData as any)?.customSettings || {}),
        };

        const p1 = { ...coordinates[0] };
        const p2 = { ...coordinates[1] };

        const lineColor = customSettings.lineColor || '#2196F3';
        const lineWidth = customSettings.lineWidth || 1;
        const lineStyle = customSettings.lineStyle || 'solid';
        const fillBackground = customSettings.fillBackground !== false;
        const backgroundColor = customSettings.backgroundColor || lineColor;
        const showBorder = customSettings.showBorder === true;
        const borderColor = customSettings.borderColor || lineColor;

        const text = typeof customSettings.text === 'string' ? customSettings.text : '';
        const fontSize = customSettings.fontSize || 14;
        const textColor = customSettings.textColor || '#ffffff';
        const isBold = !!customSettings.bold;
        const isItalic = !!customSettings.italic;
        const textAlign = customSettings.textAlign || 'center';
        const textValign = customSettings.textValign || 'middle';

        const hasText = text.trim().length > 0;
        const isEditMode = isSelected || isHovered || isDrawing;
        const displayText = hasText ? text : (isEditMode ? 'Add text' : '');

        const layout = computeCompositeNoteLayout(
          p1,
          p2,
          displayText,
          fontSize,
          isBold,
          isItalic,
          textAlign,
          textValign
        );

        // 1. Transparent hit-testing line covering the leader line
        figures.push({
          type: 'line',
          attrs: { coordinates: [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }] },
          styles: {
            style: 'solid',
            color: 'transparent',
            size: Math.max(lineWidth, 8),
          },
          ignoreEvent: false,
        });

        // 2. Visible leader line connecting Anchor 1 to Anchor 2
        let style = 'solid';
        let dashedValue = [4, 4];
        if (lineStyle === 'dashed') {
          style = 'dashed';
        } else if (lineStyle === 'dotted') {
          style = 'dashed';
          dashedValue = [2, 2];
        }

        figures.push({
          type: 'line',
          attrs: { coordinates: [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }] },
          styles: {
            style,
            color: lineColor,
            size: lineWidth,
            dashedValue,
          },
          ignoreEvent: false,
        });

        // 3. Composite Note Box (Rectangle at Anchor 2)
        const hasBg = fillBackground && backgroundColor && backgroundColor !== 'transparent';
        const shouldRenderBorder = showBorder || (!hasBg && (isSelected || isHovered));

        figures.push({
          type: 'rect',
          attrs: {
            x: layout.box.x,
            y: layout.box.y,
            width: layout.box.width,
            height: layout.box.height,
          },
          styles: {
            style: hasBg ? (shouldRenderBorder ? 'stroke_fill' : 'fill') : 'stroke',
            color: hasBg ? backgroundColor : 'transparent',
            borderColor: shouldRenderBorder ? borderColor : 'transparent',
            borderSize: shouldRenderBorder ? 1 : 0,
            borderStyle: 'solid',
            borderRadius: 4,
          },
          ignoreEvent: false,
        });

        // 4. Composite Note Text rendered on canvas ONLY during in-progress creation preview (isDrawing === true)
        if (isDrawing) {
          figures.push({
            type: 'text',
            attrs: {
              x: layout.box.x + layout.box.width / 2,
              y: layout.box.y + layout.box.height / 2,
              text: displayText || 'Add text',
              align: 'center',
              baseline: 'middle',
            },
            styles: {
              color: textColor,
              size: fontSize,
              family: NOTE_FONT_FAMILY,
              align: 'center',
              baseline: 'middle',
              weight: isBold ? 'bold' : 'normal',
              style: isItalic ? 'italic' : 'normal',
              backgroundColor: 'transparent',
            },
            ignoreEvent: true,
          });
        }

        // 5. Grab Handles on Anchor 1 and Anchor 2
        if (isSelected || isHovered || isDrawing) {
          drawGrabHandles(figures, coordinates, overlay?.lock || false, isSelected || isDrawing);
        }
      }

      return figures;
    },
  }),
};
