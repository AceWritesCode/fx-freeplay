/**
 * orderEngine.ts
 *
 * Pure, deterministic canonical ordering engine for FX Freeplay (Phase 2A).
 *
 * ARCHITECTURAL PRINCIPLES:
 * 1. Single global sequence:
 *    `sequence: string[]` contains drawing IDs and the single sentinel `'candles'`.
 *    Index 0 = front/topmost layer.
 *    Index (length - 1) = back/bottommost layer.
 *
 * 2. Contiguous folder blocks:
 *    For every folder, all child drawings belonging to that folder MUST form
 *    a single, unbroken contiguous slice within `sequence`.
 *
 * 3. Exact element membership:
 *    - `'candles'` appears exactly once.
 *    - Every drawing known to the symbol appears exactly once.
 *    - No duplicate IDs, no undefined/null items.
 *
 * 4. Zero DOM / Zero Chart Dependencies:
 *    Pure functional transformation: Same input -> Same output.
 */

export const CANDLES_SENTINEL = 'candles' as const;

export interface SymbolOrderState {
  symbol: string;
  sequence: string[];
  candlesVisible: boolean;
}

export interface DrawingFolderLookup {
  /** Map of drawingId -> folderId (or undefined/null if root drawing) */
  [drawingId: string]: string | null | undefined;
}

export interface ValidateSequenceResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates that a sequence satisfies all canonical order invariants:
 * - 'candles' sentinel exists exactly once.
 * - All provided drawing IDs exist exactly once (no duplicates, no missing).
 * - No unexpected or extraneous IDs.
 * - Contiguous folder invariant: all drawings in the same folder appear contiguously.
 */
