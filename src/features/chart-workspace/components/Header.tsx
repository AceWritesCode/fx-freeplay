import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  Settings, 
  LayoutGrid,
  Info,
  Database,
  Minus,
  Plus,
} from 'lucide-react';
import type { TimeframeOption } from '@/config';
import { CaptureButton } from '@/features/capture-recording';
import { Select } from '@/components/common';

interface HeaderProps {
  onNavigateHome?: () => void;
  assetName: string;
  hasData: boolean;
  parseFeedback: any;
  showStats: boolean;
  setShowStats: (v: boolean) => void;
  activeTimeframe: string;
  onTimeframeSelect: (tf: string) => void;
  HEADER_TIMEFRAMES: string[];
  PRESET_TIMEFRAMES: TimeframeOption[];
  isTfDropdownOpen: boolean;
  setIsTfDropdownOpen: (v: boolean) => void;
  customValue: number;
  setCustomValue: (v: number) => void;
  customUnit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  setCustomUnit: (v: 'minutes' | 'hours' | 'days' | 'weeks' | 'months') => void;
  handleAddCustomTimeframe: (val: number, unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months') => void;
  customTimeframes: { label: string; value: string; minutes: number }[];
  isLayoutDropdownOpen: boolean;
  setIsLayoutDropdownOpen: (v: boolean) => void;
  layoutType: string;
  LAYOUT_OPTIONS: { type: string; label: string; icon: React.ComponentType<any> | React.ReactNode }[];
  handleSelectLayout: (type: string) => void;
  onOpenThemeModal: () => void;
  onOpenDataManagementModal?: () => void;
  syncSymbol: boolean;
  syncInterval: boolean;
  syncCrosshair: boolean;
  syncDrawings: boolean;
  syncTime: boolean;
  syncDateRange: boolean;
  onSyncSettingChange: (key: 'syncSymbol' | 'syncInterval' | 'syncCrosshair' | 'syncTime' | 'syncDateRange' | 'syncDrawings', val: boolean) => void;
}

interface CustomIntervalStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
}

