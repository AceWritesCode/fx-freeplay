import React, { useEffect } from 'react';
import { 
  Star,
} from 'lucide-react';
import { ToolRegistry } from '@/framework/tools';
import { useDrawingStore } from '@/store';

export * from './drawing-toolbar/DrawingToolbarIcons';
export * from './drawing-toolbar/drawingToolbarTools';

import {
  CURSOR_TOOLS,
} from './drawing-toolbar/drawingToolbarTools';

import {
  ToolIconWrapper,
  NormalMagnetIcon,
  WeakMagnetIcon,
  StrongMagnetIcon,
} from './drawing-toolbar/DrawingToolbarIcons';
import { DrawingToolbarHeader } from './drawing-toolbar/DrawingToolbarHeader';
import { DrawingToolbarGroupButton } from './drawing-toolbar/DrawingToolbarGroupButton';
import {
  CursorMenuFlyout,
  MagnetMenuFlyout,
  TextMenuFlyout,
  ForecastMenuFlyout,
  LineMenuFlyout,
  ShapeMenuFlyout,
} from './drawing-toolbar/DrawingToolFlyouts';
import {
  DrawingToolbarUtilityControls,
  DrawingToolbarActionControls,
} from './drawing-toolbar/DrawingToolbarActions';

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
  chartInstanceRef?: any;
  activeOverlayIdRef?: any;
  isAllDrawingsLocked?: boolean;
  handleToggleLockAllDrawings?: () => void;
  isAllDrawingsHidden?: boolean;
  handleToggleHideAllDrawings?: () => void;
  onNavigateHome?: () => void;
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
    cursorMenuRef,
    lineMenuRef,
    shapeMenuRef,
    textMenuRef,
    forecastMenuRef,
    magnetMenuRef,
    isAllDrawingsLocked: externalIsAllDrawingsLocked,
    handleToggleLockAllDrawings,
    isAllDrawingsHidden: externalIsAllDrawingsHidden,
    handleToggleHideAllDrawings,
    onNavigateHome,
  } = props;

  const [localIsAllDrawingsLocked, setLocalIsAllDrawingsLocked] = React.useState(false);
  const [localIsAllDrawingsHidden, setLocalIsAllDrawingsHidden] = React.useState(false);

  const [isHubMenuOpen, setIsHubMenuOpen] = React.useState(false);
  const [hubMenuPos, setHubMenuPos] = React.useState({ x: 0, y: 0 });
  const hubMenuRef = React.useRef<HTMLDivElement>(null);

  const isAllDrawingsLocked = externalIsAllDrawingsLocked ?? localIsAllDrawingsLocked;
  const isAllDrawingsHidden = externalIsAllDrawingsHidden ?? localIsAllDrawingsHidden;

  const {
    favoriteTools,
    isFavoriteToolbarOpen,
    toggleFavoriteTool,
    setFavoriteToolbarOpen,
    isStayInDrawingMode,
    setStayInDrawingMode,
  } = useDrawingStore();

  const renderFavoriteButton = (toolId: string) => {
    const isFav = favoriteTools.includes(toolId);
    return (
      <button
        type="button"
        title={isFav ? "Remove from quick access" : "Add to quick access"}
        aria-label={isFav ? "Remove from quick access" : "Add to quick access"}
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

  const closeAllMenus = (except?: 'hub' | 'cursor' | 'line' | 'shape' | 'text' | 'forecast' | 'magnet') => {
    if (except !== 'hub') setIsHubMenuOpen(false);
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
        hubMenuRef.current?.contains(target) ||
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
    <aside className="w-[52px] bg-surface border-r border-border-def flex flex-col items-start pl-[8px] py-2 gap-1 z-40 overflow-y-auto overflow-x-hidden select-none">
      
      <DrawingToolbarHeader
        isHubMenuOpen={isHubMenuOpen}
        hubMenuPos={hubMenuPos}
        hubMenuRef={hubMenuRef}
        onNavigateHome={onNavigateHome}
        onOpenHubMenu={(rect) => {
          setHubMenuPos({ x: rect.right, y: rect.top });
          const nextState = !isHubMenuOpen;
          closeAllMenus('hub');
          setIsHubMenuOpen(nextState);
        }}
        onCloseAllMenus={() => closeAllMenus()}
      />

      {/* Grouped Cursor Tools: Select / Crosshair */}
      {(() => {
        const activeCursorTool = CURSOR_TOOLS.find(t => t.id === selectedCursorId) || CURSOR_TOOLS[0];
        const Icon = activeCursorTool.icon;
        const isGroupActive = activeCursorTool.id === 'eraser' ? activeTool === 'eraser' : !activeTool;
        return (
          <DrawingToolbarGroupButton
            title={activeCursorTool.name}
            chevronTitle="More cursor tools"
            disabled={!hasData}
            isGroupActive={isGroupActive}
            isMenuOpen={isCursorMenuOpen}
            icon={<Icon className="w-full h-full text-current" />}
            onMainClick={() => {
              closeAllMenus();
              if (activeCursorTool.id === 'eraser') {
                if (activeTool === 'eraser') {
                  setActiveTool(null);
                } else {
                  setActiveTool('eraser');
                }
              } else {
                cancelDrawingSession();
                setStayInDrawingMode(false);
              }
            }}
            onChevronClick={(rect) => {
              setCursorMenuPos({ x: rect.right, y: rect.top });
              const nextState = !isCursorMenuOpen;
              closeAllMenus('cursor');
              setIsCursorMenuOpen(nextState);
            }}
          >
            <CursorMenuFlyout
              isOpen={isCursorMenuOpen}
              position={cursorMenuPos}
              menuRef={cursorMenuRef}
              selectedCursorId={selectedCursorId}
              activeTool={activeTool}
              onSelectCursor={(toolId) => {
                setSelectedCursorId(toolId);
                if (toolId === 'eraser') {
                  setActiveTool('eraser');
                } else {
                  cancelDrawingSession();
                  setStayInDrawingMode(false);
                }
                closeAllMenus();
              }}
              renderFavoriteButton={renderFavoriteButton}
            />
          </DrawingToolbarGroupButton>
        );
      })()}

      {/* Grouped Drawing Tools: Lines */}
      {(() => {
        const activeLineTool = ToolRegistry.get(selectedLineToolId) || ToolRegistry.get('trendLine');
        if (!activeLineTool) return null;
        const Icon = activeLineTool.icon;
        const isGroupActive = activeTool && ToolRegistry.get(activeTool)?.group === 'lines';
        return (
          <DrawingToolbarGroupButton
            title={activeLineTool.name}
            chevronTitle="More line tools"
            disabled={!hasData}
            isGroupActive={!!isGroupActive}
            isMenuOpen={isLineMenuOpen}
            icon={<Icon className="w-full h-full text-current" />}
            onMainClick={() => {
              closeAllMenus();
              handleSelectTool(activeLineTool.id);
            }}
            onChevronClick={(rect) => {
              setLineMenuPos({ x: rect.right, y: rect.top });
              const nextState = !isLineMenuOpen;
              closeAllMenus('line');
              setIsLineMenuOpen(nextState);
            }}
          >
            <LineMenuFlyout
              isOpen={isLineMenuOpen}
              position={lineMenuPos}
              menuRef={lineMenuRef}
              selectedLineToolId={selectedLineToolId}
              onSelectLineTool={(toolId) => {
                setSelectedLineToolId(toolId);
                handleSelectTool(toolId);
                closeAllMenus();
              }}
              renderFavoriteButton={renderFavoriteButton}
            />
          </DrawingToolbarGroupButton>
        );
      })()}

      {/* Grouped Drawing Tools: Shapes & Brushes */}
      {(() => {
        const activeShapeTool = ToolRegistry.get(selectedShapeToolId) || ToolRegistry.get('brush');
        if (!activeShapeTool) return null;
        const Icon = activeShapeTool.icon;
        const isGroupActive = activeTool && ToolRegistry.get(activeTool)?.group === 'shapes';
        return (
          <DrawingToolbarGroupButton
            title={activeShapeTool.name}
            chevronTitle="More shapes & brushes"
            disabled={!hasData}
            isGroupActive={!!isGroupActive}
            isMenuOpen={isShapeMenuOpen}
            icon={<Icon className="w-full h-full text-current" />}
            onMainClick={() => {
              closeAllMenus();
              handleSelectTool(activeShapeTool.id);
            }}
            onChevronClick={(rect) => {
              setShapeMenuPos({ x: rect.right, y: rect.top });
              const nextState = !isShapeMenuOpen;
              closeAllMenus('shape');
              setIsShapeMenuOpen(nextState);
            }}
          >
            <ShapeMenuFlyout
              isOpen={isShapeMenuOpen}
              position={shapeMenuPos}
              menuRef={shapeMenuRef}
              selectedShapeToolId={selectedShapeToolId}
              onSelectShapeTool={(toolId) => {
                setSelectedShapeToolId(toolId);
                handleSelectTool(toolId);
                closeAllMenus();
              }}
              renderFavoriteButton={renderFavoriteButton}
            />
          </DrawingToolbarGroupButton>
        );
      })()}

      {/* Grouped Drawing Tools: Text */}
      {(() => {
        const textTools = ToolRegistry.getAll().filter(tool => tool.group === 'text');
        const activeTextTool = ToolRegistry.get(selectedTextToolId) || textTools[0] || ToolRegistry.get('text');
        if (!activeTextTool) return null;
        const Icon = activeTextTool.icon;
        const isGroupActive = activeTool && ToolRegistry.get(activeTool)?.group === 'text';
        return (
          <DrawingToolbarGroupButton
            title={activeTextTool.name}
            chevronTitle="More text tools"
            disabled={!hasData}
            isGroupActive={!!isGroupActive}
            isMenuOpen={isTextMenuOpen}
            icon={<Icon className="w-full h-full text-current" />}
            onMainClick={() => {
              closeAllMenus();
              handleSelectTool(activeTextTool.id);
            }}
            onChevronClick={(rect) => {
              setTextMenuPos({ x: rect.right, y: rect.top });
              const nextState = !isTextMenuOpen;
              closeAllMenus('text');
              setIsTextMenuOpen(nextState);
            }}
          >
            <TextMenuFlyout
              isOpen={isTextMenuOpen}
              position={textMenuPos}
              menuRef={textMenuRef}
              textTools={textTools}
              selectedTextToolId={selectedTextToolId}
              onSelectTextTool={(toolId) => {
                setSelectedTextToolId(toolId);
                handleSelectTool(toolId);
                closeAllMenus();
              }}
              renderFavoriteButton={renderFavoriteButton}
            />
          </DrawingToolbarGroupButton>
        );
      })()}

      {/* Grouped Drawing Tools: Forecast (Long / Short position) */}
      {(() => {
        const activeForecastTool = ToolRegistry.get(selectedForecastToolId) || ToolRegistry.get('longPosition');
        if (!activeForecastTool) return null;
        const Icon = activeForecastTool.icon;
        const isGroupActive = activeTool && ToolRegistry.get(activeTool)?.group === 'forecast';
        return (
          <DrawingToolbarGroupButton
            title={activeForecastTool.name}
            chevronTitle="More forecasting tools"
            disabled={!hasData}
            isGroupActive={!!isGroupActive}
            isMenuOpen={isForecastMenuOpen}
            icon={<Icon className="w-full h-full text-current" />}
            onMainClick={() => {
              closeAllMenus();
              handleSelectTool(activeForecastTool.id);
            }}
            onChevronClick={(rect) => {
              setForecastMenuPos({ x: rect.right, y: rect.top });
              const nextState = !isForecastMenuOpen;
              closeAllMenus('forecast');
              setIsForecastMenuOpen(nextState);
            }}
          >
            <ForecastMenuFlyout
              isOpen={isForecastMenuOpen}
              position={forecastMenuPos}
              menuRef={forecastMenuRef}
              forecastTools={(['longPosition', 'shortPosition'] as const).map(id => ToolRegistry.get(id)).filter(Boolean)}
              selectedForecastToolId={selectedForecastToolId}
              onSelectForecastTool={(toolId) => {
                setSelectedForecastToolId(toolId);
                handleSelectTool(toolId);
                closeAllMenus();
              }}
              renderFavoriteButton={renderFavoriteButton}
            />
          </DrawingToolbarGroupButton>
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
              className={`rounded-md border border-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isActive
                  ? 'bg-accent-muted text-accent'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '33px', height: '33px' }}
            >
              <ToolIconWrapper>
                <Icon className="w-full h-full text-current" />
              </ToolIconWrapper>
            </button>
          );
        })}

      <DrawingToolbarUtilityControls
        hasData={hasData}
        activeTool={activeTool}
        onSelectTool={handleSelectTool}
        onClearActiveTool={() => setActiveTool(null)}
        canZoomOut={canZoomOut}
        onZoomOut={handleZoomOut}
        closeAllMenus={closeAllMenus}
      />

      {/* --- ACTION TOOLS GROUP (Magnet, Stay in Drawing Mode, Lock All, Hide All) --- */}
      {/* Magnet Tool with Dropdown Chevron */}
      {(() => {
        const isMagnetActive = magnetMode !== 'normal';
        return (
          <DrawingToolbarGroupButton
            title="Magnet Mode (Snap to OHLC)"
            chevronTitle="More magnet options"
            disabled={!hasData}
            isGroupActive={isMagnetActive}
            isMenuOpen={isMagnetMenuOpen}
            icon={
              <>
                {magnetMode === 'strong_magnet' && (
                  <StrongMagnetIcon className="w-full h-full text-current" />
                )}
                {magnetMode === 'weak_magnet' && (
                  <WeakMagnetIcon className="w-full h-full text-current" />
                )}
                {(magnetMode === 'normal_magnet' || magnetMode === 'normal') && (
                  <NormalMagnetIcon className="w-full h-full text-current" />
                )}
              </>
            }
            onMainClick={() => {
              closeAllMenus();
              handleToggleMagnet();
            }}
            onChevronClick={(rect) => {
              setMagnetMenuPos({ x: rect.right, y: rect.top });
              const nextState = !isMagnetMenuOpen;
              closeAllMenus('magnet');
              setIsMagnetMenuOpen(nextState);
            }}
          >
            <MagnetMenuFlyout
              isOpen={isMagnetMenuOpen}
              position={magnetMenuPos}
              menuRef={magnetMenuRef}
              magnetMode={magnetMode}
              onSelectMagnetMode={(mode) => {
                selectMagnetMode(mode);
                setIsMagnetMenuOpen(false);
              }}
            />
          </DrawingToolbarGroupButton>
        );
      })()}

      <DrawingToolbarActionControls
        hasData={hasData}
        isStayInDrawingMode={isStayInDrawingMode}
        onToggleStayInDrawingMode={() => setStayInDrawingMode(!isStayInDrawingMode)}
        isAllDrawingsLocked={isAllDrawingsLocked}
        onToggleLockAllDrawings={() => {
          if (handleToggleLockAllDrawings) {
            handleToggleLockAllDrawings();
          } else {
            setLocalIsAllDrawingsLocked(!isAllDrawingsLocked);
          }
        }}
        isAllDrawingsHidden={isAllDrawingsHidden}
        onToggleHideAllDrawings={() => {
          if (handleToggleHideAllDrawings) {
            handleToggleHideAllDrawings();
          } else {
            setLocalIsAllDrawingsHidden(!isAllDrawingsHidden);
          }
        }}
        onClearDrawings={handleClearDrawings}
        isFavoriteToolbarOpen={isFavoriteToolbarOpen}
        onToggleFavoriteToolbar={() => setFavoriteToolbarOpen(!isFavoriteToolbarOpen)}
        closeAllMenus={closeAllMenus}
      />
    </aside>
  );
};
