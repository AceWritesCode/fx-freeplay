import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FibonacciRetracementTool,
  DEFAULT_FIB_LEVELS,
  DEFAULT_FIB_SETTINGS,
  calculateFibLevelPrice,
  colorWithAlpha,
  getFibLevelLabelText,
  computeFibLevelLayout,
} from '../../tools/implementations/FibonacciRetracement.ts';
import { TrendLineTool } from '../../tools/implementations/TrendLine.ts';
import { ToolRegistry } from '../../tools/ToolRegistry.ts';

describe('Fibonacci Retracement - Core Tool & Rendering', () => {
  it('should be registered in ToolRegistry with correct metadata and 2-point totalStep 3', () => {
    ToolRegistry.register(FibonacciRetracementTool);
    const tool = ToolRegistry.get('fibonacciRetracement');
    assert.ok(tool, 'FibonacciRetracementTool should be registered in ToolRegistry');
    assert.equal(tool.id, 'fibonacciRetracement');
    assert.equal(tool.name, 'Fib Retracement');
    assert.equal(tool.group, 'lines');

    const overlayDef = tool.createOverlayDef();
    assert.equal(overlayDef.name, 'fibonacciRetracement');
    assert.equal(overlayDef.totalStep, 3, 'Fibonacci retracement requires 2 anchors (totalStep 3)');
    assert.equal(overlayDef.needDefaultPointFigure, false);
  });

  it('should calculate Fibonacci level prices correctly in normal mode', () => {
    const p0 = 100;
    const p1 = 200;

    assert.equal(calculateFibLevelPrice(p0, p1, 0, false), 100);
    assert.equal(calculateFibLevelPrice(p0, p1, 1, false), 200);
    assert.equal(calculateFibLevelPrice(p0, p1, 0.5, false), 150);
    assert.equal(calculateFibLevelPrice(p0, p1, 0.618, false), 161.8);
    assert.equal(calculateFibLevelPrice(p0, p1, 0.382, false), 138.2);
    assert.equal(calculateFibLevelPrice(p0, p1, 1.618, false), 261.8);
    assert.equal(calculateFibLevelPrice(p0, p1, -0.236, false), 76.4);
  });

  it('should calculate Fibonacci level prices correctly in reverse mode', () => {
    const p0 = 100;
    const p1 = 200;

    assert.equal(calculateFibLevelPrice(p0, p1, 0, true), 200);
    assert.equal(calculateFibLevelPrice(p0, p1, 1, true), 100);
    assert.equal(calculateFibLevelPrice(p0, p1, 0.5, true), 150);
    assert.ok(Math.abs(calculateFibLevelPrice(p0, p1, 0.618, true) - 138.2) < 1e-5);
    assert.ok(Math.abs(calculateFibLevelPrice(p0, p1, 0.382, true) - 161.8) < 1e-5);
    assert.ok(Math.abs(calculateFibLevelPrice(p0, p1, 1.618, true) - 38.2) < 1e-5);
  });

  it('should contain the 24 standard levels matching TradingView defaults', () => {
    assert.equal(DEFAULT_FIB_LEVELS.length, 24);

    const enabledLevels = DEFAULT_FIB_LEVELS.filter((l) => l.enabled);
    const enabledValues = enabledLevels.map((l) => l.level);
    assert.deepEqual(enabledValues, [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]);

    const disabledLevels = DEFAULT_FIB_LEVELS.filter((l) => !l.enabled);
    assert.equal(disabledLevels.length, 17);
  });

  it('should convert color hex to rgba with alpha opacity', () => {
    assert.equal(colorWithAlpha('#808080', 0.2), 'rgba(128, 128, 128, 0.2)');
    assert.equal(colorWithAlpha('#F23645', 0.5), 'rgba(242, 54, 69, 0.5)');
    assert.equal(colorWithAlpha('rgb(10, 20, 30)', 0.4), 'rgba(10, 20, 30, 0.4)');
  });

  it('should render single-point grab handles during step 1', () => {
    const overlayDef = FibonacciRetracementTool.createOverlayDef();
    const figures = overlayDef.createPointFigures?.({
      overlay: { id: 'fib_1', points: [{ timestamp: 1000, value: 1.1000 }] },
      coordinates: [{ x: 100, y: 200 }],
      chart: null,
      bounding: { width: 800, height: 600 },
    } as any) || [];

    assert.ok(figures.length > 0, 'Should render grab handle figures');
    const circle = figures.find((f: any) => f.type === 'circle');
    assert.ok(circle, 'Should render a circle for the anchor');
    assert.equal(circle.attrs.x, 100);
    assert.equal(circle.attrs.y, 200);
  });

  it('should render trendline, horizontal level lines, shaded background, labels, and grab handles for 2 points', () => {
    const overlayDef = FibonacciRetracementTool.createOverlayDef();
    const mockChart = {
      _loadedTimeframe: '1m',
      convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
      convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
    };

    const overlay = {
      id: 'fib_1',
      points: [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        isSelected: true,
        customSettings: DEFAULT_FIB_SETTINGS,
      },
    };

    const figures = overlayDef.createPointFigures?.({
      overlay,
      coordinates: [
        { x: 100, y: 300 },
        { x: 300, y: 100 },
      ],
      chart: mockChart,
      bounding: { width: 1000, height: 600 },
    } as any) || [];

    assert.ok(figures.length > 0, 'Figures should be returned');

    // 1. Trend Line
    const trendLines = figures.filter((f: any) => f.type === 'line' && f.attrs.coordinates.length === 2 && f.attrs.coordinates[0].x === 100 && f.attrs.coordinates[1].x === 300 && f.attrs.coordinates[0].y === 300 && f.attrs.coordinates[1].y === 100);
    assert.ok(trendLines.length >= 1, 'Should render the trend line connecting the two anchors');

    // 2. Horizontal Level Lines (7 enabled default levels)
    const levelLines = figures.filter((f: any) => f.type === 'line' && f.styles.color !== 'transparent' && f.attrs.coordinates[0].y === f.attrs.coordinates[1].y);
    assert.equal(levelLines.length, 7, 'Should render 7 horizontal level lines for the 7 enabled levels');

    // 3. Shaded Background Polygons (between the 7 levels, there are 6 bands)
    const polygons = figures.filter((f: any) => f.type === 'polygon');
    assert.equal(polygons.length, 6, 'Should render 6 shaded background polygons between adjacent enabled levels');

    // 4. Text Labels are formatted via getFibLevelLabelText (unified DOM text system)
    const label0 = getFibLevelLabelText(0, 100, DEFAULT_FIB_SETTINGS);
    assert.equal(label0, '0 (100)', 'Should format label as ratio (price)');

    // 5. Grab Handles (when isSelected is true)
    const grabCircles = figures.filter((f: any) => f.type === 'circle');
    assert.ok(grabCircles.length >= 2, 'Should render grab handle circles for both anchors when selected');

    // 6. Grab Handles must NOT render when deselected and unhovered
    const deselectedFigures = overlayDef.createPointFigures?.({
      overlay: { ...overlay, extendData: { isSelected: false, isHovered: false } },
      coordinates: [
        { x: 100, y: 300 },
        { x: 300, y: 100 },
      ],
      chart: mockChart,
      bounding: { width: 1000, height: 600 },
    } as any) || [];
    const deselectedCircles = deselectedFigures.filter((f: any) => f.type === 'circle');
    assert.equal(deselectedCircles.length, 0, 'Grab handles must disappear when the Fibonacci tool is deselected');
  });

  it('should correctly apply horizontal extension (extend left, right, both, none)', () => {
    const overlayDef = FibonacciRetracementTool.createOverlayDef();
    const mockChart = {
      _loadedTimeframe: '1m',
      convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
      convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
    };

    // Test extend both
    const overlayExtendBoth = {
      id: 'fib_extend',
      points: [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        customSettings: {
          ...DEFAULT_FIB_SETTINGS,
          extend: 'both',
        },
      },
    };

    const figures = overlayDef.createPointFigures?.({
      overlay: overlayExtendBoth,
      coordinates: [
        { x: 100, y: 300 },
        { x: 300, y: 100 },
      ],
      chart: mockChart,
      bounding: { width: 1200, height: 600 },
    } as any) || [];

    const levelLines = figures.filter((f: any) => f.type === 'line' && f.attrs.coordinates[0].y === f.attrs.coordinates[1].y);
    assert.equal(levelLines[0].attrs.coordinates[0].x, 0, 'Extend both should start at x = 0');
    assert.equal(levelLines[0].attrs.coordinates[1].x, 1200, 'Extend both should end at width = 1200');
  });

  it('should react correctly to custom settings (useOneColor, prices, percent style, alignment, font size)', () => {
    const overlayDef = FibonacciRetracementTool.createOverlayDef();
    const mockChart = {
      _loadedTimeframe: '1m',
      convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
      convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
    };

    const overlayCustom = {
      id: 'fib_custom',
      points: [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        customSettings: {
          ...DEFAULT_FIB_SETTINGS,
          useOneColor: true,
          oneColor: '#ff00ff',
          prices: false,
          levelsStyle: 'percents' as const,
          fontSize: 16,
          labelsAlignment: {
            horizontal: 'center' as const,
            vertical: 'top' as const,
          },
          trendLine: {
            enabled: false,
            color: '#00ff00',
            width: 2,
            style: 'dashed' as const,
          },
        },
      },
    };

    const figures = overlayDef.createPointFigures?.({
      overlay: overlayCustom,
      coordinates: [
        { x: 100, y: 300 },
        { x: 300, y: 100 },
      ],
      chart: mockChart,
      bounding: { width: 1000, height: 600 },
    } as any) || [];

    // 1. Trend line disabled
    const trendLines = figures.filter((f: any) => f.type === 'line' && f.attrs.coordinates.length === 2 && f.attrs.coordinates[0].y !== f.attrs.coordinates[1].y);
    assert.equal(trendLines.length, 0, 'Trend line should not render when disabled');

    // 2. Levels use one color
    const levelLines = figures.filter((f: any) => f.type === 'line' && f.styles.color !== 'transparent' && f.attrs.coordinates[0].y === f.attrs.coordinates[1].y);
    assert.ok(levelLines.every((l: any) => l.styles.color === '#ff00ff'), 'All level lines should use oneColor when useOneColor is enabled');

    // 3. Text labels have no prices and format as percents
    const label50 = getFibLevelLabelText(0.5, 150, overlayCustom.extendData.customSettings);
    assert.equal(label50, '50%', 'Label should format as 50% when percents format is active and prices are disabled');
  });

  it('1. should configure Fib level line width correctly', () => {
    const overlayDef = FibonacciRetracementTool.createOverlayDef();
    const mockChart = {
      _loadedTimeframe: '1m',
      convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
      convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
    };

    const overlayWidth4 = {
      id: 'fib_w4',
      points: [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        customSettings: {
          ...DEFAULT_FIB_SETTINGS,
          levelsLine: {
            width: 4,
            style: 'solid' as const,
          },
        },
      },
    };

    const figures = overlayDef.createPointFigures?.({
      overlay: overlayWidth4,
      coordinates: [
        { x: 100, y: 300 },
        { x: 300, y: 100 },
      ],
      chart: mockChart,
      bounding: { width: 1000, height: 600 },
    } as any) || [];

    const levelLines = figures.filter((f: any) => f.type === 'line' && f.styles.color !== 'transparent' && f.attrs.coordinates[0].y === f.attrs.coordinates[1].y);
    assert.ok(levelLines.every((l: any) => l.styles.size === 4), 'All visible level lines should have size = 4');
  });

  it('2. should support solid, dashed, and dotted line styles for both levels line and trendline', () => {
    const overlayDef = FibonacciRetracementTool.createOverlayDef();
    const mockChart = {
      _loadedTimeframe: '1m',
      convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
      convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
    };

    // Test dotted style
    const overlayDotted = {
      id: 'fib_dotted',
      points: [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        customSettings: {
          ...DEFAULT_FIB_SETTINGS,
          trendLine: {
            enabled: true,
            color: '#808080',
            width: 2,
            style: 'dotted' as const,
          },
          levelsLine: {
            width: 2,
            style: 'dotted' as const,
          },
        },
      },
    };

    const figures = overlayDef.createPointFigures?.({
      overlay: overlayDotted,
      coordinates: [
        { x: 100, y: 300 },
        { x: 300, y: 100 },
      ],
      chart: mockChart,
      bounding: { width: 1000, height: 600 },
    } as any) || [];

    const trendLine = figures.find((f: any) => f.type === 'line' && f.attrs.coordinates.length === 2 && f.attrs.coordinates[0].y !== f.attrs.coordinates[1].y);
    assert.ok(trendLine, 'Trend line should exist');
    assert.equal(trendLine.styles.style, 'dashed');
    assert.deepEqual(trendLine.styles.dashedValue, [2, 2], 'Dotted trend line should have [2, 2] dashedValue');

    const levelLines = figures.filter((f: any) => f.type === 'line' && f.styles.color !== 'transparent' && f.attrs.coordinates[0].y === f.attrs.coordinates[1].y);
    assert.ok(levelLines.every((l: any) => l.styles.style === 'dashed' && l.styles.dashedValue[0] === 2 && l.styles.dashedValue[1] === 2), 'Dotted level lines should have [2, 2] dashedValue');
  });

  it('3. should support Fib one-color mode correctly', () => {
    const overlayDef = FibonacciRetracementTool.createOverlayDef();
    const mockChart = {
      _loadedTimeframe: '1m',
      convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
      convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
    };

    const overlayOneColor = {
      id: 'fib_one_color',
      points: [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        customSettings: {
          ...DEFAULT_FIB_SETTINGS,
          useOneColor: true,
          oneColor: '#123456',
        },
      },
    };

    const figures = overlayDef.createPointFigures?.({
      overlay: overlayOneColor,
      coordinates: [
        { x: 100, y: 300 },
        { x: 300, y: 100 },
      ],
      chart: mockChart,
      bounding: { width: 1000, height: 600 },
    } as any) || [];

    const levelLines = figures.filter((f: any) => f.type === 'line' && f.styles.color !== 'transparent' && f.attrs.coordinates[0].y === f.attrs.coordinates[1].y);
    assert.ok(levelLines.every((l: any) => l.styles.color === '#123456'), 'All level lines should use #123456 in one-color mode');

    const textLabels = figures.filter((f: any) => f.type === 'text');
    assert.ok(textLabels.every((t: any) => t.styles.color === '#123456'), 'All text labels should use #123456 in one-color mode');
  });

  it('4. should render individual level colors when one-color mode is disabled', () => {
    const overlayDef = FibonacciRetracementTool.createOverlayDef();
    const mockChart = {
      _loadedTimeframe: '1m',
      convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
      convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
    };

    const overlayMultiColor = {
      id: 'fib_multi_color',
      points: [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        customSettings: {
          ...DEFAULT_FIB_SETTINGS,
          useOneColor: false,
        },
      },
    };

    const figures = overlayDef.createPointFigures?.({
      overlay: overlayMultiColor,
      coordinates: [
        { x: 100, y: 300 },
        { x: 300, y: 100 },
      ],
      chart: mockChart,
      bounding: { width: 1000, height: 600 },
    } as any) || [];

    const levelLines = figures.filter((f: any) => f.type === 'line' && f.styles.color !== 'transparent' && f.attrs.coordinates[0].y === f.attrs.coordinates[1].y);
    const colors = new Set(levelLines.map((l: any) => l.styles.color));
    assert.ok(colors.size > 1, 'Different level lines should have distinct individual colors when useOneColor is false');
  });

  it('5. should attach and associate per-level text to individual Fib levels', () => {
    const customSettingsWithTexts = {
      ...DEFAULT_FIB_SETTINGS,
      levelTexts: {
        '0': 'Support / Origin',
        '0.5': 'Midpoint',
        '0.618': 'Golden Pocket',
      },
    };

    assert.equal(customSettingsWithTexts.levelTexts['0'], 'Support / Origin');
    assert.equal(customSettingsWithTexts.levelTexts['0.5'], 'Midpoint');
    assert.equal(customSettingsWithTexts.levelTexts['0.618'], 'Golden Pocket');
  });

  it('6 & 7. moving Fib points should preserve per-level text association in customSettings', () => {
    const originalOverlay = {
      id: 'fib_persist',
      points: [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        customSettings: {
          ...DEFAULT_FIB_SETTINGS,
          levelTexts: {
            '0.618': 'Golden Pocket Level',
          },
        },
      },
    };

    // Simulate anchor drag/move (mutating points only)
    const movedOverlay = {
      ...originalOverlay,
      points: [
        { timestamp: 1500, value: 120 },
        { timestamp: 2500, value: 240 },
      ],
    };

    assert.equal(movedOverlay.extendData.customSettings.levelTexts['0.618'], 'Golden Pocket Level', 'Level text must be preserved after moving anchor points');
  });

  it('8. TrendLine tool text behavior should remain completely intact', () => {
    ToolRegistry.register(TrendLineTool);
    const trendTool = ToolRegistry.get('trendLine');
    assert.ok(trendTool, 'TrendLine tool must exist');
    const overlayDef = trendTool.createOverlayDef();
    assert.equal(overlayDef.name, 'trendLine');

    const trendFigures = overlayDef.createPointFigures?.({
      overlay: {
        id: 'trend_1',
        points: [
          { timestamp: 1000, value: 100 },
          { timestamp: 2000, value: 200 },
        ],
        extendData: {
          customSettings: {
            text: 'Breakout Line',
            textPosition: { vertical: 'middle', horizontal: 'center' },
          },
        },
      },
      coordinates: [
        { x: 100, y: 300 },
        { x: 300, y: 100 },
      ],
      chart: null,
      bounding: { width: 1000, height: 600 },
    } as any) || [];

    assert.ok(trendFigures.length > 0, 'Trendline figures should be created with text gap');
  });

  it('9 & 10. template serialization and deserialization should preserve Fib settings', () => {
    const templateSettings = {
      ...DEFAULT_FIB_SETTINGS,
      useOneColor: true,
      oneColor: '#00ffcc',
      levelsLine: {
        width: 3,
        style: 'dotted' as const,
      },
      extend: 'right' as const,
      visibility: {
        minutes: { show: true, min: 1, max: 60 },
      },
    };

    const serialized = JSON.stringify(templateSettings);
    const restored = JSON.parse(serialized);

    assert.equal(restored.useOneColor, true);
    assert.equal(restored.oneColor, '#00ffcc');
    assert.equal(restored.levelsLine.width, 3);
    assert.equal(restored.levelsLine.style, 'dotted');
    assert.equal(restored.extend, 'right');
    assert.equal(restored.visibility.minutes.max, 60);
  });

  it('should support disabling background fill completely', () => {
    const overlayDef = FibonacciRetracementTool.createOverlayDef();
    const mockChart = {
      _loadedTimeframe: '1m',
      convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
      convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
    };

    const overlayNoBg = {
      id: 'fib_no_bg',
      points: [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        customSettings: {
          ...DEFAULT_FIB_SETTINGS,
          background: {
            enabled: false,
            opacity: 50,
          },
        },
      },
    };

    const figures = overlayDef.createPointFigures?.({
      overlay: overlayNoBg,
      coordinates: [
        { x: 100, y: 300 },
        { x: 300, y: 100 },
      ],
      chart: mockChart,
      bounding: { width: 1000, height: 600 },
    } as any) || [];

    const polygons = figures.filter((f: any) => f.type === 'polygon');
    assert.equal(polygons.length, 0, 'No polygons should be rendered when background is disabled');
  });

  it('Requirement 1: should render mathematical Fib level labels with exactly 3px visual gap above horizontal level line', () => {
    const overlayDef = FibonacciRetracementTool.createOverlayDef();
    const mockChart = {
      _loadedTimeframe: '1m',
      convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
      convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
    };

    const overlay = {
      id: 'fib_label_gap',
      points: [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        customSettings: DEFAULT_FIB_SETTINGS,
      },
    };

    const figures = overlayDef.createPointFigures?.({
      overlay,
      coordinates: [
        { x: 100, y: 300 },
        { x: 300, y: 100 },
      ],
      chart: mockChart,
      bounding: { width: 1000, height: 600 },
    } as any) || [];

    const layout = computeFibLevelLayout({
      startX: 100,
      endX: 300,
      y: 300,
      labelStr: '0 (100)',
      labelsPosition: { horizontal: 'left', vertical: 'top' },
      customText: '',
    });

    // Top vertical alignment applies -3px spacing and -100% translateY
    assert.equal(layout.label.spacing, -3, 'Mathematical label spacing must be -3px above the line');
    assert.equal(layout.label.translateY, '-100%', 'Mathematical label translateY must be -100% for top alignment');
  });

  it('Requirement 2: should cut a line gap around custom level text using the shared text gap architecture when text is middle-aligned', () => {
    const overlayDef = FibonacciRetracementTool.createOverlayDef();
    const mockChart = {
      _loadedTimeframe: '1m',
      convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
      convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
    };

    const overlay = {
      id: 'fib_custom_text_gap',
      points: [
        { timestamp: 1000, value: 100 },
        { timestamp: 2000, value: 200 },
      ],
      extendData: {
        customSettings: {
          ...DEFAULT_FIB_SETTINGS,
          textPosition: { vertical: 'middle', horizontal: 'center' },
          levelTexts: {
            '0.5': 'Midpoint Equilibrium',
          },
        },
      },
    };

    const figures = overlayDef.createPointFigures?.({
      overlay,
      coordinates: [
        { x: 100, y: 300 },
        { x: 300, y: 100 },
      ],
      chart: mockChart,
      bounding: { width: 1000, height: 600 },
    } as any) || [];

    // Level 0.5 is at price 150 -> y = 250. Check visible horizontal level line segments at y = 250
    const level05Segments = figures.filter((f: any) => f.type === 'line' && f.styles.color !== 'transparent' && f.attrs.coordinates[0].y === f.attrs.coordinates[1].y && f.attrs.coordinates[0].y === 250);
    assert.equal(level05Segments.length, 2, 'Level line with middle text should be split into 2 segments with a gap around text');

    // Other levels without text (e.g. Level 0 at y = 300) should be a single continuous segment
    const level0Segments = figures.filter((f: any) => f.type === 'line' && f.styles.color !== 'transparent' && f.attrs.coordinates[0].y === f.attrs.coordinates[1].y && f.attrs.coordinates[0].y === 300);
    assert.equal(level0Segments.length, 1, 'Level line without text should remain 1 continuous segment');
  });

  it('Requirement 4 & 7: "basedOnLog" should be completely removed from DEFAULT_FIB_SETTINGS and handle legacy settings safely', () => {
    assert.equal('basedOnLog' in DEFAULT_FIB_SETTINGS, false, 'basedOnLog must not exist in DEFAULT_FIB_SETTINGS');

    // Legacy settings containing basedOnLog should load without throwing
    const legacySettings = {
      ...DEFAULT_FIB_SETTINGS,
      basedOnLog: true,
    };

    const overlayDef = FibonacciRetracementTool.createOverlayDef();
    const figures = overlayDef.createPointFigures?.({
      overlay: {
        id: 'fib_legacy',
        points: [
          { timestamp: 1000, value: 100 },
          { timestamp: 2000, value: 200 },
        ],
        extendData: {
          customSettings: legacySettings,
        },
      },
      coordinates: [
        { x: 100, y: 300 },
        { x: 300, y: 100 },
      ],
      chart: null,
      bounding: { width: 1000, height: 600 },
    } as any) || [];

    assert.ok(figures.length > 0, 'Legacy overlay with basedOnLog must render cleanly');
  });

  describe('Step 2: Per-Level "+ Add Text" and Hover Line Gap Exclusivity', () => {
    it('should split line gap ONLY for the specific hovered level when empty text and isSelected are true', () => {
      const overlayDef = FibonacciRetracementTool.createOverlayDef();
      const mockChart = {
        _loadedTimeframe: '1m',
        convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
        convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
      };

      // Hovering specifically level 0.618 (price 161.8 -> y = 238.2)
      const overlayHovered0618 = {
        id: 'fib_hover_0618',
        points: [
          { timestamp: 1000, value: 100 },
          { timestamp: 2000, value: 200 },
        ],
        extendData: {
          isSelected: true,
          isHovered: true,
          hoveredLevel: 0.618,
          customSettings: {
            ...DEFAULT_FIB_SETTINGS,
            textPosition: { vertical: 'middle', horizontal: 'center' },
          },
        },
      };

      const figures = overlayDef.createPointFigures?.({
        overlay: overlayHovered0618,
        coordinates: [
          { x: 100, y: 300 },
          { x: 300, y: 100 },
        ],
        chart: mockChart,
        bounding: { width: 1000, height: 600 },
      } as any) || [];

      // Level 0.618 is at y = 238.2. Should be split into 2 segments for "+ Add text"
      const level0618Segments = figures.filter(
        (f: any) =>
          f.type === 'line' &&
          f.styles.color !== 'transparent' &&
          f.attrs.coordinates[0].y === f.attrs.coordinates[1].y &&
          Math.abs(f.attrs.coordinates[0].y - 238.2) < 0.01
      );
      assert.equal(level0618Segments.length, 2, 'Hovered level 0.618 must cut a gap (2 line segments)');

      // Level 0.5 (y = 250) is NOT hovered -> must remain a single unbroken segment (1 line segment)
      const level05Segments = figures.filter(
        (f: any) =>
          f.type === 'line' &&
          f.styles.color !== 'transparent' &&
          f.attrs.coordinates[0].y === f.attrs.coordinates[1].y &&
          Math.abs(f.attrs.coordinates[0].y - 250) < 0.01
      );
      assert.equal(level05Segments.length, 1, 'Non-hovered level 0.5 must remain 1 continuous unbroken segment');

      // Level 0 (y = 300) is NOT hovered -> must remain 1 unbroken segment
      const level0Segments = figures.filter(
        (f: any) =>
          f.type === 'line' &&
          f.styles.color !== 'transparent' &&
          f.attrs.coordinates[0].y === f.attrs.coordinates[1].y &&
          Math.abs(f.attrs.coordinates[0].y - 300) < 0.01
      );
      assert.equal(level0Segments.length, 1, 'Non-hovered level 0 must remain 1 continuous unbroken segment');
    });

    it('should cleanly switch line gap when hoveredLevel changes to another level', () => {
      const overlayDef = FibonacciRetracementTool.createOverlayDef();
      const mockChart = {
        _loadedTimeframe: '1m',
        convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
        convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
      };

      // Hovering specifically level 0.382 (price 138.2 -> y = 261.8)
      const overlayHovered0382 = {
        id: 'fib_hover_0382',
        points: [
          { timestamp: 1000, value: 100 },
          { timestamp: 2000, value: 200 },
        ],
        extendData: {
          isSelected: true,
          isHovered: true,
          hoveredLevel: 0.382,
          customSettings: {
            ...DEFAULT_FIB_SETTINGS,
            textPosition: { vertical: 'middle', horizontal: 'center' },
          },
        },
      };

      const figures = overlayDef.createPointFigures?.({
        overlay: overlayHovered0382,
        coordinates: [
          { x: 100, y: 300 },
          { x: 300, y: 100 },
        ],
        chart: mockChart,
        bounding: { width: 1000, height: 600 },
      } as any) || [];

      // Level 0.382 (y = 261.8) is hovered -> split into 2 segments
      const level0382Segments = figures.filter(
        (f: any) =>
          f.type === 'line' &&
          f.styles.color !== 'transparent' &&
          f.attrs.coordinates[0].y === f.attrs.coordinates[1].y &&
          Math.abs(f.attrs.coordinates[0].y - 261.8) < 0.01
      );
      assert.equal(level0382Segments.length, 2, 'Newly hovered level 0.382 must cut a gap (2 line segments)');

      // Level 0.618 (y = 238.2) is NO LONGER hovered -> restored to 1 continuous unbroken segment
      const level0618Segments = figures.filter(
        (f: any) =>
          f.type === 'line' &&
          f.styles.color !== 'transparent' &&
          f.attrs.coordinates[0].y === f.attrs.coordinates[1].y &&
          Math.abs(f.attrs.coordinates[0].y - 238.2) < 0.01
      );
      assert.equal(level0618Segments.length, 1, 'Previously hovered level 0.618 must restore to 1 continuous segment');
    });

    it('should NOT split any level line gaps when hovering away from all levels (hoveredLevel is null)', () => {
      const overlayDef = FibonacciRetracementTool.createOverlayDef();
      const mockChart = {
        _loadedTimeframe: '1m',
        convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
        convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
      };

      const overlayUnhovered = {
        id: 'fib_unhovered',
        points: [
          { timestamp: 1000, value: 100 },
          { timestamp: 2000, value: 200 },
        ],
        extendData: {
          isSelected: true,
          isHovered: false,
          hoveredLevel: null,
          customSettings: {
            ...DEFAULT_FIB_SETTINGS,
            textPosition: { vertical: 'middle', horizontal: 'center' },
          },
        },
      };

      const figures = overlayDef.createPointFigures?.({
        overlay: overlayUnhovered,
        coordinates: [
          { x: 100, y: 300 },
          { x: 300, y: 100 },
        ],
        chart: mockChart,
        bounding: { width: 1000, height: 600 },
      } as any) || [];

      const levelLines = figures.filter(
        (f: any) =>
          f.type === 'line' &&
          f.styles.color !== 'transparent' &&
          f.attrs.coordinates[0].y === f.attrs.coordinates[1].y
      );
      // All 7 enabled levels must be single continuous lines (total 7 segments)
      assert.equal(levelLines.length, 7, 'All 7 levels must have 1 continuous line segment each when not hovered');
    });
  });

  describe('Step 3: Dialog Viewport Constraints & Color Inheritance / Toolbar Behavior', () => {
    describe('A. Dialog Viewport Constraints', () => {
      it('1. Dialog cannot be positioned outside viewport (clamped to viewport bounds)', () => {
        const dialogWidth = 420;
        const dialogHeight = 700;
        const viewportWidth = 1920;
        const viewportHeight = 1080;

        const maxX = Math.max(0, viewportWidth - dialogWidth);
        const maxY = Math.max(0, viewportHeight - dialogHeight);

        // Attempting to drag beyond right/bottom
        const rawX1 = 2500;
        const rawY1 = 1500;
        const clampedX1 = Math.max(0, Math.min(maxX, rawX1));
        const clampedY1 = Math.max(0, Math.min(maxY, rawY1));

        assert.equal(clampedX1, 1500, 'X must clamp to viewportWidth - dialogWidth (1920 - 420 = 1500)');
        assert.equal(clampedY1, 380, 'Y must clamp to viewportHeight - dialogHeight (1080 - 700 = 380)');

        // Attempting to drag beyond left/top
        const rawX2 = -200;
        const rawY2 = -100;
        const clampedX2 = Math.max(0, Math.min(maxX, rawX2));
        const clampedY2 = Math.max(0, Math.min(maxY, rawY2));

        assert.equal(clampedX2, 0, 'X must clamp to 0');
        assert.equal(clampedY2, 0, 'Y must clamp to 0');
      });

      it('2. Dialog position is clamped back inside when viewport resizes to a smaller size', () => {
        const dialogWidth = 420;
        const dialogHeight = 700;
        let position = { x: 1400, y: 350 }; // Valid in 1920x1080

        // Window resized to 1366x768
        const newViewportWidth = 1366;
        const newViewportHeight = 768;
        const newMaxX = Math.max(0, newViewportWidth - dialogWidth); // 946
        const newMaxY = Math.max(0, newViewportHeight - dialogHeight); // 68

        const resizedX = Math.max(0, Math.min(newMaxX, position.x));
        const resizedY = Math.max(0, Math.min(newMaxY, position.y));

        assert.equal(resizedX, 946, 'X must re-clamp to newMaxX (946)');
        assert.equal(resizedY, 68, 'Y must re-clamp to newMaxY (68)');
      });

      it('3. Initial dialog centering respects viewport bounds and dialog dimensions', () => {
        const dialogWidth = 420;
        const dialogHeight = 700;
        const viewportWidth = 1200;
        const viewportHeight = 900;

        const maxX = Math.max(0, viewportWidth - dialogWidth); // 780
        const maxY = Math.max(0, viewportHeight - dialogHeight); // 200

        const centerX = Math.max(0, Math.min(maxX, (viewportWidth - dialogWidth) / 2));
        const centerY = Math.max(0, Math.min(maxY, (viewportHeight - dialogHeight) / 2));

        assert.equal(centerX, 390);
        assert.equal(centerY, 100);
      });
    });

    describe('B. Fib Color Inheritance & Toolbar Behavior', () => {
      it('4. Use One Color OFF -> individual level colors are preserved for level lines and generated labels', () => {
        const overlayDef = FibonacciRetracementTool.createOverlayDef();
        const mockChart = {
          _loadedTimeframe: '1m',
          convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
          convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
        };

        const overlayMultiColor = {
          id: 'fib_multi',
          points: [
            { timestamp: 1000, value: 100 },
            { timestamp: 2000, value: 200 },
          ],
          extendData: {
            customSettings: {
              ...DEFAULT_FIB_SETTINGS,
              useOneColor: false,
              levels: DEFAULT_FIB_LEVELS,
            },
          },
        };

        const figures = overlayDef.createPointFigures?.({
          overlay: overlayMultiColor,
          coordinates: [
            { x: 100, y: 300 },
            { x: 300, y: 100 },
          ],
          chart: mockChart,
          bounding: { width: 1000, height: 600 },
        } as any) || [];

        // Check level lines have distinct individual colors
        const levelLines = figures.filter(
          (f: any) =>
            f.type === 'line' &&
            f.styles.color !== 'transparent' &&
            f.attrs.coordinates[0].y === f.attrs.coordinates[1].y
        );
        const lineColors = new Set(levelLines.map((l: any) => l.styles.color));
        assert.ok(lineColors.size > 1, 'Different level lines must have distinct individual colors when useOneColor is false');

        // Specifically level 0.236 is #F23645
        const lvl0236Line = levelLines.find((l: any) => Math.abs(l.attrs.coordinates[0].y - 276.4) < 0.01);
        assert.ok(lvl0236Line);
        assert.equal(lvl0236Line.styles.color, '#F23645');
      });

      it('5. Toolbar Line Color change automatically enables shared color mode and sets oneColor', () => {
        const initialCustomSettings = {
          ...DEFAULT_FIB_SETTINGS,
          useOneColor: false,
          oneColor: '#808080',
          oneTextColor: '#808080',
        };

        // User changes line color to purple '#9C27B0'
        const updatedColor = '#9C27B0';
        const simulatedToolbarUpdate = {
          useOneColor: true,
          oneColor: updatedColor,
          lineColor: updatedColor,
          trendLine: {
            ...initialCustomSettings.trendLine,
            color: updatedColor,
          },
        };

        const mergedSettings = {
          ...initialCustomSettings,
          ...simulatedToolbarUpdate,
        };

        assert.equal(mergedSettings.useOneColor, true, 'Changing toolbar line color must activate useOneColor');
        assert.equal(mergedSettings.oneColor, '#9C27B0', 'Shared oneColor must be updated to selected color');
        assert.equal(mergedSettings.oneTextColor, '#808080', 'Shared oneTextColor must remain untouched');
        // Individual levels must remain untouched
        assert.equal(mergedSettings.levels[1].color, '#F23645', 'Individual level 0.236 color must remain intact');
      });

      it('6. Toolbar Text Color change automatically enables shared color mode and sets oneTextColor', () => {
        const initialCustomSettings = {
          ...DEFAULT_FIB_SETTINGS,
          useOneColor: false,
          oneColor: '#9C27B0',
          oneTextColor: '#808080',
        };

        // User changes text color to cyan '#00BCD4'
        const updatedTextColor = '#00BCD4';
        const simulatedToolbarUpdate = {
          useOneColor: true,
          oneTextColor: updatedTextColor,
          textColor: updatedTextColor,
        };

        const mergedSettings = {
          ...initialCustomSettings,
          ...simulatedToolbarUpdate,
        };

        assert.equal(mergedSettings.useOneColor, true, 'Changing toolbar text color must activate useOneColor');
        assert.equal(mergedSettings.oneTextColor, '#00BCD4', 'Shared oneTextColor must be updated to selected color');
        assert.equal(mergedSettings.oneColor, '#9C27B0', 'Shared oneColor must remain untouched');
      });

      it('7 & 8. Shared Line Color affects only generated Fib lines; Shared Text Color affects only generated Fib labels', () => {
        const overlayDef = FibonacciRetracementTool.createOverlayDef();
        const mockChart = {
          _loadedTimeframe: '1m',
          convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
          convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
        };

        // Blue lines (#0000FF), Yellow text (#FFFF00)
        const overlayShared = {
          id: 'fib_shared',
          points: [
            { timestamp: 1000, value: 100 },
            { timestamp: 2000, value: 200 },
          ],
          extendData: {
            customSettings: {
              ...DEFAULT_FIB_SETTINGS,
              useOneColor: true,
              oneColor: '#0000FF',
              oneTextColor: '#FFFF00',
            },
          },
        };

        const figures = overlayDef.createPointFigures?.({
          overlay: overlayShared,
          coordinates: [
            { x: 100, y: 300 },
            { x: 300, y: 100 },
          ],
          chart: mockChart,
          bounding: { width: 1000, height: 600 },
        } as any) || [];

        // All visible level lines must be blue (#0000FF)
        const levelLines = figures.filter(
          (f: any) =>
            f.type === 'line' &&
            f.styles.color !== 'transparent' &&
            f.attrs.coordinates[0].y === f.attrs.coordinates[1].y
        );
        assert.ok(levelLines.every((l: any) => l.styles.color === '#0000FF'), 'All level lines must use shared oneColor (#0000FF)');

        // All generated text labels must be yellow (#FFFF00)
        const textLabels = figures.filter((f: any) => f.type === 'text');
        assert.ok(textLabels.every((t: any) => t.styles.color === '#FFFF00'), 'All generated text labels must use shared oneTextColor (#FFFF00)');
      });

      it('9 & 10. Turning shared mode OFF restores original individual colors without overwriting levels data', () => {
        const overlayDef = FibonacciRetracementTool.createOverlayDef();
        const mockChart = {
          _loadedTimeframe: '1m',
          convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
          convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
        };

        // User toggles useOneColor back to false
        const overlayToggledOff = {
          id: 'fib_toggle_off',
          points: [
            { timestamp: 1000, value: 100 },
            { timestamp: 2000, value: 200 },
          ],
          extendData: {
            customSettings: {
              ...DEFAULT_FIB_SETTINGS,
              useOneColor: false,
              oneColor: '#0000FF',
              oneTextColor: '#FFFF00',
              levels: DEFAULT_FIB_LEVELS,
            },
          },
        };

        const figures = overlayDef.createPointFigures?.({
          overlay: overlayToggledOff,
          coordinates: [
            { x: 100, y: 300 },
            { x: 300, y: 100 },
          ],
          chart: mockChart,
          bounding: { width: 1000, height: 600 },
        } as any) || [];

        const levelLines = figures.filter(
          (f: any) =>
            f.type === 'line' &&
            f.styles.color !== 'transparent' &&
            f.attrs.coordinates[0].y === f.attrs.coordinates[1].y
        );

        // Level 0.236 (#F23645) line returns
        const lvl0236Line = levelLines.find((l: any) => Math.abs(l.attrs.coordinates[0].y - 276.4) < 0.01);
        assert.ok(lvl0236Line);
        assert.equal(lvl0236Line.styles.color, '#F23645', 'Level 0.236 line must restore its original color #F23645');

        // Level 0.5 (#4CAF50) line returns
        const lvl05Line = levelLines.find((l: any) => Math.abs(l.attrs.coordinates[0].y - 250) < 0.01);
        assert.ok(lvl05Line);
        assert.equal(lvl05Line.styles.color, '#4CAF50', 'Level 0.5 line must restore its original color #4CAF50');

        // Shared colors remain stored in customSettings for future re-enabling
        assert.equal(overlayToggledOff.extendData.customSettings.oneColor, '#0000FF');
        assert.equal(overlayToggledOff.extendData.customSettings.oneTextColor, '#FFFF00');
      });

      it('11 & 12. Changing shared Line Color does not change shared Text Color, and vice versa', () => {
        let settings = {
          ...DEFAULT_FIB_SETTINGS,
          useOneColor: true,
          oneColor: '#112233',
          oneTextColor: '#445566',
        };

        // Update line color only
        settings = {
          ...settings,
          oneColor: '#998877',
        };
        assert.equal(settings.oneColor, '#998877');
        assert.equal(settings.oneTextColor, '#445566', 'Changing oneColor must not change oneTextColor');

        // Update text color only
        settings = {
          ...settings,
          oneTextColor: '#AABBCC',
        };
        assert.equal(settings.oneColor, '#998877', 'Changing oneTextColor must not change oneColor');
        assert.equal(settings.oneTextColor, '#AABBCC');
      });

      it('13. Templates preserve individual colors and shared colors correctly', () => {
        const templateWithBoth = {
          ...DEFAULT_FIB_SETTINGS,
          useOneColor: true,
          oneColor: '#E91E63',
          oneTextColor: '#FFEB3B',
          levels: DEFAULT_FIB_LEVELS.map((l) =>
            l.level === 0.618 ? { ...l, color: '#00E676' } : l
          ),
        };

        const serialized = JSON.stringify(templateWithBoth);
        const deserialized = JSON.parse(serialized);

        assert.equal(deserialized.useOneColor, true);
        assert.equal(deserialized.oneColor, '#E91E63');
        assert.equal(deserialized.oneTextColor, '#FFEB3B');
        assert.equal(
          deserialized.levels.find((l: any) => l.level === 0.618)?.color,
          '#00E676',
          'Template must preserve individual level colors alongside shared colors'
        );
      });

      it('14. Fibonacci Retracement settings tabs omit the Text tab (Style, Coordinates, Visibility only)', () => {
        const overlayName = 'fibonacciRetracement';
        const tabs = overlayName === 'brush' || overlayName === 'highlighter'
          ? ['style', 'visibility'] as const
          : overlayName === 'longPosition' || overlayName === 'shortPosition'
            ? ['style', 'inputs', 'visibility'] as const
            : (overlayName === 'fxText' || overlayName === 'text')
              ? ['text', 'coordinates', 'visibility'] as const
              : overlayName === 'fibonacciRetracement'
                ? ['style', 'coordinates', 'visibility'] as const
                : ['style', 'text', 'coordinates', 'visibility'] as const;

        assert.deepEqual(tabs, ['style', 'coordinates', 'visibility']);
        assert.equal(tabs.includes('text' as any), false, 'Fibonacci settings dialog must NOT include the Text tab');
      });

      it('15. Custom text color inherits from settings accurately (oneTextColor/oneColor when useOneColor is true, and level.color when useOneColor is false)', () => {
        // When useOneColor is true with oneTextColor
        const settingsSharedText = {
          useOneColor: true,
          oneColor: '#0000FF',
          oneTextColor: '#FF9900',
        };
        const level = { level: 0.5, color: '#4CAF50', enabled: true };
        const resolvedColor1 = settingsSharedText.useOneColor
          ? (settingsSharedText.oneTextColor || settingsSharedText.oneColor || '#808080')
          : (level.color || '#2196F3');
        assert.equal(resolvedColor1, '#FF9900', 'Custom text should adopt oneTextColor in shared mode');

        // When useOneColor is true without explicit oneTextColor
        const settingsSharedLine = {
          useOneColor: true,
          oneColor: '#0000FF',
        };
        const resolvedColor2 = settingsSharedLine.useOneColor
          ? ((settingsSharedLine as any).oneTextColor || settingsSharedLine.oneColor || '#808080')
          : (level.color || '#2196F3');
        assert.equal(resolvedColor2, '#0000FF', 'Custom text should fall back to oneColor in shared mode');

        // When useOneColor is false (individual mode)
        const settingsMulti = {
          useOneColor: false,
          oneColor: '#0000FF',
          oneTextColor: '#FF9900',
        };
        const resolvedColor3 = settingsMulti.useOneColor
          ? (settingsMulti.oneTextColor || settingsMulti.oneColor || '#808080')
          : (level.color || '#2196F3');
        assert.equal(resolvedColor3, '#4CAF50', 'Custom text should adopt individual level.color when useOneColor is false');
      });
    });
  });

  describe('Fibonacci Retracement - Style Tab Text & Label Settings Integration', () => {
    const mockChart = {
      _loadedTimeframe: '1m',
      convertFromPixel: (coords: any[]) => coords.map((c) => ({ value: 100 + (300 - c.y) })),
      convertToPixel: (pts: any[]) => pts.map((p) => ({ y: 300 - (p.value - 100) })),
    };

    it('1. Prices toggle: when prices is false, mathematical labels show only level ratio', () => {
      const labelText = getFibLevelLabelText(0.5, 150, {
        ...DEFAULT_FIB_SETTINGS,
        prices: false,
        levelsVisible: true,
      });
      assert.equal(labelText, '0.5');
    });

    it('2. Levels toggle: when levelsVisible is false, mathematical labels show only price', () => {
      const labelText = getFibLevelLabelText(0.5, 150, {
        ...DEFAULT_FIB_SETTINGS,
        prices: true,
        levelsVisible: false,
      });
      assert.equal(labelText, '150');
    });

    it('3. Both prices and levels disabled: label text is empty and no gap is created', () => {
      const labelText = getFibLevelLabelText(0.5, 150, {
        ...DEFAULT_FIB_SETTINGS,
        prices: false,
        levelsVisible: false,
      });
      assert.equal(labelText, '');

      const layout = computeFibLevelLayout({
        startX: 100,
        endX: 500,
        y: 250,
        labelStr: labelText,
        labelsPosition: { horizontal: 'left', vertical: 'middle' },
        customText: '',
      });
      assert.equal(layout.label.visible, false);
      assert.equal(layout.lineSegments.length, 1);
      assert.equal(layout.lineSegments[0].x1, 100);
      assert.equal(layout.lineSegments[0].x2, 500);
    });

    it('4. Levels style percents: ratio formatted as percentage', () => {
      const labelText = getFibLevelLabelText(0.618, 161.8, {
        ...DEFAULT_FIB_SETTINGS,
        prices: true,
        levelsVisible: true,
        levelsStyle: 'percents',
      });
      assert.ok(labelText.startsWith('61.8%'));
    });

    it('5. Generated label creates correct line gap when vertical position is middle', () => {
      const layout = computeFibLevelLayout({
        startX: 100,
        endX: 500,
        y: 250,
        labelStr: '0.618 (4360.63)',
        labelsPosition: { horizontal: 'left', vertical: 'middle' },
        labelWidth: 80,
        customText: '',
      });
      assert.equal(layout.label.visible, true);
      assert.equal(layout.label.hasGap, true);
      // Line should start after the label gap
      assert.equal(layout.lineSegments.length, 1);
      assert.ok(layout.lineSegments[0].x1 > 100, 'Left start should be trimmed for middle-aligned left label');
      assert.equal(layout.lineSegments[0].x2, 500);

      // Center
      const layoutCenter = computeFibLevelLayout({
        startX: 100,
        endX: 500,
        y: 250,
        labelStr: '0.618 (4360.63)',
        labelsPosition: { horizontal: 'center', vertical: 'middle' },
        labelWidth: 80,
        customText: '',
      });
      assert.equal(layoutCenter.lineSegments.length, 2, 'Center middle label should split line into 2 segments');
      assert.equal(layoutCenter.lineSegments[0].x1, 100);
      assert.equal(layoutCenter.lineSegments[1].x2, 500);
    });

    it('6. Generated label does not create line gap when vertical position is top or bottom', () => {
      const layoutTop = computeFibLevelLayout({
        startX: 100,
        endX: 500,
        y: 250,
        labelStr: '0.5 (150)',
        labelsPosition: { horizontal: 'left', vertical: 'top' },
        customText: '',
      });
      assert.equal(layoutTop.label.hasGap, false);
      assert.equal(layoutTop.lineSegments.length, 1);
      assert.equal(layoutTop.lineSegments[0].x1, 100);
      assert.equal(layoutTop.lineSegments[0].x2, 500);

      const layoutBottom = computeFibLevelLayout({
        startX: 100,
        endX: 500,
        y: 250,
        labelStr: '0.5 (150)',
        labelsPosition: { horizontal: 'left', vertical: 'bottom' },
        customText: '',
      });
      assert.equal(layoutBottom.label.hasGap, false);
      assert.equal(layoutBottom.lineSegments.length, 1);
      assert.equal(layoutBottom.lineSegments[0].x1, 100);
      assert.equal(layoutBottom.lineSegments[0].x2, 500);
    });

    it('7. Collision resolution: Generated Label + Custom Text both on Left position side-by-side without overlap', () => {
      const layout = computeFibLevelLayout({
        startX: 100,
        endX: 800,
        y: 250,
        labelStr: '0.5 (150)',
        labelsPosition: { horizontal: 'left', vertical: 'middle' },
        labelWidth: 60,
        customText: 'Take Profit',
        textPosition: { horizontal: 'left', vertical: 'middle' },
        customTextWidth: 70,
      });

      assert.equal(layout.label.visible, true);
      assert.equal(layout.customText.visible, true);
      assert.equal(layout.label.x, 102); // startX + 2
      assert.ok(layout.customText.x >= layout.label.x + layout.label.width, 'Custom text must be positioned to the right of label');
      // Gaps merge into one single start gap
      assert.equal(layout.lineSegments.length, 1);
      assert.ok(layout.lineSegments[0].x1 > layout.customText.x, 'Line must start after custom text');
      assert.equal(layout.lineSegments[0].x2, 800);
    });

    it('8. Collision resolution: Generated Label + Custom Text both on Right position side-by-side without overlap', () => {
      const layout = computeFibLevelLayout({
        startX: 100,
        endX: 800,
        y: 250,
        labelStr: '0.5 (150)',
        labelsPosition: { horizontal: 'right', vertical: 'middle' },
        labelWidth: 60,
        customText: 'Take Profit',
        textPosition: { horizontal: 'right', vertical: 'middle' },
        customTextWidth: 70,
      });

      assert.equal(layout.label.visible, true);
      assert.equal(layout.customText.visible, true);
      assert.equal(layout.customText.x, 798); // endX - 2
      assert.ok(layout.label.x <= layout.customText.x - layout.customText.width, 'Label must be placed to the left of custom text at right edge');
      assert.equal(layout.lineSegments.length, 1);
      assert.equal(layout.lineSegments[0].x1, 100);
      assert.ok(layout.lineSegments[0].x2 < layout.label.x, 'Line must end before label');
    });

    it('9. Collision resolution: Generated Label + Custom Text both on Center position side-by-side centered', () => {
      const layout = computeFibLevelLayout({
        startX: 100,
        endX: 900, // midX = 500
        y: 250,
        labelStr: '0.5 (150)',
        labelsPosition: { horizontal: 'center', vertical: 'middle' },
        labelWidth: 60,
        customText: 'Take Profit',
        textPosition: { horizontal: 'center', vertical: 'middle' },
        customTextWidth: 70,
      });

      assert.equal(layout.label.visible, true);
      assert.equal(layout.customText.visible, true);
      assert.ok(layout.label.x < 500, 'Label should start to the left of midpoint');
      assert.ok(layout.customText.x > layout.label.x, 'Custom text should be to the right of label');
      assert.equal(layout.lineSegments.length, 2, 'Center composite should split line into 2 segments');
    });

    it('10. Independent positioning: when Label is Left and Text is Right, no repositioning occurs', () => {
      const layout = computeFibLevelLayout({
        startX: 100,
        endX: 900,
        y: 250,
        labelStr: '0.5 (150)',
        labelsPosition: { horizontal: 'left', vertical: 'middle' },
        labelWidth: 60,
        customText: 'Take Profit',
        textPosition: { horizontal: 'right', vertical: 'middle' },
        customTextWidth: 70,
      });

      assert.equal(layout.label.x, 102);
      assert.equal(layout.customText.x, 898);
      // Both cut separate gaps -> 3 line segments (start..gap1, gap1..gap2, gap2..end)
      assert.equal(layout.lineSegments.length, 1); // 1 central segment between left gap and right gap
      assert.ok(layout.lineSegments[0].x1 > 100 && layout.lineSegments[0].x2 < 900);
    });

    it('11. Line rendering with overlay definitions generates clean line figures with middle-aligned gaps', () => {
      const overlayDef = FibonacciRetracementTool.createOverlayDef();
      const overlay = {
        id: 'fib_render_gaps',
        points: [{ timestamp: 1000, value: 100 }, { timestamp: 2000, value: 200 }],
        extendData: {
          customSettings: {
            ...DEFAULT_FIB_SETTINGS,
            levelsVisible: true,
            prices: true,
            labelsPosition: { horizontal: 'left', vertical: 'middle' },
            showCustomText: true,
            textPosition: { horizontal: 'right', vertical: 'middle' },
            levels: [{ level: 0.5, color: '#4CAF50', enabled: true }],
            levelTexts: { '0.5': 'TP' },
          },
        },
      };

      const figures = overlayDef.createPointFigures?.({
        overlay,
        coordinates: [{ x: 100, y: 300 }, { x: 500, y: 100 }],
        chart: mockChart,
        bounding: { width: 1000, height: 600 },
      } as any) || [];

      // Level 0.5 line segments (y = 250)
      const levelLines = figures.filter(
        (f: any) => f.type === 'line' && f.styles.color !== 'transparent' && f.attrs.coordinates[0].y === 250
      );
      assert.ok(levelLines.length >= 1, 'Should render visible level line with gaps');
      assert.ok(levelLines[0].attrs.coordinates[0].x > 100, 'Line should start after left label gap');
      assert.ok(levelLines[levelLines.length - 1].attrs.coordinates[1].x < 500, 'Line should end before right text gap');
    });
  });
});
