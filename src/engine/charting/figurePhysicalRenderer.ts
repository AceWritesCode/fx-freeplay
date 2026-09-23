/**
 * figurePhysicalRenderer.ts
 *
 * Implements physical-pixel rendering for KLineCharts shared figure layer:
 * - line
 * - rect
 * - circle
 * - polygon
 * - arc
 * - path
 *
 * Guarantees:
 * 1. 1 logical visual stroke unit (lineWidth: 1) converts to exactly 1 physical device pixel (1 / DPR CSS px).
 * 2. Logical stroke settings (1, 2, 3, ...) remain untouched in stores, templates, and schemas.
 * 3. Odd physical stroke widths apply physical subpixel offset alignment (+0.5 / DPR) for razor-sharp edges.
 * 4. Preserves all line styles (solid, dashed, dotted), fills, caps, joins, and bezier geometry.
 * 5. Full harmony with candle rendering and all overlay tools.
 */

import { getDevicePixelRatio, toPhysicalStrokeWidth, snapStrokeCenter } from './pixelRatio.ts';

let areFiguresRegistered = false;

function isTransparent(color: unknown): boolean {
  return !color || color === 'transparent' || color === 'none';
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !isNaN(v);
}

/**
 * Helper to stroke smooth bezier curves or polyline segments.
 */
function lineTo(ctx: CanvasRenderingContext2D, coordinates: any[], smooth: unknown): void {
  const length = coordinates.length;
  const smoothParam = isNumber(smooth) ? (smooth > 0 && smooth < 1 ? smooth : 0) : (smooth ? 0.5 : 0);

  if (smoothParam > 0 && length > 2) {
    let cpx0 = coordinates[0].x;
    let cpy0 = coordinates[0].y;
    for (let i = 1; i < length - 1; i++) {
      const prevCoordinate = coordinates[i - 1];
      const coordinate = coordinates[i];
      const nextCoordinate = coordinates[i + 1];
      const dx01 = coordinate.x - prevCoordinate.x;
      const dy01 = coordinate.y - prevCoordinate.y;
      const dx12 = nextCoordinate.x - coordinate.x;
      const dy12 = nextCoordinate.y - coordinate.y;
      let dx02 = nextCoordinate.x - prevCoordinate.x;
      let dy02 = nextCoordinate.y - prevCoordinate.y;
      const prevSegmentLength = Math.sqrt(dx01 * dx01 + dy01 * dy01);
      const nextSegmentLength = Math.sqrt(dx12 * dx12 + dy12 * dy12);
      const segmentLengthRatio = nextSegmentLength / (nextSegmentLength + prevSegmentLength);
      let nextCpx = coordinate.x + dx02 * smoothParam * segmentLengthRatio;
      let nextCpy = coordinate.y + dy02 * smoothParam * segmentLengthRatio;
      nextCpx = Math.min(nextCpx, Math.max(nextCoordinate.x, coordinate.x));
      nextCpy = Math.min(nextCpy, Math.max(nextCoordinate.y, coordinate.y));
      nextCpx = Math.max(nextCpx, Math.min(nextCoordinate.x, coordinate.x));
      nextCpy = Math.max(nextCpy, Math.min(nextCoordinate.y, coordinate.y));
      dx02 = nextCpx - coordinate.x;
      dy02 = nextCpy - coordinate.y;
      let cpx1 = coordinate.x - (dx02 * prevSegmentLength) / nextSegmentLength;
      let cpy1 = coordinate.y - (dy02 * prevSegmentLength) / nextSegmentLength;
      cpx1 = Math.min(cpx1, Math.max(prevCoordinate.x, coordinate.x));
      cpy1 = Math.min(cpy1, Math.max(prevCoordinate.y, coordinate.y));
      cpx1 = Math.max(cpx1, Math.min(prevCoordinate.x, coordinate.x));
      cpy1 = Math.max(cpy1, Math.min(prevCoordinate.y, coordinate.y));
      ctx.bezierCurveTo(cpx0, cpy0, cpx1, cpy1, coordinate.x, coordinate.y);
      cpx0 = nextCpx;
      cpy0 = nextCpy;
    }
    const lastCoordinate = coordinates[length - 1];
    ctx.bezierCurveTo(cpx0, cpy0, lastCoordinate.x, lastCoordinate.y, lastCoordinate.x, lastCoordinate.y);
  } else {
    for (let i = 1; i < length; i++) {
      ctx.lineTo(coordinates[i].x, coordinates[i].y);
    }
  }
}

