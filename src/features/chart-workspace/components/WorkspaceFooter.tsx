import React from 'react';
import { 
  Scissors, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Clock, 
  X,
  ChevronsLeft,
  ChevronDown
} from 'lucide-react';
import { formatDateFeedback } from '@/components/ThemeSettingsModal';

import { calculateSpeedSteps, getClosestStepIndex } from '@/utils/replayUtils';

interface WorkspaceFooterProps {
  isReplayActive: boolean;
  isSelectingCutPoint: boolean;
  setIsSelectingCutPoint: (v: boolean) => void;
  replayCurrentTimestamp: number | null;
  isReplayPlaying: boolean;
  replaySpeed: number;
  onSpeedChange: (speed: number) => void;
  handleTogglePlayPause: () => void;
  handleStepForward: () => void;
  handleStepBackward: () => void;
  exitReplayMode: () => void;
  setIsReplayActive: (v: boolean) => void;
  hasData: boolean;
  assetName: string;
  settings: any;
  allTimeframesData: any;
  activeTimeframe: string;
  detectPricePrecision: (candles: any[]) => number;
  isFooterTzOpen: boolean;
  setIsFooterTzOpen: (v: boolean) => void;
  footerTzDropdownRef: React.RefObject<HTMLDivElement | null>;
  timezoneOptions: any[];
  onClearTimezoneAdjustment: () => void;
  onUserTimezoneChange: (label: string) => void;
}

