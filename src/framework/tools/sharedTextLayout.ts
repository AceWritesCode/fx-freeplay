/**
 * Shared Typography & Composite Text Layout Engine
 * Used uniformly by TextTool, NoteTool, and other drawing text overlays.
 */

export const SHARED_TEXT_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export function getSharedTextLineHeight(fontSize: number = 14): number {
  return Math.max(16, Math.round((fontSize * 1.35) / 2) * 2);
}

export function getSingleCharWidth(fontSize: number = 14, isBold: boolean = false): number {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px ${SHARED_TEXT_FONT_FAMILY}`;
      return ctx.measureText('W').width;
    }
  }
  return fontSize * (isBold ? 0.72 : 0.65);
}

export function getWrappedTextLines(
  text: string,
  maxPixelWidth: number,
  fontSize: number = 14,
  isBold: boolean = false,
  isItalic: boolean = false
): string[] {
  if (!text) return [''];

  let measureFn = (str: string) => {
    return str.length * (fontSize * (isBold ? 0.72 : 0.65));
  };

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSize}px ${SHARED_TEXT_FONT_FAMILY}`;
      measureFn = (str: string) => ctx.measureText(str).width;
    }
  }

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
      const testWidth = measureFn(testLine);

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
}

export interface CompositeTextLayoutOptions {
  origin: { x: number; y: number };
  text: string;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  boxWidth?: number;
  paddingX?: number;
  paddingY?: number;
  minHeight?: number;
}

export interface CompositeTextLayoutResult {
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text: {
    lines: string[];
    totalWidth: number;
    totalHeight: number;
    lineHeight: number;
    align: 'left' | 'center' | 'right';
  };
  resizeHandle: {
    x: number;
    y: number;
  };
  paddingX: number;
  paddingY: number;
}

export interface SharedTextMetrics {
  width: number;
  height: number;
  lines: string[];
  lineWidths: number[];
  lineHeight: number;
}

export function measureSharedText(
  text: string,
  fontSize: number = 14,
  isBold: boolean = false,
  isItalic: boolean = false
): SharedTextMetrics {
  const content = text && text.trim().length > 0 ? text : 'Add text';
  const lines = content.split('\n');
  const lineHeight = getSharedTextLineHeight(fontSize);

  let lineWidths: number[] = [];

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSize}px ${SHARED_TEXT_FONT_FAMILY}`;
      lineWidths = lines.map((l) => Math.ceil(ctx.measureText(l.length === 0 ? ' ' : l).width));
    }
  }

  if (lineWidths.length === 0) {
    const charW = fontSize * (isBold ? 0.72 : 0.65);
    lineWidths = lines.map((l) => Math.ceil(Math.max(1, l.length) * charW));
  }

  const width = Math.max(10, ...lineWidths);
  const height = lines.length * lineHeight;

  return {
    width,
    height,
    lines,
    lineWidths,
    lineHeight,
  };
}

export function computeCompositeTextLayout(options: CompositeTextLayoutOptions): CompositeTextLayoutResult {
  const {
    origin,
    text,
    fontSize = 14,
    isBold = false,
    isItalic = false,
    textAlign = 'left',
    boxWidth,
    paddingX = 10,
    paddingY = 8,
    minHeight = 32,
  } = options;

  const placeholderMetrics = measureSharedText('Add text', fontSize, isBold, isItalic);
  const initialWidth = Math.ceil(placeholderMetrics.width + paddingX * 2);

  const singleCharW = getSingleCharWidth(fontSize, isBold);
  const minBoxWidth = Math.ceil(singleCharW + paddingX * 2);
  const effectiveWidth = boxWidth !== undefined ? boxWidth : initialWidth;
  const w = Math.max(minBoxWidth, effectiveWidth);
  const availWidth = Math.max(singleCharW, w - paddingX * 2);

  const content = text && text.trim().length > 0 ? text : '';
  const lines = getWrappedTextLines(content || 'Add text', availWidth, fontSize, isBold, isItalic);
  const lineHeight = getSharedTextLineHeight(fontSize);
  const totalTextHeight = lines.length * lineHeight;
  const h = Math.max(minHeight, Math.ceil((totalTextHeight + paddingY * 2) / 2) * 2);

  const x = Math.round(origin.x);
  const y = Math.round(origin.y);

  const targetHandleX = x + w;
  const targetHandleY = y + h / 2;

  return {
    box: {
      x,
      y,
      width: w,
      height: h,
    },
    text: {
      lines,
      totalWidth: availWidth,
      totalHeight: totalTextHeight,
      lineHeight,
      align: textAlign,
    },
    resizeHandle: {
      x: targetHandleX,
      y: targetHandleY,
    },
    paddingX,
    paddingY,
  };
}