/**
 * 1. Physical Line Figure Renderer
 */
export function drawPhysicalLine(
  ctx: CanvasRenderingContext2D,
  attrs: any,
  styles: any,
  customDpr?: number
): void {
  const lines: any[] = Array.isArray(attrs) ? attrs : [attrs];
  const style = styles.style || 'solid';
  const smooth = styles.smooth || false;
  const logicalSize = styles.size !== undefined ? styles.size : (styles.lineWidth !== undefined ? styles.lineWidth : 1);
  const color = styles.color || 'currentColor';
  const dashedValue = styles.dashedValue || [2, 2];
  const lineCap = styles.lineCap;
  const lineJoin = styles.lineJoin;

  const dpr = customDpr !== undefined ? customDpr : getDevicePixelRatio();
  const size = logicalSize < 1 && logicalSize > 0 ? logicalSize : toPhysicalStrokeWidth(logicalSize, dpr);
  const isSmooth = typeof smooth === 'number' ? smooth > 0 : !!smooth;

  ctx.lineWidth = size;
  ctx.strokeStyle = color;

  if (isString(lineCap)) {
    ctx.lineCap = lineCap as CanvasLineCap;
  } else if (isSmooth) {
    ctx.lineCap = 'round';
  } else {
    ctx.lineCap = 'butt';
  }

  if (isString(lineJoin)) {
    ctx.lineJoin = lineJoin as CanvasLineJoin;
  } else if (isSmooth) {
    ctx.lineJoin = 'round';
  } else {
    ctx.lineJoin = 'miter';
  }

  if (style === 'dashed') {
    ctx.setLineDash(dashedValue);
  } else {
    ctx.setLineDash([]);
  }

  const physicalWidth = Math.round(size * dpr);

  lines.forEach((lineItem) => {
    const coordinates = lineItem.coordinates;
    if (coordinates && coordinates.length > 1) {
      if (coordinates.length === 2) {
        const isHorizontal = Math.abs(coordinates[0].y - coordinates[1].y) < 1e-5;
        const isVertical = Math.abs(coordinates[0].x - coordinates[1].x) < 1e-5;

        if (isHorizontal) {
          const snappedY = snapStrokeCenter(coordinates[0].y, physicalWidth, dpr);
          ctx.beginPath();
          ctx.moveTo(coordinates[0].x, snappedY);
          ctx.lineTo(coordinates[1].x, snappedY);
          ctx.stroke();
          ctx.closePath();
          return;
        }

        if (isVertical) {
          const snappedX = snapStrokeCenter(coordinates[0].x, physicalWidth, dpr);
          ctx.beginPath();
          ctx.moveTo(snappedX, coordinates[0].y);
          ctx.lineTo(snappedX, coordinates[1].y);
          ctx.stroke();
          ctx.closePath();
          return;
        }
      }

      // Diagonal lines, polylines, and smooth curves: preserve unshifted geometry
      ctx.beginPath();
      ctx.moveTo(coordinates[0].x, coordinates[0].y);
      lineTo(ctx, coordinates, smooth);
      ctx.stroke();
      ctx.closePath();
    }
  });
}

/**
 * 2. Physical Rect Figure Renderer
 */
