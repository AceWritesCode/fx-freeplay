import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TextTool,
  TEXT_FONT_FAMILY,
  PADDING_HORIZONTAL,
  TOP_PADDING,
  computeCompositeTextLayout,
  getWrappedTextLines,
  getSingleCharWidth,
} from '../../tools/implementations/TextTool.ts';
import {
  SHARED_TEXT_FONT_FAMILY,
  getSharedTextLineHeight,
} from '../../tools/sharedTextLayout.ts';
import { ToolRegistry } from '../../tools/ToolRegistry.ts';

describe('Text Tool — Shared Composite Layout Migration Tests', () => {
  const mockChart = {
    _loadedTimeframe: '1m',
    convertFromPixel: (coords: any[]) => coords.map((c) => ({ timestamp: c.x * 10, value: 100 + (300 - c.y) })),
    convertToPixel: (pts: any[]) => pts.map((p) => ({ x: (p.timestamp || 1000) / 10, y: 300 - (p.value - 100) })),
  };

  it('1. Existing Text creation still works (2-point overlay definition)', () => {
    const overlayDef = TextTool.createOverlayDef();
    assert.equal(overlayDef.name, 'fxText');
    assert.equal(overlayDef.totalStep, 2);
  });

  it('2. Text uses the shared composite layout function', () => {
    const layout = computeCompositeTextLayout({
      origin: { x: 100, y: 200 },
      text: 'Sample Text',
      fontSize: 14,
      boxWidth: 200,
    });

    assert.equal(layout.box.x, 100);
    assert.equal(layout.box.y, 200);
    assert.equal(layout.box.width, 200);
    assert.ok(layout.box.height >= 32);
    assert.equal(layout.resizeHandle.x, 300);
    assert.equal(layout.resizeHandle.y, 200 + layout.box.height / 2);
  });

  it('3. Normal and edit mode use identical layout geometry (zero shift)', () => {
    const origin = { x: 150, y: 250 };
    const text = 'Identical Layout Text';

    const layoutEdit = computeCompositeTextLayout({ origin, text, fontSize: 16, boxWidth: 220 });
    const layoutNormal = computeCompositeTextLayout({ origin, text, fontSize: 16, boxWidth: 220 });

    assert.deepEqual(layoutEdit.box, layoutNormal.box);
    assert.deepEqual(layoutEdit.resizeHandle, layoutNormal.resizeHandle);
    assert.equal(layoutEdit.text.lineHeight, layoutNormal.text.lineHeight);
  });

  it('4. No text positional jump on edit exit', () => {
    const origin = { x: 100, y: 100 };
    const layout = computeCompositeTextLayout({ origin, text: 'Hello', fontSize: 14, boxWidth: 180 });

    const domLeft = layout.box.x + PADDING_HORIZONTAL;
    const domTop = layout.box.y + TOP_PADDING;
    const domWidth = layout.box.width - PADDING_HORIZONTAL * 2;

    assert.equal(domLeft, 110);
    assert.equal(domTop, 108);
    assert.equal(domWidth, 160);
  });

  it('5. Multiline text works with explicit newlines', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    const layout = computeCompositeTextLayout({ origin: { x: 0, y: 0 }, text, fontSize: 14, boxWidth: 200 });

    assert.equal(layout.text.lines.length, 3);
    const expectedTextHeight = 3 * getSharedTextLineHeight(14);
    assert.equal(layout.text.totalHeight, expectedTextHeight);
  });

  it('6. Wrapping works without the legacy 1.05 heuristic', () => {
    const longText = 'This is a longer line of text that should wrap automatically to the next line.';
    const lines = getWrappedTextLines(longText, 100, 14, false, false);

    assert.ok(lines.length > 1, 'Long text must wrap into multiple lines');
  });

  it('7. Fixed box width is preserved and respected', () => {
    const customWidth = 350;
    const layout = computeCompositeTextLayout({
      origin: { x: 50, y: 50 },
      text: 'Short',
      boxWidth: customWidth,
    });

    assert.equal(layout.box.width, customWidth);
  });

  it('8. Height updates correctly when text wraps onto more lines', () => {
    const layoutShort = computeCompositeTextLayout({ origin: { x: 0, y: 0 }, text: 'Short', boxWidth: 120 });
    const layoutLong = computeCompositeTextLayout({
      origin: { x: 0, y: 0 },
      text: 'This is a much longer text that wraps across multiple lines and increases box height',
      boxWidth: 120,
    });

    assert.ok(layoutLong.box.height > layoutShort.box.height, 'Wrapped text height must exceed single-line height');
  });

  it('9. Resize handle follows dynamic height (y + boxHeight / 2)', () => {
    const layout = computeCompositeTextLayout({
      origin: { x: 100, y: 200 },
      text: 'Line 1\nLine 2\nLine 3\nLine 4',
      fontSize: 14,
      boxWidth: 200,
    });

    assert.equal(layout.resizeHandle.x, 100 + 200);
    assert.equal(layout.resizeHandle.y, 200 + layout.box.height / 2);
  });

  it('10. Text alignment works (left, center, right)', () => {
    const layoutLeft = computeCompositeTextLayout({ origin: { x: 0, y: 0 }, text: 'Text', textAlign: 'left' });
    const layoutCenter = computeCompositeTextLayout({ origin: { x: 0, y: 0 }, text: 'Text', textAlign: 'center' });
    const layoutRight = computeCompositeTextLayout({ origin: { x: 0, y: 0 }, text: 'Text', textAlign: 'right' });

    assert.equal(layoutLeft.text.align, 'left');
    assert.equal(layoutCenter.text.align, 'center');
    assert.equal(layoutRight.text.align, 'right');
  });

  it('11. Font settings work (font family and shared line height)', () => {
    assert.equal(TEXT_FONT_FAMILY, SHARED_TEXT_FONT_FAMILY);
    const lh14 = getSharedTextLineHeight(14);
    const lh20 = getSharedTextLineHeight(20);
    assert.ok(lh20 > lh14);
  });

  it('12. Background and border work in createPointFigures', () => {
    const overlayDef = TextTool.createOverlayDef();
    const overlay = {
      id: 'text_bg_test',
      points: [{ timestamp: 100, value: 100 }, { timestamp: 200, value: 100 }],
      extendData: {
        isSelected: false,
        customSettings: {
          text: 'Box Test',
          fillBackground: true,
          fillColor: '#FF0000',
          showBorder: true,
          textColor: '#00FF00',
        },
      },
    };

    const figures = overlayDef.createPointFigures?.({
      overlay,
      coordinates: [{ x: 50, y: 50 }, { x: 230, y: 66 }],
      chart: mockChart,
    } as any) || [];

    const rect = figures.find((f: any) => f.type === 'rect');
    assert.ok(rect, 'Rect figure must be created');
    assert.equal(rect.styles.color, '#FF0000');
    assert.equal(rect.styles.borderColor, '#00FF00');

    // Crucial check: finalized text overlays must NOT produce canvas text figures
    const textFigures = figures.filter((f: any) => f.type === 'text');
    assert.equal(textFigures.length, 0, 'Canvas must not stamp text figures for finalized TextTool overlays');
  });

  it('13. Anchored mode works (pinnedPixelPosition is respected)', () => {
    const overlayDef = TextTool.createOverlayDef();
    const overlay = {
      id: 'text_anchored_test',
      points: [{ timestamp: 100, value: 100 }, { timestamp: 200, value: 100 }],
      extendData: {
        isSelected: false,
        customSettings: {
          isAnchored: true,
          pinnedPixelPosition: { x: 300, y: 400, width: 250 },
          text: 'Anchored Note',
        },
      },
    };

    const figures = overlayDef.createPointFigures?.({
      overlay,
      coordinates: [{ x: 100, y: 100 }, { x: 280, y: 116 }],
      chart: mockChart,
    } as any) || [];

    const rect = figures.find((f: any) => f.type === 'rect');
    assert.ok(rect);
    assert.equal(rect.attrs.x, 300);
    assert.equal(rect.attrs.y, 400);
    assert.equal(rect.attrs.width, 250);
  });

  it('14. Persistence and default templates work', () => {
    const template = TextTool.defaultTemplates?.[0];
    assert.ok(template);
    assert.equal(template.commonSettings.fontSize, 14);
  });

  it('15. Single character minimum box width is respected', () => {
    const singleCharW = getSingleCharWidth(14, false);
    const layout = computeCompositeTextLayout({ origin: { x: 0, y: 0 }, text: 'A', boxWidth: 10 });
    assert.ok(layout.box.width >= Math.ceil(singleCharW + 20));
  });

  it('16. New Text initial width is derived dynamically from measured "Add text" placeholder', () => {
    const layoutDefault = computeCompositeTextLayout({ origin: { x: 0, y: 0 }, text: '' });
    // Without explicit boxWidth, layout must size dynamically to 'Add text' + padding
    const expectedWidth = Math.ceil(layoutDefault.text.totalWidth + layoutDefault.paddingX * 2);
    assert.equal(layoutDefault.box.width, expectedWidth);
    assert.ok(layoutDefault.box.width < 150, 'Initial width must be tight to placeholder, not 180px fixed');
    assert.equal(layoutDefault.text.lines[0], 'Add text', 'Default placeholder text must be "Add text" without ellipsis');
  });

  it('17. onDrawEnd initializes boxWidth dynamically from measured placeholder', () => {
    let overriddenOverlay: any = null;
    const testChart = {
      ...mockChart,
      overrideOverlay: (params: any) => {
        overriddenOverlay = params;
      }
    };

    const event = {
      chart: testChart,
      overlay: {
        id: 'test_text_create',
        points: [{ timestamp: 1000, value: 200, dataIndex: 10 }],
        extendData: {
          customSettings: {
            fontSize: 14,
            textColor: '#2196F3'
          }
        }
      }
    };

    TextTool.onDrawEnd?.(event);
    assert.ok(overriddenOverlay);
    const initWidth = overriddenOverlay.extendData.customSettings.boxWidth;
    assert.ok(initWidth < 150, `Initial boxWidth (${initWidth}) must be derived from placeholder, not 180`);
    assert.equal(overriddenOverlay.extendData.customSettings.text, '');
  });

  it('18. Manual resize dragging anchor index 1 resizes width and preserves content', () => {
    let mutated: any = null;
    const event = {
      x: 350,
      y: 100,
      chart: mockChart,
      overlay: {
        points: [{ timestamp: 1000, value: 200 }, { timestamp: 2000, value: 200 }],
        extendData: {
          startPoints: [{ timestamp: 1000, value: 200 }, { timestamp: 2000, value: 200 }],
          customSettings: {
            fontSize: 14,
            boxWidth: 80,
            text: 'Hello World'
          }
        }
      }
    };

    const result = TextTool.onPressedMoving?.(event as any, 1);
    assert.ok(result && typeof result === 'object');
    assert.ok(result.extendData?.customSettings?.boxWidth > 80, 'Dragging anchor 1 must update boxWidth');
  });
});

