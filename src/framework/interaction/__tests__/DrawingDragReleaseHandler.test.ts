import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DrawingDragReleaseHandler } from '../DrawingDragReleaseHandler.ts';

describe('DrawingDragReleaseHandler', () => {
  let mockContainer: any;
  let mockChart: any;
  let mockChartStore: any;
  let mockOverlay: any;
  let progressCompleted: boolean;
  let drawEndCalled: boolean;
  let nextStepCallCount: number;
  let movedPoints: any[];
  let onDrawingCalls: any[];
  let handler: DrawingDragReleaseHandler;

  beforeEach(() => {
    progressCompleted = false;
    drawEndCalled = false;
    nextStepCallCount = 0;
    movedPoints = [];
    onDrawingCalls = [];

    mockOverlay = {
      id: 'test_trend_line',
      name: 'trendLine',
      totalStep: 3,
      currentStep: 1,
      points: [],
      isStart() {
        return this.currentStep === 1;
      },
      isDrawing() {
        return this.currentStep !== -1;
      },
      nextStep() {
        nextStepCallCount++;
        if (this.currentStep === this.totalStep - 1) {
          this.currentStep = -1; // Finished
        } else {
          this.currentStep++;
        }
      },
      stepDrawingModeEventMoveForDrawing(pt: any) {
        movedPoints.push(pt);
        this.points[this.currentStep - 1] = pt;
      },
      onDrawing(event: any) {
        onDrawingCalls.push(event);
      },
      onDrawEnd(_event: any) {
        drawEndCalled = true;
      },
    };

    mockChartStore = {
      _progressOverlayInfo: {
        overlay: mockOverlay,
        paneId: 'candle_pane',
      },
      getProgressOverlayInfo() {
        return this._progressOverlayInfo;
      },
      progressOverlayComplete() {
        progressCompleted = true;
        this._progressOverlayInfo = null;
      },
      updateProgressOverlayInfo(_paneId: string, _appoint: boolean) {},
      getPressedOverlayInfo() {
        return { overlay: null, figure: null };
      },
    };

    mockContainer = {
      getBoundingClientRect: () => ({ left: 100, top: 100, width: 800, height: 600 }),
      contains: (el: any) => el === mockContainer,
      closest: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    mockChart = {
      _isMarqueeSelecting: false,
      _isShiftPressedRef: { current: false },
      getChartStore: () => mockChartStore,
      convertToPixel: (pts: any[]) => pts.map((p) => ({ x: (p.dataIndex ?? 5) * 10, y: (100 - p.value) / 0.1 })),
      convertFromPixel: (coords: any) => {
        const c = Array.isArray(coords) ? coords[0] : coords;
        return { timestamp: 1000 + c.x, value: 100 - c.y * 0.1, dataIndex: Math.floor(c.x / 10) };
      },
      updatePane: () => {},
    };

    handler = new DrawingDragReleaseHandler({
      chartContainersRef: { current: [mockContainer] },
      chartInstancesRef: { current: [mockChart] },
      activeTool: 'trendLine',
    });
  });

  describe('Two-Anchor Click-Drag-Release Creation Workflow (totalStep === 3)', () => {
    it('commits Anchor 1 on drag exceeding 5px, tracks preview, and completes on mouseup', () => {
      // 1. Mouse down at (150, 150) [container relative: (50, 50)]
      const downEvent: any = {
        button: 0,
        clientX: 150,
        clientY: 150,
        target: mockContainer,
        currentTarget: mockContainer,
      };
      (handler as any)._handleMouseDown(downEvent);

      assert.equal(mockOverlay.currentStep, 1, 'Anchor 1 not committed until drag threshold reached');
      assert.equal(nextStepCallCount, 0);

      // 2. Mouse move small jitter (< 5px manhattan distance)
      const jitterEvent: any = {
        clientX: 152,
        clientY: 151,
        preventDefault: () => {},
      };
      (handler as any)._handleMouseMove(jitterEvent);
      assert.equal(mockOverlay.currentStep, 1, 'Still at step 1 during small jitter');
      assert.equal(nextStepCallCount, 0);

      // 3. Mouse move exceeding 5px threshold -> drag activates!
      const dragEvent: any = {
        clientX: 200,
        clientY: 200,
        preventDefault: () => {},
      };
      (handler as any)._handleMouseMove(dragEvent);

      // Anchor 1 must now be committed, advancing step from 1 to 2
      assert.equal(mockOverlay.currentStep, 2, 'Anchor 1 committed and step advanced to 2');
      assert.equal(nextStepCallCount, 1, 'nextStep called once to advance to Anchor 2 preview');
      assert.equal(onDrawingCalls.length, 1, 'Anchor 2 preview updated');

      // 4. Further drag updates Anchor 2 preview
      const dragEvent2: any = {
        clientX: 250,
        clientY: 220,
        preventDefault: () => {},
      };
      (handler as any)._handleMouseMove(dragEvent2);
      assert.equal(mockOverlay.currentStep, 2, 'Remains at step 2 during drag');
      assert.equal(onDrawingCalls.length, 2, 'Second preview update triggered');

      // 5. Mouse up -> commits Anchor 2 and completes drawing!
      const upEvent: any = {
        clientX: 250,
        clientY: 220,
      };
      (handler as any)._handleMouseUp(upEvent);

      assert.equal(mockOverlay.currentStep, -1, 'Overlay transitioned to finished state (-1)');
      assert.equal(nextStepCallCount, 2, 'nextStep called second time to finish overlay');
      assert.equal(progressCompleted, true, 'progressOverlayComplete called');
      assert.equal(drawEndCalled, true, 'onDrawEnd called to finalize drawing');
    });

    it('does NOT commit or intercept when mouse movement is < 5px (preserves click-click workflow)', () => {
      // 1. Mouse down at (150, 150)
      const downEvent: any = {
        button: 0,
        clientX: 150,
        clientY: 150,
        target: mockContainer,
        currentTarget: mockContainer,
      };
      (handler as any)._handleMouseDown(downEvent);

      // 2. Mouse move small movement (3px total)
      const jitterEvent: any = {
        clientX: 151,
        clientY: 152,
        preventDefault: () => {},
      };
      (handler as any)._handleMouseMove(jitterEvent);

      // 3. Mouse up without dragging
      const upEvent: any = {
        clientX: 151,
        clientY: 152,
      };
      (handler as any)._handleMouseUp(upEvent);

      // The handler must NOT have touched the overlay or called nextStep on mouseup,
      // leaving KLineCharts native click handler to handle Anchor 1 placement!
      assert.equal(mockOverlay.currentStep, 1, 'Remains at step 1 for native click event');
      assert.equal(nextStepCallCount, 0, 'nextStep NOT called by handler');
      assert.equal(progressCompleted, false, 'progressOverlayComplete NOT called');
      assert.equal(drawEndCalled, false, 'onDrawEnd NOT called');
    });
  });

  describe('Single-Anchor and Multi-Anchor Tool Exclusion', () => {
    it('ignores single-anchor tools (totalStep === 2)', () => {
      mockOverlay.totalStep = 2; // e.g. horizontalLine, text, verticalLine
      const downEvent: any = {
        button: 0,
        clientX: 150,
        clientY: 150,
        target: mockContainer,
        currentTarget: mockContainer,
      };
      (handler as any)._handleMouseDown(downEvent);

      const dragEvent: any = {
        clientX: 250,
        clientY: 250,
        preventDefault: () => {},
      };
      (handler as any)._handleMouseMove(dragEvent);

      assert.equal(nextStepCallCount, 0, 'Handler ignores single-anchor tools');
      assert.equal(mockOverlay.currentStep, 1);
    });

    it('ignores multi-anchor tools with >2 points (totalStep === 4 for curve, 99 for path)', () => {
      mockOverlay.totalStep = 4; // curve
      const downEvent: any = {
        button: 0,
        clientX: 150,
        clientY: 150,
        target: mockContainer,
        currentTarget: mockContainer,
      };
      (handler as any)._handleMouseDown(downEvent);

      const dragEvent: any = {
        clientX: 250,
        clientY: 250,
        preventDefault: () => {},
      };
      (handler as any)._handleMouseMove(dragEvent);

      assert.equal(nextStepCallCount, 0, 'Handler ignores tools with totalStep > 3');
    });
  });

  describe('Exclusion of Moving/Editing Completed Drawings', () => {
    it('does NOT activate when activeTool is null', () => {
      handler.updateOptions({
        chartContainersRef: { current: [mockContainer] },
        chartInstancesRef: { current: [mockChart] },
        activeTool: null,
      });

      const downEvent: any = {
        button: 0,
        clientX: 150,
        clientY: 150,
        target: mockContainer,
        currentTarget: mockContainer,
      };
      (handler as any)._handleMouseDown(downEvent);

      const dragEvent: any = {
        clientX: 250,
        clientY: 250,
        preventDefault: () => {},
      };
      (handler as any)._handleMouseMove(dragEvent);

      assert.equal(nextStepCallCount, 0);
    });

    it('clears accidental pressed overlay state and activates creation when activeTool is active over an existing completed overlay', () => {
      let clearedPressed = false;
      mockChartStore.getPressedOverlayInfo = () => ({
        overlay: { id: 'completed_rect_1' },
        figure: { type: 'rect' },
      });
      mockChartStore.setPressedOverlayInfo = (val: any) => {
        if (val === null) clearedPressed = true;
      };

      const downEvent: any = {
        button: 0,
        clientX: 150,
        clientY: 150,
        target: mockContainer,
        currentTarget: mockContainer,
      };
      (handler as any)._handleMouseDown(downEvent);

      assert.equal(clearedPressed, true, 'Must clear accidental pressed overlay info for existing overlay');

      const dragEvent: any = {
        clientX: 250,
        clientY: 250,
        preventDefault: () => {},
      };
      (handler as any)._handleMouseMove(dragEvent);

      assert.equal(nextStepCallCount, 1, 'Drawing creation advances to step 2 on drag');
    });

    it('does NOT activate when the overlay is not in its initial step (currentStep !== 1)', () => {
      mockOverlay.currentStep = 2; // Already placed anchor 1 earlier
      const downEvent: any = {
        button: 0,
        clientX: 150,
        clientY: 150,
        target: mockContainer,
        currentTarget: mockContainer,
      };
      (handler as any)._handleMouseDown(downEvent);

      const dragEvent: any = {
        clientX: 250,
        clientY: 250,
        preventDefault: () => {},
      };
      (handler as any)._handleMouseMove(dragEvent);

      assert.equal(nextStepCallCount, 0, 'Does not activate if not at currentStep 1');
    });
  });

  describe('Interaction Mode Authority and Safety Guards', () => {
    it('does not activate when Ctrl or Meta key is pressed (marquee selection)', () => {
      const downEvent: any = {
        button: 0,
        clientX: 150,
        clientY: 150,
        ctrlKey: true,
        target: mockContainer,
        currentTarget: mockContainer,
      };
      (handler as any)._handleMouseDown(downEvent);

      const dragEvent: any = {
        clientX: 250,
        clientY: 250,
        preventDefault: () => {},
      };
      (handler as any)._handleMouseMove(dragEvent);

      assert.equal(nextStepCallCount, 0, 'Ignored during Ctrl / marquee selection');
    });

    it('does not activate when Space key is pressed (chart pan navigation)', () => {
      const isSpacePressedRef = { current: true };
      handler.updateOptions({
        chartContainersRef: { current: [mockContainer] },
        chartInstancesRef: { current: [mockChart] },
        activeTool: 'trendLine',
        isSpacePressedRef,
      });

      const downEvent: any = {
        button: 0,
        clientX: 150,
        clientY: 150,
        target: mockContainer,
        currentTarget: mockContainer,
      };
      (handler as any)._handleMouseDown(downEvent);

      const dragEvent: any = {
        clientX: 250,
        clientY: 250,
        preventDefault: () => {},
      };
      (handler as any)._handleMouseMove(dragEvent);

      assert.equal(nextStepCallCount, 0, 'Ignored when spacebar is pressed');
    });

    it('does not activate when clicking UI elements / buttons / dialogs', () => {
      const mockButton = {
        closest: (sel: string) => sel.includes('button') ? true : null,
      };
      const downEvent: any = {
        button: 0,
        clientX: 150,
        clientY: 150,
        target: mockButton,
        currentTarget: mockContainer,
      };
      (handler as any)._handleMouseDown(downEvent);

      const dragEvent: any = {
        clientX: 250,
        clientY: 250,
        preventDefault: () => {},
      };
      (handler as any)._handleMouseMove(dragEvent);

      assert.equal(nextStepCallCount, 0, 'Ignored when clicking UI buttons');
    });

    it('cancels drag cleanly on Escape key', () => {
      const downEvent: any = {
        button: 0,
        clientX: 150,
        clientY: 150,
        target: mockContainer,
        currentTarget: mockContainer,
      };
      (handler as any)._handleMouseDown(downEvent);

      // Escape pressed
      (handler as any)._handleKeyDown({ key: 'Escape' });

      // Moving after escape should not do anything
      const dragEvent: any = {
        clientX: 250,
        clientY: 250,
        preventDefault: () => {},
      };
      (handler as any)._handleMouseMove(dragEvent);

      assert.equal(nextStepCallCount, 0, 'Drag was cancelled by Escape');
    });
  });

  describe('Shift Key Angle-Snapping During Creation', () => {
    it('snaps live preview to 45-degree angle increments during click-drag-release when Shift is held', () => {
      // 1. Mouse down at (150, 150) -> container relative (50, 50)
      (handler as any)._handleMouseDown({
        button: 0,
        clientX: 150,
        clientY: 150,
        target: mockContainer,
        currentTarget: mockContainer,
      });

      // 2. Drag with Shift held to (250, 155) -> delta is dx=100, dy=5 (near horizontal, angle ~ 2.8 degrees)
      // With angle snapping (PI/4), nearest step is 0 degrees (pure horizontal).
      // So dy should snap to 0!
      (handler as any)._handleMouseMove({
        clientX: 250,
        clientY: 155,
        shiftKey: true,
        preventDefault: () => {},
      });

      assert.equal(mockOverlay.currentStep, 2);
      // Last moved point should be snapped: dy is projected to 0 degrees, so y should equal base y (50)
      const lastMoved = movedPoints[movedPoints.length - 1];
      assert.ok(lastMoved, 'Moved point exists');
      // The snapped point value corresponds to y=50 in pixel space
      assert.equal(lastMoved.value, 100 - 50 * 0.1, 'Angle snapped to horizontal (0 degrees)');

      // 3. Mouse up with Shift held -> commits the angle-snapped coordinate
      (handler as any)._handleMouseUp({
        clientX: 250,
        clientY: 155,
        shiftKey: true,
      });

      assert.equal(mockOverlay.currentStep, -1, 'Overlay completed');
      const finalPoint = movedPoints[movedPoints.length - 1];
      assert.equal(finalPoint.value, 100 - 50 * 0.1, 'Committed point retains snapped angle');
    });

    it('does NOT angle-snap when Shift is NOT held (normal free movement)', () => {
      (handler as any)._handleMouseDown({
        button: 0,
        clientX: 150,
        clientY: 150,
        target: mockContainer,
        currentTarget: mockContainer,
      });

      (handler as any)._handleMouseMove({
        clientX: 250,
        clientY: 155,
        shiftKey: false,
        preventDefault: () => {},
      });

      const lastMoved = movedPoints[movedPoints.length - 1];
      // Target y is 155 - 100 = 55. Value is 100 - 55 * 0.1 = 94.5 (not snapped to 95.0)
      assert.equal(lastMoved.value, 100 - 55 * 0.1, 'Free unsnapped movement');
    });

    it('does NOT angle snap for tools that do not support angle snapping (e.g. rectangle, circle)', () => {
      mockOverlay.name = 'rectangle';
      (handler as any)._handleMouseDown({
        button: 0,
        clientX: 150,
        clientY: 150,
        target: mockContainer,
        currentTarget: mockContainer,
      });

      (handler as any)._handleMouseMove({
        clientX: 250,
        clientY: 155,
        shiftKey: true,
        preventDefault: () => {},
      });

      const lastMoved = movedPoints[movedPoints.length - 1];
      assert.equal(lastMoved.value, 100 - 55 * 0.1, 'Rectangle not angle-snapped even with Shift');
    });

    it('updates angle snap preview when Shift is toggled while cursor is stationary', () => {
      // In click-click mode: anchor 1 already placed, currentStep is 2
      mockOverlay.name = 'trendLine';
      mockOverlay.currentStep = 2;
      mockOverlay.points = [{ dataIndex: 5, value: 95 }]; // container pixel (50, 50)
      (handler as any)._lastMousePos = { clientX: 250, clientY: 155 }; // near horizontal (dx=100, dy=5)

      mockChart._isShiftPressedRef = { current: true };
      (handler as any)._handleKeyDown({ key: 'Shift' });

      const lastMoved = movedPoints[movedPoints.length - 1];
      assert.ok(lastMoved);
      assert.equal(lastMoved.value, 100 - 50 * 0.1, 'Preview snapped when Shift key pressed while stationary');
    });

    it('commits Anchor 2 at snapped coordinate when clicking on step 2 while Shift is held', () => {
      mockOverlay.name = 'trendLine';
      mockOverlay.currentStep = 2;
      mockOverlay.points = [{ dataIndex: 5, value: 95 }];

      (handler as any)._handleMouseDown({
        button: 0,
        clientX: 250,
        clientY: 155,
        target: mockContainer,
        currentTarget: mockContainer,
        shiftKey: true,
      });

      assert.ok((handler as any)._dragState, '_dragState is captured when Shift is held on step 2');

      (handler as any)._handleMouseUp({
        clientX: 250,
        clientY: 155,
        shiftKey: true,
      });

      assert.equal(mockOverlay.currentStep, -1, 'Overlay completed on click while holding Shift');
      const finalPoint = movedPoints[movedPoints.length - 1];
      assert.ok(finalPoint);
      assert.equal(finalPoint.value, 100 - 50 * 0.1, 'Anchor 2 committed at snapped horizontal coordinate');
    });

    it('does NOT capture mousedown on step 2 when Shift is NOT held (leaves native KLineCharts behavior untouched)', () => {
      mockOverlay.name = 'trendLine';
      mockOverlay.currentStep = 2;
      mockOverlay.points = [{ dataIndex: 5, value: 95 }];

      (handler as any)._handleMouseDown({
        button: 0,
        clientX: 250,
        clientY: 155,
        target: mockContainer,
        currentTarget: mockContainer,
        shiftKey: false,
      });

      assert.equal((handler as any)._dragState, null, '_dragState is NOT captured when Shift is not held on step 2');
    });
  });
});
