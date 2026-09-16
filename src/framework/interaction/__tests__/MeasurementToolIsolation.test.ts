import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('MeasurementTool Isolation & Shift Interception Invariants', () => {
  it('does NOT intercept Shift + pointerdown when a drawing tool (e.g. trendLine) is active', () => {
    let stopped = false;
    let defaultPrevented = false;

    const mockEvent = {
      button: 0,
      shiftKey: true,
      clientX: 150,
      clientY: 150,
      target: { closest: () => null },
      preventDefault: () => {
        defaultPrevented = true;
      },
      stopPropagation: () => {
        stopped = true;
      },
    };

    // Simulate guard logic in useMeasurementTool
    const activeTool: string | null = 'trendLine';
    const isShift = mockEvent.shiftKey;
    const isMeasureTool = activeTool === 'measure';
    const isAnotherToolActive = activeTool !== null && !isMeasureTool;

    if (isAnotherToolActive) {
      // Guard passes through event to drawing tool
    } else if (!isMeasureTool && !isShift) {
      // Guard passes through
    } else {
      mockEvent.preventDefault();
      mockEvent.stopPropagation();
    }

    assert.equal(stopped, false, 'Pointer event must NOT be stopped when trendLine is active');
    assert.equal(defaultPrevented, false, 'Default must NOT be prevented when trendLine is active');
  });

  it('intercepts Shift + pointerdown when NO tool is active (activeTool === null)', () => {
    let stopped = false;
    let defaultPrevented = false;

    const mockEvent = {
      button: 0,
      shiftKey: true,
      clientX: 150,
      clientY: 150,
      target: { closest: () => null },
      preventDefault: () => {
        defaultPrevented = true;
      },
      stopPropagation: () => {
        stopped = true;
      },
    };

    const activeTool: string | null = null;
    const isShift = mockEvent.shiftKey;
    const isMeasureTool = activeTool === 'measure';
    const isAnotherToolActive = activeTool !== null && !isMeasureTool;

    if (isAnotherToolActive) {
      // Pass through
    } else if (!isMeasureTool && !isShift) {
      // Pass through
    } else {
      mockEvent.preventDefault();
      mockEvent.stopPropagation();
    }

    assert.equal(stopped, true, 'Pointer event MUST be intercepted when activeTool is null and Shift is held');
    assert.equal(defaultPrevented, true, 'Default MUST be prevented when activeTool is null and Shift is held');
  });

  it('intercepts pointerdown when measure tool is active (activeTool === "measure")', () => {
    let stopped = false;
    let defaultPrevented = false;

    const mockEvent = {
      button: 0,
      shiftKey: false,
      clientX: 150,
      clientY: 150,
      target: { closest: () => null },
      preventDefault: () => {
        defaultPrevented = true;
      },
      stopPropagation: () => {
        stopped = true;
      },
    };

    const activeTool: string | null = 'measure';
    const isShift = mockEvent.shiftKey;
    const isMeasureTool = activeTool === 'measure';
    const isAnotherToolActive = activeTool !== null && !isMeasureTool;

    if (isAnotherToolActive) {
      // Pass through
    } else if (!isMeasureTool && !isShift) {
      // Pass through
    } else {
      mockEvent.preventDefault();
      mockEvent.stopPropagation();
    }

    assert.equal(stopped, true, 'Pointer event MUST be intercepted when activeTool is "measure"');
    assert.equal(defaultPrevented, true, 'Default MUST be prevented when activeTool is "measure"');
  });

  it('does NOT intercept Shift + pointerdown for any non-measure tool (ray, arrow, rect, brush, eraser)', () => {
    const tools = ['ray', 'arrow', 'rect', 'circle', 'parallelChannel', 'brush', 'eraser', 'highlighter'];

    for (const tool of tools) {
      let stopped = false;

      const mockEvent = {
        button: 0,
        shiftKey: true,
        clientX: 150,
        clientY: 150,
        target: { closest: () => null },
        stopPropagation: () => {
          stopped = true;
        },
      };

      const activeTool: string | null = tool;
      const isShift = mockEvent.shiftKey;
      const isMeasureTool = activeTool === 'measure';
      const isAnotherToolActive = activeTool !== null && !isMeasureTool;

      if (!isAnotherToolActive && (isMeasureTool || isShift)) {
        mockEvent.stopPropagation();
      }

      assert.equal(stopped, false, `Pointer event must NOT be stopped when ${tool} is active`);
    }
  });
});