export function validateOrderSequence(
  sequence: string[],
  knownDrawingIds: string[],
  folderLookup: DrawingFolderLookup
): ValidateSequenceResult {
  const errors: string[] = [];

  // 1. Check candles sentinel
  const candlesCount = sequence.filter(id => id === CANDLES_SENTINEL).length;
  if (candlesCount === 0) {
    errors.push("Missing 'candles' sentinel in sequence.");
  } else if (candlesCount > 1) {
    errors.push(`Duplicate 'candles' sentinel found (${candlesCount} occurrences).`);
  }

  // 2. Check for duplicate IDs in sequence
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of sequence) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }
  if (duplicates.size > 0) {
    errors.push(`Duplicate IDs in sequence: ${Array.from(duplicates).join(', ')}`);
  }

  // 3. Check for unknown IDs in sequence
  const knownSet = new Set(knownDrawingIds);
  for (const id of sequence) {
    if (id !== CANDLES_SENTINEL && !knownSet.has(id)) {
      errors.push(`Unknown drawing ID '${id}' in sequence.`);
    }
  }

  // 4. Check for missing known drawings
  const seqSet = new Set(sequence);
  for (const id of knownDrawingIds) {
    if (!seqSet.has(id)) {
      errors.push(`Known drawing ID '${id}' is missing from sequence.`);
    }
  }

  // 5. Enforce contiguous folder invariant
  // Track the start and end indices of each folder's children
  const folderIndices = new Map<string, number[]>();
  sequence.forEach((id, index) => {
    if (id === CANDLES_SENTINEL) return;
    const fId = folderLookup[id];
    if (fId) {
      if (!folderIndices.has(fId)) {
        folderIndices.set(fId, []);
      }
      folderIndices.get(fId)!.push(index);
    }
  });

  for (const [fId, indices] of folderIndices.entries()) {
    if (indices.length <= 1) continue;
    // For a contiguous block, indices must be consecutive: indices[k] === indices[0] + k
    const first = indices[0];
    const last = indices[indices.length - 1];
    if (last - first !== indices.length - 1) {
      errors.push(
        `Folder '${fId}' children are not contiguous in sequence (indices: ${indices.join(', ')}).`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Normalizes or constructs a canonical sequence from raw lists.
 * Enforces all invariants: adds missing drawings, removes duplicates/unknowns,
 * ensures 'candles' is present, and clusters broken folder slices into contiguous blocks.
 */
export function normalizeOrderSequence(
  rawSequence: string[] | null | undefined,
  knownDrawingIds: string[],
  folderLookup: DrawingFolderLookup,
  options?: { defaultCandlesPlacement?: 'top' | 'bottom' }
): string[] {
  const knownSet = new Set(knownDrawingIds);
  const result: string[] = [];
  const added = new Set<string>();

  // 1. Filter rawSequence to unique, valid items
  if (Array.isArray(rawSequence)) {
    for (const item of rawSequence) {
      if (item === CANDLES_SENTINEL) {
        if (!added.has(CANDLES_SENTINEL)) {
          result.push(CANDLES_SENTINEL);
          added.add(CANDLES_SENTINEL);
        }
      } else if (knownSet.has(item) && !added.has(item)) {
        result.push(item);
        added.add(item);
      }
    }
  }

  // 2. Add any missing known drawings
  for (const id of knownDrawingIds) {
    if (!added.has(id)) {
      result.push(id);
      added.add(id);
    }
  }

  // 3. Ensure 'candles' sentinel exists
  if (!added.has(CANDLES_SENTINEL)) {
    if (options?.defaultCandlesPlacement === 'top') {
      result.unshift(CANDLES_SENTINEL);
    } else {
      result.push(CANDLES_SENTINEL);
    }
    added.add(CANDLES_SENTINEL);
  }

  // 4. Cluster folder children into contiguous blocks
  return repairFolderContiguity(result, folderLookup);
}

/**
 * Pure helper to guarantee that all children belonging to the same folder
 * form a contiguous slice, pulling straggler children to the first child's position.
 */
export function repairFolderContiguity(
  sequence: string[],
  folderLookup: DrawingFolderLookup
): string[] {
  const folderChildrenMap = new Map<string, string[]>();
  const firstSeenFolderIndex = new Map<string, number>();

  // First pass: collect children per folder and record where the folder first appears
  sequence.forEach((id, index) => {
    if (id === CANDLES_SENTINEL) return;
    const fId = folderLookup[id];
    if (fId) {
      if (!folderChildrenMap.has(fId)) {
        folderChildrenMap.set(fId, []);
        firstSeenFolderIndex.set(fId, index);
      }
      folderChildrenMap.get(fId)!.push(id);
    }
  });

  if (folderChildrenMap.size === 0) {
    return [...sequence];
  }

  const result: string[] = [];
  const insertedFolders = new Set<string>();

  for (const id of sequence) {
    if (id === CANDLES_SENTINEL) {
      result.push(id);
      continue;
    }

    const fId = folderLookup[id];
    if (!fId) {
      // Loose drawing
      result.push(id);
    } else {
      // Child drawing: insert entire contiguous folder slice on first encounter
      if (!insertedFolders.has(fId)) {
        const cluster = folderChildrenMap.get(fId) || [];
        result.push(...cluster);
        insertedFolders.add(fId);
      }
      // Subsequent encounters of children from this folder are skipped because
      // the entire cluster was already placed.
    }
  }

  return result;
}

/**
 * Returns the start and end indices of a folder's contiguous block in the sequence.
 */
export function getFolderBlockRange(
  sequence: string[],
  folderId: string,
  folderLookup: DrawingFolderLookup
): { start: number; end: number; childIds: string[] } | null {
  const childIds: string[] = [];
  let start = -1;
  let end = -1;

  sequence.forEach((id, idx) => {
    if (id !== CANDLES_SENTINEL && folderLookup[id] === folderId) {
      childIds.push(id);
      if (start === -1) start = idx;
      end = idx;
    }
  });

  if (start === -1) return null;
  return { start, end, childIds };
}

/**
 * Pure operation: Move an item to the front (topmost).
 * - If target is a root drawing or 'candles': moves to index 0 of sequence.
 * - If target is a child drawing in a folder: moves to the top of its folder block.
 */
export function bringToFront(
  sequence: string[],
  targetId: string,
  folderLookup: DrawingFolderLookup
): string[] {
  const currentIdx = sequence.indexOf(targetId);
  if (currentIdx === -1) return sequence;

  const fId = targetId !== CANDLES_SENTINEL ? folderLookup[targetId] : null;

  if (!fId) {
    // Root item: move to index 0
    if (currentIdx === 0) return sequence;
    const next = [...sequence];
    next.splice(currentIdx, 1);
    next.unshift(targetId);
    return next;
  }

  // Child item: move to top of its folder block
  const block = getFolderBlockRange(sequence, fId, folderLookup);
  if (!block || currentIdx === block.start) return sequence;

  const next = [...sequence];
  next.splice(currentIdx, 1);
  next.splice(block.start, 0, targetId);
  return next;
}

/**
 * Pure operation: Move an item to the back (bottommost).
 * - If target is a root drawing or 'candles': moves to last index of sequence.
 * - If target is a child drawing in a folder: moves to the bottom of its folder block.
 */
export function sendToBack(
  sequence: string[],
  targetId: string,
  folderLookup: DrawingFolderLookup
): string[] {
  const currentIdx = sequence.indexOf(targetId);
  if (currentIdx === -1) return sequence;

  const fId = targetId !== CANDLES_SENTINEL ? folderLookup[targetId] : null;

  if (!fId) {
    // Root item: move to end
    if (currentIdx === sequence.length - 1) return sequence;
    const next = [...sequence];
    next.splice(currentIdx, 1);
    next.push(targetId);
    return next;
  }

  // Child item: move to bottom of its folder block
  const block = getFolderBlockRange(sequence, fId, folderLookup);
  if (!block || currentIdx === block.end) return sequence;

  const next = [...sequence];
  next.splice(currentIdx, 1);
  next.splice(block.end, 0, targetId);
  return next;
}

/**
 * Pure operation: Move an item forward (closer to index 0 / top of tree).
 * - If target is a child drawing in a folder: swaps with predecessor sibling within folder.
 *   (Cannot escape folder boundary).
 * - If target is a root drawing or 'candles': jumps over the predecessor root drawing or
 *   the entire predecessor folder block.
 */
export function bringForward(
  sequence: string[],
  targetId: string,
  folderLookup: DrawingFolderLookup
): string[] {
  const currentIdx = sequence.indexOf(targetId);
  if (currentIdx <= 0) return sequence;

  const fId = targetId !== CANDLES_SENTINEL ? folderLookup[targetId] : null;

  if (fId) {
    // Scoped inside folder: can only move forward if predecessor is in the same folder
    const prevId = sequence[currentIdx - 1];
    if (folderLookup[prevId] === fId) {
      const next = [...sequence];
      next[currentIdx - 1] = targetId;
      next[currentIdx] = prevId;
      return next;
    }
    // Already at the top of this folder block: no-op
    return sequence;
  }

  // Root item: inspect predecessor
  const prevId = sequence[currentIdx - 1];
  const prevFolderId = prevId !== CANDLES_SENTINEL ? folderLookup[prevId] : null;

  if (!prevFolderId) {
    // Predecessor is another root item: simple swap
    const next = [...sequence];
    next[currentIdx - 1] = targetId;
    next[currentIdx] = prevId;
    return next;
  }

  // Predecessor is part of a folder: jump over the ENTIRE folder block
  const block = getFolderBlockRange(sequence, prevFolderId, folderLookup);
  if (!block) return sequence;

  const next = [...sequence];
  next.splice(currentIdx, 1);
  next.splice(block.start, 0, targetId);
  return next;
}

/**
 * Pure operation: Move an item backward (further from index 0 / down tree).
 * - If target is a child drawing in a folder: swaps with successor sibling within folder.
 * - If target is a root drawing or 'candles': jumps over the successor root drawing or
 *   the entire successor folder block.
 */
export function sendBackward(
  sequence: string[],
  targetId: string,
  folderLookup: DrawingFolderLookup
): string[] {
  const currentIdx = sequence.indexOf(targetId);
  if (currentIdx === -1 || currentIdx >= sequence.length - 1) return sequence;

  const fId = targetId !== CANDLES_SENTINEL ? folderLookup[targetId] : null;

  if (fId) {
    // Scoped inside folder: can only move backward if successor is in the same folder
    const nextId = sequence[currentIdx + 1];
    if (folderLookup[nextId] === fId) {
      const next = [...sequence];
      next[currentIdx + 1] = targetId;
      next[currentIdx] = nextId;
      return next;
    }
    // Already at the bottom of this folder block: no-op
    return sequence;
  }

  // Root item: inspect successor
  const nextId = sequence[currentIdx + 1];
  const nextFolderId = nextId !== CANDLES_SENTINEL ? folderLookup[nextId] : null;

  if (!nextFolderId) {
    // Successor is another root item: simple swap
    const next = [...sequence];
    next[currentIdx + 1] = targetId;
    next[currentIdx] = nextId;
    return next;
  }

  // Successor is part of a folder: jump after the ENTIRE folder block
  const block = getFolderBlockRange(sequence, nextFolderId, folderLookup);
  if (!block) return sequence;

  const next = [...sequence];
  next.splice(currentIdx, 1);
  next.splice(block.end, 0, targetId);
  return next;
}

/**
 * Pure operation: Move an entire folder block to a new position in the sequence.
 * `position`: 'above' (before target) or 'below' (after target).
 */
export function moveFolderBlock(
  sequence: string[],
  folderId: string,
  targetId: string,
  position: 'above' | 'below',
  folderLookup: DrawingFolderLookup
): string[] {
  const sourceBlock = getFolderBlockRange(sequence, folderId, folderLookup);
  if (!sourceBlock) return sequence; // Empty folder or not in sequence

  // Remove source folder block
  const next = [...sequence];
  const removedChildren = next.splice(sourceBlock.start, sourceBlock.childIds.length);

  // Determine insert position relative to target
  const targetFolderId = targetId !== CANDLES_SENTINEL ? folderLookup[targetId] : null;
  let targetIndex = -1;

  if (targetFolderId && targetFolderId !== folderId) {
    // Target is in a folder: target the whole folder block
    const targetBlock = getFolderBlockRange(next, targetFolderId, folderLookup);
    if (!targetBlock) return sequence;
    targetIndex = position === 'above' ? targetBlock.start : targetBlock.end + 1;
  } else {
    // Target is a root drawing or 'candles'
    const idx = next.indexOf(targetId);
    if (idx === -1) return sequence;
    targetIndex = position === 'above' ? idx : idx + 1;
  }

  next.splice(targetIndex, 0, ...removedChildren);
  return next;
}

/**
 * Pure operation: Move a drawing into a folder.
 * Updates the drawing position to the top (default) or bottom of that folder's block.
 */
export function moveDrawingIntoFolder(
  sequence: string[],
  drawingId: string,
  targetFolderId: string,
  folderLookup: DrawingFolderLookup,
  placement: 'top' | 'bottom' = 'top'
): { nextSequence: string[]; nextFolderLookup: DrawingFolderLookup } {
  const currentIdx = sequence.indexOf(drawingId);
  if (currentIdx === -1) return { nextSequence: sequence, nextFolderLookup: folderLookup };

  const nextLookup = { ...folderLookup, [drawingId]: targetFolderId };
  const targetBlock = getFolderBlockRange(sequence, targetFolderId, folderLookup);

  const next = [...sequence];
  next.splice(currentIdx, 1);

  if (!targetBlock) {
    // Folder was previously empty / has no children in sequence.
    // Insert where drawing was, or at end.
    next.splice(Math.min(currentIdx, next.length), 0, drawingId);
  } else {
    // Recalculate target block index in the spliced array
    const updatedBlock = getFolderBlockRange(next, targetFolderId, nextLookup);
    if (!updatedBlock) {
      next.push(drawingId);
    } else {
      const insertIdx = placement === 'top' ? updatedBlock.start : updatedBlock.end + 1;
      next.splice(insertIdx, 0, drawingId);
    }
  }

  return {
    nextSequence: next,
    nextFolderLookup: nextLookup,
  };
}

/**
 * Pure operation: Move a drawing out of its current folder to root level.
 * Places it immediately above (or below) the folder it just left.
 */
export function moveDrawingOutOfFolder(
  sequence: string[],
  drawingId: string,
  folderLookup: DrawingFolderLookup,
  placement: 'above_folder' | 'below_folder' = 'above_folder'
): { nextSequence: string[]; nextFolderLookup: DrawingFolderLookup } {
  const currentIdx = sequence.indexOf(drawingId);
  if (currentIdx === -1) return { nextSequence: sequence, nextFolderLookup: folderLookup };

  const currentFolderId = folderLookup[drawingId];
  if (!currentFolderId) {
    // Already at root level
    return { nextSequence: sequence, nextFolderLookup: folderLookup };
  }

  const block = getFolderBlockRange(sequence, currentFolderId, folderLookup);
  const nextLookup = { ...folderLookup, [drawingId]: null };

  const next = [...sequence];
  next.splice(currentIdx, 1);

  if (!block) {
    next.unshift(drawingId);
  } else {
    // Insert adjacent to the remaining folder block (or at previous block start if it was the only child)
    const remainingBlock = getFolderBlockRange(next, currentFolderId, nextLookup);
    const insertIdx = remainingBlock
      ? (placement === 'above_folder' ? remainingBlock.start : remainingBlock.end + 1)
      : Math.min(block.start, next.length);
    next.splice(insertIdx, 0, drawingId);
  }

  return {
    nextSequence: next,
    nextFolderLookup: nextLookup,
  };
}

/**
 * Pure operation: Insert a new drawing into the sequence.
 * - If targetFolderId is specified: inserts at the start of that folder's block.
 * - Otherwise: inserts at index 0 (topmost / front of chart).
 */
export function insertDrawing(
  sequence: string[],
  drawingId: string,
  targetFolderId?: string | null,
  folderLookup?: DrawingFolderLookup
): string[] {
  if (sequence.includes(drawingId)) return sequence; // Duplicate protection

  if (targetFolderId && folderLookup) {
    const block = getFolderBlockRange(sequence, targetFolderId, folderLookup);
    if (block) {
      const next = [...sequence];
      next.splice(block.start, 0, drawingId);
      return next;
    }
  }

  // Default: insert at index 0 (topmost)
  return [drawingId, ...sequence];
}

/**
 * Pure operation: Duplicate an existing drawing.
 * Places the new copy directly before the original (directly on top of it).
 */
export function duplicateDrawing(
  sequence: string[],
  sourceId: string,
  newId: string
): string[] {
  if (sequence.includes(newId)) return sequence;
  const idx = sequence.indexOf(sourceId);
  if (idx === -1) return [newId, ...sequence];

  const next = [...sequence];
  next.splice(idx, 0, newId); // Insert immediately in front of source
  return next;
}

/**
 * Pure operation: Delete an item (drawing or candles) from the sequence.
 */
export function deleteFromSequence(sequence: string[], id: string): string[] {
  const idx = sequence.indexOf(id);
  if (idx === -1) return sequence;
  const next = [...sequence];
  next.splice(idx, 1);
  return next;
}

export interface LegacyDrawingCandidate {
  id: string;
  extendData?: {
    order?: number;
    folderId?: string | null;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface LegacyMigrationOptions {
  candlesVisible?: boolean;
  defaultCandlesPlacement?: 'top' | 'bottom';
}

/**
 * Pure, deterministic migration function (Phase 2B):
 * Transforms legacy drawings and folders into the canonical SymbolOrderState.
 *
 * MIGRATION RULES:
 * 1. Primary order source is drawing.extendData.order (descending).
 * 2. Unranked / missing / undefined order values sort to the top (Infinity).
 * 3. Deterministic tie-breaking on drawing ID via base-sensitive locale comparison.
 * 4. Folder contiguity: All children of the same folder are clustered around the
 *    position of the folder's highest-ranked (first) child.
 * 5. Singleton 'candles' sentinel is inserted according to defaultCandlesPlacement
 *    (default: bottom/underneath).
 * 6. Guaranteed exact membership, contiguity, and idempotence.
 */
export function migrateLegacyOrderToCanonical(
  symbol: string,
  drawings: LegacyDrawingCandidate[],
  folderLookup?: DrawingFolderLookup,
  options?: LegacyMigrationOptions
): SymbolOrderState {
  const key = symbol.toUpperCase();
  const knownIds = drawings.map((d) => d.id);

  // Build folder lookup if not provided
  const lookup: DrawingFolderLookup = folderLookup ? { ...folderLookup } : {};
  if (!folderLookup) {
    drawings.forEach((d) => {
      lookup[d.id] = d.extendData?.folderId;
    });
  }

  // Sort drawings deterministically:
  // - order descending (undefined/missing -> Infinity, sorting to front)
  // - deterministic tie-breaking on ID descending
  const sortedDrawings = [...drawings].sort((a, b) => {
    const orderA = typeof a.extendData?.order === 'number' ? a.extendData.order : Infinity;
    const orderB = typeof b.extendData?.order === 'number' ? b.extendData.order : Infinity;
    if (orderA !== orderB) return orderB - orderA;
    return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true, sensitivity: 'base' });
  });

  const rawSequence = sortedDrawings.map((d) => d.id);

  // Normalize: appends 'candles', removes duplicates, and clusters folder blocks contiguously
  const sequence = normalizeOrderSequence(rawSequence, knownIds, lookup, {
    defaultCandlesPlacement: options?.defaultCandlesPlacement ?? 'bottom',
  });

  return {
    symbol: key,
    sequence,
    candlesVisible: options?.candlesVisible ?? true,
  };
}
