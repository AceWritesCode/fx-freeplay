import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getVisibleDrawingIds,
  calculateRangeSelection,
  resolveObjectTreeClickSelection,
} from '../objectTreeSelection.ts';
import type { TreeRootItem } from '../../../engine/charting/orderEngine.ts';

describe('Object Tree — Shift Range Selection & Interaction Model', () => {
  const sampleVisibleIds = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];

  describe('1. Normal Click Behavior & Anchor Establishment', () => {
    it('selects only the clicked item and establishes it as the Shift anchor', () => {
      const result = resolveObjectTreeClickSelection({
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        targetId: 'd3',
        currentSelectedIds: ['d1', 'd2'],
        currentAnchorId: 'd1',
        visibleDrawingIds: sampleVisibleIds,
      });

      assert.deepEqual(result.nextSelectedIds, ['d3']);
      assert.equal(result.nextAnchorId, 'd3');
    });

    it('replaces previous multi-selection with single item', () => {
      const result = resolveObjectTreeClickSelection({
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        targetId: 'd5',
        currentSelectedIds: ['d1', 'd2', 'd3', 'd4'],
        currentAnchorId: 'd1',
        visibleDrawingIds: sampleVisibleIds,
      });

      assert.deepEqual(result.nextSelectedIds, ['d5']);
      assert.equal(result.nextAnchorId, 'd5');
    });
  });

  describe('2. Shift + Click Forward Range Selection', () => {
    it('selects forward range from anchor to clicked item inclusive (e.g. d1 -> d4 => d1, d2, d3, d4)', () => {
      const result = resolveObjectTreeClickSelection({
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
        targetId: 'd4',
        currentSelectedIds: ['d1'],
        currentAnchorId: 'd1',
        visibleDrawingIds: sampleVisibleIds,
      });

      assert.deepEqual(result.nextSelectedIds, ['d1', 'd2', 'd3', 'd4']);
      assert.equal(result.nextAnchorId, 'd1', 'Anchor must remain d1 for consecutive range actions');
    });

    it('selects forward range from middle item (e.g. d2 -> d5 => d2, d3, d4, d5)', () => {
      const result = resolveObjectTreeClickSelection({
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
        targetId: 'd5',
        currentSelectedIds: ['d2'],
        currentAnchorId: 'd2',
        visibleDrawingIds: sampleVisibleIds,
      });

      assert.deepEqual(result.nextSelectedIds, ['d2', 'd3', 'd4', 'd5']);
      assert.equal(result.nextAnchorId, 'd2');
    });
  });

  describe('3. Shift + Click Backward Range Selection', () => {
    it('selects backward range from anchor to clicked item inclusive (e.g. d6 -> d1 => d1..d6)', () => {
      const result = resolveObjectTreeClickSelection({
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
        targetId: 'd1',
        currentSelectedIds: ['d6'],
        currentAnchorId: 'd6',
        visibleDrawingIds: sampleVisibleIds,
      });

      assert.deepEqual(result.nextSelectedIds, ['d1', 'd2', 'd3', 'd4', 'd5', 'd6']);
      assert.equal(result.nextAnchorId, 'd6', 'Anchor must remain d6');
    });

    it('selects backward range from middle item (e.g. d5 -> d2 => d2, d3, d4, d5)', () => {
      const result = resolveObjectTreeClickSelection({
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
        targetId: 'd2',
        currentSelectedIds: ['d5'],
        currentAnchorId: 'd5',
        visibleDrawingIds: sampleVisibleIds,
      });

      assert.deepEqual(result.nextSelectedIds, ['d2', 'd3', 'd4', 'd5']);
      assert.equal(result.nextAnchorId, 'd5');
    });
  });

  describe('4. Endpoints & Edge Cases', () => {
    it('guarantees both starting and ending clicked endpoints are included in selection', () => {
      const { selectedIds } = calculateRangeSelection(sampleVisibleIds, 'd2', 'd4');
      assert.equal(selectedIds[0], 'd2', 'Start endpoint must be included');
      assert.equal(selectedIds[selectedIds.length - 1], 'd4', 'End endpoint must be included');
      assert.equal(selectedIds.length, 3);
    });

    it('handles Shift-clicking the same item as the anchor', () => {
      const result = resolveObjectTreeClickSelection({
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
        targetId: 'd3',
        currentSelectedIds: ['d3'],
        currentAnchorId: 'd3',
        visibleDrawingIds: sampleVisibleIds,
      });

      assert.deepEqual(result.nextSelectedIds, ['d3']);
      assert.equal(result.nextAnchorId, 'd3');
    });

    it('falls back to current selection or clicked item when anchor is null', () => {
      const result = resolveObjectTreeClickSelection({
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
        targetId: 'd4',
        currentSelectedIds: ['d2'],
        currentAnchorId: null,
        visibleDrawingIds: sampleVisibleIds,
      });

      assert.deepEqual(result.nextSelectedIds, ['d2', 'd3', 'd4']);
    });

    it('falls back to clicked item when anchor and selection are empty', () => {
      const result = resolveObjectTreeClickSelection({
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
        targetId: 'd4',
        currentSelectedIds: [],
        currentAnchorId: null,
        visibleDrawingIds: sampleVisibleIds,
      });

      assert.deepEqual(result.nextSelectedIds, ['d4']);
      assert.equal(result.nextAnchorId, 'd4');
    });
  });

  describe('5. Ctrl / Meta Individual Selection & Anchor Updating', () => {
    it('toggles item on without clearing existing selections and updates anchor', () => {
      const result = resolveObjectTreeClickSelection({
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        targetId: 'd4',
        currentSelectedIds: ['d1', 'd2'],
        currentAnchorId: 'd1',
        visibleDrawingIds: sampleVisibleIds,
      });

      assert.deepEqual(result.nextSelectedIds, ['d1', 'd2', 'd4']);
      assert.equal(result.nextAnchorId, 'd4', 'Anchor updates to the newly toggled item');
    });

    it('toggles item off when already selected', () => {
      const result = resolveObjectTreeClickSelection({
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
        targetId: 'd2',
        currentSelectedIds: ['d1', 'd2', 'd4'],
        currentAnchorId: 'd2',
        visibleDrawingIds: sampleVisibleIds,
      });

      assert.deepEqual(result.nextSelectedIds, ['d1', 'd4']);
      assert.equal(result.nextAnchorId, 'd2');
    });

    it('supports Meta key (Cmd on macOS) equivalently to Ctrl', () => {
      const result = resolveObjectTreeClickSelection({
        shiftKey: false,
        ctrlKey: false,
        metaKey: true,
        targetId: 'd5',
        currentSelectedIds: ['d1'],
        currentAnchorId: 'd1',
        visibleDrawingIds: sampleVisibleIds,
      });

      assert.deepEqual(result.nextSelectedIds, ['d1', 'd5']);
      assert.equal(result.nextAnchorId, 'd5');
    });
  });

  describe('6. Visible Tree Hierarchy & Collapsed Folder Respect', () => {
    it('extracts visible drawing IDs in exact visual top-to-bottom order', () => {
      const rootItems: TreeRootItem[] = [
        { type: 'drawing', id: 'd_top', order: 100, data: { id: 'd_top' } },
        {
          type: 'folder',
          id: 'folder_1',
          order: 90,
          data: { id: 'folder_1', isCollapsed: false },
        },
        { type: 'candles', id: 'candles', order: 50, data: { name: 'Main Series' } },
        { type: 'drawing', id: 'd_bottom', order: 10, data: { id: 'd_bottom' } },
      ];

      const groupedDrawings = {
        folder_1: [{ id: 'child_1' }, { id: 'child_2' }],
      };

      const visible = getVisibleDrawingIds(rootItems, groupedDrawings);
      assert.deepEqual(visible, ['d_top', 'child_1', 'child_2', 'd_bottom']);
    });

    it('omits child drawings from visible IDs when folder is collapsed', () => {
      const rootItems: TreeRootItem[] = [
        { type: 'drawing', id: 'd_top', order: 100, data: { id: 'd_top' } },
        {
          type: 'folder',
          id: 'folder_1',
          order: 90,
          data: { id: 'folder_1', isCollapsed: true }, // Collapsed!
        },
        { type: 'candles', id: 'candles', order: 50, data: { name: 'Main Series' } },
        { type: 'drawing', id: 'd_bottom', order: 10, data: { id: 'd_bottom' } },
      ];

      const groupedDrawings = {
        folder_1: [{ id: 'child_1' }, { id: 'child_2' }],
      };

      const visible = getVisibleDrawingIds(rootItems, groupedDrawings);
      assert.deepEqual(visible, ['d_top', 'd_bottom']);

      // Shift clicking from d_top to d_bottom skips hidden child drawings
      const result = resolveObjectTreeClickSelection({
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
        targetId: 'd_bottom',
        currentSelectedIds: ['d_top'],
        currentAnchorId: 'd_top',
        visibleDrawingIds: visible,
      });

      assert.deepEqual(result.nextSelectedIds, ['d_top', 'd_bottom']);
    });
  });

  describe('7. Selection Synchronization & Immutability of Canonical Order/Drawings', () => {
    it('synchronizes selection ids without mutating drawings, sequence, or folders', () => {
      const initialSequence = ['d1', 'd2', 'd3', 'd4'];
      const initialDrawings = [
        { id: 'd1', name: 'straight_line', points: [{ timestamp: 100, value: 1.1 }] },
        { id: 'd2', name: 'ray', points: [{ timestamp: 200, value: 1.2 }] },
        { id: 'd3', name: 'rect', points: [{ timestamp: 300, value: 1.3 }] },
        { id: 'd4', name: 'circle', points: [{ timestamp: 400, value: 1.4 }] },
      ];

      const drawingsBefore = JSON.parse(JSON.stringify(initialDrawings));
      const sequenceBefore = [...initialSequence];

      let storedSelectedOverlayIds: string[] = ['d1'];
      const mockSetSelectedOverlayIds = (ids: string[]) => {
        storedSelectedOverlayIds = ids;
      };

      // Perform Shift range selection
      const result = resolveObjectTreeClickSelection({
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
        targetId: 'd3',
        currentSelectedIds: storedSelectedOverlayIds,
        currentAnchorId: 'd1',
        visibleDrawingIds: initialSequence,
      });

      // Synchronize to drawing store
      mockSetSelectedOverlayIds(result.nextSelectedIds);

      // Verify store selection
      assert.deepEqual(storedSelectedOverlayIds, ['d1', 'd2', 'd3']);

      // Verify drawing objects and canonical sequence are completely untouched
      assert.deepEqual(initialDrawings, drawingsBefore);
      assert.deepEqual(initialSequence, sequenceBefore);
    });
  });

  describe('8. Viewport Deselection Rules', () => {
    it('determines whether an element is an Object Tree item (preserves selection)', () => {
      const isTreeItem = (selector: string) => {
        return selector.includes('data-object-tree-item') ||
          selector.includes('data-object-tree-folder') ||
          selector.includes('data-object-tree-candles');
      };

      assert.equal(isTreeItem('[data-object-tree-item="line_1"]'), true);
      assert.equal(isTreeItem('[data-object-tree-folder="folder_1"]'), true);
      assert.equal(isTreeItem('[data-object-tree-candles="true"]'), true);
      assert.equal(isTreeItem('div.object-tree-empty-background'), false);
      assert.equal(isTreeItem('div.chart-workspace-container'), false);
    });

    it('determines whether an element is interactive UI (preserves selection)', () => {
      const isInteractiveUI = (tagName: string, role?: string, dataAttr?: string) => {
        if (dataAttr === 'data-floating-ui' || dataAttr === 'data-no-deselect') return true;
        if (role === 'dialog' || role === 'menu' || role === 'listbox') return true;
        if (['button', 'input', 'select', 'textarea'].includes(tagName)) return true;
        if (role === 'button' || role === 'menuitem') return true;
        return false;
      };

      assert.equal(isInteractiveUI('button'), true);
      assert.equal(isInteractiveUI('input'), true);
      assert.equal(isInteractiveUI('div', 'dialog'), true);
      assert.equal(isInteractiveUI('div', undefined, 'data-floating-ui'), true);
      assert.equal(isInteractiveUI('div'), false);
      assert.equal(isInteractiveUI('span'), false);
    });

    it('deselects when clicking empty space on canvas, Object Tree, or viewport background', () => {
      let selectedIds = ['d1', 'd2'];
      const simulateViewportClick = (opts: {
        clickedOnOverlay?: boolean;
        isTreeItem?: boolean;
        isInteractiveUI?: boolean;
        activeDrawing?: boolean;
      }) => {
        if (opts.clickedOnOverlay || opts.isTreeItem || opts.isInteractiveUI || opts.activeDrawing) {
          return; // Do not deselect
        }
        selectedIds = [];
      };

      // Click on overlay -> keeps selection
      simulateViewportClick({ clickedOnOverlay: true });
      assert.deepEqual(selectedIds, ['d1', 'd2']);

      // Click on tree item -> keeps selection
      simulateViewportClick({ isTreeItem: true });
      assert.deepEqual(selectedIds, ['d1', 'd2']);

      // Click on empty space in Object Tree or viewport background -> deselects
      simulateViewportClick({});
      assert.deepEqual(selectedIds, []);
    });
  });
});
