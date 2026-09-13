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
  migrateLegacyOrderToCanonical,
  validateOrderSequence,
} from '../../engine/charting/orderEngine.ts';

// In-memory mock repository state for store tests
export const mockRepositoryState = {
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
          getFolders: async (symbol) => globalThis.__mockRepo?.savedFoldersBySymbol.get(symbol) || [],
          saveFolders: async (symbol, folders) => {
            globalThis.__mockRepo?.savedFoldersBySymbol.set(symbol, folders);
            globalThis.__mockRepo?.saveFoldersCalls.push({ symbol, folders });
          },
          getDrawings: async (symbol) => globalThis.__mockRepo?.savedDrawingsBySymbol.get(symbol) || [],
          saveDrawings: async (symbol, drawings) => {
            globalThis.__mockRepo?.savedDrawingsBySymbol.set(symbol, drawings);
            globalThis.__mockRepo?.saveDrawingsCalls.push({ symbol, drawings });
          },
          getOrderState: async (symbol) => globalThis.__mockRepo?.savedOrderStateBySymbol.get(symbol) || null,
          saveOrderState: async (symbol, orderState) => {
            globalThis.__mockRepo?.savedOrderStateBySymbol.set(symbol, orderState);
            globalThis.__mockRepo?.saveOrderStateCalls.push({ symbol, orderState });
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
(globalThis as any).__mockRepo = mockRepositoryState;

const storeModule = await import(pathToFileURL(path.resolve('src/store/useDrawingStore.ts')).href);
const { useDrawingStore } = storeModule;

describe('Phase 2B — Canonical Order Persistence & Migration', () => {
  describe('1. Pure Legacy Migration Algorithm (migrateLegacyOrderToCanonical)', () => {
    it('sorts drawings descending by extendData.order with deterministic tie-breaking', () => {
      const drawings = [
        { id: 'line_B', extendData: { order: 200 } },
        { id: 'line_A', extendData: { order: 200 } },
        { id: 'line_C', extendData: { order: 500 } },
        { id: 'line_D', extendData: { order: 100 } },
      ];

      const state = migrateLegacyOrderToCanonical('EURUSD', drawings);
      assert.equal(state.symbol, 'EURUSD');
      // line_C (500) top, then line_B before line_A (tie break on id desc), then line_D (100), then candles
      assert.deepEqual(state.sequence, ['line_C', 'line_B', 'line_A', 'line_D', CANDLES_SENTINEL]);
      assert.equal(state.candlesVisible, true);
    });

    it('places unranked / undefined order drawings at the top (Infinity rule)', () => {
      const drawings = [
        { id: 'old_1', extendData: { order: 200 } },
        { id: 'new_unranked', extendData: {} },
        { id: 'old_2', extendData: { order: 100 } },
      ];

      const state = migrateLegacyOrderToCanonical('EURUSD', drawings);
      assert.deepEqual(state.sequence, ['new_unranked', 'old_1', 'old_2', CANDLES_SENTINEL]);
    });

    it('clusters folder children contiguously around the highest-ranked child', () => {
      // f1 has child1 (order 400) and child2 (order 100).
      // Root drawing d_mid has order 250 (between child1 and child2).
      const drawings = [
        { id: 'child1', extendData: { order: 400, folderId: 'f1' } },
        { id: 'd_mid', extendData: { order: 250 } },
        { id: 'child2', extendData: { order: 100, folderId: 'f1' } },
      ];

      const state = migrateLegacyOrderToCanonical('EURUSD', drawings);
      // child2 must be pulled up to form a contiguous block with child1
      assert.deepEqual(state.sequence, ['child1', 'child2', 'd_mid', CANDLES_SENTINEL]);
      assert.equal(
        validateOrderSequence(state.sequence, ['child1', 'd_mid', 'child2'], { child1: 'f1', child2: 'f1', d_mid: null }).isValid,
        true
      );
    });

    it('is strictly deterministic and idempotent', () => {
      const drawings = [
        { id: 'd3', extendData: { order: 300 } },
        { id: 'd1', extendData: { order: 100 } },
        { id: 'd2', extendData: { order: 200 } },
      ];

      const run1 = migrateLegacyOrderToCanonical('EURUSD', drawings);
      const run2 = migrateLegacyOrderToCanonical('EURUSD', drawings);
      assert.deepEqual(run1, run2);
    });

    it('handles empty drawing list safely', () => {
      const state = migrateLegacyOrderToCanonical('EURUSD', []);
      assert.deepEqual(state.sequence, [CANDLES_SENTINEL]);
      assert.equal(state.candlesVisible, true);
    });

    it('supports customizable candles placement and visibility', () => {
      const drawings = [{ id: 'd1', extendData: { order: 100 } }];
      const state = migrateLegacyOrderToCanonical('EURUSD', drawings, undefined, {
        candlesVisible: false,
        defaultCandlesPlacement: 'top',
      });
      assert.deepEqual(state.sequence, [CANDLES_SENTINEL, 'd1']);
      assert.equal(state.candlesVisible, false);
    });
  });

  describe('2. Canonical Order Loading & Automatic Migration Lifecycle', () => {
    beforeEach(() => {
      mockRepositoryState.reset();
      useDrawingStore.setState({
        drawingsBySymbol: {},
        orderStateBySymbol: {},
        folders: [],
      });
    });

    it('migrates and persists when no canonical state exists in repository', async () => {
      // Seed legacy drawings in mock repo
      mockRepositoryState.savedDrawingsBySymbol.set('EURUSD', [
        { id: 'd2', extendData: { order: 200 } },
        { id: 'd1', extendData: { order: 100 } },
      ]);

      const state = await useDrawingStore.getState().loadSymbolOrderState('EURUSD');
      assert.ok(state);
      assert.deepEqual(state.sequence, ['d2', 'd1', CANDLES_SENTINEL]);

      // Verified persisted in mock repository
      assert.equal(mockRepositoryState.saveOrderStateCalls.length, 1);
      assert.equal(mockRepositoryState.saveOrderStateCalls[0].symbol, 'EURUSD');
      assert.deepEqual(mockRepositoryState.saveOrderStateCalls[0].orderState.sequence, ['d2', 'd1', CANDLES_SENTINEL]);
    });

    it('loads existing persisted canonical order state without migrating again', async () => {
      mockRepositoryState.savedDrawingsBySymbol.set('EURUSD', [
        { id: 'd1', extendData: { order: 100 } },
        { id: 'd2', extendData: { order: 200 } },
      ]);
      // Explicit persisted sequence (d1 before d2, contrary to legacy order)
      const existingCanonical: SymbolOrderState = {
        symbol: 'EURUSD',
        sequence: ['d1', 'd2', CANDLES_SENTINEL],
        candlesVisible: true,
      };
      mockRepositoryState.savedOrderStateBySymbol.set('EURUSD', existingCanonical);

      const state = await useDrawingStore.getState().loadSymbolOrderState('EURUSD');
      assert.ok(state);
      assert.deepEqual(state.sequence, ['d1', 'd2', CANDLES_SENTINEL]);
      // Should NOT re-save since normalization didn't change it
      assert.equal(mockRepositoryState.saveOrderStateCalls.length, 0);
    });

    it('normalizes loaded canonical state against current drawings if stale or missing items exist', async () => {
      mockRepositoryState.savedDrawingsBySymbol.set('EURUSD', [
        { id: 'd1', extendData: {} },
        { id: 'd_new', extendData: {} }, // New drawing not in persisted sequence
      ]);
      // Persisted sequence has d1 and stale d_deleted
      const existingCanonical: SymbolOrderState = {
        symbol: 'EURUSD',
        sequence: ['d1', 'd_deleted', CANDLES_SENTINEL],
        candlesVisible: true,
      };
      mockRepositoryState.savedOrderStateBySymbol.set('EURUSD', existingCanonical);

      const state = await useDrawingStore.getState().loadSymbolOrderState('EURUSD');
      assert.ok(state);
      // d_deleted should be removed, d_new should be added
      assert.deepEqual(state.sequence, ['d1', CANDLES_SENTINEL, 'd_new']);
      // Normalization changed the sequence, so updated state was saved back
      assert.equal(mockRepositoryState.saveOrderStateCalls.length, 1);
    });
  });

  describe('3. Persistence on State Mutators', () => {
    beforeEach(() => {
      mockRepositoryState.reset();
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
    });

    it('setSymbolOrderSequence persists updated canonical sequence to repository', async () => {
      useDrawingStore.getState().setSymbolOrderSequence('EURUSD', ['d2', 'd1', CANDLES_SENTINEL]);

      assert.equal(mockRepositoryState.saveOrderStateCalls.length, 1);
      assert.equal(mockRepositoryState.saveOrderStateCalls[0].symbol, 'EURUSD');
      assert.deepEqual(mockRepositoryState.saveOrderStateCalls[0].orderState.sequence, ['d2', 'd1', CANDLES_SENTINEL]);
    });
  });

  describe('4. Multi-Symbol Isolation & Concurrency Safety', () => {
    beforeEach(() => {
      mockRepositoryState.reset();
      useDrawingStore.setState({
        drawingsBySymbol: {},
        orderStateBySymbol: {},
      });
    });

    it('keeps order state completely isolated between EURUSD and GBPUSD', async () => {
      mockRepositoryState.savedDrawingsBySymbol.set('EURUSD', [{ id: 'eu_1', extendData: { order: 100 } }]);
      mockRepositoryState.savedDrawingsBySymbol.set('GBPUSD', [{ id: 'gu_1', extendData: { order: 200 } }]);

      // Hydrate both concurrently
      const [euState, guState] = await Promise.all([
        useDrawingStore.getState().loadSymbolOrderState('EURUSD'),
        useDrawingStore.getState().loadSymbolOrderState('GBPUSD'),
      ]);

      assert.deepEqual(euState?.sequence, ['eu_1', CANDLES_SENTINEL]);
      assert.deepEqual(guState?.sequence, ['gu_1', CANDLES_SENTINEL]);

      const store = useDrawingStore.getState().orderStateBySymbol;
      assert.deepEqual(store['EURUSD']?.sequence, ['eu_1', CANDLES_SENTINEL]);
      assert.deepEqual(store['GBPUSD']?.sequence, ['gu_1', CANDLES_SENTINEL]);
    });
  });

  describe('5. Automatic Hydration via loadSymbolDrawings', () => {
    beforeEach(() => {
      mockRepositoryState.reset();
      useDrawingStore.setState({
        drawingsBySymbol: {},
        orderStateBySymbol: {},
      });
    });

    it('loadSymbolDrawings triggers loadSymbolOrderState asynchronously without throwing', async () => {
      mockRepositoryState.savedDrawingsBySymbol.set('EURUSD', [
        { id: 'd1', extendData: { order: 300 } },
      ]);

      const items = await useDrawingStore.getState().loadSymbolDrawings('EURUSD');
      assert.equal(items.length, 1);

      // Wait a microtask tick for async loadSymbolOrderState to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      const orderState = useDrawingStore.getState().orderStateBySymbol['EURUSD'];
      assert.ok(orderState);
      assert.deepEqual(orderState.sequence, ['d1', CANDLES_SENTINEL]);
    });
  });
});