export function drawPhysicalRect(
  ctx: CanvasRenderingContext2D,
  attrs: any,
  styles: any,
  customDpr?: number
): void {
  const rects: any[] = Array.isArray(attrs) ? attrs : [attrs];
  const style = styles.style || 'fill';
  const color = styles.color || 'transparent';
  const borderColor = styles.borderColor || 'transparent';
  const borderStyle = styles.borderStyle || 'solid';
  const r = styles.borderRadius || 0;
  const borderDashedValue = styles.borderDashedValue || [2, 2];

  const dpr = customDpr !== undefined ? customDpr : getDevicePixelRatio();
  const logicalBorderSize = styles.borderSize !== undefined ? styles.borderSize : 1;
  const borderSize =
    logicalBorderSize < 1 && logicalBorderSize > 0
      ? logicalBorderSize
      : toPhysicalStrokeWidth(logicalBorderSize, dpr);

  const hasRadius = typeof r === 'number' ? r > 0 : (Array.isArray(r) ? r.some((val) => val > 0) : !!r);
  const solid = (style === 'fill' || style === 'stroke_fill') && (!isString(color) || !isTransparent(color));

  // Solid fill pass
  if (solid) {
    ctx.fillStyle = color;
    rects.forEach((rect) => {
      const { x, y, width: w, height: h } = rect;
      ctx.beginPath();
      if (hasRadius && (ctx as any).roundRect) {
        (ctx as any).roundRect(x, y, w, h, r);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.closePath();
      ctx.fill();
    });
  }

  // Stroke / border pass with physical-pixel alignment
  if ((style === 'stroke' || style === 'stroke_fill') && borderSize > 0 && !isTransparent(borderColor)) {
    ctx.strokeStyle = borderColor;
    ctx.fillStyle = borderColor;
    ctx.lineWidth = borderSize;

    if (borderStyle === 'dashed') {
      ctx.setLineDash(borderDashedValue);
    } else {
      ctx.setLineDash([]);
    }

    const physicalBorder = Math.round(borderSize * dpr);
    const isOdd = physicalBorder % 2 === 1;
    const correction = isOdd ? 0.5 * (1 / dpr) : 0;
    const doubleCorrection = correction * 2;

    rects.forEach((rect) => {
      const { x, y, width: w, height: h } = rect;
      if (w > borderSize * 2 && h > borderSize * 2) {
        ctx.beginPath();
        if (hasRadius && (ctx as any).roundRect) {
          (ctx as any).roundRect(x + correction, y + correction, w - doubleCorrection, h - doubleCorrection, r);
        } else {
          ctx.rect(x + correction, y + correction, w - doubleCorrection, h - doubleCorrection);
        }
        ctx.closePath();
        ctx.stroke();
      } else {
        if (!solid) {
          ctx.fillRect(x, y, w, h);
        }
      }
    });
  }
}

/**
 * 3. Physical Circle Figure Renderer
 */
export function drawPhysicalCircle(
  ctx: CanvasRenderingContext2D,
  attrs: any,
  styles: any,
  customDpr?: number
): void {
  const circles: any[] = Array.isArray(attrs) ? attrs : [attrs];
  const style = styles.style || 'fill';
  const color = styles.color || 'currentColor';
  const borderColor = styles.borderColor || 'currentColor';
  const borderStyle = styles.borderStyle || 'solid';
  const borderDashedValue = styles.borderDashedValue || [2, 2];

  const dpr = customDpr !== undefined ? customDpr : getDevicePixelRatio();
  const logicalBorderSize = styles.borderSize !== undefined ? styles.borderSize : 1;
  const borderSize =
    logicalBorderSize < 1 && logicalBorderSize > 0
      ? logicalBorderSize
      : toPhysicalStrokeWidth(logicalBorderSize, dpr);

  const solid = (style === 'fill' || style === 'stroke_fill') && (!isString(color) || !isTransparent(color));

  if (solid) {
    ctx.fillStyle = color;
    circles.forEach((circle) => {
      const { x, y, r } = circle;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    });
  }

  if ((style === 'stroke' || style === 'stroke_fill') && borderSize > 0 && !isTransparent(borderColor)) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderSize;

    if (borderStyle === 'dashed') {
      ctx.setLineDash(borderDashedValue);
    } else {
      ctx.setLineDash([]);
    }

    circles.forEach((circle) => {
      const { x, y, r } = circle;
      if (!solid || r > borderSize) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.stroke();
      }
    });
  }
}

/**
 * 4. Physical Polygon Figure Renderer
 */
