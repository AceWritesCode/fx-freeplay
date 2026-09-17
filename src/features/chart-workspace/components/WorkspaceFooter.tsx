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
import { RecordingFloatingBar, useCaptureStore } from '@/features/capture-recording';
import { formatTimeframeDisplay, formatDataRangeDate } from '@/domain/market/timeframeUtils';

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
  isAutoShiftEnabled?: boolean;
  handleToggleAutoShift?: () => void;
  setIsReplayActive: (v: boolean) => void;
  hasData: boolean;
  assetName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allTimeframesData: any;
  activeTimeframe: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detectPricePrecision: (candles: any[]) => number;
  isFooterTzOpen: boolean;
  setIsFooterTzOpen: (v: boolean) => void;
  footerTzDropdownRef: React.RefObject<HTMLDivElement | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timezoneOptions: any[];
  onClearTimezoneAdjustment: () => void;
  onUserTimezoneChange: (label: string) => void;
  handleJumpToDate?: (timestamp: number) => void;
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
    isAutoShiftEnabled = true,
    handleToggleAutoShift,
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
    handleJumpToDate,
  } = props;

  const { recordingStatus } = useCaptureStore();
  const isRecordingActive =
    recordingStatus === 'recording' ||
    recordingStatus === 'paused' ||
    recordingStatus === 'processing' ||
    recordingStatus === 'completed' ||
    recordingStatus === 'error';

  // Derive available data range for active timeframe
  const activeTfData = (allTimeframesData && activeTimeframe && allTimeframesData[activeTimeframe])
    ? allTimeframesData[activeTimeframe]
    : [];
  const hasActiveTfData = activeTfData.length > 0;
  const availableDataRangeText = hasActiveTfData
    ? `${formatTimeframeDisplay(activeTimeframe)} Data: ${formatDataRangeDate(activeTfData[0].timestamp)} — ${formatDataRangeDate(activeTfData[activeTfData.length - 1].timestamp)}`
    : null;

  const dateTimePickerRef = React.useRef<HTMLInputElement>(null);

  // Helper to format timestamp as YYYY-MM-DDTHH:mm for datetime-local input
  const getDateTimePickerValue = (timestamp: number | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper to get min and max dates/times of current timeframe data
  const getReplayDateTimeBounds = () => {
    const fullData = allTimeframesData?.[activeTimeframe] || [];
    if (!fullData || fullData.length === 0) return { min: '', max: '' };

    const formatDateTime = (ts: number) => {
      const date = new Date(ts);
      if (isNaN(date.getTime())) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${d}T${h}:${min}`;
    };

    return {
      min: formatDateTime(fullData[0].timestamp),
      max: formatDateTime(fullData[fullData.length - 1].timestamp),
    };
  };

  const handleDateTimePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val || !handleJumpToDate) return;

    const [datePart, timePart] = val.split('T');
    if (!datePart || !timePart) return;

    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);

    const targetDate = new Date(year, month - 1, day, hour, minute, 0);
    handleJumpToDate(targetDate.getTime());
  };

  const renderTimezonePicker = () => (
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className="text-[10px] text-txt-muted uppercase font-bold tracking-wider">Timezone:</span>
      <div
        ref={footerTzDropdownRef}
        className="relative select-none animate-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setIsFooterTzOpen(!isFooterTzOpen)}
          className="h-6 flex items-center gap-1.5 bg-app-bg hover:bg-surface border border-border-sub hover:border-border-def focus:border-accent rounded-lg px-2.5 text-[10px] text-txt-secondary font-bold transition-all cursor-pointer uppercase tracking-wider"
        >
          <span className="truncate max-w-[140px]">
            {settings.timezoneAdjustmentEnabled ? (settings.userTimezoneLabel || 'Exchange') : 'Exchange'}
          </span>
          <ChevronDown className={`w-3 h-3 text-txt-muted transition-transform duration-200 flex-shrink-0 ${isFooterTzOpen ? 'rotate-180 text-txt-primary' : ''}`} />
        </button>

        {isFooterTzOpen && (
          <div className="absolute bottom-full mb-1.5 left-0 bg-surface border border-border-def rounded-xl shadow-2xl z-50 min-w-[220px] max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-surface-elevated">
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
                  className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-surface-hover hover:text-txt-primary cursor-pointer ${
                    isSelected ? 'text-accent font-bold bg-accent-muted' : 'text-txt-muted'
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
  );

  const renderReplayControls = (compact: boolean = false) => {
    const speedSteps = calculateSpeedSteps(
      settings?.replayMaxDuration ?? 3.0,
      settings?.replayMinDuration ?? 0.1
    );
    const activeIdx = getClosestStepIndex(speedSteps, replaySpeed);

    return (
      <div className={`flex items-center ${compact ? 'gap-2 md:gap-3' : 'gap-3'} flex-shrink-0 min-w-0 max-w-full overflow-x-auto scrollbar-none px-1`}>
        {/* Jump To / Scissors */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              setIsSelectingCutPoint(true);
            }}
            title="Jump to new cutpoint (Click on chart)"
            className={`p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer flex-shrink-0 ${
              isSelectingCutPoint
                ? 'bg-accent border-accent text-txt-inverse shadow-lg shadow-accent/15'
                : 'border-border-sub text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span className={compact ? 'hidden lg:inline' : ''}>Jump To</span>
          </button>
        </div>

        <div className="w-px h-5 bg-border-sub flex-shrink-0" />

        {/* Playback step / speed actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Step Backward */}
          <button
            onClick={handleStepBackward}
            title="Step Backward"
            className="p-1.5 rounded-lg border border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-all cursor-pointer flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Play/Pause toggle */}
          <button
            onClick={handleTogglePlayPause}
            title={isReplayPlaying ? 'Pause Simulation' : 'Play Simulation'}
            className="p-2 rounded-full transition-all shadow-md cursor-pointer flex-shrink-0 bg-accent text-txt-inverse hover:bg-accent-hover shadow-accent/20"
          >
            {isReplayPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Step Forward */}
          <button
            onClick={handleStepForward}
            title="Step Forward"
            className="p-1.5 rounded-lg border border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-all cursor-pointer flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 bg-border-sub flex-shrink-0" />

        {/* Speed Slider with Snap Mechanism */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] uppercase font-bold text-txt-muted tracking-wider">Speed:</span>
          <input
            type="range"
            min="0"
            max={speedSteps.length - 1}
            step="1"
            value={activeIdx}
            onChange={(e) => {
              const idx = Number(e.target.value);
              const speedVal = speedSteps[idx];
              onSpeedChange(speedVal);
            }}
            className={`${compact ? 'w-16' : 'w-20'} h-1 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-accent focus:outline-none flex-shrink-0`}
            title={`Playback speed: ${replaySpeed} seconds per bar`}
          />
          <span className="text-[11px] font-mono font-bold text-accent w-12 text-right flex-shrink-0">{replaySpeed}s/b</span>
        </div>

        <div className="w-px h-5 bg-border-sub flex-shrink-0" />

        {/* Auto Shift toggle */}
        <button
          type="button"
          onClick={handleToggleAutoShift}
          title={
            isAutoShiftEnabled
              ? 'Auto Shift ON: Chart auto-centers on each new candle (Click to disable)'
              : 'Auto Shift OFF: Chart stays stationary as candles advance (Click to enable)'
          }
          className={`h-7 px-2.5 rounded-lg border transition-all flex items-center text-xs font-semibold cursor-pointer flex-shrink-0 ${
            isAutoShiftEnabled
              ? 'bg-accent/15 border-accent text-accent hover:bg-accent/25'
              : 'border-border-sub text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
          }`}
        >
          <span className={compact ? 'hidden xl:inline' : ''}>Auto Shift</span>
        </button>

        <div className="w-px h-5 bg-border-sub flex-shrink-0" />

        {/* Date time feedback & interactive picker */}
        <div
          onClick={() => {
            const input = dateTimePickerRef.current;
            if (!input) return;
            try {
              const inputWithPicker = input as HTMLInputElement & { showPicker?: () => void };
              if (typeof inputWithPicker.showPicker === 'function') {
                inputWithPicker.showPicker();
              } else {
                input.focus();
              }
            } catch {
              input.focus();
            }
          }}
          className="relative flex items-center gap-2 bg-app-bg hover:bg-surface border border-border-sub hover:border-border-def focus-within:border-accent px-3 py-1 rounded-lg flex-shrink-0 cursor-pointer transition-all shadow-xs"
          title="Click to jump to date & time"
        >
          <Clock className="w-3.5 h-3.5 text-accent flex-shrink-0 pointer-events-none" />
          <span className="text-[11px] font-mono font-semibold text-txt-primary tracking-wide whitespace-nowrap pointer-events-none select-none">
            {replayCurrentTimestamp ? formatDateFeedback(replayCurrentTimestamp) : 'Click cut point to set start...'}
          </span>
          <input
            ref={dateTimePickerRef}
            type="datetime-local"
            value={getDateTimePickerValue(replayCurrentTimestamp)}
            min={getReplayDateTimeBounds().min}
            max={getReplayDateTimeBounds().max}
            onChange={handleDateTimePickerChange}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer [color-scheme:dark]"
            tabIndex={-1}
            aria-label="Select replay date and time"
          />
        </div>
      </div>
    );
  };

  const renderPrecisionSection = (isExitReplay: boolean) => (
    <div className="flex items-center gap-3 flex-shrink-0 text-[10px] text-txt-muted uppercase tracking-wider font-semibold">
      <span className="hidden xl:inline">
        Precision:{' '}
        {settings.pricePrecision === 0
          ? `Auto (${hasData ? detectPricePrecision(allTimeframesData[activeTimeframe] || []) : 4}d)`
          : `${settings.pricePrecision}d`}
      </span>
      <span className="hidden 2xl:inline">•</span>
      <span className="hidden 2xl:inline">Ingested: {hasData ? assetName : 'None'}</span>
      {isExitReplay ? (
        <button
          onClick={() => {
            exitReplayMode();
          }}
          className="flex items-center gap-1 px-3 py-1 rounded-lg border border-status-error/30 bg-status-error/10 text-status-error hover:bg-status-error/20 text-xs font-semibold transition-all cursor-pointer flex-shrink-0 ml-1"
          title="Exit Replay"
        >
          <X className="w-3.5 h-3.5" />
          <span>Exit Replay</span>
        </button>
      ) : (
        <>
          <div className="h-4 w-px bg-border-sub" />
          <button
            disabled={!hasData}
            onClick={() => {
              setIsReplayActive(true);
              setIsSelectingCutPoint(true);
            }}
            className="flex items-center gap-1.5 text-txt-muted hover:text-txt-primary transition-colors duration-150 text-xs font-bold normal-case tracking-normal disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Bar Replay"
          >
            <ChevronsLeft className="w-4 h-4" />
            <span>Replay</span>
          </button>
        </>
      )}
    </div>
  );

  return (
    <footer className="h-12 bg-surface border-t border-border-def flex items-center justify-between px-4 z-20 select-none">
      {isReplayActive ? (
        isRecordingActive ? (
          /* 4-Section Row: Timezone | Recording Controls | Replay Controls | Precision Replay */
          <div className="flex items-center justify-between w-full h-full gap-2 overflow-hidden">
            {/* 1. Timezone on the left */}
            {renderTimezonePicker()}

            {/* 2. Recording Controls inline */}
            <RecordingFloatingBar />

            {/* 3. Replay Controls beside them */}
            {renderReplayControls(true)}

            {/* 4. Precision Replay on the right */}
            {renderPrecisionSection(true)}
          </div>
        ) : (
          /* Normal non-recording Replay layout (UNCHANGED) */
          <div className="flex items-center justify-between w-full h-full">
            {/* Left side: Replay Active Status & Data Range */}
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse flex-shrink-0" />
              <span className="text-xs font-bold text-txt-primary uppercase tracking-wider whitespace-nowrap">Replay Active</span>
              {availableDataRangeText && (
                <>
                  <span className="text-txt-muted text-xs">•</span>
                  <span className="text-[11px] font-mono text-txt-muted truncate whitespace-nowrap">
                    {availableDataRangeText}
                  </span>
                </>
              )}
            </div>

            {/* Center: Replay Controls */}
            {renderReplayControls(false)}

            {/* Right side: Exit Button */}
            <button
              onClick={() => {
                exitReplayMode();
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-lg border border-status-error/30 bg-status-error/10 text-status-error hover:bg-status-error/20 text-xs font-semibold transition-all cursor-pointer flex-shrink-0 ml-2"
              title="Exit Replay"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit Replay</span>
            </button>
          </div>
        )
      ) : (
        /* Replay not active */
        <div className="flex items-center justify-between w-full h-full text-[10px] text-txt-muted uppercase tracking-wider font-semibold">
          {renderTimezonePicker()}

          {/* If recording while Replay is not active, render recording controls inline */}
          {isRecordingActive && <RecordingFloatingBar />}

          {renderPrecisionSection(false)}
        </div>
      )}
    </footer>
  );
};

