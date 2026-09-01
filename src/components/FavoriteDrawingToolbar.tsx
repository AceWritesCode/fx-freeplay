import React, { useState, useRef } from 'react';
import { GripVertical, Ruler, ZoomIn } from 'lucide-react';
import { ToolRegistry } from '@/framework/tools';
import { useDrawingStore } from '@/store';
import { CURSOR_TOOLS, TEXT_TOOLS } from '@/features/chart-workspace/components/drawingToolbarConstants';

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
  const favoriteTools = useDrawingStore((state) => state.favoriteTools) || [];
  const isFavoriteToolbarOpen = useDrawingStore((state) => state.isFavoriteToolbarOpen);
  const reorderFavoriteTools = useDrawingStore((state) => state.reorderFavoriteTools);

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

  // Free Dragging handler
  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const el = toolbarRef.current;
      const width = el?.offsetWidth || 200;
      const height = el?.offsetHeight || 38;

      const newX = Math.max(10, Math.min(window.innerWidth - width - 10, ev.clientX - dragOffsetRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - height - 10, ev.clientY - dragOffsetRef.current.y));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setPosition((curr) => {
        try {
          localStorage.setItem('fx_favorite_toolbar_pos', JSON.stringify(curr));
        } catch (_) {}
        return curr;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
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
          }
        },
      };
    }

    // 2. Text Tools
    const text = TEXT_TOOLS.find((t) => t.id === toolId);
    if (text) {
      const isSelected = activeTool === toolId;
      return {
        id: text.id,
        name: text.name,
        icon: text.icon,
        isActive: isSelected,
        onClick: () => {
          setSelectedTextToolId(toolId);
          if (activeTool === toolId) {
            cancelDrawingSession();
          } else {
            handleSelectTool(toolId);
          }
        },
      };
    }

    // 3. Special Tools
    if (toolId === 'measure') {
      return {
        id: 'measure',
        name: 'Measure',
        icon: Ruler,
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
        icon: ZoomIn,
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

    // 4. Registry Tools
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
      className="fixed z-50 flex items-center bg-modal-bg/95 backdrop-blur-sm border border-border-def rounded-lg shadow-2xl p-1 gap-0.5 select-none transition-shadow"
    >
      {/* Drag Grip Handle */}
      <div
        onMouseDown={handleDragStart}
        className="w-5 h-7 flex items-center justify-center text-txt-muted hover:text-txt-primary cursor-grab active:cursor-grabbing rounded hover:bg-surface-hover/50 transition-colors"
        title="Drag toolbar"
      >
        <GripVertical className="w-3.5 h-3.5" />
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
            className={`w-7 h-7 flex items-center justify-center rounded transition-all outline-none focus:outline-none cursor-pointer ${
              tool.isActive
                ? 'bg-accent-muted text-accent font-semibold shadow-xs'
                : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
            }`}
          >
            <span className="w-4 h-4 flex items-center justify-center text-current pointer-events-none">
              <ToolIcon className="w-full h-full text-current" />
            </span>
          </button>
        );
      })}

      {favoriteTools.length === 0 && (
        <span className="text-[11px] text-txt-muted px-2 py-0.5 whitespace-nowrap italic pointer-events-none">
          Star tools to add
        </span>
      )}
    </div>
  );
};
