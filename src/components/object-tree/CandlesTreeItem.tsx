import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface CandlesTreeItemProps {
  activeSymbol: string;
  activeTimeframe: string;
  isVisible: boolean;
  isDragOver: boolean;
  dragOverPosition: 'above' | 'below' | null;
  onToggleVisible: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export const CandlesTreeItem: React.FC<CandlesTreeItemProps> = ({
  activeSymbol,
  activeTimeframe,
  isVisible,
  isDragOver,
  dragOverPosition,
  onToggleVisible,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  return (
    <div
      key="candles"
      data-object-tree-candles="true"
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="group relative flex items-center justify-between px-2.5 py-1.5 border rounded-lg cursor-pointer transition-all border-transparent hover:bg-surface-hover text-xs font-semibold text-txt-secondary"
    >
      {isDragOver && (
        <div
          className={`absolute left-0 right-0 h-0.5 bg-accent z-50 pointer-events-none ${
            dragOverPosition === 'above' ? '-top-[1.5px]' : '-bottom-[1.5px]'
          }`}
        />
      )}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-accent flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="16" height="16" fill="currentColor">
            <path d="M17 11v6h3v-6h-3zm-.5-1h4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5z" />
            <path d="M18 7h1v3.5h-1zm0 10.5h1V21h-1z" />
            <path d="M9 8v12h3V8H9zm-.5-1h4a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5z" />
            <path d="M10 4h1v3.5h-1zm0 16.5h1V24h-1z" />
          </svg>
        </span>
        <span className="truncate">{activeSymbol} · {activeTimeframe} (Main Series)</span>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            title={isVisible ? 'Hide candles' : 'Show candles'}
            onClick={onToggleVisible}
            className={`p-1 rounded transition-colors ${
              !isVisible
                ? 'text-yellow-450 hover:text-yellow-350 bg-yellow-500/10'
                : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
            }`}
          >
            {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>

        <span className="text-[10px] text-txt-muted font-bold uppercase tracking-wider bg-surface-elevated/40 px-1.5 py-0.5 rounded border border-border-sub flex-shrink-0">
          Chart
        </span>
      </div>
    </div>
  );
};
