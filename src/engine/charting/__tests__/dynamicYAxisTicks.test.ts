import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateNiceInterval, createDynamicYAxisTicks } from '../dynamicYAxisTicks.ts';

describe('dynamicYAxisTicks Unit Tests', () => {
  describe('calculateNiceInterval', () => {
    it('rounds to 1, 2, 5 subdivision sequence', () => {
      assert.equal(calculateNiceInterval(0.00012), 0.0001);
      assert.equal(calculateNiceInterval(0.00024), 0.0002);
      assert.equal(calculateNiceInterval(0.00048), 0.0005);
      assert.equal(calculateNiceInterval(0.00095), 0.001);
      assert.equal(calculateNiceInterval(0.0022), 0.002);
      assert.equal(calculateNiceInterval(0.0068), 0.005);
      assert.equal(calculateNiceInterval(0.012), 0.01);
    });

    it('handles small raw interval values safely', () => {
      assert.equal(calculateNiceInterval(0.000008), 0.00001);
      assert.equal(calculateNiceInterval(0.000023), 0.00002);
      assert.equal(calculateNiceInterval(0.000045), 0.00005);
    });
  });

  describe('createDynamicYAxisTicks', () => {
    const mockBounding = { width: 60, height: 600 };

    it('generates proportional ticks for normal view', () => {
      const range = {
        from: 1.12000,
        to: 1.12050,
        range: 0.00050,
        realFrom: 1.12000,
        realTo: 1.12050,
        realRange: 0.00050,
        displayFrom: 1.12000,
        displayTo: 1.12050,
        displayRange: 0.00050,
      };

      const ticks = createDynamicYAxisTicks({
        range,
        bounding: mockBounding,
        fallbackPrecision: 5,
      });

      assert.ok(ticks.length >= 7 && ticks.length <= 15, `Expected 7-15 ticks, got ${ticks.length}`);
      // All ticks must have 5 decimals
      for (const t of ticks) {
        assert.match(t.text, /^\d+\.\d{5}$/);
        assert.ok(t.coord >= 12 && t.coord <= 600 - 12);
      }
    });

    it('spawns new intermediate values when stretched vertically to fill space', () => {
      // 5x stretched range: 0.00010 span across 600px
      const stretchedRange = {
        from: 1.12010,
        to: 1.12020,
        range: 0.00010,
        realFrom: 1.12010,
        realTo: 1.12020,
        realRange: 0.00010,
        displayFrom: 1.12010,
        displayTo: 1.12020,
        displayRange: 0.00010,
      };

      const ticks = createDynamicYAxisTicks({
        range: stretchedRange,
        bounding: mockBounding,
        fallbackPrecision: 5,
      });

      // At 0.00010 span with 5 decimals, step is 0.00001 -> 9 ticks from 1.12011 to 1.12019
      assert.equal(ticks.length, 9);
      assert.equal(ticks[0].text, '1.12011');
      assert.equal(ticks[ticks.length - 1].text, '1.12019');
    });

    it('never subdivides beyond the symbol price precision', () => {
      // Extremely stretched: 0.00002 span across 600px with precision 5
      const ultraStretched = {
        from: 1.12010,
        to: 1.12012,
        range: 0.00002,
        realFrom: 1.12010,
        realTo: 1.12012,
        realRange: 0.00002,
        displayFrom: 1.12010,
        displayTo: 1.12012,
        displayRange: 0.00002,
      };

      const ticks = createDynamicYAxisTicks({
        range: ultraStretched,
        bounding: mockBounding,
        fallbackPrecision: 5,
      });

      // Step clamped to 0.00001, so only 1.12011 is inside
      assert.equal(ticks.length, 1);
      assert.equal(ticks[0].text, '1.12011');
    });
  });
});
