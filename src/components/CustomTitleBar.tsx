import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';

export const CustomTitleBar: React.FC = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && Boolean(window.electronAPI?.minimizeWindow)) {
      setIsElectron(true);
      window.electronAPI?.isMaximized?.().then((max) => setIsMaximized(Boolean(max)));
    }

    const checkMaximized = () => {
      window.electronAPI?.isMaximized?.().then((max) => setIsMaximized(Boolean(max)));
    };

    window.addEventListener('resize', checkMaximized);
    return () => window.removeEventListener('resize', checkMaximized);
  }, []);

  if (!isElectron) return null;

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.minimizeWindow?.();
  };

  const handleToggleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.toggleMaximizeWindow?.();
    setTimeout(() => {
      window.electronAPI?.isMaximized?.().then((max) => setIsMaximized(Boolean(max)));
    }, 100);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.closeWindow?.();
  };

  return (
    <div
      className="w-full h-8 bg-surface border-b border-border-def flex items-center justify-between select-none flex-shrink-0 z-50 text-xs font-semibold text-txt-secondary transition-colors duration-150"
      onDoubleClick={handleToggleMaximize}
      style={{
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Left branding icon and title */}
      <div className="flex items-center gap-2 pl-3 pointer-events-none">
        <svg
          className="w-3.5 h-3.5 text-accent flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
        <span className="tracking-wide text-[11px] font-bold text-txt-primary">
          FX Freeplay
        </span>
      </div>

      {/* Right window control buttons (minimize, maximize/restore, close) */}
      <div
        className="flex items-center h-full"
        style={{
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <button
          onClick={handleMinimize}
          className="h-full w-11 flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors duration-100 cursor-pointer"
          title="Minimize"
          aria-label="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleToggleMaximize}
          className="h-full w-11 flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors duration-100 cursor-pointer"
          title={isMaximized ? 'Restore' : 'Maximize'}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 transform rotate-90" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>

        <button
          onClick={handleClose}
          className="h-full w-11 flex items-center justify-center text-txt-muted hover:text-white hover:bg-status-error transition-colors duration-100 cursor-pointer"
          title="Close"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
