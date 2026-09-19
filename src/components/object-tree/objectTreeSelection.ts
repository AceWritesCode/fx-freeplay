import type { TreeRootItem } from '../../engine/charting/orderEngine.ts';

export interface FolderLikeItem {
  id: string;
  isCollapsed?: boolean;
  [key: string]: any;
}

export interface DrawingLikeItem {
  id: string;
  [key: string]: any;
}

/**
 * Extracts drawing IDs in their current visual top-to-bottom order in the Object Tree.
 * - Root drawings are included at their position.
 * - Folder children are included if and only if the folder is NOT collapsed.
 * - Non-drawing items (such as 'candles' sentinel) are excluded.
 */
export function getVisibleDrawingIds<
  TFolder extends FolderLikeItem = FolderLikeItem,
  TDrawing extends DrawingLikeItem = DrawingLikeItem
>(
  rootItems: TreeRootItem<TFolder, TDrawing>[],
  groupedDrawings: Record<string, TDrawing[]>
): string[] {
  const visibleIds: string[] = [];

  for (const item of rootItems) {
    if (item.type === 'folder') {
      const folder = item.data as TFolder;
      if (!folder.isCollapsed) {
        const children = groupedDrawings[folder.id] || [];
        for (const child of children) {
          if (child && child.id) {
            visibleIds.push(child.id);
          }
        }
      }
    } else if (item.type === 'drawing') {
      const drawing = item.data as TDrawing;
      if (drawing && drawing.id) {
        visibleIds.push(drawing.id);
      }
    }
  }

  return visibleIds;
}

/**
 * Pure helper to compute inclusive range selection between an anchor ID and target ID.
 * Handles both forward (anchor -> target) and backward (target -> anchor) directions.
 */
export function calculateRangeSelection(
  visibleIds: string[],
  anchorId: string | null,
  targetId: string
): { selectedIds: string[]; newAnchorId: string } {
  if (!visibleIds.includes(targetId)) {
    return { selectedIds: [targetId], newAnchorId: targetId };
  }

  if (!anchorId || !visibleIds.includes(anchorId)) {
    return { selectedIds: [targetId], newAnchorId: targetId };
  }

  const anchorIdx = visibleIds.indexOf(anchorId);
  const targetIdx = visibleIds.indexOf(targetId);

  const startIdx = Math.min(anchorIdx, targetIdx);
  const endIdx = Math.max(anchorIdx, targetIdx);

  const selectedIds = visibleIds.slice(startIdx, endIdx + 1);
  return { selectedIds, newAnchorId: anchorId };
}

export interface ResolveSelectionOptions {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  targetId: string;
  currentSelectedIds: string[];
  currentAnchorId: string | null;
  visibleDrawingIds: string[];
}

export interface ResolveSelectionResult {
  nextSelectedIds: string[];
  nextAnchorId: string;
}

/**
 * Pure reducer for Object Tree click selection with Shift-range, Ctrl-toggle, and Normal single-select.
 */
export function resolveObjectTreeClickSelection({
  shiftKey,
  ctrlKey,
  metaKey,
  targetId,
  currentSelectedIds,
  currentAnchorId,
  visibleDrawingIds,
}: ResolveSelectionOptions): ResolveSelectionResult {
  // 1. Shift range selection
  if (shiftKey) {
    let effectiveAnchor = currentAnchorId;
    if (!effectiveAnchor || !visibleDrawingIds.includes(effectiveAnchor)) {
      effectiveAnchor = currentSelectedIds.find((id) => visibleDrawingIds.includes(id)) || null;
    }

    const { selectedIds, newAnchorId } = calculateRangeSelection(
      visibleDrawingIds,
      effectiveAnchor,
      targetId
    );

    return {
      nextSelectedIds: selectedIds,
      nextAnchorId: newAnchorId,
    };
  }

  // 2. Ctrl / Meta toggle selection
  if (ctrlKey || metaKey) {
    const isAlreadySelected = currentSelectedIds.includes(targetId);
    const nextSelectedIds = isAlreadySelected
      ? currentSelectedIds.filter((id) => id !== targetId)
      : [...currentSelectedIds, targetId];

    return {
      nextSelectedIds,
      nextAnchorId: targetId,
    };
  }

  // 3. Normal single click selection
  return {
    nextSelectedIds: [targetId],
    nextAnchorId: targetId,
  };
}
