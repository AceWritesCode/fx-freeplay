import React from 'react';
import { FolderPlus, Lock, Eye } from 'lucide-react';
import { DeleteIcon } from '@/features/chart-workspace/components/DrawingToolbar';

export interface ObjectTreeToolbarProps {
  hasSelection: boolean;
  onGroupSelected: () => void;
  onLockSelected: () => void;
  onHideSelected: () => void;
  onDeleteSelected: () => void;
}

export const ObjectTreeToolbar: React.FC<ObjectTreeToolbarProps> = ({
  hasSelection,
  onGroupSelected,
  onLockSelected,
  onHideSelected,
  onDeleteSelected,
}) => {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-sub bg-surface">
      <div className="flex items-center gap-1">
        {/* Create Group */}
        <button
          type="button"
          disabled={!hasSelection}
          onClick={onGroupSelected}
          title="Create a group of drawings"
          className="w-7 h-7 flex items-center justify-center rounded-md border border-transparent text-txt-secondary hover:text-txt-primary hover:bg-surface-hover disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-txt-secondary disabled:cursor-not-allowed transition-all select-none"
        >
          <FolderPlus className="w-4 h-4 text-current" />
        </button>

        {/* Toggle Lock selected */}
        <button
          type="button"
          disabled={!hasSelection}
          onClick={onLockSelected}
          title="Toggle Lock selected"
          className="w-7 h-7 flex items-center justify-center rounded-md border border-transparent text-txt-secondary hover:text-txt-primary hover:bg-surface-hover disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-txt-secondary disabled:cursor-not-allowed transition-all select-none"
        >
          <Lock className="w-4 h-4 text-current" />
        </button>

        {/* Toggle Hide selected */}
        <button
          type="button"
          disabled={!hasSelection}
          onClick={onHideSelected}
          title="Toggle Hide/Show selected"
          className="w-7 h-7 flex items-center justify-center rounded-md border border-transparent text-txt-secondary hover:text-txt-primary hover:bg-surface-hover disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-txt-secondary disabled:cursor-not-allowed transition-all select-none"
        >
          <Eye className="w-4 h-4 text-current" />
        </button>

        {/* Delete selected */}
        <button
          type="button"
          disabled={!hasSelection}
          onClick={onDeleteSelected}
          title="Delete selected"
          className="w-7 h-7 flex items-center justify-center rounded-md border border-transparent text-txt-secondary hover:text-status-error hover:bg-status-error/10 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-txt-secondary disabled:cursor-not-allowed transition-all select-none"
        >
          <DeleteIcon className="w-4 h-4 text-current" />
        </button>
      </div>
    </div>
  );
};