export function drawPhysicalPolygon(
  ctx: CanvasRenderingContext2D,
  attrs: any,
  styles: any,
  customDpr?: number
): void {
  const polygons: any[] = Array.isArray(attrs) ? attrs : [attrs];
  const style = styles.style || 'fill';
  const color = styles.color || 'currentColor';
  const borderColor = styles.borderColor || 'currentColor';
  const borderStyle = styles.borderStyle || 'solid';
  const borderDashedValue = styles.borderDashedValue || [2, 2];

  const dpr = customDpr !== undefined ? customDpr : getDevicePixelRatio();
  const logicalBorderSize = styles.borderSize !== undefined ? styles.borderSize : 1;
  const borderSize =
    logicalBorderSize < 1 && logicalBorderSize > 0
      ? logicalBorderSize
      : toPhysicalStrokeWidth(logicalBorderSize, dpr);

  const solid = (style === 'fill' || style === 'stroke_fill') && (!isString(color) || !isTransparent(color));

  if (solid) {
    ctx.fillStyle = color;
    polygons.forEach((poly) => {
      const coordinates = poly.coordinates;
      if (coordinates && coordinates.length > 0) {
        ctx.beginPath();
        ctx.moveTo(coordinates[0].x, coordinates[0].y);
        for (let i = 1; i < coordinates.length; i++) {
          ctx.lineTo(coordinates[i].x, coordinates[i].y);
        }
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  if ((style === 'stroke' || style === 'stroke_fill') && borderSize > 0 && !isTransparent(borderColor)) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderSize;

    if (borderStyle === 'dashed') {
      ctx.setLineDash(borderDashedValue);
    } else {
      ctx.setLineDash([]);
    }

    polygons.forEach((poly) => {
      const coordinates = poly.coordinates;
      if (coordinates && coordinates.length > 0) {
        ctx.beginPath();
        ctx.moveTo(coordinates[0].x, coordinates[0].y);
        for (let i = 1; i < coordinates.length; i++) {
          ctx.lineTo(coordinates[i].x, coordinates[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    });
  }
}

/**
 * 5. Physical Arc Figure Renderer
 */
export function drawPhysicalArc(
  ctx: CanvasRenderingContext2D,
  attrs: any,
  styles: any,
  customDpr?: number
): void {
  const arcs: any[] = Array.isArray(attrs) ? attrs : [attrs];
  const style = styles.style || 'solid';
  const logicalSize = styles.size !== undefined ? styles.size : 1;
  const color = styles.color || 'currentColor';
  const dashedValue = styles.dashedValue || [2, 2];

  const dpr = customDpr !== undefined ? customDpr : getDevicePixelRatio();
  const size = logicalSize < 1 && logicalSize > 0 ? logicalSize : toPhysicalStrokeWidth(logicalSize, dpr);

  ctx.lineWidth = size;
  ctx.strokeStyle = color;

  if (style === 'dashed') {
    ctx.setLineDash(dashedValue);
  } else {
    ctx.setLineDash([]);
  }

  arcs.forEach((arcItem) => {
    const { x, y, r, startAngle, endAngle } = arcItem;
    ctx.beginPath();
    ctx.arc(x, y, r, startAngle, endAngle);
    ctx.stroke();
    ctx.closePath();
  });
}

/**
 * 6. Physical Path Figure Renderer
 */
export function drawPhysicalPath(
  ctx: CanvasRenderingContext2D,
  attrs: any,
  styles: any,
  customDpr?: number
): void {
  const paths: any[] = Array.isArray(attrs) ? attrs : [attrs];
  const logicalWidth = styles.lineWidth !== undefined ? styles.lineWidth : 1;
  const color = styles.color || 'currentColor';

  const dpr = customDpr !== undefined ? customDpr : getDevicePixelRatio();
  const lineWidth =
    logicalWidth < 1 && logicalWidth > 0 ? logicalWidth : toPhysicalStrokeWidth(logicalWidth, dpr);

  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.setLineDash([]);

  paths.forEach((pathItem) => {
    const { x, y, path: pathStr } = pathItem;
    const commands = typeof pathStr === 'string' ? pathStr.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) : null;
    if (commands) {
      const offsetX = x || 0;
      const offsetY = y || 0;
      ctx.beginPath();
      let currentX = 0;
      let currentY = 0;
      commands.forEach((command: string) => {
        const type = command[0];
        const args = command.slice(1).trim().split(/[\s,]+/).map(Number);
        switch (type) {
          case 'M':
            currentX = args[0] + offsetX;
            currentY = args[1] + offsetY;
            ctx.moveTo(currentX, currentY);
            break;
          case 'm':
            currentX += args[0];
            currentY += args[1];
            ctx.moveTo(currentX, currentY);
            break;
          case 'L':
            currentX = args[0] + offsetX;
            currentY = args[1] + offsetY;
            ctx.lineTo(currentX, currentY);
            break;
          case 'l':
            currentX += args[0];
            currentY += args[1];
            ctx.lineTo(currentX, currentY);
            break;
          case 'H':
            currentX = args[0] + offsetX;
            ctx.lineTo(currentX, currentY);
            break;
          case 'h':
            currentX += args[0];
            ctx.lineTo(currentX, currentY);
            break;
          case 'V':
            currentY = args[0] + offsetY;
            ctx.lineTo(currentX, currentY);
            break;
          case 'v':
            currentY += args[0];
            ctx.lineTo(currentX, currentY);
            break;
          case 'C':
            ctx.bezierCurveTo(
              args[0] + offsetX,
              args[1] + offsetY,
              args[2] + offsetX,
              args[3] + offsetY,
              args[4] + offsetX,
              args[5] + offsetY
            );
            currentX = args[4] + offsetX;
            currentY = args[5] + offsetY;
            break;
          case 'c':
            ctx.bezierCurveTo(
              currentX + args[0],
              currentY + args[1],
              currentX + args[2],
              currentY + args[3],
              currentX + args[4],
              currentY + args[5]
            );
            currentX += args[4];
            currentY += args[5];
            break;
          case 'Z':
          case 'z':
            ctx.closePath();
            break;
        }
      });
      ctx.stroke();
      ctx.closePath();
    }
  });
}

/**
 * Registers all physical-pixel figure implementations into KLineCharts.
 * Idempotent.
 */
export function registerPhysicalFigures(klinechartsApi?: {
  registerFigure: (fig: any) => void;
  utils?: any;
}): void {
  if (areFiguresRegistered) {
    return;
  }
  if (!klinechartsApi?.registerFigure) {
    return;
  }
  areFiguresRegistered = true;

  const reg = klinechartsApi.registerFigure;
  const ut = klinechartsApi.utils;

  if (typeof reg === 'function') {
    reg({
      name: 'line',
      checkEventOn: ut?.checkCoordinateOnLine,
      draw: (ctx: CanvasRenderingContext2D, attrs: any, styles: any) => drawPhysicalLine(ctx, attrs, styles),
    } as any);
    reg({
      name: 'rect',
      checkEventOn: ut?.checkCoordinateOnRect,
      draw: (ctx: CanvasRenderingContext2D, attrs: any, styles: any) => drawPhysicalRect(ctx, attrs, styles),
    } as any);
    reg({
      name: 'circle',
      checkEventOn: ut?.checkCoordinateOnCircle,
      draw: (ctx: CanvasRenderingContext2D, attrs: any, styles: any) => drawPhysicalCircle(ctx, attrs, styles),
    } as any);
    reg({
      name: 'polygon',
      checkEventOn: ut?.checkCoordinateOnPolygon,
      draw: (ctx: CanvasRenderingContext2D, attrs: any, styles: any) => drawPhysicalPolygon(ctx, attrs, styles),
    } as any);
    reg({
      name: 'arc',
      checkEventOn: ut?.checkCoordinateOnArc,
      draw: (ctx: CanvasRenderingContext2D, attrs: any, styles: any) => drawPhysicalArc(ctx, attrs, styles),
    } as any);
    reg({
      name: 'path',
      draw: (ctx: CanvasRenderingContext2D, attrs: any, styles: any) => drawPhysicalPath(ctx, attrs, styles),
    } as any);
  }
}
