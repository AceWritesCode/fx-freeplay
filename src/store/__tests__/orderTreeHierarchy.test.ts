import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CANDLES_SENTINEL,
  buildTreeHierarchyFromCanonical,
} from '../../engine/charting/orderEngine.ts';

describe('Phase 2C-4B — Object Tree Display → Canonical Order', () => {
  it('places root drawings, folders, and candles in exact canonical sequence order', () => {
    const sequence = ['d_top', 'c1', 'c2', CANDLES_SENTINEL, 'd_bottom'];
    const drawings = [
      { id: 'd_top', name: 'Top Drawing', extendData: {} },
      { id: 'c1', name: 'Child 1', extendData: { folderId: 'folder_1' } },
      { id: 'c2', name: 'Child 2', extendData: { folderId: 'folder_1' } },
      { id: 'd_bottom', name: 'Bottom Drawing', extendData: {} },
    ];
    const folders = [
      { id: 'folder_1', name: 'My Folder', order: 100 },
    ];

    const { rootItems, groupedDrawings } = buildTreeHierarchyFromCanonical(
      sequence,
      drawings,
      folders,
      { candlesVisible: true }
    );

    assert.equal(rootItems.length, 4);
    assert.equal(rootItems[0].type, 'drawing');
    assert.equal(rootItems[0].id, 'd_top');

    assert.equal(rootItems[1].type, 'folder');
    assert.equal(rootItems[1].id, 'folder_1');

    assert.equal(rootItems[2].type, 'candles');
    assert.equal(rootItems[2].id, 'candles');

    assert.equal(rootItems[3].type, 'drawing');
    assert.equal(rootItems[3].id, 'd_bottom');

    assert.deepEqual(
      groupedDrawings['folder_1'].map((d) => d.id),
      ['c1', 'c2']
    );

    assert.deepEqual(
      groupedDrawings['root'].map((d) => d.id),
      ['d_top', 'd_bottom']
    );
  });

  it('orders folder children strictly according to canonical sequence (top-to-bottom)', () => {
    const sequence = ['c2', 'c1', CANDLES_SENTINEL];
    const drawings = [
      { id: 'c1', name: 'Child 1', extendData: { folderId: 'folder_1' } },
      { id: 'c2', name: 'Child 2', extendData: { folderId: 'folder_1' } },
    ];
    const folders = [
      { id: 'folder_1', name: 'Folder 1', order: 50 },
    ];

    const { rootItems, groupedDrawings } = buildTreeHierarchyFromCanonical(
      sequence,
      drawings,
      folders
    );

    assert.equal(rootItems.length, 2);
    assert.equal(rootItems[0].type, 'folder');
    assert.equal(rootItems[0].id, 'folder_1');
    assert.equal(rootItems[1].type, 'candles');

    assert.deepEqual(
      groupedDrawings['folder_1'].map((d) => d.id),
      ['c2', 'c1']
    );
  });

  it('preserves legacy empty-folder placement based on folder.order relative to root items', () => {
    const sequence = ['d_high', 'd_low', CANDLES_SENTINEL];
    const drawings = [
      { id: 'd_high', name: 'High', extendData: { order: 300 } },
      { id: 'd_low', name: 'Low', extendData: { order: 100 } },
    ];
    const folders = [
      { id: 'empty_folder_mid', name: 'Empty Mid', order: 200 },
      { id: 'empty_folder_top', name: 'Empty Top', order: 400 },
      { id: 'empty_folder_bottom', name: 'Empty Bottom', order: 50 },
    ];

    const { rootItems } = buildTreeHierarchyFromCanonical(
      sequence,
      drawings,
      folders
    );

    const rootIds = rootItems.map((item) => item.id);
    assert.ok(rootIds.indexOf('empty_folder_top') < rootIds.indexOf('d_high'));
    assert.ok(rootIds.indexOf('d_high') < rootIds.indexOf('empty_folder_mid'));
    assert.ok(rootIds.indexOf('empty_folder_mid') < rootIds.indexOf('d_low'));
    assert.ok(rootIds.indexOf('d_low') < rootIds.indexOf('empty_folder_bottom'));
  });

  it('safely handles drawings missing from sequence by falling back without throwing', () => {
    const sequence = ['d1', CANDLES_SENTINEL];
    const drawings = [
      { id: 'd1', name: 'D1', extendData: {} },
      { id: 'd_missing_from_seq', name: 'Missing', extendData: {} },
    ];
    const folders: any[] = [];

    const { rootItems, groupedDrawings } = buildTreeHierarchyFromCanonical(
      sequence,
      drawings,
      folders
    );

    const rootIds = rootItems.map((item) => item.id);
    assert.ok(rootIds.includes('d1'));
    assert.ok(rootIds.includes(CANDLES_SENTINEL));
    assert.ok(rootIds.includes('d_missing_from_seq'));
    assert.ok(groupedDrawings.root.some((d) => d.id === 'd_missing_from_seq'));
  });

  it('supports candle layer placement anywhere in tree hierarchy', () => {
    const seqTop = [CANDLES_SENTINEL, 'd1'];
    const resTop = buildTreeHierarchyFromCanonical(seqTop, [{ id: 'd1' }], []);
    assert.equal(resTop.rootItems[0].id, CANDLES_SENTINEL);
    assert.equal(resTop.rootItems[1].id, 'd1');

    const seqBottom = ['d1', CANDLES_SENTINEL];
    const resBottom = buildTreeHierarchyFromCanonical(seqBottom, [{ id: 'd1' }], []);
    assert.equal(resBottom.rootItems[0].id, 'd1');
    assert.equal(resBottom.rootItems[1].id, CANDLES_SENTINEL);
  });
});