export const WorkspaceFooter: React.FC<WorkspaceFooterProps> = (props) => {
  const {
    isReplayActive,
    isSelectingCutPoint,
    setIsSelectingCutPoint,
    replayCurrentTimestamp,
    isReplayPlaying,
    replaySpeed,
    onSpeedChange,
    handleTogglePlayPause,
    handleStepForward,
    handleStepBackward,
    exitReplayMode,
    setIsReplayActive,
    hasData,
    assetName,
    settings,
    allTimeframesData,
    activeTimeframe,
    detectPricePrecision,
    isFooterTzOpen,
    setIsFooterTzOpen,
    footerTzDropdownRef,
    timezoneOptions,
    onClearTimezoneAdjustment,
    onUserTimezoneChange,
  } = props;

  return (
    <footer className="h-12 bg-[#1e222d] border-t border-gray-950 flex items-center justify-between px-4 z-20 select-none">
      {isReplayActive ? (
        <div className="flex items-center justify-between w-full h-full">
          {/* Left side: Replay Active Status */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Replay Active</span>
          </div>

          {/* Center: Replay Controls */}
          <div className="flex items-center gap-4">
            {/* Jump To / Scissors */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  console.log('[DEBUG] Replay Footer - Clicked Jump To.');
                  setIsSelectingCutPoint(true);
                }}
                title="Jump to new cutpoint (Click on chart)"
                className={`p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                  isSelectingCutPoint
                    ? 'bg-indigo-650 border-indigo-500 text-white shadow-lg shadow-indigo-600/15'
                    : 'border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Jump To</span>
              </button>
            </div>

            <div className="w-px h-5 bg-gray-800" />

            {/* Playback step / speed actions */}
            <div className="flex items-center gap-1.5">
              {/* Step Backward */}
              <button
                onClick={handleStepBackward}
                title="Step Backward"
                className="p-1.5 rounded-lg border border-transparent text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Play/Pause toggle */}
              <button
                onClick={handleTogglePlayPause}
                title={isReplayPlaying ? 'Pause Simulation' : 'Play Simulation'}
                className={`p-2 rounded-full transition-all shadow-md cursor-pointer ${
                  isReplayPlaying
                    ? 'bg-indigo-650 text-white hover:bg-indigo-600 shadow-indigo-600/15'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20'
                }`}
              >
                {isReplayPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              {/* Step Forward */}
              <button
                onClick={handleStepForward}
                title="Step Forward"
                className="p-1.5 rounded-lg border border-transparent text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-5 bg-gray-800" />

            {/* Speed Slider with Snap Mechanism */}
            {(() => {
              const speedSteps = calculateSpeedSteps(
                settings?.replayMaxDuration ?? 3.0,
                settings?.replayMinDuration ?? 0.1
              );
              const activeIdx = getClosestStepIndex(speedSteps, replaySpeed);
              return (
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Speed:</span>
                  <input
                    type="range"
                    min="0"
                    max={speedSteps.length - 1}
                    step="1"
                    value={activeIdx}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      const speedVal = speedSteps[idx];
                      console.log(`[DEBUG] Replay Footer Speed - Slider changed to index ${idx} -> speed ${speedVal}s/b`);
                      onSpeedChange(speedVal);
                    }}
                    className="w-24 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                    title={`Playback speed: ${replaySpeed} seconds per bar`}
                  />
                  <span className="text-[11px] font-mono font-bold text-indigo-400 w-14 text-right">{replaySpeed}s/b</span>
                </div>
              );
            })()}

            <div className="w-px h-5 bg-gray-800" />

            {/* Date time feedback */}
            <div className="flex items-center gap-2 bg-gray-950/30 border border-gray-850 px-3 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-mono font-semibold text-white tracking-wide">
                {replayCurrentTimestamp ? formatDateFeedback(replayCurrentTimestamp) : 'Click cut point to set start...'}
              </span>
            </div>
          </div>

          {/* Right side: Exit Button */}
          <button
            onClick={() => {
              console.log('[DEBUG] Replay Footer - Exit Replay clicked.');
              exitReplayMode();
            }}
            className="flex items-center gap-1 px-3 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all cursor-pointer"
            title="Exit Replay"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit Replay</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full h-full text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Timezone:</span>
            {/* Custom styled timezone dropdown matching import screen */}
            <div
              ref={footerTzDropdownRef}
              className="relative select-none animate-none"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsFooterTzOpen(!isFooterTzOpen)}
                className="h-6 flex items-center gap-1.5 bg-[#131722] hover:bg-[#1e222d] border border-gray-800 hover:border-gray-700 focus:border-indigo-500 rounded-lg px-2.5 text-[10px] text-gray-300 font-bold transition-all cursor-pointer uppercase tracking-wider"
              >
                <span className="truncate max-w-[140px]">
                  {settings.timezoneAdjustmentEnabled ? (settings.userTimezoneLabel || 'Exchange') : 'Exchange'}
                </span>
                <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 flex-shrink-0 ${isFooterTzOpen ? 'rotate-180 text-white' : ''}`} />
              </button>

              {isFooterTzOpen && (
                <div className="absolute bottom-full mb-1.5 left-0 bg-[#1e222d] border border-gray-800 rounded-xl shadow-2xl z-50 min-w-[220px] max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-850">
                  {timezoneOptions.map((opt) => {
                    const isSelected = opt.value === 'exchange'
                      ? !settings.timezoneAdjustmentEnabled
                      : settings.timezoneAdjustmentEnabled && settings.userTimezoneLabel === opt.label;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setIsFooterTzOpen(false);
                          if (opt.value === 'exchange') {
                            onClearTimezoneAdjustment();
                          } else {
                            onUserTimezoneChange(opt.label);
                          }
                        }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-800 hover:text-white cursor-pointer ${
                          isSelected ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-gray-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span>
              Precision:{' '}
              {settings.pricePrecision === 0
                ? `Auto (${hasData ? detectPricePrecision(allTimeframesData[activeTimeframe] || []) : 4}d)`
                : `${settings.pricePrecision}d`}
            </span>
            <span>•</span>
            <span>Ingested: {hasData ? assetName : 'None'}</span>
            <div className="h-4 w-px bg-gray-800" />
            <button
              disabled={!hasData}
              onClick={() => {
                setIsReplayActive(true);
                setIsSelectingCutPoint(true);
              }}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors duration-150 text-xs font-bold normal-case tracking-normal disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Bar Replay"
            >
              <ChevronsLeft className="w-4 h-4" />
              <span>Replay</span>
            </button>
          </div>
        </div>
      )}
    </footer>
  );
};
