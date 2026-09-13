import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

import {
  CANDLES_SENTINEL,
  type SymbolOrderState,
  type DrawingFolderLookup,
  validateOrderSequence,
  normalizeOrderSequence,
  repairFolderContiguity,
  getFolderBlockRange,
  bringToFront,
  sendToBack,
  bringForward,
  sendBackward,
  moveFolderBlock,
  moveDrawingIntoFolder,
  moveDrawingOutOfFolder,
  insertDrawing,
  duplicateDrawing,
  deleteFromSequence,
} from '../../engine/charting/orderEngine.ts';

// In-memory mock repository state for store tests
export const mockRepositoryState = {
  savedFoldersBySymbol: new Map<string, any[]>(),
  saveFoldersCalls: [] as any[],
  saveDrawingsCalls: [] as any[],
  reset() {
    this.savedFoldersBySymbol.clear();
    this.saveFoldersCalls = [];
    this.saveDrawingsCalls = [];
  },
};

// Register custom ESM loader to resolve @/ alias and mock @/repository & @/engine/charting
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
          getFolders: async (symbol) => {
            return globalThis.__mockRepo?.savedFoldersBySymbol.get(symbol) || [];
          },
          saveFolders: async (symbol, folders) => {
            globalThis.__mockRepo?.savedFoldersBySymbol.set(symbol, folders);
            globalThis.__mockRepo?.saveFoldersCalls.push({ symbol, folders });
          },
          saveDrawings: async (symbol, drawings) => {
            globalThis.__mockRepo?.saveDrawingsCalls.push({ symbol, drawings });
          },
          getDrawings: async () => [],
          getOrderState: async () => null,
          saveOrderState: async () => {},
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
(globalThis as any).__mockRepo = mockRepositoryState;



const storeModule = await import(pathToFileURL(path.resolve('src/store/useDrawingStore.ts')).href);
const { useDrawingStore } = storeModule;

