import React from 'react';
import { ChevronDown } from 'lucide-react';
import { ColorPicker } from '../ColorPicker';
import { Checkbox } from '../common';
import type { FibCustomSettings, FibLevel } from '@/framework/tools/implementations/FibonacciRetracement';
import { DEFAULT_FIB_LEVELS, DEFAULT_FIB_SETTINGS } from '@/framework/tools/implementations/FibonacciRetracement';

export interface DrawingFibonacciStyleTabProps {
  customSettings: FibCustomSettings;
  onUpdate: (updates: Partial<FibCustomSettings>) => void;
  activeColorPicker: string | null;
  setActiveColorPicker: (picker: string | null) => void;
  activeSelect: string | null;
  setActiveSelect: (select: any) => void;
}

export const DrawingFibonacciStyleTab: React.FC<DrawingFibonacciStyleTabProps> = ({
  customSettings = DEFAULT_FIB_SETTINGS,
  onUpdate,
  activeColorPicker,
  setActiveColorPicker,
  activeSelect,
  setActiveSelect,
}) => {
  const trendLine = customSettings.trendLine || DEFAULT_FIB_SETTINGS.trendLine;
  const levelsLine = customSettings.levelsLine || DEFAULT_FIB_SETTINGS.levelsLine;
  const extend = customSettings.extend || DEFAULT_FIB_SETTINGS.extend;
  const levels = customSettings.levels && customSettings.levels.length === 24
    ? customSettings.levels
    : DEFAULT_FIB_LEVELS;
  const useOneColor = customSettings.useOneColor || false;
  const oneColor = customSettings.oneColor || '#808080';
  const oneTextColor = customSettings.oneTextColor || customSettings.oneColor || '#808080';
  const background = customSettings.background || DEFAULT_FIB_SETTINGS.background;
  const reverse = customSettings.reverse || false;
  const prices = customSettings.prices !== false;
  const levelsVisible = customSettings.levelsVisible !== false;
  const levelsStyle = customSettings.levelsStyle || 'values';
  const labelsPosition = customSettings.labelsPosition || DEFAULT_FIB_SETTINGS.labelsPosition || { horizontal: 'left', vertical: 'top' };
  const showCustomText = customSettings.showCustomText !== false;
  const textPosition = customSettings.textPosition || DEFAULT_FIB_SETTINGS.textPosition || { horizontal: 'right', vertical: 'middle' };
  const fontSize = customSettings.fontSize || DEFAULT_FIB_SETTINGS.fontSize || 12;

  const fontSizeButtonRef = React.useRef<HTMLButtonElement>(null);
  const [fontSizePlacement, setFontSizePlacement] = React.useState<'top' | 'bottom'>('bottom');

  const handleToggleFontSize = () => {
    if (activeSelect === 'fib_font_size') {
      setActiveSelect(null);
    } else {
      if (fontSizeButtonRef.current) {
        const rect = fontSizeButtonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const menuHeight = 220;
        setFontSizePlacement(spaceBelow < menuHeight ? 'top' : 'bottom');
      }
      setActiveSelect('fib_font_size');
      setActiveColorPicker(null);
    }
  };

  const handleLevelChange = (index: number, updates: Partial<FibLevel>) => {
    const updatedLevels = [...levels];
    updatedLevels[index] = { ...updatedLevels[index], ...updates };
    onUpdate({ levels: updatedLevels });
  };

  const extendLabels: Record<string, string> = {
    none: "Don't extend",
    left: 'Left',
    right: 'Right',
    both: 'Both',
  };

  return (
    <div className="space-y-4 text-[12.5px]">
      {/* 1. Trend Line */}
      <div className="flex items-center justify-between min-h-[36px]">
        <Checkbox
          checked={trendLine.enabled !== false}
          onChange={(e) =>
            onUpdate({
              trendLine: { ...trendLine, enabled: e.target.checked },
            })
          }
          label={<span className="text-txt-muted font-medium">Trend line</span>}
        />

        <div className="flex gap-2 items-center relative">
          {/* Trend line Color */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveColorPicker(activeColorPicker === 'fib_trend_color' ? null : 'fib_trend_color');
                setActiveSelect(null);
              }}
              className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
              style={{ backgroundColor: trendLine.color || '#808080' }}
            />
            {activeColorPicker === 'fib_trend_color' && (
              <div className="absolute right-0 top-full mt-2 z-50">
                <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                <div className="relative">
                  <ColorPicker
                    color={trendLine.color || '#808080'}
                    onChange={(c) =>
                      onUpdate({
                        trendLine: { ...trendLine, color: c },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Trend line Width Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveSelect(activeSelect === 'fib_trend_width' ? null : 'fib_trend_width');
                setActiveColorPicker(null);
              }}
              className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-2.5 py-1.5 text-[12px] font-mono font-bold w-14 h-8 cursor-pointer transition-all active:scale-95 text-txt-primary"
            >
              <span>{trendLine.width || 2}px</span>
            </button>
            {activeSelect === 'fib_trend_width' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-16 overflow-hidden">
                  <div className="flex flex-col gap-0.5">
                    {[1, 2, 3, 4].map((w) => (
                      <button
                        key={w}
                        onClick={() => {
                          onUpdate({ trendLine: { ...trendLine, width: w } });
                          setActiveSelect(null);
                        }}
                        className={`w-full text-center px-2.5 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] font-mono font-semibold cursor-pointer ${
                          (trendLine.width || 2) === w
                            ? 'bg-accent text-txt-inverse shadow-xs'
                            : 'text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Trend line Style Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveSelect(activeSelect === 'fib_trend_style' ? null : 'fib_trend_style');
                setActiveColorPicker(null);
              }}
              className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
            >
              <span>{trendLine.style || 'dashed'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
            </button>
            {activeSelect === 'fib_trend_style' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-24 overflow-hidden">
                  <div className="flex flex-col gap-0.5">
                    {['solid', 'dashed', 'dotted'].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          onUpdate({ trendLine: { ...trendLine, style: s as any } });
                          setActiveSelect(null);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] capitalize cursor-pointer ${
                          (trendLine.style || 'dashed') === s
                            ? 'bg-accent text-txt-inverse font-semibold shadow-xs'
                            : 'text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Levels Line */}
      <div className="flex items-center justify-between min-h-[36px]">
        <span className="text-txt-muted font-medium">Levels line</span>
        <div className="flex gap-2 items-center relative">
          {/* Levels line Width */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveSelect(activeSelect === 'fib_levels_width' ? null : 'fib_levels_width');
                setActiveColorPicker(null);
              }}
              className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-2.5 py-1.5 text-[12px] font-mono font-bold w-14 h-8 cursor-pointer transition-all active:scale-95 text-txt-primary"
            >
              <span>{levelsLine.width || 2}px</span>
            </button>
            {activeSelect === 'fib_levels_width' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-16 overflow-hidden">
                  <div className="flex flex-col gap-0.5">
                    {[1, 2, 3, 4].map((w) => (
                      <button
                        key={w}
                        onClick={() => {
                          onUpdate({ levelsLine: { ...levelsLine, width: w } });
                          setActiveSelect(null);
                        }}
                        className={`w-full text-center px-2.5 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] font-mono font-semibold cursor-pointer ${
                          (levelsLine.width || 2) === w
                            ? 'bg-accent text-txt-inverse shadow-xs'
                            : 'text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Levels line Style */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveSelect(activeSelect === 'fib_levels_style' ? null : 'fib_levels_style');
                setActiveColorPicker(null);
              }}
              className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
            >
              <span>{levelsLine.style || 'solid'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
            </button>
            {activeSelect === 'fib_levels_style' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-24 overflow-hidden">
                  <div className="flex flex-col gap-0.5">
                    {['solid', 'dashed', 'dotted'].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          onUpdate({ levelsLine: { ...levelsLine, style: s as any } });
                          setActiveSelect(null);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] capitalize cursor-pointer ${
                          (levelsLine.style || 'solid') === s
                            ? 'bg-accent text-txt-inverse font-semibold shadow-xs'
                            : 'text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. Extend */}
      <div className="flex items-center justify-between min-h-[36px]">
        <span className="text-txt-muted font-medium">Extend</span>
        <div className="relative">
          <button
            onClick={() => {
              setActiveSelect(activeSelect === 'fib_extend' ? null : 'fib_extend');
              setActiveColorPicker(null);
            }}
            className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-36 h-8 cursor-pointer transition-all active:scale-95 text-txt-primary"
          >
            <span>{extendLabels[extend] || "Don't extend"}</span>
            <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
          </button>
          {activeSelect === 'fib_extend' && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
              <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-36 overflow-hidden">
                <div className="flex flex-col gap-0.5">
                  {(['none', 'left', 'right', 'both'] as const).map((ext) => (
                    <button
                      key={ext}
                      onClick={() => {
                        onUpdate({ extend: ext });
                        setActiveSelect(null);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] cursor-pointer ${
                        extend === ext
                          ? 'bg-accent text-txt-inverse font-semibold shadow-xs'
                          : 'text-txt-secondary hover:text-txt-primary'
                      }`}
                    >
                      {extendLabels[ext]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-border-def my-2" />

      {/* 4. 24 Fibonacci Levels (2-column TradingView layout) */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {levels.map((lvl, idx) => (
          <div key={idx} className="flex items-center justify-between min-h-[32px] gap-1.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Checkbox
                checked={lvl.enabled}
                onChange={(e) => handleLevelChange(idx, { enabled: e.target.checked })}
              />
              <input
                type="text"
                inputMode="decimal"
                value={lvl.level.toString()}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  handleLevelChange(idx, { level: isNaN(val) ? 0 : val });
                }}
                className={`w-20 px-2 py-1 bg-app-bg border border-border-def rounded-md text-xs font-mono focus:border-border-focus focus:outline-none transition-colors ${
                  !lvl.enabled ? 'text-txt-muted opacity-60' : 'text-txt-primary'
                }`}
              />
            </div>

            {/* Level Color Picker Swatch */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => {
                  setActiveColorPicker(activeColorPicker === `fib_lvl_${idx}` ? null : `fib_lvl_${idx}`);
                  setActiveSelect(null);
                }}
                className="w-7 h-7 rounded-md border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
                style={{ backgroundColor: lvl.color }}
              />
              {activeColorPicker === `fib_lvl_${idx}` && (
                <div className="absolute right-0 top-full mt-2 z-50">
                  <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                  <div className="relative">
                    <ColorPicker
                      color={lvl.color}
                      onChange={(c) => handleLevelChange(idx, { color: c })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border-def my-2" />

      {/* 5. Use One Color */}
      <div className="flex items-center justify-between min-h-[36px]">
        <Checkbox
          checked={useOneColor}
          onChange={(e) => onUpdate({ useOneColor: e.target.checked })}
          label={<span className="text-txt-muted font-medium">Use one color</span>}
        />
        <div className="flex gap-3 items-center relative">
          {/* Shared Line Color */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-txt-muted font-medium">Line</span>
            <div className="relative">
              <button
                onClick={() => {
                  setActiveColorPicker(activeColorPicker === 'fib_one_color' ? null : 'fib_one_color');
                  setActiveSelect(null);
                }}
                className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
                style={{ backgroundColor: oneColor }}
                title="Shared line color"
              />
              {activeColorPicker === 'fib_one_color' && (
                <div className="absolute right-0 top-full mt-2 z-50">
                  <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                  <div className="relative">
                    <ColorPicker
                      color={oneColor}
                      onChange={(c) => onUpdate({ oneColor: c })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shared Text Color */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-txt-muted font-medium">Text</span>
            <div className="relative">
              <button
                onClick={() => {
                  setActiveColorPicker(activeColorPicker === 'fib_one_text_color' ? null : 'fib_one_text_color');
                  setActiveSelect(null);
                }}
                className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
                style={{ backgroundColor: oneTextColor }}
                title="Shared text color"
              />
              {activeColorPicker === 'fib_one_text_color' && (
                <div className="absolute right-0 top-full mt-2 z-50">
                  <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                  <div className="relative">
                    <ColorPicker
                      color={oneTextColor}
                      onChange={(c) => onUpdate({ oneTextColor: c, textColor: c })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Background & Opacity */}
      <div className="flex items-center justify-between min-h-[36px]">
        <Checkbox
          checked={background.enabled !== false}
          onChange={(e) =>
            onUpdate({
              background: { ...background, enabled: e.target.checked },
            })
          }
          label={<span className="text-txt-muted font-medium">Background</span>}
        />
        <div className="flex items-center gap-3 w-44">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={background.opacity ?? 20}
            onChange={(e) =>
              onUpdate({
                background: {
                  ...background,
                  opacity: parseInt(e.target.value, 10) || 0,
                },
              })
            }
            className="w-full h-1.5 appearance-none rounded-full bg-surface-elevated accent-accent cursor-pointer focus:outline-none transition-all"
          />
          <span className="text-xs font-mono font-semibold text-accent w-10 text-right">
            {background.opacity ?? 20}%
          </span>
        </div>
      </div>

      {/* 7. Reverse */}
      <div className="flex items-center justify-between min-h-[36px]">
        <Checkbox
          checked={reverse}
          onChange={(e) => onUpdate({ reverse: e.target.checked })}
          label={<span className="text-txt-muted font-medium">Reverse</span>}
        />
      </div>

      {/* 8. Prices */}
      <div className="flex items-center justify-between min-h-[36px]">
        <Checkbox
          checked={prices}
          onChange={(e) => onUpdate({ prices: e.target.checked })}
          label={<span className="text-txt-muted font-medium">Prices</span>}
        />
      </div>

      {/* 9. Levels & Format (Values / Percents) */}
      <div className="flex items-center justify-between min-h-[36px]">
        <Checkbox
          checked={levelsVisible}
          onChange={(e) => onUpdate({ levelsVisible: e.target.checked })}
          label={<span className="text-txt-muted font-medium">Levels</span>}
        />
        <div className="relative">
          <button
            onClick={() => {
              setActiveSelect(activeSelect === 'fib_levels_format' ? null : 'fib_levels_format');
              setActiveColorPicker(null);
            }}
            className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-28 h-8 capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
          >
            <span>{levelsStyle === 'percents' ? 'Percents' : 'Values'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
          </button>
          {activeSelect === 'fib_levels_format' && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
              <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-28 overflow-hidden">
                <div className="flex flex-col gap-0.5">
                  {(['values', 'percents'] as const).map((styleOpt) => (
                    <button
                      key={styleOpt}
                      onClick={() => {
                        onUpdate({ levelsStyle: styleOpt });
                        setActiveSelect(null);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] capitalize cursor-pointer ${
                        levelsStyle === styleOpt
                          ? 'bg-accent text-txt-inverse font-semibold shadow-xs'
                          : 'text-txt-secondary hover:text-txt-primary'
                      }`}
                    >
                      {styleOpt === 'percents' ? 'Percents' : 'Values'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 10. Labels (Horizontal & Vertical Position) */}
      <div className="flex items-center justify-between min-h-[36px]">
        <span className="text-txt-muted font-medium">Labels</span>
        <div className="flex gap-2 items-center relative">
          {/* Labels Horizontal Position Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveSelect(activeSelect === 'fib_labels_halign' ? null : 'fib_labels_halign');
                setActiveColorPicker(null);
              }}
              className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
            >
              <span>{labelsPosition.horizontal || 'left'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
            </button>
            {activeSelect === 'fib_labels_halign' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-24 overflow-hidden">
                  <div className="flex flex-col gap-0.5">
                    {(['left', 'center', 'right'] as const).map((h) => (
                      <button
                        key={h}
                        onClick={() => {
                          onUpdate({
                            labelsPosition: { ...labelsPosition, horizontal: h },
                          });
                          setActiveSelect(null);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] capitalize cursor-pointer ${
                          (labelsPosition.horizontal || 'left') === h
                            ? 'bg-accent text-txt-inverse font-semibold shadow-xs'
                            : 'text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Labels Vertical Position Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveSelect(activeSelect === 'fib_labels_valign' ? null : 'fib_labels_valign');
                setActiveColorPicker(null);
              }}
              className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
            >
              <span>{labelsPosition.vertical || 'top'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
            </button>
            {activeSelect === 'fib_labels_valign' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-24 overflow-hidden">
                  <div className="flex flex-col gap-0.5">
                    {(['top', 'middle', 'bottom'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => {
                          onUpdate({
                            labelsPosition: { ...labelsPosition, vertical: v },
                          });
                          setActiveSelect(null);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] capitalize cursor-pointer ${
                          (labelsPosition.vertical || 'top') === v
                            ? 'bg-accent text-txt-inverse font-semibold shadow-xs'
                            : 'text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 11. Text (Custom Text Checkbox + Horizontal & Vertical Alignment) */}
      <div className="flex items-center justify-between min-h-[36px]">
        <Checkbox
          checked={showCustomText}
          onChange={(e) => onUpdate({ showCustomText: e.target.checked })}
          label={<span className="text-txt-muted font-medium">Text</span>}
        />
        <div className="flex gap-2 items-center relative">
          {/* Custom Text Horizontal Alignment Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveSelect(activeSelect === 'fib_text_halign' ? null : 'fib_text_halign');
                setActiveColorPicker(null);
              }}
              className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
            >
              <span>{textPosition.horizontal || 'right'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
            </button>
            {activeSelect === 'fib_text_halign' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-24 overflow-hidden">
                  <div className="flex flex-col gap-0.5">
                    {(['left', 'center', 'right'] as const).map((h) => (
                      <button
                        key={h}
                        onClick={() => {
                          onUpdate({
                            textPosition: { ...textPosition, horizontal: h },
                          });
                          setActiveSelect(null);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] capitalize cursor-pointer ${
                          (textPosition.horizontal || 'right') === h
                            ? 'bg-accent text-txt-inverse font-semibold shadow-xs'
                            : 'text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Custom Text Vertical Alignment Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveSelect(activeSelect === 'fib_text_valign' ? null : 'fib_text_valign');
                setActiveColorPicker(null);
              }}
              className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
            >
              <span>{textPosition.vertical || 'middle'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
            </button>
            {activeSelect === 'fib_text_valign' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-24 overflow-hidden">
                  <div className="flex flex-col gap-0.5">
                    {(['top', 'middle', 'bottom'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => {
                          onUpdate({
                            textPosition: { ...textPosition, vertical: v },
                          });
                          setActiveSelect(null);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] capitalize cursor-pointer ${
                          (textPosition.vertical || 'middle') === v
                            ? 'bg-accent text-txt-inverse font-semibold shadow-xs'
                            : 'text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 12. Font Size */}
      <div className="flex items-center justify-between min-h-[36px]">
        <span className="text-txt-muted font-medium">Font size</span>
        <div className="relative">
          <button
            ref={fontSizeButtonRef}
            onClick={handleToggleFontSize}
            className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-2.5 py-1.5 text-[12px] font-mono font-bold w-16 h-8 cursor-pointer transition-all active:scale-95 text-txt-primary"
          >
            <span>{fontSize}</span>
            <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
          </button>
          {activeSelect === 'fib_font_size' && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
              <div
                className={`absolute right-0 ${
                  fontSizePlacement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
                } bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-16 overflow-hidden`}
              >
                <div className="flex flex-col gap-0.5">
                  {[10, 11, 12, 14, 16, 20, 24].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => {
                        onUpdate({ fontSize: sz });
                        setActiveSelect(null);
                      }}
                      className={`w-full text-center px-2.5 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] font-mono font-semibold cursor-pointer ${
                        fontSize === sz
                          ? 'bg-accent text-txt-inverse shadow-xs'
                          : 'text-txt-secondary hover:text-txt-primary'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
