import React, { useState } from 'react';
import { useDrawingStore } from '@/store';
import {
  getFolderBlockRange,
  type DrawingFolderLookup,
} from '@/engine/charting';

export interface UseObjectTreeDragDropOptions {
  activeSymbol: string;
  drawings: any[];
  syncAllDrawings: () => void;
  setDrawingTrigger: React.Dispatch<React.SetStateAction<number>>;
}

export interface UseObjectTreeDragDropReturn {
  isDragging: boolean;
  draggedItemId: string | null;
  draggedItemType: 'drawing' | 'folder' | 'candles' | null;
  dragOverItemId: string | null;
  dragOverPosition: 'above' | 'below' | null;
  dragOverFolderId: string | null;
  handleDragStart: (e: React.DragEvent, id: string, type: 'drawing' | 'folder' | 'candles') => void;
  handleDragEnd: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragOverFolder: (e: React.DragEvent, folderId: string) => void;
  handleDragLeaveFolder: () => void;
  handleDropOnFolder: (e: React.DragEvent, targetFolderId: string) => void;
  handleDropOnRoot: (e: React.DragEvent) => void;
  handleDragOverItem: (e: React.DragEvent, itemId: string) => void;
  handleDragLeaveItem: () => void;
  handleDropOnItem: (e: React.DragEvent, targetId: string) => void;
  reorderRootItems: (
    draggedId: string,
    draggedType: 'drawing' | 'folder' | 'candles',
    targetId: string,
    targetType: 'drawing' | 'folder' | 'candles',
    position: 'above' | 'below'
  ) => void;
}

