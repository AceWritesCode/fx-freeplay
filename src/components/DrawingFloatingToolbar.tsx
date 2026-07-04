import React, { useState, useEffect, useRef } from 'react';
import { GripVertical, LayoutTemplate, Palette, Minus, Settings, Bell, Lock, Unlock, Trash2, MoreHorizontal, Baseline, X, ChevronDown } from 'lucide-react';
import { ColorPicker } from './ColorPicker';

interface DrawingFloatingToolbarProps {
  selectedOverlayIds: string[];
  drawingTrigger?: number;
  onUpdateSettings?: (settings: any) => void;
  getOverlay?: (id: string) => any;
  onLock?: () => void;
  onDelete?: () => void;
  onSettingsClick?: () => void;
  onApplyTemplate?: (settings: any) => void;
}

export const DrawingFloatingToolbar: React.FC<DrawingFloatingToolbarProps> = (props) => {
  const { selectedOverlayIds, onUpdateSettings, getOverlay, onLock, onDelete, onSettingsClick, onApplyTemplate } = props;
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'color' | 'textColor' | 'width' | 'style' | null>(null);
  
  // Advanced template states
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeTemplateMode, setActiveTemplateMode] = useState<'light' | 'dark'>('light');
  const [selectedGroup, setSelectedGroup] = useState('Default');
  const [isSelectGroupDropdownOpen, setIsSelectGroupDropdownOpen] = useState(false);
  
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Read current settings from first selected overlay
  const firstOverlay = selectedOverlayIds.length > 0 && getOverlay ? getOverlay(selectedOverlayIds[0]) : null;
  const customSettings = firstOverlay?.extendData?.customSettings || {};
  
  const lineColor = customSettings.lineColor || '#2196F3';
  const textColor = customSettings.textColor || '#2196F3';
  const lineWidth = customSettings.lineWidth || 1;
  const lineStyle = customSettings.lineStyle || 'solid';
  const isLocked = firstOverlay?.lock || false;

  const handleUpdate = (update: any, closeDropdown = true) => {
    if (onUpdateSettings) onUpdateSettings(update);
    if (closeDropdown) setActiveDropdown(null);
  };

  // Dismiss any open dropdowns when the selection changes (e.g. unselected)
  useEffect(() => {
    setActiveDropdown(null);
    setIsTemplateDropdownOpen(false);
  }, [selectedOverlayIds.length]);

  // Load templates from localStorage
  useEffect(() => {
    if (selectedOverlayIds.length === 0 || !firstOverlay) return;
    try {
      const saved = localStorage.getItem(`fx_templates_${firstOverlay.name || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const upgraded = parsed
            .filter((t: any) => t !== null && typeof t === 'object')
            .map((t: any) => ({
              id: t.id || Date.now().toString() + Math.random().toString(),
              name: t.name || 'Unnamed',
              group: t.group || 'Default',
              mode: t.mode || 'light',
              settings: t.settings
            }));
          setTemplates(upgraded);
        } else {
          setTemplates([]);
        }
      } else {
        setTemplates([]);
      }
    } catch (e) {
      setTemplates([]);
    }
  }, [selectedOverlayIds, firstOverlay]);

  // Helper to ensure selectedGroup updates if mode changes or templates are deleted
  useEffect(() => {
    const activeTpls = (templates || []).filter(t => t && t.mode === activeTemplateMode);
    const groups = Array.from(new Set(activeTpls.map(t => t && (t.group || 'Default'))));
    if (groups.length > 0) {
      if (!groups.includes(selectedGroup)) {
        setSelectedGroup(groups[0]);
      }
    } else {
      setSelectedGroup('Default');
    }
  }, [activeTemplateMode, templates]);

  const deleteTemplate = (id: string) => {
    setTemplates(prev => {
      const updated = (prev || []).filter(t => t && t.id !== id);
      if (firstOverlay) {
        localStorage.setItem(`fx_templates_${firstOverlay.name || 'default'}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Derived template states
  const activeTemplates = (templates || []).filter(t => t && t.mode === activeTemplateMode);
  const uniqueGroups = Array.from(new Set(activeTemplates.map(t => t.group || 'Default')));
  const visibleTemplates = activeTemplates.filter(t => (t.group || 'Default') === selectedGroup);

  // Initialize position in the center top when it first appears
  useEffect(() => {
    if (selectedOverlayIds.length > 0 && position.x === 0 && position.y === 0) {
      const containerWidth = document.querySelector('main')?.clientWidth || window.innerWidth;
      setPosition({ x: containerWidth / 2 - 150, y: 60 }); // Roughly centered horizontally, top aligned
    }
  }, [selectedOverlayIds.length, position.x, position.y]);

  // Global pointer event listeners for dragging
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.initialX + dx,
        y: Math.max(10, dragStartRef.current.initialY + dy) // prevent going completely off top screen
      });
    };

    const handlePointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag on left click (button 0) or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  if (selectedOverlayIds.length === 0) return null;

  return (
    <div
      ref={toolbarRef}
      style={{ 
        transform: `translate(${position.x}px, ${position.y}px)`,
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 50
      }}
      className="flex items-stretch bg-white dark:bg-[#1e222d] rounded-lg shadow-lg shadow-black/20 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 pointer-events-auto select-none"
    >
      {/* Drag Handle */}
      <div
        onPointerDown={handlePointerDown}
        className="flex items-center justify-center px-1.5 cursor-grab active:cursor-grabbing border-r border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-l-lg transition-colors"
        title="Drag toolbar"
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {/* Toolbar Content */}
      <div className="flex items-center px-1">
        
        {/* Templates */}
        <div className="relative">
          <button 
            onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
            className={`p-2 rounded transition-colors group relative ${isTemplateDropdownOpen ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} 
            title="Templates"
          >
            <LayoutTemplate className="w-4 h-4 group-hover:text-indigo-500" />
          </button>
          
          {isTemplateDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsTemplateDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-2 bg-white dark:bg-[#1c2030] border border-gray-200 dark:border-[#2a2e45] rounded-xl shadow-2xl z-50 py-1 w-52 font-semibold flex flex-col text-gray-700 dark:text-gray-200">
                
                {/* Mode Tabs */}
                <div className="flex border-b border-gray-200 dark:border-[#242838]">
                  <button
                    onClick={() => setActiveTemplateMode('light')}
                    className={`flex-1 text-center py-2 text-xs font-semibold border-r border-gray-200 dark:border-[#242838] transition-colors ${
                      activeTemplateMode === 'light'
                        ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold border-b border-indigo-500'
                        : 'text-gray-450 hover:text-gray-650 dark:hover:text-gray-250'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setActiveTemplateMode('dark')}
                    className={`flex-1 text-center py-2 text-xs font-semibold transition-colors ${
                      activeTemplateMode === 'dark'
                        ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold border-b border-indigo-500'
                        : 'text-gray-450 hover:text-gray-650 dark:hover:text-gray-250'
                    }`}
                  >
                    Dark
                  </button>
                </div>

                {/* Actions Row */}
                <div className="flex border-b border-gray-200 dark:border-[#242838] text-[11px]">
                  <button
                    onClick={() => {
                      if (onApplyTemplate) {
                        onApplyTemplate({
                          lineColor: '#2196F3',
                          lineWidth: 1,
                          lineStyle: 'solid',
                          extendType: 'none',
                          text: '',
                          textColor: '#2196F3',
                          fontSize: 14,
                          bold: false,
                          italic: false,
                          textPosition: { vertical: 'middle', horizontal: 'right' },
                          visibility: {
                            ticks: { show: true },
                            seconds: { show: true, min: 1, max: 59 },
                            minutes: { show: true, min: 1, max: 59 },
                            hours: { show: true, min: 1, max: 24 },
                            days: { show: true, min: 1, max: 365 },
                            weeks: { show: true, min: 1, max: 52 },
                            months: { show: true, min: 1, max: 12 },
                            ranges: { show: true }
                          }
                        });
                      }
                      setIsTemplateDropdownOpen(false);
                    }}
                    className="flex-1 text-center py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-semibold"
                  >
                    Restore to default
                  </button>
                </div>

                {/* Group Selector Dropdown */}
                {uniqueGroups.length > 0 && (
                  <div className="relative px-3 py-2 border-b border-gray-200 dark:border-[#242838] bg-gray-50 dark:bg-[#171a26]">
                    <button
                      onClick={() => setIsSelectGroupDropdownOpen(!isSelectGroupDropdownOpen)}
                      className="w-full flex items-center justify-between bg-white dark:bg-[#121420] border border-gray-200 dark:border-[#2a2e45] hover:border-gray-350 dark:hover:border-[#3a3f5e] rounded-lg px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all active:scale-98"
                    >
                      <span>{selectedGroup}</span>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>
                    {isSelectGroupDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setIsSelectGroupDropdownOpen(false)} />
                        <div className="absolute left-3 right-3 top-full mt-1 bg-white dark:bg-[#1c2030] border border-gray-200 dark:border-[#2a2e45] rounded-lg shadow-2xl z-[70] py-1 max-h-32 overflow-y-auto">
                          {uniqueGroups.map(grp => (
                            <button
                              key={grp}
                              onClick={() => {
                                setSelectedGroup(grp);
                                setIsSelectGroupDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-750 dark:text-gray-305 text-xs truncate"
                            >
                              {grp}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Templates List */}
                <div className="max-h-40 overflow-y-auto py-1 bg-white dark:bg-[#1c2030]">
                  {visibleTemplates.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-gray-450 dark:text-gray-500 text-center italic font-normal">No templates</div>
                  ) : (
                    visibleTemplates.map(tpl => (
                      <div
                        key={tpl.id}
                        className="group flex justify-between items-center px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white text-xs cursor-pointer"
                        onClick={() => {
                          if (onApplyTemplate) {
                            onApplyTemplate(tpl.settings);
                          }
                          setIsTemplateDropdownOpen(false);
                        }}
                      >
                        <span className="truncate pr-2 font-medium">{tpl.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(tpl.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:bg-red-500/10 p-1 rounded transition-all text-red-500 dark:text-red-400 hover:text-red-650"
                          title="Delete template"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </>
          )}
        </div>
        
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1" />

        {/* Line Color */}
        <div className="relative">
          <button 
            onClick={() => setActiveDropdown(activeDropdown === 'color' ? null : 'color')}
            className={`p-2 rounded transition-colors group relative ${activeDropdown === 'color' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} 
            title="Line color"
          >
            <Palette className="w-4 h-4" />
            <div className="absolute bottom-1 left-2 right-2 h-0.5 rounded-full" style={{ backgroundColor: lineColor }} />
          </button>
          
          {activeDropdown === 'color' && (
            <div className="absolute top-full mt-2 left-0 z-50">
              <ColorPicker 
                color={lineColor} 
                onChange={(c) => handleUpdate({ lineColor: c }, false)} 
              />
            </div>
          )}
        </div>

        {/* Text Color */}
        <div className="relative">
          <button 
            onClick={() => setActiveDropdown(activeDropdown === 'textColor' ? null : 'textColor')}
            className={`p-2 rounded transition-colors group relative mx-1 ${activeDropdown === 'textColor' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} 
            title="Text color"
          >
            <Baseline className="w-4 h-4" />
            <div className="absolute bottom-1 left-2 right-2 h-0.5 rounded-full" style={{ backgroundColor: textColor }} />
          </button>
          
          {activeDropdown === 'textColor' && (
            <div className="absolute top-full mt-2 left-0 z-50">
              <ColorPicker 
                color={textColor} 
                onChange={(c) => handleUpdate({ textColor: c }, false)} 
              />
            </div>
          )}
        </div>


        {/* Line Width */}
        <div className="relative mx-1">
          <button 
            onClick={() => setActiveDropdown(activeDropdown === 'width' ? null : 'width')}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors group ${activeDropdown === 'width' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} 
            title="Line width"
          >
            <Minus className="w-4 h-4 stroke-[3px]" />
            <span className="text-[11px] font-semibold">{lineWidth}px</span>
          </button>
          
          {activeDropdown === 'width' && (
            <div className="absolute top-full mt-2 left-0 w-24 bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-gray-800 rounded-lg py-1 flex flex-col shadow-xl z-50">
              {[1, 2, 3, 4].map(w => (
                <button
                  key={w}
                  onClick={() => handleUpdate({ lineWidth: w })}
                  className={`px-3 py-2 text-[11px] font-medium text-left hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between ${w === lineWidth ? 'text-indigo-500' : ''}`}
                >
                  {w}px
                  <div className="flex-1 ml-3 h-px bg-current" style={{ height: w }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Line Style */}
        <div className="relative">
          <button 
            onClick={() => setActiveDropdown(activeDropdown === 'style' ? null : 'style')}
            className={`p-2 rounded transition-colors group ${activeDropdown === 'style' ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} 
            title="Line style"
          >
            {lineStyle === 'solid' && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="0" y1="8" x2="16" y2="8" />
              </svg>
            )}
            {lineStyle === 'dashed' && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2">
                <line x1="0" y1="8" x2="16" y2="8" />
              </svg>
            )}
            {lineStyle === 'dotted' && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2">
                <line x1="0" y1="8" x2="16" y2="8" />
              </svg>
            )}
          </button>
          
          {activeDropdown === 'style' && (
            <div className="absolute top-full mt-2 left-0 w-28 bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-gray-800 rounded-lg py-1 flex flex-col shadow-xl z-50">
              {['solid', 'dashed', 'dotted'].map(s => (
                <button
                  key={s}
                  onClick={() => handleUpdate({ lineStyle: s })}
                  className={`px-3 py-2 text-[11px] font-medium text-left capitalize hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between ${s === lineStyle ? 'text-indigo-500' : ''}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1" />

        {/* Settings */}
        <button 
          onClick={onSettingsClick}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors group cursor-pointer" 
          title="Settings"
        >
          <Settings className="w-4 h-4 group-hover:text-indigo-500" />
        </button>

        {/* Add Alert */}
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors group" title="Add Alert">
          <Bell className="w-4 h-4" />
        </button>

        {/* Lock */}
        <button 
          onClick={onLock}
          className={`p-2 rounded transition-colors group ${isLocked ? 'text-indigo-500 bg-indigo-500/10' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`} 
          title={isLocked ? "Unlock" : "Lock"}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>

        {/* Remove */}
        <button 
          onClick={onDelete}
          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors group text-gray-700 dark:text-gray-300 hover:text-red-500" 
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1" />

        {/* More */}
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors group" title="More">
          <MoreHorizontal className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
