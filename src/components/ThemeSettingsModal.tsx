import React, { useState } from 'react';
import { X, Paintbrush, Percent, Clock, Database, Trash2, FileSpreadsheet, Upload, Folder, FolderOpen } from 'lucide-react';

const CUSTOM_PRESETS_KEY = 'fx_custom_presets';

export interface ChartSettings {
  // Symbol Settings
  showBody: boolean;
  bullColor: string;
  bearColor: string;
  showBorders: boolean;
  bullBorderColor: string;
  bearBorderColor: string;
  showWicks: boolean;
  bullWickColor: string;
  bearWickColor: string;
  pricePrecision: number;
  showPriceLine: boolean;
  priceLineStyle: 'dashed' | 'solid';
  priceLineSize: number;
  priceLineColor: string;
  priceLineUseCandleColor: boolean;
  showPriceLineLabel: boolean;

  // Canvas Settings
  background: string;
  backgroundType: 'Solid' | 'None';
  gridType: 'Vert and Horiz' | 'Horizontal Only' | 'Vertical Only' | 'None';
  gridColor: string;
  gridStyle: 'dashed' | 'solid';
  showWatermark: boolean;
  showSessionBreaks: boolean;
  sessionBreaksColor: string;
  sessionBreaksStyle: 'dashed' | 'solid';
  sessionBreaksSize: number;

  // Scales Settings
  scalesTextSize: number;
  scalesTextColor: string;
  showScalesLines: boolean;
  scalesLinesColor: string;

  // Timezone Settings
  timezoneAdjustmentEnabled: boolean;
  brokerTimezoneOffset: number;
  brokerTimezoneLabel: string;
  userTimezoneOffset: number;
  userTimezoneLabel: string;

  // Magnet Sensitivity Settings (pixel proximity thresholds per mode)
  magnetWeakSensitivity: number;   // 0-20
  magnetNormalSensitivity: number; // 20-60
  magnetStrongSensitivity: number; // 60-100 (100 = always snap)
}

export const PRESET_SETTINGS: { [key: string]: ChartSettings } = {
  classic: {
    showBody: true,
    bullColor: '#089981',
    bearColor: '#F23645',
    showBorders: true,
    bullBorderColor: '#089981',
    bearBorderColor: '#F23645',
    showWicks: true,
    bullWickColor: '#474f66',
    bearWickColor: '#474f66',
    pricePrecision: 0,
    showPriceLine: true,
    priceLineStyle: 'dashed',
    priceLineSize: 1,
    priceLineColor: '#2962FF',
    priceLineUseCandleColor: true,
    showPriceLineLabel: true,
    background: '#131722',
    backgroundType: 'Solid',
    gridType: 'Vert and Horiz',
    gridColor: '#242832',
    gridStyle: 'dashed',
    showWatermark: true,
    showSessionBreaks: false,
    sessionBreaksColor: 'rgba(139, 147, 166, 0.4)',
    sessionBreaksStyle: 'dashed',
    sessionBreaksSize: 1,
    scalesTextSize: 11,
    scalesTextColor: '#b2b5be',
    showScalesLines: true,
    scalesLinesColor: '#242832',
    timezoneAdjustmentEnabled: false,
    brokerTimezoneOffset: 180,
    brokerTimezoneLabel: '(UTC+3) Moscow',
    userTimezoneOffset: 330,
    userTimezoneLabel: '(UTC+5:30) Kolkata',
    magnetWeakSensitivity: 10,
    magnetNormalSensitivity: 30,
    magnetStrongSensitivity: 85,
  },
  obsidian: {
    showBody: true,
    bullColor: '#00E676',
    bearColor: '#FF3D00',
    showBorders: true,
    bullBorderColor: '#00E676',
    bearBorderColor: '#FF3D00',
    showWicks: true,
    bullWickColor: '#333333',
    bearWickColor: '#333333',
    pricePrecision: 0,
    showPriceLine: true,
    priceLineStyle: 'dashed',
    priceLineSize: 1,
    priceLineColor: '#00E676',
    priceLineUseCandleColor: true,
    showPriceLineLabel: true,
    background: '#000000',
    backgroundType: 'Solid',
    gridType: 'Vert and Horiz',
    gridColor: '#1a1a1a',
    gridStyle: 'dashed',
    showWatermark: true,
    showSessionBreaks: false,
    sessionBreaksColor: 'rgba(136, 136, 136, 0.4)',
    sessionBreaksStyle: 'dashed',
    sessionBreaksSize: 1,
    scalesTextSize: 11,
    scalesTextColor: '#888888',
    showScalesLines: true,
    scalesLinesColor: '#1a1a1a',
    timezoneAdjustmentEnabled: false,
    brokerTimezoneOffset: 180,
    brokerTimezoneLabel: '(UTC+3) Moscow',
    userTimezoneOffset: 330,
    userTimezoneLabel: '(UTC+5:30) Kolkata',
    magnetWeakSensitivity: 10,
    magnetNormalSensitivity: 30,
    magnetStrongSensitivity: 85,
  },
  matrix: {
    showBody: true,
    bullColor: '#00FF66',
    bearColor: '#FF0055',
    showBorders: true,
    bullBorderColor: '#00FF66',
    bearBorderColor: '#FF0055',
    showWicks: true,
    bullWickColor: '#415a77',
    bearWickColor: '#415a77',
    pricePrecision: 0,
    showPriceLine: true,
    priceLineStyle: 'solid',
    priceLineSize: 2,
    priceLineColor: '#00FF66',
    priceLineUseCandleColor: false,
    showPriceLineLabel: true,
    background: '#0D1B2A',
    backgroundType: 'Solid',
    gridType: 'Vert and Horiz',
    gridColor: '#1b263b',
    gridStyle: 'solid',
    showWatermark: true,
    showSessionBreaks: false,
    sessionBreaksColor: 'rgba(0, 255, 102, 0.25)',
    sessionBreaksStyle: 'dashed',
    sessionBreaksSize: 1,
    scalesTextSize: 12,
    scalesTextColor: '#00FF66',
    showScalesLines: true,
    scalesLinesColor: '#1b263b',
    timezoneAdjustmentEnabled: false,
    brokerTimezoneOffset: 180,
    brokerTimezoneLabel: '(UTC+3) Moscow',
    userTimezoneOffset: 330,
    userTimezoneLabel: '(UTC+5:30) Kolkata',
    magnetWeakSensitivity: 10,
    magnetNormalSensitivity: 30,
    magnetStrongSensitivity: 85,
  },
};

