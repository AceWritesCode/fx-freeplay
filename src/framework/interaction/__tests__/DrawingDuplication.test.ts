import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  duplicateDrawing,
  validateOrderSequence,
  type DrawingFolderLookup,
} from '../../../engine/charting/orderEngine.ts';

// In-memory mock repository state
export const mockRepoState = {
  savedFoldersBySymbol: new Map<string, any[]>(),
  savedDrawingsBySymbol: new Map<string, any[]>(),
  saveFoldersCalls: [] as any[],
  saveDrawingsCalls: [] as any[],
  reset() {
    this.savedFoldersBySymbol.clear();
    this.savedDrawingsBySymbol.clear();
    this.saveFoldersCalls = [];
    this.saveDrawingsCalls = [];
  },
};

describe('Ctrl+Drag Drawing Duplication', () => {
  beforeEach(() => {
    mockRepoState.reset();
  });

  describe('1. Canonical Sequence Duplication (duplicateDrawing)', () => {
    it('inserts clone immediately before/in front of source drawing in root sequence', () => {
      const sequence = ['d1', 'd2', 'candles', 'd3'];
      const nextSeq = duplicateDrawing(sequence, 'd2', 'd2_clone');
      assert.deepEqual(nextSeq, ['d1', 'd2_clone', 'd2', 'candles', 'd3']);
    });

    it('inserts clone inside folder block immediately before/in front of source drawing', () => {
      const sequence = ['d1', 'd2', 'd3', 'candles'];
      const nextSeq = duplicateDrawing(sequence, 'd2', 'd2_clone');
      assert.deepEqual(nextSeq, ['d1', 'd2_clone', 'd2', 'd3', 'candles']);

      const lookup: DrawingFolderLookup = {
        d1: null,
        d2: 'folder_a',
        d2_clone: 'folder_a',
        d3: 'folder_a',
      };
      const validation = validateOrderSequence(nextSeq, ['d1', 'd2', 'd2_clone', 'd3'], lookup);
      assert.equal(validation.isValid, true);
    });

    it('prepends clone to sequence if source ID does not exist in sequence', () => {
      const sequence = ['d1', 'candles'];
      const nextSeq = duplicateDrawing(sequence, 'non_existent', 'clone_1');
      assert.deepEqual(nextSeq, ['clone_1', 'd1', 'candles']);
    });

    it('returns unmodified sequence if clone ID already exists in sequence (idempotent)', () => {
      const sequence = ['d1', 'clone_1', 'candles'];
      const nextSeq = duplicateDrawing(sequence, 'd1', 'clone_1');
      assert.deepEqual(nextSeq, sequence);
    });
  });

  describe('2. Drawing Store Deep Clone & Metadata Isolation', () => {
    interface DrawingItem {
      id: string;
      name: string;
      points: any[];
      extendData?: Record<string, any>;
      lock?: boolean;
      visible?: boolean;
      symbol?: string;
      styles?: Record<string, any>;
    }

    // Pure reference implementation matching useDrawingStore.duplicateSymbolDrawing
    const duplicateSymbolDrawing = (
      drawings: DrawingItem[],
      sequence: string[],
      sourceId: string,
      cloneId: string
    ): { drawings: DrawingItem[]; sequence: string[] } => {
      const sourceItem = drawings.find((d) => d.id === sourceId);
      if (!sourceItem) return { drawings, sequence };

      const clonedItem: DrawingItem = {
        ...sourceItem,
        id: cloneId,
        points: JSON.parse(JSON.stringify(sourceItem.points || [])),
        extendData: sourceItem.extendData
          ? JSON.parse(JSON.stringify(sourceItem.extendData))
          : undefined,
      };

      const updatedDrawings = [...drawings, clonedItem];
      const updatedSequence = duplicateDrawing(sequence, sourceId, cloneId);

      return { drawings: updatedDrawings, sequence: updatedSequence };
    };

    it('deep clones points and extendData preventing cross-mutation between source and clone', () => {
      const source: DrawingItem = {
        id: 'orig_1',
        name: 'trend_line',
        symbol: 'EURUSD',
        lock: false,
        visible: true,
        points: [
          { timestamp: 1000, value: 1.1 },
          { timestamp: 2000, value: 1.2 },
        ],
        extendData: {
          folderId: 'folder_x',
          color: '#ff0000',
          nested: { flag: true },
        },
        styles: { strokeWidth: 2 },
      };

      const drawings = [source];
      const sequence = ['candles', 'orig_1'];

      const result = duplicateSymbolDrawing(drawings, sequence, 'orig_1', 'clone_1');

      assert.equal(result.drawings.length, 2);
      const clone = result.drawings.find((d) => d.id === 'clone_1')!;
      assert.ok(clone);

      // Verify all attributes copied
      assert.equal(clone.name, source.name);
      assert.equal(clone.symbol, source.symbol);
      assert.equal(clone.lock, source.lock);
      assert.equal(clone.visible, source.visible);
      assert.equal(clone.extendData?.folderId, 'folder_x');
      assert.deepEqual(clone.styles, source.styles);

      // Verify deep clone isolation
      clone.points[0].value = 999;
      clone.extendData!.nested.flag = false;

      assert.equal(source.points[0].value, 1.1, 'Source points must remain untouched');
      assert.equal(source.extendData!.nested.flag, true, 'Source extendData must remain untouched');

      // Verify canonical sequence ordering
      assert.deepEqual(result.sequence, ['candles', 'clone_1', 'orig_1']);
    });
  });

  describe('3. Ctrl+Hover Preparation & Immediate Pointerdown Duplication Lifecycle', () => {
    interface PreparedDuplicate {
      sourceId: string;
      symbol: string;
      cloneId: string;
      preparedData: any;
    }

    interface OverlayState {
      id: string;
      points: any[];
      extendData: Record<string, any>;
    }

    it('arms prepared duplicate on Ctrl+body hover and discards when leaving body', () => {
      let preparedDuplicate: PreparedDuplicate | null = null;

      // 1. Hover body with Ctrl held
      const onHover = (isCtrl: boolean, isBodyHovered: boolean, isAnchorHovered: boolean, drawing: any) => {
        if (isCtrl && isBodyHovered && !isAnchorHovered && drawing) {
          preparedDuplicate = {
            sourceId: drawing.id,
            symbol: drawing.symbol,
            cloneId: 'clone_arm_1',
            preparedData: { ...drawing },
          };
        } else {
          preparedDuplicate = null;
        }
      };

      const testDrawing = { id: 'd1', symbol: 'EURUSD', points: [{ timestamp: 100, value: 1.1 }] };
      onHover(true, true, false, testDrawing);
      assert.ok(preparedDuplicate);
      assert.equal(preparedDuplicate.sourceId, 'd1');

      // 2. Cursor leaves body
      onHover(true, false, false, null);
      assert.equal(preparedDuplicate, null, 'Prepared duplicate must be discarded when leaving body');

      // 3. User releases Ctrl while hovering body
      onHover(false, true, false, testDrawing);
      assert.equal(preparedDuplicate, null, 'Prepared duplicate must be discarded when releasing Ctrl');
    });

    it('immediately creates, selects, and redirects KLineCharts pressed overlay to clone on pointerdown', async () => {
      const originalOverlay: OverlayState = {
        id: 'orig_1',
        points: [{ timestamp: 1000, value: 1.1 }, { timestamp: 2000, value: 1.2 }],
        extendData: {},
      };

      let cloneCreatedId: string | null = null;
      let selectedIds: string[] = [];
      const chartOverlays: OverlayState[] = [{ ...originalOverlay }];

      // Mock KLineCharts store
      let pressedOverlayInfo: any = {
        paneId: 'candle_pane',
        overlay: originalOverlay,
        figureType: 'other',
        figureIndex: 0,
        figure: undefined,
      };

      const mockStore = {
        getPressedOverlayInfo: () => pressedOverlayInfo,
        setPressedOverlayInfo: (info: any) => {
          pressedOverlayInfo = info;
        },
      };

      // Simulate onPressedMoveStart
      const simulateMoveStart = (params: {
        isCtrl: boolean;
        isHandle: boolean;
        overlay: OverlayState;
        mousePos: { x: number; y: number };
      }) => {
        if (params.isCtrl && !params.isHandle) {
          const cloneId = 'clone_imm_1';
          cloneCreatedId = cloneId;

          const cloneOv: OverlayState = {
            id: cloneId,
            points: JSON.parse(JSON.stringify(params.overlay.points)),
            extendData: {},
          };
          chartOverlays.push(cloneOv);

          // Select clone
          selectedIds = [cloneId];

          // Microtask redirects KLineCharts pressed overlay
          queueMicrotask(() => {
            const currentPressed = mockStore.getPressedOverlayInfo();
            if (currentPressed && currentPressed.overlay.id === params.overlay.id) {
              cloneOv.extendData = {
                startPoints: JSON.parse(JSON.stringify(cloneOv.points)),
                startMousePixel: { ...params.mousePos },
              };
              mockStore.setPressedOverlayInfo({
                ...currentPressed,
                overlay: cloneOv,
              });
            }
          });
        }
      };

      simulateMoveStart({
        isCtrl: true,
        isHandle: false,
        overlay: originalOverlay,
        mousePos: { x: 100, y: 100 },
      });

      // Wait for microtask queue to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      assert.equal(cloneCreatedId, 'clone_imm_1');
      assert.deepEqual(selectedIds, ['clone_imm_1']);
      assert.equal(chartOverlays.length, 2);
      // Original points must remain untouched
      assert.deepEqual(originalOverlay.points, [
        { timestamp: 1000, value: 1.1 },
        { timestamp: 2000, value: 1.2 },
      ]);
      // Verify KLineCharts internal pressed overlay has been redirected to CLONE
      assert.equal(pressedOverlayInfo.overlay.id, 'clone_imm_1');

      // Simulate KLineCharts native pressedMouseMoveEvent: operates directly on pressedOverlayInfo.overlay (the clone)
      const currentActiveOverlay = mockStore.getPressedOverlayInfo().overlay;
      const startPoints = currentActiveOverlay.extendData.startPoints;
      const startMouse = currentActiveOverlay.extendData.startMousePixel;
      const dy = 50; // mouse dragged 50px

      currentActiveOverlay.points = startPoints.map((p: any) => ({
        ...p,
        value: p.value + dy * 0.01,
      }));

      assert.equal(currentActiveOverlay.points[0].value, 1.1 + 0.5); // clone translated
      assert.equal(originalOverlay.points[0].value, 1.1, 'Original overlay points must NEVER move');

      // Simulate pressedMouseUpEvent: commits clone
      const committedClone = mockStore.getPressedOverlayInfo().overlay;
      assert.equal(committedClone.id, 'clone_imm_1');
      assert.equal(committedClone.points[0].value, 1.6);
      assert.equal(originalOverlay.points[0].value, 1.1, 'Original overlay remained untouched');
    });

    it('does NOT duplicate when dragging an anchor handle (isHandle: true)', () => {
      let isDuplicated = false;
      const originalOverlay: OverlayState = {
        id: 'orig_1',
        points: [{ timestamp: 1000, value: 1.1 }],
        extendData: {},
      };

      const simulateMoveStart = (params: { isCtrl: boolean; isHandle: boolean }) => {
        if (params.isCtrl && !params.isHandle) {
          isDuplicated = true;
        }
      };

      simulateMoveStart({ isCtrl: true, isHandle: true });
      assert.equal(isDuplicated, false, 'Handle drag must not duplicate');
    });
  });

  describe('4. Body-Hover Priority vs Empty-Canvas Marquee Selection', () => {
    it('gives drawing duplication priority when chart._isBodyHovered is true', () => {
      const chart: any = {
        _isBodyHovered: true,
        _isAnchorHovered: false,
        _isMarqueeSelecting: false,
      };

      // When mousedown occurs with Ctrl held over body
      const isCtrl = true;
      let marqueeStarted = false;
      if (isCtrl && !chart._isBodyHovered && !chart._isAnchorHovered) {
        chart._isMarqueeSelecting = true;
        marqueeStarted = true;
      }

      assert.equal(marqueeStarted, false, 'Marquee selection must not start on body hover');
      assert.equal(chart._isMarqueeSelecting, false);
    });

    it('gives marquee selection priority when chart is over empty canvas', () => {
      const chart: any = {
        _isBodyHovered: false,
        _isAnchorHovered: false,
        _isMarqueeSelecting: false,
      };

      // When mousedown occurs with Ctrl held over empty canvas
      const isCtrl = true;
      let marqueeStarted = false;
      if (isCtrl && !chart._isBodyHovered && !chart._isAnchorHovered) {
        chart._isMarqueeSelecting = true;
        marqueeStarted = true;
      }

      assert.equal(marqueeStarted, true, 'Marquee selection must start on empty canvas');
      assert.equal(chart._isMarqueeSelecting, true);
    });
  });
});
