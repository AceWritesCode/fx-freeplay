import React, { useState } from 'react';
import { X, Paintbrush, Percent, Clock, Play, Palette, Check, RotateCcw, HelpCircle } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import { useSettingsStore } from '@/store';
import type { ChartSettings, CustomThemePalette, ThemeMode } from '@/config';
import { PRESET_SETTINGS, TIMEZONE_OPTIONS, DEFAULT_CUSTOM_THEME, getThemeChartBackground, getThemeTokens, formatToHex } from '@/config';
import { getStoredSyncChartBackground, storeSyncChartBackground } from '@/utils/themeApplier';

const CUSTOM_PRESETS_KEY = 'fx_custom_presets';

export type { ChartSettings };

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

type TabType = 'Theme' | 'Symbol' | 'Canvas' | 'Scales' | 'Timezone' | 'Replay';

const COLOR_FIELDS: { key: keyof CustomThemePalette; label: string }[] = [
  { key: 'bgApp', label: 'Main Background' },
  { key: 'bgSurface', label: 'Surface' },
  { key: 'bgSurfaceElevated', label: 'Elevated Surface' },
  { key: 'bgModal', label: 'Modal Surface' },
  { key: 'textPrimary', label: 'Primary Text' },
  { key: 'textSecondary', label: 'Secondary Text' },
  { key: 'textMuted', label: 'Muted Text' },
  { key: 'borderDefault', label: 'Border' },
  { key: 'accentPrimary', label: 'Accent' },
  { key: 'statusSuccess', label: 'Success' },
  { key: 'statusWarning', label: 'Warning' },
  { key: 'statusError', label: 'Error' },
];

