import React from 'react';
import type { ToolDefinition } from '../ToolRegistry.ts';
import { drawGrabHandles, isOverlayVisible } from '../toolUtils.ts';
import {
  SHARED_TEXT_FONT_FAMILY,
  getSharedTextLineHeight,
  measureSharedText,
} from '../sharedTextLayout.ts';

// Callout SVG icon matching TradingView specification
export const CalloutIcon = ({ className = "w-5 h-5", style }: { className?: string; style?: React.CSSProperties } = {}) =>
  React.createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 28 28', className, style },
    React.createElement('path', {
      fill: 'currentColor',
      fillRule: 'evenodd',
      d: 'M4 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-6.5l-4.5 4.5V18H6a2 2 0 0 1-2-2V5Zm2-1a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h6v3.086l3.086-3.086H22a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H6Z',
    })
  );

export interface CalloutCustomSettings {
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  showBorder?: boolean;
  fillBackground?: boolean;
  backgroundColor?: string;
  fillColor?: string;
  lineColor?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  text?: string;
  textColor?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  textValign?: 'top' | 'middle' | 'bottom';
  [key: string]: any;
}

export const DEFAULT_CALLOUT_SETTINGS: CalloutCustomSettings = {
  borderColor: '#2196F3',
  borderWidth: 1,
  borderStyle: 'solid',
  showBorder: true,
  fillBackground: true,
  backgroundColor: '#2196F3',
  text: '',
  textColor: '#ffffff',
  fontSize: 14,
  bold: false,
  italic: false,
  textAlign: 'center',
  textValign: 'middle',
};

export const CALLOUT_FONT_FAMILY = SHARED_TEXT_FONT_FAMILY;
export const CALLOUT_PADDING_X = 10;
export const CALLOUT_PADDING_Y = 6;

export const getCalloutLineHeight = getSharedTextLineHeight;

export type CalloutPlacement =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right';

/**
 * Classifies the 8-way placement of the box center relative to the fixed anchor.
 * Uses 45-degree angular sectors around the fixed anchor.
 */
export function computeCalloutPlacement(
  anchor: { x: number; y: number },
  boxCenter: { x: number; y: number }
): CalloutPlacement {
  const dx = boxCenter.x - anchor.x;
  const dy = boxCenter.y - anchor.y;

  if (dx === 0 && dy === 0) {
    return 'top-right';
  }

  const rad = Math.atan2(dy, dx);
  const deg = (rad * 180) / Math.PI; // range [-180, 180]

  // Sector boundaries offset by 22.5 degrees (45 deg sectors):
  // -22.5 to 22.5 -> 'right'
  // 22.5 to 67.5 -> 'bottom-right'
  // 67.5 to 112.5 -> 'bottom'
  // 112.5 to 157.5 -> 'bottom-left'
  // -67.5 to -22.5 -> 'top-right'
  // -112.5 to -67.5 -> 'top'
  // -157.5 to -112.5 -> 'top-left'
  // > 157.5 or < -157.5 -> 'left'
  if (deg >= -22.5 && deg < 22.5) {
    return 'right';
  } else if (deg >= 22.5 && deg < 67.5) {
    return 'bottom-right';
  } else if (deg >= 67.5 && deg < 112.5) {
    return 'bottom';
  } else if (deg >= 112.5 && deg < 157.5) {
    return 'bottom-left';
  } else if (deg >= -67.5 && deg < -22.5) {
    return 'top-right';
  } else if (deg >= -112.5 && deg < -67.5) {
    return 'top';
  } else if (deg >= -157.5 && deg < -112.5) {
    return 'top-left';
  } else {
    return 'left';
  }
}

/**
 * Calculates the exact point on the perimeter of the box where the connector/tail enters.
 * Ensures the visible tail terminates cleanly at the box boundary and never penetrates inside.
 */
