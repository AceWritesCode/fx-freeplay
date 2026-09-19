/**
 * Shared Typography & Text Foundation Engine
 * Provides common text measurement, typography formatting, wrapping,
 * and positioning primitives for text-capable drawings (Text, Note, TrendLine, Rectangle, etc.).
 *
 * NOTE: Drawing-specific geometry (boxes, 4-way attachments, line gaps) remain in each tool's layer.
 */

// ─── 1. Shared Typography Constants ──────────────────────────────────────────

export const SHARED_TEXT_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const DEFAULT_TEXT_FONT_SIZE = 14;
export const DEFAULT_TEXT_PLACEHOLDER = 'Add text';

// ─── 2. Font Construction & Line Metrics ─────────────────────────────────────

/**
 * Constructs a standardized CSS / 2D Canvas font string.
 */
export function buildSharedFontString(
  fontSize: number = DEFAULT_TEXT_FONT_SIZE,
  isBold: boolean = false,
  isItalic: boolean = false,
  fontFamily: string = SHARED_TEXT_FONT_FAMILY
): string {
  const parts: string[] = [];
  if (isItalic) parts.push('italic');
  if (isBold) parts.push('bold');
  parts.push(`${fontSize}px`);
  parts.push(fontFamily);
  return parts.join(' ');
}

/**
 * Calculates uniform proportional line height: ~1.35x font size rounded to nearest even integer.
 */
export function getSharedTextLineHeight(fontSize: number = DEFAULT_TEXT_FONT_SIZE): number {
  return Math.max(16, Math.round((fontSize * 1.35) / 2) * 2);
}

/**
 * Measures or estimates the width of a single character 'W' (useful for minimum box width constraints).
 */
export function getSingleCharWidth(
  fontSize: number = DEFAULT_TEXT_FONT_SIZE,
  isBold: boolean = false,
  isItalic: boolean = false,
  fontFamily: string = SHARED_TEXT_FONT_FAMILY
): number {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = buildSharedFontString(fontSize, isBold, isItalic, fontFamily);
      return ctx.measureText('W').width;
    }
  }
  return fontSize * (isBold ? 0.72 : 0.65);
}

// ─── 3. Text Measurement Primitives ──────────────────────────────────────────

export interface SharedTextMetrics {
  width: number;
  height: number;
  lines: string[];
  lineWidths: number[];
  lineHeight: number;
}

/**
 * Synchronously measures text using 2D canvas with standard fallback metrics.
 * Supports multiline strings separated by newlines.
 */
export function measureSharedText(
  text: string,
  fontSize: number = DEFAULT_TEXT_FONT_SIZE,
  isBold: boolean = false,
  isItalic: boolean = false,
  fontFamily: string = SHARED_TEXT_FONT_FAMILY
): SharedTextMetrics {
  const content = text && text.trim().length > 0 ? text : DEFAULT_TEXT_PLACEHOLDER;
  const lines = content.split('\n');
  const lineHeight = getSharedTextLineHeight(fontSize);

  let lineWidths: number[] = [];

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = buildSharedFontString(fontSize, isBold, isItalic, fontFamily);
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

/**
 * Synchronously measures a single-line string.
 */
export function measureSingleLineText(
  text: string,
  fontSize: number = DEFAULT_TEXT_FONT_SIZE,
  isBold: boolean = false,
  isItalic: boolean = false,
  fontFamily: string = SHARED_TEXT_FONT_FAMILY
): { width: number; height: number; lineHeight: number } {
  const metrics = measureSharedText(text, fontSize, isBold, isItalic, fontFamily);
  return {
    width: metrics.lineWidths[0] ?? metrics.width,
    height: metrics.lineHeight,
    lineHeight: metrics.lineHeight,
  };
}

// ─── 4. Text Line Wrapping Primitive ─────────────────────────────────────────

/**
 * Breaks a text string into wrapped lines that fit within maxPixelWidth using 2D canvas measurement.
 */
export function getWrappedTextLines(
  text: string,
  maxPixelWidth: number,
  fontSize: number = DEFAULT_TEXT_FONT_SIZE,
  isBold: boolean = false,
  isItalic: boolean = false,
  fontFamily: string = SHARED_TEXT_FONT_FAMILY
): string[] {
  if (!text) return [''];

  let measureFn = (str: string) => {
    return str.length * (fontSize * (isBold ? 0.72 : 0.65));
  };

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = buildSharedFontString(fontSize, isBold, isItalic, fontFamily);
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

// ─── 5. Alignment & Positioning Primitives ───────────────────────────────────

export interface AlignedTextPositionParams {
  x: number;
  y: number;
  width: number;
  height: number;
  halign?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
}

export interface AlignedTextPositionResult {
  x: number;
  y: number;
  translateX: string;
  translateY: string;
}

/**
 * Computes target coordinates and CSS transform percentages for aligned text positioning.
 */
export function calculateAlignedTextPosition(
  params: AlignedTextPositionParams
): AlignedTextPositionResult {
  const { x, y, width, height, halign = 'center', valign = 'middle' } = params;
  let tx = x;
  let ty = y;
  let translateX = '-50%';
  let translateY = '-50%';

  if (halign === 'left') {
    tx = x;
    translateX = '0%';
  } else if (halign === 'right') {
    tx = x + width;
    translateX = '-100%';
  } else {
    tx = x + width / 2;
    translateX = '-50%';
  }

  if (valign === 'top') {
    ty = y;
    translateY = '0%';
  } else if (valign === 'bottom') {
    ty = y + height;
    translateY = '-100%';
  } else {
    ty = y + height / 2;
    translateY = '-50%';
  }

  return { x: tx, y: ty, translateX, translateY };
}

// ─── 6. Composite Layout Engine (Text Tool) ──────────────────────────────────

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

/**
 * Computes composite bounding box, wrapped lines, and resize handle geometry
 * for fixed/resizable text boxes (TextTool).
 */
export function computeCompositeTextLayout(options: CompositeTextLayoutOptions): CompositeTextLayoutResult {
  const {
    origin,
    text,
    fontSize = DEFAULT_TEXT_FONT_SIZE,
    isBold = false,
    isItalic = false,
    textAlign = 'left',
    boxWidth,
    paddingX = 10,
    paddingY = 8,
    minHeight = 32,
  } = options;

  const placeholderMetrics = measureSharedText(DEFAULT_TEXT_PLACEHOLDER, fontSize, isBold, isItalic);
  const initialWidth = Math.ceil(placeholderMetrics.width + paddingX * 2);

  const singleCharW = getSingleCharWidth(fontSize, isBold, isItalic);
  const minBoxWidth = Math.ceil(singleCharW + paddingX * 2);
  const effectiveWidth = boxWidth !== undefined ? boxWidth : initialWidth;
  const w = Math.max(minBoxWidth, effectiveWidth);
  const availWidth = Math.max(singleCharW, w - paddingX * 2);

  const content = text && text.trim().length > 0 ? text : '';
  const lines = getWrappedTextLines(content || DEFAULT_TEXT_PLACEHOLDER, availWidth, fontSize, isBold, isItalic);
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
