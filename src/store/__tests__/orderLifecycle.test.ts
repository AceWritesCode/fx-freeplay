import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

import {
  CANDLES_SENTINEL,
  type SymbolOrderState,
  validateOrderSequence,
} from '../../engine/charting/orderEngine.ts';

// In-memory mock repository state for store lifecycle tests
export const mockRepoState = {
  savedFoldersBySymbol: new Map<string, any[]>(),
  savedDrawingsBySymbol: new Map<string, any[]>(),
  savedOrderStateBySymbol: new Map<string, any>(),
  saveFoldersCalls: [] as any[],
  saveDrawingsCalls: [] as any[],
  saveOrderStateCalls: [] as any[],
  reset() {
    this.savedFoldersBySymbol.clear();
    this.savedDrawingsBySymbol.clear();
    this.savedOrderStateBySymbol.clear();
    this.saveFoldersCalls = [];
    this.saveDrawingsCalls = [];
    this.saveOrderStateCalls = [];
  },
};

const loaderCode = `
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/engine/charting' || specifier === '@/engine/charting/index' || specifier === '@/engine/charting/index.ts') {
    return {
      url: 'data:text/javascript,' + encodeURIComponent(\`
        export function getOriginalDrawingId(id) {
          if (!id) return '';
          if (typeof id === 'string' && id.startsWith('sync_')) {
            const parts = id.split('_');
            if (parts.length >= 3) return parts.slice(2).join('_');
          }
          return id;
        }
      \`),
      shortCircuit: true,
    };
  }

  if (specifier === '@/repository' || specifier === '@/repository/index' || specifier === '@/repository/index.ts') {
    return {
      url: 'data:text/javascript,' + encodeURIComponent(\`
        export const drawingRepository = {
          getFolders: async (symbol) => globalThis.__lifecycleMockRepo?.savedFoldersBySymbol.get(symbol) || [],
          saveFolders: async (symbol, folders) => {
            globalThis.__lifecycleMockRepo?.savedFoldersBySymbol.set(symbol, folders);
            globalThis.__lifecycleMockRepo?.saveFoldersCalls.push({ symbol, folders });
          },
          getDrawings: async (symbol) => globalThis.__lifecycleMockRepo?.savedDrawingsBySymbol.get(symbol) || [],
          saveDrawings: async (symbol, drawings) => {
            globalThis.__lifecycleMockRepo?.savedDrawingsBySymbol.set(symbol, drawings);
            globalThis.__lifecycleMockRepo?.saveDrawingsCalls.push({ symbol, drawings });
          },
          getOrderState: async (symbol) => globalThis.__lifecycleMockRepo?.savedOrderStateBySymbol.get(symbol) || null,
          saveOrderState: async (symbol, orderState) => {
            globalThis.__lifecycleMockRepo?.savedOrderStateBySymbol.set(symbol, orderState);
            globalThis.__lifecycleMockRepo?.saveOrderStateCalls.push({ symbol, orderState });
          },
          clearDrawings: async () => {},
        };
      \`),
      shortCircuit: true,
    };
  }

  let target = null;
  if (specifier.startsWith('@/')) {
    target = path.resolve('src', specifier.slice(2));
  } else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    target = path.resolve(parentDir, specifier);
  }

  if (target) {
    for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
      const full = target + ext;
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        return { url: pathToFileURL(full).href, shortCircuit: true };
      }
    }
  }

  return nextResolve(specifier, context);
}
`;

register('data:text/javascript,' + encodeURIComponent(loaderCode));
(globalThis as any).__lifecycleMockRepo = mockRepoState;

const storeModule = await import(pathToFileURL(path.resolve('src/store/useDrawingStore.ts')).href);
const { useDrawingStore } = storeModule;

