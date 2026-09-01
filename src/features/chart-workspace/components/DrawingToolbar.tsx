import React, { useEffect } from 'react';
import { 
  Magnet, 
  Trash2,
  Ruler,
  ZoomIn,
  ZoomOut,
  Star,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ToolRegistry } from '@/framework/tools';
import { useDrawingStore } from '@/store';
import {
  TEXT_TOOLS,
  ToolIconWrapper,
  WeakMagnetIcon,
  StrongMagnetIcon,
  CURSOR_TOOLS,
} from './toolbarConstants';

export {
  TEXT_TOOLS,
  ToolIconWrapper,
  WeakMagnetIcon,
  StrongMagnetIcon,
  CURSOR_TOOLS,
};

interface DrawingToolbarProps {
  hasData: boolean;
  activeTool: string | null;
  setActiveTool: (tool: string | null) => void;
  cancelDrawingSession: () => void;
  selectedCursorId: string;
  setSelectedCursorId: (id: string) => void;
  isCursorMenuOpen: boolean;
  setIsCursorMenuOpen: (open: boolean) => void;
  cursorMenuPos: { x: number; y: number };
  setCursorMenuPos: (pos: { x: number; y: number }) => void;
  selectedLineToolId: string;
  setSelectedLineToolId: (id: string) => void;
  isLineMenuOpen: boolean;
  setIsLineMenuOpen: (open: boolean) => void;
  lineMenuPos: { x: number; y: number };
  setLineMenuPos: (pos: { x: number; y: number }) => void;
  selectedShapeToolId: string;
  setSelectedShapeToolId: (id: string) => void;
  isShapeMenuOpen: boolean;
  setIsShapeMenuOpen: (open: boolean) => void;
  shapeMenuPos: { x: number; y: number };
  setShapeMenuPos: (pos: { x: number; y: number }) => void;
  selectedTextToolId: string;
  setSelectedTextToolId: (id: string) => void;
  isTextMenuOpen: boolean;
  setIsTextMenuOpen: (open: boolean) => void;
  textMenuPos: { x: number; y: number };
  setTextMenuPos: (pos: { x: number; y: number }) => void;
  selectedForecastToolId: string;
  setSelectedForecastToolId: (id: string) => void;
  isForecastMenuOpen: boolean;
  setIsForecastMenuOpen: (open: boolean) => void;
  forecastMenuPos: { x: number; y: number };
  setForecastMenuPos: (pos: { x: number; y: number }) => void;
  magnetMode: 'normal' | 'normal_magnet' | 'weak_magnet' | 'strong_magnet';
  isMagnetMenuOpen: boolean;
  setIsMagnetMenuOpen: (open: boolean) => void;
  magnetMenuPos: { x: number; y: number };
  setMagnetMenuPos: (pos: { x: number; y: number }) => void;
  handleSelectTool: (toolName: string) => void;
  handleClearDrawings: () => void;
  handleToggleMagnet: () => void;
  selectMagnetMode: (mode: 'weak_magnet' | 'normal_magnet' | 'strong_magnet') => void;
  cursorMenuRef: React.RefObject<HTMLDivElement | null>;
  lineMenuRef: React.RefObject<HTMLDivElement | null>;
  shapeMenuRef: React.RefObject<HTMLDivElement | null>;
  textMenuRef: React.RefObject<HTMLDivElement | null>;
  forecastMenuRef: React.RefObject<HTMLDivElement | null>;
  magnetMenuRef: React.RefObject<HTMLDivElement | null>;
  canZoomOut?: boolean;
  handleZoomOut?: () => void;
  isAllDrawingsLocked?: boolean;
  isAllDrawingsHidden?: boolean;
  onToggleLockAll?: () => void;
  onToggleHideAll?: () => void;
  chartInstanceRef?: any;
  activeOverlayIdRef?: any;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = (props) => {
  const {
    hasData,
    activeTool,
    setActiveTool,
    cancelDrawingSession,
    selectedCursorId,
    setSelectedCursorId,
    isCursorMenuOpen,
    setIsCursorMenuOpen,
    cursorMenuPos,
    setCursorMenuPos,
    selectedLineToolId,
    setSelectedLineToolId,
    isLineMenuOpen,
    setIsLineMenuOpen,
    lineMenuPos,
    setLineMenuPos,
    selectedShapeToolId,
    setSelectedShapeToolId,
    isShapeMenuOpen,
    setIsShapeMenuOpen,
    shapeMenuPos,
    setShapeMenuPos,
    selectedTextToolId,
    setSelectedTextToolId,
    isTextMenuOpen,
    setIsTextMenuOpen,
    textMenuPos,
    setTextMenuPos,
    selectedForecastToolId,
    setSelectedForecastToolId,
    isForecastMenuOpen,
    setIsForecastMenuOpen,
    forecastMenuPos,
    setForecastMenuPos,
    magnetMode,
    isMagnetMenuOpen,
    setIsMagnetMenuOpen,
    magnetMenuPos,
    setMagnetMenuPos,
    handleSelectTool,
    handleClearDrawings,
    handleToggleMagnet,
    selectMagnetMode,
    canZoomOut,
    handleZoomOut,
    isAllDrawingsLocked = false,
    isAllDrawingsHidden = false,
    onToggleLockAll,
    onToggleHideAll,
    cursorMenuRef,
    lineMenuRef,
    shapeMenuRef,
    textMenuRef,
    forecastMenuRef,
    magnetMenuRef,
  } = props;

  const {
    favoriteTools,
    isFavoriteToolbarOpen,
    toggleFavoriteTool,
    setFavoriteToolbarOpen,
  } = useDrawingStore();

  const renderFavoriteButton = (toolId: string) => {
    const isFav = favoriteTools.includes(toolId);
    return (
      <button
        type="button"
        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavoriteTool(toolId);
        }}
        className="p-1 rounded hover:bg-surface-elevated transition-colors text-txt-muted flex items-center justify-center outline-none focus:outline-none"
      >
        <Star
          className={`w-3.5 h-3.5 transition-colors ${
            isFav ? 'fill-amber-400 text-amber-400' : 'text-txt-muted hover:text-amber-400'
          }`}
        />
      </button>
    );
  };

  const closeAllMenus = (except?: 'cursor' | 'line' | 'shape' | 'text' | 'forecast' | 'magnet') => {
    if (except !== 'cursor') setIsCursorMenuOpen(false);
    if (except !== 'line') setIsLineMenuOpen(false);
    if (except !== 'shape') setIsShapeMenuOpen(false);
    if (except !== 'text') setIsTextMenuOpen(false);
    if (except !== 'forecast') setIsForecastMenuOpen(false);
    if (except !== 'magnet') setIsMagnetMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        cursorMenuRef.current?.contains(target) ||
        lineMenuRef.current?.contains(target) ||
        shapeMenuRef.current?.contains(target) ||
        textMenuRef.current?.contains(target) ||
        forecastMenuRef.current?.contains(target) ||
        magnetMenuRef.current?.contains(target)
      ) {
        return;
      }
      closeAllMenus();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [
    cursorMenuRef,
    lineMenuRef,
    shapeMenuRef,
    textMenuRef,
    forecastMenuRef,
    magnetMenuRef,
    setIsCursorMenuOpen,
    setIsLineMenuOpen,
    setIsShapeMenuOpen,
    setIsTextMenuOpen,
    setIsForecastMenuOpen,
    setIsMagnetMenuOpen,
  ]);

  return (
    <aside className="w-[52px] bg-surface border-r border-border-def flex flex-col items-start pl-[4px] py-3 gap-3.5 z-40">
      
      {/* Grouped Cursor Tools: Select / Crosshair */}
      {(() => {
        const activeCursorTool = CURSOR_TOOLS.find(t => t.id === selectedCursorId) || CURSOR_TOOLS[0];
        const Icon = activeCursorTool.icon;
        const isGroupActive = activeCursorTool.id === 'eraser' ? activeTool === 'eraser' : !activeTool;
        return (
          <div className="relative flex items-center bg-transparent rounded-lg">
            <button
              title={activeCursorTool.name}
              aria-label={activeCursorTool.name}
              data-tooltip={activeCursorTool.name}
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                closeAllMenus();
                if (activeCursorTool.id === 'eraser') {
                  if (activeTool === 'eraser') {
                    setActiveTool(null);
                  } else {
                    setActiveTool('eraser');
                  }
                } else {
                  cancelDrawingSession();
                }
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isGroupActive
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '34px', height: '34px' }}
            >
              <ToolIconWrapper>
                <Icon className="w-full h-full text-current" />
              </ToolIconWrapper>
            </button>
            <button
              title="More cursor tools"
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setCursorMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isCursorMenuOpen;
                closeAllMenus('cursor');
                setIsCursorMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isCursorMenuOpen
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '12px', height: '34px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-2 h-2 text-current">
                <path d="M5.5 3L10.5 8L5.5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isCursorMenuOpen && (
              <div
                ref={cursorMenuRef}
                className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[260px] text-txt-secondary select-none"
                style={{
                  left: `${cursorMenuPos.x + 6}px`,
                  top: `${cursorMenuPos.y}px`,
                }}
              >
                {[
                  {
                    toolIds: ['cross', 'dot', 'arrow']
                  },
                  {
                    toolIds: ['eraser']
                  }
                ].map((section, idx, arr) => (
                  <div key={idx} className="flex flex-col">
                    <div className="flex flex-col">
                      {section.toolIds.map(toolId => {
                        const tool = CURSOR_TOOLS.find(t => t.id === toolId);
                        if (!tool) return null;
                        const ToolIcon = tool.icon;
                        const isSelected = selectedCursorId === tool.id && (tool.id === 'eraser' ? activeTool === 'eraser' : !activeTool);
                        return (
                          <button
                            key={tool.id}
                            onClick={() => {
                              setSelectedCursorId(tool.id);
                              if (tool.id === 'eraser') {
                                setActiveTool('eraser');
                              } else {
                                cancelDrawingSession();
                              }
                              closeAllMenus();
                            }}
                            className={`group flex items-center justify-between px-3.5 py-2 w-full text-left transition-colors ${
                              isSelected
                                ? 'bg-surface-elevated text-txt-primary font-medium'
                                : 'hover:bg-surface-hover text-txt-secondary'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 flex items-center justify-center rounded ${isSelected ? 'text-accent' : 'text-txt-muted group-hover:text-txt-primary'}`}>
                                <ToolIcon />
                              </span>
                              <span className="text-xs">{tool.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-3.5">
                              {renderFavoriteButton(tool.id)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="border-t border-border-sub my-1"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Grouped Drawing Tools: Lines */}
      {(() => {
        const activeLineTool = ToolRegistry.get(selectedLineToolId) || ToolRegistry.get('trendLine');
        if (!activeLineTool) return null;
        const Icon = activeLineTool.icon;
        const isGroupActive = activeTool && ToolRegistry.get(activeTool)?.group === 'lines';
        return (
          <div className="relative flex items-center bg-transparent rounded-lg">
            <button
              title={activeLineTool.name}
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                closeAllMenus();
                handleSelectTool(activeLineTool.id);
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isGroupActive
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '34px', height: '34px' }}
            >
              <ToolIconWrapper>
                <Icon className="w-full h-full text-current" />
              </ToolIconWrapper>
            </button>
            <button
              title="More line tools"
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setLineMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isLineMenuOpen;
                closeAllMenus('line');
                setIsLineMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isLineMenuOpen
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '12px', height: '34px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-2 h-2 text-current">
                <path d="M5.5 3L10.5 8L5.5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isLineMenuOpen && (
              <div
                ref={lineMenuRef}
                className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[260px] text-txt-secondary select-none"
                style={{
                  left: `${lineMenuPos.x + 6}px`,
                  top: `${lineMenuPos.y}px`,
                }}
              >
                {/* Header */}
                <div className="px-3.5 py-2 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
                  Lines
                </div>

                {/* Items */}
                <div className="flex flex-col">
                  {ToolRegistry.getAll()
                    .filter(tool => tool.group === 'lines')
                    .map(tool => {
                      const ToolIcon = tool.icon;
                      const isSelected = selectedLineToolId === tool.id;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setSelectedLineToolId(tool.id);
                            handleSelectTool(tool.id);
                            closeAllMenus();
                          }}
                          className={`group flex items-center justify-between px-3.5 py-2 w-full text-left transition-colors ${
                            isSelected
                              ? 'bg-surface-elevated text-txt-primary font-medium'
                              : 'hover:bg-surface-hover text-txt-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 flex items-center justify-center rounded ${isSelected ? 'text-accent' : 'text-txt-muted group-hover:text-txt-primary'}`}>
                              <ToolIcon className="w-6 h-6 text-current" />
                            </span>
                            <span className="text-xs">{tool.name}</span>
                          </div>
                          
                            <div className="flex items-center gap-3.5">
                              {tool.hotkey && (
                                <span className="text-[10px] text-txt-muted font-mono pr-1">
                                  {tool.hotkey}
                                </span>
                              )}
                              {renderFavoriteButton(tool.id)}
                            </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Grouped Drawing Tools: Shapes & Brushes */}
      {(() => {
        const activeShapeTool = ToolRegistry.get(selectedShapeToolId) || ToolRegistry.get('brush');
        if (!activeShapeTool) return null;
        const Icon = activeShapeTool.icon;
        const isGroupActive = activeTool && ToolRegistry.get(activeTool)?.group === 'shapes';
        return (
          <div className="relative flex items-center bg-transparent rounded-lg">
            <button
              title={activeShapeTool.name}
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                closeAllMenus();
                handleSelectTool(activeShapeTool.id);
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isGroupActive
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '34px', height: '34px' }}
            >
              <ToolIconWrapper>
                <Icon className="w-full h-full text-current" />
              </ToolIconWrapper>
            </button>
            <button
              title="More shapes & brushes"
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setShapeMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isShapeMenuOpen;
                closeAllMenus('shape');
                setIsShapeMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isShapeMenuOpen
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '12px', height: '34px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-2 h-2 text-current">
                <path d="M5.5 3L10.5 8L5.5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isShapeMenuOpen && (
              <div
                ref={shapeMenuRef}
                className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[260px] text-txt-secondary select-none"
                style={{
                  left: `${shapeMenuPos.x + 6}px`,
                  top: `${shapeMenuPos.y}px`,
                }}
              >
                {[
                  {
                    title: 'Brushes',
                    toolIds: ['brush', 'highlighter']
                  },
                  {
                    title: 'Arrows',
                    toolIds: ['arrow']
                  },
                  {
                    title: 'Shapes',
                    toolIds: ['rectangle', 'path', 'circle', 'curve']
                  }
                ].map((section, idx, arr) => (
                  <div key={section.title} className="flex flex-col">
                    {/* Section Header */}
                    <div className="px-3.5 py-1.5 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
                      {section.title}
                    </div>

                    {/* Section Tools */}
                    <div className="flex flex-col">
                      {section.toolIds.map(toolId => {
                        const tool = ToolRegistry.get(toolId);
                        if (!tool) return null;
                        const ToolIcon = tool.icon;
                        const isSelected = selectedShapeToolId === tool.id;
                        return (
                          <button
                            key={tool.id}
                            onClick={() => {
                              setSelectedShapeToolId(tool.id);
                              handleSelectTool(tool.id);
                              closeAllMenus();
                            }}
                            className={`group flex items-center justify-between px-3.5 py-1.5 w-full text-left transition-colors ${
                              isSelected
                                ? 'bg-surface-elevated text-txt-primary font-medium'
                                : 'hover:bg-surface-hover text-txt-secondary'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 flex items-center justify-center rounded ${isSelected ? 'text-accent' : 'text-txt-muted group-hover:text-txt-primary'}`}>
                                <ToolIcon className="w-6 h-6 text-current" />
                              </span>
                              <span className="text-xs">{tool.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-3.5">
                              {tool.hotkey && (
                                <span className="text-[10px] text-txt-muted font-mono pr-1">
                                  {tool.hotkey}
                                </span>
                              )}
                              {renderFavoriteButton(tool.id)}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Divider Line */}
                    {idx < arr.length - 1 && (
                      <div className="border-t border-border-sub my-1"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Grouped Drawing Tools: Text & Notes */}
      {(() => {
        const activeTextTool = TEXT_TOOLS.find(t => t.id === selectedTextToolId) || TEXT_TOOLS[0];
        const Icon = activeTextTool.icon;
        const isGroupActive = activeTool && (activeTool === 'text' || activeTool === 'note' || activeTool === 'table' || activeTool === 'callout');
        return (
          <div className="relative flex items-center bg-transparent rounded-lg">
            <button
              title={activeTextTool.name}
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                closeAllMenus();
                if (activeTextTool.id === 'text') {
                  handleSelectTool('text');
                }
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isGroupActive
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '34px', height: '34px' }}
            >
              <ToolIconWrapper>
                <Icon className="w-full h-full text-current" />
              </ToolIconWrapper>
            </button>
            <button
              title="More text & notes tools"
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setTextMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isTextMenuOpen;
                closeAllMenus('text');
                setIsTextMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isTextMenuOpen
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '12px', height: '34px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-2 h-2 text-current">
                <path d="M5.5 3L10.5 8L5.5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isTextMenuOpen && (
              <div
                ref={textMenuRef}
                className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[200px] text-txt-secondary select-none"
                style={{
                  left: `${textMenuPos.x + 6}px`,
                  top: `${textMenuPos.y}px`,
                }}
              >
                {/* Header */}
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
                  Text & Notes
                </div>

                {/* Items */}
                <div className="flex flex-col">
                  {TEXT_TOOLS.map(tool => {
                    const ToolIcon = tool.icon;
                    const isSelected = selectedTextToolId === tool.id;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => {
                          setSelectedTextToolId(tool.id);
                          if (tool.id === 'text') {
                            handleSelectTool('text');
                          }
                          closeAllMenus();
                        }}
                        className={`group flex items-center justify-between px-3.5 py-1.5 w-full text-left transition-colors ${
                          isSelected
                            ? 'bg-surface-elevated text-txt-primary font-medium'
                            : 'hover:bg-surface-hover text-txt-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 flex items-center justify-center rounded ${
                            isSelected ? 'text-accent' : 'text-txt-muted group-hover:text-txt-primary'
                          }`}>
                            <ToolIcon className="w-5 h-5 text-current" />
                          </span>
                          <span className="text-xs">{tool.name}</span>
                        </div>
                        <div className="flex items-center gap-3.5">
                          {renderFavoriteButton(tool.id)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Grouped Drawing Tools: Forecast (Long / Short position) */}
      {(() => {
        const activeForecastTool = ToolRegistry.get(selectedForecastToolId) || ToolRegistry.get('longPosition');
        if (!activeForecastTool) return null;
        const Icon = activeForecastTool.icon;
        const isGroupActive = activeTool && ToolRegistry.get(activeTool)?.group === 'forecast';
        return (
          <div className="relative flex items-center bg-transparent rounded-lg">
            <button
              title={activeForecastTool.name}
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                closeAllMenus();
                handleSelectTool(activeForecastTool.id);
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isGroupActive
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '34px', height: '34px' }}
            >
              <ToolIconWrapper>
                <Icon className="w-full h-full text-current" />
              </ToolIconWrapper>
            </button>
            <button
              title="More forecasting tools"
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setForecastMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isForecastMenuOpen;
                closeAllMenus('forecast');
                setIsForecastMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isForecastMenuOpen
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '12px', height: '34px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-2 h-2 text-current">
                <path d="M5.5 3L10.5 8L5.5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isForecastMenuOpen && (
              <div
                ref={forecastMenuRef}
                className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[200px] text-txt-secondary select-none"
                style={{
                  left: `${forecastMenuPos.x + 6}px`,
                  top: `${forecastMenuPos.y}px`,
                }}
              >
                {/* Section header */}
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
                  Forecasting
                </div>
                {(['longPosition', 'shortPosition'] as const).map(toolId => {
                  const tool = ToolRegistry.get(toolId);
                  if (!tool) return null;
                  const ToolIcon = tool.icon;
                  const isSelected = selectedForecastToolId === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setSelectedForecastToolId(tool.id);
                        handleSelectTool(tool.id);
                        closeAllMenus();
                      }}
                      className={`group flex items-center justify-between px-3.5 py-1.5 w-full text-left transition-colors ${
                        isSelected
                          ? 'bg-surface-elevated text-txt-primary font-medium'
                          : 'hover:bg-surface-hover text-txt-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 flex items-center justify-center rounded ${
                          isSelected ? 'text-accent' : 'text-txt-muted group-hover:text-txt-primary'
                        }`}>
                          <ToolIcon className="w-6 h-6 text-current" />
                        </span>
                        <span className="text-xs">{tool.name}</span>
                      </div>
                      <div className="flex items-center gap-3.5">
                        {renderFavoriteButton(tool.id)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Any other tools not in 'lines', 'shapes', or 'forecast' groups */}
      {ToolRegistry.getAll()
        .filter(tool => !tool.group)
        .map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              title={tool.name}
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                closeAllMenus();
                handleSelectTool(tool.id);
              }}
              className={`p-1.5 rounded-md border border-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isActive
                  ? 'bg-accent-muted text-accent'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '34px', height: '34px' }}
            >
              <ToolIconWrapper>
                <Icon className="w-full h-full text-current" />
              </ToolIconWrapper>
            </button>
          );
        })}

      {/* Divider 1: Separates Drawing Tools from Utilities */}
      <div className="w-[44px] flex items-center justify-center my-0.5">
        <div className="w-[30px] h-[1px] bg-border-sub/60" />
      </div>

      {/* --- GROUP 2: UTILITIES (Measure, Zoom In, Zoom Out) --- */}
      {/* Measure / Scale Tool */}
      <div className="w-[44px] flex items-center justify-center">
        <button
          title="Measure (Shift + Click & Drag)"
          aria-label="Measure"
          data-tooltip="Measure"
          disabled={!hasData}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeAllMenus();
            if (activeTool === 'measure') {
              setActiveTool(null);
            } else {
              handleSelectTool('measure');
            }
          }}
          className={`p-1.5 rounded-md border border-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
            activeTool === 'measure'
              ? 'bg-accent-muted text-accent'
              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
          }`}
          style={{ width: '34px', height: '34px' }}
        >
          <ToolIconWrapper>
            <Ruler className="w-full h-full text-current" />
          </ToolIconWrapper>
        </button>
      </div>

      {/* Zoom In Tool */}
      <div className="w-[44px] flex items-center justify-center">
        <button
          title="Zoom in"
          aria-label="Zoom in"
          data-tooltip="Zoom in"
          disabled={!hasData}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeAllMenus();
            if (activeTool === 'zoomIn') {
              setActiveTool(null);
            } else {
              handleSelectTool('zoomIn');
            }
          }}
          className={`p-1.5 rounded-md border border-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
            activeTool === 'zoomIn'
              ? 'bg-accent-muted text-accent'
              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
          }`}
          style={{ width: '34px', height: '34px' }}
        >
          <ToolIconWrapper>
            <ZoomIn className="w-full h-full text-current" />
          </ToolIconWrapper>
        </button>
      </div>

      {/* Zoom Out Tool (Appears when zoomed in) */}
      {canZoomOut && (
        <div className="w-[44px] flex items-center justify-center">
          <button
            title="Zoom out"
            aria-label="Zoom out"
            data-tooltip="Zoom out"
            disabled={!hasData}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              closeAllMenus();
              handleZoomOut?.();
            }}
            className="p-1.5 rounded-md border border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none"
            style={{ width: '34px', height: '34px' }}
          >
            <ToolIconWrapper>
              <ZoomOut className="w-full h-full text-current" />
            </ToolIconWrapper>
          </button>
        </div>
      )}

      {/* Divider 2: Separates Utilities from Action Tools */}
      <div className="w-[44px] flex items-center justify-center my-0.5">
        <div className="w-[30px] h-[1px] bg-border-sub/60" />
      </div>

      {/* --- GROUP 3: ACTION TOOLS (Magnet, Lock All, Hide All) --- */}
      {/* Magnet Tool with Dropdown Chevron */}
      {(() => {
        const isMagnetActive = magnetMode !== 'normal';
        return (
          <div className="relative flex items-center bg-transparent rounded-lg">
            <button
              title="Magnet Mode (Snap to OHLC)"
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                closeAllMenus();
                handleToggleMagnet();
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isMagnetActive
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '34px', height: '34px' }}
            >
              <ToolIconWrapper>
                {magnetMode === 'strong_magnet' && (
                  <StrongMagnetIcon className="w-full h-full text-current" />
                )}
                {magnetMode === 'weak_magnet' && (
                  <WeakMagnetIcon className="w-full h-full text-current" />
                )}
                {(magnetMode === 'normal_magnet' || magnetMode === 'normal') && (
                  <Magnet className="w-full h-full text-current" />
                )}
              </ToolIconWrapper>
            </button>
            <button
              title="More magnet options"
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setMagnetMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isMagnetMenuOpen;
                closeAllMenus('magnet');
                setIsMagnetMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isMagnetMenuOpen
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '12px', height: '34px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-2 h-2 text-current">
                <path d="M5.5 3L10.5 8L5.5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isMagnetMenuOpen && (
              <div
                ref={magnetMenuRef}
                className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[200px] text-txt-secondary select-none"
                style={{
                  left: `${magnetMenuPos.x + 6}px`,
                  top: `${magnetMenuPos.y}px`,
                }}
              >
                {/* Header */}
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
                  Magnet Mode
                </div>

                {/* Items */}
                <div className="flex flex-col">
                  {[
                    { id: 'weak_magnet', name: 'Weak Magnet', icon: WeakMagnetIcon },
                    { id: 'strong_magnet', name: 'Strong Magnet', icon: StrongMagnetIcon },
                  ].map((item) => {
                    const ItemIcon = item.icon;
                    const isSelected = magnetMode === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          selectMagnetMode(item.id as 'weak_magnet' | 'strong_magnet');
                          setIsMagnetMenuOpen(false);
                        }}
                        className={`group flex items-center justify-between px-3.5 py-1.5 w-full text-left transition-colors ${
                          isSelected
                            ? 'bg-surface-elevated text-txt-primary font-medium'
                            : 'hover:bg-surface-hover text-txt-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 flex items-center justify-center rounded ${
                              isSelected ? 'text-accent' : 'text-txt-muted group-hover:text-txt-primary'
                            }`}
                          >
                            <ItemIcon className="w-5 h-5 text-current" />
                          </span>
                          <span className="text-xs">{item.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Lock All Drawings */}
      <div className="w-[44px] flex items-center justify-center">
        <button
          title={isAllDrawingsLocked ? "Unlock all drawings" : "Lock all drawings"}
          aria-label="Lock all drawings"
          data-tooltip="Lock all drawings"
          disabled={!hasData}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeAllMenus();
            onToggleLockAll?.();
          }}
          className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
            isAllDrawingsLocked
              ? 'border-transparent bg-accent-muted text-accent'
              : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
          }`}
          style={{ width: '34px', height: '34px' }}
        >
          <ToolIconWrapper>
            {isAllDrawingsLocked ? (
              <Lock className="w-full h-full text-current" />
            ) : (
              <Unlock className="w-full h-full text-current" />
            )}
          </ToolIconWrapper>
        </button>
      </div>

      {/* Hide All Drawings */}
      <div className="w-[44px] flex items-center justify-center">
        <button
          title={isAllDrawingsHidden ? "Show all drawings" : "Hide all drawings"}
          aria-label="Hide all drawings"
          data-tooltip="Hide all drawings"
          disabled={!hasData}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeAllMenus();
            onToggleHideAll?.();
          }}
          className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
            isAllDrawingsHidden
              ? 'border-transparent bg-accent-muted text-accent'
              : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
          }`}
          style={{ width: '34px', height: '34px' }}
        >
          <ToolIconWrapper>
            {isAllDrawingsHidden ? (
              <EyeOff className="w-full h-full text-current" />
            ) : (
              <Eye className="w-full h-full text-current" />
            )}
          </ToolIconWrapper>
        </button>
      </div>

      {/* Divider 3: Separates Action Tools from Delete All Drawings */}
      <div className="w-[44px] flex items-center justify-center my-0.5">
        <div className="w-[30px] h-[1px] bg-border-sub/60" />
      </div>

      {/* --- GROUP 4: DELETE ALL DRAWINGS --- */}
      <div className="w-[44px] flex items-center justify-center">
        <button
          title="Delete all drawings"
          aria-label="Delete all drawings"
          data-tooltip="Delete all drawings"
          disabled={!hasData}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeAllMenus();
            handleClearDrawings();
          }}
          className="p-1.5 rounded-md border border-transparent text-txt-muted hover:text-status-error hover:bg-status-error/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none"
          style={{ width: '34px', height: '34px' }}
        >
          <ToolIconWrapper>
            <Trash2 className="w-full h-full text-current" />
          </ToolIconWrapper>
        </button>
      </div>

      {/* Bottom Sidebar: Favorite Drawing Tools Toolbar Toggle */}
      <div className="mt-auto w-[44px] flex items-center justify-center pt-2 pb-0.5">
        <button
          title="Favorite Drawing Tools Toolbar"
          aria-label="Favorite Drawing Tools Toolbar"
          data-tooltip="Favorite Drawing Tools Toolbar"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeAllMenus();
            setFavoriteToolbarOpen(!isFavoriteToolbarOpen);
          }}
          className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
            isFavoriteToolbarOpen
              ? 'bg-surface-elevated text-txt-primary border-border-def shadow-sm'
              : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
          }`}
          style={{ width: '34px', height: '34px' }}
        >
          <ToolIconWrapper>
            <Star className={`w-full h-full ${isFavoriteToolbarOpen ? 'fill-current text-txt-primary' : 'text-current'}`} />
          </ToolIconWrapper>
        </button>
      </div>
    </aside>
  );
};
