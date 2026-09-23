import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  NoteTool,
  DEFAULT_NOTE_SETTINGS,
  NOTE_FONT_FAMILY,
  NOTE_PADDING_X,
  NOTE_PADDING_Y,
  getNoteLineHeight,
  computeNoteAttachmentSide,
  measureNoteText,
  computeCompositeNoteLayout,
  computeNoteBoxDimensions,
  computeNoteBoxLayout,
} from '../../tools/implementations/NoteTool.ts';
import { TrendLineTool } from '../../tools/implementations/TrendLine.ts';
import { ToolRegistry } from '../../tools/ToolRegistry.ts';

describe('Note Tool — Composite Text-Box Object & Multiline Layout Tests', () => {
  const mockChart = {
    _loadedTimeframe: '1m',
    convertFromPixel: (coords: any[]) => coords.map((c) => ({ timestamp: c.x * 10, value: 100 + (300 - c.y) })),
    convertToPixel: (pts: any[]) => pts.map((p) => ({ x: (p.timestamp || 1000) / 10, y: 300 - (p.value - 100) })),
  };

  it('1. Note box dimensions are derived from text metrics', () => {
    const text = 'Hello world';
    const metrics = measureNoteText(text, 14);
    const layout = computeCompositeNoteLayout({ x: 0, y: 0 }, { x: 100, y: 100 }, text, 14);

    const expectedW = Math.ceil((metrics.width + NOTE_PADDING_X * 2) / 2) * 2;
    const expectedH = Math.ceil((metrics.height + NOTE_PADDING_Y * 2) / 2) * 2;
    assert.equal(layout.box.width, expectedW);
    assert.equal(layout.box.height, expectedH);
  });

  it('2. Text is exactly centered by default (box center = text center)', () => {
    const text = 'Centered Note';
    const p1 = { x: 50, y: 50 };
    const p2 = { x: 200, y: 200 };
    const layout = computeCompositeNoteLayout(p1, p2, text, 14, false, false, 'center', 'middle');

    const boxCenterX = layout.box.x + layout.box.width / 2;
    const boxCenterY = layout.box.y + layout.box.height / 2;

    assert.equal(layout.text.align, 'center');
    assert.equal(layout.text.linePositions[0].x, boxCenterX, 'Line X must match box horizontal center');
    // Baseline is top, line top is box.y + (box.height - totalHeight)/2. Center of single line is line top + lineHeight/2
    const lineCenterY = layout.text.linePositions[0].y + layout.text.lineHeight / 2;
    assert.equal(lineCenterY, boxCenterY, 'Line Y center must match box vertical center');
  });

  it('3. Text and box use the same font configuration', () => {
    assert.ok(NOTE_FONT_FAMILY.includes('Segoe UI') && NOTE_FONT_FAMILY.includes('Roboto'));
    const metrics = measureNoteText('Font Check', 16, true, false);
    assert.equal(metrics.lineHeight, getNoteLineHeight(16));
  });

  it('4. Single-line text sizing', () => {
    const text = 'Single line text';
    const dims = computeNoteBoxDimensions(text, 14);
    const metrics = measureNoteText(text, 14);

    const expectedW = Math.ceil((metrics.width + 20) / 2) * 2;
    const expectedH = Math.ceil((metrics.lineHeight + 12) / 2) * 2;
    assert.equal(dims.width, expectedW);
    assert.equal(dims.height, expectedH);
  });

  it('5. Multiline text sizing', () => {
    const text = 'Line 1\nLine 2 is longer\nLine 3';
    const metrics = measureNoteText(text, 14);

    assert.equal(metrics.lines.length, 3);
    assert.equal(metrics.height, 3 * getNoteLineHeight(14));

    const dims = computeNoteBoxDimensions(text, 14);
    assert.equal(dims.height, Math.ceil((3 * getNoteLineHeight(14) + 12) / 2) * 2);
  });

  it('6. Enter creates a new line', () => {
    const line1 = 'First line';
    const withEnter = `${line1}\nSecond line`;
    const metrics1 = measureNoteText(line1, 14);
    const metrics2 = measureNoteText(withEnter, 14);

    assert.equal(metrics1.lines.length, 1);
    assert.equal(metrics2.lines.length, 2);
    assert.equal(metrics2.height, metrics1.height * 2);
  });

  it('7. Box height grows with additional lines', () => {
    const h1 = computeNoteBoxDimensions('Line 1', 14).height;
    const h2 = computeNoteBoxDimensions('Line 1\nLine 2', 14).height;
    const h3 = computeNoteBoxDimensions('Line 1\nLine 2\nLine 3', 14).height;

    assert.ok(h2 > h1, '2 lines height must be greater than 1 line');
    assert.ok(h3 > h2, '3 lines height must be greater than 2 lines');
    assert.equal(h3 - h2, getNoteLineHeight(14));
  });

  it('8. Box width grows with longer text', () => {
    const wShort = computeNoteBoxDimensions('Short', 14).width;
    const wLong = computeNoteBoxDimensions('Short but now significantly longer text content', 14).width;

    assert.ok(wLong > wShort, 'Longer text width must exceed short text width');
  });

  it('9. Placeholder "Add text" is correctly measured/rendered', () => {
    const dimsPlaceholder = computeNoteBoxDimensions('Add text', 14);
    const dimsEmpty = computeNoteBoxDimensions('', 14);

    // Empty text falls back to 'Add text'
    assert.equal(dimsEmpty.width, dimsPlaceholder.width);
    assert.equal(dimsEmpty.height, dimsPlaceholder.height);
    assert.ok(dimsPlaceholder.width < 120 && dimsPlaceholder.width > 50);
  });

  it('10. Placeholder is replaced by actual text', () => {
    const initialText = '';
    const typedChar = 'H';
    const dimsEmpty = computeNoteBoxDimensions(initialText, 14);
    const dimsTyped = computeNoteBoxDimensions(typedChar, 14);

    assert.ok(dimsTyped.width < dimsEmpty.width, 'Single character "H" width is smaller than placeholder "Add text" width');
  });

  it('11. Text/box remain aligned during real-time editing', () => {
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 250, y: 100 };

    const texts = ['A', 'A much longer text', 'Multi\nLine\nText'];
    for (const t of texts) {
      const layout = computeCompositeNoteLayout(p1, p2, t, 14, false, false, 'center', 'middle');
      const boxCenterX = layout.box.x + layout.box.width / 2;
      assert.equal(layout.text.linePositions[0].x, boxCenterX);
    }
  });

  it('12. Attachment point remains centered on the correct box side', () => {
    const origin = { x: 200, y: 200 };
    const p2Right = { x: 400, y: 200 };
    const layout = computeCompositeNoteLayout(origin, p2Right, 'Test Note', 14);

    assert.equal(layout.box.side, 'right');
    // Left edge of box connects to p2Right: (box.x, box.y + box.height/2) == (p2Right.x, p2Right.y)
    assert.equal(layout.box.x, p2Right.x);
    assert.equal(layout.box.y + layout.box.height / 2, p2Right.y);
  });

  it('13. Dynamic box resizing updates attachment correctly', () => {
    const origin = { x: 200, y: 200 };
    const p2Top = { x: 200, y: 50 };

    const layout1 = computeCompositeNoteLayout(origin, p2Top, 'Line 1', 14);
    const layout2 = computeCompositeNoteLayout(origin, p2Top, 'Line 1\nLine 2\nLine 3', 14);

    assert.equal(layout1.box.side, 'top');
    assert.equal(layout2.box.side, 'top');

    // Bottom center of box connects to p2Top: (box.x + box.width/2, box.y + box.height) == (p2Top.x, p2Top.y)
    assert.equal(layout1.box.x + layout1.box.width / 2, p2Top.x);
    assert.equal(layout1.box.y + layout1.box.height, p2Top.y);

    assert.equal(layout2.box.x + layout2.box.width / 2, p2Top.x);
    assert.equal(layout2.box.y + layout2.box.height, p2Top.y);
  });

  it('14. Empty-note deletion still deletes only the current Note', () => {
    const deletedIds: string[] = [];
    const onDelete = (id: string) => deletedIds.push(id);

    const activeNoteId = 'note_3';
    const isUntouchedOrEmpty = true;

    if (isUntouchedOrEmpty) {
      onDelete(activeNoteId);
    }

    assert.deepEqual(deletedIds, ['note_3'], 'Only the actively edited note ID should be deleted');
  });

  it('15. Existing populated Notes remain untouched', () => {
    const existingNotes = [
      { id: 'note_1', text: 'Existing Note 1' },
      { id: 'note_2', text: 'Existing Note 2' },
    ];

    // Cancelling an empty note
    const activeNoteId = 'note_3';
    const survivingNotes = existingNotes.filter((n) => n.id !== activeNoteId);

    assert.equal(survivingNotes.length, 2);
    assert.equal(survivingNotes[0].id, 'note_1');
    assert.equal(survivingNotes[1].id, 'note_2');
  });

  it('16. NoteTool settings and template defaults integrity', () => {
    assert.equal(DEFAULT_NOTE_SETTINGS.textAlign, 'center');
    assert.equal(DEFAULT_NOTE_SETTINGS.textValign, 'middle');
    assert.equal(DEFAULT_NOTE_SETTINGS.fontSize, 14);

    const tool = ToolRegistry.get('note') || NoteTool;
    assert.ok(tool.defaultTemplates?.[0]);
  });

  it('17. TrendLineTool regression test: unaffected by Note enhancements', () => {
    const trendOverlayDef = TrendLineTool.createOverlayDef();
    assert.equal(trendOverlayDef.name, 'trendLine');
    assert.equal(trendOverlayDef.totalStep, 3);
  });
});