const ColorPickerButton: React.FC<{
  color: string;
  disabled?: boolean;
  title: string;
  fieldKey: string;
  activeKey: string | null;
  onToggle: (info: { fieldKey: string; title: string } | null) => void;
}> = ({ color, disabled, title, fieldKey, activeKey, onToggle }) => {
  const isActive = activeKey === fieldKey;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(isActive ? null : { fieldKey, title })}
      className={`w-6 h-6 rounded border shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0 ${
        isActive ? 'ring-2 ring-accent border-accent scale-105' : 'border-border-def hover:border-txt-muted'
      }`}
      style={{ backgroundColor: color }}
      title={title || 'Select Color'}
    />
  );
};

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
  const { themeMode, setThemeMode, customTheme, setCustomTheme } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<TabType>('Theme');
  const [formState, setFormState] = useState<ChartSettings>(() => ({
    ...settings,
    syncChartBackgroundWithTheme: settings.syncChartBackgroundWithTheme ?? getStoredSyncChartBackground(),
  }));
  const [activeColorField, setActiveColorField] = useState<{ fieldKey: string; title: string } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setFormState({
        ...settings,
        syncChartBackgroundWithTheme: settings.syncChartBackgroundWithTheme ?? getStoredSyncChartBackground(),
      });
    }
  }, [isOpen, settings]);

  // Custom chart presets: stored in localStorage, keyed by user-chosen name
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

  if (!isOpen) return null;

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

  const handleEditTheme = (targetMode?: ThemeMode) => {
    const modeToCopy = targetMode || themeMode;
    if (modeToCopy === 'custom') return;

    const currentTokens = getThemeTokens(modeToCopy);
    const newCustomPalette: CustomThemePalette = {
      bgApp: formatToHex(currentTokens.bgApp),
      bgSurface: formatToHex(currentTokens.bgSurface),
      bgSurfaceElevated: formatToHex(currentTokens.bgSurfaceElevated),
      bgModal: formatToHex(currentTokens.bgModal),
      textPrimary: formatToHex(currentTokens.textPrimary),
      textSecondary: formatToHex(currentTokens.textSecondary),
      textMuted: formatToHex(currentTokens.textMuted),
      borderDefault: formatToHex(currentTokens.borderDefault),
      accentPrimary: formatToHex(currentTokens.accentPrimary),
      statusSuccess: formatToHex(currentTokens.statusSuccess),
      statusWarning: formatToHex(currentTokens.statusWarning),
      statusError: formatToHex(currentTokens.statusError),
    };

    setCustomTheme(newCustomPalette);
    setThemeMode('custom');
    setActiveColorField(null);

    if (formState.syncChartBackgroundWithTheme) {
      const bg = getThemeChartBackground('custom', newCustomPalette);
      handleFieldChange('background', bg);
      if (formState.backgroundType === 'None') {
        handleFieldChange('backgroundType', 'Solid');
      }
    }
  };

  const getActiveColorConfig = (): { color: string; title: string; onChange: (newColor: string) => void } | null => {
    if (!activeColorField) return null;
    const { fieldKey, title } = activeColorField;

    if (fieldKey.startsWith('custom_')) {
      const customKey = fieldKey.replace('custom_', '') as keyof CustomThemePalette;
      return {
        title,
        color: formatToHex(customTheme[customKey] || DEFAULT_CUSTOM_THEME[customKey]),
        onChange: (c: string) => setCustomTheme({ [customKey]: formatToHex(c) }),
      };
    }

    if (fieldKey in formState) {
      const chartKey = fieldKey as keyof ChartSettings;
      return {
        title,
        color: (formState[chartKey] as string) || '#ffffff',
        onChange: (c: string) => handleFieldChange(chartKey, c),
      };
    }

    return null;
  };

  const activeColorConfig = getActiveColorConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-bg backdrop-blur-xs font-sans p-4 overflow-auto">
      <div className="relative flex-shrink-0">
        <div className="w-[720px] max-w-[92vw] h-[560px] max-h-[88vh] bg-modal-bg border border-border-def rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-sub">
          <h2 className="text-sm font-semibold text-txt-primary tracking-wide uppercase">Settings</h2>
          <button
            onClick={onClose}
            className="text-txt-muted hover:text-txt-primary transition-colors duration-150 p-1 hover:bg-surface-hover rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Sidebar (Tabs) */}
          <div className="w-44 bg-surface border-r border-border-sub py-3 flex flex-col gap-1 select-none">
            <button
              onClick={() => { setActiveTab('Theme'); setActiveColorField(null); }}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold text-left transition-all cursor-pointer ${
                activeTab === 'Theme'
                  ? 'bg-modal-bg text-txt-primary border-l-2 border-accent'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
              }`}
            >
              <Palette className="w-4.5 h-4.5 mr-2.5" />
              <span>Theme</span>
            </button>

            <button
              onClick={() => { setActiveTab('Symbol'); setActiveColorField(null); }}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold text-left transition-all cursor-pointer ${
                activeTab === 'Symbol'
                  ? 'bg-modal-bg text-txt-primary border-l-2 border-accent'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
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
              onClick={() => { setActiveTab('Canvas'); setActiveColorField(null); }}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold text-left transition-all cursor-pointer ${
                activeTab === 'Canvas'
                  ? 'bg-modal-bg text-txt-primary border-l-2 border-accent'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
              }`}
            >
              <Paintbrush className="w-4.5 h-4.5 mr-2.5" />
              <span>Canvas</span>
            </button>

            <button
              onClick={() => { setActiveTab('Scales'); setActiveColorField(null); }}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold text-left transition-all cursor-pointer ${
                activeTab === 'Scales'
                  ? 'bg-modal-bg text-txt-primary border-l-2 border-accent'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
              }`}
            >
              <Percent className="w-4.5 h-4.5 mr-2.5" />
              <span>Scales</span>
            </button>

            <button
              onClick={() => { setActiveTab('Timezone'); setActiveColorField(null); }}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold text-left transition-all cursor-pointer ${
                activeTab === 'Timezone'
                  ? 'bg-modal-bg text-txt-primary border-l-2 border-accent'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
              }`}
            >
              <Clock className="w-4.5 h-4.5 mr-2.5" />
              <span>Timezone</span>
            </button>

            <button
              onClick={() => { setActiveTab('Replay'); setActiveColorField(null); }}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold text-left transition-all cursor-pointer ${
                activeTab === 'Replay'
                  ? 'bg-modal-bg text-txt-primary border-l-2 border-accent'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
              }`}
            >
              <Play className="w-4.5 h-4.5 mr-2.5" />
              <span>Replay</span>
            </button>
          </div>

          {/* Right Content Pane */}
          <div className="flex-1 p-6 overflow-y-auto bg-modal-bg text-xs text-txt-secondary">
            
            {/* Tab: Theme */}
            {activeTab === 'Theme' && (
              <div className="flex flex-col gap-5 select-none">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-txt-primary">Application UI Theme</h3>
                    <p className="text-[11px] text-txt-muted mt-0.5">
                      Select a built-in interface theme or customize semantic UI colors.
                    </p>
                  </div>
                  {themeMode !== 'custom' && (
                    <button
                      type="button"
                      onClick={() => handleEditTheme()}
                      className="px-3 py-1.5 text-xs font-semibold text-txt-inverse bg-accent hover:bg-accent-hover rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 flex-shrink-0"
                      title="Copy current built-in theme colors into Custom theme and edit them"
                    >
                      <Paintbrush className="w-3.5 h-3.5" />
                      <span>Edit Theme</span>
                    </button>
                  )}
                </div>

                {/* 4 Theme Option Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      id: 'dark',
                      name: 'Dark / Violet',
                      desc: 'Classic TradingView-inspired identity',
                      previewBg: '#131722',
                      previewCard: '#1e222d',
                      previewAccent: '#6366f1',
                      previewText: '#ffffff',
                    },
                    {
                      id: 'amoled',
                      name: 'AMOLED Dark',
                      desc: 'True black (#000000) for OLED displays',
                      previewBg: '#000000',
                      previewCard: '#0a0a0a',
                      previewAccent: '#3b82f6',
                      previewText: '#ffffff',
                    },
                    {
                      id: 'light',
                      name: 'Light',
                      desc: 'Clean, bright modern UI',
                      previewBg: '#f8fafc',
                      previewCard: '#ffffff',
                      previewAccent: '#2563eb',
                      previewText: '#0f172a',
                    },
                    {
                      id: 'custom',
                      name: 'Custom',
                      desc: 'User-configurable semantic palette',
                      previewBg: customTheme.bgApp,
                      previewCard: customTheme.bgSurface,
                      previewAccent: customTheme.accentPrimary,
                      previewText: customTheme.textPrimary,
                    },
                  ].map((theme) => {
                    const isSelected = themeMode === theme.id;
                    return (
                      <div
                        key={theme.id}
                        onClick={() => {
                          const newMode = theme.id as ThemeMode;
                          setThemeMode(newMode);
                          setActiveColorField(null);
                          if (formState.syncChartBackgroundWithTheme) {
                            const bg = getThemeChartBackground(newMode, customTheme);
                            handleFieldChange('background', bg);
                            if (formState.backgroundType === 'None') {
                              handleFieldChange('backgroundType', 'Solid');
                            }
                          }
                        }}
                        className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-accent bg-accent-muted ring-1 ring-accent'
                            : 'border-border-sub bg-surface-elevated/40 hover:bg-surface-hover hover:border-border-def'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <span className={`text-xs font-bold ${isSelected ? 'text-txt-primary' : 'text-txt-secondary'}`}>
                            {theme.name}
                          </span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-accent text-txt-inverse flex items-center justify-center text-[10px]">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        
                        {/* Color Swatch Preview Bar */}
                        <div className="w-full h-5 rounded-md border border-border-def flex overflow-hidden shadow-inner mb-2" style={{ backgroundColor: theme.previewBg }}>
                          <div className="w-1/3 h-full border-r border-border-sub" style={{ backgroundColor: theme.previewCard }} />
                          <div className="w-1/3 h-full border-r border-border-sub flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.previewAccent }} />
                          </div>
                          <div className="w-1/3 h-full flex items-center justify-center font-bold text-[9px]" style={{ color: theme.previewText }}>
                            Aa
                          </div>
                        </div>

                        <span className="text-[10.5px] text-txt-muted leading-tight">
                          {theme.desc}
                        </span>

                        {isSelected && theme.id !== 'custom' && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTheme(theme.id as ThemeMode);
                            }}
                            className="mt-2.5 w-full py-1 text-[11px] font-semibold text-accent border border-accent/40 hover:bg-accent/15 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            title="Copy this theme's colors into Custom theme and edit them"
                          >
                            <Paintbrush className="w-3 h-3" />
                            <span>Edit Theme</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Sync Chart Background Option */}
                <div className="mt-1 pt-4 border-t border-border-sub flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="sync-chart-bg" className="font-semibold text-txt-primary text-xs cursor-pointer select-none">
                          Sync Chart Background with Theme
                        </label>
                      </div>
                      <p className="text-[11px] text-txt-muted mt-0.5">
                        Automatically update the chart canvas background to match the selected theme.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        id="sync-chart-bg"
                        type="checkbox"
                        checked={formState.syncChartBackgroundWithTheme ?? false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          storeSyncChartBackground(checked);
                          handleFieldChange('syncChartBackgroundWithTheme', checked);
                          if (checked) {
                            const bg = getThemeChartBackground(themeMode, customTheme);
                            handleFieldChange('background', bg);
                            if (formState.backgroundType === 'None') {
                              handleFieldChange('backgroundType', 'Solid');
                            }
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent border border-border-def" />
                    </label>
                  </div>
                </div>

                {/* Custom Theme Color Controls (Visible when Custom is active) */}
                {themeMode === 'custom' && (
                  <div className="mt-1 pt-4 border-t border-border-sub flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-txt-primary">Custom Theme Palette</h4>
                        <p className="text-[11px] text-txt-muted">Configure base semantic colors using the color picker.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomTheme(DEFAULT_CUSTOM_THEME)}
                        className="px-2.5 py-1 text-[11px] font-medium text-txt-secondary bg-surface-elevated hover:bg-surface-hover rounded-md border border-border-sub flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Custom</span>
                      </button>
                    </div>

                    {/* Semantic Color Grid */}
                    <div className="grid grid-cols-2 gap-2.5 relative">
                      {COLOR_FIELDS.map(({ key, label }) => {
                        const currentColor = customTheme[key] || DEFAULT_CUSTOM_THEME[key];
                        const fieldKey = `custom_${key}`;
                        const isActive = activeColorField?.fieldKey === fieldKey;
                        return (
                          <div
                            key={key}
                            className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                              isActive
                                ? 'border-accent bg-accent-muted/30 ring-1 ring-accent'
                                : 'border-border-sub bg-surface-elevated/30 hover:bg-surface-hover'
                            }`}
                          >
                            <span className="text-[11.5px] text-txt-secondary font-medium">{label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-txt-muted uppercase">{formatToHex(currentColor)}</span>
                              <button
                                type="button"
                                onClick={() => setActiveColorField(isActive ? null : { fieldKey, title: label })}
                                className={`w-6 h-6 rounded border shadow-xs cursor-pointer transition-all active:scale-95 ${
                                  isActive ? 'ring-2 ring-accent border-accent scale-105' : 'border-white/20 hover:border-white/50'
                                }`}
                                style={{ backgroundColor: currentColor }}
                                title={`Change ${label}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Symbol */}
            {activeTab === 'Symbol' && (
              <div className="flex flex-col gap-5">
                <div className="text-[10px] font-bold text-txt-muted uppercase tracking-wider mb-1">Candles</div>

                {/* Body Colors */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.showBody}
                      onChange={(e) => handleFieldChange('showBody', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-border-def bg-surface-elevated text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Body Fill</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <ColorPickerButton
                      color={formState.bullColor}
                      disabled={!formState.showBody}
                      title="Bullish Body Color"
                      fieldKey="bullColor"
                      activeKey={activeColorField?.fieldKey ?? null}
                      onToggle={setActiveColorField}
                    />
                    <ColorPickerButton
                      color={formState.bearColor}
                      disabled={!formState.showBody}
                      title="Bearish Body Color"
                      fieldKey="bearColor"
                      activeKey={activeColorField?.fieldKey ?? null}
                      onToggle={setActiveColorField}
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
                      className="w-3.5 h-3.5 rounded border-border-def bg-surface-elevated text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Borders</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <ColorPickerButton
                      color={formState.bullBorderColor}
                      disabled={!formState.showBorders}
                      title="Bullish Border Color"
                      fieldKey="bullBorderColor"
                      activeKey={activeColorField?.fieldKey ?? null}
                      onToggle={setActiveColorField}
                    />
                    <ColorPickerButton
                      color={formState.bearBorderColor}
                      disabled={!formState.showBorders}
                      title="Bearish Border Color"
                      fieldKey="bearBorderColor"
                      activeKey={activeColorField?.fieldKey ?? null}
                      onToggle={setActiveColorField}
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
                      className="w-3.5 h-3.5 rounded border-border-def bg-surface-elevated text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Wick Color</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <ColorPickerButton
                      color={formState.bullWickColor}
                      disabled={!formState.showWicks}
                      title="Bullish Wick Color"
                      fieldKey="bullWickColor"
                      activeKey={activeColorField?.fieldKey ?? null}
                      onToggle={setActiveColorField}
                    />
                    <ColorPickerButton
                      color={formState.bearWickColor}
                      disabled={!formState.showWicks}
                      title="Bearish Wick Color"
                      fieldKey="bearWickColor"
                      activeKey={activeColorField?.fieldKey ?? null}
                      onToggle={setActiveColorField}
                    />
                  </div>
                </div>

                <div className="border-t border-border-sub my-2" />
                <div className="text-[10px] font-bold text-txt-muted uppercase tracking-wider mb-1">Price Line</div>

                {/* Price Line settings */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.showPriceLine}
                      onChange={(e) => handleFieldChange('showPriceLine', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-border-def bg-surface-elevated text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Last Price Line</span>
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <select
                      disabled={!formState.showPriceLine}
                      value={formState.priceLineStyle}
                      onChange={(e) => handleFieldChange('priceLineStyle', e.target.value)}
                      className="w-20 bg-surface border border-border-def rounded px-2 py-1 text-xs text-txt-primary focus:outline-none focus:border-accent cursor-pointer disabled:opacity-40"
                    >
                      <option value="dashed">Dashed</option>
                      <option value="solid">Solid</option>
                    </select>
                    
                    <select
                      disabled={!formState.showPriceLine}
                      value={formState.priceLineSize}
                      onChange={(e) => handleFieldChange('priceLineSize', parseInt(e.target.value))}
                      className="w-16 bg-surface border border-border-def rounded px-2 py-1 text-xs text-txt-primary focus:outline-none focus:border-accent cursor-pointer disabled:opacity-40"
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
                      className="w-3.5 h-3.5 rounded border-border-def bg-surface-elevated text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:opacity-40"
                    />
                    <span className={!formState.showPriceLine ? 'text-txt-muted' : ''}>Last Price Line Label</span>
                  </label>
                </div>

                {/* Price Line Color & Candle Color Matching */}
                <div className="flex items-center justify-between">
                  <span className={!formState.showPriceLine ? 'text-txt-muted' : ''}>Price Line Color</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 select-none cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        disabled={!formState.showPriceLine}
                        checked={formState.priceLineUseCandleColor}
                        onChange={(e) => handleFieldChange('priceLineUseCandleColor', e.target.checked)}
                        className="w-3 h-3 rounded border-border-def bg-surface-elevated text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:opacity-40"
                      />
                      <span className={!formState.showPriceLine ? 'text-txt-muted' : ''}>Match Candle</span>
                    </label>
                    <ColorPickerButton
                      color={formState.priceLineColor}
                      disabled={!formState.showPriceLine || formState.priceLineUseCandleColor}
                      title="Price Line Color"
                      fieldKey="priceLineColor"
                      activeKey={activeColorField?.fieldKey ?? null}
                      onToggle={setActiveColorField}
                    />
                  </div>
                </div>

                <div className="border-t border-border-sub my-2" />
                <div className="text-[10px] font-bold text-txt-muted uppercase tracking-wider mb-1">Data Settings</div>

                {/* Precision Dropdown */}
                <div className="flex items-center justify-between">
                  <span>Price Precision</span>
                  <select
                    value={formState.pricePrecision}
                    onChange={(e) => handleFieldChange('pricePrecision', parseInt(e.target.value))}
                    className="w-32 bg-surface border border-border-def rounded px-2.5 py-1 text-xs text-txt-primary focus:outline-none focus:border-accent cursor-pointer"
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
                <div className="text-[10px] font-bold text-txt-muted uppercase tracking-wider mb-1">Basic Styles</div>

                {/* Canvas Background */}
                <div className="flex items-center justify-between">
                  <span>Canvas Background</span>
                  <div className="flex items-center gap-2.5">
                    <select
                      value={formState.backgroundType}
                      onChange={(e) => handleFieldChange('backgroundType', e.target.value)}
                      className="w-28 bg-surface border border-border-def rounded px-2 py-1 text-xs text-txt-primary focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="Solid">Solid</option>
                      <option value="Gradient">Gradient</option>
                      <option value="None">None</option>
                    </select>
                    
                    <div className="flex items-center gap-1.5">
                      <ColorPickerButton
                        color={formState.background}
                        disabled={formState.backgroundType === 'None'}
                        title="Canvas Background Color"
                        fieldKey="background"
                        activeKey={activeColorField?.fieldKey ?? null}
                        onToggle={setActiveColorField}
                      />
                      {formState.backgroundType === 'Gradient' && (
                        <ColorPickerButton
                          color={formState.backgroundGradientStop || '#1e222d'}
                          disabled={formState.backgroundType !== 'Gradient'}
                          title="Bottom Gradient Color"
                          fieldKey="backgroundGradientStop"
                          activeKey={activeColorField?.fieldKey ?? null}
                          onToggle={setActiveColorField}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Grid Lines */}
                <div className="flex items-center justify-between">
                  <span>Grid Lines</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={formState.gridType}
                      onChange={(e) => handleFieldChange('gridType', e.target.value)}
                      className="w-28 bg-surface border border-border-def rounded px-2 py-1 text-xs text-txt-primary focus:outline-none focus:border-accent cursor-pointer"
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
                      className="w-20 bg-surface border border-border-def rounded px-2 py-1 text-xs text-txt-primary focus:outline-none focus:border-accent cursor-pointer disabled:opacity-40"
                    >
                      <option value="dashed">Dashed</option>
                      <option value="solid">Solid</option>
                    </select>
                    <ColorPickerButton
                      color={formState.gridColor}
                      disabled={formState.gridType === 'None'}
                      title="Grid Line Color"
                      fieldKey="gridColor"
                      activeKey={activeColorField?.fieldKey ?? null}
                      onToggle={setActiveColorField}
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
                      className="w-3.5 h-3.5 rounded border-border-def bg-surface-elevated text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
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
                      className="w-3.5 h-3.5 rounded border-border-def bg-surface-elevated text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Session breaks</span>
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={formState.sessionBreaksStyle}
                      disabled={!formState.showSessionBreaks}
                      onChange={(e) => handleFieldChange('sessionBreaksStyle', e.target.value)}
                      className="w-20 bg-surface border border-border-def rounded px-2 py-1 text-xs text-txt-primary focus:outline-none focus:border-accent cursor-pointer disabled:opacity-40"
                    >
                      <option value="dashed">Dashed</option>
                      <option value="solid">Solid</option>
                    </select>

                    <select
                      value={formState.sessionBreaksSize}
                      disabled={!formState.showSessionBreaks}
                      onChange={(e) => handleFieldChange('sessionBreaksSize', parseInt(e.target.value, 10))}
                      className="w-16 bg-surface border border-border-def rounded px-2 py-1 text-xs text-txt-primary focus:outline-none focus:border-accent cursor-pointer disabled:opacity-40"
                    >
                      <option value="1">1 px</option>
                      <option value="2">2 px</option>
                      <option value="3">3 px</option>
                    </select>

                    <ColorPickerButton
                      color={formState.sessionBreaksColor}
                      disabled={!formState.showSessionBreaks}
                      title="Session Breaks Color"
                      fieldKey="sessionBreaksColor"
                      activeKey={activeColorField?.fieldKey ?? null}
                      onToggle={setActiveColorField}
                    />
                  </div>
                </div>

                {/* Magnet Sensitivity */}
                <div className="text-[10px] font-bold text-txt-muted uppercase tracking-wider mt-2 mb-1">Magnet Snap Intensity</div>
                
                {/* Weak Magnet slider (0-20) */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-txt-secondary w-32">Weak magnet</span>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={formState.magnetWeakSensitivity}
                    onChange={(e) => handleFieldChange('magnetWeakSensitivity', parseInt(e.target.value))}
                    className="w-40 h-1.5 appearance-none rounded-full bg-surface-elevated accent-accent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-accent w-14 text-right">
                    {formState.magnetWeakSensitivity}px
                  </span>
                </div>

                {/* Normal Magnet slider (20-60) */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-txt-secondary w-32">Normal magnet</span>
                  <input
                    type="range"
                    min={20}
                    max={60}
                    step={1}
                    value={formState.magnetNormalSensitivity}
                    onChange={(e) => handleFieldChange('magnetNormalSensitivity', parseInt(e.target.value))}
                    className="w-40 h-1.5 appearance-none rounded-full bg-surface-elevated accent-accent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-accent w-14 text-right">
                    {formState.magnetNormalSensitivity}px
                  </span>
                </div>

                {/* Strong Magnet slider (60-100) */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-txt-secondary w-32">Strong magnet</span>
                  <input
                    type="range"
                    min={60}
                    max={100}
                    step={1}
                    value={formState.magnetStrongSensitivity}
                    onChange={(e) => handleFieldChange('magnetStrongSensitivity', parseInt(e.target.value))}
                    className="w-40 h-1.5 appearance-none rounded-full bg-surface-elevated accent-accent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-accent w-14 text-right">
                    {formState.magnetStrongSensitivity >= 100 ? 'Always' : `${formState.magnetStrongSensitivity}px`}
                  </span>
                </div>
              </div>
            )}

            {/* Tab: Scales */}
            {activeTab === 'Scales' && (
              <div className="flex flex-col gap-5">
                <div className="text-[10px] font-bold text-txt-muted uppercase tracking-wider mb-1">Scale Display</div>

                {/* Scales Text */}
                <div className="flex items-center justify-between">
                  <span>Axis Labels (Text)</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={formState.scalesTextSize}
                      onChange={(e) => handleFieldChange('scalesTextSize', parseInt(e.target.value))}
                      className="w-20 bg-surface border border-border-def rounded px-2 py-1 text-xs text-txt-primary focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="10">10 px</option>
                      <option value="11">11 px</option>
                      <option value="12">12 px</option>
                      <option value="13">13 px</option>
                      <option value="14">14 px</option>
                    </select>
                    <ColorPickerButton
                      color={formState.scalesTextColor}
                      title="Scales Text Color"
                      fieldKey="scalesTextColor"
                      activeKey={activeColorField?.fieldKey ?? null}
                      onToggle={setActiveColorField}
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
                      className="w-3.5 h-3.5 rounded border-border-def bg-surface-elevated text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Scale Axis Lines</span>
                  </label>
                  <ColorPickerButton
                    color={formState.scalesLinesColor}
                    disabled={!formState.showScalesLines}
                    title="Scale Axis Lines Color"
                    fieldKey="scalesLinesColor"
                    activeKey={activeColorField?.fieldKey ?? null}
                    onToggle={setActiveColorField}
                  />
                </div>
              </div>
            )}

            {/* Tab: Timezone */}
            {activeTab === 'Timezone' && (
              <div className="flex flex-col gap-5">
                <div className="text-[10px] font-bold text-txt-muted uppercase tracking-wider mb-1">Timezone Adjustment</div>

                {/* Adjustment Toggle */}
                <div className="flex items-center justify-between">
                  <span>Enable Timezone Adjustment</span>
                  <label className="flex items-center select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.timezoneAdjustmentEnabled}
                      onChange={(e) => handleFieldChange('timezoneAdjustmentEnabled', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-border-def bg-surface-elevated text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
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
                    className="w-40 bg-surface border border-border-def rounded px-2.5 py-1 text-xs text-txt-primary focus:outline-none focus:border-accent cursor-pointer disabled:opacity-40"
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
                    className="w-40 bg-surface border border-border-def rounded px-2.5 py-1 text-xs text-txt-primary focus:outline-none focus:border-accent cursor-pointer disabled:opacity-40"
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
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-txt-muted uppercase tracking-wider mb-1">
                    <span>Bar Replay Speed Limits</span>
                    <div className="relative group/tooltip inline-flex items-center">
                      <button
                        type="button"
                        className="text-txt-muted hover:text-accent transition-colors p-0.5 rounded focus:outline-none cursor-help"
                        aria-label="Info"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute left-0 top-full mt-1.5 hidden group-hover/tooltip:flex flex-col z-50 w-64 p-2.5 bg-modal-bg border border-border-def text-txt-secondary text-[11px] font-normal normal-case tracking-normal leading-relaxed rounded-lg shadow-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                        <span>Sets the overall playback speed boundaries for bar replay. The application calculates 5 logarithmic speed steps between the slowest and fastest limits for smooth speed control on the replay footer slider.</span>
                        <div className="absolute -top-1 left-3 w-2 h-2 bg-modal-bg border-t border-l border-border-def rotate-45" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-txt-muted">
                    Configure the maximum (slowest) and minimum (fastest) bar duration boundaries for playback simulation.
                  </p>
                </div>

                {/* Slowest Speed (Max Duration per Bar) */}
                <div className="flex flex-col gap-2 bg-surface p-3.5 rounded-lg border border-border-def">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="font-semibold text-txt-primary text-xs">
                        Slowest Speed (Maximum Duration per Bar)
                      </label>
                      <div className="relative group/tooltip inline-flex items-center">
                        <button
                          type="button"
                          className="text-txt-muted hover:text-accent transition-colors p-0.5 rounded focus:outline-none cursor-help"
                          aria-label="Info"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute left-0 top-full mt-1.5 hidden group-hover/tooltip:flex flex-col z-50 w-64 p-2.5 bg-modal-bg border border-border-def text-txt-secondary text-[11px] font-normal normal-case tracking-normal leading-relaxed rounded-lg shadow-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                          <span>Controls the time per candle when the replay speed slider is set all the way to the slowest setting. A higher duration (e.g. 3.00s) makes playback slower and gives more time to analyze price action.</span>
                          <div className="absolute -top-1 left-3 w-2 h-2 bg-modal-bg border-t border-l border-border-def rotate-45" />
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-accent font-bold text-xs">
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
                    className="w-full h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <div className="flex justify-between text-[10px] text-txt-muted">
                    <span>0.01s / bar</span>
                    <span>3.00s / bar</span>
                  </div>
                </div>

                {/* Fastest Speed (Min Duration per Bar) */}
                <div className="flex flex-col gap-2 bg-surface p-3.5 rounded-lg border border-border-def">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="font-semibold text-txt-primary text-xs">
                        Fastest Speed (Minimum Duration per Bar)
                      </label>
                      <div className="relative group/tooltip inline-flex items-center">
                        <button
                          type="button"
                          className="text-txt-muted hover:text-accent transition-colors p-0.5 rounded focus:outline-none cursor-help"
                          aria-label="Info"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute left-0 top-full mt-1.5 hidden group-hover/tooltip:flex flex-col z-50 w-64 p-2.5 bg-modal-bg border border-border-def text-txt-secondary text-[11px] font-normal normal-case tracking-normal leading-relaxed rounded-lg shadow-2xl pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                          <span>Controls the time per candle when the replay speed slider is set to the fastest setting. A lower duration (e.g. 0.01s) allows rapid bar progression and fast-forward simulation.</span>
                          <div className="absolute -top-1 left-3 w-2 h-2 bg-modal-bg border-t border-l border-border-def rotate-45" />
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-accent font-bold text-xs">
                      {(formState.replayMinDuration ?? 0.01).toFixed(2)} s/bar
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="1.00"
                    step="0.01"
                    value={Number((1.01 - (formState.replayMinDuration ?? 0.01)).toFixed(2))}
                    onChange={(e) => {
                      const sliderVal = parseFloat(e.target.value);
                      const durationVal = Number((1.01 - sliderVal).toFixed(2));
                      const maxDur = formState.replayMaxDuration ?? 3.0;
                      const validatedMin = Math.min(Math.max(0.01, durationVal), maxDur);
                      handleFieldChange('replayMinDuration', validatedMin);
                    }}
                    className="w-full h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <div className="flex justify-between text-[10px] text-txt-muted">
                    <span>1.00s / bar</span>
                    <span>0.01s / bar</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-border-sub bg-surface flex flex-col gap-2.5 select-none">

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
                className="flex-1 bg-modal-bg border border-border-def rounded px-2.5 py-1 text-xs text-txt-primary placeholder-txt-muted focus:outline-none focus:border-accent"
              />
              <button
                onClick={handleSavePreset}
                className="px-3 py-1 bg-accent hover:bg-accent-hover text-txt-inverse rounded text-xs font-semibold transition-all cursor-pointer"
              >Save</button>
              <button
                onClick={() => { setIsSavingPreset(false); setSavePresetName(''); setSaveNameError(''); }}
                className="px-2 py-1 border border-border-def hover:bg-surface-hover text-txt-muted hover:text-txt-primary rounded text-xs font-semibold transition-all cursor-pointer"
              >Cancel</button>
            </div>
          )}
          {saveNameError && <p className="text-[10px] text-status-error">{saveNameError}</p>}

          {/* Bottom row: preset picker + action buttons */}
          <div className="flex items-center justify-between">

            {/* Template presets picker dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-txt-muted uppercase font-semibold">Template</span>

              <div className="flex items-center gap-1.5">
                <select
                  value={selectedPreset}
                  onChange={e => { setSelectedPreset(e.target.value); handleApplyPreset(e.target.value); }}
                  className="bg-modal-bg border border-border-def rounded px-2.5 py-1 text-xs text-txt-secondary focus:outline-none focus:border-accent cursor-pointer"
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
                    className="p-1 text-txt-muted hover:text-status-error transition-colors cursor-pointer"
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
                  className="px-2.5 py-1 border border-dashed border-border-def hover:border-accent text-txt-muted hover:text-accent rounded text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap"
                  title="Save current settings as a new preset"
                >+ Save as Preset</button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 border border-border-def hover:bg-surface-hover hover:text-txt-primary rounded-lg text-xs font-semibold text-txt-muted transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-txt-inverse rounded-lg text-xs font-semibold shadow-lg transition-all cursor-pointer"
              >
                Ok
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Side Color Picker Panel */}
      {activeColorConfig && (
        <div className="absolute left-[calc(100%+16px)] top-0 w-fit bg-modal-bg border border-border-def rounded-xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-left-2 duration-150 select-none z-50">
          <div className="flex items-center justify-between pb-2 border-b border-border-sub">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-3.5 h-3.5 rounded border border-border-def shadow-xs flex-shrink-0"
                style={{ backgroundColor: activeColorConfig.color }}
              />
              <span className="text-xs font-semibold text-txt-primary truncate">
                {activeColorConfig.title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveColorField(null)}
              className="text-txt-muted hover:text-txt-primary p-1 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors flex-shrink-0"
              title="Close Color Picker"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <ColorPicker
              color={activeColorConfig.color}
              onChange={activeColorConfig.onChange}
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