export function computeCalloutAttachmentPoint(
  anchor: { x: number; y: number },
  boxCenter: { x: number; y: number },
  boxWidth: number,
  boxHeight: number
): { x: number; y: number } {
  const halfW = boxWidth / 2;
  const halfH = boxHeight / 2;

  const dx = boxCenter.x - anchor.x;
  const dy = boxCenter.y - anchor.y;

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x: boxCenter.x, y: boxCenter.y + halfH };
  }

  // Calculate ray-box intersection from boxCenter towards anchor
  const scaleX = Math.abs(dx) > 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0 ? halfH / Math.abs(dy) : Infinity;
  const t = Math.min(scaleX, scaleY);

  if (t >= 1) {
    return { x: anchor.x, y: anchor.y };
  }

  return {
    x: Math.round(boxCenter.x - t * dx),
    y: Math.round(boxCenter.y - t * dy),
  };
}

export interface CalloutTextMetrics {
  width: number;
  height: number;
  lines: string[];
  lineWidths: number[];
  lineHeight: number;
}

export function measureCalloutText(
  text: string,
  fontSize: number = 14,
  isBold: boolean = false,
  isItalic: boolean = false
): CalloutTextMetrics {
  return measureSharedText(text, fontSize, isBold, isItalic, CALLOUT_FONT_FAMILY);
}

export interface CalloutCompositeLayout {
  box: {
    x: number; // top-left x
    y: number; // top-left y
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    placement: CalloutPlacement;
  };
  attachment: {
    x: number;
    y: number;
  };
  polygon: Array<{ x: number; y: number }>;
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

/**
 * Computes a unified composite polygon for the Callout speech bubble:
 * a rounded rectangle with an integrated triangular tail pointing directly to the anchor.
 * The entire shape shares a single closed perimeter, fill, and outline.
 */
export function computeCompositeCalloutPolygon(
  anchor: { x: number; y: number },
  box: { x: number; y: number; width: number; height: number },
  cornerRadius: number = 4,
  tailBaseWidth: number = 16
): Array<{ x: number; y: number }> {
  const x0 = box.x;
  const x1 = box.x + box.width;
  const y0 = box.y;
  const y1 = box.y + box.height;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  const r = Math.max(0, Math.min(cornerRadius, box.width / 2, box.height / 2));
  const maxBase = Math.min(box.width - 2 * r - 2, box.height - 2 * r - 2);
  const halfBase = Math.max(3, Math.min(tailBaseWidth / 2, maxBase > 0 ? maxBase / 2 : 6));

  const dx = cx - anchor.x;
  const dy = cy - anchor.y;

  // Determine which side the tail attaches to based on ray from center to anchor
  let side: 'top' | 'right' | 'bottom' | 'left' = 'bottom';
  const scaleX = Math.abs(dx) > 0 ? (box.width / 2) / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0 ? (box.height / 2) / Math.abs(dy) : Infinity;

  let attachX = cx;
  let attachY = cy;

  if (scaleY <= scaleX) {
    if (dy > 0) {
      side = 'top';
      attachY = y0;
      attachX = cx - (dy !== 0 ? ((box.height / 2) / dy) * dx : 0);
    } else {
      side = 'bottom';
      attachY = y1;
      attachX = cx - (dy !== 0 ? ((-box.height / 2) / dy) * dx : 0);
    }
  } else {
    if (dx > 0) {
      side = 'left';
      attachX = x0;
      attachY = cy - (dx !== 0 ? ((box.width / 2) / dx) * dy : 0);
    } else {
      side = 'right';
      attachX = x1;
      attachY = cy - (dx !== 0 ? ((-box.width / 2) / dx) * dy : 0);
    }
  }

  // Corner arc generator (3 sample points per corner for smooth rendering)
  const addCorner = (
    centerX: number,
    centerY: number,
    startAngle: number,
    endAngle: number,
    points: Array<{ x: number; y: number }>
  ) => {
    if (r <= 0) {
      points.push({ x: Math.round(centerX), y: Math.round(centerY) });
      return;
    }
    const steps = 3;
    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / steps);
      points.push({
        x: Math.round(centerX + r * Math.cos(angle)),
        y: Math.round(centerY + r * Math.sin(angle)),
      });
    }
  };

  const poly: Array<{ x: number; y: number }> = [];

  // Clockwise traversal starting from top-left:
  // 1. Top-left corner
  addCorner(x0 + r, y0 + r, Math.PI, 1.5 * Math.PI, poly);

  // 2. Top edge (with tail if side === 'top')
  if (side === 'top') {
    const tx = Math.max(x0 + r + halfBase, Math.min(x1 - r - halfBase, attachX));
    poly.push({ x: Math.round(tx - halfBase), y: Math.round(y0) });
    poly.push({ x: Math.round(anchor.x), y: Math.round(anchor.y) });
    poly.push({ x: Math.round(tx + halfBase), y: Math.round(y0) });
  }

  // 3. Top-right corner
  addCorner(x1 - r, y0 + r, 1.5 * Math.PI, 2 * Math.PI, poly);

  // 4. Right edge (with tail if side === 'right')
  if (side === 'right') {
    const ty = Math.max(y0 + r + halfBase, Math.min(y1 - r - halfBase, attachY));
    poly.push({ x: Math.round(x1), y: Math.round(ty - halfBase) });
    poly.push({ x: Math.round(anchor.x), y: Math.round(anchor.y) });
    poly.push({ x: Math.round(x1), y: Math.round(ty + halfBase) });
  }

  // 5. Bottom-right corner
  addCorner(x1 - r, y1 - r, 0, 0.5 * Math.PI, poly);

  // 6. Bottom edge (with tail if side === 'bottom')
  if (side === 'bottom') {
    const tx = Math.max(x0 + r + halfBase, Math.min(x1 - r - halfBase, attachX));
    poly.push({ x: Math.round(tx + halfBase), y: Math.round(y1) });
    poly.push({ x: Math.round(anchor.x), y: Math.round(anchor.y) });
    poly.push({ x: Math.round(tx - halfBase), y: Math.round(y1) });
  }

  // 7. Bottom-left corner
  addCorner(x0 + r, y1 - r, 0.5 * Math.PI, Math.PI, poly);

  // 8. Left edge (with tail if side === 'left')
  if (side === 'left') {
    const ty = Math.max(y0 + r + halfBase, Math.min(y1 - r - halfBase, attachY));
    poly.push({ x: Math.round(x0), y: Math.round(ty + halfBase) });
    poly.push({ x: Math.round(anchor.x), y: Math.round(anchor.y) });
    poly.push({ x: Math.round(x0), y: Math.round(ty - halfBase) });
  }

  return poly;
}

