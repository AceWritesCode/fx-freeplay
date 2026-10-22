import React, { useEffect, useState } from 'react';

export const CustomTitleBar: React.FC = () => {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && Boolean(window.electronAPI)) {
      setIsElectron(true);
    }
  }, []);

  if (!isElectron) return null;

  return (
    <div
      className="w-full h-8 bg-surface border-b border-border-def flex items-center justify-between px-3 select-none flex-shrink-0 z-50 text-xs font-semibold text-txt-secondary"
      style={{
        // Electron WebKit drag region makes the custom bar draggable while leaving buttons clickable
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 pointer-events-none">
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

      {/* Spacer reservation on the right for Windows native minimize/maximize/close buttons overlay */}
      <div
        className="w-[138px] h-full pointer-events-none flex-shrink-0"
        aria-hidden="true"
      />
    </div>
  );
};
