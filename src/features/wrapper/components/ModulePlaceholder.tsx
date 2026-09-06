import React from 'react';
import { ArrowLeft, Construction } from 'lucide-react';

interface ModulePlaceholderProps {
  moduleId: string;
  moduleName: string;
  description: string;
  onBack: () => void;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  moduleId,
  moduleName,
  description,
  onBack,
}) => {
  return (
    <div
      data-module-id={moduleId}
      className="flex flex-col h-full w-full bg-app-bg text-txt-primary select-none overflow-y-auto font-sans"
    >
      {/* Top Bar */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-border-def bg-surface/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              console.log(`[Wrapper] Returning to Home from ${moduleName}`);
              onBack();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-def text-xs font-semibold text-txt-secondary hover:text-txt-primary transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-accent" />
            <span>Home</span>
          </button>
          <div className="h-4 w-px bg-border-def" />
          <span className="text-xs uppercase tracking-widest text-txt-muted font-semibold">
            Module Preview
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-mono text-txt-muted">STANDALONE WRAPPER</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-accent-muted border border-accent/30 flex items-center justify-center mb-6 shadow-sm">
          <Construction className="w-8 h-8 text-accent" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-txt-primary mb-3">
          {moduleName}
        </h1>

        <p className="text-sm text-txt-muted leading-relaxed mb-6 max-w-lg">
          {description}
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border-def text-xs text-txt-secondary mb-8 font-mono">
          <span>Status:</span>
          <span className="text-accent font-semibold">Integration pending (Step 2 Simulation)</span>
        </div>

        <button
          type="button"
          onClick={() => {
            console.log(`[Wrapper] Returning to Home from ${moduleName}`);
            onBack();
          }}
          className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-txt-inverse text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          Return to Hub
        </button>
      </main>
    </div>
  );
};
