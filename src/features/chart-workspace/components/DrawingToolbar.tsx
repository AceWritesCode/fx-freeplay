import React, { useEffect } from 'react';
import { 
  Magnet, 
  Trash2,
  Type,
  FileText,
  Table as TableIcon,
  MessageSquare
} from 'lucide-react';
import { ToolRegistry } from '@/framework/tools';

export const TEXT_TOOLS = [
  {
    id: 'text',
    name: 'Text',
    icon: Type,
  },
  {
    id: 'note',
    name: 'Note',
    icon: FileText,
  },
  {
    id: 'table',
    name: 'Table',
    icon: TableIcon,
  },
  {
    id: 'callout',
    name: 'Callout',
    icon: MessageSquare,
  },
];

export const ToolIconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="w-[22px] h-[22px] flex items-center justify-center flex-shrink-0 text-current pointer-events-none select-none">
    {children}
  </span>
);

export const WeakMagnetIcon = ({ className = "w-full h-full", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 16V10a6 6 0 0 1 12 0v6" />
    <path d="M10 16V10a2 2 0 0 1 4 0v6" />
    <path d="M6 16h4" />
    <path d="M14 16h4" />
    <path d="M6 13h4" />
    <path d="M14 13h4" />
  </svg>
);

export const StrongMagnetIcon = ({ className = "w-full h-full", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    className={className}
    style={style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 13V9a6 6 0 0 1 12 0v4" />
    <path d="M10 13V9a2 2 0 0 1 4 0v4" />
    <path d="M6 13h4" />
    <path d="M14 13h4" />
    <path d="M6 11h4" />
    <path d="M14 11h4" />
    <path d="M7 16l.5 1.5l-.5 1.5" />
    <path d="M9 16l.5 1.5l-.5 1.5" />
    <path d="M15 16l.5 1.5l-.5 1.5" />
    <path d="M17 16l.5 1.5l-.5 1.5" />
  </svg>
);

export const CURSOR_TOOLS = [
  {
    id: 'cross',
    name: 'Cross',
    icon: ({ className = "w-full h-full text-current" }: { className?: string } = {}) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
        <g fill="currentColor">
          <path d="M18 15h8v-1h-8z"></path>
          <path d="M14 18v8h1v-8zM14 3v8h1v-8zM3 15h8v-1h-8z"></path>
        </g>
      </svg>
    )
  },
  {
    id: 'dot',
    name: 'Dot',
    icon: ({ className = "w-full h-full text-current" }: { className?: string } = {}) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
        <circle fill="currentColor" cx="14" cy="14" r="3"></circle>
      </svg>
    )
  },
  {
    id: 'arrow',
    name: 'Arrow',
    icon: ({ className = "w-full h-full text-current" }: { className?: string } = {}) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
        <path fill="currentColor" d="M11.682 16.09l3.504 6.068 1.732-1-3.497-6.057 3.595-2.1L8 7.74v10.512l3.682-2.163zm-.362 1.372L7 20V6l12 7-4.216 2.462 3.5 6.062-3.464 2-3.5-6.062z"></path>
      </svg>
    )
  },
  {
    id: 'eraser',
    name: 'Eraser',
    icon: ({ className = "w-full h-full text-current" }: { className?: string } = {}) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 31" className={className}>
        <g fill="currentColor" fillRule="nonzero">
          <path d="M15.3 22l8.187-8.187c.394-.394.395-1.028.004-1.418l-4.243-4.243c-.394-.394-1.019-.395-1.407-.006l-11.325 11.325c-.383.383-.383 1.018.007 1.407l1.121 1.121h7.656zm-9.484-.414c-.781-.781-.779-2.049-.007-2.821l11.325-11.325c.777-.777 2.035-.78 2.821.006l4.243 4.243c.781.781.78 2.048-.004 2.832l-8.48 8.48h-8.484l-1.414-1.414z"></path>
          <path d="M13.011 22.999h7.999v-1h-7.999zM13.501 11.294l6.717 6.717.707-.707-6.717-6.717z"></path>
        </g>
      </svg>
    )
  }
];

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
    cursorMenuRef,
    lineMenuRef,
    shapeMenuRef,
    textMenuRef,
    forecastMenuRef,
    magnetMenuRef,
  } = props;

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
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center ${
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
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setCursorMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isCursorMenuOpen;
                closeAllMenus('cursor');
                setIsCursorMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center ${
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
                              <span className="text-txt-muted hover:text-amber-500 transition-colors">
                                <svg className="w-4 h-4 fill-current text-amber-500" viewBox="0 0 18 18">
                                  <path d="M9 1l2.35 4.76 5.26.77-3.8 3.7.9 5.24L9 13l-4.7 2.47.9-5.23-3.8-3.71 5.25-.77L9 1z" />
                                </svg>
                              </span>
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
              onClick={() => {
                closeAllMenus();
                handleSelectTool(activeLineTool.id);
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center ${
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
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setLineMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isLineMenuOpen;
                closeAllMenus('line');
                setIsLineMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center ${
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
                            <span className="text-txt-muted hover:text-amber-500 transition-colors">
                              <svg className="w-4 h-4 fill-current text-amber-500" viewBox="0 0 18 18">
                                <path d="M9 1l2.35 4.76 5.26.77-3.8 3.7.9 5.24L9 13l-4.7 2.47.9-5.23-3.8-3.71 5.25-.77L9 1z" />
                              </svg>
                            </span>
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
              onClick={() => {
                closeAllMenus();
                handleSelectTool(activeShapeTool.id);
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center ${
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
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setShapeMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isShapeMenuOpen;
                closeAllMenus('shape');
                setIsShapeMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center ${
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
                              <span className="text-txt-muted hover:text-amber-500 transition-colors">
                                <svg className="w-4 h-4 fill-current text-amber-500" viewBox="0 0 18 18">
                                  <path d="M9 1l2.35 4.76 5.26.77-3.8 3.7.9 5.24L9 13l-4.7 2.47.9-5.23-3.8-3.71 5.25-.77L9 1z" />
                                </svg>
                              </span>
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
              onClick={() => {
                closeAllMenus();
                if (activeTextTool.id === 'text') {
                  handleSelectTool('text');
                }
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center ${
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
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setTextMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isTextMenuOpen;
                closeAllMenus('text');
                setIsTextMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center ${
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
              onClick={() => {
                closeAllMenus();
                handleSelectTool(activeForecastTool.id);
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center ${
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
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setForecastMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isForecastMenuOpen;
                closeAllMenus('forecast');
                setIsForecastMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center ${
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
              onClick={() => {
                closeAllMenus();
                handleSelectTool(tool.id);
              }}
              className={`p-1.5 rounded-md border border-transparent transition-all flex items-center justify-center ${
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

      <button
        title="Clear Drawings"
        disabled={!hasData}
        onClick={() => {
          closeAllMenus();
          handleClearDrawings();
        }}
        className="p-1.5 rounded-md border border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center justify-center"
        style={{ width: '34px', height: '34px' }}
      >
        <ToolIconWrapper>
          <Trash2 className="w-full h-full text-current" />
        </ToolIconWrapper>
      </button>

      <div className="relative">
        <button
          title="Magnet Mode (Snap to OHLC) — right-click for options"
          disabled={!hasData}
          onClick={() => {
            closeAllMenus();
            handleToggleMagnet();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            if (!hasData) return;
            const rect = e.currentTarget.getBoundingClientRect();
            setMagnetMenuPos({ x: rect.right, y: rect.top });
            const nextState = !isMagnetMenuOpen;
            closeAllMenus('magnet');
            setIsMagnetMenuOpen(nextState);
          }}
          className={`p-1.5 rounded-md border border-transparent transition-all flex items-center justify-center ${
            magnetMode !== 'normal'
              ? 'bg-accent-muted text-accent'
              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
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

        {isMagnetMenuOpen && (
          <div
            ref={magnetMenuRef}
            className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1.5 text-sm min-w-[170px] text-txt-secondary select-none"
            style={{
              left: `${magnetMenuPos.x + 6}px`,
              top: `${magnetMenuPos.y}px`,
            }}
          >
            <button
              onClick={() => {
                selectMagnetMode('weak_magnet');
                setIsMagnetMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer ${
                magnetMode === 'weak_magnet'
                  ? 'bg-accent-muted text-accent font-medium'
                  : 'text-txt-secondary hover:bg-surface-hover hover:text-txt-primary'
              }`}
            >
              <WeakMagnetIcon style={{ width: '20px', height: '20px' }} className={magnetMode === 'weak_magnet' ? 'text-accent' : 'text-txt-muted'} />
              <span>Weak magnet</span>
            </button>
            <button
              onClick={() => {
                selectMagnetMode('normal_magnet');
                setIsMagnetMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer ${
                magnetMode === 'normal_magnet'
                  ? 'bg-accent-muted text-accent font-medium'
                  : 'text-txt-secondary hover:bg-surface-hover hover:text-txt-primary'
              }`}
            >
              <Magnet style={{ width: '20px', height: '20px' }} className={magnetMode === 'normal_magnet' ? 'text-accent' : 'text-txt-muted'} />
              <span>Normal magnet</span>
            </button>
            <button
              onClick={() => {
                selectMagnetMode('strong_magnet');
                setIsMagnetMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors cursor-pointer ${
                magnetMode === 'strong_magnet'
                  ? 'bg-accent-muted text-accent font-medium'
                  : 'text-txt-secondary hover:bg-surface-hover hover:text-txt-primary'
              }`}
            >
              <StrongMagnetIcon style={{ width: '20px', height: '20px' }} className={magnetMode === 'strong_magnet' ? 'text-accent' : 'text-txt-muted'} />
              <span>Strong magnet</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
