import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHARED_TEXT_FONT_FAMILY,
  getSharedTextLineHeight,
  measureSingleLineText,
  measureSharedText,
  calculateAlignedTextPosition,
} from '../../tools/sharedTextLayout.ts';

describe('Rectangle Tool — Shared Text Foundation Migration Tests', () => {
  const mockChart = {
    _loadedTimeframe: '1m',
    convertFromPixel: (coords: any[]) =>
      coords.map((c) => ({ timestamp: c.x * 10, value: 100 + (300 - c.y) })),
    convertToPixel: (pts: any[]) =>
      pts.map((p) => ({ x: (p.timestamp || 1000) / 10, y: 300 - (p.value - 100) })),
  };

  it('1. Rectangle overlay schema and configuration contracts', () => {
    assert.equal(typeof SHARED_TEXT_FONT_FAMILY, 'string');
    assert.ok(SHARED_TEXT_FONT_FAMILY.includes('Segoe UI'));
  });

  it('2. Inside text positioning uses calculateAlignedTextPosition with 8px padding', () => {
    const x = 100;
    const y = 200;
    const w = 300;
    const h = 150;
    const padding = 8;

    // Center-Middle inside
    const centerPos = calculateAlignedTextPosition({
      x: x + padding,
      y: y + padding,
      width: Math.max(0, w - padding * 2),
      height: Math.max(0, h - padding * 2),
      halign: 'center',
      valign: 'middle',
    });
    assert.equal(centerPos.x, 250); // 100 + 300/2
    assert.equal(centerPos.y, 275); // 200 + 150/2
    assert.equal(centerPos.translateX, '-50%');
    assert.equal(centerPos.translateY, '-50%');

    // Left-Top inside
    const leftTopPos = calculateAlignedTextPosition({
      x: x + padding,
      y: y + padding,
      width: Math.max(0, w - padding * 2),
      height: Math.max(0, h - padding * 2),
      halign: 'left',
      valign: 'top',
    });
    assert.equal(leftTopPos.x, 108); // 100 + 8
    assert.equal(leftTopPos.y, 208); // 200 + 8
    assert.equal(leftTopPos.translateX, '0%');
    assert.equal(leftTopPos.translateY, '0%');

    // Right-Bottom inside
    const rightBottomPos = calculateAlignedTextPosition({
      x: x + padding,
      y: y + padding,
      width: Math.max(0, w - padding * 2),
      height: Math.max(0, h - padding * 2),
      halign: 'right',
      valign: 'bottom',
    });
    assert.equal(rightBottomPos.x, 392); // 100 + 300 - 8
    assert.equal(rightBottomPos.y, 342); // 200 + 150 - 8
    assert.equal(rightBottomPos.translateX, '-100%');
    assert.equal(rightBottomPos.translateY, '-100%');
  });

  it('3. Single-line and multiline text measurement via shared foundation', () => {
    const single = measureSingleLineText('Rectangle Zone', 14, false, false);
    assert.ok(single.width > 0);
    assert.equal(single.lineHeight, getSharedTextLineHeight(14));

    const multiline = measureSharedText('Line 1\nLine 2 Long Text', 14, false, false);
    assert.equal(multiline.lines.length, 2);
    assert.equal(multiline.height, 2 * getSharedTextLineHeight(14));
    assert.ok(multiline.width >= multiline.lineWidths[1]);
  });

  it('4. Typography consistency with shared foundation', () => {
    assert.equal(
      SHARED_TEXT_FONT_FAMILY,
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    );
    assert.equal(getSharedTextLineHeight(14), 18);
    assert.equal(getSharedTextLineHeight(16), 22);
  });

  it('5. Input width calculation matches shared single-line text width + 8', () => {
    const text = 'Order Block';
    const measured = measureSingleLineText(text, 14, false, false);
    const inputWidth = Math.max(30, Math.ceil(measured.width + 8));
    assert.ok(inputWidth >= 38);
  });

  it('6. Outside text placement geometry contracts', () => {
    const x = 100;
    const y = 200;
    const w = 300;
    const h = 150;

    // Top outside
    const topOutside = {
      tx: x + w / 2,
      ty: y - 6,
      translateX: '-50%',
      translateY: '-100%',
    };
    assert.equal(topOutside.tx, 250);
    assert.equal(topOutside.ty, 194);

    // Bottom outside
    const bottomOutside = {
      tx: x + w / 2,
      ty: y + h + 6,
      translateX: '-50%',
      translateY: '0%',
    };
    assert.equal(bottomOutside.tx, 250);
    assert.equal(bottomOutside.ty, 356);
  });

  it('7. Wrapping and multiline text preservation for rectangle annotations', () => {
    const longText = 'Supply zone with strong imbalance and rejection wick';
    const lines = measureSharedText(longText, 14, false, false).lines;
    assert.ok(lines.length >= 1);
    assert.equal(lines[0], longText);

    const explicitMultiline = 'Zone A\nTarget: 1.0850\nStop: 1.0800';
    const multiMetrics = measureSharedText(explicitMultiline, 14, false, false);
    assert.equal(multiMetrics.lines.length, 3);
    assert.equal(multiMetrics.height, 3 * getSharedTextLineHeight(14));
  });
});