describe('Phase 2A — Canonical Order Store Model & Safety Tests', () => {
  describe('1. Invariant Validation (validateOrderSequence)', () => {
    it('passes for a valid sequence containing drawings, folder blocks, and candles', () => {
      const sequence = ['d1', 'd2', 'd3', 'candles', 'd4'];
      const knownIds = ['d1', 'd2', 'd3', 'd4'];
      const lookup: DrawingFolderLookup = {
        d1: null,
        d2: 'folderA',
        d3: 'folderA',
        d4: null,
      };

      const result = validateOrderSequence(sequence, knownIds, lookup);
      assert.equal(result.isValid, true);
      assert.equal(result.errors.length, 0);
    });

    it('rejects sequence missing the candles sentinel', () => {
      const sequence = ['d1', 'd2'];
      const knownIds = ['d1', 'd2'];
      const lookup: DrawingFolderLookup = {};

      const result = validateOrderSequence(sequence, knownIds, lookup);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some(e => e.includes("Missing 'candles' sentinel")));
    });

    it('rejects sequence with duplicate candles sentinels', () => {
      const sequence = ['candles', 'd1', 'candles'];
      const knownIds = ['d1'];
      const lookup: DrawingFolderLookup = {};

      const result = validateOrderSequence(sequence, knownIds, lookup);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some(e => e.includes("Duplicate 'candles' sentinel")));
    });

    it('rejects sequence with duplicate drawing IDs', () => {
      const sequence = ['d1', 'candles', 'd1'];
      const knownIds = ['d1'];
      const lookup: DrawingFolderLookup = {};

      const result = validateOrderSequence(sequence, knownIds, lookup);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some(e => e.includes('Duplicate IDs in sequence: d1')));
    });

    it('rejects sequence missing known drawings', () => {
      const sequence = ['candles', 'd1'];
      const knownIds = ['d1', 'd2'];
      const lookup: DrawingFolderLookup = {};

      const result = validateOrderSequence(sequence, knownIds, lookup);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some(e => e.includes("Known drawing ID 'd2' is missing")));
    });

    it('rejects sequence with unknown drawing IDs', () => {
      const sequence = ['candles', 'd1', 'ghost'];
      const knownIds = ['d1'];
      const lookup: DrawingFolderLookup = {};

      const result = validateOrderSequence(sequence, knownIds, lookup);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some(e => e.includes("Unknown drawing ID 'ghost' in sequence")));
    });

    it('rejects sequence when folder children are not contiguous', () => {
      // d2 and d4 belong to folderA, separated by d3 and candles
      const sequence = ['d1', 'd2', 'd3', 'candles', 'd4'];
      const knownIds = ['d1', 'd2', 'd3', 'd4'];
      const lookup: DrawingFolderLookup = {
        d1: null,
        d2: 'folderA',
        d3: null,
        d4: 'folderA',
      };

      const result = validateOrderSequence(sequence, knownIds, lookup);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some(e => e.includes("Folder 'folderA' children are not contiguous")));
    });
  });

  describe('2. Normalization & Contiguity Repair (normalizeOrderSequence)', () => {
    it('constructs a valid default sequence when given null/empty sequence', () => {
      const knownIds = ['d1', 'd2'];
      const lookup: DrawingFolderLookup = { d1: 'f1', d2: 'f1' };

      const result = normalizeOrderSequence(null, knownIds, lookup);
      assert.deepEqual(result, ['d1', 'd2', CANDLES_SENTINEL]);
      assert.equal(validateOrderSequence(result, knownIds, lookup).isValid, true);
    });

    it('places candles at top if specified in options', () => {
      const knownIds = ['d1'];
      const lookup: DrawingFolderLookup = {};

      const result = normalizeOrderSequence(null, knownIds, lookup, { defaultCandlesPlacement: 'top' });
      assert.deepEqual(result, [CANDLES_SENTINEL, 'd1']);
    });

    it('filters duplicates and removes unknown drawings while preserving existing order', () => {
      const raw = ['d2', 'candles', 'd2', 'unknownX', 'd1'];
      const knownIds = ['d1', 'd2', 'd3'];
      const lookup: DrawingFolderLookup = {};

      const result = normalizeOrderSequence(raw, knownIds, lookup);
      assert.deepEqual(result, ['d2', 'candles', 'd1', 'd3']);
      assert.equal(validateOrderSequence(result, knownIds, lookup).isValid, true);
    });

    it('automatically repairs broken folder contiguity by clustering around the first child', () => {
      const raw = ['d1', 'd2', 'd3', 'candles', 'd4'];
      const knownIds = ['d1', 'd2', 'd3', 'd4'];
      const lookup: DrawingFolderLookup = {
        d1: null,
        d2: 'folderX',
        d3: null,
        d4: 'folderX',
      };

      const result = normalizeOrderSequence(raw, knownIds, lookup);
      assert.deepEqual(result, ['d1', 'd2', 'd4', 'd3', 'candles']);
      assert.equal(validateOrderSequence(result, knownIds, lookup).isValid, true);
    });
  });

  describe('3. Bring to Front & Send to Back', () => {
    const knownIds = ['d1', 'd2', 'd3', 'd4'];
    const lookup: DrawingFolderLookup = {
      d1: null,
      d2: 'fA',
      d3: 'fA',
      d4: null,
    };

    it('bringToFront moves a root drawing to index 0', () => {
      const seq = ['d1', 'd2', 'd3', 'candles', 'd4'];
      const result = bringToFront(seq, 'd4', lookup);
      assert.deepEqual(result, ['d4', 'd1', 'd2', 'd3', 'candles']);
    });

    it('bringToFront moves candles to index 0', () => {
      const seq = ['d1', 'd2', 'd3', 'candles', 'd4'];
      const result = bringToFront(seq, 'candles', lookup);
      assert.deepEqual(result, ['candles', 'd1', 'd2', 'd3', 'd4']);
    });

    it('bringToFront on a folder child is scoped to that folder block (cannot escape folder)', () => {
      const seq = ['d1', 'd2', 'd3', 'candles', 'd4'];
      const result = bringToFront(seq, 'd3', lookup);
      assert.deepEqual(result, ['d1', 'd3', 'd2', 'candles', 'd4']);
      assert.equal(validateOrderSequence(result, knownIds, lookup).isValid, true);
    });

    it('sendToBack moves a root drawing to the last index', () => {
      const seq = ['d1', 'd2', 'd3', 'candles', 'd4'];
      const result = sendToBack(seq, 'd1', lookup);
      assert.deepEqual(result, ['d2', 'd3', 'candles', 'd4', 'd1']);
    });

    it('sendToBack moves candles to the last index', () => {
      const seq = ['d1', 'candles', 'd2', 'd3', 'd4'];
      const result = sendToBack(seq, 'candles', lookup);
      assert.deepEqual(result, ['d1', 'd2', 'd3', 'd4', 'candles']);
    });

    it('sendToBack on a folder child is scoped to that folder block (cannot escape folder)', () => {
      const seq = ['d1', 'd2', 'd3', 'candles', 'd4'];
      const result = sendToBack(seq, 'd2', lookup);
      assert.deepEqual(result, ['d1', 'd3', 'd2', 'candles', 'd4']);
      assert.equal(validateOrderSequence(result, knownIds, lookup).isValid, true);
    });
  });

  describe('4. Bring Forward & Send Backward', () => {
    const knownIds = ['d1', 'd2', 'd3', 'd4', 'd5'];
    const lookup: DrawingFolderLookup = {
      d1: null,
      d2: 'fA',
      d3: 'fA',
      d4: null,
      d5: 'fB',
    };

    it('bringForward swaps adjacent root items', () => {
      const seq = ['d1', 'candles', 'd4'];
      const result = bringForward(seq, 'candles', lookup);
      assert.deepEqual(result, ['candles', 'd1', 'd4']);
    });

    it('bringForward on a root item jumps over an entire predecessor folder block', () => {
      const seq = ['d1', 'd2', 'd3', 'd4', 'candles'];
      const result = bringForward(seq, 'd4', lookup);
      assert.deepEqual(result, ['d1', 'd4', 'd2', 'd3', 'candles']);
      assert.equal(validateOrderSequence(result, ['d1', 'd2', 'd3', 'd4'], lookup).isValid, true);
    });

    it('bringForward on folder child swaps within folder and stops at folder boundary', () => {
      const seq = ['d1', 'd2', 'd3', 'candles'];
      const res1 = bringForward(seq, 'd3', lookup);
      assert.deepEqual(res1, ['d1', 'd3', 'd2', 'candles']);

      const res2 = bringForward(res1, 'd3', lookup);
      assert.deepEqual(res2, ['d1', 'd3', 'd2', 'candles']);
    });

    it('sendBackward swaps adjacent root items', () => {
      const seq = ['d1', 'candles', 'd4'];
      const result = sendBackward(seq, 'd1', lookup);
      assert.deepEqual(result, ['candles', 'd1', 'd4']);
    });

    it('sendBackward on a root item jumps after an entire successor folder block', () => {
      const seq = ['d1', 'd2', 'd3', 'candles'];
      const result = sendBackward(seq, 'd1', lookup);
      assert.deepEqual(result, ['d2', 'd3', 'd1', 'candles']);
      assert.equal(validateOrderSequence(result, ['d1', 'd2', 'd3'], lookup).isValid, true);
    });

    it('sendBackward on folder child swaps within folder and stops at folder boundary', () => {
      const seq = ['d1', 'd2', 'd3', 'candles'];
      const res1 = sendBackward(seq, 'd2', lookup);
      assert.deepEqual(res1, ['d1', 'd3', 'd2', 'candles']);

      const res2 = sendBackward(res1, 'd2', lookup);
      assert.deepEqual(res2, ['d1', 'd3', 'd2', 'candles']);
    });
  });

  describe('5. Moving Entire Folder Blocks (moveFolderBlock)', () => {
    const knownIds = ['d1', 'd2', 'd3', 'd4', 'd5'];
    const lookup: DrawingFolderLookup = {
      d1: null,
      d2: 'fA',
      d3: 'fA',
      d4: null,
      d5: 'fB',
    };

    it('moves folder block above a target root drawing', () => {
      const seq = ['d1', 'd4', 'd2', 'd3', 'candles'];
      const result = moveFolderBlock(seq, 'fA', 'd1', 'above', lookup);
      assert.deepEqual(result, ['d2', 'd3', 'd1', 'd4', 'candles']);
      assert.equal(validateOrderSequence(result, ['d1', 'd2', 'd3', 'd4'], lookup).isValid, true);
    });

    it('moves folder block below candles', () => {
      const seq = ['d1', 'd2', 'd3', 'candles', 'd4'];
      const result = moveFolderBlock(seq, 'fA', 'candles', 'below', lookup);
      assert.deepEqual(result, ['d1', 'candles', 'd2', 'd3', 'd4']);
      assert.equal(validateOrderSequence(result, ['d1', 'd2', 'd3', 'd4'], lookup).isValid, true);
    });

    it('moves folder block above another entire folder block', () => {
      const seq = ['d1', 'd5', 'd2', 'd3', 'candles'];
      const result = moveFolderBlock(seq, 'fA', 'd5', 'above', lookup);
      assert.deepEqual(result, ['d1', 'd2', 'd3', 'd5', 'candles']);
      assert.equal(validateOrderSequence(result, ['d1', 'd2', 'd3', 'd5'], lookup).isValid, true);
    });
  });

  describe('6. Moving Drawings Into and Out of Folders', () => {
    it('moveDrawingIntoFolder places drawing at top of folder block', () => {
      const seq = ['d1', 'd2', 'd3', 'candles'];
      const lookup: DrawingFolderLookup = { d1: null, d2: 'fA', d3: 'fA' };

      const { nextSequence, nextFolderLookup } = moveDrawingIntoFolder(seq, 'd1', 'fA', lookup, 'top');
      assert.deepEqual(nextSequence, ['d1', 'd2', 'd3', 'candles']);
      assert.equal(nextFolderLookup.d1, 'fA');
      assert.equal(validateOrderSequence(nextSequence, ['d1', 'd2', 'd3'], nextFolderLookup).isValid, true);
    });

    it('moveDrawingIntoFolder places drawing at bottom of folder block', () => {
      const seq = ['d1', 'd2', 'd3', 'candles'];
      const lookup: DrawingFolderLookup = { d1: null, d2: 'fA', d3: 'fA' };

      const { nextSequence, nextFolderLookup } = moveDrawingIntoFolder(seq, 'd1', 'fA', lookup, 'bottom');
      assert.deepEqual(nextSequence, ['d2', 'd3', 'd1', 'candles']);
      assert.equal(nextFolderLookup.d1, 'fA');
      assert.equal(validateOrderSequence(nextSequence, ['d1', 'd2', 'd3'], nextFolderLookup).isValid, true);
    });

    it('moveDrawingOutOfFolder places drawing immediately above former folder', () => {
      const seq = ['d1', 'd2', 'd3', 'candles'];
      const lookup: DrawingFolderLookup = { d1: null, d2: 'fA', d3: 'fA' };

      const { nextSequence, nextFolderLookup } = moveDrawingOutOfFolder(seq, 'd3', lookup, 'above_folder');
      assert.deepEqual(nextSequence, ['d1', 'd3', 'd2', 'candles']);
      assert.equal(nextFolderLookup.d3, null);
      assert.equal(validateOrderSequence(nextSequence, ['d1', 'd2', 'd3'], nextFolderLookup).isValid, true);
    });

    it('moveDrawingOutOfFolder places drawing immediately below former folder', () => {
      const seq = ['d1', 'd2', 'd3', 'candles'];
      const lookup: DrawingFolderLookup = { d1: null, d2: 'fA', d3: 'fA' };

      const { nextSequence, nextFolderLookup } = moveDrawingOutOfFolder(seq, 'd2', lookup, 'below_folder');
      assert.deepEqual(nextSequence, ['d1', 'd3', 'd2', 'candles']);
      assert.equal(nextFolderLookup.d2, null);
      assert.equal(validateOrderSequence(nextSequence, ['d1', 'd2', 'd3'], nextFolderLookup).isValid, true);
    });
  });

  describe('7. Insertion, Duplication, and Deletion', () => {
    it('insertDrawing at root places drawing at index 0 (topmost)', () => {
      const seq = ['d1', 'candles'];
      const result = insertDrawing(seq, 'newD');
      assert.deepEqual(result, ['newD', 'd1', 'candles']);
    });

    it('insertDrawing into folder places drawing at start of folder block', () => {
      const seq = ['d1', 'd2', 'd3', 'candles'];
      const lookup: DrawingFolderLookup = { d2: 'fA', d3: 'fA' };
      const result = insertDrawing(seq, 'newD', 'fA', lookup);
      assert.deepEqual(result, ['d1', 'newD', 'd2', 'd3', 'candles']);
    });

    it('duplicateDrawing inserts clone immediately in front of source', () => {
      const seq = ['d1', 'd2', 'candles'];
      const result = duplicateDrawing(seq, 'd2', 'd2_copy');
      assert.deepEqual(result, ['d1', 'd2_copy', 'd2', 'candles']);
    });

    it('deleteFromSequence removes target item cleanly', () => {
      const seq = ['d1', 'd2', 'candles'];
      const result = deleteFromSequence(seq, 'd2');
      assert.deepEqual(result, ['d1', 'candles']);
    });
  });

  describe('8. Edge Cases (Candles, Empty Folders, Single-child Folders)', () => {
    it('handles candles at index 0 (topmost) correctly', () => {
      const seq = ['candles', 'd1', 'd2'];
      const lookup: DrawingFolderLookup = {};
      const res = sendBackward(seq, 'candles', lookup);
      assert.deepEqual(res, ['d1', 'candles', 'd2']);
    });

    it('handles candles at last index (bottommost) correctly', () => {
      const seq = ['d1', 'd2', 'candles'];
      const lookup: DrawingFolderLookup = {};
      const res = bringForward(seq, 'candles', lookup);
      assert.deepEqual(res, ['d1', 'candles', 'd2']);
    });

    it('moving a single child within its folder is a safe no-op', () => {
      const seq = ['d1', 'singleChild', 'candles'];
      const lookup: DrawingFolderLookup = { singleChild: 'fSolo' };
      const res1 = bringForward(seq, 'singleChild', lookup);
      assert.deepEqual(res1, seq);
      const res2 = sendBackward(seq, 'singleChild', lookup);
      assert.deepEqual(res2, seq);
      const res3 = bringToFront(seq, 'singleChild', lookup);
      assert.deepEqual(res3, seq);
      const res4 = sendToBack(seq, 'singleChild', lookup);
      assert.deepEqual(res4, seq);
    });

    it('moving an empty folder block is a safe no-op', () => {
      const seq = ['d1', 'candles'];
      const lookup: DrawingFolderLookup = {};
      const res = moveFolderBlock(seq, 'emptyFolder', 'd1', 'above', lookup);
      assert.deepEqual(res, seq);
    });
  });

  describe('9. useDrawingStore Integration (Phase 2A Actions)', () => {
    beforeEach(() => {
      mockRepositoryState.reset();
      useDrawingStore.setState({
        drawingsBySymbol: {},
        orderStateBySymbol: {},
      });
    });

    it('getSymbolOrderSequence initializes normalized sequence with drawings and candles', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'Line 1', points: [] },
            { id: 'd2', name: 'Line 2', points: [] },
          ],
        },
      });

      const seq = useDrawingStore.getState().getSymbolOrderSequence('EURUSD');
      assert.deepEqual(seq, ['d1', 'd2', CANDLES_SENTINEL]);
    });

    it('setSymbolOrderSequence updates store state and normalizes input', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'Line 1', points: [] },
            { id: 'd2', name: 'Line 2', points: [] },
          ],
        },
      });

      useDrawingStore.getState().setSymbolOrderSequence('EURUSD', ['d2', 'candles', 'd1']);
      const state = useDrawingStore.getState().orderStateBySymbol['EURUSD'];
      assert.deepEqual(state?.sequence, ['d2', 'candles', 'd1']);
      assert.equal(state?.candlesVisible, true);
    });

    it('reorderSymbolItem invokes pure engine operations through store', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'Line 1', points: [] },
            { id: 'd2', name: 'Line 2', points: [] },
          ],
        },
        orderStateBySymbol: {
          EURUSD: { symbol: 'EURUSD', sequence: ['d1', 'd2', 'candles'], candlesVisible: true },
        },
      });

      // Move candles to front
      useDrawingStore.getState().reorderSymbolItem('EURUSD', 'candles', 'front');
      assert.deepEqual(
        useDrawingStore.getState().orderStateBySymbol['EURUSD'].sequence,
        ['candles', 'd1', 'd2']
      );

      // Move d1 forward
      useDrawingStore.getState().reorderSymbolItem('EURUSD', 'd1', 'forward');
      assert.deepEqual(
        useDrawingStore.getState().orderStateBySymbol['EURUSD'].sequence,
        ['d1', 'candles', 'd2']
      );
    });

    it('moveSymbolDrawingFolder updates both sequence and drawing extendData.folderId', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'Line 1', points: [] },
            { id: 'd2', name: 'Line 2', points: [], extendData: { folderId: 'f1' } },
            { id: 'd3', name: 'Line 3', points: [], extendData: { folderId: 'f1' } },
          ],
        },
        orderStateBySymbol: {
          EURUSD: { symbol: 'EURUSD', sequence: ['d1', 'd2', 'd3', 'candles'], candlesVisible: true },
        },
      });

      // Move d1 into f1 (placement: bottom)
      useDrawingStore.getState().moveSymbolDrawingFolder('EURUSD', 'd1', 'f1', 'bottom');

      const seq = useDrawingStore.getState().orderStateBySymbol['EURUSD'].sequence;
      assert.deepEqual(seq, ['d2', 'd3', 'd1', 'candles']);

      const updatedD1 = useDrawingStore.getState().drawingsBySymbol['EURUSD'].find(d => d.id === 'd1');
      assert.equal(updatedD1?.extendData?.folderId, 'f1');
    });
  });
});
