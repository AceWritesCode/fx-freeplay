import React, { useState } from 'react';
import { X, Paintbrush, Percent, Clock, Play } from 'lucide-react';
const CUSTOM_PRESETS_KEY = 'fx_custom_presets';

import { PRESET_SETTINGS, TIMEZONE_OPTIONS } from '@/config';
import type { ChartSettings, TimezoneOption } from '@/config';
export type { ChartSettings, TimezoneOption };



// Derive numeric offset from a label string (unique lookup)
export function getLabelOffset(label: string): number {
  const found = TIMEZONE_OPTIONS.find(opt => opt.label === label);
  if (!found || found.value === 'exchange') return 0;
  return found.value as number;
}

export function formatDateFeedback(timestamp: number): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  return `${day} ${month} ${year} ${strTime}`;
}

// TIMEZONE_OPTIONS list has been moved to config


interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChartSettings;
  onSettingsSave: (newSettings: ChartSettings) => void;
  hasData: boolean;
  onClearDatabase?: () => void;
  assetName?: string;
  savedFolderHandles?: any[];
  onSelectFolder?: () => void;
}

type TabType = 'Symbol' | 'Canvas' | 'Scales' | 'Timezone' | 'Replay';

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsSave,
  hasData: _hasData,
  onClearDatabase: _onClearDatabase,
  assetName: _assetName = 'No Asset Loaded',
  savedFolderHandles: _savedFolderHandles = [],
  onSelectFolder: _onSelectFolder,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<TabType>('Symbol');
  const [formState, setFormState] = useState<ChartSettings>({ ...settings });

  // Custom presets: stored in localStorage, keyed by user-chosen name
  const [customPresets, setCustomPresets] = useState<{ [name: string]: ChartSettings }>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Save-preset inline UI state
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const [saveNameError, setSaveNameError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');



  const handleFieldChange = (key: keyof ChartSettings, value: any) => {
    setFormState(prev => ({
      ...prev,
      [key]: value,
    }));
  };



  const handleApplyPreset = (presetKey: string) => {
    const builtIn = PRESET_SETTINGS[presetKey];
    if (builtIn) { setFormState({ ...builtIn }); return; }
    const custom = customPresets[presetKey];
    if (custom) { setFormState({ ...custom }); }
  };

  const persistCustomPresets = (updated: { [name: string]: ChartSettings }) => {
    setCustomPresets(updated);
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updated));
  };

  const handleSavePreset = () => {
    const name = savePresetName.trim();
    if (!name) { setSaveNameError('Enter a name.'); return; }
    if (PRESET_SETTINGS[name.toLowerCase()]) { setSaveNameError('Cannot overwrite a built-in preset.'); return; }
    persistCustomPresets({ ...customPresets, [name]: { ...formState } });
    setSavePresetName('');
    setSaveNameError('');
    setIsSavingPreset(false);
  };

  const handleDeleteCustomPreset = (name: string) => {
    const updated = { ...customPresets };
    delete updated[name];
    persistCustomPresets(updated);
  };

  const customPresetNames = Object.keys(customPresets);
  const builtInEntries = [
    { key: 'classic',  label: 'TradingView Classic' },
    { key: 'obsidian', label: 'Midnight Obsidian' },
    { key: 'matrix',   label: 'Matrix High-Contrast' },
  ];

  const handleSave = () => {
    onSettingsSave(formState);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs font-sans">
      <div className="w-[720px] max-w-[92vw] h-[560px] max-h-[88vh] bg-[#1e222d] border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/80">
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-150 p-1 hover:bg-gray-800 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Sidebar (Tabs) */}
          <div className="w-44 bg-[#1a1d26] border-r border-gray-800/80 py-3 flex flex-col gap-1 select-none">
            <button
              onClick={() => setActiveTab('Symbol')}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold text-left transition-all ${
                activeTab === 'Symbol'
                  ? 'bg-[#1e222d] text-white border-l-2 border-indigo-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 mr-2.5 fill-current">
                <rect x="9" y="6" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" />
                <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Symbol</span>
            </button>

            <button
              onClick={() => setActiveTab('Canvas')}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold text-left transition-all ${
                activeTab === 'Canvas'
                  ? 'bg-[#1e222d] text-white border-l-2 border-indigo-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
              }`}
            >
              <Paintbrush className="w-4.5 h-4.5 mr-2.5" />
              <span>Canvas</span>
            </button>

            <button
              onClick={() => setActiveTab('Scales')}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold text-left transition-all ${
                activeTab === 'Scales'
                  ? 'bg-[#1e222d] text-white border-l-2 border-indigo-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
              }`}
            >
              <Percent className="w-4.5 h-4.5 mr-2.5" />
              <span>Scales & Lines</span>
            </button>

            <button
              onClick={() => setActiveTab('Timezone')}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold text-left transition-all ${
                activeTab === 'Timezone'
                  ? 'bg-[#1e222d] text-white border-l-2 border-indigo-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
              }`}
            >
              <Clock className="w-4.5 h-4.5 mr-2.5" />
              <span>Timezone</span>
            </button>

            <button
              onClick={() => setActiveTab('Replay')}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold text-left transition-all ${
                activeTab === 'Replay'
                  ? 'bg-[#1e222d] text-white border-l-2 border-indigo-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
              }`}
            >
              <Play className="w-4.5 h-4.5 mr-2.5" />
              <span>Bar Replay</span>
            </button>
          </div>

          {/* Right Content Pane */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#1e222d] text-xs text-gray-300">
            
            {/* Tab: Symbol */}
            {activeTab === 'Symbol' && (
              <div className="flex flex-col gap-5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Candles</div>

                {/* Body Colors */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.showBody}
                      onChange={(e) => handleFieldChange('showBody', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Body Fill</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      disabled={!formState.showBody}
                      value={formState.bullColor}
                      onChange={(e) => handleFieldChange('bullColor', e.target.value)}
                      className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer disabled:opacity-40 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-gray-700 [&::-webkit-color-swatch]:rounded"
                    />
                    <input
                      type="color"
                      disabled={!formState.showBody}
                      value={formState.bearColor}
                      onChange={(e) => handleFieldChange('bearColor', e.target.value)}
                      className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer disabled:opacity-40 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-gray-700 [&::-webkit-color-swatch]:rounded"
                    />
                  </div>
                </div>

                {/* Borders Colors */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.showBorders}
                      onChange={(e) => handleFieldChange('showBorders', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Borders</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      disabled={!formState.showBorders}
                      value={formState.bullBorderColor}
                      onChange={(e) => handleFieldChange('bullBorderColor', e.target.value)}
                      className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer disabled:opacity-40 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-gray-700 [&::-webkit-color-swatch]:rounded"
                    />
                    <input
                      type="color"
                      disabled={!formState.showBorders}
                      value={formState.bearBorderColor}
                      onChange={(e) => handleFieldChange('bearBorderColor', e.target.value)}
                      className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer disabled:opacity-40 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-gray-700 [&::-webkit-color-swatch]:rounded"
                    />
                  </div>
                </div>

                {/* Wick Colors */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.showWicks}
                      onChange={(e) => handleFieldChange('showWicks', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Wick Color</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      disabled={!formState.showWicks}
                      value={formState.bullWickColor}
                      onChange={(e) => handleFieldChange('bullWickColor', e.target.value)}
                      className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer disabled:opacity-40 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-gray-700 [&::-webkit-color-swatch]:rounded"
                    />
                    <input
                      type="color"
                      disabled={!formState.showWicks}
                      value={formState.bearWickColor}
                      onChange={(e) => handleFieldChange('bearWickColor', e.target.value)}
                      className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer disabled:opacity-40 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-gray-700 [&::-webkit-color-swatch]:rounded"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-800 my-2" />
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Price Line</div>

                {/* Price Line settings */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.showPriceLine}
                      onChange={(e) => handleFieldChange('showPriceLine', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Last Price Line</span>
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <select
                      disabled={!formState.showPriceLine}
                      value={formState.priceLineStyle}
                      onChange={(e) => handleFieldChange('priceLineStyle', e.target.value)}
                      className="w-20 bg-[#131722] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-40"
                    >
                      <option value="dashed">Dashed</option>
                      <option value="solid">Solid</option>
                    </select>
                    
                    <select
                      disabled={!formState.showPriceLine}
                      value={formState.priceLineSize}
                      onChange={(e) => handleFieldChange('priceLineSize', parseInt(e.target.value))}
                      className="w-16 bg-[#131722] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-40"
                    >
                      <option value="1">1 px</option>
                      <option value="2">2 px</option>
                      <option value="3">3 px</option>
                    </select>
                  </div>
                </div>

                {/* Price Line Label Toggle */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!formState.showPriceLine}
                      checked={formState.showPriceLineLabel}
                      onChange={(e) => handleFieldChange('showPriceLineLabel', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 disabled:opacity-40"
                    />
                    <span className={!formState.showPriceLine ? 'text-gray-500' : ''}>Last Price Line Label</span>
                  </label>
                </div>

                {/* Price Line Color & Candle Color Matching */}
                <div className="flex items-center justify-between">
                  <span className={!formState.showPriceLine ? 'text-gray-500' : ''}>Price Line Color</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 select-none cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        disabled={!formState.showPriceLine}
                        checked={formState.priceLineUseCandleColor}
                        onChange={(e) => handleFieldChange('priceLineUseCandleColor', e.target.checked)}
                        className="w-3 h-3 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 disabled:opacity-40"
                      />
                      <span className={!formState.showPriceLine ? 'text-gray-500' : ''}>Match Candle</span>
                    </label>
                    <input
                      type="color"
                      disabled={!formState.showPriceLine || formState.priceLineUseCandleColor}
                      value={formState.priceLineColor}
                      onChange={(e) => handleFieldChange('priceLineColor', e.target.value)}
                      className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer disabled:opacity-40 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-gray-700 [&::-webkit-color-swatch]:rounded"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-800 my-2" />
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data Settings</div>

                {/* Precision Dropdown */}
                <div className="flex items-center justify-between">
                  <span>Price Precision</span>
                  <select
                    value={formState.pricePrecision}
                    onChange={(e) => handleFieldChange('pricePrecision', parseInt(e.target.value))}
                    className="w-32 bg-[#131722] border border-gray-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="0">Auto (Detect)</option>
                    <option value="2">2 Decimals</option>
                    <option value="3">3 Decimals</option>
                    <option value="4">4 Decimals</option>
                    <option value="5">5 Decimals</option>
                  </select>
                </div>
              </div>
            )}

            {/* Tab: Canvas */}
            {activeTab === 'Canvas' && (
              <div className="flex flex-col gap-5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Basic Styles</div>

                {/* Canvas Background */}
                <div className="flex items-center justify-between">
                  <span>Canvas Background</span>
                  <div className="flex items-center gap-2.5">
                    <select
                      value={formState.backgroundType}
                      onChange={(e) => handleFieldChange('backgroundType', e.target.value)}
                      className="w-24 bg-[#131722] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Solid">Solid</option>
                      <option value="None">None</option>
                    </select>
                    <input
                      type="color"
                      disabled={formState.backgroundType === 'None'}
                      value={formState.background}
                      onChange={(e) => handleFieldChange('background', e.target.value)}
                      className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer disabled:opacity-40 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-gray-700 [&::-webkit-color-swatch]:rounded"
                    />
                  </div>
                </div>

                {/* Grid Lines */}
                <div className="flex items-center justify-between">
                  <span>Grid Lines</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={formState.gridType}
                      onChange={(e) => handleFieldChange('gridType', e.target.value)}
                      className="w-28 bg-[#131722] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Vert and Horiz">Vert & Horiz</option>
                      <option value="Horizontal Only">Horizontal Only</option>
                      <option value="Vertical Only">Vertical Only</option>
                      <option value="None">None</option>
                    </select>
                    <select
                      value={formState.gridStyle}
                      disabled={formState.gridType === 'None'}
                      onChange={(e) => handleFieldChange('gridStyle', e.target.value)}
                      className="w-20 bg-[#131722] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-40"
                    >
                      <option value="dashed">Dashed</option>
                      <option value="solid">Solid</option>
                    </select>
                    <input
                      type="color"
                      disabled={formState.gridType === 'None'}
                      value={formState.gridColor}
                      onChange={(e) => handleFieldChange('gridColor', e.target.value)}
                      className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer disabled:opacity-40 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-gray-700 [&::-webkit-color-swatch]:rounded"
                    />
                  </div>
                </div>

                {/* Watermark Toggle */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.showWatermark}
                      onChange={(e) => handleFieldChange('showWatermark', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Asset Watermark</span>
                  </label>
                </div>

                {/* Session Breaks */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.showSessionBreaks}
                      onChange={(e) => handleFieldChange('showSessionBreaks', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Session breaks</span>
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={formState.sessionBreaksStyle}
                      disabled={!formState.showSessionBreaks}
                      onChange={(e) => handleFieldChange('sessionBreaksStyle', e.target.value)}
                      className="w-20 bg-[#131722] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-40"
                    >
                      <option value="dashed">Dashed</option>
                      <option value="solid">Solid</option>
                    </select>

                    <select
                      value={formState.sessionBreaksSize}
                      disabled={!formState.showSessionBreaks}
                      onChange={(e) => handleFieldChange('sessionBreaksSize', parseInt(e.target.value, 10))}
                      className="w-16 bg-[#131722] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-40"
                    >
                      <option value="1">1 px</option>
                      <option value="2">2 px</option>
                      <option value="3">3 px</option>
                    </select>

                    <input
                      type="color"
                      disabled={!formState.showSessionBreaks}
                      value={formState.sessionBreaksColor}
                      onChange={(e) => handleFieldChange('sessionBreaksColor', e.target.value)}
                      className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer disabled:opacity-40 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-gray-700 [&::-webkit-color-swatch]:rounded"
                    />
                  </div>
                </div>

                {/* Magnet Sensitivity */}
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-2 mb-1">Magnet Snap Intensity</div>
                
                {/* Weak Magnet slider (0-20) */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-300 w-32">Weak magnet</span>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={formState.magnetWeakSensitivity}
                    onChange={(e) => handleFieldChange('magnetWeakSensitivity', parseInt(e.target.value))}
                    className="w-40 h-1.5 appearance-none rounded-full bg-gray-700 accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-indigo-400 w-14 text-right">
                    {formState.magnetWeakSensitivity}px
                  </span>
                </div>

                {/* Normal Magnet slider (20-60) */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-300 w-32">Normal magnet</span>
                  <input
                    type="range"
                    min={20}
                    max={60}
                    step={1}
                    value={formState.magnetNormalSensitivity}
                    onChange={(e) => handleFieldChange('magnetNormalSensitivity', parseInt(e.target.value))}
                    className="w-40 h-1.5 appearance-none rounded-full bg-gray-700 accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-indigo-400 w-14 text-right">
                    {formState.magnetNormalSensitivity}px
                  </span>
                </div>

                {/* Strong Magnet slider (60-100) */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-300 w-32">Strong magnet</span>
                  <input
                    type="range"
                    min={60}
                    max={100}
                    step={1}
                    value={formState.magnetStrongSensitivity}
                    onChange={(e) => handleFieldChange('magnetStrongSensitivity', parseInt(e.target.value))}
                    className="w-40 h-1.5 appearance-none rounded-full bg-gray-700 accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-indigo-400 w-14 text-right">
                    {formState.magnetStrongSensitivity >= 100 ? 'Always' : `${formState.magnetStrongSensitivity}px`}
                  </span>
                </div>
              </div>
            )}

            {/* Tab: Scales */}
            {activeTab === 'Scales' && (
              <div className="flex flex-col gap-5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Scale Display</div>

                {/* Scales Text */}
                <div className="flex items-center justify-between">
                  <span>Axis Labels (Text)</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={formState.scalesTextSize}
                      onChange={(e) => handleFieldChange('scalesTextSize', parseInt(e.target.value))}
                      className="w-20 bg-[#131722] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="10">10 px</option>
                      <option value="11">11 px</option>
                      <option value="12">12 px</option>
                      <option value="13">13 px</option>
                      <option value="14">14 px</option>
                    </select>
                    <input
                      type="color"
                      value={formState.scalesTextColor}
                      onChange={(e) => handleFieldChange('scalesTextColor', e.target.value)}
                      className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-gray-700 [&::-webkit-color-swatch]:rounded"
                    />
                  </div>
                </div>

                {/* Scale Axis Lines */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.showScalesLines}
                      onChange={(e) => handleFieldChange('showScalesLines', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Scale Axis Lines</span>
                  </label>
                  <input
                    type="color"
                    disabled={!formState.showScalesLines}
                    value={formState.scalesLinesColor}
                    onChange={(e) => handleFieldChange('scalesLinesColor', e.target.value)}
                    className="w-6 h-6 bg-transparent border-0 rounded cursor-pointer disabled:opacity-40 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-gray-700 [&::-webkit-color-swatch]:rounded"
                  />
                </div>
              </div>
            )}

            {/* Tab: Timezone */}
            {activeTab === 'Timezone' && (
              <div className="flex flex-col gap-5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Timezone Adjustment</div>

                {/* Adjustment Toggle */}
                <div className="flex items-center justify-between">
                  <span>Enable Timezone Adjustment</span>
                  <label className="flex items-center select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.timezoneAdjustmentEnabled}
                      onChange={(e) => handleFieldChange('timezoneAdjustmentEnabled', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                    />
                  </label>
                </div>

                {/* Broker Timezone Select */}
                <div className="flex items-center justify-between">
                  <span className={!formState.timezoneAdjustmentEnabled ? 'opacity-40' : ''}>Broker's Server Timezone</span>
                  <select
                    disabled={!formState.timezoneAdjustmentEnabled}
                    value={formState.brokerTimezoneLabel || ''}
                    onChange={(e) => {
                      const label = e.target.value;
                      const offset = getLabelOffset(label);
                      setFormState(prev => ({ ...prev, brokerTimezoneLabel: label, brokerTimezoneOffset: offset }));
                    }}
                    className="w-40 bg-[#131722] border border-gray-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-40"
                  >
                    {TIMEZONE_OPTIONS.filter(opt => opt.value !== 'exchange').map(opt => (
                      <option key={opt.label} value={opt.label}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* User Timezone Select */}
                <div className="flex items-center justify-between">
                  <span className={!formState.timezoneAdjustmentEnabled ? 'opacity-40' : ''}>User's Target Timezone</span>
                  <select
                    disabled={!formState.timezoneAdjustmentEnabled}
                    value={formState.timezoneAdjustmentEnabled ? (formState.userTimezoneLabel || '') : 'Exchange'}
                    onChange={(e) => {
                      const label = e.target.value;
                      if (label === 'Exchange') {
                        setFormState(prev => ({ ...prev, timezoneAdjustmentEnabled: false }));
                      } else {
                        const offset = getLabelOffset(label);
                        setFormState(prev => ({ ...prev, timezoneAdjustmentEnabled: true, userTimezoneLabel: label, userTimezoneOffset: offset }));
                      }
                    }}
                    className="w-40 bg-[#131722] border border-gray-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-40"
                  >
                    {TIMEZONE_OPTIONS.map(opt => (
                      <option key={opt.label} value={opt.label}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Tab: Replay Speed Range */}
            {activeTab === 'Replay' && (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Bar Replay Speed Limits
                  </div>
                  <p className="text-xs text-gray-400">
                    Configure the maximum (slowest) and minimum (fastest) bar duration boundaries for playback simulation.
                  </p>
                </div>

                {/* Slowest Speed (Max Duration per Bar) */}
                <div className="flex flex-col gap-2 bg-[#131722] p-3.5 rounded-lg border border-gray-800">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-white text-xs">
                      Slowest Speed (Maximum Duration per Bar)
                    </label>
                    <span className="font-mono text-indigo-400 font-bold text-xs">
                      {(formState.replayMaxDuration ?? 3.0).toFixed(2)} s/bar
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="3.00"
                    step="0.01"
                    value={formState.replayMaxDuration ?? 3.0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const minDur = formState.replayMinDuration ?? 0.01;
                      const validatedMax = Math.max(val, minDur);
                      handleFieldChange('replayMaxDuration', validatedMax);
                    }}
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>0.01s / bar</span>
                    <span>3.00s / bar</span>
                  </div>
                </div>

                {/* Fastest Speed (Min Duration per Bar) */}
                <div className="flex flex-col gap-2 bg-[#131722] p-3.5 rounded-lg border border-gray-800">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-white text-xs">
                      Fastest Speed (Minimum Duration per Bar)
                    </label>
                    <span className="font-mono text-indigo-400 font-bold text-xs">
                      {(formState.replayMinDuration ?? 0.01).toFixed(2)} s/bar
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="1.00"
                    step="0.01"
                    value={formState.replayMinDuration ?? 0.01}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const maxDur = formState.replayMaxDuration ?? 3.0;
                      const validatedMin = Math.min(val, maxDur);
                      handleFieldChange('replayMinDuration', validatedMin);
                    }}
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>0.01s / bar</span>
                    <span>1.00s / bar</span>
                  </div>
                </div>
              </div>
            )}



          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-gray-800/80 bg-[#1a1d26] flex flex-col gap-2.5 select-none">

          {/* Save-preset inline input (shown when isSavingPreset) */}
          {isSavingPreset && (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Preset name…"
                value={savePresetName}
                onChange={e => { setSavePresetName(e.target.value); setSaveNameError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSavePreset(); if (e.key === 'Escape') { setIsSavingPreset(false); setSavePresetName(''); setSaveNameError(''); } }}
                className="flex-1 bg-[#131722] border border-gray-700 rounded px-2.5 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSavePreset}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition-all cursor-pointer"
              >Save</button>
              <button
                onClick={() => { setIsSavingPreset(false); setSavePresetName(''); setSaveNameError(''); }}
                className="px-2 py-1 border border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-white rounded text-xs font-semibold transition-all cursor-pointer"
              >Cancel</button>
            </div>
          )}
          {saveNameError && <p className="text-[10px] text-red-400">{saveNameError}</p>}

          {/* Bottom row: preset picker + action buttons */}
          <div className="flex items-center justify-between">

            {/* Template presets picker dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Template</span>

              <div className="flex items-center gap-1.5">
                <select
                  value={selectedPreset}
                  onChange={e => { setSelectedPreset(e.target.value); handleApplyPreset(e.target.value); }}
                  className="bg-[#131722] border border-gray-800 rounded px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="" disabled>Load Preset...</option>
                  <optgroup label="Built-in">
                    {builtInEntries.map(p => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </optgroup>
                  {customPresetNames.length > 0 && (
                    <optgroup label="My Presets">
                      {customPresetNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {/* Delete button — only visible when a custom preset is selected */}
                {selectedPreset && customPresets[selectedPreset] && (
                  <button
                    onClick={() => { handleDeleteCustomPreset(selectedPreset); setSelectedPreset(''); }}
                    className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                    title={`Delete preset "${selectedPreset}"`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Save current settings as preset */}
              {!isSavingPreset && (
                <button
                  onClick={() => { setIsSavingPreset(true); setSavePresetName(''); setSaveNameError(''); }}
                  className="px-2.5 py-1 border border-dashed border-gray-700 hover:border-indigo-500 text-gray-500 hover:text-indigo-400 rounded text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap"
                  title="Save current settings as a new preset"
                >+ Save as Preset</button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 border border-gray-800 hover:bg-gray-850 hover:text-white rounded-lg text-xs font-semibold text-gray-400 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
              >
                Ok
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
