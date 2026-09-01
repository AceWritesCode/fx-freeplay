import React, { useState, useEffect, useRef } from 'react';
import { Layers, Folder, FolderOpen, FolderPlus, Eye, EyeOff, Lock, Unlock, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import { useDrawingStore } from '@/store';
import { getOriginalDrawingId } from '@/engine/charting';
import { drawingRepository } from '@/repository';
import { ToolRegistry } from '@/framework/tools';
import { TEXT_TOOLS, DeleteIcon } from '@/features/chart-workspace/components/DrawingToolbar';

interface ObjectTreePanelProps {
  chartInstancesRef: React.MutableRefObject<(any | null)[]>;
  activeChartIndex: number;
  syncAllDrawings: () => void;
  drawingTrigger: number;
  setDrawingTrigger: React.Dispatch<React.SetStateAction<number>>;
  activeSymbol: string;
  activeTimeframe: string;
  /** Creates an overlay with the full set of interactive event handlers (onClick, onDrawEnd, etc.) */
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
    folders,
    setFolders,
    selectedOverlayIds,
    setSelectedOverlayIds
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

  // Load and sync folders per symbol
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`fx_folders_${activeSymbol}`);
      const parsed = saved ? JSON.parse(saved) : [];
      const initialized = parsed.map((f: any, idx: number) => ({
        ...f,
        order: f.order ?? (parsed.length - idx) * 100
      }));
      setFolders(initialized);
    } catch {
      setFolders([]);
    }
  }, [activeSymbol, setFolders]);

  // Persist folders
  useEffect(() => {
    if (activeSymbol && folders.length > 0) {
      localStorage.setItem(`fx_folders_${activeSymbol}`, JSON.stringify(folders));
    }
  }, [folders, activeSymbol]);

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
      setFolders(nonMockFolders);
    }
  }, [drawings, folders, setFolders]);

  // Helper to recalculate unified order and recreate all overlays on activeChart.
  // Visual canvas stacking order = creation order: created first = underneath, created last = on top.
  // Items with order < candlesOrder are created before candles (draw behind), items > candlesOrder after (draw on top).
  const recalculateAndRecreateOverlays = (
    updatedFolders: FolderItem[],
    sortedRootItems: { type: 'folder' | 'drawing' | 'candles', id: string, order: number, data: any }[]
  ) => {
    if (!activeChart) return;

    // 1. Get all current overlays
    const overlays = activeChart.getOverlays();
    const filtered = overlays.filter(
      (ov: any) =>
        !ov.id?.startsWith('sync_') &&
        ov.id !== 'custom_price_line_overlay' &&
        ov.name !== 'customPriceLine' &&
        ov.id !== 'session_breaks_overlay' &&
        ov.name !== 'sessionBreaks'
    );

    // 2. Flatten the tree: each item gets a sequential index (highest = top of tree = drawn last = on top)
    const flatTreeList: { type: 'folder' | 'drawing' | 'candles', id: string, data: any }[] = [];
    // sortedRootItems is ordered from top of tree (highest order) to bottom.
    // We need to iterate in reverse so that items at the TOP get a HIGHER sequential order.
    const reversedRootItems = [...sortedRootItems].reverse();
    reversedRootItems.forEach(item => {
      if (item.type === 'folder') {
        // Children first (underneath folder), then folder header
        const children = filtered.filter((d: any) => d.extendData?.folderId === item.id);
        // Sort children ascending by order so lowest order child goes first (underneath)
        children.sort((a: any, b: any) => (a.extendData?.order ?? 0) - (b.extendData?.order ?? 0));
        children.forEach((child: any) => {
          flatTreeList.push({ type: 'drawing', id: child.id, data: child });
        });
        flatTreeList.push(item);
      } else {
        flatTreeList.push(item);
      }
    });

    // 3. Assign sequential orders: first item in flatTreeList gets order 100, last gets highest
    const nextFolders = [...updatedFolders];
    const updatedOverlaysMap = new Map<string, { order: number, folderId: string | null }>();
    let candlesOrder = 500;

    flatTreeList.forEach((item, idx) => {
      const nextOrder = (idx + 1) * 100;
      if (item.type === 'folder') {
        const fIdx = nextFolders.findIndex(f => f.id === item.id);
        if (fIdx !== -1) {
          nextFolders[fIdx] = { ...nextFolders[fIdx], order: nextOrder };
        }
      } else if (item.type === 'candles') {
        candlesOrder = nextOrder;
      } else {
        const originalDrawing = filtered.find((d: any) => d.id === item.id);
        const folderId = originalDrawing?.extendData?.folderId || null;
        updatedOverlaysMap.set(item.id, { order: nextOrder, folderId });
      }
    });

    // Update candles order on chart
    activeChart._candlesOrder = candlesOrder;

    // 4. Map and update overlays in useDrawingStore & drawingRepository
    if (activeSymbol) {
      const symbolKey = activeSymbol.toUpperCase();
      const storeDrawings = useDrawingStore.getState().drawingsBySymbol[symbolKey] || [];
      const nextStoreDrawings = storeDrawings.map((d) => {
        const info = updatedOverlaysMap.get(d.id);
        if (info) {
          return {
            ...d,
            extendData: {
              ...(d.extendData || {}),
              order: info.order,
              folderId: info.folderId
            }
          };
        }
        return d;
      });
      useDrawingStore.setState((state) => ({
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [symbolKey]: nextStoreDrawings,
        },
      }));
      drawingRepository.saveDrawings(symbolKey, nextStoreDrawings);
    }

    // 5. Update live chart overlays directly without removing/recreating
    filtered.forEach((ov: any) => {
      const info = updatedOverlaysMap.get(ov.id);
      if (info) {
        try {
          activeChart.overrideOverlay({
            id: ov.id,
            extendData: {
              ...(ov.extendData || {}),
              folderId: info.folderId,
              order: info.order
            }
          });
        } catch (_) {}
      }
    });

    // 6. Save and update react states
    setFolders(nextFolders);
    localStorage.setItem(`fx_folders_${activeSymbol}`, JSON.stringify(nextFolders));
    syncAllDrawings();
    setDrawingTrigger(prev => prev + 1);
  };

  // Synchronize and unify order values across folders and drawings on a single scale.
  // IMPORTANT: Must NOT remove+recreate overlays here — that breaks in-progress drawings
  // and strips event handlers. Use overrideOverlay for normalization-only resets.
  useEffect(() => {
    if (!activeChart) return;
    
    const overlays = activeChart.getOverlays();
    const filtered = overlays.filter(
      (ov: any) =>
        !ov.id?.startsWith('sync_') &&
        ov.id !== 'custom_price_line_overlay' &&
        ov.name !== 'customPriceLine' &&
        ov.id !== 'session_breaks_overlay' &&
        ov.name !== 'sessionBreaks'
    );

    // Guard: if any overlay has null/undefined points it's mid-draw — don't touch anything
    const hasInProgressDrawing = filtered.some((d: any) => 
      !d.points || d.points.length === 0 || d.points.some((p: any) => p === null || p === undefined)
    );
    if (hasInProgressDrawing) return;

    // Check if normalization is needed
    const needsNormalization = folders.some(f => (f.order ?? 0) > 50000 || (f.order ?? 0) === 0) || 
                               filtered.some((d: any) => !d.extendData || d.extendData.order === undefined);

    if (!needsNormalization) return;

    // Normalization: assign stable order values WITHOUT removing/recreating overlays.
    // This preserves event handlers, active drawing states, and sync copies.
    const sortedFolders = [...folders].sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
    const sortedDrawings = [...filtered].sort((a, b) => {
      // Treat new drawings (undefined order) as Infinity so they sort to the top
      const orderA = a.extendData?.order ?? Infinity;
      const orderB = b.extendData?.order ?? Infinity;
      if (orderA !== orderB) return orderB - orderA;
      return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true, sensitivity: 'base' });
    });

    const rootDrawings = sortedDrawings.filter((d: any) => !d.extendData?.folderId);
    const currentCandlesOrder = activeChart._candlesOrder ?? 500;

    const combinedRoot = [
      ...sortedFolders.map(f => ({ type: 'folder' as const, id: f.id, order: f.order ?? 0, data: f })),
      ...rootDrawings.map((d: any) => ({ type: 'drawing' as const, id: d.id, order: d.extendData?.order ?? 0, data: d })),
      { type: 'candles' as const, id: 'candles', order: currentCandlesOrder, data: null }
    ];

    combinedRoot.sort((a, b) => {
      if (a.order !== b.order) return b.order - a.order;
      return b.id.localeCompare(a.id, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Flatten: combinedRoot is descending (index 0 = top). We iterate reversed to build 
    // ascending order values (first item = bottom = lowest order = created first = underneath).
    const flatList: { type: string, id: string }[] = [];
    [...combinedRoot].reverse().forEach(item => {
      if (item.type === 'folder') {
        const children = sortedDrawings.filter((d: any) => d.extendData?.folderId === item.id);
        children.sort((a: any, b: any) => (a.extendData?.order ?? 0) - (b.extendData?.order ?? 0));
        children.forEach(child => flatList.push({ type: 'drawing', id: child.id }));
        flatList.push({ type: 'folder', id: item.id });
      } else {
        flatList.push({ type: item.type, id: item.id });
      }
    });

    // Assign orders and update via overrideOverlay (NO remove+recreate)
    const nextFolders = [...folders];
    let newCandlesOrder = currentCandlesOrder;

    flatList.forEach((item, idx) => {
      const nextOrder = (idx + 1) * 100;
      if (item.type === 'folder') {
        const fIdx = nextFolders.findIndex(f => f.id === item.id);
        if (fIdx !== -1) {
          nextFolders[fIdx] = { ...nextFolders[fIdx], order: nextOrder };
        }
      } else if (item.type === 'candles') {
        newCandlesOrder = nextOrder;
      } else {
        // Use overrideOverlay to update order without destroying the overlay
        const existingOverlay = filtered.find((ov: any) => ov.id === item.id);
        if (existingOverlay) {
          activeChart.overrideOverlay({
            id: item.id,
            extendData: {
              ...existingOverlay.extendData,
              order: nextOrder
            }
          });
        }
      }
    });

    activeChart._candlesOrder = newCandlesOrder;
    setFolders(nextFolders);
    localStorage.setItem(`fx_folders_${activeSymbol}`, JSON.stringify(nextFolders));
  }, [activeChart, folders, drawings, activeSymbol]);

  // Read drawings from chart
  useEffect(() => {
    if (!activeChart) {
      setDrawings([]);
      return;
    }
    const overlays = activeChart.getOverlays();
    const filtered = overlays.filter(
      (ov: any) =>
        !ov.id?.startsWith('sync_') &&
        ov.id !== 'custom_price_line_overlay' &&
        ov.name !== 'customPriceLine' &&
        ov.id !== 'session_breaks_overlay' &&
        ov.name !== 'sessionBreaks'
    );
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
    const maxOrder = Math.max(
      0,
      ...folders.map(f => f.order ?? 0),
      ...drawings.map(d => d.extendData?.order ?? 0)
    );
    const newFolder: FolderItem = {
      id: `folder_${Date.now()}`,
      name: `Folder ${folders.length + 1}`,
      isCollapsed: false,
      isLocked: false,
      isVisible: true,
      order: maxOrder + 10,
    };
    const nextFolders = [...folders, newFolder];
    setFolders(nextFolders);
    if (activeSymbol) {
      localStorage.setItem(`fx_folders_${activeSymbol}`, JSON.stringify(nextFolders));
    }

    // If there are selected drawings, immediately move them to this folder in store & IndexedDB
    if (selectedOverlayIds.length > 0) {
      if (activeSymbol) {
        const symbolKey = activeSymbol.toUpperCase();
        const storeDrawings = useDrawingStore.getState().drawingsBySymbol[symbolKey] || [];
        const nextStoreDrawings = storeDrawings.map((d) => {
          if (selectedOverlayIds.includes(d.id)) {
            return {
              ...d,
              extendData: {
                ...(d.extendData || {}),
                folderId: newFolder.id,
              },
            };
          }
          return d;
        });
        useDrawingStore.setState((state) => ({
          drawingsBySymbol: {
            ...state.drawingsBySymbol,
            [symbolKey]: nextStoreDrawings,
          },
        }));
        drawingRepository.saveDrawings(symbolKey, nextStoreDrawings);
      }

      if (activeChart) {
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
      }
      syncAllDrawings();
      setDrawingTrigger(prev => prev + 1);
    }
  };

  // Delete a folder
  const handleDeleteFolder = (folderId: string) => {
    // Remove folder
    setFolders(prev => prev.filter(f => f.id !== folderId));

    // Remove folderId reference from child drawings in store
    if (activeSymbol) {
      const drawings = useDrawingStore.getState().getSymbolDrawings(activeSymbol);
      drawings.forEach((d) => {
        if (d.extendData?.folderId === folderId) {
          useDrawingStore.getState().updateSymbolDrawing(activeSymbol, d.id, {
            extendData: {
              ...(d.extendData || {}),
              folderId: null,
            },
          });
        }
      });
    }
  };

  // Toggle folder visible status
  const handleToggleFolderVisible = (folderId: string, currentVisible: boolean) => {
    const nextVisible = !currentVisible;
    setFolders(prev =>
      prev.map(f => (f.id === folderId ? { ...f, isVisible: nextVisible } : f))
    );

    if (activeSymbol) {
      const symbolKey = activeSymbol.toUpperCase();
      const drawings = useDrawingStore.getState().getSymbolDrawings(symbolKey);
      const updatedList = drawings.map((d) => {
        if (d.extendData?.folderId === folderId) {
          return { ...d, visible: nextVisible };
        }
        return d;
      });
      useDrawingStore.setState((state) => ({
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [symbolKey]: updatedList,
        },
      }));
      drawingRepository.saveDrawings(symbolKey, updatedList);
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
    setFolders(prev =>
      prev.map(f => (f.id === folderId ? { ...f, isLocked: nextLocked } : f))
    );

    if (activeSymbol) {
      const symbolKey = activeSymbol.toUpperCase();
      const drawings = useDrawingStore.getState().getSymbolDrawings(symbolKey);
      const updatedList = drawings.map((d) => {
        if (d.extendData?.folderId === folderId) {
          return { ...d, lock: nextLocked };
        }
        return d;
      });
      useDrawingStore.setState((state) => ({
        drawingsBySymbol: {
          ...state.drawingsBySymbol,
          [symbolKey]: updatedList,
        },
      }));
      drawingRepository.saveDrawings(symbolKey, updatedList);
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
    if (!activeChart) return;

    const overlays = activeChart.getOverlays();
    const filtered = overlays.filter(
      (ov: any) =>
        !ov.id?.startsWith('sync_') &&
        ov.id !== 'custom_price_line_overlay' &&
        ov.name !== 'customPriceLine' &&
        ov.id !== 'session_breaks_overlay' &&
        ov.name !== 'sessionBreaks'
    );

    const rootDrawings = filtered.filter((d: any) => !d.extendData?.folderId);
    const candlesOrder = activeChart._candlesOrder ?? 500;

    const combinedRoot = [
      ...folders.map(f => ({ type: 'folder' as const, id: f.id, order: f.order ?? 0, data: f })),
      ...rootDrawings.map((d: any) => ({ type: 'drawing' as const, id: d.id, order: d.extendData?.order ?? 0, data: d })),
      { type: 'candles' as const, id: 'candles', order: candlesOrder, data: null }
    ];

    combinedRoot.sort((a, b) => (b.order ?? 0) - (a.order ?? 0));

    const draggedIndex = combinedRoot.findIndex(item => item.id === draggedId && item.type === draggedType);
    const targetIndex = combinedRoot.findIndex(item => item.id === targetId && item.type === targetType);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

    const reordered = [...combinedRoot];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    let newTargetIndex = reordered.findIndex(item => item.id === targetId && item.type === targetType);
    if (position === 'below') newTargetIndex += 1;
    reordered.splice(newTargetIndex, 0, draggedItem);

    // Delegate all order calculation and overlay recreation to recalculateAndRecreateOverlays.
    // reordered is sorted descending (index 0 = top of tree), which matches what that function expects.
    recalculateAndRecreateOverlays(folders, reordered);
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
    
    try {
      if (dragType === 'drawing' && dragId && activeChart) {
        const overlays = activeChart.getOverlays();
        const filtered = overlays.filter(
          (ov: any) =>
            !ov.id?.startsWith('sync_') &&
            ov.id !== 'custom_price_line_overlay' &&
            ov.name !== 'customPriceLine' &&
            ov.id !== 'session_breaks_overlay' &&
            ov.name !== 'sessionBreaks'
        );

        // Filter other drawings in this folder to find max order
        const folderChildren = filtered.filter((ov: any) => ov.extendData?.folderId === targetFolderId && ov.id !== dragId);
        const maxChildOrder = folderChildren.length > 0 
          ? Math.max(...folderChildren.map((ov: any) => ov.extendData?.order ?? 0))
          : 0;

        const folder = folders.find(f => f.id === targetFolderId);
        const nextOrder = folderChildren.length > 0 ? maxChildOrder + 1 : 100;
        const nextVisible = folder ? folder.isVisible : true;
        const nextLock = folder ? folder.isLocked : false;

        // Update in useDrawingStore & drawingRepository
        if (activeSymbol) {
          const symbolKey = activeSymbol.toUpperCase();
          const storeDrawings = useDrawingStore.getState().drawingsBySymbol[symbolKey] || [];
          const nextStoreDrawings = storeDrawings.map((d) => {
            if (d.id === dragId) {
              return {
                ...d,
                visible: nextVisible,
                lock: nextLock,
                extendData: {
                  ...(d.extendData || {}),
                  folderId: targetFolderId,
                  order: nextOrder
                }
              };
            }
            return d;
          });
          useDrawingStore.setState((state) => ({
            drawingsBySymbol: {
              ...state.drawingsBySymbol,
              [symbolKey]: nextStoreDrawings,
            },
          }));
          drawingRepository.saveDrawings(symbolKey, nextStoreDrawings);
        }

        // Update activeChart overlay
        const draggedOv = filtered.find((ov: any) => ov.id === dragId);
        if (draggedOv) {
          activeChart.overrideOverlay({
            id: dragId,
            visible: nextVisible,
            lock: nextLock,
            extendData: {
              ...(draggedOv.extendData || {}),
              folderId: targetFolderId,
              order: nextOrder
            }
          });
        }

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
    
    if (!activeChart) return;
    
    try {
      if (dragType === 'drawing' && dragId) {
        const overlays = activeChart.getOverlays();
        const filtered = overlays.filter(
          (ov: any) =>
            !ov.id?.startsWith('sync_') &&
            ov.id !== 'custom_price_line_overlay' &&
            ov.name !== 'customPriceLine' &&
            ov.id !== 'session_breaks_overlay' &&
            ov.name !== 'sessionBreaks'
        );

        // Sort in current order
        filtered.sort((a: any, b: any) => {
          const orderA = a.extendData?.order ?? 0;
          const orderB = b.extendData?.order ?? 0;
          if (orderA !== orderB) {
            return orderB - orderA;
          }
          return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true, sensitivity: 'base' });
        });

        const draggedIndex = filtered.findIndex((ov: any) => ov.id === dragId);
        if (draggedIndex !== -1) {
          const reordered = [...filtered];
          const [draggedItem] = reordered.splice(draggedIndex, 1);

          // Append to the end of the list (bottom of the Object Tree)
          reordered.push(draggedItem);

          const updatedOverlaysMap = new Map<string, { order: number, folderId: string | null }>();
          reordered.forEach((ov: any, idx: number) => {
            const nextOrder = (reordered.length - idx) * 100;
            const folderId = ov.id === dragId ? null : (ov.extendData?.folderId ?? null);
            updatedOverlaysMap.set(ov.id, { order: nextOrder, folderId });
          });

          // Update useDrawingStore & drawingRepository
          if (activeSymbol) {
            const symbolKey = activeSymbol.toUpperCase();
            const storeDrawings = useDrawingStore.getState().drawingsBySymbol[symbolKey] || [];
            const nextStoreDrawings = storeDrawings.map((d) => {
              const info = updatedOverlaysMap.get(d.id);
              if (info) {
                return {
                  ...d,
                  extendData: {
                    ...(d.extendData || {}),
                    order: info.order,
                    folderId: info.folderId
                  }
                };
              }
              return d;
            });
            useDrawingStore.setState((state) => ({
              drawingsBySymbol: {
                ...state.drawingsBySymbol,
                [symbolKey]: nextStoreDrawings,
              },
            }));
            drawingRepository.saveDrawings(symbolKey, nextStoreDrawings);
          }

          // Override activeChart overlays
          reordered.forEach((ov: any) => {
            const info = updatedOverlaysMap.get(ov.id);
            if (info) {
              activeChart.overrideOverlay({
                id: ov.id,
                extendData: {
                  ...(ov.extendData || {}),
                  folderId: info.folderId,
                  order: info.order
                }
              });
            }
          });

          syncAllDrawings();
          setDrawingTrigger(prev => prev + 1);
        }
      } else if ((dragType === 'folder' || dragType === 'candles') && dragId) {
        const overlays = activeChart.getOverlays();
        const filtered = overlays.filter(
          (ov: any) =>
            !ov.id?.startsWith('sync_') &&
            ov.id !== 'custom_price_line_overlay' &&
            ov.name !== 'customPriceLine' &&
            ov.id !== 'session_breaks_overlay' &&
            ov.name !== 'sessionBreaks'
        );

        const rootDrawings = filtered.filter((d: any) => !d.extendData?.folderId);
        const currentCandlesOrder = activeChart._candlesOrder ?? 500;

        const combinedRoot = [
          ...folders.map(f => ({ type: 'folder' as const, id: f.id, order: f.order ?? 0, data: f })),
          ...rootDrawings.map((d: any) => ({ type: 'drawing' as const, id: d.id, order: d.extendData?.order ?? 0, data: d })),
          { type: 'candles' as const, id: 'candles', order: currentCandlesOrder, data: null }
        ];

        combinedRoot.sort((a, b) => {
          if (a.order !== b.order) return b.order - a.order;
          return b.id.localeCompare(a.id, undefined, { numeric: true, sensitivity: 'base' });
        });

        const draggedIndex = combinedRoot.findIndex(item => item.id === dragId && item.type === dragType);
        if (draggedIndex !== -1) {
          const reordered = [...combinedRoot];
          const [draggedItem] = reordered.splice(draggedIndex, 1);
          reordered.push(draggedItem);

          // Delegate folder/candles reorder to the single source of truth
          recalculateAndRecreateOverlays(folders, reordered);
        }
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
    
    try {
      if (dragType === 'drawing' && dragId && dragId !== targetId && activeChart) {
        const overlays = activeChart.getOverlays();
        const filtered = overlays.filter(
          (ov: any) =>
            !ov.id?.startsWith('sync_') &&
            ov.id !== 'custom_price_line_overlay' &&
            ov.name !== 'customPriceLine' &&
            ov.id !== 'session_breaks_overlay' &&
            ov.name !== 'sessionBreaks'
        );

        // Sort in current render order (descending by order property, fallback to ID)
        filtered.sort((a: any, b: any) => {
          const orderA = a.extendData?.order ?? 0;
          const orderB = b.extendData?.order ?? 0;
          if (orderA !== orderB) {
            return orderB - orderA;
          }
          return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true, sensitivity: 'base' });
        });

        const draggedIndex = filtered.findIndex((ov: any) => ov.id === dragId);
        if (draggedIndex === -1) return;

        const reordered = [...filtered];
        const [draggedItem] = reordered.splice(draggedIndex, 1);

        // Find new insert index
        const targetIndex = reordered.findIndex((ov: any) => ov.id === targetId);
        if (targetIndex === -1) return;

        let newTargetIndex = targetIndex;
        if (dropPosition === 'below') {
          newTargetIndex += 1;
        }

        reordered.splice(newTargetIndex, 0, draggedItem);

        // Determine folder inheritance from the target overlay
        const targetOverlay = filtered.find((ov: any) => ov.id === targetId);
        const targetFolderId = targetOverlay?.extendData?.folderId || null;

        const updatedOverlaysMap = new Map<string, { order: number, folderId: string | null }>();
        reordered.forEach((ov: any, idx: number) => {
          const nextOrder = (reordered.length - idx) * 100;
          const isDraggedItem = (ov.id === dragId);
          const folderId = isDraggedItem ? targetFolderId : (ov.extendData?.folderId ?? null);
          updatedOverlaysMap.set(ov.id, { order: nextOrder, folderId });
        });

        // Update useDrawingStore & drawingRepository
        if (activeSymbol) {
          const symbolKey = activeSymbol.toUpperCase();
          const storeDrawings = useDrawingStore.getState().drawingsBySymbol[symbolKey] || [];
          const nextStoreDrawings = storeDrawings.map((d) => {
            const info = updatedOverlaysMap.get(d.id);
            if (info) {
              return {
                ...d,
                extendData: {
                  ...(d.extendData || {}),
                  order: info.order,
                  folderId: info.folderId
                }
              };
            }
            return d;
          });
          useDrawingStore.setState((state) => ({
            drawingsBySymbol: {
              ...state.drawingsBySymbol,
              [symbolKey]: nextStoreDrawings,
            },
          }));
          drawingRepository.saveDrawings(symbolKey, nextStoreDrawings);
        }

        // Override activeChart overlays
        reordered.forEach((ov: any) => {
          const info = updatedOverlaysMap.get(ov.id);
          if (info) {
            activeChart.overrideOverlay({
              id: ov.id,
              extendData: {
                ...(ov.extendData || {}),
                folderId: info.folderId,
                order: info.order
              }
            });
          }
        });

        syncAllDrawings();
        setDrawingTrigger(prev => prev + 1);
      } else if ((dragType === 'folder' || dragType === 'candles') && dragId) {
        // Reorder folder/candles relative to drawing if target drawing is at root level
        const targetOverlay = drawings.find(d => d.id === targetId);
        if (targetOverlay && !targetOverlay.extendData?.folderId) {
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
      const nextFolders = folders.map(f => (f.id === id ? { ...f, name: newName } : f));
      setFolders(nextFolders);
      if (activeSymbol) {
        localStorage.setItem(`fx_folders_${activeSymbol}`, JSON.stringify(nextFolders));
      }
    } else {
      if (activeSymbol) {
        const symbolKey = activeSymbol.toUpperCase();
        const storeDrawings = useDrawingStore.getState().drawingsBySymbol[symbolKey] || [];
        const nextStoreDrawings = storeDrawings.map((d) => {
          if (d.id === id) {
            return {
              ...d,
              extendData: {
                ...(d.extendData || {}),
                customName: newName,
              }
            };
          }
          return d;
        });
        useDrawingStore.setState((state) => ({
          drawingsBySymbol: {
            ...state.drawingsBySymbol,
            [symbolKey]: nextStoreDrawings,
          },
        }));
        drawingRepository.saveDrawings(symbolKey, nextStoreDrawings);
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

    const nextStoreDrawings = storeDrawings.map((d) => {
      if (selectedOverlayIds.includes(d.id)) {
        return {
          ...d,
          lock: targetLock,
        };
      }
      return d;
    });
    useDrawingStore.setState((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [symbolKey]: nextStoreDrawings,
      },
    }));
    drawingRepository.saveDrawings(symbolKey, nextStoreDrawings);

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

    const nextStoreDrawings = storeDrawings.map((d) => {
      if (selectedOverlayIds.includes(d.id)) {
        return {
          ...d,
          visible: targetVisible,
        };
      }
      return d;
    });
    useDrawingStore.setState((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [symbolKey]: nextStoreDrawings,
      },
    }));
    drawingRepository.saveDrawings(symbolKey, nextStoreDrawings);

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
    selectedOverlayIds.forEach(id => {
      const originalId = getOriginalDrawingId(id);
      useDrawingStore.getState().removeSymbolDrawing(activeSymbol, originalId);
    });
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

    // 2. Check TEXT_TOOLS
    const textTool = TEXT_TOOLS.find((t) => t.id === toolName);
    if (textTool && textTool.icon) {
      const ToolIcon = textTool.icon;
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

    // Check TEXT_TOOLS
    const textTool = TEXT_TOOLS.find((t) => t.id === toolName);
    if (textTool && textTool.name) {
      return textTool.name;
    }

    // Fallback capitalize first letter
    if (!toolName) return 'Drawing';
    return toolName.charAt(0).toUpperCase() + toolName.slice(1);
  };

  // Group drawings by folder
  const groupedDrawings = React.useMemo(() => {
    const result: Record<string, any[]> = {};
    folders.forEach(f => {
      result[f.id] = [];
    });
    result['root'] = [];

    drawings.forEach(d => {
      const fId = d.extendData?.folderId;
      if (fId && result[fId]) {
        result[fId].push(d);
      } else {
        result['root'].push(d);
      }
    });
    return result;
  }, [drawings, folders]);

  // Combined root-level items (folders, loose drawings, and candles) sorted by order descending
  const rootItems = React.useMemo(() => {
    const candlesOrder = activeChart ? (activeChart._candlesOrder ?? 500) : 500;
    const candlesVisible = activeChart ? (activeChart._showCandles !== false) : true;

    const items = [
      ...folders.map(f => ({ type: 'folder' as const, id: f.id, order: f.order ?? 0, data: f })),
      ...(groupedDrawings['root'] || []).map(d => ({ type: 'drawing' as const, id: d.id, order: d.extendData?.order ?? 0, data: d })),
      { type: 'candles' as const, id: 'candles', order: candlesOrder, data: { name: 'Main Series', isVisible: candlesVisible } }
    ];
    items.sort((a, b) => {
      if (a.order !== b.order) return b.order - a.order;
      return b.id.localeCompare(a.id, undefined, { numeric: true, sensitivity: 'base' });
    });
    return items;
  }, [folders, groupedDrawings, activeChart, drawingTrigger]);

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
          
          {/* ── Toolbar buttons matching sidebar theme ── */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-sub bg-surface">
            <div className="flex items-center gap-1">
              
              {/* Create Group */}
              <button
                type="button"
                disabled={selectedOverlayIds.length === 0}
                onClick={handleGroupSelected}
                title="Create a group of drawings"
                className="w-7 h-7 flex items-center justify-center rounded-md border border-transparent text-txt-secondary hover:text-txt-primary hover:bg-surface-hover disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-txt-secondary disabled:cursor-not-allowed transition-all select-none"
              >
                <FolderPlus className="w-4 h-4 text-current" />
              </button>

              {/* Toggle Lock selected */}
              <button
                type="button"
                disabled={selectedOverlayIds.length === 0}
                onClick={handleLockSelected}
                title="Toggle Lock selected"
                className="w-7 h-7 flex items-center justify-center rounded-md border border-transparent text-txt-secondary hover:text-txt-primary hover:bg-surface-hover disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-txt-secondary disabled:cursor-not-allowed transition-all select-none"
              >
                <Lock className="w-4 h-4 text-current" />
              </button>

              {/* Toggle Hide selected */}
              <button
                type="button"
                disabled={selectedOverlayIds.length === 0}
                onClick={handleHideSelected}
                title="Toggle Hide/Show selected"
                className="w-7 h-7 flex items-center justify-center rounded-md border border-transparent text-txt-secondary hover:text-txt-primary hover:bg-surface-hover disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-txt-secondary disabled:cursor-not-allowed transition-all select-none"
              >
                <Eye className="w-4 h-4 text-current" />
              </button>

              {/* Delete selected */}
              <button
                type="button"
                disabled={selectedOverlayIds.length === 0}
                onClick={handleDeleteSelected}
                title="Delete selected"
                className="w-7 h-7 flex items-center justify-center rounded-md border border-transparent text-txt-secondary hover:text-status-error hover:bg-status-error/10 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-txt-secondary disabled:cursor-not-allowed transition-all select-none"
              >
                <DeleteIcon className="w-4 h-4 text-current" />
              </button>

            </div>
          </div>

          {/* ── Tree Object List ── */}
          <div
            className="flex-1 overflow-y-auto px-1 py-1.5 space-y-1 scrollbar-thin scrollbar-thumb-border-def"
            onDragOver={handleDragOver}
            onDrop={handleDropOnRoot}
          >
            {/* Intermixed Folders, Drawings & Candles */}
            {rootItems.map(item => {
              if (item.type === 'folder') {
                const folder = item.data;
                const childDrawings = groupedDrawings[folder.id] || [];
                const isSelected = childDrawings.length > 0 && childDrawings.every(d => selectedOverlayIds.includes(d.id));

                return (
                  <div
                    key={folder.id}
                    className="flex flex-col border border-transparent rounded-lg"
                  >
                    {/* Folder Item Header */}
                    <div
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                      onDragLeave={handleDragLeaveFolder}
                      onDrop={(e) => handleDropOnFolder(e, folder.id)}
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
                      className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-accent-muted border-accent/30 text-txt-primary'
                          : activeChart?._activeFolderId === folder.id
                          ? 'bg-status-success/10 border-status-success/30 text-txt-primary'
                          : dragOverFolderId === folder.id
                          ? 'bg-accent-muted border-accent/50 text-txt-primary'
                          : 'border-transparent hover:bg-surface-hover text-txt-secondary'
                      }`}
                    >
                      {/* Colored divider line representing the drop position for folder reordering */}
                      {dragOverItemId === folder.id && (
                        <div
                          className={`absolute left-0 right-0 h-0.5 bg-accent z-50 pointer-events-none ${
                            dragOverPosition === 'above' ? '-top-[1.5px]' : '-bottom-[1.5px]'
                          }`}
                        />
                      )}

                      <div className={`flex items-center gap-2 min-w-0 ${isDragging ? 'pointer-events-none' : ''}`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolders(prev =>
                              prev.map(f => (f.id === folder.id ? { ...f, isCollapsed: !f.isCollapsed } : f))
                            );
                          }}
                          className="p-0.5 rounded hover:bg-surface-hover text-txt-muted hover:text-txt-primary"
                        >
                          {folder.isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <span className="text-accent flex-shrink-0">
                          {folder.isCollapsed ? <Folder className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
                        </span>

                        {activeChart?._activeFolderId === folder.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse flex-shrink-0" title="Active folder for new drawings" />
                        )}

                        {renamingId === folder.id ? (
                          <input
                            ref={renameInputRef}
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleFinishRename(folder.id, true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleFinishRename(folder.id, true);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-app-bg border border-accent rounded px-1.5 py-0.5 text-xs text-txt-primary outline-none w-28 font-normal"
                          />
                        ) : (
                          <span
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(folder.id, folder.name);
                            }}
                            className="truncate text-xs font-semibold"
                          >
                            {folder.name}
                          </span>
                        )}

                        {childDrawings.length > 0 && (
                          <span className="text-[10px] text-txt-muted font-bold bg-surface-elevated/60 px-1.5 py-0.5 rounded-full border border-border-sub">
                            {childDrawings.length}
                          </span>
                        )}
                      </div>

                      {/* Action buttons on hover */}
                      <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isDragging ? 'pointer-events-none' : ''}`}>
                        
                        {/* Rename folder */}
                        <button
                          type="button"
                          title="Rename folder"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(folder.id, folder.name);
                          }}
                          className="p-1 rounded text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>

                        {/* Lock folder */}
                        <button
                          type="button"
                          title={folder.isLocked ? "Unlock folder" : "Lock folder"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFolderLock(folder.id, folder.isLocked);
                          }}
                          className={`p-1 rounded transition-colors ${
                            folder.isLocked
                              ? 'text-accent hover:text-accent/80 bg-accent-muted'
                              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                          }`}
                        >
                          {folder.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>

                        {/* Toggle visible */}
                        <button
                          type="button"
                          title={folder.isVisible ? "Hide folder" : "Show folder"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFolderVisible(folder.id, folder.isVisible);
                          }}
                          className={`p-1 rounded transition-colors ${
                            !folder.isVisible
                              ? 'text-yellow-450 hover:text-yellow-350 bg-yellow-500/10'
                              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                          }`}
                        >
                          {folder.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        {/* Delete folder */}
                        <button
                          type="button"
                          title="Delete folder and drawings"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                          className="p-1 rounded text-txt-muted hover:text-status-error hover:bg-status-error/10 transition-colors"
                        >
                          <DeleteIcon className="w-3.5 h-3.5 text-current" />
                        </button>

                      </div>
                    </div>

                    {/* Child Drawings List */}
                    {!folder.isCollapsed && (
                      <div
                        className="pl-6 pr-1 py-0.5 space-y-0.5 border-l border-border-sub ml-4 mt-0.5"
                        onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                        onDragLeave={handleDragLeaveFolder}
                        onDrop={(e) => handleDropOnFolder(e, folder.id)}
                      >
                        {childDrawings.length === 0 ? (
                          <div className="text-[10px] text-txt-muted italic py-1 pl-2">Empty folder</div>
                        ) : (
                          childDrawings.map(d => {
                            const isSelected = selectedOverlayIds.includes(d.id);
                            const isLocked = d.lock || false;
                            const isVisible = d.visible !== false;
                            const isHovered = d.extendData?.isHovered || false;
                            const isDragOverThis = dragOverItemId === d.id;

                            return (
                              <div
                                key={d.id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, d.id, 'drawing')}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOverItem(e, d.id)}
                                onDragLeave={handleDragLeaveItem}
                                onDrop={(e) => handleDropOnItem(e, d.id)}
                                onClick={(e) => handleItemSelect(e, d.id)}
                                onMouseEnter={() => handleMouseEnterItem(d.id)}
                                onMouseLeave={() => handleMouseLeaveItem(d.id)}
                                className={`group relative flex items-center justify-between px-2 py-1 border rounded-md cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-accent-muted border-accent/30 text-txt-primary'
                                    : isHovered
                                    ? 'bg-surface-elevated border-border-def text-txt-primary'
                                    : 'border-transparent hover:bg-surface-hover text-txt-secondary'
                                }`}
                              >
                                {/* Colored divider line representing the drop position */}
                                {isDragOverThis && (
                                  <div
                                    className={`absolute left-0 right-0 h-0.5 bg-accent z-50 pointer-events-none ${
                                      dragOverPosition === 'above' ? '-top-[1.5px]' : '-bottom-[1.5px]'
                                    }`}
                                  />
                                )}
                                
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="flex-shrink-0">
                                    {getDrawingIcon(d.name)}
                                  </span>
                                  
                                  {renamingId === d.id ? (
                                    <input
                                      ref={renameInputRef}
                                      type="text"
                                      value={renameValue}
                                      onChange={(e) => setRenameValue(e.target.value)}
                                      onBlur={() => handleFinishRename(d.id, false)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleFinishRename(d.id, false);
                                        if (e.key === 'Escape') setRenamingId(null);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="bg-app-bg border border-accent rounded px-1.5 py-0.5 text-xs text-txt-primary outline-none w-28 font-normal"
                                    />
                                  ) : (
                                    <span
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        handleStartRename(d.id, getDrawingLabel(d));
                                      }}
                                      className="truncate text-[11px]"
                                    >
                                      {getDrawingLabel(d)}
                                    </span>
                                  )}
                                </div>

                                {/* Drawing buttons on hover */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    title="Rename drawing"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartRename(d.id, getDrawingLabel(d));
                                    }}
                                    className="p-1 rounded text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    title={isLocked ? "Unlock drawing" : "Lock drawing"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleDrawingLock(d.id, isLocked);
                                    }}
                                    className={`p-1 rounded transition-colors ${
                                      isLocked
                                        ? 'text-accent hover:text-accent/80 bg-accent-muted'
                                        : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                                    }`}
                                  >
                                    {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                  </button>
                                  <button
                                    type="button"
                                    title={isVisible ? "Hide drawing" : "Show drawing"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleDrawingVisible(d.id, isVisible);
                                    }}
                                    className={`p-1 rounded transition-colors ${
                                      !isVisible
                                        ? 'text-yellow-450 hover:text-yellow-350 bg-yellow-500/10'
                                        : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                                    }`}
                                  >
                                    {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    title="Delete drawing"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteDrawing(d.id);
                                    }}
                                    className="p-1 rounded text-txt-muted hover:text-status-error hover:bg-status-error/10 transition-colors"
                                  >
                                    <DeleteIcon className="w-3.5 h-3.5 text-current" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
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
                const d = item.data;
                const isSelected = selectedOverlayIds.includes(d.id);
                const isLocked = d.lock || false;
                const isVisible = d.visible !== false;
                const isHovered = d.extendData?.isHovered || false;
                const isDragOverThis = dragOverItemId === d.id;

                return (
                  <div
                    key={d.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, d.id, 'drawing')}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOverItem(e, d.id)}
                    onDragLeave={handleDragLeaveItem}
                    onDrop={(e) => handleDropOnItem(e, d.id)}
                    onClick={(e) => handleItemSelect(e, d.id)}
                    onMouseEnter={() => handleMouseEnterItem(d.id)}
                    onMouseLeave={() => handleMouseLeaveItem(d.id)}
                    className={`group relative flex items-center justify-between px-2.5 py-1.5 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-accent-muted border-accent/30 text-txt-primary'
                        : isHovered
                        ? 'bg-surface-elevated border-border-def text-txt-primary'
                        : 'border-transparent hover:bg-surface-hover text-txt-secondary'
                    }`}
                  >
                    {/* Colored divider line representing the drop position */}
                    {isDragOverThis && (
                      <div
                        className={`absolute left-0 right-0 h-0.5 bg-accent z-50 pointer-events-none ${
                          dragOverPosition === 'above' ? '-top-[1.5px]' : '-bottom-[1.5px]'
                        }`}
                      />
                    )}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="flex-shrink-0">
                        {getDrawingIcon(d.name)}
                      </span>
                      
                      {renamingId === d.id ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleFinishRename(d.id, false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFinishRename(d.id, false);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-app-bg border border-accent rounded px-1.5 py-0.5 text-xs text-txt-primary outline-none w-28 font-normal"
                        />
                      ) : (
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(d.id, getDrawingLabel(d));
                          }}
                          className="truncate text-[11px]"
                        >
                          {getDrawingLabel(d)}
                        </span>
                      )}
                    </div>

                    {/* Action buttons on hover */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        title="Rename drawing"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(d.id, getDrawingLabel(d));
                        }}
                        className="p-1 rounded text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        title={isLocked ? "Unlock drawing" : "Lock drawing"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleDrawingLock(d.id, isLocked);
                        }}
                        className={`p-1 rounded transition-colors ${
                          isLocked
                            ? 'text-accent hover:text-accent/80 bg-accent-muted'
                            : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                        }`}
                      >
                        {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>
                      <button
                        type="button"
                        title={isVisible ? "Hide drawing" : "Show drawing"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleDrawingVisible(d.id, isVisible);
                        }}
                        className={`p-1 rounded transition-colors ${
                          !isVisible
                            ? 'text-yellow-450 hover:text-yellow-350 bg-yellow-500/10'
                            : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                        }`}
                      >
                        {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        title="Delete drawing"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDrawing(d.id);
                        }}
                        className="p-1 rounded text-txt-muted hover:text-status-error hover:bg-status-error/10 transition-colors"
                      >
                        <DeleteIcon className="w-3.5 h-3.5 text-current" />
                      </button>
                    </div>
                  </div>
                );
              }
            })}

            {drawings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-txt-muted px-6">
                <Layers className="w-8 h-8 text-txt-muted mb-2 opacity-50" />
                <p className="text-[11px] leading-relaxed">No drawings on the chart.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Data Window Tab Placeholder ── */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-txt-muted">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" className="text-txt-muted mb-2 opacity-50">
            <path stroke="currentColor" strokeWidth="2" d="M3 6h22M3 12h22M3 18h22" />
          </svg>
          <p className="text-[11px] leading-relaxed">Hover over a candle to view data window stats.</p>
        </div>
      )}
    </div>
  );
};