export function useObjectTreeDragDrop({
  activeSymbol,
  drawings,
  syncAllDrawings,
  setDrawingTrigger,
}: UseObjectTreeDragDropOptions): UseObjectTreeDragDropReturn {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [draggedItemType, setDraggedItemType] = useState<'drawing' | 'folder' | 'candles' | null>(null);

  // Drag visual feedback states
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below' | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string, type: 'drawing' | 'folder' | 'candles') => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id, type }));
    setDraggedItemId(id);
    setDraggedItemType(type);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setDragOverItemId(null);
    setDragOverPosition(null);
    setDragOverFolderId(null);
    setDraggedItemId(null);
    setDraggedItemType(null);
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const reorderRootItems = (
    draggedId: string,
    draggedType: 'drawing' | 'folder' | 'candles',
    targetId: string,
    targetType: 'drawing' | 'folder' | 'candles',
    position: 'above' | 'below'
  ) => {
    if (!activeSymbol) return;

    const key = activeSymbol.toUpperCase();
    const currentSeq = useDrawingStore.getState().getSymbolOrderSequence(key);
    const storeDrawings = useDrawingStore.getState().getSymbolDrawings(key);
    const folderLookup: DrawingFolderLookup = {};
    storeDrawings.forEach((d) => {
      folderLookup[d.id] = d.extendData?.folderId;
    });

    if (draggedType === 'folder') {
      useDrawingStore.getState().moveSymbolFolderBlock(activeSymbol, draggedId, targetId, position);
      syncAllDrawings();
      setDrawingTrigger((prev) => prev + 1);
      return;
    }

    if (draggedType === 'drawing') {
      const existingDrawing = storeDrawings.find((d) => d.id === draggedId);
      if (existingDrawing?.extendData?.folderId) {
        useDrawingStore.getState().updateSymbolDrawing(key, draggedId, {
          extendData: {
            ...(existingDrawing.extendData || {}),
            folderId: null,
          },
        });
      }

      const withoutDragged = currentSeq.filter((id) => id !== draggedId);
      let insertIndex = -1;

      if (targetType === 'folder') {
        const targetBlock = getFolderBlockRange(withoutDragged, targetId, folderLookup);
        if (targetBlock) {
          insertIndex = position === 'above' ? targetBlock.start : targetBlock.end + 1;
        }
      } else {
        const targetIdx = withoutDragged.indexOf(targetId);
        if (targetIdx !== -1) {
          insertIndex = position === 'above' ? targetIdx : targetIdx + 1;
        }
      }

      if (insertIndex !== -1) {
        const nextSeq = [...withoutDragged];
        nextSeq.splice(insertIndex, 0, draggedId);
        useDrawingStore.getState().setSymbolOrderSequence(activeSymbol, nextSeq);
        syncAllDrawings();
        setDrawingTrigger((prev) => prev + 1);
      }
      return;
    }

    if (draggedType === 'candles') {
      const withoutCandles = currentSeq.filter((id) => id !== 'candles');
      let insertIndex = -1;

      if (targetType === 'folder') {
        const targetBlock = getFolderBlockRange(withoutCandles, targetId, folderLookup);
        if (targetBlock) {
          insertIndex = position === 'above' ? targetBlock.start : targetBlock.end + 1;
        }
      } else {
        const targetIdx = withoutCandles.indexOf(targetId);
        if (targetIdx !== -1) {
          insertIndex = position === 'above' ? targetIdx : targetIdx + 1;
        }
      }

      if (insertIndex !== -1) {
        const nextSeq = [...withoutCandles];
        nextSeq.splice(insertIndex, 0, 'candles');
        useDrawingStore.getState().setSymbolOrderSequence(activeSymbol, nextSeq);
        syncAllDrawings();
        setDrawingTrigger((prev) => prev + 1);
      }
      return;
    }
  };

  const handleDragOverFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedItemType === 'drawing') {
      setDragOverFolderId(folderId);
      setDragOverItemId(null);
      setDragOverPosition(null);
    } else if ((draggedItemType === 'folder' || draggedItemType === 'candles') && draggedItemId !== folderId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const isAbove = relativeY < rect.height / 2;
      setDragOverItemId(folderId);
      setDragOverPosition(isAbove ? 'above' : 'below');
      setDragOverFolderId(null);
    }
  };

  const handleDragLeaveFolder = () => {
    setDragOverFolderId(null);
    setDragOverItemId(null);
    setDragOverPosition(null);
  };

  const handleDropOnFolder = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const dragType = draggedItemType;
    const dragId = draggedItemId;

    handleDragEnd();

    if (!activeSymbol) return;

    try {
      if (dragType === 'drawing' && dragId) {
        useDrawingStore.getState().moveSymbolDrawingFolder(activeSymbol, dragId, targetFolderId, 'top');
        syncAllDrawings();
        setDrawingTrigger((prev) => prev + 1);
      } else if ((dragType === 'folder' || dragType === 'candles') && dragId && dragId !== targetFolderId) {
        reorderRootItems(dragId, dragType, targetFolderId, 'folder', dragOverPosition || 'above');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    const dragType = draggedItemType;
    const dragId = draggedItemId;

    handleDragEnd();

    if (!activeSymbol) return;

    try {
      const key = activeSymbol.toUpperCase();
      const currentSeq = useDrawingStore.getState().getSymbolOrderSequence(key);
      const storeDrawings = useDrawingStore.getState().getSymbolDrawings(key);

      if (dragType === 'drawing' && dragId) {
        const existingDrawing = storeDrawings.find((d) => d.id === dragId);

        // Move drawing to root level if it was in a folder
        if (existingDrawing?.extendData?.folderId) {
          useDrawingStore.getState().updateSymbolDrawing(key, dragId, {
            extendData: {
              ...(existingDrawing.extendData || {}),
              folderId: null,
            },
          });
        }

        // Place at the bottom (end) of canonical sequence
        const nextSeq = [...currentSeq.filter((id) => id !== dragId), dragId];
        useDrawingStore.getState().setSymbolOrderSequence(key, nextSeq);

        syncAllDrawings();
        setDrawingTrigger((prev) => prev + 1);
      } else if ((dragType === 'folder' || dragType === 'candles') && dragId) {
        const folderLookup: DrawingFolderLookup = {};
        storeDrawings.forEach((d) => {
          folderLookup[d.id] = d.extendData?.folderId;
        });

        if (dragType === 'folder') {
          const block = getFolderBlockRange(currentSeq, dragId, folderLookup);
          if (block) {
            const nextSeq = currentSeq.filter((id) => folderLookup[id] !== dragId);
            nextSeq.push(...block.childIds);
            useDrawingStore.getState().setSymbolOrderSequence(key, nextSeq);
          }
        } else if (dragType === 'candles') {
          const nextSeq = currentSeq.filter((id) => id !== 'candles');
          nextSeq.push('candles');
          useDrawingStore.getState().setSymbolOrderSequence(key, nextSeq);
        }

        syncAllDrawings();
        setDrawingTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragOverItem = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedItemType === 'drawing') {
      const rect = e.currentTarget.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const isAbove = relativeY < rect.height / 2;
      setDragOverItemId(itemId);
      setDragOverPosition(isAbove ? 'above' : 'below');
    } else if (draggedItemType === 'folder' || draggedItemType === 'candles') {
      // Reorder folder/candles relative to root-level drawing only
      const targetOverlay = drawings.find((d) => d.id === itemId);
      const isRootDrawing = targetOverlay && !targetOverlay.extendData?.folderId;
      if (isRootDrawing) {
        const rect = e.currentTarget.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const isAbove = relativeY < rect.height / 2;
        setDragOverItemId(itemId);
        setDragOverPosition(isAbove ? 'above' : 'below');
      }
    }
  };

  const handleDragLeaveItem = () => {
    setDragOverItemId(null);
    setDragOverPosition(null);
  };

  const handleDropOnItem = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const dragType = draggedItemType;
    const dragId = draggedItemId;
    const dropPosition = dragOverPosition;

    handleDragEnd();

    if (!activeSymbol) return;

    try {
      if (dragType === 'drawing' && dragId && dragId !== targetId) {
        const key = activeSymbol.toUpperCase();
        const storeDrawings = useDrawingStore.getState().getSymbolDrawings(key);
        const draggedDrawing = storeDrawings.find((d) => d.id === dragId);
        const targetDrawing = storeDrawings.find((d) => d.id === targetId);

        const targetFolderId = targetDrawing?.extendData?.folderId || null;
        const currentFolderId = draggedDrawing?.extendData?.folderId || null;

        // 1. If crossing folder boundary, update folderId in drawing definition
        if (currentFolderId !== targetFolderId) {
          useDrawingStore.getState().updateSymbolDrawing(key, dragId, {
            extendData: {
              ...(draggedDrawing?.extendData || {}),
              folderId: targetFolderId,
            },
          });
        }

        // 2. Reorder in canonical sequence immediately adjacent to targetId
        const currentSeq = useDrawingStore.getState().getSymbolOrderSequence(key);
        const withoutDragged = currentSeq.filter((id) => id !== dragId);
        const targetIndex = withoutDragged.indexOf(targetId);

        if (targetIndex !== -1) {
          const insertIndex = dropPosition === 'below' ? targetIndex + 1 : targetIndex;
          const nextSeq = [...withoutDragged];
          nextSeq.splice(insertIndex, 0, dragId);
          useDrawingStore.getState().setSymbolOrderSequence(key, nextSeq);
        }

        syncAllDrawings();
        setDrawingTrigger((prev) => prev + 1);
      } else if ((dragType === 'folder' || dragType === 'candles') && dragId) {
        const storeDrawings = useDrawingStore.getState().getSymbolDrawings(activeSymbol.toUpperCase());
        const targetDrawing = storeDrawings.find((d) => d.id === targetId);
        if (targetDrawing && !targetDrawing.extendData?.folderId) {
          reorderRootItems(dragId, dragType, targetId, 'drawing', dropPosition || 'above');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return {
    isDragging,
    draggedItemId,
    draggedItemType,
    dragOverItemId,
    dragOverPosition,
    dragOverFolderId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragOverFolder,
    handleDragLeaveFolder,
    handleDropOnFolder,
    handleDropOnRoot,
    handleDragOverItem,
    handleDragLeaveItem,
    handleDropOnItem,
    reorderRootItems,
  };
}