export interface TimezoneOption {
  label: string;
  value: number | 'exchange';
}

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

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { label: 'UTC', value: 0 },
  { label: 'Exchange', value: 'exchange' },
  { label: '(UTC-10) Honolulu', value: -600 },
  { label: '(UTC-8) Anchorage', value: -480 },
  { label: '(UTC-8) Juneau', value: -480 },
  { label: '(UTC-7) Los Angeles', value: -420 },
  { label: '(UTC-7) Phoenix', value: -420 },
  { label: '(UTC-7) Vancouver', value: -420 },
  { label: '(UTC-6) Denver', value: -360 },
  { label: '(UTC-6) Mexico City', value: -360 },
  { label: '(UTC-6) San Salvador', value: -360 },
  { label: '(UTC-5) Bogota', value: -300 },
  { label: '(UTC-5) Chicago', value: -300 },
  { label: '(UTC-5) Lima', value: -300 },
  { label: '(UTC-4) Caracas', value: -240 },
  { label: '(UTC-4) New York', value: -240 },
  { label: '(UTC-4) Santiago', value: -240 },
  { label: '(UTC-4) Toronto', value: -240 },
  { label: '(UTC-3) Buenos Aires', value: -180 },
  { label: '(UTC-3) Halifax', value: -180 },
  { label: '(UTC-3) Sao Paulo', value: -180 },
  { label: '(UTC) Azores', value: 0 },
  { label: '(UTC) Reykjavik', value: 0 },
  { label: '(UTC+1) Casablanca', value: 60 },
  { label: '(UTC+1) Dublin', value: 60 },
  { label: '(UTC+1) Lagos', value: 60 },
  { label: '(UTC+1) Lisbon', value: 60 },
  { label: '(UTC+1) London', value: 60 },
  { label: '(UTC+1) Tunis', value: 60 },
  { label: '(UTC+2) Amsterdam', value: 120 },
  { label: '(UTC+2) Belgrade', value: 120 },
  { label: '(UTC+2) Berlin', value: 120 },
  { label: '(UTC+2) Bratislava', value: 120 },
  { label: '(UTC+2) Brussels', value: 120 },
  { label: '(UTC+2) Budapest', value: 120 },
  { label: '(UTC+2) Copenhagen', value: 120 },
  { label: '(UTC+2) Johannesburg', value: 120 },
  { label: '(UTC+2) Ljubljana', value: 120 },
  { label: '(UTC+2) Luxembourg', value: 120 },
  { label: '(UTC+2) Madrid', value: 120 },
  { label: '(UTC+2) Malta', value: 120 },
  { label: '(UTC+2) Oslo', value: 120 },
  { label: '(UTC+2) Paris', value: 120 },
  { label: '(UTC+2) Prague', value: 120 },
  { label: '(UTC+2) Rome', value: 120 },
  { label: '(UTC+2) Stockholm', value: 120 },
  { label: '(UTC+2) Vienna', value: 120 },
  { label: '(UTC+2) Warsaw', value: 120 },
  { label: '(UTC+2) Zagreb', value: 120 },
  { label: '(UTC+2) Zurich', value: 120 },
  { label: '(UTC+3) Athens', value: 180 },
  { label: '(UTC+3) Bahrain', value: 180 },
  { label: '(UTC+3) Bucharest', value: 180 },
  { label: '(UTC+3) Cairo', value: 180 },
  { label: '(UTC+3) Helsinki', value: 180 },
  { label: '(UTC+3) Istanbul', value: 180 },
  { label: '(UTC+3) Jerusalem', value: 180 },
  { label: '(UTC+3) Kuwait', value: 180 },
  { label: '(UTC+3) Moscow', value: 180 },
  { label: '(UTC+3) Nairobi', value: 180 },
  { label: '(UTC+3) Nicosia', value: 180 },
  { label: '(UTC+3) Qatar', value: 180 },
  { label: '(UTC+3) Riga', value: 180 },
  { label: '(UTC+3) Riyadh', value: 180 },
  { label: '(UTC+3) Sofia', value: 180 },
  { label: '(UTC+3) Tallinn', value: 180 },
  { label: '(UTC+3) Vilnius', value: 180 },
  { label: '(UTC+3:30) Tehran', value: 210 },
  { label: '(UTC+4) Dubai', value: 240 },
  { label: '(UTC+4) Muscat', value: 240 },
  { label: '(UTC+4:30) Kabul', value: 270 },
  { label: '(UTC+5) Ashgabat', value: 300 },
  { label: '(UTC+5) Astana', value: 300 },
  { label: '(UTC+5) Karachi', value: 300 },
  { label: '(UTC+5:30) Colombo', value: 330 },
  { label: '(UTC+5:30) Kolkata', value: 330 },
  { label: '(UTC+5:45) Kathmandu', value: 345 },
  { label: '(UTC+6) Dhaka', value: 360 },
  { label: '(UTC+6:30) Yangon', value: 390 },
  { label: '(UTC+7) Bangkok', value: 420 },
  { label: '(UTC+7) Ho Chi Minh', value: 420 },
  { label: '(UTC+7) Jakarta', value: 420 },
  { label: '(UTC+8) Chongqing', value: 480 },
  { label: '(UTC+8) Hong Kong', value: 480 },
  { label: '(UTC+8) Kuala Lumpur', value: 480 },
  { label: '(UTC+8) Manila', value: 480 },
  { label: '(UTC+8) Perth', value: 480 },
  { label: '(UTC+8) Shanghai', value: 480 },
  { label: '(UTC+8) Singapore', value: 480 },
  { label: '(UTC+8) Taipei', value: 480 },
  { label: '(UTC+9) Seoul', value: 540 },
  { label: '(UTC+9) Tokyo', value: 540 },
  { label: '(UTC+9:30) Adelaide', value: 570 },
  { label: '(UTC+10) Brisbane', value: 600 },
  { label: '(UTC+10) Sydney', value: 600 },
  { label: '(UTC+11) Norfolk Island', value: 660 },
  { label: '(UTC+12) New Zealand', value: 720 },
  { label: '(UTC+12:45) Chatham Islands', value: 765 },
  { label: '(UTC+13) Tokelau', value: 780 },
];

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChartSettings;
  onSettingsSave: (newSettings: ChartSettings) => void;
  hasData: boolean;
  onClearDatabase?: () => void;
  onUploadNewDataset?: (file: File) => void;
  assetName?: string;
  importMode?: 'single' | 'folder';
  savedFolderHandle?: any;
  onSelectFolder?: () => void;
}

