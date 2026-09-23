import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDevicePixelRatio,
  physicalPixelSize,
  toPhysicalPixels,
  fromPhysicalPixels,
  toPhysicalStrokeWidth,
  snapToPhysicalPixel,
  snapStrokeCenter,
} from '../pixelRatio.ts';

describe('Physical-Pixel Rendering Foundation (pixelRatio.ts)', () => {
  describe('getDevicePixelRatio', () => {
    it('returns custom window DPR when provided', () => {
      assert.equal(getDevicePixelRatio({ devicePixelRatio: 1 }), 1);
      assert.equal(getDevicePixelRatio({ devicePixelRatio: 1.25 }), 1.25);
      assert.equal(getDevicePixelRatio({ devicePixelRatio: 1.5 }), 1.5);
      assert.equal(getDevicePixelRatio({ devicePixelRatio: 1.75 }), 1.75);
      assert.equal(getDevicePixelRatio({ devicePixelRatio: 2 }), 2);
      assert.equal(getDevicePixelRatio({ devicePixelRatio: 3 }), 3);
    });

    it('falls back to 1 when DPR is missing, 0, or negative', () => {
      assert.equal(getDevicePixelRatio({ devicePixelRatio: 0 }), 1);
      assert.equal(getDevicePixelRatio({ devicePixelRatio: -1.5 }), 1);
      assert.equal(getDevicePixelRatio({}), 1);
      assert.equal(getDevicePixelRatio(undefined), 1);
    });
  });

  describe('physicalPixelSize', () => {
    it('computes exact physical pixel size across arbitrary DPR values', () => {
      assert.equal(physicalPixelSize(1), 1);
      assert.equal(physicalPixelSize(1.25), 0.8);
      assert.equal(physicalPixelSize(1.5), 1 / 1.5);
      assert.equal(physicalPixelSize(1.75), 1 / 1.75);
      assert.equal(physicalPixelSize(2), 0.5);
      assert.equal(physicalPixelSize(2.5), 0.4);
    });
  });

  describe('toPhysicalPixels', () => {
    it('converts logical CSS pixels to physical device pixels', () => {
      // DPR = 1
      assert.equal(toPhysicalPixels(1, 1), 1);
      assert.equal(toPhysicalPixels(10, 1), 10);
      assert.equal(toPhysicalPixels(0, 1), 0);
      assert.equal(toPhysicalPixels(-5, 1), -5);

      // DPR = 1.25
      assert.equal(toPhysicalPixels(1, 1.25), 1.25);
      assert.equal(toPhysicalPixels(10, 1.25), 12.5);

      // DPR = 1.5
      assert.equal(toPhysicalPixels(1, 1.5), 1.5);
      assert.equal(toPhysicalPixels(10, 1.5), 15);

      // DPR = 1.75
      assert.equal(toPhysicalPixels(1, 1.75), 1.75);
      assert.equal(toPhysicalPixels(10, 1.75), 17.5);
      assert.equal(toPhysicalPixels(-10, 1.75), -17.5);

      // DPR = 2
      assert.equal(toPhysicalPixels(1, 2), 2);
      assert.equal(toPhysicalPixels(10, 2), 20);
    });
  });

  describe('fromPhysicalPixels', () => {
    it('converts physical device pixels to logical CSS pixels', () => {
      // DPR = 1
      assert.equal(fromPhysicalPixels(1, 1), 1);
      assert.equal(fromPhysicalPixels(10, 1), 10);

      // DPR = 1.25
      assert.equal(fromPhysicalPixels(1.25, 1.25), 1);
      assert.equal(fromPhysicalPixels(10, 1.25), 8);

      // DPR = 1.5
      assert.equal(fromPhysicalPixels(1.5, 1.5), 1);
      assert.equal(fromPhysicalPixels(15, 1.5), 10);

      // DPR = 1.75
      assert.equal(fromPhysicalPixels(1.75, 1.75), 1);
      assert.equal(fromPhysicalPixels(17.5, 1.75), 10);
      assert.equal(fromPhysicalPixels(-17.5, 1.75), -10);

      // DPR = 2
      assert.equal(fromPhysicalPixels(2, 2), 1);
      assert.equal(fromPhysicalPixels(20, 2), 10);
    });

    it('preserves round-trip precision between logical and physical pixels', () => {
      const dprs = [1, 1.25, 1.33, 1.5, 1.75, 2, 2.5, 3];
      const logicalValues = [0, 0.5, 1, 2.5, 10, 100.25, -50];

      for (const dpr of dprs) {
        for (const val of logicalValues) {
          const physical = toPhysicalPixels(val, dpr);
          const backToLogical = fromPhysicalPixels(physical, dpr);
          assert.ok(
            Math.abs(backToLogical - val) < 1e-12,
            `Roundtrip failed for val=${val} at dpr=${dpr}`
          );
        }
      }
    });
  });

  describe('toPhysicalStrokeWidth', () => {
    it('converts integer logical stroke width settings to exact physical CSS width', () => {
      // DPR = 1
      assert.equal(toPhysicalStrokeWidth(1, 1), 1);
      assert.equal(toPhysicalStrokeWidth(2, 1), 2);
      assert.equal(toPhysicalStrokeWidth(3, 1), 3);

      // DPR = 1.75
      assert.equal(toPhysicalStrokeWidth(1, 1.75), 1 / 1.75);
      assert.equal(toPhysicalStrokeWidth(2, 1.75), 2 / 1.75);
      assert.equal(toPhysicalStrokeWidth(3, 1.75), 3 / 1.75);

      // DPR = 2
      assert.equal(toPhysicalStrokeWidth(1, 2), 0.5);
      assert.equal(toPhysicalStrokeWidth(2, 2), 1);
      assert.equal(toPhysicalStrokeWidth(3, 2), 1.5);
    });
  });

  describe('snapToPhysicalPixel', () => {
    it('snaps coordinates accurately with round mode', () => {
      // DPR = 1
      assert.equal(snapToPhysicalPixel(10.2, 1, 'round'), 10);
      assert.equal(snapToPhysicalPixel(10.6, 1, 'round'), 11);

      // DPR = 2
      // 10.2 * 2 = 20.4 -> 20 -> 10.0
      assert.equal(snapToPhysicalPixel(10.2, 2, 'round'), 10);
      // 10.3 * 2 = 20.6 -> 21 -> 10.5
      assert.equal(snapToPhysicalPixel(10.3, 2, 'round'), 10.5);

      // DPR = 1.75
      // 10.2 * 1.75 = 17.85 -> 18 -> 18 / 1.75
      assert.equal(snapToPhysicalPixel(10.2, 1.75, 'round'), 18 / 1.75);
    });

    it('supports floor and ceil rounding modes', () => {
      // DPR = 1.25
      // 10.0 * 1.25 = 12.5
      assert.equal(snapToPhysicalPixel(10.0, 1.25, 'floor'), 12 / 1.25); // 9.6
      assert.equal(snapToPhysicalPixel(10.0, 1.25, 'ceil'), 13 / 1.25); // 10.4
      assert.equal(snapToPhysicalPixel(10.0, 1.25, 'round'), 13 / 1.25); // 10.4
    });

    it('handles zero and negative coordinates safely', () => {
      assert.equal(snapToPhysicalPixel(0, 1.75), 0);
      // -10.2 * 2 = -20.4 -> -20 -> -10
      assert.equal(snapToPhysicalPixel(-10.2, 2, 'round'), -10);
    });
  });

  describe('snapStrokeCenter', () => {
    it('correctly aligns 1 physical px odd stroke to half-physical-pixel grid', () => {
      // DPR = 1 (classic canvas 0.5 offset)
      // 10 * 1 = 10 -> floor(10) + 0.5 = 10.5
      assert.equal(snapStrokeCenter(10, 1, 1), 10.5);
      assert.equal(snapStrokeCenter(10.4, 1, 1), 10.5);
      assert.equal(snapStrokeCenter(10.8, 1, 1), 10.5);

      // DPR = 1.5
      // 10 * 1.5 = 15 -> floor(15) + 0.5 = 15.5 -> 15.5 / 1.5
      assert.equal(snapStrokeCenter(10, 1, 1.5), 15.5 / 1.5);

      // DPR = 1.75
      // 100 * 1.75 = 175 -> floor(175) + 0.5 = 175.5 -> 175.5 / 1.75
      assert.equal(snapStrokeCenter(100, 1, 1.75), 175.5 / 1.75);

      // DPR = 2
      // 10 * 2 = 20 -> floor(20) + 0.5 = 20.5 -> 20.5 / 2 = 10.25
      assert.equal(snapStrokeCenter(10, 1, 2), 10.25);
    });

    it('correctly aligns 2 physical px even stroke to exact physical-pixel grid', () => {
      // DPR = 1 (even stroke centers on integer pixel boundary)
      assert.equal(snapStrokeCenter(10, 2, 1), 10);
      assert.equal(snapStrokeCenter(10.2, 2, 1), 10);
      assert.equal(snapStrokeCenter(10.7, 2, 1), 11);

      // DPR = 1.75
      // 100 * 1.75 = 175 -> round(175) = 175 -> 175 / 1.75 = 100
      assert.equal(snapStrokeCenter(100, 2, 1.75), 100);

      // DPR = 2
      // 10.2 * 2 = 20.4 -> round(20.4) = 20 -> 20 / 2 = 10
      assert.equal(snapStrokeCenter(10.2, 2, 2), 10);
    });

    it('handles 3 physical px odd strokes consistently with 1 physical px', () => {
      // 3 px is odd -> half-physical pixel center
      assert.equal(snapStrokeCenter(10, 3, 1), 10.5);
      assert.equal(snapStrokeCenter(100, 3, 1.75), 175.5 / 1.75);
    });
  });

  describe('Interaction Previews Physical Stroke Scaling', () => {
    it('scales brush preview strokes across arbitrary DPR values', () => {
      const brushWidths = [1, 2, 3, 32];
      const dprs = [1, 1.25, 1.5, 1.75, 2];

      for (const w of brushWidths) {
        for (const dpr of dprs) {
          const physicalStroke = toPhysicalStrokeWidth(w, dpr);
          // In canvas coordinate space scaled by DPR, physicalStroke * DPR must equal the exact logical pixel count
          assert.equal(physicalStroke, w / dpr);
          assert.ok(Math.abs(physicalStroke * dpr - w) < 1e-12);
        }
      }
    });

    it('scales measurement and zoom marquee preview strokes to exact 1 physical device pixel', () => {
      const dprs = [1, 1.25, 1.5, 1.75, 2];
      for (const dpr of dprs) {
        const previewLineWidth = toPhysicalStrokeWidth(1, dpr);
        assert.equal(previewLineWidth, 1 / dpr);
        assert.ok(Math.abs(previewLineWidth * dpr - 1) < 1e-12);
      }
    });

    it('scales dynamic eraser trail widths proportionally to physical device pixels', () => {
      const dprs = [1, 1.25, 1.5, 1.75, 2];
      const sampleTrailWidths = [8, 10, 13, 18];
      for (const w of sampleTrailWidths) {
        for (const dpr of dprs) {
          const strokeWidth = toPhysicalStrokeWidth(w, dpr);
          assert.equal(strokeWidth, w / dpr);
          assert.ok(Math.abs(strokeWidth * dpr - w) < 1e-12);
        }
      }
    });
  });
});
