import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  clipHorizontalSpan,
  computeSessionPixelBounds,
} from '../sessionGeometry.ts';

describe('Session Background Renderer Geometry (Step 4)', () => {
  const VIEWPORT_WIDTH = 1000;

  it('1. Fully visible session inside viewport', () => {
    // Span from x=200 to x=500 within width=1000
    const res = clipHorizontalSpan(200, 500, VIEWPORT_WIDTH);
    assert.deepStrictEqual(res, {
      leftX: 200,
      width: 300,
    });
  });

  it('2. Fully visible session with inverted coordinates (end < start)', () => {
    const res = clipHorizontalSpan(500, 200, VIEWPORT_WIDTH);
    assert.deepStrictEqual(res, {
      leftX: 200,
      width: 300,
    });
  });

  it('3. Left-clipped session (starts before viewport, ends inside)', () => {
    // Starts at -150, ends at 350
    const res = clipHorizontalSpan(-150, 350, VIEWPORT_WIDTH);
    assert.deepStrictEqual(res, {
      leftX: 0,
      width: 350,
    });
  });

  it('4. Right-clipped session (starts inside viewport, ends after)', () => {
    // Starts at 700, ends at 1200
    const res = clipHorizontalSpan(700, 1200, VIEWPORT_WIDTH);
    assert.deepStrictEqual(res, {
      leftX: 700,
      width: 300,
    });
  });

  it('5. Session spanning the entire viewport (starts before, ends after)', () => {
    // Starts at -200, ends at 1500
    const res = clipHorizontalSpan(-200, 1500, VIEWPORT_WIDTH);
    assert.deepStrictEqual(res, {
      leftX: 0,
      width: 1000,
    });
  });

  it('6. Completely offscreen session to the left', () => {
    // Ends at -10
    const res = clipHorizontalSpan(-500, -10, VIEWPORT_WIDTH);
    assert.strictEqual(res, null);

    // Exactly at x=0
    const resZero = clipHorizontalSpan(-500, 0, VIEWPORT_WIDTH);
    assert.strictEqual(resZero, null);
  });

  it('7. Completely offscreen session to the right', () => {
    // Starts at 1050
    const res = clipHorizontalSpan(1050, 1500, VIEWPORT_WIDTH);
    assert.strictEqual(res, null);

    // Exactly at x=boundingWidth
    const resEdge = clipHorizontalSpan(1000, 1500, VIEWPORT_WIDTH);
    assert.strictEqual(resEdge, null);
  });

  it('8. Zero width or negative width returns null', () => {
    const resSame = clipHorizontalSpan(250, 250, VIEWPORT_WIDTH);
    assert.strictEqual(resSame, null);
  });

  it('9. Invalid inputs (NaN, Infinity, zero/negative viewport width) return null', () => {
    assert.strictEqual(clipHorizontalSpan(NaN, 500, VIEWPORT_WIDTH), null);
    assert.strictEqual(clipHorizontalSpan(200, Infinity, VIEWPORT_WIDTH), null);
    assert.strictEqual(clipHorizontalSpan(200, 500, 0), null);
    assert.strictEqual(clipHorizontalSpan(200, 500, -100), null);
  });

  it('10. computeSessionPixelBounds coordinates with converter function', () => {
    // Simulated chart with linear scale 1000ms = 1px, offset 0
    const mockConverter = (ts: number) => ts / 1000;

    const startTs = 100_000;
    const endTs = 400_000;

    const bounds = computeSessionPixelBounds(startTs, endTs, mockConverter, VIEWPORT_WIDTH);
    assert.deepStrictEqual(bounds, {
      leftX: 100,
      width: 300,
    });
  });

  it('11. computeSessionPixelBounds handles unmapped/invalid converter responses', () => {
    const nullConverter = () => null;
    assert.strictEqual(computeSessionPixelBounds(1000, 2000, nullConverter, VIEWPORT_WIDTH), null);

    const undefinedConverter = () => undefined;
    assert.strictEqual(computeSessionPixelBounds(1000, 2000, undefinedConverter, VIEWPORT_WIDTH), null);

    const nanConverter = () => NaN;
    assert.strictEqual(computeSessionPixelBounds(1000, 2000, nanConverter, VIEWPORT_WIDTH), null);
  });

  it('12. computeSessionPixelBounds returns null if end <= start', () => {
    const dummyConverter = (ts: number) => ts;
    assert.strictEqual(computeSessionPixelBounds(5000, 4000, dummyConverter, VIEWPORT_WIDTH), null);
    assert.strictEqual(computeSessionPixelBounds(5000, 5000, dummyConverter, VIEWPORT_WIDTH), null);
  });
});
