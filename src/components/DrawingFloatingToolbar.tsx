import React, { useState, useEffect, useRef } from 'react';
import { GripVertical, LayoutTemplate, Palette, Minus, Settings, Bell, Lock, Unlock, Trash2, MoreHorizontal, Baseline } from 'lucide-react';
import { ColorPicker } from './ColorPicker';

interface DrawingFloatingToolbarProps {
  selectedOverlayIds: string[];
  drawingTrigger?: number;
  onUpdateSettings?: (settings: any) => void;
  getOverlay?: (id: string) => any;
  onLock?: () => void;
  onDelete?: () => void;
  onSettingsClick?: () => void;
}

export const DrawingFloatingToolbar: React.FC<DrawingFloatingToolbarProps> = (props) => {
  const { selectedOverlayIds, onUpdateSettings, getOverlay, onLock, onDelete, onSettingsClick } = props;
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'color' | 'width' | 'style' | null>(null);
  
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Read current settings from first selected overlay
  const firstOverlay = selectedOverlayIds.length > 0 && getOverlay ? getOverlay(selectedOverlayIds[0]) : null;
  const customSettings = firstOverlay?.extendData?.customSettings || {};
  
  const lineColor = customSettings.lineColor || '#2196F3';
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
  }, [selectedOverlayIds.length]);

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
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors group" title="Templates">
          <LayoutTemplate className="w-4 h-4 group-hover:text-indigo-500" />
        </button>
        
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
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors group relative mx-1" title="Text color">
          <Baseline className="w-4 h-4" />
          <div className="absolute bottom-1 left-2 right-2 h-0.5 bg-gray-400 rounded-full" />
        </button>

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
