import React, { useState, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import { ToolRegistry } from '@/framework/tools';
import { useDrawingStore } from '@/store';
import { CURSOR_TOOLS, MeasureIcon, ZoomInIcon, ToolIconWrapper } from '@/features/chart-workspace/components/DrawingToolbar';

interface FavoriteDrawingToolbarProps {
  activeTool: string | null;
  selectedCursorId: string;
  setSelectedCursorId: (id: string) => void;
  setSelectedLineToolId: (id: string) => void;
  setSelectedShapeToolId: (id: string) => void;
  setSelectedTextToolId: (id: string) => void;
  setSelectedForecastToolId: (id: string) => void;
  handleSelectTool: (toolId: string) => void;
  cancelDrawingSession: () => void;
  setActiveTool: (toolId: string | null) => void;
}

export const FavoriteDrawingToolbar: React.FC<FavoriteDrawingToolbarProps> = ({
  activeTool,
  selectedCursorId,
  setSelectedCursorId,
  setSelectedLineToolId,
  setSelectedShapeToolId,
  setSelectedTextToolId,
  setSelectedForecastToolId,
  handleSelectTool,
  cancelDrawingSession,
  setActiveTool,
}) => {
  const { favoriteTools, isFavoriteToolbarOpen, reorderFavoriteTools } = useDrawingStore();

  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('fx_favorite_toolbar_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (_) {}
    return {
      x: typeof window !== 'undefined' ? Math.max(80, window.innerWidth / 2 - 200) : 300,
      y: 75,
    };
  });

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggedToolIndexRef = useRef<number | null>(null);
  const posRef = useRef<{ x: number; y: number }>(position);

  // Keep posRef in sync with committed React state
  posRef.current = position;

  // Free Dragging handler (Direct imperative DOM updates during drag to eliminate lag)
  const handleDragStart = (e: React.PointerEvent | React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDraggingRef.current = true;

    const el = toolbarRef.current;
    const cachedWidth = el?.offsetWidth || 200;
    const cachedHeight = el?.offsetHeight || 38;

    dragOffsetRef.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };

    const handlePointerMove = (ev: PointerEvent | MouseEvent) => {
      if (!isDraggingRef.current) return;

      const newX = Math.max(10, Math.min(window.innerWidth - cachedWidth - 10, ev.clientX - dragOffsetRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - cachedHeight - 10, ev.clientY - dragOffsetRef.current.y));

      posRef.current = { x: newX, y: newY };
      if (toolbarRef.current) {
        toolbarRef.current.style.left = `${newX}px`;
        toolbarRef.current.style.top = `${newY}px`;
      }
    };

    const handlePointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);

      const finalPos = posRef.current;
      setPosition(finalPos);
      try {
        localStorage.setItem('fx_favorite_toolbar_pos', JSON.stringify(finalPos));
      } catch (_) {}
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  // Reorder Item Handlers
  const handleItemDragStart = (index: number) => {
    draggedToolIndexRef.current = index;
  };

  const handleItemDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const draggedIndex = draggedToolIndexRef.current;
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newOrder = [...favoriteTools];
    const [movedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, movedItem);

    draggedToolIndexRef.current = targetIndex;
    reorderFavoriteTools(newOrder);
  };

  const handleItemDragEnd = () => {
    draggedToolIndexRef.current = null;
  };

  if (!isFavoriteToolbarOpen) return null;

  // Resolve Tool Definition
  const getToolInfo = (toolId: string) => {
    // 1. Cursor Tools
    const cursor = CURSOR_TOOLS.find((t) => t.id === toolId);
    if (cursor) {
      const isSelected =
        selectedCursorId === toolId && (toolId === 'eraser' ? activeTool === 'eraser' : !activeTool);
      return {
        id: cursor.id,
        name: cursor.name,
        icon: cursor.icon,
        isActive: isSelected,
        onClick: () => {
          setSelectedCursorId(toolId);
          if (toolId === 'eraser') {
            if (activeTool === 'eraser') {
              cancelDrawingSession();
            } else {
              setActiveTool('eraser');
            }
          } else {
            cancelDrawingSession();
            useDrawingStore.getState().setStayInDrawingMode(false);
          }
        },
      };
    }

    // 2. Special Tools
    if (toolId === 'measure') {
      return {
        id: 'measure',
        name: 'Measure',
        icon: MeasureIcon,
        isActive: activeTool === 'measure',
        onClick: () => {
          if (activeTool === 'measure') {
            setActiveTool(null);
          } else {
            handleSelectTool('measure');
          }
        },
      };
    }

    if (toolId === 'zoomIn') {
      return {
        id: 'zoomIn',
        name: 'Zoom in',
        icon: ZoomInIcon,
        isActive: activeTool === 'zoomIn',
        onClick: () => {
          if (activeTool === 'zoomIn') {
            setActiveTool(null);
          } else {
            handleSelectTool('zoomIn');
          }
        },
      };
    }

    // 3. Registry Tools (Lines, Shapes, Text, Forecast)
    const registered = ToolRegistry.get(toolId);
    if (registered) {
      const isSelected = activeTool === toolId;
      return {
        id: registered.id,
        name: registered.name,
        icon: registered.icon,
        isActive: isSelected,
        onClick: () => {
          if (registered.group === 'lines') setSelectedLineToolId(toolId);
          if (registered.group === 'shapes') setSelectedShapeToolId(toolId);
          if (registered.group === 'forecast') setSelectedForecastToolId(toolId);
          if (registered.group === 'text') setSelectedTextToolId(toolId);

          if (activeTool === toolId) {
            cancelDrawingSession();
          } else {
            handleSelectTool(toolId);
          }
        },
      };
    }

    return null;
  };

  return (
    <div
      ref={toolbarRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      data-floating-ui="true"
      className="fixed z-50 flex items-center bg-modal-bg/95 backdrop-blur-sm border border-border-def rounded-lg shadow-2xl p-0 gap-0.5 select-none"
    >
      {/* Drag Grip Handle */}
      <div
        onPointerDown={handleDragStart}
        onMouseDown={handleDragStart}
        className="flex items-center justify-center text-txt-muted hover:text-txt-primary cursor-grab active:cursor-grabbing rounded hover:bg-surface-hover/50 transition-colors flex-shrink-0 select-none box-border"
        style={{ width: '24px', height: '38px', minWidth: '24px', maxWidth: '24px', minHeight: '38px', maxHeight: '38px' }}
        title="Drag toolbar"
      >
        <GripVertical className="w-3.5 h-3.5 pointer-events-none" />
      </div>

      {/* Tool Items */}
      {favoriteTools.map((toolId, index) => {
        const tool = getToolInfo(toolId);
        if (!tool) return null;
        const ToolIcon = tool.icon;

        return (
          <button
            key={tool.id}
            draggable
            onDragStart={() => handleItemDragStart(index)}
            onDragOver={(e) => handleItemDragOver(e, index)}
            onDragEnd={handleItemDragEnd}
            onClick={tool.onClick}
            title={tool.name}
            className={`flex items-center justify-center rounded transition-all outline-none focus:outline-none cursor-pointer flex-shrink-0 select-none box-border ${
              tool.isActive
                ? 'bg-accent-muted text-accent font-semibold shadow-xs'
                : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
            }`}
            style={{ width: '38px', height: '38px', minWidth: '38px', maxWidth: '38px', minHeight: '38px', maxHeight: '38px' }}
          >
            <ToolIconWrapper>
              <ToolIcon className="w-full h-full text-current" />
            </ToolIconWrapper>
          </button>
        );
      })}

      {favoriteTools.length === 0 && (
        <span className="text-[11px] text-txt-muted px-2 py-0.5 whitespace-nowrap italic pointer-events-none flex items-center h-[38px] select-none">
          Star tools to add
        </span>
      )}
    </div>
  );
};
