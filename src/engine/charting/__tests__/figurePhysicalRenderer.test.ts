import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  drawPhysicalLine,
  drawPhysicalRect,
  drawPhysicalCircle,
  drawPhysicalPolygon,
  drawPhysicalArc,
  drawPhysicalPath,
  registerPhysicalFigures,
} from '../figurePhysicalRenderer.ts';

function createMockContext(overrides: Record<string, any> = {}) {
  let _lineWidth = 1;
  const ctx: any = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    rect: () => {},
    arc: () => {},
    setLineDash: () => {},
  };

  Object.assign(ctx, overrides);

  // Preserve setter / getter for lineWidth if overridden
  const desc = Object.getOwnPropertyDescriptor(overrides, 'lineWidth');
  if (desc && desc.set) {
    Object.defineProperty(ctx, 'lineWidth', {
      get: () => _lineWidth,
      set: desc.set,
      configurable: true,
    });
  } else {
    Object.defineProperty(ctx, 'lineWidth', {
      get: () => _lineWidth,
      set: (val: number) => {
        _lineWidth = val;
      },
      configurable: true,
    });
  }

  return ctx;
}

describe('Physical-Pixel Standard Figure Rendering (figurePhysicalRenderer.ts)', () => {
  describe('drawPhysicalLine', () => {
    it('converts logical line widths to physical widths across arbitrary DPR values', () => {
      const dprs = [1, 1.25, 1.5, 1.75, 2];
      const logicalWidths = [1, 2, 3, 4];

      for (const dpr of dprs) {
        for (const lw of logicalWidths) {
          let setLineWidth = 0;
          const mockCtx = createMockContext({
            set lineWidth(val: number) {
              setLineWidth = val;
            },
          });

          drawPhysicalLine(
            mockCtx,
            { coordinates: [{ x: 10, y: 10 }, { x: 100, y: 10 }] },
            { size: lw, style: 'solid', color: '#2196f3' },
            dpr
          );

          const expectedWidth = lw / dpr;
          assert.ok(
            Math.abs(setLineWidth - expectedWidth) < 1e-9,
            `Expected lineWidth=${expectedWidth} for logicalWidth=${lw} at DPR=${dpr}, got ${setLineWidth}`
          );
        }
      }
    });

    it('snaps horizontal and vertical 1px lines to physical pixel center across arbitrary DPRs', () => {
      const dprs = [1, 1.25, 1.5, 1.75, 2];
      const testCoordinates = [0, 10.3, 25.7, 50, 101.4];

      for (const dpr of dprs) {
        for (const coord of testCoordinates) {
          let drawnHorizontal: any[] = [];
          const mockCtxH = createMockContext({
            moveTo: (x: number, y: number) => drawnHorizontal.push({ x, y }),
            lineTo: (x: number, y: number) => drawnHorizontal.push({ x, y }),
          });

          // Horizontal line
          drawPhysicalLine(
            mockCtxH,
            { coordinates: [{ x: 0, y: coord }, { x: 100, y: coord }] },
            { size: 1, style: 'solid' },
            dpr
          );

          const expectedPhysicalY = Math.floor(coord * dpr) + 0.5;
          const expectedCssY = expectedPhysicalY / dpr;
          assert.equal(drawnHorizontal.length, 2);
          assert.equal(drawnHorizontal[0].x, 0);
          assert.equal(drawnHorizontal[1].x, 100);
          assert.ok(
            Math.abs(drawnHorizontal[0].y - expectedCssY) < 1e-9,
            `Expected snapped Y=${expectedCssY} at DPR=${dpr} for Y=${coord}, got ${drawnHorizontal[0].y}`
          );

          let drawnVertical: any[] = [];
          const mockCtxV = createMockContext({
            moveTo: (x: number, y: number) => drawnVertical.push({ x, y }),
            lineTo: (x: number, y: number) => drawnVertical.push({ x, y }),
          });

          // Vertical line
          drawPhysicalLine(
            mockCtxV,
            { coordinates: [{ x: coord, y: 0 }, { x: coord, y: 200 }] },
            { size: 1, style: 'solid' },
            dpr
          );

          const expectedPhysicalX = Math.floor(coord * dpr) + 0.5;
          const expectedCssX = expectedPhysicalX / dpr;
          assert.equal(drawnVertical.length, 2);
          assert.equal(drawnVertical[0].y, 0);
          assert.equal(drawnVertical[1].y, 200);
          assert.ok(
            Math.abs(drawnVertical[0].x - expectedCssX) < 1e-9,
            `Expected snapped X=${expectedCssX} at DPR=${dpr} for X=${coord}, got ${drawnVertical[0].x}`
          );
        }
      }
    });

    it('snaps even physical-width lines to integer physical boundaries', () => {
      const dpr = 1.75;
      let drawnCoords: any[] = [];
      const mockCtx = createMockContext({
        moveTo: (x: number, y: number) => drawnCoords.push({ x, y }),
        lineTo: (x: number, y: number) => drawnCoords.push({ x, y }),
      });

      // 2px logical = 2 physical px at DPR=1.75 (rounded) -> integer physical boundary
      const testCoord = 10.3; // 10.3 * 1.75 = 18.025 -> round(18.025) = 18 -> 18 / 1.75
      drawPhysicalLine(
        mockCtx,
        { coordinates: [{ x: testCoord, y: 0 }, { x: testCoord, y: 100 }] },
        { size: 2, style: 'solid' },
        dpr
      );

      const expectedCssX = Math.round(testCoord * dpr) / dpr;
      assert.equal(drawnCoords.length, 2);
      assert.ok(Math.abs(drawnCoords[0].x - expectedCssX) < 1e-9);
      assert.equal(drawnCoords[0].y, 0);
      assert.ok(Math.abs(drawnCoords[1].x - expectedCssX) < 1e-9);
      assert.equal(drawnCoords[1].y, 100);
    });

    it('preserves exact diagonal and polyline coordinates without shifting', () => {
      const dpr = 1.75;
      let drawnCoords: any[] = [];
      const mockCtx = createMockContext({
        moveTo: (x: number, y: number) => drawnCoords.push({ x, y }),
        lineTo: (x: number, y: number) => drawnCoords.push({ x, y }),
      });

      // Diagonal line: (10, 20) -> (100, 200)
      drawPhysicalLine(
        mockCtx,
        { coordinates: [{ x: 10, y: 20 }, { x: 100, y: 200 }] },
        { size: 1, style: 'solid' },
        dpr
      );

      assert.equal(drawnCoords.length, 2);
      assert.equal(drawnCoords[0].x, 10);
      assert.equal(drawnCoords[0].y, 20);
      assert.equal(drawnCoords[1].x, 100);
      assert.equal(drawnCoords[1].y, 200);
    });

    it('preserves dashed and dotted line styles with proper physical grid snapping', () => {
      let lineDashSet: number[] = [];
      let drawnCoords: any[] = [];

      const mockCtx = createMockContext({
        moveTo: (x: number, y: number) => drawnCoords.push({ x, y }),
        lineTo: (x: number, y: number) => drawnCoords.push({ x, y }),
        setLineDash: (d: number[]) => {
          lineDashSet = d;
        },
      });

      // Dashed horizontal line (like crosshair or price line)
      drawPhysicalLine(
        mockCtx,
        { coordinates: [{ x: 0, y: 50.3 }, { x: 1000, y: 50.3 }] },
        { size: 1, style: 'dashed', dashedValue: [4, 4] },
        1.75
      );

      const expectedSnappedY = (Math.floor(50.3 * 1.75) + 0.5) / 1.75;
      assert.deepEqual(lineDashSet, [4, 4]);
      assert.equal(drawnCoords.length, 2);
      assert.ok(Math.abs(drawnCoords[0].y - expectedSnappedY) < 1e-9);
      assert.ok(Math.abs(drawnCoords[1].y - expectedSnappedY) < 1e-9);

      // Dotted horizontal line (e.g. price line set to dotted)
      lineDashSet = [];
      drawPhysicalLine(
        mockCtx,
        { coordinates: [{ x: 0, y: 100 }, { x: 1000, y: 100 }] },
        { size: 1, style: 'dotted' },
        1.0
      );
      assert.deepEqual(lineDashSet, [2, 2], 'style: dotted should default to [2, 2] dash');

      // Dotted line with custom dashedValue
      lineDashSet = [];
      drawPhysicalLine(
        mockCtx,
        { coordinates: [{ x: 0, y: 100 }, { x: 1000, y: 100 }] },
        { size: 1, style: 'dotted', dashedValue: [1, 3] },
        1.0
      );
      assert.deepEqual(lineDashSet, [1, 3], 'style: dotted should respect explicit dashedValue');

      // Solid line resets line dash to []
      lineDashSet = [2, 2];
      drawPhysicalLine(
        mockCtx,
        { coordinates: [{ x: 0, y: 100 }, { x: 1000, y: 100 }] },
        { size: 1, style: 'solid' },
        1.0
      );
      assert.deepEqual(lineDashSet, [], 'style: solid should clear line dash');
    });
  });

    it('uses ctx.rect for borderRadius === 0 (or omitted) and ctx.roundRect when borderRadius > 0', () => {
      const dpr = 1.75;
      let rectCalled = false;
      let roundRectCalled = false;

      // 1. borderRadius = 0 / omitted -> ctx.rect
      const mockCtx1 = createMockContext({
        rect: () => {
          rectCalled = true;
        },
        roundRect: () => {
          roundRectCalled = true;
        },
      });

      drawPhysicalRect(
        mockCtx1,
        { x: 10, y: 20, width: 100, height: 50 },
        { style: 'fill', color: '#ffffff', borderRadius: 0 },
        dpr
      );

      assert.equal(rectCalled, true, 'Expected ctx.rect to be called for borderRadius: 0');
      assert.equal(roundRectCalled, false, 'Expected ctx.roundRect NOT to be called for borderRadius: 0');

      // 2. borderRadius > 0 -> ctx.roundRect
      rectCalled = false;
      roundRectCalled = false;
      const mockCtx2 = createMockContext({
        rect: () => {
          rectCalled = true;
        },
        roundRect: () => {
          roundRectCalled = true;
        },
      });

      drawPhysicalRect(
        mockCtx2,
        { x: 10, y: 20, width: 100, height: 50 },
        { style: 'fill', color: '#ffffff', borderRadius: 4 },
        dpr
      );

      assert.equal(roundRectCalled, true, 'Expected ctx.roundRect to be called for borderRadius: 4');
      assert.equal(rectCalled, false, 'Expected ctx.rect NOT to be called for borderRadius: 4');
    });

  describe('drawPhysicalCircle', () => {
    it('renders circle stroke with physical stroke width', () => {
      const dpr = 2;
      let lineWidthSet = 0;
      let arcCalled = false;

      const mockCtx = createMockContext({
        arc: () => {
          arcCalled = true;
        },
        set lineWidth(val: number) {
          lineWidthSet = val;
        },
      });

      drawPhysicalCircle(
        mockCtx,
        { x: 50, y: 50, r: 10 },
        { style: 'stroke_fill', color: '#ffffff', borderColor: '#ff0000', borderSize: 2 },
        dpr
      );

      assert.equal(arcCalled, true);
      assert.equal(lineWidthSet, 2 / 2); // 1 CSS px for 2 physical px at DPR 2
    });
  });

  describe('drawPhysicalPolygon', () => {
    it('strokes polygon with physical border width', () => {
      const dpr = 1.5;
      let lineWidthSet = 0;

      const mockCtx = createMockContext({
        set lineWidth(val: number) {
          lineWidthSet = val;
        },
      });

      drawPhysicalPolygon(
        mockCtx,
        { coordinates: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }] },
        { style: 'stroke', borderColor: '#00ff00', borderSize: 3 },
        dpr
      );

      assert.equal(lineWidthSet, 3 / 1.5);
    });
  });

  describe('drawPhysicalArc', () => {
    it('strokes arc with physical line width', () => {
      const dpr = 1.75;
      let lineWidthSet = 0;

      const mockCtx = createMockContext({
        set lineWidth(val: number) {
          lineWidthSet = val;
        },
      });

      drawPhysicalArc(
        mockCtx,
        { x: 50, y: 50, r: 20, startAngle: 0, endAngle: Math.PI },
        { size: 1, color: '#000' },
        dpr
      );

      assert.ok(Math.abs(lineWidthSet - 1 / 1.75) < 1e-9);
    });
  });

  describe('drawPhysicalPath', () => {
    it('strokes SVG path with physical line width and correct coordinates', () => {
      const dpr = 2;
      let lineWidthSet = 0;
      let lineToPoints: any[] = [];

      const mockCtx = createMockContext({
        lineTo: (x: number, y: number) => {
          lineToPoints.push({ x, y });
        },
        set lineWidth(val: number) {
          lineWidthSet = val;
        },
      });

      drawPhysicalPath(
        mockCtx,
        { x: 10, y: 10, path: 'M 0 0 L 20 20 Z' },
        { lineWidth: 2, color: '#2196f3' },
        dpr
      );

      assert.equal(lineWidthSet, 1); // 2 / 2
      assert.deepEqual(lineToPoints, [{ x: 30, y: 30 }]);
    });
  });

  describe('registerPhysicalFigures', () => {
    it('registers all 6 figure types with mock KLineCharts API', () => {
      const registered: string[] = [];
      const mockApi = {
        registerFigure: (fig: any) => {
          registered.push(fig.name);
        },
        utils: {},
      };

      registerPhysicalFigures(mockApi);
      assert.deepEqual(registered, ['line', 'rect', 'circle', 'polygon', 'arc', 'path']);
    });
  });
});
