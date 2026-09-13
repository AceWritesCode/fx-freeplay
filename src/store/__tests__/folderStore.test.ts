import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import type { FolderItem } from '../types.ts';

// In-memory mock repository state
export const mockRepositoryState = {
  savedFoldersBySymbol: new Map<string, FolderItem[]>(),
  saveFoldersCalls: [] as { symbol: string; folders: FolderItem[] }[],
  saveDrawingsCalls: [] as { symbol: string; drawings: any[] }[],
  getFoldersCalls: [] as string[],
  reset() {
    this.savedFoldersBySymbol.clear();
    this.saveFoldersCalls = [];
    this.saveDrawingsCalls = [];
    this.getFoldersCalls = [];
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

// Dynamically import useDrawingStore after registering module resolution hooks
const storeModule = await import(pathToFileURL(path.resolve('src/store/useDrawingStore.ts')).href);
const { useDrawingStore } = storeModule;

describe('Folder Store & Architecture Verification (Phase 1A)', () => {
  beforeEach(() => {
    mockRepositoryState.reset();
    useDrawingStore.setState({
      folders: [],
      drawingsBySymbol: {},
      selectedOverlayIds: [],
    });
  });

  describe('1. loadSymbolFolders() lifecycle and normalization', () => {
    it('loads repository folders into useDrawingStore.folders', async () => {
      const initialFolders: FolderItem[] = [
        { id: 'f1', name: 'Support Lines', isCollapsed: false, isLocked: false, isVisible: true, order: 200 },
        { id: 'f2', name: 'Targets', isCollapsed: true, isLocked: true, isVisible: false, order: 100 },
      ];
      mockRepositoryState.savedFoldersBySymbol.set('EURUSD', initialFolders);

      const result = await useDrawingStore.getState().loadSymbolFolders('EURUSD');

      assert.deepEqual(result, initialFolders);
      assert.deepEqual(useDrawingStore.getState().folders, initialFolders);
    });

    it('returns empty array when symbol is empty string or not found', async () => {
      const resEmpty = await useDrawingStore.getState().loadSymbolFolders('');
      assert.deepEqual(resEmpty, []);

      const resNotFound = await useDrawingStore.getState().loadSymbolFolders('UNKNOWN');
      assert.deepEqual(resNotFound, []);
      assert.deepEqual(useDrawingStore.getState().folders, []);
    });

    it('normalizes missing/undefined order values on load', async () => {
      const unnormalized: FolderItem[] = [
        { id: 'f_first', name: 'First Folder', isCollapsed: false, isLocked: false, isVisible: true },
        { id: 'f_second', name: 'Second Folder', isCollapsed: false, isLocked: false, isVisible: true },
      ];
      mockRepositoryState.savedFoldersBySymbol.set('GBPUSD', unnormalized);

      await useDrawingStore.getState().loadSymbolFolders('GBPUSD');
      const loaded = useDrawingStore.getState().folders;

      // Order should be initialized via ((items.length - idx) * 100)
      assert.equal(loaded[0].order, 200);
      assert.equal(loaded[1].order, 100);
    });
  });

  describe('2. Folder creation and persistence', () => {
    it('createSymbolFolder() creates folder, updates store, and triggers persistence', () => {
      const created = useDrawingStore.getState().createSymbolFolder('EURUSD', { name: 'Support Zones' });

      assert.ok(created.id);
      assert.equal(created.name, 'Support Zones');
      assert.equal(created.isCollapsed, false);
      assert.equal(created.isLocked, false);
      assert.equal(created.isVisible, true);
      assert.ok(typeof created.order === 'number');

      const storeFolders = useDrawingStore.getState().folders;
      assert.equal(storeFolders.length, 1);
      assert.deepEqual(storeFolders[0], created);

      assert.equal(mockRepositoryState.saveFoldersCalls.length, 1);
      assert.equal(mockRepositoryState.saveFoldersCalls[0].symbol, 'EURUSD');
      assert.deepEqual(mockRepositoryState.saveFoldersCalls[0].folders, storeFolders);
    });

    it('createSymbolFolder() assigns selected drawings and persists updated drawing list', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'trendLine', points: [], extendData: {} },
            { id: 'd2', name: 'rectangle', points: [], extendData: {} },
            { id: 'd3', name: 'fxText', points: [], extendData: {} },
          ],
        },
      });

      const created = useDrawingStore.getState().createSymbolFolder('EURUSD', undefined, ['d1', 'd2']);

      const updatedDrawings = useDrawingStore.getState().drawingsBySymbol['EURUSD'];
      assert.equal(updatedDrawings[0].extendData?.folderId, created.id);
      assert.equal(updatedDrawings[1].extendData?.folderId, created.id);
      assert.equal(updatedDrawings[2].extendData?.folderId, undefined);

      assert.equal(mockRepositoryState.saveFoldersCalls.length, 1);
      assert.equal(mockRepositoryState.saveDrawingsCalls.length, 1);
      assert.equal(mockRepositoryState.saveDrawingsCalls[0].symbol, 'EURUSD');
    });
  });

  describe('3. Folder update / rename and persistence', () => {
    it('updateSymbolFolder() updates properties and persists to repository', () => {
      const initial: FolderItem = {
        id: 'f1',
        name: 'Old Name',
        isCollapsed: false,
        isLocked: false,
        isVisible: true,
      };
      useDrawingStore.setState({ folders: [initial] });

      useDrawingStore.getState().updateSymbolFolder('EURUSD', 'f1', {
        name: 'Renamed Key Zones',
        isCollapsed: true,
      });

      const updated = useDrawingStore.getState().folders.find((f) => f.id === 'f1');
      assert.ok(updated);
      assert.equal(updated.name, 'Renamed Key Zones');
      assert.equal(updated.isCollapsed, true);

      assert.equal(mockRepositoryState.saveFoldersCalls.length, 1);
      assert.equal(mockRepositoryState.saveFoldersCalls[0].symbol, 'EURUSD');
      assert.equal(mockRepositoryState.saveFoldersCalls[0].folders[0].name, 'Renamed Key Zones');
    });
  });

  describe('4. Folder deletion and drawing dissociation', () => {
    it('deleteSymbolFolder() removes folder, dissociates child drawings, and persists both', () => {
      const f1: FolderItem = { id: 'folder_del', name: 'Delete Me', isCollapsed: false, isLocked: false, isVisible: true };
      const f2: FolderItem = { id: 'folder_keep', name: 'Keep Me', isCollapsed: false, isLocked: false, isVisible: true };

      useDrawingStore.setState({
        folders: [f1, f2],
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'trendLine', points: [], extendData: { folderId: 'folder_del' } },
            { id: 'd2', name: 'rectangle', points: [], extendData: { folderId: 'folder_keep' } },
          ],
        },
      });

      useDrawingStore.getState().deleteSymbolFolder('EURUSD', 'folder_del');

      const remainingFolders = useDrawingStore.getState().folders;
      assert.equal(remainingFolders.length, 1);
      assert.equal(remainingFolders[0].id, 'folder_keep');

      const updatedDrawings = useDrawingStore.getState().drawingsBySymbol['EURUSD'];
      assert.equal(updatedDrawings[0].extendData?.folderId, null, 'Deleted folder child drawing folderId is cleared to null');
      assert.equal(updatedDrawings[1].extendData?.folderId, 'folder_keep');

      assert.equal(mockRepositoryState.saveFoldersCalls.length, 1);
      assert.equal(mockRepositoryState.saveDrawingsCalls.length, 1);
      assert.equal(mockRepositoryState.saveDrawingsCalls[0].symbol, 'EURUSD');
    });
  });

  describe('5. Folder visibility & lock cascade', () => {
    it('setFolderVisibility() updates folder, cascades to member drawings, and persists both', () => {
      const f1: FolderItem = { id: 'f_vis', name: 'Visibility Test', isCollapsed: false, isLocked: false, isVisible: true };
      useDrawingStore.setState({
        folders: [f1],
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'trendLine', points: [], visible: true, extendData: { folderId: 'f_vis' } },
            { id: 'd2', name: 'rectangle', points: [], visible: true, extendData: { folderId: 'other' } },
          ],
        },
      });

      useDrawingStore.getState().setFolderVisibility('EURUSD', 'f_vis', false);

      const folder = useDrawingStore.getState().folders.find((f) => f.id === 'f_vis');
      assert.equal(folder?.isVisible, false);

      const drawings = useDrawingStore.getState().drawingsBySymbol['EURUSD'];
      assert.equal(drawings[0].visible, false, 'Member drawing visibility was updated');
      assert.equal(drawings[1].visible, true, 'Non-member drawing visibility was unaffected');

      assert.equal(mockRepositoryState.saveFoldersCalls.length, 1);
      assert.equal(mockRepositoryState.saveDrawingsCalls.length, 1);
    });

    it('setFolderLock() updates folder, cascades to member drawings, and persists both', () => {
      const f1: FolderItem = { id: 'f_lock', name: 'Lock Test', isCollapsed: false, isLocked: false, isVisible: true };
      useDrawingStore.setState({
        folders: [f1],
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'trendLine', points: [], lock: false, extendData: { folderId: 'f_lock' } },
            { id: 'd2', name: 'rectangle', points: [], lock: false, extendData: { folderId: 'other' } },
          ],
        },
      });

      useDrawingStore.getState().setFolderLock('EURUSD', 'f_lock', true);

      const folder = useDrawingStore.getState().folders.find((f) => f.id === 'f_lock');
      assert.equal(folder?.isLocked, true);

      const drawings = useDrawingStore.getState().drawingsBySymbol['EURUSD'];
      assert.equal(drawings[0].lock, true, 'Member drawing lock was updated');
      assert.equal(drawings[1].lock, false, 'Non-member drawing lock was unaffected');

      assert.equal(mockRepositoryState.saveFoldersCalls.length, 1);
      assert.equal(mockRepositoryState.saveDrawingsCalls.length, 1);
    });
  });

  describe('6. Active-folder auto-assignment eligibility predicate', () => {
    const resolveActiveFolder = (folders: FolderItem[]): FolderItem | undefined => {
      return folders.find((f) => !f.isCollapsed && !f.isLocked && f.isVisible);
    };

    it('resolves the first open, unlocked, and visible folder as active', () => {
      const folders: FolderItem[] = [
        { id: 'f1', name: 'Collapsed', isCollapsed: true, isLocked: false, isVisible: true },
        { id: 'f2', name: 'Locked', isCollapsed: false, isLocked: true, isVisible: true },
        { id: 'f3', name: 'Hidden', isCollapsed: false, isLocked: false, isVisible: false },
        { id: 'f4', name: 'Active Eligible', isCollapsed: false, isLocked: false, isVisible: true },
        { id: 'f5', name: 'Secondary Eligible', isCollapsed: false, isLocked: false, isVisible: true },
      ];

      const active = resolveActiveFolder(folders);
      assert.ok(active);
      assert.equal(active.id, 'f4');
    });

    it('returns undefined if all folders are collapsed, locked, or hidden', () => {
      const folders: FolderItem[] = [
        { id: 'f1', name: 'Collapsed', isCollapsed: true, isLocked: false, isVisible: true },
        { id: 'f2', name: 'Locked', isCollapsed: false, isLocked: true, isVisible: true },
        { id: 'f3', name: 'Hidden', isCollapsed: false, isLocked: false, isVisible: false },
      ];

      const active = resolveActiveFolder(folders);
      assert.equal(active, undefined);
    });

    it('returns undefined when folders array is empty', () => {
      const active = resolveActiveFolder([]);
      assert.equal(active, undefined);
    });
  });

  describe('7. Batch Drawing State Actions & Persistence (Phase 1B)', () => {
    it('batchUpdateSymbolDrawings() updates multiple drawings with function updater and persists', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'trendLine', points: [], extendData: { order: 100, folderId: 'f1' } },
            { id: 'd2', name: 'rayLine', points: [], extendData: { order: 200, folderId: null } },
            { id: 'd3', name: 'rect', points: [], extendData: { order: 300, folderId: 'f1' } },
          ],
        },
      });

      useDrawingStore.getState().batchUpdateSymbolDrawings('EURUSD', (d) => {
        if (d.id === 'd1' || d.id === 'd3') {
          return {
            extendData: {
              order: (d.extendData?.order ?? 0) + 50,
              folderId: 'f2',
            },
          };
        }
        return null;
      });

      const updated = useDrawingStore.getState().getSymbolDrawings('EURUSD');
      assert.equal(updated.length, 3);
      assert.equal(updated[0].extendData?.order, 150);
      assert.equal(updated[0].extendData?.folderId, 'f2');
      assert.equal(updated[1].extendData?.order, 200);
      assert.equal(updated[1].extendData?.folderId, null);
      assert.equal(updated[2].extendData?.order, 350);
      assert.equal(updated[2].extendData?.folderId, 'f2');

      assert.equal(mockRepositoryState.saveDrawingsCalls.length, 1);
      assert.equal(mockRepositoryState.saveDrawingsCalls[0].symbol, 'EURUSD');
      assert.equal(mockRepositoryState.saveDrawingsCalls[0].drawings.length, 3);
    });

    it('batchUpdateSymbolDrawings() updates drawings with array of updates and persists', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'trendLine', points: [], extendData: { customName: 'Old 1' } },
            { id: 'd2', name: 'rayLine', points: [], extendData: { customName: 'Old 2' } },
          ],
        },
      });

      useDrawingStore.getState().batchUpdateSymbolDrawings('EURUSD', [
        { id: 'd1', updates: { extendData: { customName: 'New 1' } } },
        { id: 'd2', updates: { extendData: { customName: 'New 2' } } },
      ]);

      const updated = useDrawingStore.getState().getSymbolDrawings('EURUSD');
      assert.equal(updated[0].extendData?.customName, 'New 1');
      assert.equal(updated[1].extendData?.customName, 'New 2');

      assert.equal(mockRepositoryState.saveDrawingsCalls.length, 1);
    });

    it('batchRemoveSymbolDrawings() deletes specified drawings and persists remaining list', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'trendLine', points: [] },
            { id: 'd2', name: 'rayLine', points: [] },
            { id: 'd3', name: 'rect', points: [] },
          ],
        },
      });

      useDrawingStore.getState().batchRemoveSymbolDrawings('EURUSD', ['d1', 'd3']);

      const updated = useDrawingStore.getState().getSymbolDrawings('EURUSD');
      assert.equal(updated.length, 1);
      assert.equal(updated[0].id, 'd2');

      assert.equal(mockRepositoryState.saveDrawingsCalls.length, 1);
      assert.equal(mockRepositoryState.saveDrawingsCalls[0].drawings.length, 1);
      assert.equal(mockRepositoryState.saveDrawingsCalls[0].drawings[0].id, 'd2');
    });

    it('setDrawingsVisibility() updates visibility of multiple drawings and persists', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'trendLine', points: [], visible: true },
            { id: 'd2', name: 'rayLine', points: [], visible: true },
            { id: 'd3', name: 'rect', points: [], visible: false },
          ],
        },
      });

      useDrawingStore.getState().setDrawingsVisibility('EURUSD', ['d1', 'd2'], false);

      const updated = useDrawingStore.getState().getSymbolDrawings('EURUSD');
      assert.equal(updated[0].visible, false);
      assert.equal(updated[1].visible, false);
      assert.equal(updated[2].visible, false);

      assert.equal(mockRepositoryState.saveDrawingsCalls.length, 1);
      assert.equal(mockRepositoryState.saveDrawingsCalls[0].drawings[0].visible, false);
    });

    it('setDrawingsLock() updates lock state of multiple drawings and persists', () => {
      useDrawingStore.setState({
        drawingsBySymbol: {
          EURUSD: [
            { id: 'd1', name: 'trendLine', points: [], lock: false },
            { id: 'd2', name: 'rayLine', points: [], lock: false },
            { id: 'd3', name: 'rect', points: [], lock: true },
          ],
        },
      });

      useDrawingStore.getState().setDrawingsLock('EURUSD', ['d1', 'd2'], true);

      const updated = useDrawingStore.getState().getSymbolDrawings('EURUSD');
      assert.equal(updated[0].lock, true);
      assert.equal(updated[1].lock, true);
      assert.equal(updated[2].lock, true);

      assert.equal(mockRepositoryState.saveDrawingsCalls.length, 1);
      assert.equal(mockRepositoryState.saveDrawingsCalls[0].drawings[0].lock, true);
    });
  });
});
