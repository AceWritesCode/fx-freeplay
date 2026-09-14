import React, { useState, useEffect, useRef } from 'react';
import { Folder, FolderOpen, Eye, EyeOff, Lock, Unlock, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import { useDrawingStore } from '@/store';
import {
  DrawingChartAdapter,
  getOriginalDrawingId,
  buildTreeHierarchyFromCanonical,
  getFolderBlockRange,
  type DrawingFolderLookup,
} from '@/engine/charting';
import { ToolRegistry } from '@/framework/tools';
import { DeleteIcon } from '@/features/chart-workspace/components/DrawingToolbar';
import { DataWindow } from '@/features/chart-workspace/components/DataWindow';
import { ObjectTreeToolbar } from './object-tree/ObjectTreeToolbar';
import { ObjectTreeEmptyState } from './object-tree/ObjectTreeEmptyState';
import { DrawingTreeItem } from './object-tree/DrawingTreeItem';
import { FolderTreeItem } from './object-tree/FolderTreeItem';

/**
 * Pure predicate to filter out non-user drawings (sync copies, price lines, session breaks).
 */
export const isUserDrawingOverlay = (ov: any): boolean => {
  if (!ov) return false;
  if (typeof ov.id === 'string' && ov.id.startsWith('sync_')) return false;
  if (ov.id === 'custom_price_line_overlay' || ov.name === 'customPriceLine') return false;
  if (ov.id === 'session_breaks_overlay' || ov.name === 'sessionBreaks') return false;
  return true;
};

interface ObjectTreePanelProps {
  chartInstancesRef: React.MutableRefObject<(any | null)[]>;
  activeChartIndex: number;
  syncAllDrawings: () => void;
  drawingTrigger: number;
  setDrawingTrigger: React.Dispatch<React.SetStateAction<number>>;
  activeSymbol: string;
  activeTimeframe: string;
  /** @deprecated Kept optional for backward compatibility, unused */
  createOverlayWithHandlers?: (chart: any, overlayData: any) => void;
}

interface FolderItem {
  id: string;
  name: string;
  isCollapsed: boolean;
  isLocked: boolean;
  isVisible: boolean;
  order?: number;
}

export const ObjectTreePanel: React.FC<ObjectTreePanelProps> = ({
  chartInstancesRef,
  activeChartIndex,
  syncAllDrawings,
  drawingTrigger,
  setDrawingTrigger,
  activeSymbol,
  activeTimeframe,
  createOverlayWithHandlers: _createOverlayWithHandlers,
}) => {
  const [activeTab, setActiveTab] = useState<'objectTree' | 'dataWindow'>('objectTree');

  // Connect to global drawing store
  const {
    drawingsBySymbol,
    folders,
    setFolders,
    selectedOverlayIds,
    setSelectedOverlayIds,
    orderStateBySymbol,
  } = useDrawingStore();

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [draggedItemType, setDraggedItemType] = useState<'drawing' | 'folder' | 'candles' | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Drag visual feedback states
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below' | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const activeChart = chartInstancesRef.current[activeChartIndex];
  const [drawings, setDrawings] = useState<any[]>([]);

  // Load and sync folders per symbol via store
  useEffect(() => {
    if (!activeSymbol) {
      setFolders([]);
      return;
    }
    useDrawingStore.getState().loadSymbolFolders(activeSymbol);
  }, [activeSymbol, setFolders]);

  // Automatically delete folders that have 0 drawings in them
  useEffect(() => {
    if (folders.length === 0) return;
    
    // Find all folder IDs that are currently referenced by at least one drawing
    const activeFolderIds = new Set(
      drawings.map(d => d.extendData?.folderId).filter(Boolean)
    );
    
    // Filter folders to only those that have child drawings
    const nonMockFolders = folders.filter(f => activeFolderIds.has(f.id));
    
    if (nonMockFolders.length !== folders.length) {
      if (activeSymbol) {
        useDrawingStore.getState().saveSymbolFolders(activeSymbol, nonMockFolders);
      } else {
        setFolders(nonMockFolders);
      }
    }
  }, [drawings, folders, setFolders, activeSymbol]);

  // Read drawings from chart
  useEffect(() => {
    if (!activeChart) {
      setDrawings([]);
      return;
    }
    const overlays = activeChart.getOverlays();
    const filtered = overlays.filter(isUserDrawingOverlay);
    // Sort by order descending if available, else fall back to id descending.
    // Treat undefined orders as Infinity so new drawings sort to the top.
    filtered.sort((a: any, b: any) => {
      const orderA = a.extendData?.order ?? Infinity;
      const orderB = b.extendData?.order ?? Infinity;
      if (orderA !== orderB) {
        return orderB - orderA;
      }
      return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true, sensitivity: 'base' });
    });
    setDrawings(filtered);
  }, [activeChart, drawingTrigger]);

  // Focus rename input
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Create a new folder
  const handleCreateFolder = () => {
    if (!activeSymbol) return;
    const newFolder = useDrawingStore.getState().createSymbolFolder(activeSymbol, undefined, selectedOverlayIds);

    // If there are selected drawings, immediately update live chart overlays if activeChart exists
    if (selectedOverlayIds.length > 0 && activeChart) {
      selectedOverlayIds.forEach(id => {
        const overlay = activeChart.getOverlays().find((o: any) => o.id === id);
        if (overlay) {
          activeChart.overrideOverlay({
            id,
            extendData: {
              ...overlay.extendData,
              folderId: newFolder.id,
            },
          });
        }
      });
      syncAllDrawings();
      setDrawingTrigger(prev => prev + 1);
    }
  };

  // Delete a folder
  const handleDeleteFolder = (folderId: string) => {
    if (activeSymbol) {
      useDrawingStore.getState().deleteSymbolFolder(activeSymbol, folderId);
    } else {
      useDrawingStore.getState().removeFolder(folderId);
    }
  };

  // Toggle folder visible status
  const handleToggleFolderVisible = (folderId: string, currentVisible: boolean) => {
    const nextVisible = !currentVisible;
    if (activeSymbol) {
      useDrawingStore.getState().setFolderVisibility(activeSymbol, folderId, nextVisible);
    } else {
      setFolders(prev => prev.map(f => (f.id === folderId ? { ...f, isVisible: nextVisible } : f)));
    }

    if (activeChart) {
      const overlays = activeChart.getOverlays();
      overlays.forEach((ov: any) => {
        if (ov.extendData?.folderId === folderId) {
          activeChart.overrideOverlay({
            id: ov.id,
            visible: nextVisible,
          });
        }
      });
      syncAllDrawings();
      setDrawingTrigger(prev => prev + 1);
    }
  };

  // Toggle folder lock status
  const handleToggleFolderLock = (folderId: string, currentLocked: boolean) => {
    const nextLocked = !currentLocked;
    if (activeSymbol) {
      useDrawingStore.getState().setFolderLock(activeSymbol, folderId, nextLocked);
    } else {
      setFolders(prev => prev.map(f => (f.id === folderId ? { ...f, isLocked: nextLocked } : f)));
    }

    if (activeChart) {
      const overlays = activeChart.getOverlays();
      overlays.forEach((ov: any) => {
        if (ov.extendData?.folderId === folderId) {
          activeChart.overrideOverlay({
            id: ov.id,
            lock: nextLocked,
            styles: {
              point: nextLocked ? {
                radius: 0,
                activeRadius: 0,
                color: 'transparent',
                borderColor: 'transparent',
                borderSize: 0,
                activeColor: 'transparent',
                activeBorderColor: 'transparent',
                activeBorderSize: 0
              } : {
                radius: 4.5,
                activeRadius: 5.5,
                color: '#ffffff',
                borderColor: '#2196F3',
                borderSize: 1.5,
                activeColor: '#ffffff',
                activeBorderColor: '#2196F3',
                activeBorderSize: 2
              }
            }
          });
        }
      });
      syncAllDrawings();
      setDrawingTrigger(prev => prev + 1);
    }
  };

  const handleMouseEnterItem = (id: string) => {
    if (activeChart) {
      const overlay = activeChart.getOverlays().find((o: any) => o.id === id);
      if (overlay) {
        activeChart.overrideOverlay({
          id,
          extendData: {
            ...overlay.extendData,
            isHovered: true
          }
        });
        setDrawingTrigger(prev => prev + 1);
      }
    }
    chartInstancesRef.current.forEach((chart) => {
      if (chart) {
        DrawingChartAdapter.promoteOverlay(chart, id);
      }
    });
  };

  const handleMouseLeaveItem = (id: string) => {
    if (activeChart) {
      const overlay = activeChart.getOverlays().find((o: any) => o.id === id);
      if (overlay) {
        activeChart.overrideOverlay({
          id,
          extendData: {
            ...overlay.extendData,
            isHovered: false
          }
        });
        setDrawingTrigger(prev => prev + 1);
      }
    }
    chartInstancesRef.current.forEach((chart) => {
      if (chart) {
        if (!selectedOverlayIds.includes(id)) {
          DrawingChartAdapter.restorePromotedOverlay(chart, id);
          if (selectedOverlayIds.length === 1) {
            DrawingChartAdapter.promoteOverlay(chart, selectedOverlayIds[0]);
          }
        }
      }
    });
  };

  // Drag and drop handlers
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
      setDrawingTrigger(prev => prev + 1);
      return;
    }

    if (draggedType === 'drawing') {
      const existingDrawing = storeDrawings.find(d => d.id === draggedId);
      if (existingDrawing?.extendData?.folderId) {
        useDrawingStore.getState().updateSymbolDrawing(key, draggedId, {
          extendData: {
            ...(existingDrawing.extendData || {}),
            folderId: null,
          },
        });
      }

      const withoutDragged = currentSeq.filter(id => id !== draggedId);
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
        setDrawingTrigger(prev => prev + 1);
      }
      return;
    }

    if (draggedType === 'candles') {
      const withoutCandles = currentSeq.filter(id => id !== 'candles');
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
        setDrawingTrigger(prev => prev + 1);
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
        setDrawingTrigger(prev => prev + 1);
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
        const existingDrawing = storeDrawings.find(d => d.id === dragId);

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
        const nextSeq = [...currentSeq.filter(id => id !== dragId), dragId];
        useDrawingStore.getState().setSymbolOrderSequence(key, nextSeq);

        syncAllDrawings();
        setDrawingTrigger(prev => prev + 1);
      } else if ((dragType === 'folder' || dragType === 'candles') && dragId) {
        const folderLookup: DrawingFolderLookup = {};
        storeDrawings.forEach((d) => {
          folderLookup[d.id] = d.extendData?.folderId;
        });

        if (dragType === 'folder') {
          const block = getFolderBlockRange(currentSeq, dragId, folderLookup);
          if (block) {
            const nextSeq = currentSeq.filter(id => folderLookup[id] !== dragId);
            nextSeq.push(...block.childIds);
            useDrawingStore.getState().setSymbolOrderSequence(key, nextSeq);
          }
        } else if (dragType === 'candles') {
          const nextSeq = currentSeq.filter(id => id !== 'candles');
          nextSeq.push('candles');
          useDrawingStore.getState().setSymbolOrderSequence(key, nextSeq);
        }

        syncAllDrawings();
        setDrawingTrigger(prev => prev + 1);
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
      const targetOverlay = drawings.find(d => d.id === itemId);
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
        const draggedDrawing = storeDrawings.find(d => d.id === dragId);
        const targetDrawing = storeDrawings.find(d => d.id === targetId);

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
        const withoutDragged = currentSeq.filter(id => id !== dragId);
        const targetIndex = withoutDragged.indexOf(targetId);

        if (targetIndex !== -1) {
          const insertIndex = dropPosition === 'below' ? targetIndex + 1 : targetIndex;
          const nextSeq = [...withoutDragged];
          nextSeq.splice(insertIndex, 0, dragId);
          useDrawingStore.getState().setSymbolOrderSequence(key, nextSeq);
        }

        syncAllDrawings();
        setDrawingTrigger(prev => prev + 1);
      } else if ((dragType === 'folder' || dragType === 'candles') && dragId) {
        const storeDrawings = useDrawingStore.getState().getSymbolDrawings(activeSymbol.toUpperCase());
        const targetDrawing = storeDrawings.find(d => d.id === targetId);
        if (targetDrawing && !targetDrawing.extendData?.folderId) {
          reorderRootItems(dragId, dragType, targetId, 'drawing', dropPosition || 'above');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle drawing visibility
  const handleToggleDrawingVisible = (id: string, currentVisible: boolean) => {
    const nextVisible = !currentVisible;
    if (activeSymbol) {
      const symbolKey = activeSymbol.toUpperCase();
      useDrawingStore.getState().updateSymbolDrawing(symbolKey, id, { visible: nextVisible });
    }
    if (activeChart) {
      activeChart.overrideOverlay({
        id,
        visible: nextVisible,
      });
      syncAllDrawings();
      setDrawingTrigger(prev => prev + 1);
    }
  };

  // Toggle drawing lock
  const handleToggleDrawingLock = (id: string, currentLocked: boolean) => {
    const nextLocked = !currentLocked;
    if (activeSymbol) {
      const symbolKey = activeSymbol.toUpperCase();
      useDrawingStore.getState().updateSymbolDrawing(symbolKey, id, { lock: nextLocked });
    }
    if (activeChart) {
      activeChart.overrideOverlay({
        id,
        lock: nextLocked,
        styles: {
          point: nextLocked ? {
            radius: 0,
            activeRadius: 0,
            color: 'transparent',
            borderColor: 'transparent',
            borderSize: 0,
            activeColor: 'transparent',
            activeBorderColor: 'transparent',
            activeBorderSize: 0
          } : {
            radius: 4.5,
            activeRadius: 5.5,
            color: '#ffffff',
            borderColor: '#2196F3',
            borderSize: 1.5,
            activeColor: '#ffffff',
            activeBorderColor: '#2196F3',
            activeBorderSize: 2
          }
        }
      });
      syncAllDrawings();
      setDrawingTrigger(prev => prev + 1);
    }
  };

  // Delete drawing
  const handleDeleteDrawing = (id: string) => {
    const originalId = getOriginalDrawingId(id);
    useDrawingStore.getState().removeSymbolDrawingById(id);
    syncAllDrawings();
    setSelectedOverlayIds(prev => prev.filter(item => item !== id && item !== originalId));
    setDrawingTrigger(prev => prev + 1);
  };

  // Rename action
  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const handleFinishRename = (id: string, isFolder: boolean) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }

    const newName = renameValue.trim();

    if (isFolder) {
      if (activeSymbol) {
        useDrawingStore.getState().updateSymbolFolder(activeSymbol, id, { name: newName });
      } else {
        useDrawingStore.getState().updateFolder(id, { name: newName });
      }
    } else {
      if (activeSymbol) {
        useDrawingStore.getState().updateSymbolDrawing(activeSymbol, id, {
          extendData: {
            customName: newName,
          },
        });
      }

      if (activeChart) {
        const overlay = activeChart.getOverlays().find((o: any) => o.id === id);
        if (overlay) {
          activeChart.overrideOverlay({
            id,
            extendData: {
              ...overlay.extendData,
              customName: newName,
            },
          });
        }
      }
      syncAllDrawings();
      setDrawingTrigger(prev => prev + 1);
    }
    setRenamingId(null);
  };

  // Group selection actions
  const handleGroupSelected = () => {
    if (selectedOverlayIds.length === 0) return;
    handleCreateFolder();
  };

  const handleLockSelected = () => {
    if (selectedOverlayIds.length === 0) return;
    if (!activeSymbol) return;
    const symbolKey = activeSymbol.toUpperCase();
    const storeDrawings = useDrawingStore.getState().drawingsBySymbol[symbolKey] || [];

    const isAnyUnlocked = selectedOverlayIds.some(id => {
      const d = storeDrawings.find(item => item.id === id);
      return d && !d.lock;
    });

    const targetLock = isAnyUnlocked;

    useDrawingStore.getState().setDrawingsLock(activeSymbol, selectedOverlayIds, targetLock);

    if (activeChart) {
      selectedOverlayIds.forEach(id => {
        activeChart.overrideOverlay({
          id,
          lock: targetLock,
          styles: {
            point: targetLock ? {
              radius: 0,
              activeRadius: 0,
              color: 'transparent',
              borderColor: 'transparent',
              borderSize: 0,
              activeColor: 'transparent',
              activeBorderColor: 'transparent',
              activeBorderSize: 0
            } : {
              radius: 4.5,
              activeRadius: 5.5,
              color: '#ffffff',
              borderColor: '#2196F3',
              borderSize: 1.5,
              activeColor: '#ffffff',
              activeBorderColor: '#2196F3',
              activeBorderSize: 2
            }
          }
        });
      });
    }
    syncAllDrawings();
    setDrawingTrigger(prev => prev + 1);
  };

  const handleHideSelected = () => {
    if (selectedOverlayIds.length === 0) return;
    if (!activeSymbol) return;
    const symbolKey = activeSymbol.toUpperCase();
    const storeDrawings = useDrawingStore.getState().drawingsBySymbol[symbolKey] || [];

    const isAnyVisible = selectedOverlayIds.some(id => {
      const d = storeDrawings.find(item => item.id === id);
      return d && d.visible !== false;
    });

    const targetVisible = !isAnyVisible;

    useDrawingStore.getState().setDrawingsVisibility(activeSymbol, selectedOverlayIds, targetVisible);

    if (activeChart) {
      selectedOverlayIds.forEach(id => {
        activeChart.overrideOverlay({
          id,
          visible: targetVisible,
        });
      });
    }
    syncAllDrawings();
    setDrawingTrigger(prev => prev + 1);
  };

  const handleDeleteSelected = () => {
    if (selectedOverlayIds.length === 0 || !activeSymbol) return;
    const originalIds = selectedOverlayIds.map(id => getOriginalDrawingId(id));
    useDrawingStore.getState().batchRemoveSymbolDrawings(activeSymbol, originalIds);
    setSelectedOverlayIds([]);
  };

  // Drawing helper
  const getDrawingIcon = (toolName: string) => {
    // 1. Check ToolRegistry
    const registeredTool =
      ToolRegistry.get(toolName) ||
      ToolRegistry.getAll().find(
        (t: any) => t.id === toolName || t.createOverlayDef?.().name === toolName
      );
    if (registeredTool && registeredTool.icon) {
      const ToolIcon = registeredTool.icon;
      return <ToolIcon className="w-4 h-4 text-txt-muted" />;
    }

    // Fallback line icon
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="16" height="16" className="text-txt-muted">
        <path stroke="currentColor" strokeWidth="2" d="M5 23L23 5" />
      </svg>
    );
  };

  const getDrawingLabel = (ov: any) => {
    if (ov.extendData?.customName) return ov.extendData.customName;
    const toolName = ov.name || '';

    // Check ToolRegistry
    const registeredTool =
      ToolRegistry.get(toolName) ||
      ToolRegistry.getAll().find(
        (t: any) => t.id === toolName || t.createOverlayDef?.().name === toolName
      );
    if (registeredTool && registeredTool.name) {
      return registeredTool.name;
    }

    // Fallback capitalize first letter
    if (!toolName) return 'Drawing';
    return toolName.charAt(0).toUpperCase() + toolName.slice(1);
  };

  // Canonical tree hierarchy derivation (Phase 2C-4B)
  const canonicalSequence = React.useMemo(() => {
    if (!activeSymbol) return [];
    const key = activeSymbol.toUpperCase();
    return orderStateBySymbol[key]?.sequence || useDrawingStore.getState().getSymbolOrderSequence(key);
  }, [activeSymbol, orderStateBySymbol]);

  const currentSymbolDrawings = React.useMemo(() => {
    if (!activeSymbol) return [];
    const key = activeSymbol.toUpperCase();
    return drawingsBySymbol[key] || [];
  }, [activeSymbol, drawingsBySymbol]);

  const { rootItems, groupedDrawings } = React.useMemo(() => {
    const candlesOrder = activeChart ? (activeChart._candlesOrder ?? 500) : 500;
    const candlesVisible = activeChart ? (activeChart._showCandles !== false) : true;

    return buildTreeHierarchyFromCanonical(canonicalSequence, currentSymbolDrawings, folders, {
      candlesVisible,
      candlesName: 'Main Series',
      candlesOrderFallback: candlesOrder,
    });
  }, [canonicalSequence, currentSymbolDrawings, folders, activeChart, drawingTrigger]);

  // Handle single selection
  const handleItemSelect = (e: React.MouseEvent, id: string) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedOverlayIds(prev =>
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    } else {
      setSelectedOverlayIds([id]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface text-txt-secondary font-sans select-none">
      
      {/* ── Segmented Controls Tab switcher ── */}
      <div className="px-3 py-2 border-b border-border-def bg-surface">
        <div className="flex bg-app-bg p-0.5 rounded-lg border border-border-sub">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'objectTree'}
            onClick={() => setActiveTab('objectTree')}
            className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'objectTree'
                ? 'bg-surface-elevated text-txt-primary shadow-sm'
                : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
            }`}
          >
            Object tree
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dataWindow'}
            onClick={() => setActiveTab('dataWindow')}
            className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'dataWindow'
                ? 'bg-surface-elevated text-txt-primary shadow-sm'
                : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
            }`}
          >
            Data window
          </button>
        </div>
      </div>

      {activeTab === 'objectTree' ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          <ObjectTreeToolbar
            hasSelection={selectedOverlayIds.length > 0}
            onGroupSelected={handleGroupSelected}
            onLockSelected={handleLockSelected}
            onHideSelected={handleHideSelected}
            onDeleteSelected={handleDeleteSelected}
          />

          {/* ── Tree Object List ── */}
          <div
            className="flex-1 overflow-y-auto px-1 py-1.5 space-y-1 scrollbar-thin scrollbar-thumb-border-def"
            onDragOver={handleDragOver}
            onDrop={handleDropOnRoot}
          >
            {/* Intermixed Folders, Drawings & Candles */}
            {rootItems.map(item => {
              if (item.type === 'folder') {
                const folder = item.data as FolderItem;
                const childDrawings = groupedDrawings[folder.id] || [];
                const isSelected = childDrawings.length > 0 && childDrawings.every(d => selectedOverlayIds.includes(d.id));

                return (
                  <FolderTreeItem
                    key={folder.id}
                    id={folder.id}
                    name={folder.name}
                    isCollapsed={folder.isCollapsed}
                    isLocked={folder.isLocked}
                    isVisible={folder.isVisible}
                    childCount={childDrawings.length}
                    isSelected={isSelected}
                    isActiveFolder={activeChart?._activeFolderId === folder.id}
                    isDragOverFolder={dragOverFolderId === folder.id}
                    isDragOverItem={dragOverItemId === folder.id}
                    dragOverPosition={dragOverPosition}
                    isDragging={isDragging}
                    isRenaming={renamingId === folder.id}
                    renameValue={renameValue}
                    renameInputRef={renameInputRef as any}
                    onRenameValueChange={setRenameValue}
                    onFinishRename={handleFinishRename}
                    onCancelRename={() => setRenamingId(null)}
                    onStartRename={handleStartRename}
                    onToggleCollapse={() => {
                      setFolders(prev =>
                        prev.map(f => (f.id === folder.id ? { ...f, isCollapsed: !f.isCollapsed } : f))
                      );
                    }}
                    onClick={() => {
                      if (activeChart) {
                        activeChart._activeFolderId = activeChart._activeFolderId === folder.id ? null : folder.id;
                        setDrawingTrigger(prev => prev + 1);
                      }

                      // Toggle folder selection: selects all children
                      const childIds = childDrawings.map(d => d.id);
                      if (childIds.length === 0) return;
                      const hasAllSelected = childIds.every(id => selectedOverlayIds.includes(id));
                      if (hasAllSelected) {
                        setSelectedOverlayIds(prev => prev.filter(id => !childIds.includes(id)));
                      } else {
                        setSelectedOverlayIds(prev => Array.from(new Set([...prev, ...childIds])));
                      }
                    }}
                    onToggleLock={() => handleToggleFolderLock(folder.id, folder.isLocked)}
                    onToggleVisible={() => handleToggleFolderVisible(folder.id, folder.isVisible)}
                    onDelete={() => handleDeleteFolder(folder.id)}
                    onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
                    onDragEnd={handleDragEnd}
                    onDragOverFolder={(e) => handleDragOverFolder(e, folder.id)}
                    onDragLeaveFolder={handleDragLeaveFolder}
                    onDropOnFolder={(e) => handleDropOnFolder(e, folder.id)}
                  >
                    {childDrawings.map(d => (
                      <DrawingTreeItem
                        key={d.id}
                        id={d.id}
                        name={d.name}
                        label={getDrawingLabel(d)}
                        icon={getDrawingIcon(d.name)}
                        variant="folderChild"
                        isSelected={selectedOverlayIds.includes(d.id)}
                        isHovered={d.extendData?.isHovered || false}
                        isLocked={d.lock || false}
                        isVisible={d.visible !== false}
                        isDragOver={dragOverItemId === d.id}
                        dragOverPosition={dragOverPosition}
                        isRenaming={renamingId === d.id}
                        renameValue={renameValue}
                        renameInputRef={renameInputRef as any}
                        onRenameValueChange={setRenameValue}
                        onFinishRename={handleFinishRename}
                        onCancelRename={() => setRenamingId(null)}
                        onStartRename={handleStartRename}
                        onSelect={handleItemSelect}
                        onMouseEnter={handleMouseEnterItem}
                        onMouseLeave={handleMouseLeaveItem}
                        onToggleLock={handleToggleDrawingLock}
                        onToggleVisible={handleToggleDrawingVisible}
                        onDelete={handleDeleteDrawing}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOverItem}
                        onDragLeave={handleDragLeaveItem}
                        onDrop={handleDropOnItem}
                      />
                    ))}
                  </FolderTreeItem>
                );
              } else if (item.type === 'candles') {
                const isVisible = activeChart ? (activeChart._showCandles !== false) : true;
                const isDragOverThis = dragOverItemId === 'candles';

                return (
                  <div
                    key="candles"
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, 'candles', 'candles')}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relativeY = e.clientY - rect.top;
                      const isAbove = relativeY < rect.height / 2;
                      setDragOverItemId('candles');
                      setDragOverPosition(isAbove ? 'above' : 'below');
                    }}
                    onDragLeave={() => {
                      setDragOverItemId(null);
                      setDragOverPosition(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const dragType = draggedItemType;
                      const dragId = draggedItemId;
                      const dropPosition = dragOverPosition;
                      handleDragEnd();

                      if (dragId && dragType && dragId !== 'candles') {
                        reorderRootItems(dragId, dragType, 'candles', 'candles', dropPosition || 'above');
                      }
                    }}
                    className={`group relative flex items-center justify-between px-2.5 py-1.5 border rounded-lg cursor-pointer transition-all border-transparent hover:bg-surface-hover text-xs font-semibold text-txt-secondary`}
                  >
                    {isDragOverThis && (
                      <div
                        className={`absolute left-0 right-0 h-0.5 bg-accent z-50 pointer-events-none ${
                          dragOverPosition === 'above' ? '-top-[1.5px]' : '-bottom-[1.5px]'
                        }`}
                      />
                    )}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-accent flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="16" height="16" fill="currentColor">
                          <path d="M17 11v6h3v-6h-3zm-.5-1h4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5z"></path>
                          <path d="M18 7h1v3.5h-1zm0 10.5h1V21h-1z"></path>
                          <path d="M9 8v12h3V8H9zm-.5-1h4a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5z"></path>
                          <path d="M10 4h1v3.5h-1zm0 16.5h1V24h-1z"></path>
                        </svg>
                      </span>
                      <span className="truncate">{activeSymbol} · {activeTimeframe} (Main Series)</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          title={isVisible ? "Hide candles" : "Show candles"}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeChart) {
                              activeChart._showCandles = !isVisible;
                              activeChart.setStyles({
                                candle: {
                                  show: !isVisible
                                }
                              });
                              setDrawingTrigger(prev => prev + 1);
                            }
                          }}
                          className={`p-1 rounded transition-colors ${
                            !isVisible
                              ? 'text-yellow-450 hover:text-yellow-350 bg-yellow-500/10'
                              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                          }`}
                        >
                          {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      
                      <span className="text-[10px] text-txt-muted font-bold uppercase tracking-wider bg-surface-elevated/40 px-1.5 py-0.5 rounded border border-border-sub flex-shrink-0">Chart</span>
                    </div>
                  </div>
                );
              } else {
                const d = item.data as any;
                return (
                  <DrawingTreeItem
                    key={d.id}
                    id={d.id}
                    name={d.name}
                    label={getDrawingLabel(d)}
                    icon={getDrawingIcon(d.name)}
                    variant="root"
                    isSelected={selectedOverlayIds.includes(d.id)}
                    isHovered={d.extendData?.isHovered || false}
                    isLocked={d.lock || false}
                    isVisible={d.visible !== false}
                    isDragOver={dragOverItemId === d.id}
                    dragOverPosition={dragOverPosition}
                    isRenaming={renamingId === d.id}
                    renameValue={renameValue}
                    renameInputRef={renameInputRef as any}
                    onRenameValueChange={setRenameValue}
                    onFinishRename={handleFinishRename}
                    onCancelRename={() => setRenamingId(null)}
                    onStartRename={handleStartRename}
                    onSelect={handleItemSelect}
                    onMouseEnter={handleMouseEnterItem}
                    onMouseLeave={handleMouseLeaveItem}
                    onToggleLock={handleToggleDrawingLock}
                    onToggleVisible={handleToggleDrawingVisible}
                    onDelete={handleDeleteDrawing}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOverItem}
                    onDragLeave={handleDragLeaveItem}
                    onDrop={handleDropOnItem}
                  />
                );
              }
            })}

            {drawings.length === 0 && <ObjectTreeEmptyState />}
          </div>
        </div>
      ) : (
        <DataWindow
          chartInstancesRef={chartInstancesRef}
          activeChartIndex={activeChartIndex}
          activeSymbol={activeSymbol}
          activeTimeframe={activeTimeframe}
        />
      )}
    </div>
  );
};