describe('Phase 2C-4A — Drawing Lifecycle → Canonical Order Integration', () => {
  beforeEach(() => {
    mockRepoState.reset();
    useDrawingStore.setState({
      drawingsBySymbol: {},
      orderStateBySymbol: {},
      folders: [],
    });
  });

  describe('1. New Drawing Creation (addSymbolDrawing)', () => {
    it('inserts a new root drawing at the FRONT (index 0) of the canonical sequence and persists', () => {
      // Initialize symbol with an existing drawing
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [{ id: 'd_existing', name: 'Existing', points: [] }],
        },
        orderStateBySymbol: {
          EURUSD: { symbol: 'EURUSD', sequence: ['d_existing', CANDLES_SENTINEL], candlesVisible: true },
        },
      });

      // Add new root drawing
      useDrawingStore.getState().addSymbolDrawing('EURUSD', {
        id: 'd_new_root',
        name: 'New Root',
        points: [],
      });

      const orderState = useDrawingStore.getState().orderStateBySymbol['EURUSD'];
      assert.ok(orderState);
      // Frontmost / top of sequence
      assert.deepEqual(orderState.sequence, ['d_new_root', 'd_existing', CANDLES_SENTINEL]);

      // Verified persistence
      assert.equal(mockRepoState.saveOrderStateCalls.length, 1);
      assert.equal(mockRepoState.saveOrderStateCalls[0].symbol, 'EURUSD');
      assert.deepEqual(mockRepoState.saveOrderStateCalls[0].orderState.sequence, ['d_new_root', 'd_existing', CANDLES_SENTINEL]);
    });

    it('inserts a new folder drawing at the TOP of its folder block', () => {
      // Existing sequence: [d_root1, f_child1, f_child2, d_root2, CANDLES]
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd_root1', name: 'R1', points: [] },
            { id: 'f_child1', name: 'C1', points: [], extendData: { folderId: 'folder_A' } },
            { id: 'f_child2', name: 'C2', points: [], extendData: { folderId: 'folder_A' } },
            { id: 'd_root2', name: 'R2', points: [] },
          ],
        },
        orderStateBySymbol: {
          EURUSD: {
            symbol: 'EURUSD',
            sequence: ['d_root1', 'f_child1', 'f_child2', 'd_root2', CANDLES_SENTINEL],
            candlesVisible: true,
          },
        },
      });

      // Add new drawing assigned to folder_A
      useDrawingStore.getState().addSymbolDrawing('EURUSD', {
        id: 'f_child_new',
        name: 'New Folder Child',
        points: [],
        extendData: { folderId: 'folder_A' },
      });

      const orderState = useDrawingStore.getState().orderStateBySymbol['EURUSD'];
      assert.ok(orderState);
      // Must be inserted at the top of folder_A block (before f_child1)
      assert.deepEqual(orderState.sequence, ['d_root1', 'f_child_new', 'f_child1', 'f_child2', 'd_root2', CANDLES_SENTINEL]);

      // Verify folder block contiguity remains valid
      const validation = validateOrderSequence(
        orderState.sequence,
        ['d_root1', 'f_child1', 'f_child2', 'd_root2', 'f_child_new'],
        {
          d_root1: null,
          f_child1: 'folder_A',
          f_child2: 'folder_A',
          f_child_new: 'folder_A',
          d_root2: null,
        }
      );
      assert.equal(validation.isValid, true);
    });

    it('updating an existing drawing ID via addSymbolDrawing does NOT duplicate or reorder it in sequence', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'D1', points: [] },
            { id: 'd2', name: 'D2', points: [] },
          ],
        },
        orderStateBySymbol: {
          EURUSD: { symbol: 'EURUSD', sequence: ['d1', 'd2', CANDLES_SENTINEL], candlesVisible: true },
        },
      });

      // Call addSymbolDrawing with existing id 'd2'
      useDrawingStore.getState().addSymbolDrawing('EURUSD', {
        id: 'd2',
        name: 'D2 Updated',
        points: [{ x: 10, y: 20 }],
      });

      const orderState = useDrawingStore.getState().orderStateBySymbol['EURUSD'];
      assert.ok(orderState);
      // Sequence must remain unchanged
      assert.deepEqual(orderState.sequence, ['d1', 'd2', CANDLES_SENTINEL]);
      // saveOrderState was NOT called since sequence didn't change
      assert.equal(mockRepoState.saveOrderStateCalls.length, 0);
    });

    it('successive new drawing creations maintain newest-at-front stacking order', () => {
      useDrawingStore.getState().addSymbolDrawing('EURUSD', { id: 'd1', name: 'D1', points: [] });
      useDrawingStore.getState().addSymbolDrawing('EURUSD', { id: 'd2', name: 'D2', points: [] });
      useDrawingStore.getState().addSymbolDrawing('EURUSD', { id: 'd3', name: 'D3', points: [] });

      const orderState = useDrawingStore.getState().orderStateBySymbol['EURUSD'];
      assert.ok(orderState);
      // d3 was added last, so it is index 0
      assert.deepEqual(orderState.sequence, ['d3', 'd2', 'd1', CANDLES_SENTINEL]);
    });
  });

  describe('2. Drawing Duplication (duplicateSymbolDrawing)', () => {
    it('clones drawing item and places duplicate immediately in front of the source in canonical sequence', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'Line 1', points: [{ x: 1, y: 1 }], extendData: { color: '#ff0000', order: 100 } },
            { id: 'd2', name: 'Line 2', points: [{ x: 2, y: 2 }], extendData: { color: '#00ff00', order: 50 } },
          ],
        },
        orderStateBySymbol: {
          EURUSD: { symbol: 'EURUSD', sequence: ['d1', 'd2', CANDLES_SENTINEL], candlesVisible: true },
        },
      });

      // Duplicate d2 -> d2_copy
      useDrawingStore.getState().duplicateSymbolDrawing('EURUSD', 'd2', 'd2_copy');

      // 1. Drawing list in store
      const drawings = useDrawingStore.getState().drawingsBySymbol['EURUSD'];
      assert.equal(drawings.length, 3);
      const cloned = drawings.find((d) => d.id === 'd2_copy');
      assert.ok(cloned);
      assert.equal(cloned.name, 'Line 2');
      assert.deepEqual(cloned.points, [{ x: 2, y: 2 }]);
      assert.equal(cloned.extendData?.color, '#00ff00');
      // Legacy order field is preserved on copy
      assert.equal(cloned.extendData?.order, 50);

      // 2. Canonical sequence: d2_copy inserted immediately before d2
      const orderState = useDrawingStore.getState().orderStateBySymbol['EURUSD'];
      assert.ok(orderState);
      assert.deepEqual(orderState.sequence, ['d1', 'd2_copy', 'd2', CANDLES_SENTINEL]);

      // 3. Saved to repository
      assert.equal(mockRepoState.saveDrawingsCalls.length, 1);
      assert.equal(mockRepoState.saveOrderStateCalls.length, 1);
      assert.deepEqual(mockRepoState.saveOrderStateCalls[0].orderState.sequence, ['d1', 'd2_copy', 'd2', CANDLES_SENTINEL]);
    });

    it('duplicating a folder child places clone immediately above source within folder', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd_root', name: 'Root', points: [] },
            { id: 'c1', name: 'C1', points: [], extendData: { folderId: 'f1' } },
            { id: 'c2', name: 'C2', points: [], extendData: { folderId: 'f1' } },
          ],
        },
        orderStateBySymbol: {
          EURUSD: { symbol: 'EURUSD', sequence: ['d_root', 'c1', 'c2', CANDLES_SENTINEL], candlesVisible: true },
        },
      });

      useDrawingStore.getState().duplicateSymbolDrawing('EURUSD', 'c2', 'c2_copy');

      const orderState = useDrawingStore.getState().orderStateBySymbol['EURUSD'];
      assert.ok(orderState);
      assert.deepEqual(orderState.sequence, ['d_root', 'c1', 'c2_copy', 'c2', CANDLES_SENTINEL]);

      // Folder contiguity check
      const validation = validateOrderSequence(
        orderState.sequence,
        ['d_root', 'c1', 'c2', 'c2_copy'],
        { d_root: null, c1: 'f1', c2: 'f1', c2_copy: 'f1' }
      );
      assert.equal(validation.isValid, true);
    });

    it('safely handles non-existent sourceId without throwing', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [{ id: 'd1', name: 'D1', points: [] }],
        },
        orderStateBySymbol: {
          EURUSD: { symbol: 'EURUSD', sequence: ['d1', CANDLES_SENTINEL], candlesVisible: true },
        },
      });

      useDrawingStore.getState().duplicateSymbolDrawing('EURUSD', 'nonexistent', 'clone_id');

      assert.equal(useDrawingStore.getState().drawingsBySymbol['EURUSD'].length, 1);
      assert.deepEqual(useDrawingStore.getState().orderStateBySymbol['EURUSD'].sequence, ['d1', CANDLES_SENTINEL]);
      assert.equal(mockRepoState.saveOrderStateCalls.length, 0);
    });
  });

  describe('3. Drawing Deletion (removeSymbolDrawing & batchRemoveSymbolDrawings)', () => {
    it('removeSymbolDrawing removes drawing from both drawings list and canonical sequence and persists', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'D1', points: [] },
            { id: 'd2', name: 'D2', points: [] },
            { id: 'd3', name: 'D3', points: [] },
          ],
        },
        orderStateBySymbol: {
          EURUSD: { symbol: 'EURUSD', sequence: ['d1', 'd2', 'd3', CANDLES_SENTINEL], candlesVisible: true },
        },
      });

      // Remove d2
      useDrawingStore.getState().removeSymbolDrawing('EURUSD', 'd2');

      const drawings = useDrawingStore.getState().drawingsBySymbol['EURUSD'];
      assert.deepEqual(drawings.map((d) => d.id), ['d1', 'd3']);

      const orderState = useDrawingStore.getState().orderStateBySymbol['EURUSD'];
      assert.ok(orderState);
      assert.deepEqual(orderState.sequence, ['d1', 'd3', CANDLES_SENTINEL]);

      // Verified persistence
      assert.equal(mockRepoState.saveDrawingsCalls.length, 1);
      assert.equal(mockRepoState.saveOrderStateCalls.length, 1);
      assert.deepEqual(mockRepoState.saveOrderStateCalls[0].orderState.sequence, ['d1', 'd3', CANDLES_SENTINEL]);
    });

    it('batchRemoveSymbolDrawings removes multiple drawings from sequence in a single operation', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'D1', points: [] },
            { id: 'd2', name: 'D2', points: [] },
            { id: 'd3', name: 'D3', points: [] },
            { id: 'd4', name: 'D4', points: [] },
          ],
        },
        orderStateBySymbol: {
          EURUSD: { symbol: 'EURUSD', sequence: ['d1', 'd2', 'd3', 'd4', CANDLES_SENTINEL], candlesVisible: true },
        },
      });

      // Remove d1 and d3 simultaneously
      useDrawingStore.getState().batchRemoveSymbolDrawings('EURUSD', ['d1', 'd3']);

      const drawings = useDrawingStore.getState().drawingsBySymbol['EURUSD'];
      assert.deepEqual(drawings.map((d) => d.id), ['d2', 'd4']);

      const orderState = useDrawingStore.getState().orderStateBySymbol['EURUSD'];
      assert.ok(orderState);
      assert.deepEqual(orderState.sequence, ['d2', 'd4', CANDLES_SENTINEL]);

      assert.equal(mockRepoState.saveDrawingsCalls.length, 1);
      assert.equal(mockRepoState.saveOrderStateCalls.length, 1);
      assert.deepEqual(mockRepoState.saveOrderStateCalls[0].orderState.sequence, ['d2', 'd4', CANDLES_SENTINEL]);
    });

    it('removing all drawings leaves only the candles sentinel in canonical sequence', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'D1', points: [] },
            { id: 'd2', name: 'D2', points: [] },
          ],
        },
        orderStateBySymbol: {
          EURUSD: { symbol: 'EURUSD', sequence: ['d1', 'd2', CANDLES_SENTINEL], candlesVisible: true },
        },
      });

      useDrawingStore.getState().batchRemoveSymbolDrawings('EURUSD', ['d1', 'd2']);

      const drawings = useDrawingStore.getState().drawingsBySymbol['EURUSD'];
      assert.equal(drawings.length, 0);

      const orderState = useDrawingStore.getState().orderStateBySymbol['EURUSD'];
      assert.ok(orderState);
      assert.deepEqual(orderState.sequence, [CANDLES_SENTINEL]);
    });
  });

  describe('4. Legacy Compatibility Invariants', () => {
    it('preserves extendData.order when drawings are created or duplicated', () => {
      useDrawingStore.getState().addSymbolDrawing('EURUSD', {
        id: 'legacy_d1',
        name: 'Legacy 1',
        points: [],
        extendData: { order: 12345 },
      });

      const drawing = useDrawingStore.getState().drawingsBySymbol['EURUSD'][0];
      assert.equal(drawing.extendData?.order, 12345);

      useDrawingStore.getState().duplicateSymbolDrawing('EURUSD', 'legacy_d1', 'legacy_d1_clone');
      const clone = useDrawingStore.getState().drawingsBySymbol['EURUSD'].find((d) => d.id === 'legacy_d1_clone');
      assert.ok(clone);
      assert.equal(clone.extendData?.order, 12345);
    });
  });
});
