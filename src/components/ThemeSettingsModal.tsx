import React, { useState } from 'react';
import { X, Paintbrush, Percent, Clock, Database, Trash2, FileSpreadsheet, Upload } from 'lucide-react';

import { parseCSV } from '../utils/dataUtils';

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
    pricePrecision: 4,
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
    scalesTextSize: 11,
    scalesTextColor: '#b2b5be',
    showScalesLines: true,
    scalesLinesColor: '#242832',
    timezoneAdjustmentEnabled: false,
    brokerTimezoneOffset: 180,
    brokerTimezoneLabel: '(UTC+3) Moscow',
    userTimezoneOffset: 330,
    userTimezoneLabel: '(UTC+5:30) Kolkata',
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
    pricePrecision: 4,
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
    scalesTextSize: 11,
    scalesTextColor: '#888888',
    showScalesLines: true,
    scalesLinesColor: '#1a1a1a',
    timezoneAdjustmentEnabled: false,
    brokerTimezoneOffset: 180,
    brokerTimezoneLabel: '(UTC+3) Moscow',
    userTimezoneOffset: 330,
    userTimezoneLabel: '(UTC+5:30) Kolkata',
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
    pricePrecision: 5,
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
    scalesTextSize: 12,
    scalesTextColor: '#00FF66',
    showScalesLines: true,
    scalesLinesColor: '#1b263b',
    timezoneAdjustmentEnabled: false,
    brokerTimezoneOffset: 180,
    brokerTimezoneLabel: '(UTC+3) Moscow',
    userTimezoneOffset: 330,
    userTimezoneLabel: '(UTC+5:30) Kolkata',
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
  lastCandleTimestamp: number | null;
  onUpdateData?: (timeframe: string, file: File) => void;
  onExportCSV?: () => void;
  onClearDatabase?: () => void;
  onUploadNewDataset?: (file: File) => void;
  assetName?: string;
}

