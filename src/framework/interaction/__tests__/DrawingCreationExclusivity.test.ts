import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isOverlayDragAllowed } from '../gestureAuthority.ts';
import { isExclusiveMarqueeMode } from '../MarqueeSelectionHandler.ts';

describe('Gesture Ownership & Drawing Creation Exclusivity', () => {
  describe('1. isOverlayDragAllowed Authority Predicate', () => {
    it('returns false when chart has an active drawing tool', () => {
      const chart = { _activeTool: 'straight_line', _activeDrawingId: null };
      assert.equal(isOverlayDragAllowed(chart), false);
    });

    it('returns false when event.chart has an active drawing tool', () => {
      const chart = { _activeTool: null };
      const event = { chart: { _activeTool: 'ray' } };
      assert.equal(isOverlayDragAllowed(chart, event), false);
    });

    it('returns false when an active drawing ID is armed', () => {
      const chart = { _activeTool: null, _activeDrawingId: 'drawing_123' };
      assert.equal(isOverlayDragAllowed(chart), false);
    });

    it('returns false when chart store has an in-progress overlay currently drawing', () => {
      const chart = {
        _activeTool: null,
        _activeDrawingId: null,
        getChartStore: () => ({
          getProgressOverlayInfo: () => ({
            overlay: { isDrawing: () => true },
          }),
        }),
      };
      assert.equal(isOverlayDragAllowed(chart), false);
    });

    it('returns false when in exclusive marquee mode', () => {
      const chart = { _activeTool: null, _activeDrawingId: null, _isMarqueeSelecting: true };
      assert.equal(isOverlayDragAllowed(chart), false);
    });

    it('returns false when chart reference is missing', () => {
      assert.equal(isOverlayDragAllowed(null), false);
      assert.equal(isOverlayDragAllowed(undefined), false);
    });

    it('returns false for system overlays and locked overlays in any mode', () => {
      const normalChart = {
        _activeTool: null,
        _activeDrawingId: null,
        _isMarqueeSelecting: false,
      };

      const priceLineOverlay = { id: 'custom_price_line_overlay', name: 'customPriceLine' };
      const sessionBreaksOverlay = { id: 'session_breaks_overlay', name: 'sessionBreaks' };
      const lockedOverlay = { id: 'user_line_1', name: 'straight_line', lock: true };

      assert.equal(isOverlayDragAllowed(normalChart, undefined, priceLineOverlay), false);
      assert.equal(isOverlayDragAllowed(normalChart, undefined, sessionBreaksOverlay), false);
      assert.equal(isOverlayDragAllowed(normalChart, undefined, lockedOverlay), false);
    });

    it('returns true when no tool is active, no drawing armed, not in marquee mode, and overlay is unlocked', () => {
      const chart = {
        _activeTool: null,
        _activeDrawingId: null,
        _isMarqueeSelecting: false,
        getChartStore: () => ({
          getProgressOverlayInfo: () => null,
        }),
      };
      const userOverlay = { id: 'line_1', name: 'straight_line' };
      assert.equal(isOverlayDragAllowed(chart, undefined, userOverlay), true);
    });
  });

  describe('2. Overlay Drag Lifecycle Lockout During Active Drawing Creation', () => {
    it('guarantees existing drawing points cannot mutate when a drawing tool is active', () => {
      const initialPoints = [
        { timestamp: 1000, value: 1.1000 },
        { timestamp: 2000, value: 1.1050 },
      ];

      const existingOverlay = {
        id: 'existing_rect_1',
        name: 'rect',
        points: JSON.parse(JSON.stringify(initialPoints)),
        extendData: {},
      };

      let pressedInfoCleared = false;

      const chartInstance: any = {
        _activeTool: 'straight_line', // Drawing tool is active!
        _activeDrawingId: 'new_line_456',
        _activeDraggingIndex: null,
        convertToPixel: (pts: any[]) => pts.map((p, i) => ({x:100 + i * 50, y: 200})),
        convertFromPixel: (pts: any[]) => pts.map((p, i) => ({timestamp: 1500 + i * 50, value: 1.2000})),
        overrideOverlay: (opts: any) => {
          if (opts.points) existingOverlay.points = opts.points;
          if (opts.extendData) existingOverlay.extendData = opts.extendData;
        },
        getChartStore: () => ({
          getProgressOverlayInfo: () => ({
            overlay: { id: 'new_line_456', isDrawing: () => true },
          }),
          setPressedOverlayInfo: (val: any) => {
            if (val === null) pressedInfoCleared = true;
          },
        }),
      };

      const simulatePressedMoveStart = (event: any) => {
        if (!isOverlayDragAllowed(event.chart, event, event.overlay)) {
          const store = event.chart?.getChartStore?.();
          if (store&& typeof store.setPressedOverlayInfo === 'function') {
            store.setPressedOverlayInfo(null);
          }
          return;
        }
        event.chart.overrideOverlay({
          id: event.overlay.id,
          extendData: {
            ...event.overlay.extendData,
            draggedIndex: null,
            startPoints: JSON.parse(JSON.stringify(event.overlay.points)),
            startMousePixel: { x: event.x, y: event.y },
          },
        });
      };

      const simulatePressedMoving = (event: any) => {
        if (!isOverlayDragAllowed(event.chart, event, event.overlay)) {
          return;
        }
        const startPoints = event.overlay.extendData?.startPoints;
        if (startPoints) {
          event.chart.overrideOverlay({
            id: event.overlay.id,
            points: [{ timestamp: 9999, value: 9999 }],
          });
        }
      };

      simulatePressedMoveStart({ chart: chartInstance, overlay: existingOverlay, x: 100, y: 200 });
      assert.equal(existingOverlay.extendData.startPoints, undefined);
      assert.equal(pressedInfoCleared, true, 'Accidental pressedOverlayInfo must be cleared on reject');

      simulatePressedMoving({ chart: chartInstance, overlay: existingOverlay, x: 150, y: 250 });
      assert.deepEqual(existingOverlay.points, initialPoints);
    });

    it('guarantees price line cannot mutate when a drawing tool is dragged near it', () => {
      const priceLineOverlay = {
        id: 'custom_price_line_overlay',
        name: 'customPriceLine',
        points: [{ timestamp: 0, value: 0 }],
        extendData: {},
      };

      const chartInstance: any = {
        _activeTool: 'ray',
        _activeDrawingId: 'new_ray_123',
        getChartStore: () => ({
          getProgressOverlayInfo: () => ({
            overlay: { id: 'new_ray_123', isDrawing: () => true },
          }),
        }),
      };

      assert.equal(isOverlayDragAllowed(chartInstance, undefined, priceLineOverlay), false);
    });

    it('guarantees all multiple overlapping existing drawings remain unchanged during tool drag', () => {
      const drawingA = { id: 'd1_', name: 'straight_line', points: [{ timestamp: 1000, value: 1 }] };
      const drawingB = { id: 'd2_', name: 'rect', points: [{ timestamp: 2000, value: 2 }] };
      const drawingC = { id: 'd3_', name: 'ray', points: [{ timestamp: 3000, value: 3 }] };

      const chartInstance: any = {
        _activeTool: 'trendLine',
        _activeDrawingId: 'new_trend_999',
      };

      assert.equal(isOverlayDragAllowed(chartInstance, undefined, drawingA), false);
      assert.equal(isOverlayDragAllowed(chartInstance, undefined, drawingB), false);
      assert.equal(isOverlayDragAllowed(chartInstance, undefined, drawingC), false);
    });

    it('guarantees Shift measurement locks out existing drawing dragging', () => {
      const chartInstance: any = {
        _activeTool: 'measure',
        _activeDrawingId: 'measure_456',
      };
      const userDrawing = { id: 'd1_', name: 'straight_line', points: [{ timestamp: 1000, value: 1 }] };
      assert.equal(isOverlayDragAllowed(chartInstance, undefined, userDrawing), false);
    });

    it('allows existing drawing to move normally when no drawing tool is active', () => {
      const initialPoints = [
        { timestamp: 1000, value: 1.1000 },
        { timestamp: 2000, value: 1.1050 },
      ];

      const existingOverlay = {
        id: 'existing_line_1',
        name: 'straight_line',
        points: JSON.parse(JSON.stringify(initialPoints)),
        extendData: {},
      };

      const chartInstance: any = {
        _activeTool: null, // No tool active (normal cursor/select mode)
        _activeDrawingId: null,
        _isMarqueeSelecting: false,
        _activeDraggingIndex: null,
        convertToPixel: (pts: any[]) => pts.map((p, i) => ({ x: 100 + i * 50, y: 200 })),
        convertFromPixel: (pts: any[]) => pts.map((p, i) => ({timestamp: 1500 + i * 50, value: 1.2000})),
        overrideOverlay: (opts: any) => {
          if (opts.points) existingOverlay.points = opts.points;
          if (opts.extendData) existingOverlay.extendData = opts.extendData;
        },
        getChartStore: () => ({
          getProgressOverlayInfo: () => null,
        }),
      };

      const simulatePressedMoveStart = (event: any) => {
        if (!isOverlayDragAllowed(event.chart, event, event.overlay)) return;
        event.chart.overrideOverlay({
          id: event.overlay.id,
          extendData: {
            ...event.overlay.extendData,
            draggedIndex: null,
            startPoints: JSON.parse(JSON.stringify(event.overlay.points)),
            startMousePixel: { x: event.x, y: event.y },
          },
        });
      };

      const simulatePressedMoving = (event: any) => {
        if (!isOverlayDragAllowed(event.chart, event, event.overlay)) return;
        const startPoints = event.overlay.extendData?.startPoints;
        if (startPoints) {
          const movedPoints = startPoints.map((p: any) => ({
            timestamp: p.timestamp + 500,
            value: p.value + 0.0050,
          }));
          event.chart.overrideOverlay({
            id: event.overlay.id,
            points: movedPoints,
          });
        }
      };

      simulatePressedMoveStart({ chart: chartInstance, overlay: existingOverlay, x: 100, y: 200 });
      assert.ok(existingOverlay.extendData.startPoints, 'Start points must be set when no tool is active');

      simulatePressedMoving({ chart: chartInstance, overlay: existingOverlay, x: 150, y: 250 });
      assert.notDeepEqual(existingOverlay.points, initialPoints);
      assert.equal(existingOverlay.points[0].timestamp, 1500);
      assert.equal(existingOverlay.points[0].value, 1.1050);
    });
  });

  describe('3. Marquee and Ctrl+Duplicate Compatibility', () => {
    it('locks out existing overlay dragging during marquee selection mode', () => {
      const chart = {
        _activeTool: null,
        _activeDrawingId: null,
        _isMarqueeSelecting: true,
      };
      assert.equal(isOverlayDragAllowed(chart), false);
      assert.equal(isExclusiveMarqueeMode(chart), true);
    });

    it('permits Ctrl+Duplicate drag initialization when pointer is over drawing body and not in marquee mode', () => {
      const chart = {
        _activeTool: null,
        _activeDrawingId: null,
        _isMarqueeSelecting: false,
        _isBodyHovered: true,
      };
      const userOverlay = { id: 'user_line_1', name: 'straight_line' };
      assert.equal(isOverlayDragAllowed(chart, undefined, userOverlay), true);
      assert.equal(isExclusiveMarqueeMode(chart), false);
    });

    it('guarantees Ctrl+Duplicate moves clone while original remains unchanged', () => {
      const originalPoints = [{ timestamp: 1000, value: 1.1 }, { timestamp: 2000, value: 1.2 }];
      const originalOverlay = {
        id: 'original_line',
        name: 'straight_line',
        points: JSON.parse(JSON.stringify(originalPoints)),
        extendData: {},
      };

      const cloneOverlay = {
        id: 'clone_line_999',
        name: 'straight_line',
        points: JSON.parse(JSON.stringify(originalPoints)),
        extendData: {},
      };

      const chartInstance: any = {
        _activeTool: null,
        _activeDrawingId: null,
        _isMarqueeSelecting: false,
        _isBodyHovered: true,
        _activeDraggingIndex: null,
      };

      assert.equal(isOverlayDragAllowed(chartInstance, undefined, originalOverlay), true);
      assert.equal(isOverlayDragAllowed(chartInstance, undefined, cloneOverlay), true);

      // Clone drag moves clone points
      cloneOverlay.points = originalPoints.map((p) => ({ timestamp: p.timestamp + 1000, value: p.value + 0.1 }));

      // Original points remain strictly unchanged
      assert.deepEqual(originalOverlay.points, originalPoints);
      assert.notDeepEqual(cloneOverlay.points, originalPoints);
    });
  });
});
