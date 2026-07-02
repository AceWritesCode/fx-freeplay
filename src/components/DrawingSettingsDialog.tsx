import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { ColorPicker } from './ColorPicker';

interface DrawingSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  overlay: any;
  onSave: (settings: any, points?: any[]) => void;
  timeframe?: string;
  allCandles?: any[]; // To map bar index <-> timestamp
}

type TabType = 'style' | 'text' | 'coordinates' | 'visibility';

export const DrawingSettingsDialog: React.FC<DrawingSettingsDialogProps> = ({
  isOpen,
  onClose,
  overlay,
  onSave,
  timeframe = '1m',
  allCandles = []
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('style');
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string; settings: any }[]>([]);
  
  // Style Tab States
  const [lineColor, setLineColor] = useState('#2196F3');
  const [lineWidth, setLineWidth] = useState(1);
  const [lineStyle, setLineStyle] = useState('solid');
  const [extendType, setExtendType] = useState('none');
  const [showMiddlePoint, setShowMiddlePoint] = useState(false);
  const [showPriceLabels, setShowPriceLabels] = useState(false);
  const [statsType, setStatsType] = useState('hidden');
  const [statsPosition, setStatsPosition] = useState('right');
  const [alwaysShowStats, setAlwaysShowStats] = useState(false);

  // Text Tab States
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#2196F3');
  const [fontSize, setFontSize] = useState(14);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textValign, setTextValign] = useState('middle');
  const [textHalign, setTextHalign] = useState('right');

  // Coordinates Tab States
  const [points, setPoints] = useState<any[]>([]);

  // Visibility Tab States
  const [visibility, setVisibility] = useState<Record<string, any>>({
    ticks: { show: true },
    seconds: { show: true, min: 1, max: 59 },
    minutes: { show: true, min: 1, max: 59 },
    hours: { show: true, min: 1, max: 24 },
    days: { show: true, min: 1, max: 365 },
    weeks: { show: true, min: 1, max: 52 },
    months: { show: true, min: 1, max: 12 },
    ranges: { show: true }
  });

  // Color Pickers active dropdowns
  const [activeColorPicker, setActiveColorPicker] = useState<'line' | 'text' | null>(null);
  
  // Custom dropdowns for style selectors
  const [activeSelect, setActiveSelect] = useState<'lineWidth' | 'lineStyle' | 'extend' | 'stats' | 'statsPos' | 'fontSize' | 'valign' | 'halign' | null>(null);

  // Load overlay settings and templates on mount/open
  useEffect(() => {
    if (!isOpen || !overlay) return;

    const customSettings = overlay.extendData?.customSettings || {};
    
    // Style settings
    setLineColor(customSettings.lineColor || '#2196F3');
    setLineWidth(customSettings.lineWidth || 1);
    setLineStyle(customSettings.lineStyle || 'solid');
    setExtendType(customSettings.extendType || 'none');
    setShowMiddlePoint(!!customSettings.showMiddlePoint);
    setShowPriceLabels(!!customSettings.showPriceLabels);
    setStatsType(customSettings.statsType || 'hidden');
    setStatsPosition(customSettings.statsPosition || 'right');
    setAlwaysShowStats(!!customSettings.alwaysShowStats);

    // Text settings
    setText(customSettings.text || '');
    setTextColor(customSettings.textColor || '#2196F3');
    setFontSize(customSettings.fontSize || 14);
    setIsBold(!!customSettings.bold);
    setIsItalic(!!customSettings.italic);
    setTextValign(customSettings.textPosition?.vertical || 'middle');
    setTextHalign(customSettings.textPosition?.horizontal || 'right');

    // Visibility settings
    if (customSettings.visibility) {
      setVisibility(customSettings.visibility);
    }

    // Points coordinates
    if (overlay.points) {
      const mappedPoints = overlay.points.map((pt: any) => {
        // Find bar index
        let barIndex = 0;
        if (allCandles.length > 0) {
          const idx = allCandles.findIndex(c => c.timestamp === pt.timestamp);
          if (idx !== -1) barIndex = idx;
        }
        return {
          price: pt.value,
          bar: barIndex,
          timestamp: pt.timestamp
        };
      });
      setPoints(mappedPoints);
    }

    // Load templates
    try {
      const saved = localStorage.getItem(`fx_templates_${overlay.name || 'default'}`);
      if (saved) setTemplates(JSON.parse(saved));
      else setTemplates([]);
    } catch (e) {
      setTemplates([]);
    }

    setActiveTab('style');
    setActiveColorPicker(null);
    setActiveSelect(null);
    setIsTemplateDropdownOpen(false);
  }, [isOpen, overlay, allCandles]);

  if (!isOpen || !overlay) return null;

  const handleSave = () => {
    // 1. Build settings object
    const updatedSettings = {
      lineColor,
      lineWidth,
      lineStyle,
      extendType,
      showMiddlePoint,
      showPriceLabels,
      statsType,
      statsPosition,
      alwaysShowStats,
      text,
      textColor,
      fontSize,
      bold: isBold,
      italic: isItalic,
      textPosition: {
        vertical: textValign,
        horizontal: textHalign
      },
      visibility
    };

    // 2. Build coordinates points
    const updatedPoints = points.map(pt => {
      let finalTimestamp = pt.timestamp;
      // Map bar index back to timestamp if changed
      if (allCandles.length > 0) {
        const candle = allCandles[pt.bar];
        if (candle) {
          finalTimestamp = candle.timestamp;
        } else {
          // If out of bounds index (future index)
          const lastCandle = allCandles[allCandles.length - 1];
          if (lastCandle) {
            const indexDiff = pt.bar - (allCandles.length - 1);
            // Calculate future time offset based on timeframe
            let timeframeMinutes = 1;
            const tf = timeframe.toLowerCase();
            if (tf.endsWith('m')) timeframeMinutes = parseInt(tf);
            else if (tf.endsWith('h')) timeframeMinutes = parseInt(tf) * 60;
            else if (tf.endsWith('d')) timeframeMinutes = parseInt(tf) * 1440;
            
            finalTimestamp = lastCandle.timestamp + indexDiff * timeframeMinutes * 60 * 1000;
          }
        }
      }
      return {
        timestamp: finalTimestamp,
        value: parseFloat(pt.price)
      };
    });

    onSave(updatedSettings, updatedPoints);
    onClose();
  };

  const handlePointChange = (index: number, field: 'price' | 'bar', val: string) => {
    setPoints(prev => {
      const updated = [...prev];
      if (field === 'price') {
        updated[index] = { ...updated[index], price: val };
      } else {
        // Bar index must be integer
        const parsed = parseInt(val) || 0;
        updated[index] = { ...updated[index], bar: parsed };
      }
      return updated;
    });
  };

  const handleVisibilityChange = (unit: string, field: 'show' | 'min' | 'max', val: any) => {
    setVisibility(prev => {
      const updatedUnit = { ...prev[unit] };
      if (field === 'show') {
        updatedUnit.show = !!val;
      } else {
        const parsed = parseInt(val) || 0;
        updatedUnit[field] = parsed;
      }
      return { ...prev, [unit]: updatedUnit };
    });
  };

  const saveTemplate = () => {
    const name = window.prompt("Enter template name:");
    if (!name) return;

    const newTemplate = {
      id: Date.now().toString(),
      name,
      settings: {
        lineColor,
        lineWidth,
        lineStyle,
        extendType,
        showMiddlePoint,
        showPriceLabels,
        statsType,
        statsPosition,
        alwaysShowStats,
        text,
        textColor,
        fontSize,
        bold: isBold,
        italic: isItalic,
        textPosition: {
          vertical: textValign,
          horizontal: textHalign
        },
        visibility
      }
    };

    setTemplates(prev => {
      const updated = [...prev, newTemplate];
      localStorage.setItem(`fx_templates_${overlay.name || 'default'}`, JSON.stringify(updated));
      return updated;
    });
    setIsTemplateDropdownOpen(false);
  };

  const applyTemplate = (settings: any) => {
    if (!settings) return;
    setLineColor(settings.lineColor || '#2196F3');
    setLineWidth(settings.lineWidth || 1);
    setLineStyle(settings.lineStyle || 'solid');
    setExtendType(settings.extendType || 'none');
    setShowMiddlePoint(!!settings.showMiddlePoint);
    setShowPriceLabels(!!settings.showPriceLabels);
    setStatsType(settings.statsType || 'hidden');
    setStatsPosition(settings.statsPosition || 'right');
    setAlwaysShowStats(!!settings.alwaysShowStats);
    setText(settings.text || '');
    setTextColor(settings.textColor || '#2196F3');
    setFontSize(settings.fontSize || 14);
    setIsBold(!!settings.bold);
    setIsItalic(!!settings.italic);
    setTextValign(settings.textPosition?.vertical || 'middle');
    setTextHalign(settings.textPosition?.horizontal || 'right');
    if (settings.visibility) setVisibility(settings.visibility);
    setIsTemplateDropdownOpen(false);
  };

  const resetToDefault = () => {
    setLineColor('#2196F3');
    setLineWidth(1);
    setLineStyle('solid');
    setExtendType('none');
    setShowMiddlePoint(false);
    setShowPriceLabels(false);
    setStatsType('hidden');
    setStatsPosition('right');
    setAlwaysShowStats(false);
    setText('');
    setTextColor('#2196F3');
    setFontSize(14);
    setIsBold(false);
    setIsItalic(false);
    setTextValign('middle');
    setTextHalign('right');
    setVisibility({
      ticks: { show: true },
      seconds: { show: true, min: 1, max: 59 },
      minutes: { show: true, min: 1, max: 59 },
      hours: { show: true, min: 1, max: 24 },
      days: { show: true, min: 1, max: 365 },
      weeks: { show: true, min: 1, max: 52 },
      months: { show: true, min: 1, max: 12 },
      ranges: { show: true }
    });
    setIsTemplateDropdownOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
      
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Dialog container */}
      <div 
        className="bg-[#1e222d] border border-gray-800 rounded-xl shadow-2xl w-[390px] flex flex-col z-50 text-gray-200 overflow-visible relative animate-in zoom-in-95 duration-150"
        style={{ minHeight: '480px' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm capitalize">{overlay.name === 'trendLine' ? 'Trendline' : overlay.name}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs navigation */}
        <div className="flex px-4 border-b border-gray-800 text-xs font-semibold gap-4 overflow-x-auto select-none">
          {(['style', 'text', 'coordinates', 'visibility'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 border-b-2 capitalize transition-colors relative cursor-pointer ${
                activeTab === tab 
                  ? 'border-indigo-500 text-white font-bold' 
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 p-4 text-xs overflow-y-auto max-h-[380px] space-y-4">
          
          {/* STYLE TAB */}
          {activeTab === 'style' && (
            <div className="space-y-4">
              
              {/* Line Color/Width/Style Row */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Line</span>
                <div className="flex gap-1.5 items-center relative">
                  
                  {/* Color Swatch */}
                  <div className="relative">
                    <button 
                      onClick={() => setActiveColorPicker(activeColorPicker === 'line' ? null : 'line')}
                      className="w-7 h-7 rounded border border-gray-800 hover:border-gray-700 transition-colors flex items-center justify-center cursor-pointer shadow-md"
                      style={{ backgroundColor: lineColor }}
                    />
                    {activeColorPicker === 'line' && (
                      <div className="absolute right-0 top-full mt-2 z-50">
                        <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                        <div className="relative">
                          <ColorPicker color={lineColor} onChange={(c) => setLineColor(c)} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thickness Custom Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveSelect(activeSelect === 'lineWidth' ? null : 'lineWidth')}
                      className="flex items-center justify-center border border-gray-800 hover:border-gray-700 bg-[#131722] rounded px-2.5 py-1.5 text-xs font-mono font-bold w-12 h-7 justify-between cursor-pointer"
                    >
                      <span>{lineWidth}px</span>
                    </button>
                    {activeSelect === 'lineWidth' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-[#1e222d] border border-gray-800 rounded shadow-xl z-50 py-1 w-16">
                          {[1, 2, 3, 4].map(w => (
                            <button
                              key={w}
                              onClick={() => { setLineWidth(w); setActiveSelect(null); }}
                              className={`w-full text-center px-3 py-1.5 hover:bg-gray-800 transition-colors text-xs font-mono font-semibold ${lineWidth === w ? 'text-indigo-500' : 'text-gray-300'}`}
                            >
                              {w}px
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Line Style Custom Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveSelect(activeSelect === 'lineStyle' ? null : 'lineStyle')}
                      className="flex items-center justify-center border border-gray-800 hover:border-gray-700 bg-[#131722] rounded px-2.5 py-1.5 text-xs font-semibold w-20 h-7 justify-between capitalize cursor-pointer"
                    >
                      <span>{lineStyle}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    {activeSelect === 'lineStyle' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-[#1e222d] border border-gray-800 rounded shadow-xl z-50 py-1 w-24">
                          {['solid', 'dashed', 'dotted'].map(s => (
                            <button
                              key={s}
                              onClick={() => { setLineStyle(s); setActiveSelect(null); }}
                              className={`w-full text-left px-3 py-1.5 hover:bg-gray-800 transition-colors text-xs capitalize ${lineStyle === s ? 'text-indigo-500' : 'text-gray-300'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                </div>
              </div>

              {/* Extend Row */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Extend</span>
                <div className="relative">
                  <button
                    onClick={() => setActiveSelect(activeSelect === 'extend' ? null : 'extend')}
                    className="flex items-center justify-between border border-gray-800 hover:border-gray-700 bg-[#131722] rounded px-2.5 py-1.5 text-xs font-semibold w-40 h-7 cursor-pointer"
                  >
                    <span className="capitalize">{extendType === 'none' ? "Don't extend" : `Extend ${extendType}`}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  {activeSelect === 'extend' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                      <div className="absolute right-0 top-full mt-1 bg-[#1e222d] border border-gray-800 rounded shadow-xl z-50 py-1 w-40">
                        {[
                          { val: 'none', label: "Don't extend" },
                          { val: 'left', label: 'Extend left' },
                          { val: 'right', label: 'Extend right' },
                          { val: 'both', label: 'Extend both' }
                        ].map(item => (
                          <button
                            key={item.val}
                            onClick={() => { setExtendType(item.val); setActiveSelect(null); }}
                            className={`w-full text-left px-3 py-1.5 hover:bg-gray-800 transition-colors text-xs ${extendType === item.val ? 'text-indigo-500' : 'text-gray-300'}`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Middle Point Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer group text-gray-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={showMiddlePoint}
                  onChange={(e) => setShowMiddlePoint(e.target.checked)}
                  className="rounded bg-[#131722] border-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
                <span>Middle point</span>
              </label>

              {/* Price Labels Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer group text-gray-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={showPriceLabels}
                  onChange={(e) => setShowPriceLabels(e.target.checked)}
                  className="rounded bg-[#131722] border-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
                <span>Price labels</span>
              </label>

              {/* Divider for Info */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Info</span>
                
                {/* Stats Dropdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Stats</span>
                    <div className="relative">
                      <button
                        onClick={() => setActiveSelect(activeSelect === 'stats' ? null : 'stats')}
                        className="flex items-center justify-between border border-gray-800 hover:border-gray-700 bg-[#131722] rounded px-2.5 py-1.5 text-xs font-semibold w-40 h-7 cursor-pointer"
                      >
                        <span className="capitalize">{statsType === 'hidden' ? 'Hidden' : 'Show stats'}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      {activeSelect === 'stats' && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                          <div className="absolute right-0 top-full mt-1 bg-[#1e222d] border border-gray-800 rounded shadow-xl z-50 py-1 w-40">
                            {[
                              { val: 'hidden', label: 'Hidden' },
                              { val: 'show', label: 'Show stats' }
                            ].map(item => (
                              <button
                                key={item.val}
                                onClick={() => { setStatsType(item.val); setActiveSelect(null); }}
                                className={`w-full text-left px-3 py-1.5 hover:bg-gray-800 transition-colors text-xs ${statsType === item.val ? 'text-indigo-500' : 'text-gray-300'}`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stats Position Dropdown (visible only if stats not hidden) */}
                  {statsType !== 'hidden' && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Stats position</span>
                      <div className="relative">
                        <button
                          onClick={() => setActiveSelect(activeSelect === 'statsPos' ? null : 'statsPos')}
                          className="flex items-center justify-between border border-gray-800 hover:border-gray-700 bg-[#131722] rounded px-2.5 py-1.5 text-xs font-semibold w-40 h-7 cursor-pointer"
                        >
                          <span className="capitalize">{statsPosition}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        {activeSelect === 'statsPos' && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                            <div className="absolute right-0 top-full mt-1 bg-[#1e222d] border border-gray-800 rounded shadow-xl z-50 py-1 w-40">
                              {['left', 'right'].map(pos => (
                                <button
                                  key={pos}
                                  onClick={() => { setStatsPosition(pos); setActiveSelect(null); }}
                                  className={`w-full text-left px-3 py-1.5 hover:bg-gray-800 transition-colors text-xs capitalize ${statsPosition === pos ? 'text-indigo-500' : 'text-gray-300'}`}
                                >
                                  {pos}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Always Show Stats Checkbox */}
                  {statsType !== 'hidden' && (
                    <label className="flex items-center gap-2 cursor-pointer group text-gray-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={alwaysShowStats}
                        onChange={(e) => setAlwaysShowStats(e.target.checked)}
                        className="rounded bg-[#131722] border-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                      />
                      <span>Always show stats</span>
                    </label>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TEXT TAB */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              
              {/* Toolbar controls for text */}
              <div className="flex gap-2 items-center">
                
                {/* Text Color Swatch */}
                <div className="relative">
                  <button 
                    onClick={() => setActiveColorPicker(activeColorPicker === 'text' ? null : 'text')}
                    className="w-7 h-7 rounded border border-gray-800 hover:border-gray-700 transition-colors flex items-center justify-center cursor-pointer shadow-md"
                    style={{ backgroundColor: textColor }}
                  />
                  {activeColorPicker === 'text' && (
                    <div className="absolute left-0 top-full mt-2 z-50">
                      <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                      <div className="relative">
                        <ColorPicker color={textColor} onChange={(c) => setTextColor(c)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Font Size Selector */}
                <div className="relative">
                  <button
                    onClick={() => setActiveSelect(activeSelect === 'fontSize' ? null : 'fontSize')}
                    className="flex items-center justify-center border border-gray-800 hover:border-gray-700 bg-[#131722] rounded px-2.5 py-1.5 text-xs font-mono font-bold w-12 h-7 justify-between cursor-pointer"
                  >
                    <span>{fontSize}</span>
                  </button>
                  {activeSelect === 'fontSize' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                      <div className="absolute left-0 top-full mt-1 bg-[#1e222d] border border-gray-800 rounded shadow-xl z-50 py-1 w-16">
                        {[10, 11, 12, 14, 16, 20, 24].map(sz => (
                          <button
                            key={sz}
                            onClick={() => { setFontSize(sz); setActiveSelect(null); }}
                            className={`w-full text-center px-3 py-1.5 hover:bg-gray-800 transition-colors text-xs font-mono font-semibold ${fontSize === sz ? 'text-indigo-500' : 'text-gray-300'}`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Bold Toggle */}
                <button
                  onClick={() => setIsBold(!isBold)}
                  className={`w-7 h-7 flex items-center justify-center rounded border border-gray-800 font-bold hover:bg-gray-800 transition-colors cursor-pointer ${isBold ? 'text-indigo-500 bg-indigo-500/10' : 'text-gray-300'}`}
                >
                  B
                </button>

                {/* Italic Toggle */}
                <button
                  onClick={() => setIsItalic(!isItalic)}
                  className={`w-7 h-7 flex items-center justify-center rounded border border-gray-800 italic hover:bg-gray-800 transition-colors cursor-pointer ${isItalic ? 'text-indigo-500 bg-indigo-500/10' : 'text-gray-300'}`}
                >
                  I
                </button>

              </div>

              {/* Text Input area */}
              <div className="flex flex-col gap-1.5">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Add text..."
                  className="bg-[#131722] border border-gray-800 rounded-lg p-2.5 h-24 outline-none text-gray-200 focus:border-indigo-500/50 resize-none font-sans text-xs w-full"
                />
              </div>

              {/* Text Alignment Row */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Text alignment</span>
                <div className="flex gap-2">
                  
                  {/* Vertical Alignment */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveSelect(activeSelect === 'valign' ? null : 'valign')}
                      className="flex items-center justify-between border border-gray-800 hover:border-gray-700 bg-[#131722] rounded px-2.5 py-1.5 text-xs font-semibold w-24 h-7 capitalize cursor-pointer"
                    >
                      <span>{textValign}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    {activeSelect === 'valign' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-[#1e222d] border border-gray-800 rounded shadow-xl z-50 py-1 w-24">
                          {['top', 'middle', 'bottom'].map(v => (
                            <button
                              key={v}
                              onClick={() => { setTextValign(v); setActiveSelect(null); }}
                              className={`w-full text-left px-3 py-1.5 hover:bg-gray-800 transition-colors text-xs capitalize ${textValign === v ? 'text-indigo-500' : 'text-gray-300'}`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Horizontal Alignment */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveSelect(activeSelect === 'halign' ? null : 'halign')}
                      className="flex items-center justify-between border border-gray-800 hover:border-gray-700 bg-[#131722] rounded px-2.5 py-1.5 text-xs font-semibold w-24 h-7 capitalize cursor-pointer"
                    >
                      <span>{textHalign}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    {activeSelect === 'halign' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-[#1e222d] border border-gray-800 rounded shadow-xl z-50 py-1 w-24">
                          {['left', 'center', 'right'].map(h => (
                            <button
                              key={h}
                              onClick={() => { setTextHalign(h); setActiveSelect(null); }}
                              className={`w-full text-left px-3 py-1.5 hover:bg-gray-800 transition-colors text-xs capitalize ${textHalign === h ? 'text-indigo-500' : 'text-gray-300'}`}
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* COORDINATES TAB */}
          {activeTab === 'coordinates' && (
            <div className="space-y-4">
              
              <div className="flex flex-col gap-3">
                {points.map((pt, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-gray-400">#{i+1} (price, bar)</span>
                    <div className="flex gap-2 items-center">
                      
                      {/* Price input */}
                      <input 
                        type="text" 
                        data-color-input="true"
                        value={pt.price} 
                        onChange={(e) => handlePointChange(i, 'price', e.target.value)}
                        className="bg-[#131722] border border-gray-800 rounded px-2.5 py-1 w-24 outline-none text-right text-xs text-gray-200 focus:border-indigo-500/50 font-mono"
                      />

                      {/* Bar index input */}
                      <input 
                        type="number" 
                        data-color-input="true"
                        value={pt.bar} 
                        onChange={(e) => handlePointChange(i, 'bar', e.target.value)}
                        className="bg-[#131722] border border-gray-800 rounded px-2.5 py-1 w-20 outline-none text-right text-xs text-gray-200 focus:border-indigo-500/50 font-mono"
                      />

                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* VISIBILITY TAB */}
          {activeTab === 'visibility' && (
            <div className="space-y-3.5 pr-1 select-none">
              
              {/* Ticks Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer group text-gray-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={visibility.ticks?.show}
                  onChange={(e) => handleVisibilityChange('ticks', 'show', e.target.checked)}
                  className="rounded bg-[#131722] border-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
                <span>Ticks</span>
              </label>

              {/* Timeframes Rows */}
              {['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'].map(unit => (
                <div key={unit} className="flex items-center justify-between">
                  
                  {/* Left Label + Checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer group text-gray-300 hover:text-white capitalize w-20 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={visibility[unit]?.show}
                      onChange={(e) => handleVisibilityChange(unit, 'show', e.target.checked)}
                      className="rounded bg-[#131722] border-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    <span>{unit}</span>
                  </label>

                  {/* Min / Max Range Controls */}
                  <div className="flex gap-2 items-center flex-1 justify-end">
                    <input 
                      type="number" 
                      disabled={!visibility[unit]?.show}
                      value={visibility[unit]?.min} 
                      onChange={(e) => handleVisibilityChange(unit, 'min', e.target.value)}
                      className="bg-[#131722] disabled:opacity-30 border border-gray-800 rounded px-1.5 py-1 w-12 text-center text-xs text-gray-200 outline-none focus:border-indigo-500/50 font-mono"
                      min={1}
                    />
                    
                    {/* Dummy range slider */}
                    <div className="w-16 h-1 bg-gray-800 rounded relative">
                      <div className="absolute left-1/4 right-1/4 h-full bg-indigo-500 rounded" />
                      <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full border border-indigo-500" />
                      <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full border border-indigo-500" />
                    </div>

                    <input 
                      type="number" 
                      disabled={!visibility[unit]?.show}
                      value={visibility[unit]?.max} 
                      onChange={(e) => handleVisibilityChange(unit, 'max', e.target.value)}
                      className="bg-[#131722] disabled:opacity-30 border border-gray-800 rounded px-1.5 py-1 w-12 text-center text-xs text-gray-200 outline-none focus:border-indigo-500/50 font-mono"
                      min={1}
                    />
                  </div>

                </div>
              ))}

              {/* Ranges Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer group text-gray-300 hover:text-white pt-1">
                <input
                  type="checkbox"
                  checked={visibility.ranges?.show}
                  onChange={(e) => handleVisibilityChange('ranges', 'show', e.target.checked)}
                  className="rounded bg-[#131722] border-gray-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
                <span>Ranges</span>
              </label>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-4 py-3.5 border-t border-gray-800 text-xs">
          
          {/* Templates Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
              className="flex items-center gap-2 bg-[#131722] border border-gray-800 hover:border-gray-700 rounded px-3 py-1.5 font-semibold text-gray-300 hover:text-white cursor-pointer select-none"
            >
              <span>Template</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {isTemplateDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsTemplateDropdownOpen(false)} />
                <div className="absolute left-0 bottom-full mb-1.5 bg-[#1e222d] border border-gray-800 rounded-lg shadow-2xl z-50 py-1 w-44 font-semibold animate-in fade-in slide-in-from-bottom-2 duration-100">
                  <button 
                    onClick={saveTemplate}
                    className="w-full text-left px-4 py-2 hover:bg-gray-800 text-indigo-400 hover:text-indigo-300 text-xs border-b border-gray-800"
                  >
                    Save As...
                  </button>
                  {templates.map(tpl => (
                    <button 
                      key={tpl.id}
                      onClick={() => applyTemplate(tpl.settings)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-800 text-gray-300 text-xs truncate"
                      title={tpl.name}
                    >
                      {tpl.name}
                    </button>
                  ))}
                  <button 
                    onClick={resetToDefault}
                    className="w-full text-left px-4 py-2 hover:bg-gray-800 text-gray-400 hover:text-gray-300 text-xs border-t border-gray-800"
                  >
                    Reset Defaults
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Action buttons (Cancel / Ok) */}
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-1.5 border border-gray-800 hover:bg-gray-800 text-gray-300 rounded-lg font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold cursor-pointer transition-colors"
            >
              Ok
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
