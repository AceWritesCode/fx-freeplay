import React, { useState, useEffect, useRef } from 'react';
import { GripVertical, LayoutTemplate, Palette, Minus, Baseline, Settings, Lock, Unlock, Trash2, MoreHorizontal, X, ChevronDown, Anchor } from 'lucide-react';
import { ColorPicker } from './ColorPicker';

import { SearchableDropdown } from './DrawingSettingsDialog';

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  danger?: boolean;
  title?: string;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  active,
  danger,
  title,
  children,
  className = '',
  ...props
}) => {
  return (
    <button
      type="button"
      title={title}
      className={`
        relative flex items-center justify-center w-8 h-8 rounded transition-colors cursor-pointer select-none text-txt-secondary
        ${
          danger
            ? 'hover:text-status-error hover:bg-status-error/10'
            : active
            ? 'text-accent bg-accent-muted ring-1 ring-accent'
            : 'hover:text-txt-primary hover:bg-surface-hover'
        }
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Advanced template states
  const isTemplateDropdownOpen = activeDropdown === 'template';
  const setIsTemplateDropdownOpen = (open: boolean | ((prev: boolean) => boolean)) => {
    if (typeof open === 'function') {
      setActiveDropdown(prev => (prev === 'template' ? null : 'template'));
    } else {
      setActiveDropdown(open ? 'template' : null);
    }
  };
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeTemplateMode, setActiveTemplateMode] = useState<'light' | 'dark'>('light');
  const [selectedGroup, setSelectedGroup] = useState('Default');
  const [isSelectGroupDropdownOpen, setIsSelectGroupDropdownOpen] = useState(false);

  // Save modal states
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveGroup, setSaveGroup] = useState('Default');
  const [saveMode, setSaveMode] = useState<'light' | 'dark'>('light');
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Read current settings from first selected overlay
  const firstOverlay = selectedOverlayIds.length > 0 && getOverlay ? getOverlay(selectedOverlayIds[0]) : null;
  const customSettings = firstOverlay?.extendData?.customSettings || {};
  
  const isRiskReward = firstOverlay?.name === 'longPosition' || firstOverlay?.name === 'shortPosition';
  const isText = firstOverlay?.name === 'text' || firstOverlay?.name === 'fxText';
  const isAnchored = !!customSettings.isAnchored;
  const fontSize = customSettings.fontSize || 14;
  const fillBackground = customSettings.fillBackground !== false && customSettings.fillBackground !== undefined;
  const fillColor = customSettings.fillColor || 'rgba(33, 150, 243, 0.1)';
  const lineColor = customSettings.lineColor || '#2196F3';
  const textColor = customSettings.textColor || '#2196F3';
  const profitColor = customSettings.profitColor || 'rgba(76, 175, 80, 0.12)';
  const lossColor = customSettings.lossColor || 'rgba(244, 67, 54, 0.12)';
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

  const allUniqueNames = Array.from(new Set((templates || []).filter(t => t && t.name).map(t => t.name)));
  const allUniqueGroups = Array.from(new Set((templates || []).filter(t => t && t.group).map(t => t.group)));

  const deleteNameOption = (name: string) => {
    setTemplates(prev => {
      const updated = (prev || []).filter(t => t && t.name !== name);
      if (firstOverlay) {
        localStorage.setItem(`fx_templates_${firstOverlay.name || 'default'}`, JSON.stringify(updated));
      }
      return updated;
    });
    if (saveName === name) {
      setSaveName('');
    }
  };

  const deleteGroupOption = (groupName: string) => {
    setTemplates(prev => {
      const updated = (prev || []).filter(t => t && t.group !== groupName);
      if (firstOverlay) {
        localStorage.setItem(`fx_templates_${firstOverlay.name || 'default'}`, JSON.stringify(updated));
      }
      return updated;
    });
    if (saveGroup === groupName) {
      setSaveGroup('Default');
    }
  };

  // Derived template states
  const activeTemplates = (templates || []).filter(t => t && t.mode === activeTemplateMode);
  const uniqueGroups = Array.from(new Set(activeTemplates.map(t => t.group || 'Default')));
  const visibleTemplates = activeTemplates.filter(t => (t.group || 'Default') === selectedGroup);

  // Initialize position in the center top when it first appears
  useEffect(() => {
    if (selectedOverlayIds.length > 0 && position.x === 0 && position.y === 0) {
      const container = toolbarRef.current?.offsetParent as HTMLElement || document.querySelector('main') || document.body;
      const containerWidth = container.clientWidth || window.innerWidth;
      const toolbarWidth = toolbarRef.current?.offsetWidth || (isRiskReward ? 440 : 280);
      const targetX = Math.max(10, Math.min(containerWidth - toolbarWidth - 10, (containerWidth - toolbarWidth) / 2));
      setPosition({ x: targetX, y: 60 });
    }
  }, [selectedOverlayIds.length, position.x, position.y, isRiskReward]);

  // Global pointer event listeners for dragging
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const container = toolbarRef.current?.offsetParent as HTMLElement || document.body;
      const containerWidth = container.clientWidth || window.innerWidth;
      const toolbarWidth = toolbarRef.current?.offsetWidth || 300;
      const clampedX = Math.max(10, Math.min(containerWidth - toolbarWidth - 10, dragStartRef.current.initialX + dx));
      const clampedY = Math.max(10, dragStartRef.current.initialY + dy);
      setPosition({
        x: clampedX,
        y: clampedY
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

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const templatesDropdown = (
    <div className="relative">
      <ToolbarButton 
        active={isTemplateDropdownOpen}
        onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
        title="Templates"
      >
        <LayoutTemplate className="w-4 h-4" />
      </ToolbarButton>
      
      {isTemplateDropdownOpen && (
        <div className="absolute left-0 top-full mt-2 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 py-1 w-52 font-semibold flex flex-col text-txt-secondary">
            
            {/* Mode Tabs */}
            <div className="flex border-b border-border-sub">
              <button
                onClick={() => setActiveTemplateMode('light')}
                className={`flex-1 text-center py-2 text-xs font-semibold border-r border-border-sub transition-colors ${
                  activeTemplateMode === 'light'
                    ? 'bg-accent-muted text-accent font-bold border-b border-accent'
                    : 'text-txt-muted hover:text-txt-primary'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setActiveTemplateMode('dark')}
                className={`flex-1 text-center py-2 text-xs font-semibold transition-colors ${
                  activeTemplateMode === 'dark'
                    ? 'bg-accent-muted text-accent font-bold border-b border-accent'
                    : 'text-txt-muted hover:text-txt-primary'
                }`}
              >
                Dark
              </button>
            </div>

            {/* Actions Row */}
            <div className="flex border-b border-border-sub text-[11px]">
              <button
                onClick={() => {
                  setSaveName('');
                  setSaveGroup(selectedGroup || 'Default');
                  setSaveMode(activeTemplateMode);
                  setIsSaveModalOpen(true);
                  setIsTemplateDropdownOpen(false);
                }}
                className="flex-1 text-center py-2 hover:bg-surface-hover text-accent font-semibold border-r border-border-sub"
              >
                Save templet
              </button>
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
                className="flex-1 text-center py-2 hover:bg-surface-hover text-txt-muted hover:text-txt-primary font-semibold"
              >
                Restore to default
              </button>
            </div>

            {/* Group Selector Dropdown */}
            {uniqueGroups.length > 0 && (
              <div className="relative px-3 py-2 border-b border-border-sub bg-surface">
                <button
                  onClick={() => setIsSelectGroupDropdownOpen(!isSelectGroupDropdownOpen)}
                  className="w-full flex items-center justify-between bg-app-bg border border-border-def hover:border-border-focus rounded-lg px-2.5 py-1.5 text-xs text-txt-secondary hover:text-txt-primary transition-all active:scale-98"
                >
                  <span>{selectedGroup}</span>
                  <ChevronDown className="w-3 h-3 text-txt-muted" />
                </button>
                {isSelectGroupDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsSelectGroupDropdownOpen(false)} />
                    <div className="absolute left-3 right-3 top-full mt-1 bg-modal-bg border border-border-def rounded-lg shadow-2xl z-[70] py-1 max-h-32 overflow-y-auto">
                      {uniqueGroups.map(grp => (
                        <button
                          key={grp}
                          onClick={() => {
                            setSelectedGroup(grp);
                            setIsSelectGroupDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-txt-secondary text-xs truncate"
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
            <div className="max-h-40 overflow-y-auto py-1 bg-modal-bg">
              {visibleTemplates.length === 0 ? (
                <div className="px-4 py-3 text-xs text-txt-muted text-center italic font-normal">No templates</div>
              ) : (
                visibleTemplates.map(tpl => (
                  <div
                    key={tpl.id}
                    className="group flex justify-between items-center px-4 py-1.5 hover:bg-surface-hover text-txt-secondary hover:text-txt-primary text-xs cursor-pointer"
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
                      className="opacity-0 group-hover:opacity-100 hover:bg-status-error/10 p-1 rounded transition-all text-status-error"
                      title="Delete template"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );

  if (selectedOverlayIds.length === 0) return null;

  return (
    <div
      ref={toolbarRef}
      data-floating-ui="true"
      onMouseDown={(e) => e.stopPropagation()}
      style={{ 
        transform: `translate(${position.x}px, ${position.y}px)`,
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 50
      }}
      className="drawing-floating-toolbar flex items-stretch bg-surface rounded-lg shadow-lg shadow-black/20 border border-border-def text-txt-secondary pointer-events-auto select-none"
    >
      {/* Drag Handle */}
      <div
        onPointerDown={handlePointerDown}
        className="flex items-center justify-center px-2 cursor-grab active:cursor-grabbing border-r border-border-sub hover:bg-surface-hover rounded-l-lg transition-colors"
        title="Drag toolbar"
      >
        {isRiskReward ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 12" width="8" height="12" fill="currentColor" className="text-txt-muted">
            <rect width="2" height="2" rx="1"></rect>
            <rect width="2" height="2" rx="1" y="5"></rect>
            <rect width="2" height="2" rx="1" y="10"></rect>
            <rect width="2" height="2" rx="1" x="6"></rect>
            <rect width="2" height="2" rx="1" x="6" y="5"></rect>
            <rect width="2" height="2" rx="1" x="6" y="10"></rect>
          </svg>
        ) : (
          <GripVertical className="w-4 h-4 text-txt-muted" />
        )}
      </div>

      {/* Toolbar Content */}
      <div className="flex items-center p-1 gap-0.5">
        {/* Templates */}
        {templatesDropdown}

        <div className="w-px h-4 bg-border-def mx-0.5" />

        {/* Line Color */}
        <div className="relative">
          <ToolbarButton 
            active={activeDropdown === 'color'}
            onClick={() => setActiveDropdown(activeDropdown === 'color' ? null : 'color')}
            title="Line color"
          >
            <Palette className="w-4 h-4" />
            <div className="absolute bottom-1.5 left-2 right-2 h-0.5 rounded-full" style={{ backgroundColor: lineColor }} />
          </ToolbarButton>
          
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
          <ToolbarButton 
            active={activeDropdown === 'textColor'}
            onClick={() => setActiveDropdown(activeDropdown === 'textColor' ? null : 'textColor')}
            title="Text color"
          >
            <Baseline className="w-4 h-4" />
            <div className="absolute bottom-1.5 left-2 right-2 h-0.5 rounded-full" style={{ backgroundColor: textColor }} />
          </ToolbarButton>
          
          {activeDropdown === 'textColor' && (
            <div className="absolute top-full mt-2 left-0 z-50">
              <ColorPicker 
                color={textColor} 
                onChange={(c) => handleUpdate({ textColor: c }, false)} 
              />
            </div>
          )}
        </div>

        {/* Profit Background Color */}
        {isRiskReward && (
          <div className="relative">
            <ToolbarButton 
              active={activeDropdown === 'profitColor'}
              onClick={() => setActiveDropdown(activeDropdown === 'profitColor' ? null : 'profitColor')}
              title="Target background color"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="w-4 h-4 fill-none text-current">
                <path stroke="currentColor" strokeWidth="1.5" d="M13.5 6.5l-3-3-7 7 7.59 7.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82L13.5 6.5zm0 0v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"></path>
                <path fill="currentColor" d="M0 16.5C0 15 2.5 12 2.5 12S5 15 5 16.5 4 19 2.5 19 0 18 0 16.5z"></path>
                <circle fill="currentColor" cx="9.5" cy="9.5" r="1.5"></circle>
              </svg>
              <div className="absolute bottom-1.5 left-2 right-2 h-0.5 rounded-full" style={{ backgroundColor: profitColor }} />
            </ToolbarButton>
            
            {activeDropdown === 'profitColor' && (
              <div className="absolute top-full mt-2 left-0 z-50">
                <ColorPicker 
                  color={profitColor} 
                  onChange={(c) => handleUpdate({ profitColor: c }, false)} 
                />
              </div>
            )}
          </div>
        )}

        {/* Loss Background Color */}
        {isRiskReward && (
          <div className="relative">
            <ToolbarButton 
              active={activeDropdown === 'lossColor'}
              onClick={() => setActiveDropdown(activeDropdown === 'lossColor' ? null : 'lossColor')}
              title="Stop background color"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="w-4 h-4 fill-none text-current">
                <path stroke="currentColor" strokeWidth="1.5" d="M13.5 6.5l-3-3-7 7 7.59 7.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82L13.5 6.5zm0 0v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"></path>
                <path fill="currentColor" d="M0 16.5C0 15 2.5 12 2.5 12S5 15 5 16.5 4 19 2.5 19 0 18 0 16.5z"></path>
                <circle fill="currentColor" cx="9.5" cy="9.5" r="1.5"></circle>
              </svg>
              <div className="absolute bottom-1.5 left-2 right-2 h-0.5 rounded-full" style={{ backgroundColor: lossColor }} />
            </ToolbarButton>
            
            {activeDropdown === 'lossColor' && (
              <div className="absolute top-full mt-2 left-0 z-50">
                <ColorPicker 
                  color={lossColor} 
                  onChange={(c) => handleUpdate({ lossColor: c }, false)} 
                />
              </div>
            )}
          </div>
        )}

        {/* Font Size Selector for Text Tool */}
        {isText && (
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'fontSize' ? null : 'fontSize')}
              className={`flex items-center gap-1 h-8 px-2 rounded transition-colors cursor-pointer text-txt-secondary hover:text-accent ${activeDropdown === 'fontSize' ? 'bg-surface-hover text-accent' : 'hover:bg-surface-hover'}`} 
              title="Font size"
            >
              <span className="text-xs font-semibold">{fontSize}px</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            
            {activeDropdown === 'fontSize' && (
              <div className="absolute top-full mt-2 left-0 w-20 bg-modal-bg border border-border-def rounded-lg py-1 flex flex-col shadow-xl z-50 text-txt-secondary max-h-48 overflow-y-auto">
                {[10, 12, 14, 16, 18, 20, 24, 28, 36, 48].map(size => (
                  <button
                    key={size}
                    onClick={() => handleUpdate({ fontSize: size })}
                    className={`px-3 py-1.5 text-xs text-left hover:bg-surface-hover ${size === fontSize ? 'text-accent font-bold' : ''}`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Text Background Color for Text Tool */}
        {isText && (
          <div className="relative">
            <ToolbarButton 
              active={activeDropdown === 'fillColor'}
              onClick={() => setActiveDropdown(activeDropdown === 'fillColor' ? null : 'fillColor')}
              title="Background color"
            >
              <div className="w-4 h-4 rounded border border-border-def" style={{ backgroundColor: fillBackground ? fillColor : 'transparent' }} />
            </ToolbarButton>
            
            {activeDropdown === 'fillColor' && (
              <div className="absolute top-full mt-2 left-0 z-50 p-2 bg-modal-bg border border-border-def rounded-lg shadow-xl flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs text-txt-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fillBackground}
                    onChange={(e) => handleUpdate({ fillBackground: e.target.checked }, false)}
                    className="rounded border-border-def text-accent focus:ring-0"
                  />
                  <span>Show Background</span>
                </label>
                {fillBackground && (
                  <ColorPicker 
                    color={fillColor} 
                    onChange={(c) => handleUpdate({ fillColor: c }, false)} 
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Line Width */}
        {!isText && (
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'width' ? null : 'width')}
              className={`flex items-center gap-1.5 h-8 px-2 rounded transition-colors group cursor-pointer text-txt-secondary hover:text-accent ${activeDropdown === 'width' ? 'bg-surface-hover text-accent' : 'hover:bg-surface-hover'}`} 
              title="Line width"
            >
              <Minus className="w-4 h-4 stroke-[3px]" />
              <span className="text-[11px] font-semibold">{lineWidth}px</span>
            </button>
            
            {activeDropdown === 'width' && (
              <div className="absolute top-full mt-2 left-0 w-24 bg-modal-bg border border-border-def rounded-lg py-1 flex flex-col shadow-xl z-50 text-txt-secondary">
                {[1, 2, 3, 4].map(w => (
                  <button
                    key={w}
                    onClick={() => handleUpdate({ lineWidth: w })}
                    className={`px-3 py-2 text-[11px] font-medium text-left hover:bg-surface-hover flex items-center justify-between ${w === lineWidth ? 'text-accent font-bold' : ''}`}
                  >
                    {w}px
                    <div className="flex-1 ml-3 h-px bg-current" style={{ height: w }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Line Style */}
        {!isText && (
          <div className="relative">
            <ToolbarButton 
              active={activeDropdown === 'style'}
              onClick={() => setActiveDropdown(activeDropdown === 'style' ? null : 'style')}
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
              {lineStyle === 'none' && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="5.5" />
                  <line x1="4" y1="12" x2="12" y2="4" />
                </svg>
              )}
            </ToolbarButton>
            
            {activeDropdown === 'style' && (
              <div className="absolute top-full mt-2 left-0 w-28 bg-modal-bg border border-border-def rounded-lg py-1 flex flex-col shadow-xl z-50 text-txt-secondary">
                {(firstOverlay?.name === 'rectangle' ? ['solid', 'dashed', 'dotted', 'none'] : ['solid', 'dashed', 'dotted']).map(s => (
                  <button
                    key={s}
                    onClick={() => handleUpdate({ lineStyle: s })}
                    className={`px-3 py-2 text-[11px] font-medium text-left capitalize hover:bg-surface-hover flex items-center justify-between ${s === lineStyle ? 'text-accent font-bold' : ''}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="w-px h-4 bg-border-def mx-0.5" />

        {/* Settings */}
        <ToolbarButton 
          onClick={onSettingsClick}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </ToolbarButton>

        {/* Lock */}
        <ToolbarButton 
          active={isLocked}
          onClick={onLock}
          title={isLocked ? "Unlock" : "Lock"}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </ToolbarButton>

        {/* Anchor Control (Placed immediately after Lock) */}
        {isText && (
          <ToolbarButton 
            active={isAnchored}
            onClick={() => handleUpdate({ isAnchored: !isAnchored })}
            title={isAnchored ? "Unanchor text" : "Anchor text to chart data space"}
          >
            <Anchor className="w-4 h-4" />
          </ToolbarButton>
        )}

        {/* Remove */}
        <ToolbarButton 
          danger
          onClick={onDelete}
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border-def mx-0.5" />

        {/* More */}
        <ToolbarButton title="More">
          <MoreHorizontal className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Save Template Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-overlay-bg backdrop-blur-xs z-[100] flex items-center justify-center animate-in fade-in duration-150">
          <div className="bg-modal-bg border border-border-def rounded-xl shadow-2xl w-[320px] p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150 text-left text-txt-secondary">
            {/* Header */}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-xs tracking-wider uppercase text-txt-primary">Save drawing template</span>
              <button 
                onClick={() => setIsSaveModalOpen(false)}
                className="text-txt-muted hover:text-txt-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-3">
              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-txt-muted">Name</label>
                <SearchableDropdown
                  value={saveName}
                  onChange={setSaveName}
                  options={allUniqueNames}
                  onDeleteOption={deleteNameOption}
                  placeholder="Template Name"
                  isOpen={isNameDropdownOpen}
                  setIsOpen={setIsNameDropdownOpen}
                />
              </div>

              {/* Group */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-txt-muted">Group</label>
                <SearchableDropdown
                  value={saveGroup}
                  onChange={setSaveGroup}
                  options={allUniqueGroups}
                  onDeleteOption={deleteGroupOption}
                  placeholder="Group Name"
                  isOpen={isGroupDropdownOpen}
                  setIsOpen={setIsGroupDropdownOpen}
                />
              </div>

              {/* Mode Select Buttons */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-gray-400">Mode</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveMode('light')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      saveMode === 'light'
                        ? 'bg-accent-muted border-accent text-accent shadow-md'
                        : 'border-border-def bg-surface text-txt-muted hover:text-txt-primary hover:border-border-focus'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveMode('dark')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      saveMode === 'dark'
                        ? 'bg-accent-muted border-accent text-accent shadow-md'
                        : 'border-border-def bg-surface text-txt-muted hover:text-txt-primary hover:border-border-focus'
                    }`}
                  >
                    Dark
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-1.5 border border-border-def hover:bg-surface-hover text-txt-secondary rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!saveName.trim()}
                onClick={() => {
                  const nameToSave = saveName.trim();
                  const groupToSave = saveGroup.trim() || 'Default';
                  
                  setTemplates(prev => {
                    const filtered = (prev || []).filter(t => 
                      t && !(t.name.toLowerCase() === nameToSave.toLowerCase() && 
                             t.group.toLowerCase() === groupToSave.toLowerCase() && 
                             t.mode === saveMode)
                    );
                    const newTemplate = {
                      id: Date.now().toString(),
                      name: nameToSave,
                      group: groupToSave,
                      mode: saveMode,
                      settings: {
                        lineColor,
                        lineWidth,
                        lineStyle,
                        extendType: customSettings.extendType || 'none',
                        textColor,
                        profitColor,
                        lossColor,
                        fontSize: customSettings.fontSize || 14,
                        bold: !!customSettings.bold,
                        italic: !!customSettings.italic,
                        textPosition: customSettings.textPosition || { vertical: 'middle', horizontal: 'right' },
                        visibility: customSettings.visibility || {
                          ticks: { show: true },
                          seconds: { show: true, min: 1, max: 59 },
                          minutes: { show: true, min: 1, max: 59 },
                          hours: { show: true, min: 1, max: 24 },
                          days: { show: true, min: 1, max: 365 },
                          weeks: { show: true, min: 1, max: 52 },
                          months: { show: true, min: 1, max: 12 },
                          ranges: { show: true }
                        }
                      }
                    };
                    const updated = [...filtered, newTemplate];
                    if (firstOverlay) {
                      localStorage.setItem(`fx_templates_${firstOverlay.name || 'default'}`, JSON.stringify(updated));
                    }
                    return updated;
                  });

                  setIsSaveModalOpen(false);
                  setSelectedGroup(groupToSave);
                }}
                className="px-5 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-txt-inverse rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
