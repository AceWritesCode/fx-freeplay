import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';


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

  if (specifier === '@/utils/overlays' || specifier === '@/utils/overlays.ts') {
    return {
      url: 'data:text/javascript,' + encodeURIComponent(\`
        export function getInteractiveOverlayOptions() {
          return {};
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
        export const dataManagementRepository = {};
        export const sessionDisplayRepository = {};
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
const layoutModule = await import(pathToFileURL(path.resolve('src/store/useLayoutStore.ts')).href);
const { useLayoutStore } = layoutModule;
const reconcilerModule = await import(pathToFileURL(path.resolve('src/engine/charting/drawingReconciler.ts')).href);
const { reconcileWorkspace } = reconcilerModule;
const adapterModule = await import(pathToFileURL(path.resolve('src/engine/charting/drawingChartAdapter.ts')).href);
const { DrawingChartAdapter } = adapterModule;

function createMockChart() {
  const overlays = new Map<string, any>();
  return {
    _promotedOverlayInfo: null as any,
    _activeDraggingIndex: null as any,
    createOverlay: function (opts: any) {
      overlays.set(opts.id, { ...opts });
      return opts.id;
    },
    overrideOverlay: function (opts: any) {
      const existing = overlays.get(opts.id) || {};
      overlays.set(opts.id, { ...existing, ...opts });
    },
    removeOverlay: function (filter: any) {
      if (filter && filter.id) {
        overlays.delete(filter.id);
      }
    },
    getOverlays: function () {
      return Array.from(overlays.values());
    },
    _chartStore: {
      getPaneStore: () => ({
        getPanes: () => [],
      }),
    },
    updatePane: () => {},
  };
}

describe('Phase 2C-3 — Canonical Order Runtime Z-Level Reconciliation', () => {
  beforeEach(() => {
    mockRepositoryState.reset();
    useDrawingStore.setState({
      drawingsBySymbol: {},
      folders: [],
      selectedOverlayIds: [],
      orderStateBySymbol: {},
    });
    useLayoutStore.setState({
      slots: [{ symbol: 'EURUSD', timeframe: '1h' }],
      activeChartIndex: 0,
      syncDrawings: true,
    });
  });

  it('projects canonical sequence [A, B, C] -> runtime zLevels where A > B > C', () => {
    const chart = createMockChart();
    const chartInstancesRef = { current: [chart] };

    const drawings = [
      { id: 'drawingA', name: 'straight_line', points: [{ value: 1 }], symbol: 'EURUSD' },
      { id: 'drawingB', name: 'straight_line', points: [{ value: 2 }], symbol: 'EURUSD' },
      { id: 'drawingC', name: 'straight_line', points: [{ value: 3 }], symbol: 'EURUSD' },
    ];
    useDrawingStore.getState().setSymbolDrawings('EURUSD', drawings);
    useDrawingStore.getState().setSymbolOrderSequence('EURUSD', ['drawingA', 'drawingB', 'drawingC', CANDLES_SENTINEL]);

    reconcileWorkspace([{ symbol: 'EURUSD', timeframe: '1h' }], chartInstancesRef, 0, true);

    const overlays = chart.getOverlays();
    assert.equal(overlays.length, 3);

    const ovA = overlays.find((o: any) => o.id === 'drawingA');
    const ovB = overlays.find((o: any) => o.id === 'drawingB');
    const ovC = overlays.find((o: any) => o.id === 'drawingC');

    assert.ok(ovA, 'drawingA should exist on chart');
    assert.ok(ovB, 'drawingB should exist on chart');
    assert.ok(ovC, 'drawingC should exist on chart');

    assert.equal(ovA.zLevel, 30);
    assert.equal(ovB.zLevel, 20);
    assert.equal(ovC.zLevel, 10);
    assert.ok(ovA.zLevel > ovB.zLevel);
    assert.ok(ovB.zLevel > ovC.zLevel);
  });

  it('updates runtime zLevels when sequence is reordered without recreating overlays', () => {
    const chart = createMockChart();
    const chartInstancesRef = { current: [chart] };

    const drawings = [
      { id: 'drawingA', name: 'straight_line', points: [{ value: 1 }], symbol: 'EURUSD' },
      { id: 'drawingB', name: 'straight_line', points: [{ value: 2 }], symbol: 'EURUSD' },
    ];
    useDrawingStore.getState().setSymbolDrawings('EURUSD', drawings);
    useDrawingStore.getState().setSymbolOrderSequence('EURUSD', ['drawingA', 'drawingB', CANDLES_SENTINEL]);

    reconcileWorkspace([{ symbol: 'EURUSD', timeframe: '1h' }], chartInstancesRef, 0, true);

    let ovA = chart.getOverlays().find((o: any) => o.id === 'drawingA');
    let ovB = chart.getOverlays().find((o: any) => o.id === 'drawingB');
    assert.equal(ovA.zLevel, 20);
    assert.equal(ovB.zLevel, 10);

    // Reorder: bring drawingB to front
    useDrawingStore.getState().setSymbolOrderSequence('EURUSD', ['drawingB', 'drawingA', CANDLES_SENTINEL]);

    reconcileWorkspace([{ symbol: 'EURUSD', timeframe: '1h' }], chartInstancesRef, 0, true);

    ovA = chart.getOverlays().find((o: any) => o.id === 'drawingA');
    ovB = chart.getOverlays().find((o: any) => o.id === 'drawingB');

    assert.equal(ovB.zLevel, 20);
    assert.equal(ovA.zLevel, 10);
    assert.ok(ovB.zLevel > ovA.zLevel);
  });

  it('ensures candles sentinel does NOT become an overlay on the chart', () => {
    const chart = createMockChart();
    const chartInstancesRef = { current: [chart] };

    const drawings = [
      { id: 'drawingA', name: 'straight_line', points: [{ value: 1 }], symbol: 'EURUSD' },
    ];
    useDrawingStore.getState().setSymbolDrawings('EURUSD', drawings);
    useDrawingStore.getState().setSymbolOrderSequence('EURUSD', ['drawingA', CANDLES_SENTINEL]);

    reconcileWorkspace([{ symbol: 'EURUSD', timeframe: '1h' }], chartInstancesRef, 0, true);

    const overlays = chart.getOverlays();
    assert.equal(overlays.length, 1);
    assert.equal(overlays.some((o: any) => o.id === CANDLES_SENTINEL), false);
  });

  it('assigns identical natural zLevels across multiple chart slots showing the same symbol', () => {
    const chart1 = createMockChart();
    const chart2 = createMockChart();
    const chartInstancesRef = { current: [chart1, chart2] };

    const drawings = [
      { id: 'drawingA', name: 'straight_line', points: [{ value: 1 }], symbol: 'EURUSD' },
      { id: 'drawingB', name: 'straight_line', points: [{ value: 2 }], symbol: 'EURUSD' },
    ];
    useDrawingStore.getState().setSymbolDrawings('EURUSD', drawings);
    useDrawingStore.getState().setSymbolOrderSequence('EURUSD', ['drawingA', 'drawingB', CANDLES_SENTINEL]);

    const slots = [
      { symbol: 'EURUSD', timeframe: '1h' },
      { symbol: 'EURUSD', timeframe: '5m' },
    ];

    reconcileWorkspace(slots, chartInstancesRef, 0, true);

    const ov1A = chart1.getOverlays().find((o: any) => o.id === 'drawingA');
    const ov1B = chart1.getOverlays().find((o: any) => o.id === 'drawingB');

    const ov2A = chart2.getOverlays().find((o: any) => o.id.includes('drawingA'));
    const ov2B = chart2.getOverlays().find((o: any) => o.id.includes('drawingB'));

    assert.ok(ov1A && ov1B && ov2A && ov2B);
    assert.equal(ov1A.zLevel, ov2A.zLevel, 'Slot 1 and Slot 2 should have identical zLevel for drawing A');
    assert.equal(ov1B.zLevel, ov2B.zLevel, 'Slot 1 and Slot 2 should have identical zLevel for drawing B');
    assert.ok(ov1A.zLevel > ov1B.zLevel);
    assert.ok(ov2A.zLevel > ov2B.zLevel);
  });

  it('preserves temporary hover promotion and does NOT stomp temporary zLevel or alter canonical persistence', () => {
    const chart = createMockChart();
    const chartInstancesRef = { current: [chart] };

    const drawings = [
      { id: 'drawingA', name: 'straight_line', points: [{ value: 1 }], symbol: 'EURUSD' },
      { id: 'drawingB', name: 'straight_line', points: [{ value: 2 }], symbol: 'EURUSD' },
    ];
    useDrawingStore.getState().setSymbolDrawings('EURUSD', drawings);
    useDrawingStore.getState().setSymbolOrderSequence('EURUSD', ['drawingA', 'drawingB', CANDLES_SENTINEL]);

    reconcileWorkspace([{ symbol: 'EURUSD', timeframe: '1h' }], chartInstancesRef, 0, true);

    // Simulate useDrawingHoverCursor promoting drawingB temporarily
    chart._promotedOverlayInfo = {
      id: 'drawingB',
      originalZLevel: 10,
      temporaryZLevel: 999,
    };
    chart.overrideOverlay({ id: 'drawingB', zLevel: 999 });

    reconcileWorkspace([{ symbol: 'EURUSD', timeframe: '1h' }], chartInstancesRef, 0, true);

    const ovB = chart.getOverlays().find((o: any) => o.id === 'drawingB');
    assert.equal(ovB.zLevel, 999);
    assert.equal(chart._promotedOverlayInfo.originalZLevel, 10);

    const canonicalSeq = useDrawingStore.getState().getSymbolOrderSequence('EURUSD');
    assert.deepEqual(canonicalSeq, ['drawingA', 'drawingB', CANDLES_SENTINEL]);
  });

  it('safely normalizes missing or extra drawings into canonical sequence during reconciliation', () => {
    const chart = createMockChart();
    const chartInstancesRef = { current: [chart] };

    const drawings = [
      { id: 'dNew', name: 'straight_line', points: [{ value: 1 }], symbol: 'EURUSD' },
    ];
    useDrawingStore.getState().setSymbolDrawings('EURUSD', drawings);

    reconcileWorkspace([{ symbol: 'EURUSD', timeframe: '1h' }], chartInstancesRef, 0, true);

    const ovNew = chart.getOverlays().find((o: any) => o.id === 'dNew');
    assert.ok(ovNew, 'New drawing should be created on chart');
    assert.equal(ovNew.zLevel, 10, 'Should receive valid positive natural zLevel');
  });

  it('DrawingChartAdapter.promoteOverlay elevates drawing to maxNaturalZ + 1 and preserves originalZLevel', () => {
    const chart = createMockChart();
    chart.createOverlay({ id: 'd1', name: 'straight_line', zLevel: 10 });
    chart.createOverlay({ id: 'd2', name: 'straight_line', zLevel: 20 });
    chart.createOverlay({ id: 'd3', name: 'straight_line', zLevel: 30 });

    DrawingChartAdapter.promoteOverlay(chart, 'd1');

    const ov1 = chart.getOverlays().find((o: any) => o.id === 'd1');
    assert.equal(ov1.zLevel, 31, 'd1 should be promoted above maxNaturalZ (30 + 1 = 31)');
    assert.deepEqual(chart._promotedOverlayInfo, {
      id: 'd1',
      originalZLevel: 10,
      temporaryZLevel: 31,
    });
  });

  it('DrawingChartAdapter.restorePromotedOverlay restores natural zLevel and clears _promotedOverlayInfo', () => {
    const chart = createMockChart();
    chart.createOverlay({ id: 'd1', name: 'straight_line', zLevel: 10 });
    chart.createOverlay({ id: 'd2', name: 'straight_line', zLevel: 20 });

    DrawingChartAdapter.promoteOverlay(chart, 'd1');
    assert.equal(chart.getOverlays().find((o: any) => o.id === 'd1').zLevel, 21);

    DrawingChartAdapter.restorePromotedOverlay(chart, 'd1');
    assert.equal(chart.getOverlays().find((o: any) => o.id === 'd1').zLevel, 10);
    assert.equal(chart._promotedOverlayInfo, null);
  });

  it('promoting a second overlay automatically restores the first one before promoting the second', () => {
    const chart = createMockChart();
    chart.createOverlay({ id: 'd1', name: 'straight_line', zLevel: 10 });
    chart.createOverlay({ id: 'd2', name: 'straight_line', zLevel: 20 });

    DrawingChartAdapter.promoteOverlay(chart, 'd1');
    assert.equal(chart.getOverlays().find((o: any) => o.id === 'd1').zLevel, 21);

    DrawingChartAdapter.promoteOverlay(chart, 'd2');
    assert.equal(chart.getOverlays().find((o: any) => o.id === 'd1').zLevel, 10, 'd1 should be restored to natural zLevel');
    assert.equal(chart.getOverlays().find((o: any) => o.id === 'd2').zLevel, 21, 'd2 should be promoted');
    assert.equal(chart._promotedOverlayInfo.id, 'd2');
  });

  it('supports sync_ prefix matching for multi-chart slots in promoteOverlay and restorePromotedOverlay', () => {
    const chart = createMockChart();
    chart.createOverlay({ id: 'sync_d1', name: 'straight_line', zLevel: 10 });
    chart.createOverlay({ id: 'sync_d2', name: 'straight_line', zLevel: 20 });

    DrawingChartAdapter.promoteOverlay(chart, 'd1');
    assert.equal(chart.getOverlays().find((o: any) => o.id === 'sync_d1').zLevel, 21);
    assert.equal(chart._promotedOverlayInfo.id, 'sync_d1');

    DrawingChartAdapter.restorePromotedOverlay(chart, 'd1');
    assert.equal(chart.getOverlays().find((o: any) => o.id === 'sync_d1').zLevel, 10);
    assert.equal(chart._promotedOverlayInfo, null);
  });
});