type TabType = 'Symbol' | 'Canvas' | 'Scales' | 'Timezone' | 'UpdateData';

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsSave,
  hasData,
  lastCandleTimestamp,
  onUpdateData,
  onExportCSV,
  onClearDatabase,
  onUploadNewDataset,
  assetName = 'No Asset Loaded',
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<TabType>('Symbol');
  const [formState, setFormState] = useState<ChartSettings>({ ...settings });

  // Update Data local states
  const [updateTf, setUpdateTf] = useState<string>('1m');
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const updateFileInputRef = React.useRef<HTMLInputElement>(null);

  // Phase 2 Validation States
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [showWarningConfirm, setShowWarningConfirm] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<{ duplicates: number; newBars: number; latestTime: number } | null>(null);

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

  const handleClearUpdateFile = () => {
    setUpdateFile(null);
    setValidationError(null);
    setValidationWarning(null);
    setShowWarningConfirm(false);
    setUpdateInfo(null);
    if (updateFileInputRef.current) {
      updateFileInputRef.current.value = '';
    }
  };

  const validateUpdateFile = (file: File, selectedTf: string) => {
    setIsValidating(true);
    setValidationError(null);
    setValidationWarning(null);
    setShowWarningConfirm(false);
    setUpdateInfo(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          setValidationError("The uploaded file is empty.");
          setIsValidating(false);
          return;
        }

        const result = parseCSV(text);
        if (result.parsedCount === 0) {
          setValidationError("No valid candlestick rows found in the CSV file.");
          setIsValidating(false);
          return;
        }

        // 1. Timeframe check
        const TIMEFRAME_MINUTES: Record<string, number> = {
          '1m': 1,
          '5m': 5,
          '15m': 15,
          '30m': 30,
          '1h': 60,
          '4h': 240,
          '1D': 1440,
          '1W': 10080,
        };

        const selectedMinutes = TIMEFRAME_MINUTES[selectedTf] || 1;

        // Detect timeframe from timestamps in the file
        let minDiffMs = Infinity;
        for (let i = 1; i < Math.min(result.data.length, 20); i++) {
          const diff = Math.abs(result.data[i].timestamp - result.data[i - 1].timestamp);
          if (diff > 0 && diff < minDiffMs) {
            minDiffMs = diff;
          }
        }

        let detectedMinutes = 1;
        if (minDiffMs !== Infinity) {
          detectedMinutes = Math.round(minDiffMs / (60 * 1000));
        }

        if (detectedMinutes !== selectedMinutes) {
          // Format detected minutes nicely
          let tfLabel = `${detectedMinutes}m`;
          if (detectedMinutes >= 60) {
            const hrs = detectedMinutes / 60;
            tfLabel = hrs === 24 ? '1D' : hrs === 168 ? '1W' : `${hrs}h`;
          }
          setValidationError(`Timeframe mismatch! The selected timeframe is ${selectedTf}, but the file appears to be in timeframe ${tfLabel}.`);
          setIsValidating(false);
          return;
        }

        // 2. Data alignment check (Gap / Overlap check)
        let duplicates = 0;
        let newBars = 0;
        const latestTime = result.data[result.data.length - 1].timestamp;

        if (lastCandleTimestamp !== null) {
          duplicates = result.data.filter(row => row.timestamp <= lastCandleTimestamp).length;
          newBars = result.data.filter(row => row.timestamp > lastCandleTimestamp).length;

          const updateFirstTimestamp = result.data[0].timestamp;
          const expectedGapMs = selectedMinutes * 60 * 1000;

          if (updateFirstTimestamp > lastCandleTimestamp + expectedGapMs) {
            // Gap detected
            const gapMs = updateFirstTimestamp - lastCandleTimestamp;
            const gapMin = Math.round(gapMs / (60 * 1000));
            let gapText = `${gapMin} minutes`;
            if (gapMin >= 1440) {
              gapText = `${(gapMin / 1440).toFixed(1)} days`;
            } else if (gapMin >= 60) {
              const hours = Math.floor(gapMin / 60);
              const mins = gapMin % 60;
              gapText = `${hours}h ${mins}m`;
            }

            setValidationWarning(
              `A data gap of ${gapText} was detected. Your last candle is from ${formatDateFeedback(lastCandleTimestamp)}, but this update file starts at ${formatDateFeedback(updateFirstTimestamp)}. Some data might be missing (e.g. weekend or offline periods).`
            );
            setShowWarningConfirm(true);
          }
        } else {
          newBars = result.data.length;
        }

        setUpdateInfo({
          duplicates,
          newBars,
          latestTime
        });

      } catch (err) {
        console.error('[DEBUG] validateUpdateFile error:', err);
        setValidationError("An error occurred while validating the CSV file.");
      } finally {
        setIsValidating(false);
      }
    };
    reader.onerror = () => {
      setValidationError("Failed to read the file.");
      setIsValidating(false);
    };
    reader.readAsText(file);
  };

  React.useEffect(() => {
    if (updateFile) {
      validateUpdateFile(updateFile, updateTf);
    }
  }, [updateTf]);

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
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Active Dataset Section */}
                    <div className="bg-[#1a1d26]/40 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
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
                    </div>

                    {/* Incremental Data Update Section */}
                    <div className="border border-gray-800 rounded-xl p-4 flex flex-col gap-3.5">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                        Incremental Data Update
                      </div>

                      {/* Timeframe Select */}
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-300">Update Timeframe</span>
                        <select
                          value={updateTf}
                          onChange={(e) => setUpdateTf(e.target.value)}
                          className="w-40 bg-[#131722] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="1m">1 Minute (1m)</option>
                          <option value="5m">5 Minutes (5m)</option>
                          <option value="15m">15 Minutes (15m)</option>
                          <option value="30m">30 Minutes (30m)</option>
                          <option value="1h">1 Hour (1h)</option>
                          <option value="4h">4 Hours (4h)</option>
                          <option value="1D">1 Day (1D)</option>
                          <option value="1W">1 Week (1W)</option>
                        </select>
                      </div>

                      {/* File Selection */}
                      <div className="flex flex-col gap-2 mt-2">
                        <span className="font-semibold text-gray-300">Update File (CSV)</span>
                        
                        <input
                          type="file"
                          ref={updateFileInputRef}
                          accept=".csv"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setUpdateFile(file);
                              validateUpdateFile(file, updateTf);
                            }
                          }}
                          className="hidden"
                        />

                        <div 
                          className={`relative flex flex-col items-center justify-center p-6 rounded-xl border transition-all duration-150 group ${
                            validationError 
                              ? 'border-red-500/40 bg-red-950/5' 
                              : validationWarning 
                              ? 'border-amber-500/40 bg-amber-950/5' 
                              : 'border-gray-800 bg-[#1a1d26]/50 hover:bg-[#1a1d26]/80 hover:border-indigo-500/50'
                          }`}
                        >
                          {updateFile && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearUpdateFile();
                              }}
                              className="absolute top-2.5 right-2.5 text-gray-500 hover:text-white transition-colors duration-150 p-1 hover:bg-gray-800 rounded"
                              title="Clear selected file"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <div 
                            onClick={() => updateFileInputRef.current?.click()}
                            className="w-full flex flex-col items-center justify-center cursor-pointer"
                          >
                            <Database className={`w-6 h-6 mb-2 transition-colors ${
                              validationError 
                                ? 'text-red-500' 
                                : validationWarning 
                                ? 'text-amber-500' 
                                : 'text-gray-500 group-hover:text-indigo-400'
                            }`} />
                            <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">
                              {updateFile ? updateFile.name : 'Select CSV File'}
                            </span>
                            <span className="text-[10px] text-gray-500 mt-1">
                              {updateFile 
                                ? `${(updateFile.size / 1024).toFixed(1)} KB` 
                                : 'Click to browse files'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Error Display */}
                      {validationError && (
                        <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-lg text-red-400 text-[11px] leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150">
                          <strong className="font-bold">⚠️ Timeframe Mismatch:</strong> {validationError}
                        </div>
                      )}

                      {/* Validation Feedback (Duplicates / Success) */}
                      {updateInfo && !validationError && (
                        <div className="flex flex-col gap-2 mt-1">
                          {updateInfo.duplicates > 0 && (
                            <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-lg text-indigo-300 text-[11px] leading-relaxed animate-in fade-in duration-150">
                              <span className="font-semibold">ℹ️ Overlap:</span> Found {updateInfo.duplicates.toLocaleString()} duplicate rows with identical timestamps; these will be discarded.
                            </div>
                          )}
                          {updateInfo.newBars > 0 ? (
                            !validationWarning && (
                              <div className="p-3 bg-emerald-950/25 border border-emerald-500/35 rounded-lg text-emerald-400 text-[11px] leading-relaxed animate-in fade-in duration-150">
                                <span className="font-semibold">✅ Perfect Match:</span> Found {updateInfo.newBars.toLocaleString()} new bars extending up to {formatDateFeedback(updateInfo.latestTime)}.
                              </div>
                            )
                          ) : (
                            <div className="p-3 bg-[#1a1d26] border border-gray-800 rounded-lg text-gray-400 text-[11px] leading-relaxed animate-in fade-in duration-150">
                              <span className="font-semibold">ℹ️ No New Data:</span> All rows in the update file are duplicates. No new bars to import.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Warning Confirmation Overlay */}
                      {validationWarning && showWarningConfirm && (
                        <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-xl text-amber-300 flex flex-col gap-3.5 mt-1 shadow-lg animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex gap-2.5">
                            <Database className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-xs uppercase tracking-wide">Data Gap Warning</span>
                              <span className="text-[11px] leading-relaxed text-amber-200/90">{validationWarning}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => handleClearUpdateFile()}
                              className="px-3.5 py-1.5 border border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowWarningConfirm(false);
                                if (updateFile && onUpdateData) {
                                  onUpdateData(updateTf, updateFile);
                                  console.log(`[DEBUG] Update Data trigger (User bypassed gap) - tf: ${updateTf}, file: ${updateFile.name}`);
                                  handleClearUpdateFile();
                                  onClose();
                                }
                              }}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer"
                            >
                              Continue Anyway
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Button */}
                      {!showWarningConfirm && (
                        <button
                          type="button"
                          disabled={!updateFile || isValidating || !!validationError || (updateInfo !== null && updateInfo.newBars === 0)}
                          onClick={() => {
                            if (updateFile && onUpdateData) {
                              onUpdateData(updateTf, updateFile);
                              console.log(`[DEBUG] Update Data trigger - tf: ${updateTf}, file: ${updateFile.name}`);
                              handleClearUpdateFile();
                              onClose();
                            }
                          }}
                          className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                        >
                          {isValidating ? 'Validating File...' : 'Update Chart Data'}
                        </button>
                      )}
                    </div>

                    {/* Export Current Data Section */}
                    <div className="border border-gray-800 rounded-xl p-4 flex flex-col gap-2">
                      <span className="font-semibold text-gray-300">Export Current Dataset</span>
                      <p className="text-[10px] text-gray-500 leading-normal">
                        Download the combined, chronologically sorted, and row-capped dataset as a CSV file.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (onExportCSV) onExportCSV();
                        }}
                        className="w-full mt-1.5 py-2 bg-[#1a1d26] hover:bg-gray-800 border border-gray-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Download Current CSV
                      </button>
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
