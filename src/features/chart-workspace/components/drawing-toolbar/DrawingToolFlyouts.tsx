import React from 'react';
import { ToolRegistry } from '@/framework/tools';
import { CURSOR_TOOLS } from './drawingToolbarTools';
import { WeakMagnetIcon, StrongMagnetIcon } from './DrawingToolbarIcons';

// ─── Cursor Menu Flyout ───────────────────────────────────────────────────────

export interface CursorMenuFlyoutProps {
  isOpen: boolean;
  position: { x: number; y: number };
  menuRef: React.RefObject<HTMLDivElement | null>;
  selectedCursorId: string;
  activeTool: string | null;
  onSelectCursor: (toolId: string) => void;
  renderFavoriteButton: (toolId: string) => React.ReactNode;
}

export const CursorMenuFlyout: React.FC<CursorMenuFlyoutProps> = ({
  isOpen,
  position,
  menuRef,
  selectedCursorId,
  activeTool,
  onSelectCursor,
  renderFavoriteButton,
}) => {
  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[260px] text-txt-secondary select-none"
      style={{
        left: `${position.x + 6}px`,
        top: `${position.y}px`,
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
            {section.toolIds.map((toolId) => {
              const tool = CURSOR_TOOLS.find((t) => t.id === toolId);
              if (!tool) return null;
              const ToolIcon = tool.icon;
              const isSelected = selectedCursorId === tool.id && (tool.id === 'eraser' ? activeTool === 'eraser' : !activeTool);
              return (
                <div
                  key={tool.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectCursor(tool.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectCursor(tool.id);
                    }
                  }}
                  className={`group flex items-center justify-between px-3.5 py-2 w-full text-left transition-colors cursor-pointer ${
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
                </div>
              );
            })}
          </div>
          {idx < arr.length - 1 && (
            <div className="border-t border-border-sub my-1"></div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Magnet Menu Flyout ───────────────────────────────────────────────────────

export interface MagnetMenuFlyoutProps {
  isOpen: boolean;
  position: { x: number; y: number };
  menuRef: React.RefObject<HTMLDivElement | null>;
  magnetMode: 'normal' | 'normal_magnet' | 'weak_magnet' | 'strong_magnet';
  onSelectMagnetMode: (mode: 'weak_magnet' | 'strong_magnet') => void;
}

export const MagnetMenuFlyout: React.FC<MagnetMenuFlyoutProps> = ({
  isOpen,
  position,
  menuRef,
  magnetMode,
  onSelectMagnetMode,
}) => {
  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[200px] text-txt-secondary select-none"
      style={{
        left: `${position.x + 6}px`,
        top: `${position.y}px`,
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
              onClick={() => onSelectMagnetMode(item.id as 'weak_magnet' | 'strong_magnet')}
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
  );
};

// ─── Text Menu Flyout ─────────────────────────────────────────────────────────

export interface TextMenuFlyoutProps {
  isOpen: boolean;
  position: { x: number; y: number };
  menuRef: React.RefObject<HTMLDivElement | null>;
  textTools: any[];
  selectedTextToolId: string;
  onSelectTextTool: (toolId: string) => void;
  renderFavoriteButton: (toolId: string) => React.ReactNode;
}

export const TextMenuFlyout: React.FC<TextMenuFlyoutProps> = ({
  isOpen,
  position,
  menuRef,
  textTools,
  selectedTextToolId,
  onSelectTextTool,
  renderFavoriteButton,
}) => {
  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[200px] text-txt-secondary select-none"
      style={{
        left: `${position.x + 6}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Header */}
      <div className="px-3.5 py-1.5 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
        Text
      </div>

      {/* Items */}
      <div className="flex flex-col">
        {textTools.map((tool) => {
          const ToolIcon = tool.icon;
          const isSelected = selectedTextToolId === tool.id;
          return (
            <div
              key={tool.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectTextTool(tool.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectTextTool(tool.id);
                }
              }}
              className={`group flex items-center justify-between px-3.5 py-1.5 w-full text-left transition-colors cursor-pointer ${
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
                  <ToolIcon className="w-5 h-5 text-current" />
                </span>
                <span className="text-xs">{tool.name}</span>
              </div>
              <div className="flex items-center gap-3.5">
                {renderFavoriteButton(tool.id)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Forecast Menu Flyout ─────────────────────────────────────────────────────

export interface ForecastMenuFlyoutProps {
  isOpen: boolean;
  position: { x: number; y: number };
  menuRef: React.RefObject<HTMLDivElement | null>;
  forecastTools: any[];
  selectedForecastToolId: string;
  onSelectForecastTool: (toolId: string) => void;
  renderFavoriteButton: (toolId: string) => React.ReactNode;
}

export const ForecastMenuFlyout: React.FC<ForecastMenuFlyoutProps> = ({
  isOpen,
  position,
  menuRef,
  forecastTools,
  selectedForecastToolId,
  onSelectForecastTool,
  renderFavoriteButton,
}) => {
  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[200px] text-txt-secondary select-none"
      style={{
        left: `${position.x + 6}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Section header */}
      <div className="px-3.5 py-1.5 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
        Forecasting
      </div>
      {forecastTools.map((tool) => {
        if (!tool) return null;
        const ToolIcon = tool.icon;
        const isSelected = selectedForecastToolId === tool.id;
        return (
          <div
            key={tool.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectForecastTool(tool.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectForecastTool(tool.id);
              }
            }}
            className={`group flex items-center justify-between px-3.5 py-1.5 w-full text-left transition-colors cursor-pointer ${
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
                <ToolIcon className="w-6 h-6 text-current" />
              </span>
              <span className="text-xs">{tool.name}</span>
            </div>
            <div className="flex items-center gap-3.5">
              {renderFavoriteButton(tool.id)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Line Menu Flyout ─────────────────────────────────────────────────────────

export interface LineMenuFlyoutProps {
  isOpen: boolean;
  position: { x: number; y: number };
  menuRef: React.RefObject<HTMLDivElement | null>;
  selectedLineToolId: string;
  onSelectLineTool: (toolId: string) => void;
  renderFavoriteButton: (toolId: string) => React.ReactNode;
}

export const LineMenuFlyout: React.FC<LineMenuFlyoutProps> = ({
  isOpen,
  position,
  menuRef,
  selectedLineToolId,
  onSelectLineTool,
  renderFavoriteButton,
}) => {
  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[260px] text-txt-secondary select-none"
      style={{
        left: `${position.x + 6}px`,
        top: `${position.y}px`,
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
              <div
                key={tool.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectLineTool(tool.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectLineTool(tool.id);
                  }
                }}
                className={`group flex items-center justify-between px-3.5 py-2 w-full text-left transition-colors cursor-pointer ${
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
              </div>
            );
          })}
      </div>
    </div>
  );
};

// ─── Shape Menu Flyout ────────────────────────────────────────────────────────

export interface ShapeMenuFlyoutProps {
  isOpen: boolean;
  position: { x: number; y: number };
  menuRef: React.RefObject<HTMLDivElement | null>;
  selectedShapeToolId: string;
  onSelectShapeTool: (toolId: string) => void;
  renderFavoriteButton: (toolId: string) => React.ReactNode;
}

const SHAPE_MENU_SECTIONS = [
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
];

export const ShapeMenuFlyout: React.FC<ShapeMenuFlyoutProps> = ({
  isOpen,
  position,
  menuRef,
  selectedShapeToolId,
  onSelectShapeTool,
  renderFavoriteButton,
}) => {
  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[260px] text-txt-secondary select-none"
      style={{
        left: `${position.x + 6}px`,
        top: `${position.y}px`,
      }}
    >
      {SHAPE_MENU_SECTIONS.map((section, idx, arr) => (
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
                <div
                  key={tool.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectShapeTool(tool.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectShapeTool(tool.id);
                    }
                  }}
                  className={`group flex items-center justify-between px-3.5 py-1.5 w-full text-left transition-colors cursor-pointer ${
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
                </div>
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
  );
};

