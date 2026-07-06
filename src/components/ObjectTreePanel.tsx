import React, { useState, useEffect, useRef } from 'react';
import { Layers, Folder, FolderOpen, Eye, EyeOff, Lock, Unlock, Trash2, Plus, Edit2, ChevronDown, ChevronRight } from 'lucide-react';

interface ObjectTreePanelProps {
  chartInstancesRef: React.MutableRefObject<(any | null)[]>;
  activeChartIndex: number;
  selectedOverlayIds: string[];
  setSelectedOverlayIds: React.Dispatch<React.SetStateAction<string[]>>;
  syncAllDrawings: () => void;
  drawingTrigger: number;
  setDrawingTrigger: React.Dispatch<React.SetStateAction<number>>;
  activeSymbol: string;
  activeTimeframe: string;
}

interface FolderItem {
  id: string;
  name: string;
  isCollapsed: boolean;
  isLocked: boolean;
  isVisible: boolean;
}

export const ObjectTreePanel: React.FC<ObjectTreePanelProps> = ({
  chartInstancesRef,
  activeChartIndex,
  selectedOverlayIds,
  setSelectedOverlayIds,
  syncAllDrawings,
  drawingTrigger,
  setDrawingTrigger,
  activeSymbol,
  activeTimeframe,
}) => {
  const [activeTab, setActiveTab] = useState<'objectTree' | 'dataWindow'>('objectTree');
  const [folders, setFolders] = useState<FolderItem[]>(() => {
    try {
      const saved = localStorage.getItem(`fx_folders_${activeSymbol}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activeChart = chartInstancesRef.current[activeChartIndex];
  const [drawings, setDrawings] = useState<any[]>([]);

  // Persist folders
  useEffect(() => {
    localStorage.setItem(`fx_folders_${activeSymbol}`, JSON.stringify(folders));
  }, [folders, activeSymbol]);

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
    const newFolder: FolderItem = {
      id: `folder_${Date.now()}`,
      name: `Folder ${folders.length + 1}`,
      isCollapsed: false,
      isLocked: false,
      isVisible: true,
    };
    setFolders(prev => [...prev, newFolder]);

    // If there are selected drawings, immediately move them to this folder
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
    // Remove folder
    setFolders(prev => prev.filter(f => f.id !== folderId));

    // Remove folderId reference from child drawings
    if (activeChart) {
      const overlays = activeChart.getOverlays();
      overlays.forEach((ov: any) => {
        if (ov.extendData?.folderId === folderId) {
          activeChart.overrideOverlay({
            id: ov.id,
            extendData: {
              ...ov.extendData,
              folderId: null,
            },
          });
        }
      });
      syncAllDrawings();
      setDrawingTrigger(prev => prev + 1);
    }
  };

  // Toggle folder visible status
  const handleToggleFolderVisible = (folderId: string, currentVisible: boolean) => {
    setFolders(prev =>
      prev.map(f => (f.id === folderId ? { ...f, isVisible: !currentVisible } : f))
    );

    if (activeChart) {
      const nextVisible = !currentVisible;
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
    setFolders(prev =>
      prev.map(f => (f.id === folderId ? { ...f, isLocked: !currentLocked } : f))
    );

    if (activeChart) {
      const nextLocked = !currentLocked;
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string, type: 'drawing' | 'folder') => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id, type }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnFolder = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'drawing' && activeChart) {
        const overlay = activeChart.getOverlays().find((o: any) => o.id === data.id);
        if (overlay) {
          activeChart.overrideOverlay({
            id: data.id,
            extendData: {
              ...overlay.extendData,
              folderId: targetFolderId,
            },
          });

          // Match visibility/lock of the folder if folder is locked or hidden
          const folder = folders.find(f => f.id === targetFolderId);
          if (folder) {
            activeChart.overrideOverlay({
              id: data.id,
              visible: folder.isVisible,
              lock: folder.isLocked,
              styles: {
                point: folder.isLocked ? {
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

          syncAllDrawings();
          setDrawingTrigger(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'drawing' && activeChart) {
        const overlay = activeChart.getOverlays().find((o: any) => o.id === data.id);
        if (overlay && overlay.extendData?.folderId) {
          activeChart.overrideOverlay({
            id: data.id,
            extendData: {
              ...overlay.extendData,
              folderId: null,
            },
          });
          syncAllDrawings();
          setDrawingTrigger(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle drawing visibility
  const handleToggleDrawingVisible = (id: string, currentVisible: boolean) => {
    if (activeChart) {
      const nextVisible = !currentVisible;
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
    if (activeChart) {
      const nextLocked = !currentLocked;
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
    if (activeChart) {
      activeChart.removeOverlay({ id });
      setSelectedOverlayIds(prev => prev.filter(item => item !== id));
      syncAllDrawings();
      setDrawingTrigger(prev => prev + 1);
    }
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

    if (isFolder) {
      setFolders(prev =>
        prev.map(f => (f.id === id ? { ...f, name: renameValue.trim() } : f))
      );
    } else {
      if (activeChart) {
        const overlay = activeChart.getOverlays().find((o: any) => o.id === id);
        if (overlay) {
          activeChart.overrideOverlay({
            id,
            extendData: {
              ...overlay.extendData,
              customName: renameValue.trim(),
            },
          });
          syncAllDrawings();
          setDrawingTrigger(prev => prev + 1);
        }
      }
    }
    setRenamingId(null);
  };

  // Group selection actions
  const handleGroupSelected = () => {
    if (selectedOverlayIds.length === 0) return;
    handleCreateFolder();
  };

  const handleLockSelected = () => {
    if (selectedOverlayIds.length === 0 || !activeChart) return;
    const isAnyUnlocked = selectedOverlayIds.some(id => {
      const ov = activeChart.getOverlays().find((o: any) => o.id === id);
      return ov && !ov.lock;
    });

    selectedOverlayIds.forEach(id => {
      activeChart.overrideOverlay({
        id,
        lock: isAnyUnlocked,
        styles: {
          point: isAnyUnlocked ? {
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
    syncAllDrawings();
    setDrawingTrigger(prev => prev + 1);
  };

  const handleHideSelected = () => {
    if (selectedOverlayIds.length === 0 || !activeChart) return;
    const isAnyVisible = selectedOverlayIds.some(id => {
      const ov = activeChart.getOverlays().find((o: any) => o.id === id);
      return ov && ov.visible !== false;
    });

    selectedOverlayIds.forEach(id => {
      activeChart.overrideOverlay({
        id,
        visible: !isAnyVisible,
      });
    });
    syncAllDrawings();
    setDrawingTrigger(prev => prev + 1);
  };

  const handleDeleteSelected = () => {
    if (selectedOverlayIds.length === 0 || !activeChart) return;
    selectedOverlayIds.forEach(id => {
      activeChart.removeOverlay({ id });
    });
    setSelectedOverlayIds([]);
    syncAllDrawings();
    setDrawingTrigger(prev => prev + 1);
  };

  // Drawing helper
  const getDrawingIcon = (toolName: string) => {
    // Custom SVG for Trendline matching TradingView style
    if (toolName === 'trendLine') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="16" height="16" className="text-gray-400">
          <g fill="currentColor" fillRule="nonzero">
            <path d="M7.354 21.354l14-14-.707-.707-14 14z"></path>
            <path d="M22.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM5.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z"></path>
          </g>
        </svg>
      );
    }
    // Fallback line icon
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="16" height="16" className="text-gray-400">
        <path stroke="currentColor" strokeWidth="2" d="M5 23L23 5" />
      </svg>
    );
  };

  const getDrawingLabel = (ov: any) => {
    if (ov.extendData?.customName) return ov.extendData.customName;
    if (ov.name === 'trendLine') return 'Trendline';
    return ov.name;
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
    <div className="flex-1 flex flex-col h-full bg-[#1c2030] text-gray-300 font-sans select-none">
      
      {/* ── Segmented Controls Tab switcher ── */}
      <div className="px-3 py-2 border-b border-gray-800/70 bg-[#1e222d]">
        <div className="flex bg-[#121420] p-0.5 rounded-lg border border-gray-800/40">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'objectTree'}
            onClick={() => setActiveTab('objectTree')}
            className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'objectTree'
                ? 'bg-[#2a2e39] text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
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
                ? 'bg-[#2a2e39] text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
            }`}
          >
            Data window
          </button>
        </div>
      </div>

      {activeTab === 'objectTree' ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* ── Toolbar buttons matching TradingView ── */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800/70 bg-[#171a26]/40">
            <div className="flex items-center gap-1.5">
              
              {/* Create Group */}
              <button
                type="button"
                disabled={selectedOverlayIds.length === 0}
                onClick={handleGroupSelected}
                title="Create a group of drawings"
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="18" height="18" fill="none">
                  <path fill="currentColor" fillRule="evenodd" clip-rule="evenodd" d="M5.5 6C4.67 6 4 6.67 4 7.5V20.5c0 .83.67 1.5 1.5 1.5H16v-1H5.5a.5.5 0 0 1-.5-.5V12h16v1h1V9.5c0-.83-.67-1.5-1.5-1.5h-8.8L9.86 6.15 9.71 6H5.5zM21 11H5V7.5c0-.28.22-.5.5-.5h3.8l1.85 1.85.14.15h9.21c.28 0 .5.22.5.5V11zm1 11v-3h3v-1h-3v-3h-1v3h-3v1h3v3h1z"></path>
                </svg>
              </button>

              {/* Toggle Lock selected */}
              <button
                type="button"
                disabled={selectedOverlayIds.length === 0}
                onClick={handleLockSelected}
                title="Toggle Lock selected"
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                <Lock className="w-4.5 h-4.5" />
              </button>

              {/* Toggle Hide selected */}
              <button
                type="button"
                disabled={selectedOverlayIds.length === 0}
                onClick={handleHideSelected}
                title="Toggle Hide/Show selected"
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                <Eye className="w-4.5 h-4.5" />
              </button>

              {/* Delete selected */}
              <button
                type="button"
                disabled={selectedOverlayIds.length === 0}
                onClick={handleDeleteSelected}
                title="Delete selected"
                className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>

            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Folder add button */}
              <button
                type="button"
                onClick={handleCreateFolder}
                title="Add new folder"
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800/80 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Tree Object List ── */}
          <div
            className="flex-1 overflow-y-auto px-1 py-1.5 space-y-1 scrollbar-thin scrollbar-thumb-gray-800"
            onDragOver={handleDragOver}
            onDrop={handleDropOnRoot}
          >
            {/* Main Instrument Reference Item */}
            <div className="group flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-transparent hover:bg-[#1f2334] text-xs font-semibold text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-indigo-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="16" height="16" fill="currentColor">
                    <path d="M17 11v6h3v-6h-3zm-.5-1h4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5z"></path>
                    <path d="M18 7h1v3.5h-1zm0 10.5h1V21h-1z"></path>
                    <path d="M9 8v12h3V8H9zm-.5-1h4a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5z"></path>
                    <path d="M10 4h1v3.5h-1zm0 16.5h1V24h-1z"></path>
                  </svg>
                </span>
                <span className="truncate">{activeSymbol} · {activeTimeframe} (Main Series)</span>
              </div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-gray-800/40 px-1.5 py-0.5 rounded border border-gray-800/50">Chart</span>
            </div>

            {/* Folders & Grouped Drawings */}
            {folders.map(folder => {
              const childDrawings = groupedDrawings[folder.id] || [];
              const isSelected = childDrawings.length > 0 && childDrawings.every(d => selectedOverlayIds.includes(d.id));

              return (
                <div
                  key={folder.id}
                  className="flex flex-col border border-transparent rounded-lg"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnFolder(e, folder.id)}
                >
                  {/* Folder Item Header */}
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
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
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-500/30 text-white'
                        : activeChart?._activeFolderId === folder.id
                        ? 'bg-green-600/5 border-green-500/30 text-white'
                        : 'border-transparent hover:bg-[#1f2334] text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFolders(prev =>
                            prev.map(f => (f.id === folder.id ? { ...f, isCollapsed: !f.isCollapsed } : f))
                          );
                        }}
                        className="p-0.5 rounded hover:bg-gray-800 text-gray-500 hover:text-white"
                      >
                        {folder.isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <span className="text-indigo-400 flex-shrink-0">
                        {folder.isCollapsed ? <Folder className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
                      </span>

                      {activeChart?._activeFolderId === folder.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" title="Active folder for new drawings" />
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
                          className="bg-[#121420] border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-28 font-normal"
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
                        <span className="text-[10px] text-gray-500 font-bold bg-[#121420]/60 px-1.5 py-0.5 rounded-full border border-gray-800/30">
                          {childDrawings.length}
                        </span>
                      )}
                    </div>

                    {/* Action buttons on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      
                      {/* Rename folder */}
                      <button
                        type="button"
                        title="Rename folder"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(folder.id, folder.name);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#121420] transition-colors"
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
                            ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-500/10'
                            : 'text-gray-400 hover:text-white hover:bg-[#121420]'
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
                            : 'text-gray-400 hover:text-white hover:bg-[#121420]'
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
                        className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-[#121420] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </div>

                  {/* Child Drawings List */}
                  {!folder.isCollapsed && (
                    <div className="pl-6 pr-1 py-0.5 space-y-0.5 border-l border-gray-800/40 ml-4 mt-0.5">
                      {childDrawings.length === 0 ? (
                        <div className="text-[10px] text-gray-500 italic py-1 pl-2">Empty folder</div>
                      ) : (
                        childDrawings.map(d => {
                          const isSelected = selectedOverlayIds.includes(d.id);
                          const isLocked = d.lock || false;
                          const isVisible = d.visible !== false;

                          return (
                            <div
                              key={d.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, d.id, 'drawing')}
                              onClick={(e) => handleItemSelect(e, d.id)}
                              className={`group flex items-center justify-between px-2 py-1 border rounded-md cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-indigo-600/10 border-indigo-500/30 text-white'
                                  : 'border-transparent hover:bg-[#1f2334] text-gray-300'
                              }`}
                            >
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
                                    className="bg-[#121420] border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-28 font-normal"
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
                                  className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#121420] transition-colors"
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
                                      ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-500/10'
                                      : 'text-gray-400 hover:text-white hover:bg-[#121420]'
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
                                      : 'text-gray-400 hover:text-white hover:bg-[#121420]'
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
                                  className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-[#121420] transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
            })}

            {/* Root Level (Loose) Drawings */}
            {groupedDrawings['root']?.map(d => {
              const isSelected = selectedOverlayIds.includes(d.id);
              const isLocked = d.lock || false;
              const isVisible = d.visible !== false;

              return (
                <div
                  key={d.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, d.id, 'drawing')}
                  onClick={(e) => handleItemSelect(e, d.id)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 border rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500/30 text-white'
                      : 'border-transparent hover:bg-[#1f2334] text-gray-300'
                  }`}
                >
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
                        className="bg-[#121420] border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white outline-none w-28 font-normal"
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
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#121420] transition-colors"
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
                          ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-500/10'
                          : 'text-gray-400 hover:text-white hover:bg-[#121420]'
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
                          : 'text-gray-400 hover:text-white hover:bg-[#121420]'
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
                      className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-[#121420] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {drawings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500 px-6">
                <Layers className="w-8 h-8 text-gray-600 mb-2 opacity-50" />
                <p className="text-[11px] leading-relaxed">No drawings on the chart.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Data Window Tab Placeholder ── */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" className="text-gray-600 mb-2 opacity-50">
            <path stroke="currentColor" strokeWidth="2" d="M3 6h22M3 12h22M3 18h22" />
          </svg>
          <p className="text-[11px] leading-relaxed">Hover over a candle to view data window stats.</p>
        </div>
      )}
    </div>
  );
};
