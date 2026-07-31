/**
 * Line segment intersection detector helper.
 */
export const intersects = (p1: any, p2: any, p3: any, p4: any): boolean => {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (d === 0) return false;
  const u = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const v = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
};

/**
 * Checks if a pixel point is inside the selection boundary rectangle.
 */
export const isPointInRect = (p: any, xMin: number, xMax: number, yMin: number, yMax: number): boolean => {
  return p.x >= xMin && p.x <= xMax && p.y >= yMin && p.y <= yMax;
};

/**
 * Geometric hit test algorithm to check if a drawing overlay intersects the selection box.
 */
export const doesOverlayIntersectRect = (
  ov: any,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  chart: any
): boolean => {
  const points = ov.points;
  if (!points || points.length === 0) return false;
  const pts = chart.convertToPixel(points, { paneId: 'candle_pane' });
  const validPts = pts.filter((p: any) => p !== null && p !== undefined);
  if (validPts.length === 0) return false;

  const pointInRect = (p: any) => isPointInRect(p, xMin, xMax, yMin, yMax);

  if (ov.name === 'segment') {
    if (validPts.length < 2) return false;
    const A = validPts[0];
    const B = validPts[1];
    if (pointInRect(A) || pointInRect(B)) return true;

    const rTL = { x: xMin, y: yMin };
    const rTR = { x: xMax, y: yMin };
    const rBR = { x: xMax, y: yMax };
    const rBL = { x: xMin, y: yMax };

    return intersects(A, B, rTL, rTR) || 
           intersects(A, B, rTR, rBR) || 
           intersects(A, B, rBR, rBL) || 
           intersects(A, B, rBL, rTL);
  }

  if (ov.name === 'horizontalStraightLine') {
    const y0 = validPts[0].y;
    return y0 >= yMin && y0 <= yMax;
  }

  if (ov.name === 'rect' || ov.name === 'priceChannel') {
    const xs = validPts.map((p: any) => p.x);
    const ys = validPts.map((p: any) => p.y);
    const xMin_ov = Math.min(...xs);
    const xMax_ov = Math.max(...xs);
    const yMin_ov = Math.min(...ys);
    const yMax_ov = Math.max(...ys);

    return Math.max(xMin_ov, xMin) <= Math.min(xMax_ov, xMax) && 
           Math.max(yMin_ov, yMin) <= Math.min(yMax_ov, yMax);
  }

  return validPts.some(pointInRect);
};
