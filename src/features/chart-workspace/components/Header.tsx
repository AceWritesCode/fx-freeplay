import React from 'react';
import { 
  LineChart, 
  ChevronDown, 
  Settings, 
  Scissors, 
  LayoutGrid,
  RefreshCw
} from 'lucide-react';
import type { TimeframeOption } from '@/config';

interface HeaderProps {
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
  isReplayActive: boolean;
  setIsReplayActive: (v: boolean) => void;
  isSelectingCutPoint: boolean;
  setIsSelectingCutPoint: (v: boolean) => void;
  replayCurrentTimestamp: number | null;
  isLayoutDropdownOpen: boolean;
  setIsLayoutDropdownOpen: (v: boolean) => void;
  layoutType: string;
  LAYOUT_OPTIONS: { type: string; label: string; icon: React.ComponentType<any> | React.ReactNode }[];
  handleSelectLayout: (type: string) => void;
  onOpenThemeModal: () => void;
  importMode: 'single' | 'folder';
  savedFolderHandle: any;
  isVerifyingFolder: boolean;
  handleRestoreSavedFolder: () => void;
}

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
    isReplayActive,
    setIsReplayActive,
    isSelectingCutPoint,
    setIsSelectingCutPoint,
    replayCurrentTimestamp,
    isLayoutDropdownOpen,
    setIsLayoutDropdownOpen,
    layoutType,
    LAYOUT_OPTIONS,
    handleSelectLayout,
    onOpenThemeModal,
    importMode,
    savedFolderHandle,
    isVerifyingFolder,
    handleRestoreSavedFolder,
  } = props;

  return (
    <header className="h-12 bg-[#1e222d] border-b border-gray-950 flex items-center justify-between px-4 z-20">
      
      {/* Left Side: Asset Name & Status Indicators */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-indigo-400">
          <LineChart className="w-5 h-5" />
          <span className="font-semibold text-xs tracking-wider uppercase text-white">FX Freeplay</span>
        </div>
        <div className="h-4 w-px bg-gray-800" />
        <span className="text-sm font-semibold text-white truncate max-w-[120px] sm:max-w-xs">{assetName}</span>

        {hasData && parseFeedback && (
          <button
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
              parseFeedback.skippedCount > 0
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20'
                : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${parseFeedback.skippedCount > 0 ? 'bg-yellow-400' : 'bg-green-400'}`} />
            <span>{parseFeedback.skippedCount > 0 ? 'Warnings' : 'Import OK'}</span>
          </button>
        )}
      </div>

      {/* Center: Timeframes */}
      <div className="relative flex items-center bg-gray-950/40 p-0.5 rounded-lg border border-gray-800/80">
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
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-850 disabled:opacity-40 disabled:hover:bg-transparent'
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
            className="px-3 py-1 rounded-md text-xs font-semibold tracking-wide bg-indigo-600 text-white shadow-md"
          >
            {activeTimeframe}
          </button>
        )}

        {/* Dropdown Chevron Button */}
        <div className="relative flex items-center">
          <button
            disabled={!hasData}
            onClick={() => setIsTfDropdownOpen(!isTfDropdownOpen)}
            className={`p-1.5 ml-0.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-850 transition-colors disabled:opacity-40 ${
              isTfDropdownOpen ? 'bg-gray-800 text-white' : ''
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
              <div className="absolute top-full right-0 mt-1.5 z-40 w-72 bg-[#1e222d] border border-gray-800 rounded-xl shadow-2xl p-3 flex flex-col gap-3 text-left">
                {/* Minutes Grid */}
                <div>
                  <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Minutes</div>
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
                          className={`px-2 py-1 rounded text-xs font-semibold text-center transition-all ${
                            isActive
                              ? 'bg-indigo-650 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white hover:bg-gray-850'
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
                  <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Hours</div>
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
                          className={`px-2 py-1 rounded text-xs font-semibold text-center transition-all ${
                            isActive
                              ? 'bg-indigo-650 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white hover:bg-gray-850'
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
                  <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Days & Above</div>
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
                          className={`px-2 py-1 rounded text-xs font-semibold text-center transition-all ${
                            isActive
                              ? 'bg-indigo-650 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white hover:bg-gray-850'
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
                    <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Custom</div>
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
                            className={`px-2 py-1 rounded text-xs font-semibold text-center transition-all ${
                              isActive
                                ? 'bg-indigo-650 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-gray-850'
                            }`}
                          >
                            {tf.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="h-px bg-gray-850/80 my-0.5" />

                {/* Add Custom Interval Form */}
                <div className="flex flex-col gap-1.5">
                  <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Add Custom Interval</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={customValue}
                      onChange={(e) => setCustomValue(parseInt(e.target.value) || 1)}
                      className="w-16 px-2.5 py-1.5 bg-gray-950 border border-gray-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 text-center font-semibold"
                    />
                    
                    <select
                      value={customUnit}
                      onChange={(e: any) => setCustomUnit(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-gray-950 border border-gray-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      handleAddCustomTimeframe(customValue, customUnit);
                      setIsTfDropdownOpen(false);
                    }}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    Add Option
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Side: Replay, Layout, Settings */}
      <div className="flex items-center gap-2">
        {hasData && importMode === 'folder' && savedFolderHandle && (
          <button
            onClick={handleRestoreSavedFolder}
            disabled={isVerifyingFolder}
            title="Refresh all folder data (re-read CSV files)"
            className="p-2 rounded-lg border border-gray-850 bg-[#1e222d] hover:bg-gray-800 text-gray-400 hover:text-white transition-colors duration-150 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isVerifyingFolder ? 'animate-spin' : ''}`} />
          </button>
        )}

        {hasData && (
          <button
            onClick={() => {
              if (isReplayActive) {
                setIsReplayActive(false);
                setIsSelectingCutPoint(false);
              } else {
                setIsReplayActive(true);
                setIsSelectingCutPoint(true);
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg border transition-all text-xs font-bold flex items-center gap-2 cursor-pointer ${
              isReplayActive
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/15'
                : isSelectingCutPoint
                ? 'border-indigo-500/40 text-indigo-400 bg-indigo-650/10'
                : 'border-gray-800 bg-[#1e222d] text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Replay</span>
            {isReplayActive && replayCurrentTimestamp && (
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            )}
          </button>
        )}

        {hasData && (
          <div className="relative">
            <button
              onClick={() => setIsLayoutDropdownOpen(!isLayoutDropdownOpen)}
              title="Select layout"
              className={`p-2 rounded-lg border border-gray-800 bg-[#1e222d] hover:bg-gray-800 transition-colors duration-150 flex items-center justify-center cursor-pointer ${
                isLayoutDropdownOpen ? 'text-indigo-400 border-indigo-500/50' : 'text-gray-400 hover:text-white'
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
                <div className="absolute right-0 mt-2 z-50 w-72 bg-[#1e222d] border border-gray-800 rounded-xl shadow-2xl p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5">
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
                                ? 'bg-indigo-650/10 border-indigo-500 text-indigo-400'
                                : 'border-gray-800 hover:border-gray-700 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            {iconEl}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <button
          onClick={onOpenThemeModal}
          className="p-2 rounded-lg border border-gray-850 bg-[#1e222d] hover:bg-gray-800 text-gray-400 hover:text-white transition-all cursor-pointer"
          title="Chart Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

    </header>
  );
};