const CustomIntervalStepper: React.FC<CustomIntervalStepperProps> = ({
  value,
  min = 1,
  max = 1000,
  onChange,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [text, setText] = useState(() => String(value));

  useEffect(() => {
    if (!isFocused) {
      setText(String(value));
    }
  }, [value, isFocused]);

  const handleDecrement = () => {
    const next = Math.max(min, (value || min) - 1);
    onChange(next);
    setText(String(next));
  };

  const handleIncrement = () => {
    const next = Math.min(max, (value || min) + 1);
    onChange(next);
    setText(String(next));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) {
      handleIncrement();
    } else if (e.deltaY > 0) {
      handleDecrement();
    }
  };

  const commitValue = (inputStr: string) => {
    const num = parseInt(inputStr, 10);
    const finalVal = isNaN(num) ? min : Math.max(min, Math.min(max, num));
    onChange(finalVal);
    setText(String(finalVal));
  };

  return (
    <div
      onWheel={handleWheel}
      className="flex items-center justify-between bg-surface-elevated border border-border-sub hover:border-border-def focus-within:border-accent rounded-lg p-1 transition-colors h-9 select-none"
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className="w-7 h-7 flex items-center justify-center rounded-md bg-app-bg hover:bg-surface-hover text-txt-muted hover:text-txt-primary active:scale-95 transition-all cursor-pointer border border-border-sub/40 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
        title="Decrease interval"
        aria-label="Decrease interval"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        value={isFocused ? text : String(value)}
        onFocus={(e) => {
          setIsFocused(true);
          setText(String(value));
          e.target.select();
        }}
        onBlur={(e) => {
          setIsFocused(false);
          commitValue(e.target.value);
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
          setText(raw);
          if (raw !== '') {
            const num = parseInt(raw, 10);
            if (!isNaN(num)) {
              onChange(Math.max(min, Math.min(max, num)));
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleIncrement();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleDecrement();
          } else if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-10 text-center font-mono text-xs font-bold text-txt-primary bg-transparent focus:outline-hidden tracking-wider cursor-text select-text"
        aria-label="Custom Interval Value"
      />

      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        className="w-7 h-7 flex items-center justify-center rounded-md bg-app-bg hover:bg-surface-hover text-txt-muted hover:text-txt-primary active:scale-95 transition-all cursor-pointer border border-border-sub/40 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
        title="Increase interval"
        aria-label="Increase interval"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

type CustomUnitType = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

interface CustomIntervalUnitDropdownProps {
  value: CustomUnitType;
  onChange: (val: CustomUnitType) => void;
}

const UNIT_OPTIONS: Array<{ value: CustomUnitType; label: string }> = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
];

const CustomIntervalUnitDropdown: React.FC<CustomIntervalUnitDropdownProps> = ({
  value,
  onChange,
}) => {
  return (
    <Select
      value={value}
      onChange={(val) => onChange(val as CustomUnitType)}
      options={UNIT_OPTIONS}
      className="h-9 w-full bg-surface-elevated font-bold"
      menuClassName="min-w-full"
    />
  );
};

export const Header: React.FC<HeaderProps> = (props) => {
  const {
    assetName,
    hasData,
    parseFeedback,
    showStats,
    setShowStats,
    activeTimeframe,
    onTimeframeSelect,
    HEADER_TIMEFRAMES,
    PRESET_TIMEFRAMES,
    isTfDropdownOpen,
    setIsTfDropdownOpen,
    customValue,
    setCustomValue,
    customUnit,
    setCustomUnit,
    handleAddCustomTimeframe,
    customTimeframes,
    isLayoutDropdownOpen,
    setIsLayoutDropdownOpen,
    layoutType,
    LAYOUT_OPTIONS,
    handleSelectLayout,
    onOpenThemeModal,
    onOpenDataManagementModal,
    syncSymbol,
    syncInterval,
    syncCrosshair,
    syncDrawings,
    syncTime,
    syncDateRange,
    onSyncSettingChange,
  } = props;

  return (
    <header className="h-12 bg-surface border-b border-border-def px-4 flex items-center justify-between select-none z-30">
      {/* Left: Brand & Symbol */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-accent font-bold tracking-wider">
          <div className="w-6 h-6 rounded-md bg-surface-elevated border border-border-def p-0.5 flex items-center justify-center shadow-xs">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <defs>
                <linearGradient id="hdrSilverGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#cfd8dc" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
                <linearGradient id="hdrBlueGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--accent-hover)" />
                  <stop offset="100%" stopColor="var(--accent-primary)" />
                </linearGradient>
              </defs>
              <path fill="url(#hdrSilverGrad)" d="M 30 110 L 30 70 L 70 30 L 170 30 L 130 70 L 70 70 Z" />
              <path fill="url(#hdrBlueGrad)" d="M 30 170 L 30 130 L 70 90 L 140 90 L 100 130 L 70 130 Z" />
            </svg>
          </div>
          <span className="text-sm font-black text-txt-primary tracking-tight">FX FREEPLAY</span>
        </div>
        <div className="h-4 w-px bg-border-sub" />
        <span className="text-sm font-semibold text-txt-primary truncate max-w-[120px] sm:max-w-xs">{assetName}</span>

        {hasData && parseFeedback && (
          <button
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
              parseFeedback.skippedCount > 0
                ? 'bg-status-warning/10 border-status-warning/20 text-status-warning hover:bg-status-warning/20'
                : 'bg-status-success/10 border-status-success/20 text-status-success hover:bg-status-success/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${parseFeedback.skippedCount > 0 ? 'bg-status-warning' : 'bg-status-success'}`} />
            <span>{parseFeedback.skippedCount > 0 ? 'Warnings' : 'Import OK'}</span>
          </button>
        )}
      </div>

      {/* Center: Timeframes */}
      <div className="relative flex items-center bg-app-bg p-0.5 rounded-lg border border-border-sub">
        {HEADER_TIMEFRAMES.map((tfValue) => {
          const isPresetActive = activeTimeframe === tfValue;
          const preset = PRESET_TIMEFRAMES.find(p => p.value === tfValue);
          const label = preset ? preset.label : tfValue;
          return (
            <button
              key={tfValue}
              disabled={!hasData}
              onClick={() => onTimeframeSelect(tfValue)}
              className={`px-3 py-1 rounded-md text-xs font-semibold tracking-wide transition-all ${
                isPresetActive
                  ? 'bg-accent text-txt-inverse shadow-md'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent'
              }`}
            >
              {label}
            </button>
          );
        })}

        {/* Temporary Active Button if it is not in the Header presets */}
        {!HEADER_TIMEFRAMES.includes(activeTimeframe) && (
          <button
            disabled={!hasData}
            className="px-3 py-1 rounded-md text-xs font-semibold tracking-wide bg-accent text-txt-inverse shadow-md"
          >
            {activeTimeframe}
          </button>
        )}

        {/* Dropdown Chevron Button */}
        <div className="relative flex items-center">
          <button
            disabled={!hasData}
            onClick={() => setIsTfDropdownOpen(!isTfDropdownOpen)}
            className={`p-1.5 ml-0.5 rounded-md text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors disabled:opacity-40 cursor-pointer ${
              isTfDropdownOpen ? 'bg-surface-hover text-txt-primary' : ''
            }`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {isTfDropdownOpen && (
            <>
              {/* Dismiss backdrop */}
              <div 
                className="fixed inset-0 z-30 cursor-default" 
                onClick={() => setIsTfDropdownOpen(false)}
              />
              
              {/* Premium Dropdown Popover */}
              <div className="absolute top-full right-0 mt-1.5 z-40 w-72 bg-surface border border-border-def rounded-xl shadow-2xl p-3 flex flex-col gap-3 text-left">
                {/* Minutes Grid */}
                <div>
                  <div className="text-txt-muted text-[10px] font-bold uppercase tracking-wider mb-1.5">Minutes</div>
                  <div className="grid grid-cols-4 gap-1">
                    {['1m', '2m', '3m', '5m', '10m', '15m', '30m', '45m'].map((tfVal) => {
                      const preset = PRESET_TIMEFRAMES.find(p => p.value === tfVal);
                      const label = preset ? preset.label : tfVal;
                      const isActive = activeTimeframe === tfVal;
                      return (
                        <button
                          key={tfVal}
                          onClick={() => {
                            onTimeframeSelect(tfVal);
                            setIsTfDropdownOpen(false);
                          }}
                          className={`px-2 py-1 rounded text-xs font-semibold text-center transition-all cursor-pointer ${
                            isActive
                              ? 'bg-accent text-txt-inverse shadow-sm'
                              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hours Grid */}
                <div>
                  <div className="text-txt-muted text-[10px] font-bold uppercase tracking-wider mb-1.5">Hours</div>
                  <div className="grid grid-cols-4 gap-1">
                    {['1h', '2h', '3h', '4h', '6h', '12h'].map((tfVal) => {
                      const preset = PRESET_TIMEFRAMES.find(p => p.value === tfVal);
                      const label = preset ? preset.label : tfVal;
                      const isActive = activeTimeframe === tfVal;
                      return (
                        <button
                          key={tfVal}
                          onClick={() => {
                            onTimeframeSelect(tfVal);
                            setIsTfDropdownOpen(false);
                          }}
                          className={`px-2 py-1 rounded text-xs font-semibold text-center transition-all cursor-pointer ${
                            isActive
                              ? 'bg-accent text-txt-inverse shadow-sm'
                              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Days & Above Grid */}
                <div>
                  <div className="text-txt-muted text-[10px] font-bold uppercase tracking-wider mb-1.5">Days & Above</div>
                  <div className="grid grid-cols-4 gap-1">
                    {['D', 'W', 'M'].map((tfVal) => {
                      const preset = PRESET_TIMEFRAMES.find(p => p.value === tfVal);
                      const label = preset ? preset.label : tfVal;
                      const isActive = activeTimeframe === tfVal;
                      return (
                        <button
                          key={tfVal}
                          onClick={() => {
                            onTimeframeSelect(tfVal);
                            setIsTfDropdownOpen(false);
                          }}
                          className={`px-2 py-1 rounded text-xs font-semibold text-center transition-all cursor-pointer ${
                            isActive
                              ? 'bg-accent text-txt-inverse shadow-sm'
                              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Timeframes */}
                {customTimeframes.length > 0 && (
                  <div>
                    <div className="text-txt-muted text-[10px] font-bold uppercase tracking-wider mb-1.5">Custom</div>
                    <div className="grid grid-cols-4 gap-1">
                      {customTimeframes.map((tf) => {
                        const isActive = activeTimeframe === tf.value;
                        return (
                          <button
                            key={tf.value}
                            onClick={() => {
                              onTimeframeSelect(tf.value);
                              setIsTfDropdownOpen(false);
                            }}
                            className={`px-2 py-1 rounded text-xs font-semibold text-center transition-all cursor-pointer ${
                              isActive
                                ? 'bg-accent text-txt-inverse shadow-sm'
                                : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                            }`}
                          >
                            {tf.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="h-px bg-border-sub my-0.5" />

                {/* Add Custom Interval Form */}
                <div className="flex flex-col gap-2">
                  <div className="text-txt-muted text-[10px] font-bold uppercase tracking-wider">
                    Add Custom Interval
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <CustomIntervalStepper
                      value={customValue}
                      min={1}
                      max={1000}
                      onChange={setCustomValue}
                    />
                    <CustomIntervalUnitDropdown
                      value={customUnit}
                      onChange={setCustomUnit}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleAddCustomTimeframe(customValue, customUnit);
                      setIsTfDropdownOpen(false);
                    }}
                    className="w-full py-2 bg-accent hover:bg-accent-hover text-txt-inverse text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer active:scale-[0.99] flex items-center justify-center gap-1.5"
                  >
                    Add Custom Interval
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Side: Replay, Layout, Settings */}
      <div className="flex items-center gap-2">


        {hasData && (
          <div className="relative">
            <button
              onClick={() => setIsLayoutDropdownOpen(!isLayoutDropdownOpen)}
              title="Select layout"
              className={`p-2 rounded-lg border bg-surface hover:bg-surface-hover transition-colors duration-150 flex items-center justify-center cursor-pointer ${
                isLayoutDropdownOpen ? 'text-accent border-accent' : 'border-border-def text-txt-muted hover:text-txt-primary'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            {isLayoutDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsLayoutDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 z-50 w-72 bg-surface border border-border-def rounded-xl shadow-2xl p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-txt-muted uppercase tracking-wider mb-2.5">
                        Select Layout
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {LAYOUT_OPTIONS.map((lay) => {
                          const isSelected = layoutType === lay.type;
                          const iconEl = React.isValidElement(lay.icon) ? lay.icon : null;
                          return (
                            <button
                              key={lay.type}
                              onClick={() => {
                                handleSelectLayout(lay.type);
                                setIsLayoutDropdownOpen(false);
                              }}
                              title={lay.label}
                              className={`p-1.5 rounded border transition-all duration-150 flex items-center justify-center cursor-pointer ${
                                isSelected
                                  ? 'bg-accent-muted border-accent text-accent'
                                  : 'border-border-sub hover:border-border-def text-txt-muted hover:text-txt-primary'
                              }`}
                            >
                              {iconEl}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="h-px bg-border-sub" />

                    <div>
                      <div className="text-[10px] font-bold text-txt-muted uppercase tracking-wider mb-3">
                        SYNC IN LAYOUT
                      </div>
                      <div className="flex flex-col gap-3.5 text-xs text-txt-secondary">
                        {/* Symbol Sync */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[13px] font-medium text-txt-primary">
                            <span>Symbol</span>
                            <Info className="w-3.5 h-3.5 text-txt-muted hover:text-txt-primary transition-colors cursor-help" />
                          </div>
                          <div
                            onClick={() => onSyncSettingChange('syncSymbol', !syncSymbol)}
                            className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${
                              syncSymbol ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full absolute top-[1px] left-[2px] transition-transform duration-200 ${
                                syncSymbol ? 'bg-white translate-x-[16px]' : 'bg-txt-muted translate-x-0'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Interval Sync */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[13px] font-medium text-txt-primary">
                            <span>Interval</span>
                            <Info className="w-3.5 h-3.5 text-txt-muted hover:text-txt-primary transition-colors cursor-help" />
                          </div>
                          <div
                            onClick={() => onSyncSettingChange('syncInterval', !syncInterval)}
                            className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${
                              syncInterval ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full absolute top-[1px] left-[2px] transition-transform duration-200 ${
                                syncInterval ? 'bg-white translate-x-[16px]' : 'bg-txt-muted translate-x-0'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Crosshair Sync */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[13px] font-medium text-txt-primary">
                            <span>Crosshair</span>
                            <Info className="w-3.5 h-3.5 text-txt-muted hover:text-txt-primary transition-colors cursor-help" />
                          </div>
                          <div
                            onClick={() => onSyncSettingChange('syncCrosshair', !syncCrosshair)}
                            className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${
                              syncCrosshair ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full absolute top-[1px] left-[2px] transition-transform duration-200 ${
                                syncCrosshair ? 'bg-white translate-x-[16px]' : 'bg-txt-muted translate-x-0'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Time Sync */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[13px] font-medium text-txt-primary">
                            <span>Time</span>
                            <Info className="w-3.5 h-3.5 text-txt-muted hover:text-txt-primary transition-colors cursor-help" />
                          </div>
                          <div
                            onClick={() => onSyncSettingChange('syncTime', !syncTime)}
                            className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${
                              syncTime ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full absolute top-[1px] left-[2px] transition-transform duration-200 ${
                                syncTime ? 'bg-white translate-x-[16px]' : 'bg-txt-muted translate-x-0'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Date range Sync */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[13px] font-medium text-txt-primary">
                            <span>Date range</span>
                            <Info className="w-3.5 h-3.5 text-txt-muted hover:text-txt-primary transition-colors cursor-help" />
                          </div>
                          <div
                            onClick={() => onSyncSettingChange('syncDateRange', !syncDateRange)}
                            className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${
                              syncDateRange ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full absolute top-[1px] left-[2px] transition-transform duration-200 ${
                                syncDateRange ? 'bg-white translate-x-[16px]' : 'bg-txt-muted translate-x-0'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Drawings Sync */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[13px] font-medium text-txt-primary">
                            <span>Drawings</span>
                            <Info className="w-3.5 h-3.5 text-txt-muted hover:text-txt-primary transition-colors cursor-help" />
                          </div>
                          <div
                            onClick={() => onSyncSettingChange('syncDrawings', !syncDrawings)}
                            className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${
                              syncDrawings ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full absolute top-[1px] left-[2px] transition-transform duration-200 ${
                                syncDrawings ? 'bg-white translate-x-[16px]' : 'bg-txt-muted translate-x-0'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <CaptureButton />

        {onOpenDataManagementModal && (
          <button
            onClick={onOpenDataManagementModal}
            className="p-2 rounded-lg bg-surface hover:bg-surface-hover text-txt-muted hover:text-txt-primary transition-all cursor-pointer border border-border-sub"
            title="Storage & Data Management"
          >
            <Database className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onOpenThemeModal}
          className="p-2 rounded-lg bg-surface hover:bg-surface-hover text-txt-muted hover:text-txt-primary transition-all cursor-pointer border border-border-sub"
          title="Chart Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

    </header>
  );
};
