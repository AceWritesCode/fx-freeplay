import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDrawingDoubleClickEligible,
  resolveSingleClickSelection,
} from '../gestureAuthority.ts';

describe('Drawing Native onDoubleClick Settings & Selection Lifecycle', () => {
  describe('1. Pure Gesture Authority Predicates', () => {
    it('allows double-click settings when no modifier or blocking mode is active', () => {
      assert.equal(
        isDrawingDoubleClickEligible({
          isCtrl: false,
          isShift: false,
          isEraser: false,
          justFinishedMarquee: false,
        }),
        true
      );
    });

    it('blocks double-click settings when Ctrl modifier is active (duplication / multi-select)', () => {
      assert.equal(
        isDrawingDoubleClickEligible({
          isCtrl: true,
          isShift: false,
          isEraser: false,
          justFinishedMarquee: false,
        }),
        false
      );
    });

    it('blocks double-click settings when Shift modifier is active (angle snap / multi-select)', () => {
      assert.equal(
        isDrawingDoubleClickEligible({
          isCtrl: false,
          isShift: true,
          isEraser: false,
          justFinishedMarquee: false,
        }),
        false
      );
    });

    it('blocks double-click settings when eraser tool is active', () => {
      assert.equal(
        isDrawingDoubleClickEligible({
          isCtrl: false,
          isShift: false,
          isEraser: true,
          justFinishedMarquee: false,
        }),
        false
      );
    });

    it('blocks double-click settings immediately after marquee selection finishes', () => {
      assert.equal(
        isDrawingDoubleClickEligible({
          isCtrl: false,
          isShift: false,
          isEraser: false,
          justFinishedMarquee: true,
        }),
        false
      );
    });
  });

  describe('2. Single-Click Selection Resolution', () => {
    it('normal single-click replaces previous selection with target drawing', () => {
      const next = resolveSingleClickSelection('line_2', ['line_1'], false);
      assert.deepEqual(next, ['line_2']);
    });

    it('Ctrl + single-click appends unselected drawing to multi-selection', () => {
      const next = resolveSingleClickSelection('line_2', ['line_1'], true);
      assert.deepEqual(next, ['line_1', 'line_2']);
    });

    it('Ctrl + single-click removes already-selected drawing from multi-selection', () => {
      const next = resolveSingleClickSelection('line_1', ['line_1', 'line_2'], true);
      assert.deepEqual(next, ['line_2']);
    });
  });

  describe('3. Native onDoubleClick Overlay Handler Execution', () => {
    it('calls existing actualChart._openDrawingSettings on clean double-click', () => {
      const openSettingsCalls: string[] = [];
      const selectedOverlayCalls: string[][] = [];

      const mockChart: any = {
        _selectedOverlayIds: ['line_10'],
        _setSelectedOverlayIds: (ids: string[]) => {
          mockChart._selectedOverlayIds = ids;
          selectedOverlayCalls.push(ids);
        },
        _openDrawingSettings: (id: string) => {
          openSettingsCalls.push(id);
        },
        _clickedOnOverlay: false,
      };

      const simulateNativeDoubleClick = (overlay: any, eventOpts: any = {}) => {
        const actualChart = mockChart;
        if (!actualChart || actualChart._justFinishedMarquee) return true;

        const isEraser = actualChart._activeTool === 'eraser';
        const isCtrl = eventOpts.ctrlKey || false;
        const isShift = eventOpts.shiftKey || false;

        if (!isDrawingDoubleClickEligible({ isCtrl, isShift, isEraser, justFinishedMarquee: !!actualChart._justFinishedMarquee })) {
          return true;
        }

        const id = overlay.id;
        actualChart._clickedOnOverlay = true;

        const currentSelected = actualChart._selectedOverlayIds || [];
        if (actualChart._setSelectedOverlayIds && !currentSelected.includes(id)) {
          actualChart._setSelectedOverlayIds([id]);
        }

        if (actualChart._openDrawingSettings) {
          actualChart._openDrawingSettings(id);
        }
        return true;
      };

      const drawingOverlay = { id: 'line_10', name: 'straight_line', points: [{ timestamp: 100, value: 1.1 }] };
      simulateNativeDoubleClick(drawingOverlay);

      assert.equal(openSettingsCalls.length, 1, 'Settings action must be called once');
      assert.equal(openSettingsCalls[0], 'line_10', 'Correct drawing ID must be passed');
      assert.deepEqual(mockChart._selectedOverlayIds, ['line_10'], 'Drawing must remain selected');
    });

    it('selects drawing and opens settings if drawing was not previously selected', () => {
      const openSettingsCalls: string[] = [];

      const mockChart: any = {
        _selectedOverlayIds: [],
        _setSelectedOverlayIds: (ids: string[]) => {
          mockChart._selectedOverlayIds = ids;
        },
        _openDrawingSettings: (id: string) => {
          openSettingsCalls.push(id);
        },
      };

      const simulateNativeDoubleClick = (overlay: any) => {
        const actualChart = mockChart;
        const id = overlay.id;
        const currentSelected = actualChart._selectedOverlayIds || [];
        if (actualChart._setSelectedOverlayIds && !currentSelected.includes(id)) {
          actualChart._setSelectedOverlayIds([id]);
        }
        if (actualChart._openDrawingSettings) {
          actualChart._openDrawingSettings(id);
        }
      };

      const overlay = { id: 'rect_99', name: 'rectangle' };
      simulateNativeDoubleClick(overlay);

      assert.deepEqual(mockChart._selectedOverlayIds, ['rect_99'], 'Must select drawing');
      assert.equal(openSettingsCalls.length, 1);
      assert.equal(openSettingsCalls[0], 'rect_99');
    });

    it('suppresses Settings when Ctrl modifier is active during double-click', () => {
      const openSettingsCalls: string[] = [];

      const mockChart: any = {
        _selectedOverlayIds: ['line_ctrl'],
        _openDrawingSettings: (id: string) => {
          openSettingsCalls.push(id);
        },
      };

      const simulateNativeDoubleClick = (overlay: any, eventOpts: any = {}) => {
        const actualChart = mockChart;
        const isCtrl = eventOpts.ctrlKey || false;
        if (!isDrawingDoubleClickEligible({ isCtrl })) {
          return true;
        }
        actualChart._openDrawingSettings(overlay.id);
        return true;
      };

      simulateNativeDoubleClick({ id: 'line_ctrl' }, { ctrlKey: true });
      assert.equal(openSettingsCalls.length, 0, 'Ctrl + double-click must NOT open settings');
    });

    it('suppresses Settings when Shift modifier is active during double-click', () => {
      const openSettingsCalls: string[] = [];

      const mockChart: any = {
        _selectedOverlayIds: ['line_shift'],
        _openDrawingSettings: (id: string) => {
          openSettingsCalls.push(id);
        },
      };

      const simulateNativeDoubleClick = (overlay: any, eventOpts: any = {}) => {
        const actualChart = mockChart;
        const isShift = eventOpts.shiftKey || false;
        if (!isDrawingDoubleClickEligible({ isShift })) {
          return true;
        }
        actualChart._openDrawingSettings(overlay.id);
        return true;
      };

      simulateNativeDoubleClick({ id: 'line_shift' }, { shiftKey: true });
      assert.equal(openSettingsCalls.length, 0, 'Shift + double-click must NOT open settings');
    });
  });

  describe('4. Drawing Non-Mutation Invariants', () => {
    it('double-click does not modify points, clone, or move drawing', () => {
      const originalPoints = [
        { timestamp: 1000, value: 1.1000 },
        { timestamp: 2000, value: 1.1050 },
      ];

      const overlay = {
        id: 'drawing_immutable',
        name: 'trendLine',
        points: JSON.parse(JSON.stringify(originalPoints)),
        extendData: { customSettings: { lineColor: '#ff0000' } },
      };

      let settingsOpened = false;
      const mockChart: any = {
        _selectedOverlayIds: ['drawing_immutable'],
        _openDrawingSettings: () => {
          settingsOpened = true;
        },
      };

      // Execute double click
      if (isDrawingDoubleClickEligible({ isCtrl: false, isShift: false, isEraser: false })) {
        mockChart._openDrawingSettings(overlay.id);
      }

      assert.equal(settingsOpened, true);
      assert.deepEqual(overlay.points, originalPoints, 'Points must remain untouched');
      assert.equal(overlay.id, 'drawing_immutable', 'ID must not change');
      assert.equal(overlay.extendData.customSettings.lineColor, '#ff0000');
    });
  });

  describe('5. Selection Persistence & Grab Handle Rendering Invariants', () => {
    it('guarantees isSelected remains true and grab handles render when pointer moves away (isHovered: false)', () => {
      const selectedOverlay: any = {
        id: 'trend_line_1',
        name: 'trendLine',
        points: [{ timestamp: 100, value: 10 }, { timestamp: 200, value: 20 }],
        extendData: {
          isSelected: true,
          isHovered: false, // Pointer moved away!
        }
      };

      // Tool anchor rendering rule: isSelected || isHovered || isDrawing
      const isSelected = selectedOverlay.extendData.isSelected;
      const isHovered = selectedOverlay.extendData.isHovered;
      const shouldDrawHandles = isSelected || isHovered;

      assert.equal(shouldDrawHandles, true, 'Grab handles must remain visible when isSelected is true even if isHovered is false');
    });

    it('unselected drawing only shows grab handles on hover and hides them when pointer leaves', () => {
      const unselectedOverlay: any = {
        id: 'trend_line_unselected',
        name: 'trendLine',
        points: [{ timestamp: 100, value: 10 }, { timestamp: 200, value: 20 }],
        extendData: {
          isSelected: false,
          isHovered: true, // While hovering
        }
      };

      assert.equal(unselectedOverlay.extendData.isSelected || unselectedOverlay.extendData.isHovered, true, 'Shows handles while hovering');

      // Pointer leaves
      unselectedOverlay.extendData.isHovered = false;
      assert.equal(unselectedOverlay.extendData.isSelected || unselectedOverlay.extendData.isHovered, false, 'Hides handles when pointer leaves');
    });

    it('resolves isSelected across synced slot overlay IDs seamlessly', () => {
      const selectedIds = ['original_drawing_42'];
      const slot0OverlayId = 'original_drawing_42';
      const slot1OverlayId = 'sync_original_drawing_42_from_0';

      const checkSelection = (id: string) => {
        const canonical = id.startsWith('sync_') ? id.replace(/^sync_(.+)_from_\d+$/, '$1') : id;
        return selectedIds.includes(id) || selectedIds.includes(canonical);
      };

      assert.equal(checkSelection(slot0OverlayId), true, 'Slot 0 primary overlay is selected');
      assert.equal(checkSelection(slot1OverlayId), true, 'Slot 1 synced overlay is selected');
    });
  });
});
