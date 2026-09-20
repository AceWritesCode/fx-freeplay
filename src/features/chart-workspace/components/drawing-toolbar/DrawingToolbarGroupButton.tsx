import React from 'react';
import { ToolIconWrapper } from './DrawingToolbarIcons';

export interface DrawingToolbarGroupButtonProps {
  title: string;
  chevronTitle: string;
  disabled?: boolean;
  isGroupActive: boolean;
  isMenuOpen: boolean;
  icon: React.ReactNode;
  onMainClick: () => void;
  onChevronClick: (rect: DOMRect) => void;
  children?: React.ReactNode;
}

export const DrawingToolbarGroupButton: React.FC<DrawingToolbarGroupButtonProps> = ({
  title,
  chevronTitle,
  disabled = false,
  isGroupActive,
  isMenuOpen,
  icon,
  onMainClick,
  onChevronClick,
  children,
}) => {
  return (
    <div className="group relative flex items-center bg-transparent rounded-md">
      <button
        title={title}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onMainClick}
        className={`rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
          isGroupActive
            ? 'border-transparent bg-accent-muted text-accent z-10'
            : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
        }`}
        style={{ width: '33px', height: '33px' }}
      >
        <ToolIconWrapper>
          {icon}
        </ToolIconWrapper>
      </button>
      <button
        title={chevronTitle}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          onChevronClick(rect);
        }}
        className={`rounded-r-sm transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
          isMenuOpen
            ? 'bg-accent-muted text-accent opacity-100 z-10'
            : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover opacity-0 group-hover:opacity-100 disabled:opacity-0'
        }`}
        style={{ width: '9px', height: '33px' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-2 h-2 text-current">
          <path d="M5.5 3L10.5 8L5.5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {children}
    </div>
  );
};
