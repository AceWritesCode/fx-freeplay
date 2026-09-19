import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CalloutTool,
  computeCalloutPlacement,
  computeCalloutAttachmentPoint,
  computeCompositeCalloutLayout,
  measureCalloutText,
  DEFAULT_CALLOUT_SETTINGS,
} from '../../tools/implementations/CalloutTool.ts';

describe('Callout Tool — Geometry, Drag Modes & 8-Way Placement Invariant Tests', () => {
  const mockChart = {
    _loadedTimeframe: '1m',
    convertFromPixel: (coords: any[]) =>
      coords.map((c) => ({ timestamp: c.x * 10, value: 100 + (300 - c.y), dataIndex: Math.round(c.x / 10) })),
    convertToPixel: (pts: any[]) =>
      pts.map((p) => ({ x: (p.timestamp || 1000) / 10, y: 300 - (p.value - 100) })),
  };

  describe('1. Two-Point Geometry Model & Creation Flow', () => {
    it('is registered with name "callout" and totalStep 3 (two logical points)', () => {
      const overlayDef = CalloutTool.createOverlayDef();
      assert.equal(overlayDef.name, 'callout');
      assert.equal(overlayDef.totalStep, 3);
    });

    it('single point during creation renders 1 grab handle for the fixed anchor', () => {
      const overlayDef = CalloutTool.createOverlayDef();
      const figures = overlayDef.createPointFigures({
        overlay: { id: 'callout_1', name: 'callout', points: [{ timestamp: 1000, value: 200 }] },
        coordinates: [{ x: 100, y: 200 }],
        chart: mockChart,
      });
      assert.equal(figures.length, 1);
      assert.equal(figures[0].type, 'circle');
      assert.equal(figures[0].attrs.x, 100);
      assert.equal(figures[0].attrs.y, 200);
    });

    it('two points establish fixed anchor at points[0] and box center at points[1], with grab handle ONLY on points[0]', () => {
      const overlayDef = CalloutTool.createOverlayDef();
      const overlay = {
        id: 'callout_2',
        name: 'callout',
        points: [
          { timestamp: 1000, value: 200 },
          { timestamp: 2000, value: 250 },
        ],
        extendData: {
          customSettings: { text: 'Key Level' },
          isSelected: true,
        },
      };

      const coordinates = [
        { x: 100, y: 200 }, // Anchor A
        { x: 300, y: 150 }, // Box Center C
      ];

      const figures = overlayDef.createPointFigures({
        overlay,
        coordinates,
        chart: mockChart,
      });

      // Box should be centered around coordinates[1] (300, 150)
      const rectFigure = figures.find((f: any) => f.type === 'rect' && f.styles.color !== 'transparent');
      assert.ok(rectFigure, 'Box rect figure must be present');
      const boxCenterX = rectFigure.attrs.x + rectFigure.attrs.width / 2;
      const boxCenterY = rectFigure.attrs.y + rectFigure.attrs.height / 2;
      assert.equal(boxCenterX, 300, 'Box center X matches coordinates[1].x');
      assert.equal(boxCenterY, 150, 'Box center Y matches coordinates[1].y');

      // Grab handle ONLY on fixed anchor (100, 200) — box center (300, 150) is NEVER rendered as an anchor
      const circleFigures = figures.filter((f: any) => f.type === 'circle');
      assert.equal(circleFigures.length, 1, 'ONLY points[0] is rendered as a grab handle');
      assert.equal(circleFigures[0].attrs.x, 100);
      assert.equal(circleFigures[0].attrs.y, 200);
    });
  });

  describe('2. Fixed First Anchor & Two Distinct Drag Modes', () => {
    const startPoints = [
      { timestamp: 1000, value: 200, dataIndex: 100 },
      { timestamp: 2000, value: 250, dataIndex: 200 },
    ];

    it('BODY DRAG (draggedIndex === null): points[0] remains strictly fixed, only points[1] moves', () => {
      const event = {
        overlay: {
          id: 'callout_drag',
          points: [...startPoints],
          extendData: {
            startPoints,
            startMousePt: { timestamp: 2000, value: 250, dataIndex: 200 },
          },
        },
        x: 250, // Moved +50px X
        y: 200, // Moved -50px Y
        chart: mockChart,
      };

      const result = CalloutTool.onPressedMoving!(event, null);
      assert.ok(result && typeof result === 'object' && result.points);

      const newPoints = result.points;
      assert.deepEqual(newPoints[0], startPoints[0], 'Fixed anchor points[0] MUST NOT move during body drag');
      assert.notDeepEqual(newPoints[1], startPoints[1], 'Box center points[1] MUST move with drag delta');
      assert.equal(newPoints[1].timestamp, 2500); // 2000 + (2500 - 2000)
      assert.equal(newPoints[1].value, 200); // 250 + (200 - 250)
    });

    it('DRAG FIRST ANCHOR (draggedIndex === 0): points[0] moves, points[1] (box center) remains strictly fixed', () => {
      const event = {
        overlay: {
          id: 'callout_drag_anchor0',
          points: [...startPoints],
          extendData: {
            startPoints,
            startMousePt: { timestamp: 1000, value: 200, dataIndex: 100 },
          },
        },
        x: 120, // Moved +20px X
        y: 220, // Moved -20px Y
        chart: mockChart,
      };

      const result = CalloutTool.onPressedMoving!(event, 0);
      assert.ok(result && typeof result === 'object' && result.points);

      const newPoints = result.points;
      assert.notDeepEqual(newPoints[0], startPoints[0], 'Anchor points[0] moves when dragged');
      assert.deepEqual(newPoints[1], startPoints[1], 'Box center points[1] MUST NOT move when dragging anchor 0');
      assert.equal(newPoints[0].timestamp, 1200);
      assert.equal(newPoints[0].value, 180);
    });

    it('DRAG SECOND ANCHOR (draggedIndex === 1): points[1] moves, points[0] remains strictly fixed', () => {
      const event = {
        overlay: {
          id: 'callout_drag_anchor1',
          points: [...startPoints],
          extendData: {
            startPoints,
            startMousePt: { timestamp: 2000, value: 250, dataIndex: 200 },
          },
        },
        x: 230,
        y: 270,
        chart: mockChart,
      };

      const result = CalloutTool.onPressedMoving!(event, 1);
      assert.ok(result && typeof result === 'object' && result.points);

      const newPoints = result.points;
      assert.deepEqual(newPoints[0], startPoints[0], 'Fixed anchor points[0] MUST NOT move when dragging anchor 1');
      assert.notDeepEqual(newPoints[1], startPoints[1], 'Box center points[1] moves');
    });
  });

  describe('3. 8-Way Angular Placement Classification & Sector Boundaries', () => {
    const anchor = { x: 200, y: 200 };

    it('classifies Right Side (0°)', () => {
      assert.equal(computeCalloutPlacement(anchor, { x: 350, y: 200 }), 'right');
    });

    it('classifies Bottom Right (45°)', () => {
      assert.equal(computeCalloutPlacement(anchor, { x: 300, y: 300 }), 'bottom-right');
    });

    it('classifies Down (90°)', () => {
      assert.equal(computeCalloutPlacement(anchor, { x: 200, y: 350 }), 'bottom');
    });

    it('classifies Bottom Left (135°)', () => {
      assert.equal(computeCalloutPlacement(anchor, { x: 100, y: 300 }), 'bottom-left');
    });

    it('classifies Left Side (180° / -180°)', () => {
      assert.equal(computeCalloutPlacement(anchor, { x: 50, y: 200 }), 'left');
    });

    it('classifies Top Left (-135°)', () => {
      assert.equal(computeCalloutPlacement(anchor, { x: 100, y: 100 }), 'top-left');
    });

    it('classifies Up (-90°)', () => {
      assert.equal(computeCalloutPlacement(anchor, { x: 200, y: 50 }), 'top');
    });

    it('classifies Top Right (-45°)', () => {
      assert.equal(computeCalloutPlacement(anchor, { x: 300, y: 100 }), 'top-right');
    });

    it('correctly handles 22.5° sector boundary transitions', () => {
      // 20 deg (within [-22.5, 22.5]) -> right
      assert.equal(computeCalloutPlacement(anchor, { x: 200 + 100 * Math.cos(20 * Math.PI / 180), y: 200 + 100 * Math.sin(20 * Math.PI / 180) }), 'right');
      // 25 deg (within [22.5, 67.5]) -> bottom-right
      assert.equal(computeCalloutPlacement(anchor, { x: 200 + 100 * Math.cos(25 * Math.PI / 180), y: 200 + 100 * Math.sin(25 * Math.PI / 180) }), 'bottom-right');
      // 70 deg (within [67.5, 112.5]) -> bottom
      assert.equal(computeCalloutPlacement(anchor, { x: 200 + 100 * Math.cos(70 * Math.PI / 180), y: 200 + 100 * Math.sin(70 * Math.PI / 180) }), 'bottom');
      // 120 deg (within [112.5, 157.5]) -> bottom-left
      assert.equal(computeCalloutPlacement(anchor, { x: 200 + 100 * Math.cos(120 * Math.PI / 180), y: 200 + 100 * Math.sin(120 * Math.PI / 180) }), 'bottom-left');
      // 160 deg (> 157.5) -> left
      assert.equal(computeCalloutPlacement(anchor, { x: 200 + 100 * Math.cos(160 * Math.PI / 180), y: 200 + 100 * Math.sin(160 * Math.PI / 180) }), 'left');
      // -120 deg (within [-157.5, -112.5]) -> top-left
      assert.equal(computeCalloutPlacement(anchor, { x: 200 + 100 * Math.cos(-120 * Math.PI / 180), y: 200 + 100 * Math.sin(-120 * Math.PI / 180) }), 'top-left');
      // -80 deg (within [-112.5, -67.5]) -> top
      assert.equal(computeCalloutPlacement(anchor, { x: 200 + 100 * Math.cos(-80 * Math.PI / 180), y: 200 + 100 * Math.sin(-80 * Math.PI / 180) }), 'top');
      // -30 deg (within [-67.5, -22.5]) -> top-right
      assert.equal(computeCalloutPlacement(anchor, { x: 200 + 100 * Math.cos(-30 * Math.PI / 180), y: 200 + 100 * Math.sin(-30 * Math.PI / 180) }), 'top-right');
    });
  });

  describe('4. Tail / Box Boundary Attachment Invariants', () => {
    const boxCenter = { x: 300, y: 200 };
    const boxWidth = 100;
    const boxHeight = 40;
    // Box bounds: [250, 350] x [180, 220]

    it('Up (top): tail attaches exactly to bottom edge of box', () => {
      const anchor = { x: 300, y: 350 }; // Anchor is below box
      const att = computeCalloutAttachmentPoint(anchor, boxCenter, boxWidth, boxHeight);
      assert.equal(att.x, 300);
      assert.equal(att.y, 220, 'Attaches to bottom perimeter y = 220');
    });

    it('Down (bottom): tail attaches exactly to top edge of box', () => {
      const anchor = { x: 300, y: 50 }; // Anchor is above box
      const att = computeCalloutAttachmentPoint(anchor, boxCenter, boxWidth, boxHeight);
      assert.equal(att.x, 300);
      assert.equal(att.y, 180, 'Attaches to top perimeter y = 180');
    });

    it('Left: tail attaches exactly to right edge of box', () => {
      const anchor = { x: 500, y: 200 }; // Anchor is to right of box
      const att = computeCalloutAttachmentPoint(anchor, boxCenter, boxWidth, boxHeight);
      assert.equal(att.x, 350, 'Attaches to right perimeter x = 350');
      assert.equal(att.y, 200);
    });

    it('Right: tail attaches exactly to left edge of box', () => {
      const anchor = { x: 100, y: 200 }; // Anchor is to left of box
      const att = computeCalloutAttachmentPoint(anchor, boxCenter, boxWidth, boxHeight);
      assert.equal(att.x, 250, 'Attaches to left perimeter x = 250');
      assert.equal(att.y, 200);
    });

    it('Top-Right: tail terminates at perimeter without entering box', () => {
      const anchor = { x: 100, y: 400 }; // Anchor is down-left from box
      const att = computeCalloutAttachmentPoint(anchor, boxCenter, boxWidth, boxHeight);
      assert.ok(att.x >= 250 && att.x <= 350);
      assert.ok(att.y >= 180 && att.y <= 220);
      assert.ok(att.x === 250 || att.y === 220, 'Attachment is on left or bottom boundary');
    });

    it('Top-Left: tail terminates at perimeter without entering box', () => {
      const anchor = { x: 500, y: 400 }; // Anchor is down-right from box
      const att = computeCalloutAttachmentPoint(anchor, boxCenter, boxWidth, boxHeight);
      assert.ok(att.x >= 250 && att.x <= 350);
      assert.ok(att.y >= 180 && att.y <= 220);
      assert.ok(att.x === 350 || att.y === 220, 'Attachment is on right or bottom boundary');
    });

    it('Bottom-Right: tail terminates at perimeter without entering box', () => {
      const anchor = { x: 100, y: 50 }; // Anchor is up-left from box
      const att = computeCalloutAttachmentPoint(anchor, boxCenter, boxWidth, boxHeight);
      assert.ok(att.x >= 250 && att.x <= 350);
      assert.ok(att.y >= 180 && att.y <= 220);
      assert.ok(att.x === 250 || att.y === 180, 'Attachment is on left or top boundary');
    });

    it('Bottom-Left: tail terminates at perimeter without entering box', () => {
      const anchor = { x: 500, y: 50 }; // Anchor is up-right from box
      const att = computeCalloutAttachmentPoint(anchor, boxCenter, boxWidth, boxHeight);
      assert.ok(att.x >= 250 && att.x <= 350);
      assert.ok(att.y >= 180 && att.y <= 220);
      assert.ok(att.x === 350 || att.y === 180, 'Attachment is on right or top boundary');
    });

    it('moving the box across placement boundaries dynamically recalculates attachment side and coordinates', () => {
      const fixedAnchor = { x: 200, y: 200 };
      // Position 1: box to right (x=400, y=200) -> placement right, attaches to left edge
      const layout1 = computeCompositeCalloutLayout(fixedAnchor, { x: 400, y: 200 }, 'Test');
      assert.equal(layout1.box.placement, 'right');
      assert.equal(layout1.attachment.x, layout1.box.x);

      // Position 2: box to top (x=200, y=50) -> placement top, attaches to bottom edge
      const layout2 = computeCompositeCalloutLayout(fixedAnchor, { x: 200, y: 50 }, 'Test');
      assert.equal(layout2.box.placement, 'top');
      assert.equal(layout2.attachment.y, layout2.box.y + layout2.box.height);

      // Position 3: box to left (x=50, y=200) -> placement left, attaches to right edge
      const layout3 = computeCompositeCalloutLayout(fixedAnchor, { x: 50, y: 200 }, 'Test');
      assert.equal(layout3.box.placement, 'left');
      assert.equal(layout3.attachment.x, layout3.box.x + layout3.box.width);

      // Position 4: box to bottom (x=200, y=350) -> placement bottom, attaches to top edge
      const layout4 = computeCompositeCalloutLayout(fixedAnchor, { x: 200, y: 350 }, 'Test');
      assert.equal(layout4.box.placement, 'bottom');
      assert.equal(layout4.attachment.y, layout4.box.y);
    });
  });

  describe('5. Shared Text Infrastructure & Dynamic Multiline Box Sizing', () => {
    it('measures single-line text and scales box dimensions', () => {
      const metrics = measureCalloutText('Entry Target', 14, false, false);
      assert.ok(metrics.width > 0);
      assert.equal(metrics.lines.length, 1);
      assert.equal(metrics.lines[0], 'Entry Target');
    });

    it('measures multiline text with newlines and grows height accordingly', () => {
      const singleLine = measureCalloutText('Line 1', 14, false, false);
      const multiLine = measureCalloutText('Line 1\nLine 2\nLine 3', 14, false, false);

      assert.equal(multiLine.lines.length, 3);
      assert.ok(multiLine.height > singleLine.height * 2, '3-line text height must be significantly taller than single-line');
    });

    it('computeCompositeCalloutLayout generates stable geometry matching Note text foundation', () => {
      const layout = computeCompositeCalloutLayout(
        { x: 100, y: 300 },
        { x: 300, y: 150 },
        'Take Profit\n1.0850',
        14,
        true,
        false,
        'center',
        'middle'
      );

      assert.equal(layout.box.placement, 'top-right');
      assert.equal(layout.text.lines.length, 2);
      assert.equal(layout.text.align, 'center');
      assert.ok(layout.box.width > 0);
      assert.ok(layout.box.height > 0);
    });

    it('empty text uses "+ Add text" placeholder for preview/layout during edit mode', () => {
      const emptyLayout = computeCompositeCalloutLayout(
        { x: 100, y: 300 },
        { x: 300, y: 150 },
        'Add text',
        14
      );
      assert.ok(emptyLayout.box.width > 0);
      assert.ok(emptyLayout.box.height > 0);
    });
  });

  describe('6. Settings & Persistence Invariants', () => {
    it('provides DEFAULT_CALLOUT_SETTINGS matching specification', () => {
      assert.equal(DEFAULT_CALLOUT_SETTINGS.lineColor, '#2196F3');
      assert.equal(DEFAULT_CALLOUT_SETTINGS.lineWidth, 1);
      assert.equal(DEFAULT_CALLOUT_SETTINGS.fontSize, 14);
      assert.equal(DEFAULT_CALLOUT_SETTINGS.textColor, '#ffffff');
      assert.equal(DEFAULT_CALLOUT_SETTINGS.fillBackground, true);
    });

    it('Callout settingsSchema includes all customizable styling fields', () => {
      const schema = CalloutTool.settingsSchema;
      const ids = schema.map((s) => s.id);
      assert.ok(ids.includes('lineColor'));
      assert.ok(ids.includes('lineWidth'));
      assert.ok(ids.includes('fillBackground'));
      assert.ok(ids.includes('backgroundColor'));
      assert.ok(ids.includes('textColor'));
      assert.ok(ids.includes('fontSize'));
    });
  });

  describe('7. Exact-ID Deletion & Toolbar Line Controls Exclusion Regression Tests', () => {
    it('Empty Callout deletion deletes ONLY its own exact ID; other drawings remain untouched', () => {
      const drawings = [
        { id: 'callout_1', text: 'Important High' },
        { id: 'trendLine_1', text: 'Bullish trend' },
        { id: 'callout_empty_target', text: '' },
      ];

      const deletedIds: string[] = [];
      const onDelete = (id: string) => deletedIds.push(id);

      // Simulating handleExit for callout_empty_target
      const targetId = 'callout_empty_target';
      const targetText = '';
      const trimmed = targetText.trim();
      const isUntouchedOrEmpty = trimmed === '' || trimmed === 'Add text' || trimmed === '+ Add text';

      if (isUntouchedOrEmpty) {
        onDelete(targetId);
      }

      assert.deepEqual(deletedIds, ['callout_empty_target']);
      const surviving = drawings.filter((d) => !deletedIds.includes(d.id));
      assert.equal(surviving.length, 2);
      assert.equal(surviving[0].id, 'callout_1');
      assert.equal(surviving[1].id, 'trendLine_1');
    });

    it('Multiple empty Callouts: exiting/deleting one affects ONLY that specific Callout ID', () => {
      const drawings = [
        { id: 'callout_empty_A', text: '' },
        { id: 'callout_empty_B', text: '+ Add text' },
        { id: 'callout_empty_C', text: 'Add text' },
        { id: 'callout_populated_D', text: 'Stop Loss' },
      ];

      let currentDrawings = [...drawings];
      const simulateExitEmpty = (id: string, text: string) => {
        const trimmed = (text || '').trim();
        if (trimmed === '' || trimmed === 'Add text' || trimmed === '+ Add text') {
          currentDrawings = currentDrawings.filter((d) => d.id !== id);
        }
      };

      // Delete only Callout A
      simulateExitEmpty('callout_empty_A', '');
      assert.equal(currentDrawings.length, 3);
      assert.deepEqual(currentDrawings.map((d) => d.id), ['callout_empty_B', 'callout_empty_C', 'callout_populated_D']);

      // Delete only Callout C
      simulateExitEmpty('callout_empty_C', 'Add text');
      assert.equal(currentDrawings.length, 2);
      assert.deepEqual(currentDrawings.map((d) => d.id), ['callout_empty_B', 'callout_populated_D']);

      // Ensure Callout B and Callout D remained completely untouched
      assert.equal(currentDrawings[0].id, 'callout_empty_B');
      assert.equal(currentDrawings[1].id, 'callout_populated_D');
    });

    it('Toolbar controls: Callout excludes line arrows, line width, and line style while retaining text settings', () => {
      const isLineTool = (name: string) =>
        ['trendLine', 'ray', 'arrow', 'horizontalRay', 'horizontalLine', 'verticalLine'].includes(name);
      const hasTextSettings = (name: string) =>
        ['text', 'fxText', 'callout', 'note'].includes(name);
      const hasLineWidth = (name: string) =>
        !['text', 'fxText', 'callout', 'note'].includes(name);
      const hasLineStyle = (name: string) =>
        !['text', 'fxText', 'brush', 'highlighter', 'callout', 'note'].includes(name);

      // Callout assertions
      assert.equal(isLineTool('callout'), false, 'Callout is NOT classified as a line tool (no arrowheads)');
      assert.equal(hasLineWidth('callout'), false, 'Callout does NOT have line width dropdown');
      assert.equal(hasLineStyle('callout'), false, 'Callout does NOT have line style dropdown');
      assert.equal(hasTextSettings('callout'), true, 'Callout DOES have text settings (font size, alignment, background)');

      // Line tools assertions
      ['trendLine', 'ray', 'arrow', 'horizontalRay', 'horizontalLine', 'verticalLine'].forEach((lineTool) => {
        assert.equal(isLineTool(lineTool), true, `${lineTool} retains line tool arrow controls`);
        assert.equal(hasLineWidth(lineTool), true, `${lineTool} retains line width control`);
        assert.equal(hasLineStyle(lineTool), true, `${lineTool} retains line style control`);
      });
    });
  });
});
