import React from 'react';
import { Type, FileText, Table as TableIcon, MessageSquare } from 'lucide-react';

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
