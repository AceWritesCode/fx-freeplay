import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TrendLineTool } from '../../tools/implementations/TrendLine.ts';
import { computeLineSegmentsWithTextGap, TRENDLINE_TEXT_ANCHOR_OFFSET } from '../../tools/toolUtils.ts';
import {
  SHARED_TEXT_FONT_FAMILY,
  getSharedTextLineHeight,
  measureSingleLineText,
} from '../../tools/sharedTextLayout.ts';

describe('TrendLine Tool — Shared Text Foundation Migration Tests', () => {
  const mockChart = {
    _loadedTimeframe: '1m',
    convertFromPixel: (coords: any[]) =>
      coords.map((c) => ({ timestamp: c.x * 10, value: 100 + (300 - c.y) })),
    convertToPixel: (pts: any[]) =>
      pts.map((p) => ({ x: (p.timestamp || 1000) / 10, y: 300 - (p.value - 100) })),
  };

  it('1. TrendLine overlay definition is registered with totalStep 3', () => {
    const overlayDef = TrendLineTool.createOverlayDef();
    assert.equal(overlayDef.name, 'trendLine');
    assert.equal(overlayDef.totalStep, 3);
  });

  it('2. Synchronously measures single line text gap width accurately', () => {
    const p1 = { x: 0, y: 100 };
    const p2 = { x: 200, y: 100 };
    const text = 'Breakout Level';

    const segments = computeLineSegmentsWithTextGap(
      p1,
      p2,
      text,
      'center',
      'middle',
      14,
      false,
      false
    );

    // Center alignment splits the line into 2 segments around center (x=100)
    assert.equal(segments.length, 2);
    const seg1 = segments[0];
    const seg2 = segments[1];

    assert.equal(seg1.x1, 0);
    assert.equal(seg1.y1, 100);
    assert.ok(seg1.x2 < 100);

    assert.ok(seg2.x1 > 100);
    assert.equal(seg2.x2, 200);
    assert.equal(seg2.y2, 100);

    const measuredGap = seg2.x1 - seg1.x2;
    const expectedTextWidth = measureSingleLineText(text, 14, false, false).width;
    // Gap should equal textWidth + 4 (2px margin each side)
    assert.ok(Math.abs(measuredGap - (expectedTextWidth + 4)) < 0.01);
  });

  it('3. Bold styling synchronously increases text gap width', () => {
    const p1 = { x: 0, y: 100 };
    const p2 = { x: 300, y: 100 };
    const text = 'Target 1';

    const regularSegments = computeLineSegmentsWithTextGap(
      p1,
      p2,
      text,
      'center',
      'middle',
      14,
      false,
      false
    );
    const boldSegments = computeLineSegmentsWithTextGap(
      p1,
      p2,
      text,
      'center',
      'middle',
      14,
      true,
      false
    );

    const regularGap = regularSegments[1].x1 - regularSegments[0].x2;
    const boldGap = boldSegments[1].x1 - boldSegments[0].x2;

    assert.ok(
      boldGap > regularGap,
      `Bold gap (${boldGap}) should be wider than regular gap (${regularGap})`
    );
  });

  it('4. Left alignment cuts the gap with anchor offset at the start of the line', () => {
    const p1 = { x: 0, y: 100 };
    const p2 = { x: 200, y: 100 };
    const text = 'Left Text';

    const segments = computeLineSegmentsWithTextGap(
      p1,
      p2,
      text,
      'left',
      'middle',
      14,
      false,
      false
    );

    assert.equal(segments.length, 1);
    const seg = segments[0];
    const expectedWidth = measureSingleLineText(text, 14, false, false).width;
    const expectedTrimLen = TRENDLINE_TEXT_ANCHOR_OFFSET + expectedWidth + 2;
    assert.ok(Math.abs(seg.x1 - expectedTrimLen) < 0.01);
    assert.equal(seg.x2, 200);
  });

  it('5. Right alignment cuts the gap with anchor offset at the end of the line', () => {
    const p1 = { x: 0, y: 100 };
    const p2 = { x: 200, y: 100 };
    const text = 'Right Text';

    const segments = computeLineSegmentsWithTextGap(
      p1,
      p2,
      text,
      'right',
      'middle',
      14,
      false,
      false
    );

    assert.equal(segments.length, 1);
    const seg = segments[0];
    const expectedWidth = measureSingleLineText(text, 14, false, false).width;
    const expectedTrimLen = TRENDLINE_TEXT_ANCHOR_OFFSET + expectedWidth + 2;
    assert.equal(seg.x1, 0);
    assert.ok(Math.abs(seg.x2 - (200 - expectedTrimLen)) < 0.01);
  });

  it('6. Vertical top or bottom alignment produces NO line gap (full continuous segment)', () => {
    const p1 = { x: 0, y: 100 };
    const p2 = { x: 200, y: 100 };
    const text = 'Above Line';

    const topSegments = computeLineSegmentsWithTextGap(
      p1,
      p2,
      text,
      'center',
      'top',
      14,
      false,
      false
    );
    const bottomSegments = computeLineSegmentsWithTextGap(
      p1,
      p2,
      text,
      'center',
      'bottom',
      14,
      false,
      false
    );

    assert.equal(topSegments.length, 1);
    assert.deepEqual(topSegments[0], { x1: 0, y1: 100, x2: 200, y2: 100 });

    assert.equal(bottomSegments.length, 1);
    assert.deepEqual(bottomSegments[0], { x1: 0, y1: 100, x2: 200, y2: 100 });
  });

  it('7. Empty or whitespace text produces NO line gap (full continuous segment)', () => {
    const p1 = { x: 0, y: 100 };
    const p2 = { x: 200, y: 100 };

    const emptySegments = computeLineSegmentsWithTextGap(
      p1,
      p2,
      '',
      'center',
      'middle',
      14
    );
    const wsSegments = computeLineSegmentsWithTextGap(
      p1,
      p2,
      '   ',
      'center',
      'middle',
      14
    );

    assert.equal(emptySegments.length, 1);
    assert.deepEqual(emptySegments[0], { x1: 0, y1: 100, x2: 200, y2: 100 });
    assert.equal(wsSegments.length, 1);
    assert.deepEqual(wsSegments[0], { x1: 0, y1: 100, x2: 200, y2: 100 });
  });

  it('8. TrendLine createPointFigures generates transparent hit-test line, segmented line, and NO box/rect', () => {
    const overlayDef = TrendLineTool.createOverlayDef();
    const overlay = {
      id: 'trend_1',
      name: 'trendLine',
      points: [
        { timestamp: 1000, value: 200 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        customSettings: {
          text: 'Support Line',
          fontSize: 14,
          textPosition: { horizontal: 'center', vertical: 'middle' },
          lineColor: '#2196F3',
          lineWidth: 2,
        },
        isSelected: true,
      },
    };

    const coordinates = [
      { x: 100, y: 200 },
      { x: 300, y: 200 },
    ];

    const figures = overlayDef.createPointFigures({
      overlay,
      coordinates,
      chart: mockChart,
      bounding: { width: 800, height: 600 },
    });

    // Verify figures structure:
    // 1 transparent full-length line
    // 2 visible line segments (with gap)
    // 2 grab handles (selected)
    // ZERO rect or box figures (TrendLine is NOT a text box)
    const rectFigures = figures.filter((f: any) => f.type === 'rect');
    assert.equal(rectFigures.length, 0, 'TrendLine must have NO background rect figures');

    const lineFigures = figures.filter((f: any) => f.type === 'line');
    assert.ok(lineFigures.length >= 3, 'Must contain full transparent line and 2 visible segments');

    // Check hit test line
    const hitTestLine = lineFigures.find((f: any) => f.styles?.color === 'transparent');
    assert.ok(hitTestLine, 'Transparent hit-test line figure must exist across entire span');
    assert.deepEqual(hitTestLine.attrs.coordinates, [
      { x: 100, y: 200 },
      { x: 300, y: 200 },
    ]);

    // Check visible line segments
    const visibleLines = lineFigures.filter(
      (f: any) => f.styles?.color === '#2196F3' && f.styles?.size === 2
    );
    assert.equal(visibleLines.length, 2, 'Visible line should be split into 2 segments around text');
  });

  it('9. Arrowheads are preserved with text gaps', () => {
    const overlayDef = TrendLineTool.createOverlayDef();
    const overlay = {
      id: 'trend_arrow',
      name: 'arrow',
      points: [
        { timestamp: 1000, value: 200 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        customSettings: {
          text: 'Direction',
          fontSize: 14,
          textPosition: { horizontal: 'center', vertical: 'middle' },
          lineColor: '#FF9800',
          lineWidth: 1,
          startArrow: 'normal',
          endArrow: 'arrow',
        },
      },
    };

    const coordinates = [
      { x: 100, y: 200 },
      { x: 300, y: 200 },
    ];

    const figures = overlayDef.createPointFigures({
      overlay,
      coordinates,
      chart: mockChart,
      bounding: { width: 800, height: 600 },
    });

    // Look for arrowhead figure
    const arrowLine = figures.find(
      (f: any) => f.styles?.lineCap === 'round' && f.styles?.lineJoin === 'round'
    );
    assert.ok(arrowLine, 'Arrowhead line figure must be generated');
  });

  it('10. Shared font family and line height consistency', () => {
    assert.equal(
      SHARED_TEXT_FONT_FAMILY,
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    );
    assert.equal(getSharedTextLineHeight(14), 18);
    assert.equal(getSharedTextLineHeight(16), 22);
  });

  it('11. Empty TrendLine splits line around "+ Add text" placeholder when selected or hovered', () => {
    const overlayDef = TrendLineTool.createOverlayDef();
    const overlay = {
      id: 'trend_placeholder',
      name: 'trendLine',
      points: [
        { timestamp: 1000, value: 200 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        customSettings: {
          text: '', // Empty text!
          fontSize: 14,
          textPosition: { horizontal: 'center', vertical: 'middle' },
          lineColor: '#2196F3',
          lineWidth: 2,
        },
        isSelected: true,
      },
    };

    const coordinates = [
      { x: 100, y: 200 },
      { x: 300, y: 200 },
    ];

    const figures = overlayDef.createPointFigures({
      overlay,
      coordinates,
      chart: mockChart,
      bounding: { width: 800, height: 600 },
    });

    const visibleLines = figures.filter(
      (f: any) => f.type === 'line' && f.styles?.color === '#2196F3' && f.styles?.size === 2
    );
    assert.equal(visibleLines.length, 2, 'Line must split into 2 segments around "+ Add text" placeholder');

    const gap = visibleLines[1].attrs.coordinates[0].x - visibleLines[0].attrs.coordinates[1].x;
    const placeholderWidth = measureSingleLineText('+ Add text', 14, false, false).width;
    assert.ok(Math.abs(gap - (placeholderWidth + 4)) < 0.01, 'Gap must match measured "+ Add text" width + margins');
  });

  it('12. Changing from placeholder to typed text updates the line gap dynamically', () => {
    const overlayDef = TrendLineTool.createOverlayDef();
    const coordinates = [
      { x: 0, y: 100 },
      { x: 400, y: 100 },
    ];

    // Case A: Placeholder
    const placeholderOverlay = {
      id: 'trend_dynamic',
      name: 'trendLine',
      points: [{ timestamp: 100, value: 10 }, { timestamp: 200, value: 10 }],
      extendData: {
        customSettings: { text: '', fontSize: 14, textPosition: { horizontal: 'center', vertical: 'middle' }, lineColor: '#2196F3', lineWidth: 1 },
        isSelected: true,
      },
    };
    const placeholderFigures = overlayDef.createPointFigures({
      overlay: placeholderOverlay,
      coordinates,
      chart: mockChart,
      bounding: { width: 800, height: 600 },
    });
    const placeholderLines = placeholderFigures.filter((f: any) => f.type === 'line' && f.styles?.color === '#2196F3');
    const placeholderGap = placeholderLines[1].attrs.coordinates[0].x - placeholderLines[0].attrs.coordinates[1].x;

    // Case B: Typed short text "Hi"
    const typedOverlay = {
      ...placeholderOverlay,
      extendData: {
        ...placeholderOverlay.extendData,
        customSettings: { ...placeholderOverlay.extendData.customSettings, text: 'Hi' },
      },
    };
    const typedFigures = overlayDef.createPointFigures({
      overlay: typedOverlay,
      coordinates,
      chart: mockChart,
      bounding: { width: 800, height: 600 },
    });
    const typedLines = typedFigures.filter((f: any) => f.type === 'line' && f.styles?.color === '#2196F3');
    const typedGap = typedLines[1].attrs.coordinates[0].x - typedLines[0].attrs.coordinates[1].x;

    assert.ok(typedGap < placeholderGap, `Typed gap (${typedGap}) for "Hi" should be smaller than placeholder gap (${placeholderGap})`);

    // Case C: Clearing text returns back to placeholder gap
    const clearedOverlay = {
      ...placeholderOverlay,
      extendData: {
        ...placeholderOverlay.extendData,
        customSettings: { ...placeholderOverlay.extendData.customSettings, text: '   ' },
      },
    };
    const clearedFigures = overlayDef.createPointFigures({
      overlay: clearedOverlay,
      coordinates,
      chart: mockChart,
      bounding: { width: 800, height: 600 },
    });
    const clearedLines = clearedFigures.filter((f: any) => f.type === 'line' && f.styles?.color === '#2196F3');
    const clearedGap = clearedLines[1].attrs.coordinates[0].x - clearedLines[0].attrs.coordinates[1].x;
    assert.equal(clearedGap, placeholderGap, 'Clearing typed text returns exactly to placeholder gap');
  });

  it('13. Unselected and unhovered TrendLine with empty text produces a continuous unbroken line', () => {
    const overlayDef = TrendLineTool.createOverlayDef();
    const overlay = {
      id: 'trend_dormant',
      name: 'trendLine',
      points: [
        { timestamp: 1000, value: 200 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        customSettings: {
          text: '',
          fontSize: 14,
          textPosition: { horizontal: 'center', vertical: 'middle' },
          lineColor: '#2196F3',
          lineWidth: 2,
        },
        isSelected: false,
        isHovered: false,
        isEditingText: false,
      },
    };

    const coordinates = [
      { x: 100, y: 200 },
      { x: 300, y: 200 },
    ];

    const figures = overlayDef.createPointFigures({
      overlay,
      coordinates,
      chart: mockChart,
      bounding: { width: 800, height: 600 },
    });

    const visibleLines = figures.filter(
      (f: any) => f.type === 'line' && f.styles?.color === '#2196F3' && f.styles?.size === 2
    );
    assert.equal(visibleLines.length, 1, 'Unselected/unhovered empty trendline must be 1 continuous segment');
    assert.deepEqual(visibleLines[0].attrs.coordinates, [
      { x: 100, y: 200 },
      { x: 300, y: 200 },
    ]);
  });
});
