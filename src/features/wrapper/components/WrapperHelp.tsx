import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  HelpCircle,
  Download,
  FolderTree,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  FileCode,
  Copy,
  Check,
  ChevronRight,
  ArrowRight,
  Maximize2,
  X,
} from 'lucide-react';

interface WrapperHelpProps {
  onBack: () => void;
}

type HelpSectionId =
  | 'overview'
  | 'installation'
  | 'permissions'
  | 'inputs'
  | 'folder-structure'
  | 'replay-accuracy';

interface HelpGifViewerProps {
  src: string;
  alt: string;
  title?: string;
  badge?: string;
  className?: string;
  onExpand: (src: string, title: string) => void;
}

const HelpGifViewer: React.FC<HelpGifViewerProps> = ({
  src,
  alt,
  title,
  badge,
  className = '',
  onExpand,
}) => {
  const displayTitle = title || alt;

  return (
    <div
      onClick={() => onExpand(src, displayTitle)}
      className={`group relative rounded-xl overflow-hidden border border-border-def bg-black shadow-md cursor-pointer transition-all hover:border-accent/60 flex flex-col ${className}`}
      title="Click to expand fullscreen"
    >
      {(title || badge) && (
        <div className="px-3.5 py-2 border-b border-border-def/60 bg-surface/90 flex items-center justify-between text-[11px] font-mono text-txt-muted select-none">
          <span className="flex items-center gap-1.5 text-txt-secondary font-medium truncate">
            <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
            <span className="truncate">{title || alt}</span>
          </span>
          {badge && (
            <span className="shrink-0 text-txt-muted ml-2 font-mono text-[10px] uppercase">
              {badge}
            </span>
          )}
        </div>
      )}

      {/* Snug container with zero padding so GIF reaches container borders */}
      <div className="relative w-full overflow-hidden bg-black flex items-center justify-center">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto block object-cover transition-transform duration-300 group-hover:scale-[1.01]"
        />

        {/* Floating Expand button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpand(src, displayTitle);
          }}
          className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/75 hover:bg-black/95 text-white/90 hover:text-white border border-white/20 backdrop-blur-md shadow-lg transition-all opacity-85 group-hover:opacity-100 group-hover:scale-105 cursor-pointer"
          aria-label="Expand in fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
            Expand
          </span>
        </button>
      </div>
    </div>
  );
};

export const WrapperHelp: React.FC<WrapperHelpProps> = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState<HelpSectionId>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedGif, setExpandedGif] = useState<{ src: string; title: string } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedGif(null);
      }
    };
    if (expandedGif) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandedGif]);

  const handleExpandGif = (src: string, title: string) => {
    console.log(`[Wrapper] Expanding tutorial GIF: ${title}`);
    setExpandedGif({ src, title });
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const navItems: { id: HelpSectionId; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'overview', label: 'Overview & Script', icon: HelpCircle },
    { id: 'installation', label: 'MT5 Installation', icon: Download },
    { id: 'permissions', label: 'DLL Permissions (Crucial)', icon: AlertTriangle },
    { id: 'inputs', label: 'Script Inputs & Modes', icon: Sliders },
    { id: 'folder-structure', label: 'Data Folder Format', icon: FolderTree },
    { id: 'replay-accuracy', label: 'Closed Candles Guarantee', icon: CheckCircle2 },
  ];

  const currentStepIndex = navItems.findIndex((item) => item.id === activeSection);
  const nextStep = currentStepIndex < navItems.length - 1 ? navItems[currentStepIndex + 1] : null;

  const goToNextStep = () => {
    if (nextStep) {
      console.log(`[Wrapper] Navigating to next help step: ${nextStep.label}`);
      setActiveSection(nextStep.id);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-app-bg text-txt-primary select-none overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border-def bg-surface/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              console.log('[Wrapper] Returning to Home from Help');
              onBack();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-def text-xs font-semibold text-txt-secondary hover:text-txt-primary transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-accent" />
            <span>Home</span>
          </button>
          <div className="h-4 w-px bg-border-def" />
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-accent" />
            <h1 className="text-xs font-bold uppercase tracking-wider text-txt-primary">
              Help & Documentation
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-mono text-txt-muted">MT5 EXPORTER GUIDE</span>
        </div>
      </header>

      {/* Main Content Layout: Sidebar Navigation + Content Reader */}
      <div className="flex flex-1 min-h-0">
        {/* Navigation Sidebar */}
        <aside className="w-72 border-r border-border-def p-6 flex flex-col gap-1.5 shrink-0 bg-surface/30">
          <div className="text-[10px] font-bold uppercase tracking-widest text-txt-muted mb-3 px-3 font-mono">
            Table of Contents
          </div>

          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              data-help-section={id}
              type="button"
              onClick={() => {
                console.log(`[Wrapper] Help topic selected: ${label}`);
                setActiveSection(id);
              }}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeSection === id
                  ? 'bg-accent-muted text-txt-primary border border-accent/40 shadow-xs'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    activeSection === id
                      ? 'text-accent'
                      : id === 'permissions'
                      ? 'text-amber-500/80'
                      : 'text-txt-muted'
                  }`}
                />
                <span className="truncate">{label}</span>
              </div>
              {activeSection === id && <ChevronRight className="w-3.5 h-3.5 text-accent shrink-0" />}
            </button>
          ))}

          <div className="mt-auto p-4 rounded-xl bg-surface/60 border border-border-def text-xs text-txt-muted leading-relaxed">
            <div className="flex items-center gap-1.5 text-txt-secondary font-semibold mb-1">
              <FileCode className="w-4 h-4 text-accent" />
              <span>Included Script</span>
            </div>
            <code className="text-[11px] font-mono text-accent block mt-1 break-all bg-surface-elevated px-2 py-1 rounded border border-border-sub">
              Candlesticks_Data_Export.ex5
            </code>
            <p className="mt-2 text-[11px]">
              Shipped directly with FX Freeplay in the repository root for one-click historical data exports.
            </p>
          </div>
        </aside>

        {/* Content Viewer Area */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-10 max-w-6xl w-full space-y-8">
          {/* 1. OVERVIEW */}
          {activeSection === 'overview' && (
            <section className="space-y-6">
              <div>
                <div className="text-xs font-mono font-semibold text-accent uppercase tracking-wider mb-1">
                  Getting Historical Data
                </div>
                <h2 className="text-2xl font-bold text-txt-primary">
                  Exporting Data Using the MetaTrader 5 Script
                </h2>
                <p className="text-sm text-txt-muted mt-2 leading-relaxed max-w-3xl">
                  FX Freeplay is an offline-first charting and bar-replay platform that runs entirely
                  locally. To study historical price action, you can load any standard OHLCV CSV file
                  or export rich multi-timeframe datasets directly from MetaTrader 5 using the included exporter script.
                </p>
              </div>

              {/* Horizontal Layout: Script Location + Tutorial GIF */}
              <div className="p-6 rounded-2xl border border-border-def bg-surface/40 flex flex-col md:flex-row items-stretch gap-6">
                <div className="flex-1 space-y-4 flex flex-col justify-center">
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-txt-primary flex items-center gap-2">
                      <FileCode className="w-5 h-5 text-accent" />
                      <span>Script Location in Repository</span>
                    </h3>
                    <p className="text-xs text-txt-muted leading-relaxed">
                      The compiled MQL5 script is included directly with FX Freeplay and resides in the root folder of the project. Copy this file into your MetaTrader 5 terminal directory to export bars.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-mono text-txt-secondary font-semibold uppercase tracking-wider">
                      Compiled Script File
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated border border-border-sub font-mono text-xs text-txt-primary">
                      <span className="font-semibold text-accent">Candlesticks_Data_Export.ex5</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('Candlesticks_Data_Export.ex5', 'scriptName')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-def text-[11px] font-sans font-medium text-txt-secondary cursor-pointer transition-colors shadow-xs"
                      >
                        {copiedKey === 'scriptName' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-status-success" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Name</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface/60 border border-border-def/60 text-xs text-txt-muted leading-relaxed">
                    <strong className="text-txt-primary">Tip:</strong> You can right-click the file in Windows File Explorer or copy it directly from your project directory as demonstrated in the visual preview.
                  </div>
                </div>

                {/* Tutorial GIF 1: Copy script from repository */}
                <div className="flex-1 min-w-[340px] max-w-xl">
                  <HelpGifViewer
                    src="/tutorials/step1-copy-script.gif"
                    alt="Copy script from project root"
                    title="Visual Guide: Copying Script from Project Root"
                    badge="Step 1"
                    onExpand={handleExpandGif}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-border-def bg-surface/30 space-y-1.5">
                  <div className="text-xs font-bold text-txt-primary uppercase tracking-wider font-mono">
                    Single File Mode
                  </div>
                  <p className="text-xs text-txt-muted leading-relaxed">
                    Exports M1 closed candles for ultra-fine granular replay and automatic higher-timeframe
                    resampling inside FX Freeplay.
                  </p>
                </div>
                <div className="p-5 rounded-2xl border border-border-def bg-surface/30 space-y-1.5">
                  <div className="text-xs font-bold text-txt-primary uppercase tracking-wider font-mono">
                    Multi-File Folder Mode
                  </div>
                  <p className="text-xs text-txt-muted leading-relaxed">
                    Exports individual timeframe files (<code className="text-accent">m1.csv</code>,{' '}
                    <code className="text-accent">m5.csv</code>, <code className="text-accent">h1.csv</code>, etc.)
                    structured in symbol subfolders for instant on-demand switching.
                  </p>
                </div>
              </div>

              {/* Step Action Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border-def/60">
                <div className="text-xs text-txt-muted font-mono">
                  Step 1 of 6: Overview & Script
                </div>
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-txt-inverse text-xs font-semibold cursor-pointer transition-all shadow-sm"
                >
                  <span>Next: MT5 Installation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {/* 2. INSTALLATION */}
          {activeSection === 'installation' && (
            <section className="space-y-6">
              <div>
                <div className="text-xs font-mono font-semibold text-accent uppercase tracking-wider mb-1">
                  Setup Instructions
                </div>
                <h2 className="text-2xl font-bold text-txt-primary">
                  Installing the Script into MetaTrader 5
                </h2>
                <p className="text-sm text-txt-muted mt-2 leading-relaxed max-w-3xl">
                  Follow these step-by-step visual instructions to install and configure the exporter in your MT5 terminal.
                  Each step pairs full instructions side-by-side with animated walkthrough demonstrations.
                </p>
              </div>

              <div className="space-y-6">
                {/* Step 1: Open MT5 Data Folder (Horizontal) */}
                <div className="p-6 rounded-2xl border border-border-def bg-surface/40 flex flex-col md:flex-row items-stretch gap-6">
                  <div className="flex-1 flex flex-col justify-center space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-accent-muted text-accent font-mono font-bold text-sm flex items-center justify-center shrink-0">
                        1
                      </div>
                      <h4 className="text-base font-bold text-txt-primary">
                        Open MT5 Data Folder
                      </h4>
                    </div>
                    <p className="text-xs text-txt-muted leading-relaxed">
                      In your MetaTrader 5 terminal, click on the top navigation bar menu:
                    </p>
                    <div className="p-3 rounded-xl bg-surface-elevated border border-border-sub text-xs font-semibold text-txt-primary">
                      File → Open Data Folder
                    </div>
                    <p className="text-xs text-txt-muted leading-relaxed">
                      This opens the local Windows File Explorer window containing your MetaTrader 5 data and script directories.
                    </p>
                  </div>
                  <div className="flex-1 min-w-[340px] max-w-xl">
                    <HelpGifViewer
                      src="/tutorials/step2-open-data-folder.gif"
                      alt="MT5 File Open Data Folder"
                      title="Visual Guide: Open MT5 Data Folder"
                      badge="Step 1"
                      onExpand={handleExpandGif}
                    />
                  </div>
                </div>

                {/* Step 2: Copy Script to MQL5\Scripts (Horizontal) */}
                <div className="p-6 rounded-2xl border border-border-def bg-surface/40 flex flex-col md:flex-row items-stretch gap-6">
                  <div className="flex-1 flex flex-col justify-center space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-accent-muted text-accent font-mono font-bold text-sm flex items-center justify-center shrink-0">
                        2
                      </div>
                      <h4 className="text-base font-bold text-txt-primary">
                        Copy Script to MQL5\Scripts
                      </h4>
                    </div>
                    <p className="text-xs text-txt-muted leading-relaxed">
                      From the opened data folder window, double-click into <code className="text-accent font-mono">MQL5</code> and then open the <code className="text-accent font-mono">Scripts</code> subfolder.
                    </p>
                    <p className="text-xs text-txt-muted leading-relaxed">
                      Paste the compiled <code className="text-accent font-mono">Candlesticks_Data_Export.ex5</code> script directly inside this directory.
                    </p>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated border border-border-sub font-mono text-xs text-txt-primary mt-1">
                      <span>MQL5\Scripts</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('MQL5\\Scripts', 'scriptsPath')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface hover:bg-surface-hover border border-border-def text-[11px] font-sans font-medium text-txt-secondary cursor-pointer shadow-xs"
                      >
                        {copiedKey === 'scriptsPath' ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy Path</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[340px] max-w-xl">
                    <HelpGifViewer
                      src="/tutorials/step3-paste-script.gif"
                      alt="Paste script into MQL5 Scripts"
                      title="Visual Guide: Copy Script to MQL5\Scripts"
                      badge="Step 2"
                      onExpand={handleExpandGif}
                    />
                  </div>
                </div>

                {/* Step 3: Refresh the Navigator Panel (Horizontal) */}
                <div className="p-6 rounded-2xl border border-border-def bg-surface/40 flex flex-col md:flex-row items-stretch gap-6">
                  <div className="flex-1 flex flex-col justify-center space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-accent-muted text-accent font-mono font-bold text-sm flex items-center justify-center shrink-0">
                        3
                      </div>
                      <h4 className="text-base font-bold text-txt-primary">
                        Refresh the Navigator Panel
                      </h4>
                    </div>
                    <p className="text-xs text-txt-muted leading-relaxed">
                      Return to your MetaTrader 5 window. Open the <strong className="text-txt-primary">Navigator</strong> panel by pressing <kbd className="font-mono text-xs bg-surface-elevated px-2 py-0.5 rounded border border-border-sub">Ctrl+N</kbd> if it is hidden.
                    </p>
                    <p className="text-xs text-txt-muted leading-relaxed">
                      Scroll down to the <strong className="text-txt-primary">Scripts</strong> heading, right-click on it, and select <strong className="text-txt-primary">Refresh</strong>.
                    </p>
                    <p className="text-xs text-txt-muted leading-relaxed">
                      The <code className="text-accent font-mono">Candlesticks_Data_Export</code> script will immediately appear in the list.
                    </p>
                  </div>
                  <div className="flex-1 min-w-[340px] max-w-xl">
                    <HelpGifViewer
                      src="/tutorials/step4-refresh-navigator.gif"
                      alt="Refresh Navigator scripts"
                      title="Visual Guide: Refresh Navigator Panel"
                      badge="Step 3"
                      onExpand={handleExpandGif}
                    />
                  </div>
                </div>

                {/* Step 4: Add Desired Symbols to Market Watch (Horizontal) */}
                <div className="p-6 rounded-2xl border border-border-def bg-surface/40 flex flex-col md:flex-row items-stretch gap-6">
                  <div className="flex-1 flex flex-col justify-center space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-accent-muted text-accent font-mono font-bold text-sm flex items-center justify-center shrink-0">
                        4
                      </div>
                      <h4 className="text-base font-bold text-txt-primary">
                        Add Desired Symbols to Market Watch
                      </h4>
                    </div>
                    <p className="text-xs text-txt-muted leading-relaxed">
                      If you plan to export multiple symbols in batch mode using the script's <strong className="text-txt-primary">Top 5 symbols in Market Watch</strong> option, open Market Watch (<kbd className="font-mono text-xs bg-surface-elevated px-2 py-0.5 rounded border border-border-sub">Ctrl+M</kbd>).
                    </p>
                    <p className="text-xs text-txt-muted leading-relaxed">
                      Search and add the trading pairs you wish to export (e.g. EURUSD, GBPUSD, XAUUSD) so they appear at the top of your watchlist.
                    </p>
                  </div>
                  <div className="flex-1 min-w-[340px] max-w-xl">
                    <HelpGifViewer
                      src="/tutorials/step5-add-symbol-watchlist.gif"
                      alt="Add symbol to Market Watch"
                      title="Visual Guide: Add Symbols to Market Watch"
                      badge="Step 4"
                      onExpand={handleExpandGif}
                    />
                  </div>
                </div>

                {/* Step 5: Drag onto Any Chart */}
                <div className="p-6 rounded-2xl border border-border-def bg-surface/40 space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-xl bg-accent-muted text-accent font-mono font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                      5
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h4 className="text-base font-bold text-txt-primary">
                        Drag onto Any Chart
                      </h4>
                      <p className="text-xs text-txt-muted leading-relaxed">
                        Drag <code className="text-accent font-mono">Candlesticks_Data_Export</code> from the Navigator panel directly onto any active chart window. This immediately launches the script configuration window.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step Action Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border-def/60">
                <div className="text-xs text-txt-muted font-mono">
                  Step 2 of 6: MT5 Installation
                </div>
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-txt-inverse text-xs font-semibold cursor-pointer transition-all shadow-sm"
                >
                  <span>Next: DLL Permissions (Crucial)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {/* 3. PERMISSIONS */}
          {activeSection === 'permissions' && (
            <section className="space-y-6">
              <div>
                <div className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider mb-1">
                  Mandatory Prerequisite
                </div>
                <h2 className="text-2xl font-bold text-txt-primary">
                  Allow DLL Imports (Dependencies Tab)
                </h2>
                <p className="text-sm text-txt-muted mt-2 leading-relaxed max-w-3xl">
                  MetaTrader 5 enforces a strict security sandbox that isolates scripts from modifying files outside of terminal folders.
                </p>
              </div>

              {/* Horizontal Side-by-Side: Permission Instructions + GIF */}
              <div className="p-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 flex flex-col md:flex-row items-stretch gap-6">
                <div className="flex-1 flex flex-col justify-center space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-amber-400">
                        Required MT5 Setting Before Running
                      </h3>
                      <p className="text-xs text-txt-secondary mt-0.5">
                        Without this flag enabled, exports to external folders will fail.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-surface/80 border border-border-def text-xs text-txt-primary leading-relaxed space-y-2">
                    <p className="font-semibold text-txt-primary">
                      When the script dialogue appears on chart drop:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-txt-secondary font-medium">
                      <li>Click on the <strong className="text-txt-primary">Dependencies</strong> tab at the top.</li>
                      <li>
                        Tick the checkbox: <strong className="text-amber-400 font-semibold">Allow DLL imports</strong>.
                      </li>
                    </ol>
                    <p className="text-[11px] text-txt-muted pt-1">
                      MT5's security sandbox otherwise prevents the exporter from copying files outside of its internal folders.
                    </p>
                  </div>
                </div>

                {/* Tutorial GIF 6: Applying Script Settings & DLL Import */}
                <div className="flex-1 min-w-[340px] max-w-xl">
                  <HelpGifViewer
                    src="/tutorials/step6-apply-script-settings.gif"
                    alt="Enable DLL Imports and configure script"
                    title="Visual Guide: Allow DLL Imports (Dependencies Tab)"
                    badge="Crucial"
                    onExpand={handleExpandGif}
                  />
                </div>
              </div>

              {/* Step Action Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border-def/60">
                <div className="text-xs text-txt-muted font-mono">
                  Step 3 of 6: DLL Permissions
                </div>
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-txt-inverse text-xs font-semibold cursor-pointer transition-all shadow-sm"
                >
                  <span>Next: Script Inputs & Modes</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {/* 4. INPUTS & MODES */}
          {activeSection === 'inputs' && (
            <section className="space-y-6">
              <div>
                <div className="text-xs font-mono font-semibold text-accent uppercase tracking-wider mb-1">
                  Script Configuration
                </div>
                <h2 className="text-2xl font-bold text-txt-primary">
                  Script Input Parameters
                </h2>
                <p className="text-sm text-txt-muted mt-2 leading-relaxed max-w-3xl">
                  Configure the script's behavior on the <strong className="text-txt-primary">Inputs</strong> tab before clicking OK:
                </p>
              </div>

              {/* Horizontal Layout: Inputs Parameters + GIF Preview */}
              <div className="flex flex-col lg:flex-row items-stretch gap-6">
                <div className="flex-1 rounded-2xl border border-border-def bg-surface/40 overflow-hidden divide-y divide-border-def">
                  {/* Symbol Mode */}
                  <div className="p-5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-txt-primary font-mono">Symbol Mode</div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent/20 text-accent font-semibold">
                        Scope
                      </span>
                    </div>
                    <p className="text-xs text-txt-muted leading-relaxed">
                      Select whether to export just the <strong className="text-txt-primary">Current Symbol</strong> (the chart you attached the script to), or the <strong className="text-txt-primary">Top 5 symbols in Market Watch</strong> for batch processing.
                    </p>
                  </div>

                  {/* Export Mode */}
                  <div className="p-5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-txt-primary font-mono">Export Mode</div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent/20 text-accent font-semibold">
                        Timeframe Format
                      </span>
                    </div>
                    <ul className="text-xs text-txt-muted space-y-1 leading-relaxed">
                      <li>
                        <code className="text-accent font-mono font-semibold">Single File</code>: Exports M1 timeframe only.
                      </li>
                      <li>
                        <code className="text-accent font-mono font-semibold">Multi File</code>: Exports all timeframes (<code className="font-mono">m1</code>, <code className="font-mono">m5</code>, <code className="font-mono">h1</code>, <code className="font-mono">d1</code>, etc.) into a dedicated per-symbol folder.
                      </li>
                    </ul>
                  </div>

                  {/* File Write Mode */}
                  <div className="p-5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-txt-primary font-mono">File Write Mode</div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent/20 text-accent font-semibold">
                        Update Strategy
                      </span>
                    </div>
                    <ul className="text-xs text-txt-muted space-y-1 leading-relaxed">
                      <li>
                        <code className="text-accent font-mono font-semibold">Append</code>: Fast incremental sync. Only fetches candles formed since the last export run.
                      </li>
                      <li>
                        <code className="text-accent font-mono font-semibold">Overwrite</code>: Complete re-download of all available historical data from your broker.
                      </li>
                    </ul>
                  </div>

                  {/* External Export Path */}
                  <div className="p-5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-txt-primary font-mono">External Export Path</div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent/20 text-accent font-semibold">
                        Destination Folder
                      </span>
                    </div>
                    <p className="text-xs text-txt-muted leading-relaxed">
                      Optional Windows path to copy the exported CSV files straight to a folder of your choice (e.g. your FX Freeplay data folder).
                    </p>
                    <p className="text-[11px] text-txt-muted italic">
                      If left blank, exported files remain safely in MT5's default directory:{' '}
                      <code className="text-accent font-mono not-italic">MQL5\Files\MyExports</code>.
                    </p>
                  </div>
                </div>

                {/* Tutorial GIF 6 preview for Inputs reference */}
                <div className="w-full lg:w-[480px] xl:w-[540px] flex flex-col space-y-3 shrink-0">
                  <HelpGifViewer
                    src="/tutorials/step6-apply-script-settings.gif"
                    alt="Configuring inputs tab in MT5 script"
                    title="Visual Guide: Setting Inputs & Export Path"
                    badge="Inputs"
                    onExpand={handleExpandGif}
                  />
                  <p className="text-xs text-txt-muted leading-relaxed px-1">
                    Check your desired mode, paste any external export path, and click <strong className="text-txt-primary">OK</strong> to begin exporting.
                  </p>
                </div>
              </div>

              {/* Step Action Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border-def/60">
                <div className="text-xs text-txt-muted font-mono">
                  Step 4 of 6: Script Inputs & Modes
                </div>
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-txt-inverse text-xs font-semibold cursor-pointer transition-all shadow-sm"
                >
                  <span>Next: Data Folder Format</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {/* 5. FOLDER STRUCTURE & IMPORT DATA */}
          {activeSection === 'folder-structure' && (
            <section className="space-y-8">
              <div>
                <div className="text-xs font-mono font-semibold text-accent uppercase tracking-wider mb-1">
                  Folder Hierarchy & Import
                </div>
                <h2 className="text-2xl font-bold text-txt-primary">
                  Data Folder Structure & Importing into App
                </h2>
                <p className="text-sm text-txt-muted mt-2 leading-relaxed max-w-3xl">
                  FX Freeplay allows seamless ingestion of historical data exported from MT5. Learn how data folders are organized and follow the visual guide below to import them directly into the workspace.
                </p>
              </div>

              {/* Section Part 1: Folder Hierarchy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-border-def bg-surface/40 space-y-3 font-mono text-xs">
                  <div className="text-[10px] uppercase font-bold text-txt-muted tracking-wider">
                    Recommended Folder Layout
                  </div>
                  <pre className="p-4 rounded-xl bg-surface-elevated border border-border-sub text-txt-primary overflow-x-auto leading-relaxed">
{`MyData/
├── EURUSD/
│   ├── m1.csv
│   └── h1.csv
└── GBPUSD/
    └── m1.csv`}
                  </pre>
                  <p className="text-[11px] font-sans text-txt-muted leading-relaxed">
                    Create a master data directory (e.g. <code className="text-accent font-mono">MyData</code>) with individual subfolders named after each currency symbol.
                  </p>
                </div>

                <div className="p-6 rounded-2xl border border-border-def bg-surface/30 flex flex-col justify-center space-y-3">
                  <div className="flex items-center gap-2 text-txt-primary font-bold text-sm">
                    <FolderTree className="w-4 h-4 text-accent" />
                    <span>Smart Resampling & Lazy Loading</span>
                  </div>
                  <p className="text-xs text-txt-muted leading-relaxed">
                    When pointing FX Freeplay at a master folder, per-timeframe files are parsed lazily only when you view them.
                  </p>
                  <p className="text-xs text-txt-muted leading-relaxed">
                    If a higher timeframe (like <code className="text-accent font-mono">h4.csv</code>) is missing from the folder, the charting engine automatically resamples it on-the-fly from the finest available lower timeframe.
                  </p>
                </div>
              </div>

              {/* Section Part 2: Step 7 - Importing Data into FX Freeplay (Horizontal Layout) */}
              <div className="p-6 rounded-2xl border border-accent/40 bg-surface-elevated/40 flex flex-col lg:flex-row items-stretch gap-8 shadow-sm">
                <div className="flex-1 flex flex-col justify-center space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent text-txt-inverse font-mono font-bold text-sm flex items-center justify-center shrink-0 shadow-md">
                      7
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-accent font-bold uppercase tracking-wider">
                        Step 7: Ingestion Guide
                      </div>
                      <h3 className="text-lg font-bold text-txt-primary">
                        Importing Data into FX Freeplay
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-txt-muted leading-relaxed">
                    Once your data has been exported from MT5, bringing it into FX Freeplay is effortless. Follow these 3 steps:
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-surface/60 border border-border-def/60">
                      <div className="w-5 h-5 rounded-md bg-accent-muted text-accent font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        A
                      </div>
                      <div className="text-xs">
                        <strong className="text-txt-primary">Select Chart Mode:</strong> From the Home view, click on the <strong className="text-txt-primary">Charts</strong> module to enter the trading environment.
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-surface/60 border border-border-def/60">
                      <div className="w-5 h-5 rounded-md bg-accent-muted text-accent font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        B
                      </div>
                      <div className="text-xs">
                        <strong className="text-txt-primary">Select the Data Folder:</strong> In the file prompt or header menu, click to pick your data directory and browse to the folder containing your exported symbol files.
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-surface/60 border border-border-def/60">
                      <div className="w-5 h-5 rounded-md bg-accent-muted text-accent font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        C
                      </div>
                      <div className="text-xs">
                        <strong className="text-txt-primary">Allow Import & Load:</strong> When the browser requests folder permissions, click <strong className="text-accent">"View files"</strong> or <strong className="text-accent">"Allow"</strong>. Wait a few moments while the engine indexes and loads your candlesticks.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tutorial GIF 7: Step 7 - Import Data (Large horizontal display) */}
                <div className="flex-1 min-w-[340px] max-w-2xl flex flex-col justify-center">
                  <HelpGifViewer
                    src="/tutorials/step7-import-data.gif"
                    alt="Importing data folder into FX Freeplay"
                    title="Visual Demonstration: Importing Data Folder"
                    badge="Step 7"
                    onExpand={handleExpandGif}
                  />
                </div>
              </div>

              {/* Step Action Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border-def/60">
                <div className="text-xs text-txt-muted font-mono">
                  Step 5 of 6: Data Folder Format & Import
                </div>
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-txt-inverse text-xs font-semibold cursor-pointer transition-all shadow-sm"
                >
                  <span>Next: Closed Candles Guarantee</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {/* 6. REPLAY ACCURACY */}
          {activeSection === 'replay-accuracy' && (
            <section className="space-y-6">
              <div>
                <div className="text-xs font-mono font-semibold text-accent uppercase tracking-wider mb-1">
                  Simulation Integrity
                </div>
                <h2 className="text-2xl font-bold text-txt-primary">
                  Closed Candles Guarantee
                </h2>
                <p className="text-sm text-txt-muted mt-2 leading-relaxed">
                  Why the MT5 script strictly exports closed bars for backtesting and replay.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border-def bg-surface/40 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent-muted text-accent">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-txt-primary">
                      100% Deterministic Replay Simulation
                    </h3>
                    <p className="text-xs text-txt-muted mt-0.5">
                      No look-ahead bias and no mutating incomplete bars.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-txt-muted leading-relaxed">
                  Only <strong className="text-txt-primary">fully closed candles</strong> are written out by <code className="text-accent font-mono">Candlesticks_Data_Export.ex5</code>. This guarantees that your historical datasets will never contain partial or repainting candle data, preserving complete fidelity when simulating bar-by-bar market execution in FX Freeplay.
                </p>
              </div>

              <div className="flex items-center justify-between p-5 rounded-2xl border border-accent/30 bg-accent-muted/20">
                <div>
                  <div className="text-xs font-bold text-accent uppercase tracking-wider">
                    Ready to Practice?
                  </div>
                  <div className="text-sm font-semibold text-txt-primary mt-0.5">
                    Launch the Charts workspace to import your exported CSV data.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    console.log('[Wrapper] Navigating to Charts from Help');
                    onBack();
                  }}
                  className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-txt-inverse text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  Return to Home
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Fullscreen Modal with Blurred Background Overlay */}
      {expandedGif && (
        <div
          data-testid="fullscreen-gif-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 md:p-8 animate-in fade-in duration-200"
          onClick={() => setExpandedGif(null)}
        >
          <div
            className="relative max-w-6xl w-full flex flex-col items-center max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="w-full flex items-center justify-between pb-3 text-txt-primary px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                <span className="text-xs sm:text-sm font-mono font-semibold text-txt-primary">
                  {expandedGif.title}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-txt-muted hidden sm:inline">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-surface-elevated border border-border-sub text-[10px] text-txt-secondary">ESC</kbd> or click outside to close
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedGif(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border-def text-txt-secondary hover:text-txt-primary transition-colors cursor-pointer shadow-lg"
                  aria-label="Close fullscreen view"
                >
                  <X className="w-4 h-4 text-accent" />
                  <span className="text-xs font-semibold">Close</span>
                </button>
              </div>
            </div>

            {/* Modal Image Box */}
            <div
              className="rounded-2xl overflow-hidden border border-border-def bg-black shadow-2xl flex items-center justify-center max-h-[85vh] w-full cursor-zoom-out"
              onClick={() => setExpandedGif(null)}
              title="Click anywhere to close"
            >
              <img
                src={expandedGif.src}
                alt={expandedGif.title}
                className="max-h-[85vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
