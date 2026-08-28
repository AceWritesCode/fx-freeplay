import React, { useState } from 'react';
import { X, Paintbrush, Percent, Clock, Play, Palette, Check, RotateCcw } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import { useSettingsStore } from '@/store';
import type { ChartSettings, CustomThemePalette, ThemeMode } from '@/config';
import { PRESET_SETTINGS, TIMEZONE_OPTIONS, DEFAULT_CUSTOM_THEME } from '@/config';

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
  const [formState, setFormState] = useState<ChartSettings>({ ...settings });
  const [selectedPreset, setSelectedPreset] = useState<string>('classic');
  const [activeColorField, setActiveColorField] = useState<keyof CustomThemePalette | null>(null);

  if (!isOpen) return null;

  const handleFieldChange = (field: keyof ChartSettings, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSettingsSave(formState);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-bg backdrop-blur-xs font-sans">
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
              onClick={() => setActiveTab('Theme')}
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
              onClick={() => setActiveTab('Symbol')}
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
              onClick={() => setActiveTab('Canvas')}
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
              onClick={() => setActiveTab('Scales')}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold text-left transition-all cursor-pointer ${
                activeTab === 'Scales'
                  ? 'bg-modal-bg text-txt-primary border-l-2 border-accent'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
              }`}
            >
              <Percent className="w-4.5 h-4.5 mr-2.5" />
              <span>Scales & Lines</span>
            </button>

            <button
              onClick={() => setActiveTab('Timezone')}
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
              onClick={() => setActiveTab('Replay')}
              className={`flex items-center px-4 py-2.5 text-xs font-semibold text-left transition-all cursor-pointer ${
                activeTab === 'Replay'
                  ? 'bg-modal-bg text-txt-primary border-l-2 border-accent'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
              }`}
            >
              <Play className="w-4.5 h-4.5 mr-2.5" />
              <span>Bar Replay</span>
            </button>
          </div>

          {/* Right Content Pane */}
          <div className="flex-1 p-6 overflow-y-auto bg-modal-bg text-xs text-txt-secondary">
            
            {/* Tab: Theme */}
            {activeTab === 'Theme' && (
              <div className="flex flex-col gap-5 select-none">
                <div>
                  <h3 className="text-sm font-semibold text-txt-primary">Application UI Theme</h3>
                  <p className="text-[11px] text-txt-muted mt-0.5">
                    Select a built-in interface theme or customize semantic UI colors.
                  </p>
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
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          setThemeMode(theme.id as ThemeMode);
                          setActiveColorField(null);
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
                        <div className="w-full h-5 rounded-md border border-white/10 flex overflow-hidden shadow-inner mb-2" style={{ backgroundColor: theme.previewBg }}>
                          <div className="w-1/3 h-full border-r border-white/10" style={{ backgroundColor: theme.previewCard }} />
                          <div className="w-1/3 h-full border-r border-white/10 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.previewAccent }} />
                          </div>
                          <div className="w-1/3 h-full flex items-center justify-center font-bold text-[9px]" style={{ color: theme.previewText }}>
                            Aa
                          </div>
                        </div>

                        <span className="text-[10.5px] text-txt-muted leading-tight">
                          {theme.desc}
                        </span>
                      </button>
                    );
                  })}
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
                        const isOpen = activeColorField === key;
                        return (
                          <div key={key} className="relative">
                            <div className="flex items-center justify-between p-2 rounded-lg border border-border-sub bg-surface-elevated/30 hover:bg-surface-hover transition-colors">
                              <span className="text-[11.5px] text-txt-secondary font-medium">{label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-txt-muted uppercase">{currentColor}</span>
                                <button
                                  type="button"
                                  onClick={() => setActiveColorField(isOpen ? null : key)}
                                  className="w-6 h-6 rounded-md border border-white/20 cursor-pointer shadow-xs transition-transform active:scale-95"
                                  style={{ backgroundColor: currentColor }}
                                  title={`Change ${label}`}
                                />
                              </div>
                            </div>

                            {/* ColorPicker Popover Dropdown */}
                            {isOpen && (
                              <div className="absolute right-0 top-full mt-2 z-50 shadow-2xl">
                                <div className="fixed inset-0 z-40" onClick={() => setActiveColorField(null)} />
                                <div className="relative z-50">
                                  <ColorPicker
                                    color={currentColor}
                                    onChange={(newColor) => {
                                      setCustomTheme({ [key]: newColor });
                                    }}
                                  />
                                </div>
                              </div>
                            )}
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
                      className="w-3.5 h-3.5 rounded border-border-def bg-surface-elevated text-accent focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Body Fill</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formState.bullColor}
                      onChange={(e) => handleFieldChange('bullColor', e.target.value)}
                      className="w-6 h-6 rounded border border-border-def cursor-pointer bg-transparent"
                    />
                    <input
                      type="color"
                      value={formState.bearColor}
                      onChange={(e) => handleFieldChange('bearColor', e.target.value)}
                      className="w-6 h-6 rounded border border-border-def cursor-pointer bg-transparent"
                    />
                  </div>
                </div>

                {/* Borders */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.showBorders}
                      onChange={(e) => handleFieldChange('showBorders', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-border-def bg-surface-elevated text-accent focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Borders</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formState.bullBorderColor}
                      onChange={(e) => handleFieldChange('bullBorderColor', e.target.value)}
                      className="w-6 h-6 rounded border border-border-def cursor-pointer bg-transparent"
                    />
                    <input
                      type="color"
                      value={formState.bearBorderColor}
                      onChange={(e) => handleFieldChange('bearBorderColor', e.target.value)}
                      className="w-6 h-6 rounded border border-border-def cursor-pointer bg-transparent"
                    />
                  </div>
                </div>

                {/* Wicks */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.showWicks}
                      onChange={(e) => handleFieldChange('showWicks', e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-border-def bg-surface-elevated text-accent focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Wicks</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formState.bullWickColor}
                      onChange={(e) => handleFieldChange('bullWickColor', e.target.value)}
                      className="w-6 h-6 rounded border border-border-def cursor-pointer bg-transparent"
                    />
                    <input
                      type="color"
                      value={formState.bearWickColor}
                      onChange={(e) => handleFieldChange('bearWickColor', e.target.value)}
                      className="w-6 h-6 rounded border border-border-def cursor-pointer bg-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Canvas */}
            {activeTab === 'Canvas' && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span>Background</span>
                  <input
                    type="color"
                    value={formState.background}
                    onChange={(e) => handleFieldChange('background', e.target.value)}
                    className="w-6 h-6 rounded border border-border-def cursor-pointer bg-transparent"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span>Grid Lines</span>
                  <input
                    type="color"
                    value={formState.gridColor}
                    onChange={(e) => handleFieldChange('gridColor', e.target.value)}
                    className="w-6 h-6 rounded border border-border-def cursor-pointer bg-transparent"
                  />
                </div>
              </div>
            )}

            {/* Tab: Scales */}
            {activeTab === 'Scales' && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span>Scales Text Color</span>
                  <input
                    type="color"
                    value={formState.scalesTextColor}
                    onChange={(e) => handleFieldChange('scalesTextColor', e.target.value)}
                    className="w-6 h-6 rounded border border-border-def cursor-pointer bg-transparent"
                  />
                </div>
              </div>
            )}

            {/* Tab: Timezone */}
            {activeTab === 'Timezone' && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span>Timezone Label</span>
                  <span className="font-mono text-txt-muted">{formState.userTimezoneLabel}</span>
                </div>
              </div>
            )}

            {/* Tab: Replay */}
            {activeTab === 'Replay' && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span>Replay Duration (Seconds)</span>
                  <span className="font-mono text-txt-muted">{formState.replayMaxDuration}s</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-sub bg-surface">
          <div className="flex items-center gap-2">
            <select
              value={selectedPreset}
              onChange={(e) => {
                const name = e.target.value;
                setSelectedPreset(name);
                if (PRESET_SETTINGS[name]) {
                  setFormState({ ...PRESET_SETTINGS[name] });
                }
              }}
              className="bg-surface-elevated border border-border-def text-txt-secondary rounded px-2.5 py-1 text-xs outline-none"
            >
              <option value="classic">TradingView Classic</option>
              <option value="obsidian">Midnight Obsidian</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-txt-muted hover:text-txt-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs bg-accent text-txt-inverse rounded font-semibold hover:bg-accent-hover transition-colors cursor-pointer"
            >
              Ok
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
