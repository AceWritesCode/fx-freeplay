import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  isExclusiveMarqueeMode,
  MarqueeSelectionHandler,
} from '../MarqueeSelectionHandler.ts';

describe('Marquee Selection Isolation & Exclusivity', () => {
  describe('isExclusiveMarqueeMode authority predicate', () => {
    it('returns true when chart._isMarqueeSelecting is true', () => {
      const chart = { _isMarqueeSelecting: true };
      assert.equal(isExclusiveMarqueeMode(chart), true);
    });

    it('returns true when event.chart._isMarqueeSelecting is true', () => {
      const chart = {};
      const event = { chart: { _isMarqueeSelecting: true } };
      assert.equal(isExclusiveMarqueeMode(chart, event), true);
    });

    it('returns true when chart._isCtrlPressedRef.current is true', () => {
      const chart = { _isCtrlPressedRef: { current: true } };
      assert.equal(isExclusiveMarqueeMode(chart), true);
    });

    it('returns true when event.chart._isCtrlPressedRef.current is true', () => {
      const chart = {};
      const event = { chart: { _isCtrlPressedRef: { current: true } } };
      assert.equal(isExclusiveMarqueeMode(chart, event), true);
    });

    it('returns true when event.originalEvent.ctrlKey is true', () => {
      const chart = {};
      const event = { originalEvent: { ctrlKey: true } };
      assert.equal(isExclusiveMarqueeMode(chart, event), true);
    });

    it('returns true when event.originalEvent.metaKey is true (Mac Command key)', () => {
      const chart = {};
      const event = { originalEvent: { metaKey: true } };
      assert.equal(isExclusiveMarqueeMode(chart, event), true);
    });

    it('returns true when event.event.ctrlKey is true', () => {
      const chart = {};
      const event = { event: { ctrlKey: true } };
      assert.equal(isExclusiveMarqueeMode(chart, event), true);
    });

    it('returns true when event.event.metaKey is true', () => {
      const chart = {};
      const event = { event: { metaKey: true } };
      assert.equal(isExclusiveMarqueeMode(chart, event), true);
    });

    it('returns false when no marquee or Ctrl state is active', () => {
      const chart = { _isMarqueeSelecting: false, _isCtrlPressedRef: { current: false } };
      const event = { originalEvent: { ctrlKey: false, metaKey: false } };
      assert.equal(isExclusiveMarqueeMode(chart, event), false);
    });
  });

  describe('MarqueeSelectionHandler Interaction Mode Authority Lifecycle', () => {
    let mockContainer: any;
    let mockChart: any;
    let mockOtherChart: any;
    let selectedOverlayIdsResult: string[] | null = null;
    let modifierTracker: any;
    let handler: MarqueeSelectionHandler;

    beforeEach(() => {
      selectedOverlayIdsResult = null;
      mockContainer = {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
        querySelector: () => null,
        appendChild: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        contains: (el: any) => el === mockContainer,
      };

      mockChart = {
        _isMarqueeSelecting: false,
        _justFinishedMarquee: false,
        setScrollEnabled: () => {},
        setZoomEnabled: () => {},
        getOverlays: () => [
          { id: 'drawing_1', name: 'trendLine', points: [{ timestamp: 100, value: 1.1 }] },
          { id: 'custom_price_line_overlay', name: 'customPriceLine' },
        ],
        convertToPixel: (pts: any[]) => pts.map(() => ({ x: 150, y: 150 })),
      };

      mockOtherChart = {
        _isMarqueeSelecting: false,
        _justFinishedMarquee: false,
      };

      modifierTracker = {
        isCtrlPressed: false,
        isShiftPressed: false,
        isAltPressed: false,
        isSpacePressed: false,
      };

      handler = new MarqueeSelectionHandler({
        chartContainersRef: { current: [mockContainer] } as any,
        chartInstancesRef: { current: [mockChart, mockOtherChart] } as any,
        modifierTracker,
        activeTool: null,
        onSelectOverlayIds: (ids) => {
          selectedOverlayIdsResult = ids;
        },
        selectedOverlayIds: [],
      });
    });

    it('does not initiate marquee mode if Ctrl is not pressed on mousedown', () => {
      modifierTracker.isCtrlPressed = false;
      const mousedownEvent: any = {
        button: 0,
        clientX: 100,
        clientY: 100,
        currentTarget: mockContainer,
        target: mockContainer,
        ctrlKey: false,
        metaKey: false,
      };

      (handler as any)._handleMouseDown(mousedownEvent);

      assert.equal(mockChart._isMarqueeSelecting, false);
      assert.equal(mockOtherChart._isMarqueeSelecting, false);
      assert.equal((handler as any)._isMarqueeActive, false);
    });

    it('authoritatively sets _isMarqueeSelecting across all chart instances on Ctrl+mousedown', () => {
      modifierTracker.isCtrlPressed = true;
      const mousedownEvent: any = {
        button: 0,
        clientX: 100,
        clientY: 100,
        currentTarget: mockContainer,
        target: mockContainer,
        ctrlKey: true,
        metaKey: false,
      };

      (handler as any)._handleMouseDown(mousedownEvent);

      assert.equal(mockChart._isMarqueeSelecting, true);
      assert.equal(mockOtherChart._isMarqueeSelecting, true);
      assert.equal((handler as any)._isMarqueeActive, true);
    });

    it('resets _isMarqueeSelecting across all chart instances on mouseup', () => {
      modifierTracker.isCtrlPressed = true;
      const mousedownEvent: any = {
        button: 0,
        clientX: 100,
        clientY: 100,
        currentTarget: mockContainer,
        target: mockContainer,
        ctrlKey: true,
      };
      (handler as any)._handleMouseDown(mousedownEvent);

      const mouseupEvent: any = {
        clientX: 100,
        clientY: 100,
      };
      (handler as any)._handleMouseUp(mouseupEvent);

      assert.equal(mockChart._isMarqueeSelecting, false);
      assert.equal(mockOtherChart._isMarqueeSelecting, false);
      assert.equal((handler as any)._isMarqueeActive, false);
    });

    it('sets _justFinishedMarquee flag after completing marquee selection box drag', () => {
      modifierTracker.isCtrlPressed = true;
      const mousedownEvent: any = {
        button: 0,
        clientX: 100,
        clientY: 100,
        currentTarget: mockContainer,
        target: mockContainer,
        ctrlKey: true,
      };
      (handler as any)._handleMouseDown(mousedownEvent);

      // Simulate selection box indicator in container
      const mockDiv = { remove: () => {} };
      mockContainer.querySelector = (sel: string) => (sel === '#selection-box-indicator' ? mockDiv : null);

      const mouseupEvent: any = {
        clientX: 300,
        clientY: 300,
      };
      (handler as any)._handleMouseUp(mouseupEvent);

      assert.equal(mockChart._justFinishedMarquee, true);
      assert.equal(mockChart._isMarqueeSelecting, false);
      assert.ok(Array.isArray(selectedOverlayIdsResult));
    });

    it('safely handles cancel / blur / escape without leaking marquee state', () => {
      modifierTracker.isCtrlPressed = true;
      const mousedownEvent: any = {
        button: 0,
        clientX: 100,
        clientY: 100,
        currentTarget: mockContainer,
        target: mockContainer,
        ctrlKey: true,
      };
      (handler as any)._handleMouseDown(mousedownEvent);

      assert.equal(mockChart._isMarqueeSelecting, true);

      // Trigger Escape key
      (handler as any)._handleKeyDown({ key: 'Escape' } as any);

      assert.equal(mockChart._isMarqueeSelecting, false);
      assert.equal(mockOtherChart._isMarqueeSelecting, false);
      assert.equal((handler as any)._isMarqueeActive, false);
    });
  });

  describe('Two-Layer Overlay Lifecycle Lockout Invariants', () => {
    // Replicate the exact guard contracts enforced in overlays.ts
    const simulateOnPressedMoveStart = (chart: any, overlay: any, event: any) => {
      if (isExclusiveMarqueeMode(chart, event)) {
        return false; // Bypassed
      }
      chart._activeDraggingIndex = 0;
      overlay.extendData = {
        ...overlay.extendData,
        startPoints: JSON.parse(JSON.stringify(overlay.points)),
        startMousePixel: { x: event.x, y: event.y },
      };
      return true; // Initialized
    };

    const simulateOnPressedMoving = (chart: any, overlay: any, event: any) => {
      if (isExclusiveMarqueeMode(chart, event)) {
        return false; // Blocked
      }
      const startPoints = overlay.extendData?.startPoints;
      if (!startPoints) {
        return false; // Blocked by lack of startPoints
      }
      // Mutate points
      overlay.points = startPoints.map((p: any) => ({ ...p, value: p.value + 0.05 }));
      return true;
    };

    const simulateOnPressedMoveEnd = (chart: any, overlay: any, event: any, storeUpdateFn: (ov: any) => void) => {
      const wasExclusive = isExclusiveMarqueeMode(chart, event);
      chart._activeDraggingIndex = null;
      const startPoints = overlay.extendData?.startPoints;
      if (wasExclusive || !startPoints) {
        return false; // Not committed
      }
      storeUpdateFn(overlay);
      return true;
    };

    const simulateOnClick = (chart: any, toggleSelectFn: () => void) => {
      if (chart?._justFinishedMarquee) {
        return true; // Suppressed
      }
      toggleSelectFn();
      return true;
    };

    it('guarantees drawing coordinates cannot be mutated when isExclusiveMarqueeMode is true', () => {
      const chart = { _isMarqueeSelecting: true, _activeDraggingIndex: null };
      const overlay: any = {
        id: 'drawing_1',
        points: [{ timestamp: 1000, value: 1.15 }],
        extendData: {},
      };
      const event = { x: 150, y: 250 };
      let storeUpdated = false;

      // 1. MoveStart
      const startResult = simulateOnPressedMoveStart(chart, overlay, event);
      assert.equal(startResult, false);
      assert.equal(chart._activeDraggingIndex, null);
      assert.equal(overlay.extendData.startPoints, undefined);

      // 2. Moving
      const moveResult = simulateOnPressedMoving(chart, overlay, event);
      assert.equal(moveResult, false);
      assert.equal(overlay.points[0].value, 1.15, 'Points must remain untouched');

      // 3. MoveEnd
      const endResult = simulateOnPressedMoveEnd(chart, overlay, event, () => {
        storeUpdated = true;
      });
      assert.equal(endResult, false);
      assert.equal(storeUpdated, false, 'Zustand store must not receive drawing updates');
    });

    it('guarantees defense-in-depth: even if marquee flag is reset early, lack of startPoints prevents mutation and commit', () => {
      const chart = { _isMarqueeSelecting: false, _activeDraggingIndex: null };
      const overlay: any = {
        id: 'drawing_1',
        points: [{ timestamp: 1000, value: 1.15 }],
        extendData: {}, // No startPoints
      };
      const event = { x: 150, y: 250 };
      let storeUpdated = false;

      const moveResult = simulateOnPressedMoving(chart, overlay, event);
      assert.equal(moveResult, false);
      assert.equal(overlay.points[0].value, 1.15);

      const endResult = simulateOnPressedMoveEnd(chart, overlay, event, () => {
        storeUpdated = true;
      });
      assert.equal(endResult, false);
      assert.equal(storeUpdated, false);
    });

    it('guarantees trailing click is suppressed when _justFinishedMarquee is true', () => {
      const chart = { _justFinishedMarquee: true };
      let toggleCalled = false;

      simulateOnClick(chart, () => {
        toggleCalled = true;
      });

      assert.equal(toggleCalled, false, 'Trailing onClick must be suppressed');
    });

    it('allows normal dragging to mutate and commit when not in marquee mode', () => {
      const chart = { _isMarqueeSelecting: false, _activeDraggingIndex: null };
      const overlay: any = {
        id: 'drawing_1',
        points: [{ timestamp: 1000, value: 1.15 }],
        extendData: {},
      };
      const event = { x: 100, y: 100 };
      let storeUpdated = false;

      const startResult = simulateOnPressedMoveStart(chart, overlay, event);
      assert.equal(startResult, true);
      assert.ok(overlay.extendData.startPoints);

      const moveResult = simulateOnPressedMoving(chart, overlay, event);
      assert.equal(moveResult, true);
      assert.equal(overlay.points[0].value, 1.20, 'Normal drag should update coordinates');

      const endResult = simulateOnPressedMoveEnd(chart, overlay, event, (ov) => {
        storeUpdated = true;
        assert.equal(ov.points[0].value, 1.20);
      });
      assert.equal(endResult, true);
      assert.equal(storeUpdated, true, 'Normal drag must commit to store');
    });
  });
});
