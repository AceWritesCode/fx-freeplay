import React from 'react';
import { Folder, FolderOpen, Eye, EyeOff, Lock, Unlock, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import { DeleteIcon } from '@/features/chart-workspace/components/DrawingToolbar';

export interface FolderTreeItemProps {
  id: string;
  name: string;
  isCollapsed: boolean;
  isLocked: boolean;
  isVisible: boolean;
  childCount: number;
  isSelected: boolean;
  isActiveFolder: boolean;
  isDragOverFolder: boolean;
  isDragOverItem: boolean;
  dragOverPosition: 'above' | 'below' | null;
  isDragging: boolean;
  isRenaming: boolean;
  renameValue: string;
  renameInputRef: React.RefObject<HTMLInputElement>;
  onRenameValueChange: (val: string) => void;
  onFinishRename: (id: string, isFolder: boolean) => void;
  onCancelRename: () => void;
  onStartRename: (id: string, currentName: string) => void;
  onToggleCollapse: (e: React.MouseEvent) => void;
  onClick: () => void;
  onToggleLock: (e: React.MouseEvent) => void;
  onToggleVisible: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOverFolder: (e: React.DragEvent) => void;
  onDragLeaveFolder: () => void;
  onDropOnFolder: (e: React.DragEvent) => void;
  children?: React.ReactNode;
}

export const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  id,
  name,
  isCollapsed,
  isLocked,
  isVisible,
  childCount,
  isSelected,
  isActiveFolder,
  isDragOverFolder,
  isDragOverItem,
  dragOverPosition,
  isDragging,
  isRenaming,
  renameValue,
  renameInputRef,
  onRenameValueChange,
  onFinishRename,
  onCancelRename,
  onStartRename,
  onToggleCollapse,
  onClick,
  onToggleLock,
  onToggleVisible,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOverFolder,
  onDragLeaveFolder,
  onDropOnFolder,
  children,
}) => {
  return (
    <div className="flex flex-col border border-transparent rounded-lg">
      {/* Folder Item Header */}
      <div
        data-object-tree-folder={id}
        draggable={true}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOverFolder}
        onDragLeave={onDragLeaveFolder}
        onDrop={onDropOnFolder}
        onClick={onClick}
        className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg border cursor-pointer transition-all ${
          isSelected
            ? 'bg-accent-muted border-accent/30 text-txt-primary'
            : isActiveFolder
            ? 'bg-status-success/10 border-status-success/30 text-txt-primary'
            : isDragOverFolder
            ? 'bg-accent-muted border-accent/50 text-txt-primary'
            : 'border-transparent hover:bg-surface-hover text-txt-secondary'
        }`}
      >
        {/* Colored divider line representing the drop position for folder reordering */}
        {isDragOverItem && (
          <div
            className={`absolute left-0 right-0 h-0.5 bg-accent z-50 pointer-events-none ${
              dragOverPosition === 'above' ? '-top-[1.5px]' : '-bottom-[1.5px]'
            }`}
          />
        )}

        <div className={`flex items-center gap-2 min-w-0 ${isDragging ? 'pointer-events-none' : ''}`}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(e);
            }}
            className="p-0.5 rounded hover:bg-surface-hover text-txt-muted hover:text-txt-primary"
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <span className="text-accent flex-shrink-0">
            {isCollapsed ? <Folder className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
          </span>

          {isActiveFolder && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse flex-shrink-0"
              title="Active folder for new drawings"
            />
          )}

          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => onRenameValueChange(e.target.value)}
              onBlur={() => onFinishRename(id, true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onFinishRename(id, true);
                if (e.key === 'Escape') onCancelRename();
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-app-bg border border-accent rounded px-1.5 py-0.5 text-xs text-txt-primary outline-none w-28 font-normal"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                onStartRename(id, name);
              }}
              className="truncate text-xs font-semibold"
            >
              {name}
            </span>
          )}

          {childCount > 0 && (
            <span className="text-[10px] text-txt-muted font-bold bg-surface-elevated/60 px-1.5 py-0.5 rounded-full border border-border-sub">
              {childCount}
            </span>
          )}
        </div>

        {/* Action buttons on hover */}
        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isDragging ? 'pointer-events-none' : ''}`}>
          {/* Rename folder */}
          <button
            type="button"
            title="Rename folder"
            onClick={(e) => {
              e.stopPropagation();
              onStartRename(id, name);
            }}
            className="p-1 rounded text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors"
          >
            <Edit2 className="w-3 h-3" />
          </button>

          {/* Lock folder */}
          <button
            type="button"
            title={isLocked ? 'Unlock folder' : 'Lock folder'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock(e);
            }}
            className={`p-1 rounded transition-colors ${
              isLocked
                ? 'text-accent hover:text-accent/80 bg-accent-muted'
                : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
            }`}
          >
            {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>

          {/* Toggle visible */}
          <button
            type="button"
            title={isVisible ? 'Hide folder' : 'Show folder'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisible(e);
            }}
            className={`p-1 rounded transition-colors ${
              !isVisible
                ? 'text-yellow-450 hover:text-yellow-350 bg-yellow-500/10'
                : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
            }`}
          >
            {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Delete folder */}
          <button
            type="button"
            title="Delete folder and drawings"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            className="p-1 rounded text-txt-muted hover:text-status-error hover:bg-status-error/10 transition-colors"
          >
            <DeleteIcon className="w-3.5 h-3.5 text-current" />
          </button>
        </div>
      </div>

      {/* Child Drawings List */}
      {!isCollapsed && (
        <div
          className="pl-6 pr-1 py-0.5 space-y-0.5 border-l border-border-sub ml-4 mt-0.5"
          onDragOver={onDragOverFolder}
          onDragLeave={onDragLeaveFolder}
          onDrop={onDropOnFolder}
        >
          {childCount === 0 ? (
            <div className="text-[10px] text-txt-muted italic py-1 pl-2">Empty folder</div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
};
