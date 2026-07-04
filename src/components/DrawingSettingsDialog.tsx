import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
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

// Persistent position across open/close actions
let savedDialogPosition: { x: number; y: number } | null = null;

// Reusable Dual Range Slider Component
const DualRangeSlider: React.FC<{
  min: number;
  max: number;
  maxLimit: number;
  disabled: boolean;
  onChange: (min: number, max: number) => void;
}> = ({ min, max, maxLimit, disabled, onChange }) => {
  const minPercent = (min / maxLimit) * 100;
  const maxPercent = (max / maxLimit) * 100;

  return (
    <div className={`relative w-[70px] h-5 flex items-center ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      {/* Slider Track */}
      <div className="w-full h-1 bg-[#121420] border border-[#2a2e45] rounded-full relative">
        {/* Indigo highlighted range */}
        <div 
          className="absolute h-full bg-indigo-500 rounded-full"
          style={{ 
            left: `${minPercent}%`, 
            width: `${maxPercent - minPercent}%` 
          }}
        />
      </div>
      
      {/* Super-imposed range inputs */}
      <input
        type="range"
        min={1}
        max={maxLimit}
        value={min}
        disabled={disabled}
        onChange={(e) => {
          const val = Math.min(parseInt(e.target.value) || 1, max);
          onChange(val, max);
        }}
        className="custom-range-slider z-20"
      />
      <input
        type="range"
        min={1}
        max={maxLimit}
        value={max}
        disabled={disabled}
        onChange={(e) => {
          const val = Math.max(parseInt(e.target.value) || 1, min);
          onChange(min, val);
        }}
        className="custom-range-slider z-20"
      />
    </div>
  );
};

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
  
  // Draggable window state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialX: number; initialY: number; lastX?: number; lastY?: number }>({ x: 0, y: 0, initialX: 0, initialY: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

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

  // Initial Position + Load Settings
  useEffect(() => {
    if (!isOpen || !overlay) return;

    if (savedDialogPosition) {
      setPosition(savedDialogPosition);
    } else {
      const x = Math.max(50, window.innerWidth / 2 - 210); // width is 420px
      const y = Math.max(50, window.innerHeight / 2 - 200);
      setPosition({ x, y });
    }

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

  // Dragging event handlers - Direct DOM style mutation for 60fps drag performance
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: position.x,
      initialY: position.y,
      lastX: position.x,
      lastY: position.y
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      
      const newX = Math.max(10, Math.min(window.innerWidth - 430, dragStartRef.current.initialX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 300, dragStartRef.current.initialY + dy));
      
      if (containerRef.current) {
        containerRef.current.style.left = `${newX}px`;
        containerRef.current.style.top = `${newY}px`;
      }
      
      dragStartRef.current.lastX = newX;
      dragStartRef.current.lastY = newY;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (dragStartRef.current.lastX !== undefined && dragStartRef.current.lastY !== undefined) {
        const finalPos = { x: dragStartRef.current.lastX, y: dragStartRef.current.lastY };
        setPosition(finalPos);
        savedDialogPosition = finalPos;
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position]);

  if (!isOpen || !overlay) return null;

  const handleSave = () => {
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

    const updatedPoints = points.map(pt => {
      let finalTimestamp = pt.timestamp;
      if (allCandles.length > 0) {
        const candle = allCandles[pt.bar];
        if (candle) {
          finalTimestamp = candle.timestamp;
        } else {
          const lastCandle = allCandles[allCandles.length - 1];
          if (lastCandle) {
            const indexDiff = pt.bar - (allCandles.length - 1);
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

  const PremiumCheckbox = ({ checked, onChange, label }: { checked: boolean; onChange: (val: boolean) => void; label: string }) => (
    <label className="flex items-center gap-3 cursor-pointer group text-gray-300 hover:text-white select-none py-1.5 w-full">
      <div 
        onClick={() => onChange(!checked)}
        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
          checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-[#2a2e45] bg-[#121420] group-hover:border-[#3d4264]'
        }`}
      >
        {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </div>
      <span className="text-[12.5px] font-medium tracking-wide">{label}</span>
    </label>
  );

  return (
    <div 
      ref={containerRef}
      className="fixed bg-[#1c2030] border border-[#2a2e45] rounded-xl shadow-2xl w-[420px] flex flex-col z-50 text-gray-200 select-none overflow-visible animate-in fade-in zoom-in-95 duration-150"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.6), 0 10px 15px -5px rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* Super-imposed Range Sliders Styling */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-range-slider {
          -webkit-appearance: none;
          width: 100%;
          background: transparent;
          position: absolute;
          left: 0;
          pointer-events: none;
          outline: none;
          height: 6px;
        }
        .custom-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          pointer-events: auto;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #6366f1;
          cursor: pointer;
          transition: transform 0.1s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }
        .custom-range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .custom-range-slider::-webkit-slider-thumb:active {
          transform: scale(1.3);
          background: #6366f1;
        }
      `}} />

      {/* Draggable Header */}
      <div 
        ref={headerRef}
        onMouseDown={handleMouseDown}
        className="flex justify-between items-center px-5 py-4 border-b border-[#242838] cursor-move active:cursor-grabbing hover:bg-gray-800/10 transition-colors rounded-t-xl"
      >
        <span className="font-semibold text-[13.5px] tracking-wide text-gray-100 capitalize">
          {overlay.name === 'trendLine' ? 'Trendline' : overlay.name} Settings
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex px-5 border-b border-[#242838] text-[12px] font-semibold gap-5 overflow-x-auto select-none bg-[#171a26]">
        {(['style', 'text', 'coordinates', 'visibility'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setActiveColorPicker(null); setActiveSelect(null); }}
            className={`py-3.5 border-b-2 capitalize transition-colors relative cursor-pointer ${
              activeTab === tab 
                ? 'border-indigo-500 text-white font-bold' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area - dynamic height adjust */}
      <div className="p-5 text-[12.5px] space-y-4 overflow-visible">
        
        {/* STYLE TAB */}
        {activeTab === 'style' && (
          <div className="space-y-4">
            
            {/* Line Color/Width/Style Row */}
            <div className="flex items-center justify-between min-h-[36px]">
              <span className="text-gray-400 font-medium">Line</span>
              <div className="flex gap-2 items-center relative">
                
                {/* Color Swatch */}
                <div className="relative">
                  <button 
                    onClick={() => { setActiveColorPicker(activeColorPicker === 'line' ? null : 'line'); setActiveSelect(null); }}
                    className="w-8 h-8 rounded-lg border border-[#2a2e45] hover:border-[#3a3f5e] transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
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

                {/* Thickness Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setActiveSelect(activeSelect === 'lineWidth' ? null : 'lineWidth'); setActiveColorPicker(null); }}
                    className="flex items-center justify-center border border-[#2a2e45] hover:border-[#3a3f5e] bg-[#121420] hover:bg-[#151724] rounded-lg px-2.5 py-1.5 text-[12px] font-mono font-bold w-14 h-8 justify-between cursor-pointer transition-all active:scale-95"
                  >
                    <span>{lineWidth}px</span>
                  </button>
                  {activeSelect === 'lineWidth' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                      <div className="absolute right-0 top-full mt-1 bg-[#1c2030] border border-[#2a2e45] rounded-lg shadow-2xl z-50 py-1 w-16 overflow-hidden">
                        {[1, 2, 3, 4].map(w => (
                          <button
                            key={w}
                            onClick={() => { setLineWidth(w); setActiveSelect(null); }}
                            className={`w-full text-center px-3 py-2 hover:bg-gray-800 transition-colors text-[12px] font-mono font-semibold ${lineWidth === w ? 'text-indigo-500 bg-indigo-500/5' : 'text-gray-300'}`}
                          >
                            {w}px
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Line Style Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setActiveSelect(activeSelect === 'lineStyle' ? null : 'lineStyle'); setActiveColorPicker(null); }}
                    className="flex items-center justify-center border border-[#2a2e45] hover:border-[#3a3f5e] bg-[#121420] hover:bg-[#151724] rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 justify-between capitalize cursor-pointer transition-all active:scale-95"
                  >
                    <span>{lineStyle}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  {activeSelect === 'lineStyle' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                      <div className="absolute right-0 top-full mt-1 bg-[#1c2030] border border-[#2a2e45] rounded-lg shadow-2xl z-50 py-1 w-24 overflow-hidden">
                        {['solid', 'dashed', 'dotted'].map(s => (
                          <button
                            key={s}
                            onClick={() => { setLineStyle(s); setActiveSelect(null); }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors text-[12px] capitalize ${lineStyle === s ? 'text-indigo-500 bg-indigo-500/5' : 'text-gray-300'}`}
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
            <div className="flex items-center justify-between min-h-[36px]">
              <span className="text-gray-400 font-medium">Extend</span>
              <div className="relative">
                <button
                  onClick={() => { setActiveSelect(activeSelect === 'extend' ? null : 'extend'); setActiveColorPicker(null); }}
                  className="flex items-center justify-between border border-[#2a2e45] hover:border-[#3a3f5e] bg-[#121420] hover:bg-[#151724] rounded-lg px-3 py-1.5 text-[12px] font-semibold w-48 h-8 cursor-pointer transition-all active:scale-95"
                >
                  <span className="capitalize">{extendType === 'none' ? "Don't extend" : `Extend ${extendType}`}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {activeSelect === 'extend' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                    <div className="absolute right-0 top-full mt-1 bg-[#1c2030] border border-[#2a2e45] rounded-lg shadow-2xl z-50 py-1 w-48 overflow-hidden">
                      {[
                        { val: 'none', label: "Don't extend" },
                        { val: 'left', label: 'Extend left' },
                        { val: 'right', label: 'Extend right' },
                        { val: 'both', label: 'Extend both' }
                      ].map(item => (
                        <button
                          key={item.val}
                          onClick={() => { setExtendType(item.val); setActiveSelect(null); }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors text-[12px] ${extendType === item.val ? 'text-indigo-500 bg-indigo-500/5' : 'text-gray-300'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Checkboxes Group */}
            <div className="flex flex-col gap-2.5 pt-1">
              <PremiumCheckbox 
                checked={showMiddlePoint} 
                onChange={setShowMiddlePoint} 
                label="Middle point" 
              />
              <PremiumCheckbox 
                checked={showPriceLabels} 
                onChange={setShowPriceLabels} 
                label="Price labels" 
              />
            </div>

            {/* Info Section Header */}
            <div className="pt-3 border-t border-[#242838] space-y-3.5">
              <span className="text-[10.5px] font-bold text-gray-500 uppercase tracking-widest block">Info</span>
              
              {/* Stats Row */}
              <div className="flex items-center justify-between min-h-[36px]">
                <span className="text-gray-400 font-medium">Stats</span>
                <div className="relative">
                  <button
                    onClick={() => { setActiveSelect(activeSelect === 'stats' ? null : 'stats'); setActiveColorPicker(null); }}
                    className="flex items-center justify-between border border-[#2a2e45] hover:border-[#3a3f5e] bg-[#121420] hover:bg-[#151724] rounded-lg px-3 py-1.5 text-[12px] font-semibold w-48 h-8 cursor-pointer transition-all active:scale-95"
                  >
                    <span className="capitalize">{statsType === 'hidden' ? 'Hidden' : 'Show stats'}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {activeSelect === 'stats' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                      <div className="absolute right-0 top-full mt-1 bg-[#1c2030] border border-[#2a2e45] rounded-lg shadow-2xl z-50 py-1 w-48 overflow-hidden">
                        {[
                          { val: 'hidden', label: 'Hidden' },
                          { val: 'show', label: 'Show stats' }
                        ].map(item => (
                          <button
                            key={item.val}
                            onClick={() => { setStatsType(item.val); setActiveSelect(null); }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors text-[12px] ${statsType === item.val ? 'text-indigo-500 bg-indigo-500/5' : 'text-gray-300'}`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Stats Position Row */}
              {statsType !== 'hidden' && (
                <div className="flex items-center justify-between min-h-[36px] animate-in fade-in slide-in-from-top-1 duration-150">
                  <span className="text-gray-400 font-medium">Stats position</span>
                  <div className="relative">
                    <button
                      onClick={() => { setActiveSelect(activeSelect === 'statsPos' ? null : 'statsPos'); setActiveColorPicker(null); }}
                      className="flex items-center justify-between border border-[#2a2e45] hover:border-[#3a3f5e] bg-[#121420] hover:bg-[#151724] rounded-lg px-3 py-1.5 text-[12px] font-semibold w-48 h-8 cursor-pointer transition-all active:scale-95"
                    >
                      <span className="capitalize">{statsPosition}</span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                    {activeSelect === 'statsPos' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-[#1c2030] border border-[#2a2e45] rounded-lg shadow-2xl z-50 py-1 w-48 overflow-hidden">
                          {['left', 'right'].map(pos => (
                            <button
                              key={pos}
                              onClick={() => { setStatsPosition(pos); setActiveSelect(null); }}
                              className={`w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors text-[12px] capitalize ${statsPosition === pos ? 'text-indigo-500 bg-indigo-500/5' : 'text-gray-300'}`}
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
                <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                  <PremiumCheckbox 
                    checked={alwaysShowStats} 
                    onChange={setAlwaysShowStats} 
                    label="Always show stats" 
                  />
                </div>
              )}
            </div>

          </div>
        )}

        {/* TEXT TAB */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            
            {/* Toolbar controls for text */}
            <div className="flex gap-2 items-center min-h-[36px]">
              
              {/* Text Color Swatch */}
              <div className="relative">
                <button 
                  onClick={() => { setActiveColorPicker(activeColorPicker === 'text' ? null : 'text'); setActiveSelect(null); }}
                  className="w-8 h-8 rounded-lg border border-[#2a2e45] hover:border-[#3a3f5e] transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
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
                  onClick={() => { setActiveSelect(activeSelect === 'fontSize' ? null : 'fontSize'); setActiveColorPicker(null); }}
                  className="flex items-center justify-center border border-[#2a2e45] hover:border-[#3a3f5e] bg-[#121420] hover:bg-[#151724] rounded-lg px-2.5 py-1.5 text-[12px] font-mono font-bold w-14 h-8 justify-between cursor-pointer transition-all active:scale-95"
                >
                  <span>{fontSize}</span>
                </button>
                {activeSelect === 'fontSize' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                    <div className="absolute left-0 top-full mt-1 bg-[#1c2030] border border-[#2a2e45] rounded-lg shadow-2xl z-50 py-1 w-16 overflow-hidden">
                      {[10, 11, 12, 14, 16, 20, 24].map(sz => (
                        <button
                          key={sz}
                          onClick={() => { setFontSize(sz); setActiveSelect(null); }}
                          className={`w-full text-center px-3 py-2 hover:bg-gray-800 transition-colors text-[12px] font-mono font-semibold ${fontSize === sz ? 'text-indigo-500 bg-indigo-500/5' : 'text-gray-300'}`}
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
                className={`w-8 h-8 flex items-center justify-center rounded-lg border border-[#2a2e45] font-bold hover:bg-gray-800 transition-colors cursor-pointer select-none ${isBold ? 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30' : 'text-gray-300'}`}
              >
                B
              </button>

              {/* Italic Toggle */}
              <button
                onClick={() => setIsItalic(!isItalic)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border border-[#2a2e45] italic hover:bg-gray-800 transition-colors cursor-pointer select-none ${isItalic ? 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30' : 'text-gray-300'}`}
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
                className="bg-[#121420] border border-[#2a2e45] hover:border-[#323652] rounded-lg p-3 h-24 outline-none text-gray-200 focus:border-indigo-500/50 resize-none font-sans text-[12.5px] w-full transition-colors"
              />
            </div>

            {/* Text Alignment Row */}
            <div className="flex items-center justify-between min-h-[36px]">
              <span className="text-gray-400 font-medium">Text alignment</span>
              <div className="flex gap-2">
                
                {/* Vertical Alignment */}
                <div className="relative">
                  <button
                    onClick={() => { setActiveSelect(activeSelect === 'valign' ? null : 'valign'); setActiveColorPicker(null); }}
                    className="flex items-center justify-between border border-[#2a2e45] hover:border-[#3a3f5e] bg-[#121420] hover:bg-[#151724] rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 capitalize cursor-pointer transition-all active:scale-95"
                  >
                    <span>{textValign}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  {activeSelect === 'valign' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                      <div className="absolute right-0 top-full mt-1 bg-[#1c2030] border border-[#2a2e45] rounded-lg shadow-2xl z-50 py-1 w-24 overflow-hidden">
                        {['top', 'middle', 'bottom'].map(v => (
                          <button
                            key={v}
                            onClick={() => { setTextValign(v); setActiveSelect(null); }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors text-[12px] capitalize ${textValign === v ? 'text-indigo-500 bg-indigo-500/5' : 'text-gray-300'}`}
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
                    onClick={() => { setActiveSelect(activeSelect === 'halign' ? null : 'halign'); setActiveColorPicker(null); }}
                    className="flex items-center justify-between border border-[#2a2e45] hover:border-[#3a3f5e] bg-[#121420] hover:bg-[#151724] rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 capitalize cursor-pointer transition-all active:scale-95"
                  >
                    <span>{textHalign}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  {activeSelect === 'halign' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                      <div className="absolute right-0 top-full mt-1 bg-[#1c2030] border border-[#2a2e45] rounded-lg shadow-2xl z-50 py-1 w-24 overflow-hidden">
                        {['left', 'center', 'right'].map(h => (
                          <button
                            key={h}
                            onClick={() => { setTextHalign(h); setActiveSelect(null); }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors text-[12px] capitalize ${textHalign === h ? 'text-indigo-500 bg-indigo-500/5' : 'text-gray-300'}`}
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
            
            <div className="flex flex-col gap-3.5">
              {points.map((pt, i) => (
                <div key={i} className="flex items-center justify-between min-h-[36px]">
                  <span className="text-gray-400 font-medium">#{i+1} (price, bar)</span>
                  <div className="flex gap-2.5 items-center">
                    
                    {/* Price input */}
                    <input 
                      type="text" 
                      data-color-input="true"
                      value={pt.price} 
                      onChange={(e) => handlePointChange(i, 'price', e.target.value)}
                      className="bg-[#121420] border border-[#2a2e45] hover:border-[#3a3f5e] rounded-lg px-3 py-1.5 w-28 outline-none text-right text-[12px] text-gray-200 focus:border-indigo-500/50 font-mono transition-colors"
                    />

                    {/* Bar index input */}
                    <input 
                      type="number" 
                      data-color-input="true"
                      value={pt.bar} 
                      onChange={(e) => handlePointChange(i, 'bar', e.target.value)}
                      className="bg-[#121420] border border-[#2a2e45] hover:border-[#3a3f5e] rounded-lg px-3 py-1.5 w-24 outline-none text-right text-[12px] text-gray-200 focus:border-indigo-500/50 font-mono transition-colors"
                    />

                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* VISIBILITY TAB */}
        {activeTab === 'visibility' && (
          <div className="space-y-4 select-none pr-1">
            
            {/* Ticks Checkbox */}
            <PremiumCheckbox 
              checked={!!visibility.ticks?.show}
              onChange={(val) => handleVisibilityChange('ticks', 'show', val)}
              label="Ticks" 
            />

            {/* Timeframes Rows */}
            {['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'].map(unit => {
              const maxLimit = 
                unit === 'seconds' || unit === 'minutes' ? 59 :
                unit === 'hours' ? 24 :
                unit === 'days' ? 365 :
                unit === 'weeks' ? 52 :
                12; // months

              return (
                <div key={unit} className="flex items-center justify-between min-h-[36px]">
                  
                  {/* Left Label + Checkbox */}
                  <div className="w-24">
                    <PremiumCheckbox 
                      checked={!!visibility[unit]?.show}
                      onChange={(val) => handleVisibilityChange(unit, 'show', val)}
                      label={unit} 
                    />
                  </div>

                  {/* Min / Max Range Controls */}
                  <div className="flex gap-2.5 items-center flex-1 justify-end">
                    <input 
                      type="number" 
                      disabled={!visibility[unit]?.show}
                      value={visibility[unit]?.min} 
                      onChange={(e) => {
                        const val = Math.min(parseInt(e.target.value) || 1, visibility[unit]?.max || 1);
                        handleVisibilityChange(unit, 'min', val);
                      }}
                      className="bg-[#121420] disabled:opacity-20 border border-[#2a2e45] rounded-lg px-1.5 py-1 w-14 text-center text-[12px] text-gray-200 outline-none focus:border-indigo-500/50 font-mono transition-colors"
                      min={1}
                      max={visibility[unit]?.max}
                    />
                    
                    {/* Functional Dual Range Slider */}
                    <DualRangeSlider
                      min={visibility[unit]?.min || 1}
                      max={visibility[unit]?.max || 1}
                      maxLimit={maxLimit}
                      disabled={!visibility[unit]?.show}
                      onChange={(newMin, newMax) => {
                        handleVisibilityChange(unit, 'min', newMin);
                        handleVisibilityChange(unit, 'max', newMax);
                      }}
                    />

                    <input 
                      type="number" 
                      disabled={!visibility[unit]?.show}
                      value={visibility[unit]?.max} 
                      onChange={(e) => {
                        const val = Math.max(parseInt(e.target.value) || 1, visibility[unit]?.min || 1);
                        handleVisibilityChange(unit, 'max', val);
                      }}
                      className="bg-[#121420] disabled:opacity-20 border border-[#2a2e45] rounded-lg px-1.5 py-1 w-14 text-center text-[12px] text-gray-200 outline-none focus:border-indigo-500/50 font-mono transition-colors"
                      min={visibility[unit]?.min || 1}
                      max={maxLimit}
                    />
                  </div>

                </div>
              );
            })}

            {/* Ranges Checkbox */}
            <PremiumCheckbox 
              checked={!!visibility.ranges?.show}
              onChange={(val) => handleVisibilityChange('ranges', 'show', val)}
              label="Ranges" 
            />

          </div>
        )}

      </div>

      {/* Footer */}
      <div className="flex justify-between items-center px-5 py-4 border-t border-[#242838] text-[12px] bg-[#171a26] rounded-b-xl">
        
        {/* Templates Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
            className="flex items-center gap-2 bg-[#121420] border border-[#2a2e45] hover:border-[#3a3f5e] rounded-lg px-3 py-1.5 font-semibold text-gray-300 hover:text-white cursor-pointer select-none transition-all active:scale-95"
          >
            <span>Template</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {isTemplateDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsTemplateDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-2 bg-[#1c2030] border border-[#2a2e45] rounded-lg shadow-2xl z-50 py-1 w-44 font-semibold animate-in fade-in slide-in-from-top-2 duration-100 overflow-hidden">
                <button 
                  onClick={saveTemplate}
                  className="w-full text-left px-4 py-2 hover:bg-gray-800 text-indigo-400 hover:text-indigo-300 text-[12px] border-b border-[#242838]"
                >
                  Save As...
                </button>
                {templates.map(tpl => (
                  <button 
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl.settings)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-800 text-gray-300 text-[12px] truncate"
                    title={tpl.name}
                  >
                    {tpl.name}
                  </button>
                ))}
                <button 
                  onClick={resetToDefault}
                  className="w-full text-left px-4 py-2 hover:bg-gray-800 text-gray-400 hover:text-gray-300 text-[12px] border-t border-[#242838]"
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
            className="px-4 py-1.5 border border-[#2a2e45] hover:bg-gray-800 text-gray-300 rounded-lg font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold cursor-pointer transition-colors shadow-lg shadow-indigo-600/20"
          >
            Ok
          </button>
        </div>

      </div>

    </div>
  );
};