/**
 * Computes composite layout for Callout: box rectangle centered at boxCenter,
 * 8-way placement classification, integrated tail polygon, and per-line text positions.
 */
export function computeCompositeCalloutLayout(
  anchor: { x: number; y: number },
  boxCenter: { x: number; y: number },
  text: string,
  fontSize: number = 14,
  isBold: boolean = false,
  isItalic: boolean = false,
  textAlign: 'left' | 'center' | 'right' = 'center',
  textValign: 'top' | 'middle' | 'bottom' = 'middle'
): CalloutCompositeLayout {
  const paddingX = CALLOUT_PADDING_X;
  const paddingY = CALLOUT_PADDING_Y;

  const metrics = measureCalloutText(text, fontSize, isBold, isItalic);
  let boxWidth = metrics.width + paddingX * 2;
  let boxHeight = metrics.height + paddingY * 2;

  // Round up to even numbers to guarantee integer centers and zero subpixel drift
  boxWidth = Math.ceil(boxWidth / 2) * 2;
  boxHeight = Math.ceil(boxHeight / 2) * 2;

  const placement = computeCalloutPlacement(anchor, boxCenter);
  const attachment = computeCalloutAttachmentPoint(anchor, boxCenter, boxWidth, boxHeight);

  // Box top-left is centered around boxCenter (coordinates[1])
  const boxX = Math.round(boxCenter.x - boxWidth / 2);
  const boxY = Math.round(boxCenter.y - boxHeight / 2);

  const box = {
    x: boxX,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
    centerX: boxCenter.x,
    centerY: boxCenter.y,
    placement,
  };

  const polygon = computeCompositeCalloutPolygon(anchor, box, 4, 16);

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
    box,
    attachment,
    polygon,
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

export const CalloutTool: ToolDefinition = {
  id: 'callout',
  name: 'Callout',
  icon: CalloutIcon,
  group: 'text',
  hotkey: '',

  settingsSchema: [
    {
      id: 'borderColor',
      label: 'Border Color',
      type: 'color',
      defaultValue: '#2196F3',
    },
    {
      id: 'borderWidth',
      label: 'Border Width',
      type: 'number',
      defaultValue: 1,
      min: 1,
      max: 4,
      step: 1,
    },
    {
      id: 'borderStyle',
      label: 'Border Style',
      type: 'select',
      defaultValue: 'solid',
      options: [
        { label: 'Solid', value: 'solid' },
        { label: 'Dashed', value: 'dashed' },
        { label: 'Dotted', value: 'dotted' },
      ],
    },
    {
      id: 'fillBackground',
      label: 'Background',
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
      label: 'Border',
      type: 'boolean',
      defaultValue: true,
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
        borderColor: '#2196F3',
        borderWidth: 1,
        borderStyle: 'solid',
        showBorder: true,
        fillBackground: true,
        backgroundColor: '#2196F3',
        text: '',
        textColor: '#ffffff',
        fontSize: 14,
      },
    },
  ],

  createOverlayDef: () => ({
    name: 'callout',
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
        const customSettings: CalloutCustomSettings = {
          ...DEFAULT_CALLOUT_SETTINGS,
          ...((overlay?.extendData as any)?.customSettings || {}),
        };

        const anchor = { ...coordinates[0] };
        const boxCenter = { ...coordinates[1] };

        const borderColor = customSettings.borderColor ?? customSettings.lineColor ?? '#2196F3';
        const borderWidth = customSettings.borderWidth !== undefined ? customSettings.borderWidth : (customSettings.lineWidth !== undefined ? customSettings.lineWidth : 1);
        const borderStyle = customSettings.borderStyle ?? customSettings.lineStyle ?? 'solid';
        const showBorder = customSettings.showBorder !== undefined ? customSettings.showBorder : true;
        const fillBackground = customSettings.fillBackground !== false;
        const backgroundColor = customSettings.backgroundColor ?? customSettings.fillColor ?? customSettings.lineColor ?? '#2196F3';

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

        const layout = computeCompositeCalloutLayout(
          anchor,
          boxCenter,
          displayText,
          fontSize,
          isBold,
          isItalic,
          textAlign,
          textValign
        );

        // 1. Transparent hit-testing line covering the tail connector for responsive hover/drag near tail
        figures.push({
          type: 'line',
          attrs: { coordinates: [{ x: anchor.x, y: anchor.y }, { x: layout.attachment.x, y: layout.attachment.y }] },
          styles: {
            style: 'solid',
            color: 'transparent',
            size: Math.max(borderWidth, 12),
          },
          ignoreEvent: false,
        });

        // 2. Composite Callout Bubble Polygon (Rounded Box + Integrated Tail sharing ONE outline & fill)
        const hasBg = fillBackground && backgroundColor && backgroundColor !== 'transparent';
        const shouldRenderBorder = showBorder || (!hasBg && (isSelected || isHovered));

        // Invisible fill polygon guaranteeing the entire interior is an interactive hit target
        if (!hasBg) {
          figures.push({
            type: 'polygon',
            attrs: {
              coordinates: layout.polygon,
            },
            styles: {
              style: 'fill',
              color: 'transparent',
            },
            ignoreEvent: false,
          });
        }

        let figureBorderStyle: 'solid' | 'dashed' = 'solid';
        let borderDashedValue: number[] = [4, 4];
        if (borderStyle === 'dashed') {
          figureBorderStyle = 'dashed';
          borderDashedValue = [4, 4];
        } else if (borderStyle === 'dotted') {
          figureBorderStyle = 'dashed';
          borderDashedValue = [2, 2];
        }

        figures.push({
          type: 'polygon',
          attrs: {
            coordinates: layout.polygon,
          },
          styles: {
            style: hasBg ? (shouldRenderBorder ? 'stroke_fill' : 'fill') : 'stroke',
            color: hasBg ? backgroundColor : 'transparent',
            borderColor: shouldRenderBorder ? borderColor : 'transparent',
            borderSize: shouldRenderBorder ? borderWidth : 0,
            borderStyle: figureBorderStyle,
            borderDashedValue: borderDashedValue,
          },
          ignoreEvent: false,
        });

        // 4. Composite Callout Text rendered on canvas ONLY during in-progress creation preview (isDrawing === true)
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
              family: CALLOUT_FONT_FAMILY,
              align: 'center',
              baseline: 'middle',
              weight: isBold ? 'bold' : 'normal',
              style: isItalic ? 'italic' : 'normal',
              backgroundColor: 'transparent',
            },
            ignoreEvent: true,
          });
        }

        // 5. Grab Handle ONLY on the fixed target Anchor (coordinates[0]) — boxCenter (coordinates[1]) is NEVER a grab handle
        if (isSelected || isHovered || isDrawing) {
          drawGrabHandles(figures, [coordinates[0]], overlay?.lock || false, isSelected || isDrawing);
        }
      }

      return figures;
    },
  }),

  onPressedMoving: (event: any, draggedIndex: number | null) => {
    const rawPoints = event.overlay?.points || [];
    if (rawPoints.length < 2) return false;

    const startPoints = (event.overlay?.extendData as any)?.startPoints;
    const startMousePt = (event.overlay?.extendData as any)?.startMousePt;
    const currentMousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];

    if (!startPoints || startPoints.length < 2 || !startMousePt || !currentMousePt) {
      return false;
    }

    const deltaTimestamp = currentMousePt.timestamp - startMousePt.timestamp;
    const deltaValue = currentMousePt.value - startMousePt.value;
    const deltaDataIndex = (currentMousePt.dataIndex !== undefined && startMousePt.dataIndex !== undefined)
      ? currentMousePt.dataIndex - startMousePt.dataIndex
      : undefined;

    const newPoints = JSON.parse(JSON.stringify(startPoints));

    if (draggedIndex === null || draggedIndex === 1) {
      // 1. DRAG BODY / DRAG BOX CENTER (Anchor 1):
      // points[0] (fixed anchor) MUST remain completely unchanged!
      // Only points[1] (box center) moves.
      newPoints[0] = { ...startPoints[0] };
      newPoints[1] = {
        timestamp: startPoints[1].timestamp + deltaTimestamp,
        value: startPoints[1].value + deltaValue,
        ...(deltaDataIndex !== undefined && startPoints[1].dataIndex !== undefined
          ? { dataIndex: startPoints[1].dataIndex + deltaDataIndex }
          : {}),
      };
    } else if (draggedIndex === 0) {
      // 2. DRAG FIRST ANCHOR (Anchor 0):
      // points[0] moves with drag, points[1] (box center) MUST remain unchanged!
      newPoints[0] = {
        timestamp: startPoints[0].timestamp + deltaTimestamp,
        value: startPoints[0].value + deltaValue,
        ...(deltaDataIndex !== undefined && startPoints[0].dataIndex !== undefined
          ? { dataIndex: startPoints[0].dataIndex + deltaDataIndex }
          : {}),
      };
      newPoints[1] = { ...startPoints[1] };
    }

    return { points: newPoints };
  },
};
