import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Edit2 } from 'lucide-react';
import { DeleteIcon } from '@/features/chart-workspace/components/DrawingToolbar';

export interface DrawingTreeItemProps {
  id: string;
  name: string;
  label: string;
  icon: React.ReactNode;
  variant?: 'root' | 'folderChild';
  isSelected: boolean;
  isHovered: boolean;
  isLocked: boolean;
  isVisible: boolean;
  isDragOver: boolean;
  dragOverPosition: 'above' | 'below' | null;
  isRenaming: boolean;
  renameValue: string;
  renameInputRef: React.RefObject<HTMLInputElement>;
  onRenameValueChange: (val: string) => void;
  onFinishRename: (id: string, isFolder: boolean) => void;
  onCancelRename: () => void;
  onStartRename: (id: string, currentLabel: string) => void;
  onSelect: (e: React.MouseEvent, id: string) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: (id: string) => void;
  onToggleLock: (id: string, currentLocked: boolean) => void;
  onToggleVisible: (id: string, currentVisible: boolean) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string, type: 'drawing') => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
}

export const DrawingTreeItem: React.FC<DrawingTreeItemProps> = ({
  id,
  name: _name,
  label,
  icon,
  variant = 'root',
  isSelected,
  isHovered,
  isLocked,
  isVisible,
  isDragOver,
  dragOverPosition,
  isRenaming,
  renameValue,
  renameInputRef,
  onRenameValueChange,
  onFinishRename,
  onCancelRename,
  onStartRename,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  onToggleLock,
  onToggleVisible,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const containerPaddingClass =
    variant === 'folderChild'
      ? 'px-2 py-1 rounded-md'
      : 'px-2.5 py-1.5 rounded-lg';

  return (
    <div
      draggable={true}
      onDragStart={(e) => onDragStart(e, id, 'drawing')}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, id)}
      onClick={(e) => onSelect(e, id)}
      onMouseEnter={() => onMouseEnter(id)}
      onMouseLeave={() => onMouseLeave(id)}
      className={`group relative flex items-center justify-between border cursor-pointer transition-all ${containerPaddingClass} ${
        isSelected
          ? 'bg-accent-muted border-accent/30 text-txt-primary'
          : isHovered
          ? 'bg-surface-elevated border-border-def text-txt-primary'
          : 'border-transparent hover:bg-surface-hover text-txt-secondary'
      }`}
    >
      {/* Colored divider line representing the drop position */}
      {isDragOver && (
        <div
          className={`absolute left-0 right-0 h-0.5 bg-accent z-50 pointer-events-none ${
            dragOverPosition === 'above' ? '-top-[1.5px]' : '-bottom-[1.5px]'
          }`}
        />
      )}

      <div className="flex items-center gap-1.5 min-w-0">
        <span className="flex-shrink-0">
          {icon}
        </span>

        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onBlur={() => onFinishRename(id, false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onFinishRename(id, false);
              if (e.key === 'Escape') onCancelRename();
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-app-bg border border-accent rounded px-1.5 py-0.5 text-xs text-txt-primary outline-none w-28 font-normal"
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation();
              onStartRename(id, label);
            }}
            className="truncate text-[11px]"
          >
            {label}
          </span>
        )}
      </div>

      {/* Action buttons on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          title="Rename drawing"
          onClick={(e) => {
            e.stopPropagation();
            onStartRename(id, label);
          }}
          className="p-1 rounded text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          type="button"
          title={isLocked ? 'Unlock drawing' : 'Lock drawing'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock(id, isLocked);
          }}
          className={`p-1 rounded transition-colors ${
            isLocked
              ? 'text-accent hover:text-accent/80 bg-accent-muted'
              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
          }`}
        >
          {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
        </button>
        <button
          type="button"
          title={isVisible ? 'Hide drawing' : 'Show drawing'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisible(id, isVisible);
          }}
          className={`p-1 rounded transition-colors ${
            !isVisible
              ? 'text-yellow-450 hover:text-yellow-350 bg-yellow-500/10'
              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
          }`}
        >
          {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          title="Delete drawing"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          className="p-1 rounded text-txt-muted hover:text-status-error hover:bg-status-error/10 transition-colors"
        >
          <DeleteIcon className="w-3.5 h-3.5 text-current" />
        </button>
      </div>
    </div>
  );
};