type TabType = 'Symbol' | 'Canvas' | 'Scales' | 'Timezone' | 'UpdateData';

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsSave,
  hasData,
  onClearDatabase,
  onUploadNewDataset,
  assetName = 'No Asset Loaded',
  importMode = 'single',
  savedFolderHandle = null,
  onSelectFolder,
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

  // Custom confirmation dialog state
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
      <div className="w-[580px] h-[480px] bg-[#1e222d] border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
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
              onClick={() => setActiveTab('UpdateData')}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold text-left transition-all ${
                activeTab === 'UpdateData'
                  ? 'bg-[#1e222d] text-white border-l-2 border-indigo-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
              }`}
            >
              <Database className="w-4.5 h-4.5 mr-2.5" />
              <span>Data Management</span>
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
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">Weak magnet</span>
                    <span className="text-xs font-mono text-indigo-400 w-8 text-right">{formState.magnetWeakSensitivity}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={formState.magnetWeakSensitivity}
                    onChange={(e) => handleFieldChange('magnetWeakSensitivity', parseInt(e.target.value))}
                    className="w-full h-1.5 appearance-none rounded-full bg-gray-700 accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                    <span>0px (off)</span>
                    <span>20px</span>
                  </div>
                </div>
                {/* Normal Magnet slider (20-60) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">Normal magnet</span>
                    <span className="text-xs font-mono text-indigo-400 w-8 text-right">{formState.magnetNormalSensitivity}px</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={60}
                    step={1}
                    value={formState.magnetNormalSensitivity}
                    onChange={(e) => handleFieldChange('magnetNormalSensitivity', parseInt(e.target.value))}
                    className="w-full h-1.5 appearance-none rounded-full bg-gray-700 accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                    <span>20px</span>
                    <span>60px</span>
                  </div>
                </div>
                {/* Strong Magnet slider (60-100) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">Strong magnet</span>
                    <span className="text-xs font-mono text-indigo-400 w-8 text-right">
                      {formState.magnetStrongSensitivity >= 100 ? 'Always' : `${formState.magnetStrongSensitivity}px`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={100}
                    step={1}
                    value={formState.magnetStrongSensitivity}
                    onChange={(e) => handleFieldChange('magnetStrongSensitivity', parseInt(e.target.value))}
                    className="w-full h-1.5 appearance-none rounded-full bg-gray-700 accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                    <span>60px</span>
                    <span>Always</span>
                  </div>
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

            {/* Tab: Data Management */}
            {activeTab === 'UpdateData' && (
              <div className="flex flex-col h-full gap-5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Data Management
                </div>

                {!hasData ? (
                  importMode === 'folder' ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-[#1a1d26]/40 border border-dashed border-gray-800 rounded-xl text-center gap-4">
                      <Folder className="w-8 h-8 text-gray-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-400 mb-1">No Folder Selected</p>
                        <p className="text-[11px] text-gray-500 max-w-xs">
                          Select a master folder containing subfolders for each trading pair to populate the watchlist and load charts.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectFolder) onSelectFolder();
                        }}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Select Symbol Directory</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 bg-[#1a1d26]/40 border border-dashed border-gray-800 rounded-xl text-center gap-4">
                      <Database className="w-8 h-8 text-gray-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-400 mb-1">No Dataset Loaded</p>
                        <p className="text-[11px] text-gray-500 max-w-xs">
                          Import a standard 1-Minute CSV dataset to begin replay and charting.
                        </p>
                      </div>
                      <input
                        type="file"
                        id="modal-main-file-upload"
                        accept=".csv"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0] && onUploadNewDataset) {
                            onUploadNewDataset(e.target.files[0]);
                            onClose();
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('modal-main-file-upload')?.click()}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Select Main CSV File</span>
                      </button>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Active Dataset Section */}
                    <div className="bg-[#1a1d26]/40 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
                      
                      {importMode === 'folder' ? (
                        <>
                          <div className="flex justify-between items-center border-b border-gray-800/80 pb-2.5">
                            <div>
                              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Active Symbol / Watchlist</span>
                              <span className="text-xs font-bold text-white tracking-wide block mt-0.5">
                                {assetName}
                              </span>
                              {savedFolderHandle && (
                                <span className="text-[10px] text-gray-400 block mt-1">
                                  Folder: <span className="text-emerald-400 font-medium font-mono">{savedFolderHandle.name}</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-emerald-400 font-bold tracking-wide uppercase px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                              Connected
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectFolder) onSelectFolder();
                              }}
                              className="flex-1 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>Change Folder</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowClearConfirm(true)}
                              className="flex-1 py-2 bg-red-950/10 hover:bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Clear Database</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center border-b border-gray-800/80 pb-2.5">
                            <div>
                              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Active Dataset</span>
                              <span className="text-xs font-bold text-white tracking-wide block mt-0.5">
                                {assetName}
                              </span>
                            </div>
                            <span className="text-[9px] text-emerald-400 font-bold tracking-wide uppercase px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                              Connected
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="file"
                              id="modal-change-file-upload"
                              accept=".csv"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0] && onUploadNewDataset) {
                                  onUploadNewDataset(e.target.files[0]);
                                  onClose();
                                }
                              }}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById('modal-change-file-upload')?.click()}
                              className="flex-1 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span>Change File</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowClearConfirm(true)}
                              className="flex-1 py-2 bg-red-950/10 hover:bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Clear Database</span>
                            </button>
                          </div>
                        </>
                      )}

                    </div>
                  </div>
                )}
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

        {/* Custom Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e222d] border border-red-500/20 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-1">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold tracking-wider uppercase text-white">Clear Database?</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                This will permanently delete your stored chart data, overlays, drawings, and session state. This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 justify-center mt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 border border-gray-800 hover:bg-gray-800 hover:text-white rounded-xl text-xs font-semibold text-gray-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowClearConfirm(false);
                    if (onClearDatabase) onClearDatabase();
                  }}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/25 transition-all cursor-pointer"
                >
                  Clear Everything
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