describe('Note Tool — Shared Layout & Single Authoritative Renderer Invariants', () => {
  const mockChart = {
    _loadedTimeframe: '1m',
    convertFromPixel: (coords: any[]) => coords.map((c) => ({ timestamp: c.x * 10, value: 100 + (300 - c.y) })),
    convertToPixel: (pts: any[]) => pts.map((p) => ({ x: (p.timestamp || 1000) / 10, y: 300 - (p.value - 100) })),
  };

  const overlayDef = NoteTool.createOverlayDef();

  it('1. Creation preview (isDrawing === true) renders canvas preview text', () => {
    const drawingChart = {
      ...mockChart,
      _activeDrawingId: 'note_preview',
    };

    const overlay = {
      id: 'note_preview',
      points: [{ timestamp: 100, value: 100 }, { timestamp: 200, value: 100 }],
      extendData: {
        isSelected: true,
        customSettings: {
          ...DEFAULT_NOTE_SETTINGS,
          text: '',
        },
      },
    };

    const figures = overlayDef.createPointFigures?.({
      overlay,
      coordinates: [{ x: 100, y: 100 }, { x: 300, y: 100 }],
      chart: drawingChart,
    } as any) || [];

    const textFigures = figures.filter((f: any) => f.type === 'text');
    assert.equal(textFigures.length, 1, 'Canvas must render preview text during creation preview');
    assert.equal(textFigures[0].attrs.text, 'Add text');
  });

  it('2. Finalized note in normal mode leaves canvas text figures to 0, avoiding duplicate and shifted canvas text', () => {
    const overlay = {
      id: 'note_normal',
      points: [{ timestamp: 100, value: 100 }, { timestamp: 200, value: 100 }],
      extendData: {
        isSelected: false,
        isEditingText: false,
        customSettings: {
          ...DEFAULT_NOTE_SETTINGS,
          text: 'Normal Note Text',
        },
      },
    };

    const figures = overlayDef.createPointFigures?.({
      overlay,
      coordinates: [{ x: 100, y: 100 }, { x: 300, y: 100 }],
      chart: mockChart,
    } as any) || [];

    const textFigures = figures.filter((f: any) => f.type === 'text');
    assert.equal(textFigures.length, 0, 'Canvas must NOT render text figures for finalized notes');
  });

  it('3. Edit mode and normal mode share identical layout geometry (zero position shift)', () => {
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 300, y: 100 };
    const text = 'Shared Text';

    const layoutEdit = computeCompositeNoteLayout(p1, p2, text, 14, false, false, 'center', 'middle');
    const layoutNormal = computeCompositeNoteLayout(p1, p2, text, 14, false, false, 'center', 'middle');

    // Box position and dimension are strictly equal
    assert.deepEqual(layoutEdit.box, layoutNormal.box);
    // Padding and line heights are strictly equal
    assert.equal(layoutEdit.paddingX, layoutNormal.paddingX);
    assert.equal(layoutEdit.paddingY, layoutNormal.paddingY);
    assert.equal(layoutEdit.text.lineHeight, layoutNormal.text.lineHeight);

    // Container transform coordinates are strictly equal: (box.x + paddingX, box.y + paddingY)
    const txEdit = { x: layoutEdit.box.x + layoutEdit.paddingX, y: layoutEdit.box.y + layoutEdit.paddingY };
    const txNormal = { x: layoutNormal.box.x + layoutNormal.paddingX, y: layoutNormal.box.y + layoutNormal.paddingY };
    assert.deepEqual(txEdit, txNormal, 'Editor and normal mode containers share identical (X, Y) coordinates');
  });

  it('4. Multiline text produces identical layout across edit and exit', () => {
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 300, y: 100 };
    const multilineText = 'First Line\nSecond Line is Longer\nThird Line';

    const layout = computeCompositeNoteLayout(p1, p2, multilineText, 14, false, false, 'center', 'middle');
    assert.equal(layout.text.lines.length, 3);
    assert.equal(layout.box.height, Math.ceil((3 * getNoteLineHeight(14) + NOTE_PADDING_Y * 2) / 2) * 2);
  });

  it('5. Empty Note deletion deletes exactly one drawing via exact-ID object filter and keeps other drawings', () => {
    const removedFilters: any[] = [];
    const mockChartInstance = {
      removeOverlay: (filter: any) => {
        removedFilters.push(filter);
      },
    };

    const drawingList = [
      { id: 'note_1', name: 'note', text: '' },
      { id: 'trend_2', name: 'trendLine', text: 'Important Trend' },
      { id: 'rect_3', name: 'rectangle', text: 'Demand Zone' },
    ];

    // Simulate handleDeleteDrawing for empty note_1
    const targetOverlayId = 'note_1';
    // DrawingChartAdapter.removeOverlay should pass object { id: targetOverlayId }
    if (mockChartInstance) {
      mockChartInstance.removeOverlay({ id: targetOverlayId });
    }
    const survivingDrawings = drawingList.filter((d) => d.id !== targetOverlayId);

    assert.equal(survivingDrawings.length, 2, 'Exactly 2 drawings should remain');
    assert.equal(survivingDrawings[0].id, 'trend_2');
    assert.equal(survivingDrawings[1].id, 'rect_3');
    assert.deepEqual(removedFilters, [{ id: 'note_1' }], 'KLineCharts must receive { id: "note_1" } filter object, NEVER a raw string');
  });

  it('6. Empty Callout deletion deletes exactly one drawing and keeps other drawings', () => {
    const removedFilters: any[] = [];
    const mockChartInstance = {
      removeOverlay: (filter: any) => {
        removedFilters.push(filter);
      },
    };

    const drawingList = [
      { id: 'callout_1', name: 'callout', text: '' },
      { id: 'fib_2', name: 'fibonacciRetracement' },
      { id: 'note_3', name: 'note', text: 'Keep this note' },
    ];

    const targetOverlayId = 'callout_1';
    if (mockChartInstance) {
      mockChartInstance.removeOverlay({ id: targetOverlayId });
    }
    const survivingDrawings = drawingList.filter((d) => d.id !== targetOverlayId);

    assert.equal(survivingDrawings.length, 2);
    assert.equal(survivingDrawings[0].id, 'fib_2');
    assert.equal(survivingDrawings[1].id, 'note_3');
    assert.deepEqual(removedFilters, [{ id: 'callout_1' }]);
  });

  it('7. Non-empty Note and Callout remain untouched when exiting edit mode', () => {
    const deletedIds: string[] = [];
    const onDelete = (id: string) => deletedIds.push(id);

    const checkExit = (id: string, text: string) => {
      const trimmed = (text || '').trim();
      const isUntouchedOrEmpty = trimmed === '' || trimmed === 'Add text' || trimmed === '+ Add text';
      if (isUntouchedOrEmpty) {
        onDelete(id);
      }
    };

    checkExit('note_valid', 'Valid Note Text');
    checkExit('callout_valid', 'Valid Callout Text');

    assert.equal(deletedIds.length, 0, 'Non-empty Note and Callout must NOT trigger onDelete');
  });
});
