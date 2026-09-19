import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHARED_TEXT_FONT_FAMILY,
  DEFAULT_TEXT_FONT_SIZE,
  DEFAULT_TEXT_PLACEHOLDER,
  buildSharedFontString,
  getSharedTextLineHeight,
  getSingleCharWidth,
  measureSharedText,
  measureSingleLineText,
  getWrappedTextLines,
  calculateAlignedTextPosition,
  computeCompositeTextLayout,
} from '../../tools/sharedTextLayout.ts';

describe('Shared Text Foundation — Primitives & Layout Invariant Tests', () => {
  describe('1. Font Construction & Typography Constants', () => {
    it('constructs default font string accurately', () => {
      const font = buildSharedFontString();
      assert.equal(font, `14px ${SHARED_TEXT_FONT_FAMILY}`);
    });

    it('handles bold and italic styling combinations', () => {
      const fontBold = buildSharedFontString(16, true, false);
      assert.equal(fontBold, `bold 16px ${SHARED_TEXT_FONT_FAMILY}`);

      const fontItalic = buildSharedFontString(12, false, true);
      assert.equal(fontItalic, `italic 12px ${SHARED_TEXT_FONT_FAMILY}`);

      const fontBoth = buildSharedFontString(18, true, true);
      assert.equal(fontBoth, `italic bold 18px ${SHARED_TEXT_FONT_FAMILY}`);
    });

    it('supports custom font family override', () => {
      const customFont = buildSharedFontString(14, false, false, 'Arial, sans-serif');
      assert.equal(customFont, '14px Arial, sans-serif');
    });

    it('calculates consistent line height across sizes', () => {
      const lh12 = getSharedTextLineHeight(12);
      const lh14 = getSharedTextLineHeight(14);
      const lh20 = getSharedTextLineHeight(20);

      assert.ok(lh12 >= 16);
      assert.ok(lh14 > lh12);
      assert.ok(lh20 > lh14);
      // Line heights should be even integers for crisp subpixel alignment
      assert.equal(lh14 % 2, 0);
    });

    it('calculates single character width constraint', () => {
      const charNormal = getSingleCharWidth(14, false);
      const charBold = getSingleCharWidth(14, true);
      assert.ok(charNormal > 0);
      assert.ok(charBold > charNormal);
    });
  });

  describe('2. Text Measurement Primitives', () => {
    it('measures single-line text dimensions', () => {
      const single = measureSingleLineText('Hello World', 14);
      assert.ok(single.width > 0);
      assert.equal(single.height, getSharedTextLineHeight(14));
      assert.equal(single.lineHeight, getSharedTextLineHeight(14));
    });

    it('falls back to default placeholder when measuring empty string', () => {
      const empty = measureSharedText('', 14);
      assert.equal(empty.lines[0], DEFAULT_TEXT_PLACEHOLDER);
      assert.ok(empty.width > 0);
    });

    it('measures multiline text dimensions and per-line widths', () => {
      const text = 'Line 1\nLonger Line 2\nShort';
      const metrics = measureSharedText(text, 14);

      assert.equal(metrics.lines.length, 3);
      assert.equal(metrics.lineWidths.length, 3);
      assert.ok(metrics.lineWidths[1] > metrics.lineWidths[0]);
      assert.equal(metrics.height, 3 * getSharedTextLineHeight(14));
      assert.equal(metrics.width, Math.max(...metrics.lineWidths));
    });
  });

  describe('3. Text Line Wrapping Primitive', () => {
    it('wraps long text across multiple lines based on maximum pixel width', () => {
      const text = 'This is a long test string that will exceed a narrow bounding box';
      const lines = getWrappedTextLines(text, 100, 14);
      assert.ok(lines.length > 1);
    });

    it('preserves explicit newlines when wrapping', () => {
      const text = 'First Paragraph\nSecond Paragraph';
      const lines = getWrappedTextLines(text, 500, 14);
      assert.equal(lines.length, 2);
      assert.equal(lines[0], 'First Paragraph');
      assert.equal(lines[1], 'Second Paragraph');
    });

    it('handles empty input gracefully', () => {
      const lines = getWrappedTextLines('', 200, 14);
      assert.deepEqual(lines, ['']);
    });
  });

  describe('4. Alignment & Positioning Primitives', () => {
    it('calculates center-middle alignment by default', () => {
      const pos = calculateAlignedTextPosition({
        x: 100,
        y: 200,
        width: 100,
        height: 50,
      });

      assert.equal(pos.x, 150);
      assert.equal(pos.y, 225);
      assert.equal(pos.translateX, '-50%');
      assert.equal(pos.translateY, '-50%');
    });

    it('calculates left-top alignment', () => {
      const pos = calculateAlignedTextPosition({
        x: 100,
        y: 200,
        width: 100,
        height: 50,
        halign: 'left',
        valign: 'top',
      });

      assert.equal(pos.x, 100);
      assert.equal(pos.y, 200);
      assert.equal(pos.translateX, '0%');
      assert.equal(pos.translateY, '0%');
    });

    it('calculates right-bottom alignment', () => {
      const pos = calculateAlignedTextPosition({
        x: 100,
        y: 200,
        width: 100,
        height: 50,
        halign: 'right',
        valign: 'bottom',
      });

      assert.equal(pos.x, 200);
      assert.equal(pos.y, 250);
      assert.equal(pos.translateX, '-100%');
      assert.equal(pos.translateY, '-100%');
    });
  });

  describe('5. Composed Composite Layout (Text Tool)', () => {
    it('derives initial width dynamically from placeholder when boxWidth is omitted', () => {
      const layout = computeCompositeTextLayout({
        origin: { x: 50, y: 50 },
        text: '',
        fontSize: 14,
      });

      assert.ok(layout.box.width < 150);
      assert.ok(layout.box.width > 50);
      assert.equal(layout.resizeHandle.x, 50 + layout.box.width);
      assert.equal(layout.resizeHandle.y, 50 + layout.box.height / 2);
    });

    it('respects explicit boxWidth when provided', () => {
      const layout = computeCompositeTextLayout({
        origin: { x: 0, y: 0 },
        text: 'Custom Width',
        boxWidth: 280,
      });

      assert.equal(layout.box.width, 280);
    });
  });
});
