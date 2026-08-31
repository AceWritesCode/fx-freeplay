import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Check, Minus, Plus } from 'lucide-react';
import { ColorPicker } from './ColorPicker';

interface DrawingSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  overlay: any;
  onSave: (settings: any, points?: any[]) => void;
  timeframe?: string;
  allCandles?: any[]; // To map bar index <-> timestamp
  pricePrecision?: number; // Active symbol precision
  onDeselectOverlay?: () => void;
}

type TabType = 'style' | 'inputs' | 'text' | 'coordinates' | 'visibility';

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
      <div className="w-full h-1 bg-border-sub border border-border-def rounded-full relative">
        {/* Indigo highlighted range */}
        <div 
          className="absolute h-full bg-accent rounded-full"
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

export const SearchableDropdown: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: string[];
  onDeleteOption: (opt: string) => void;
  placeholder?: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}> = ({ value, onChange, options, onDeleteOption, placeholder, isOpen, setIsOpen }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const filtered = options.filter(opt => 
    opt.toLowerCase().includes(value.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        className="w-full bg-app-bg border border-border-def hover:border-border-focus focus:border-border-focus rounded-lg px-3 py-1.5 text-xs text-txt-primary outline-none transition-colors pr-8 h-8"
      />
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-txt-muted hover:text-txt-primary p-1"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-lg shadow-2xl z-[60] max-h-40 overflow-y-auto py-1">
          {filtered.map(opt => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className="group flex justify-between items-center px-3 py-1.5 hover:bg-surface-hover text-txt-secondary hover:text-txt-primary text-xs cursor-pointer"
            >
              <span className="truncate">{opt}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteOption(opt);
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-red-500/25 p-1 rounded transition-all text-red-400 hover:text-red-300"
                title="Delete option"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const DrawingSettingsDialog: React.FC<DrawingSettingsDialogProps> = ({
  isOpen,
  onClose,
  overlay,
  onSave,
  timeframe = '1m',
  allCandles = [],
  pricePrecision,
  onDeselectOverlay
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('style');
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  // Advanced template feature states
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [activeTemplateMode, setActiveTemplateMode] = useState<'light' | 'dark'>('light');
  const [saveName, setSaveName] = useState('');
  const [saveGroup, setSaveGroup] = useState('Default');
  const [saveMode, setSaveMode] = useState<'light' | 'dark'>('light');
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('Default');
  const [isSelectGroupDropdownOpen, setIsSelectGroupDropdownOpen] = useState(false);
  
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
  const [fillColor, setFillColor] = useState('rgba(33, 150, 243, 0.1)');
  const [fillBackground, setFillBackground] = useState(true);
  const [profitColor, setProfitColor] = useState('rgba(76, 175, 80, 0.12)');
  const [lossColor, setLossColor] = useState('rgba(244, 67, 54, 0.12)');
  const [alwaysShowStats, setAlwaysShowStats] = useState(true);
  const [showLines, setShowLines] = useState(false);
  const [showActivationLine, setShowActivationLine] = useState(true);
  const [activationLineColor, setActivationLineColor] = useState('#808285');
  const [activationLineWidth, setActivationLineWidth] = useState(1);
  const [activationLineStyle, setActivationLineStyle] = useState('dashed');
  const [showActivationHighlight, setShowActivationHighlight] = useState(true);
  const [activationHighlightOpacity, setActivationHighlightOpacity] = useState(0.28);
  const [showMarkers, setShowMarkers] = useState(true);
  const [initialSizePercent, setInitialSizePercent] = useState(18);

  // Text Tab States
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#2196F3');
  const [fontSize, setFontSize] = useState(14);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [showBorder, setShowBorder] = useState(true);
  const [isAnchored, setIsAnchored] = useState(false);
  const [textValign, setTextValign] = useState('middle');
  const [textHalign, setTextHalign] = useState('right');
  const [textPlacement, setTextPlacement] = useState<'inside' | 'outside'>('inside');

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
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  
  // Custom dropdowns for style selectors
  const [activeSelect, setActiveSelect] = useState<'lineWidth' | 'lineStyle' | 'extend' | 'fontSize' | 'valign' | 'halign' | 'actLineWidth' | 'actLineStyle' | 'textPlacement' | null>(null);

  const prec = pricePrecision !== undefined ? pricePrecision : 4;

  // Real-time Backup References
  const backupSettingsRef = useRef<any>(null);
  const backupPointsRef = useRef<any[]>(null);
  const isFirstLoadRef = useRef(true);

  // Initial Position + Load Settings
  useEffect(() => {
    if (!isOpen || !overlay) return;

    isFirstLoadRef.current = true;

    if (savedDialogPosition) {
      setPosition(savedDialogPosition);
    } else {
      const x = Math.max(50, window.innerWidth / 2 - 210); // width is 420px
      const y = Math.max(50, window.innerHeight / 2 - 200);
      setPosition({ x, y });
    }

    const customSettings = overlay.extendData?.customSettings || {};
    
    // Save backups for Cancel restoration
    backupSettingsRef.current = JSON.parse(JSON.stringify(customSettings));
    if (overlay.points) {
      backupPointsRef.current = JSON.parse(JSON.stringify(overlay.points));
    }

    // Style settings
    setLineColor(customSettings.lineColor || '#2196F3');
    setLineWidth(customSettings.lineWidth || 1);
    setLineStyle(customSettings.lineStyle || 'solid');
    setExtendType(customSettings.extendType || 'none');
    setFillColor(customSettings.fillColor || 'rgba(33, 150, 243, 0.1)');
    setFillBackground(customSettings.fillBackground !== false);
    setProfitColor(customSettings.profitColor || 'rgba(76, 175, 80, 0.12)');
    setLossColor(customSettings.lossColor || 'rgba(244, 67, 54, 0.12)');
    setShowLines(customSettings.showLines === true);
    setShowActivationLine(customSettings.showActivationLine !== false);
    setActivationLineColor(customSettings.activationLineColor || '#808285');
    setActivationLineWidth(customSettings.activationLineWidth || 1);
    setActivationLineStyle(customSettings.activationLineStyle || 'dashed');
    setShowActivationHighlight(customSettings.showActivationHighlight !== false);
    setActivationHighlightOpacity(typeof customSettings.activationHighlightOpacity === 'number' ? customSettings.activationHighlightOpacity : 0.28);
    setShowMarkers(customSettings.showMarkers !== false);
    setInitialSizePercent(typeof customSettings.initialSizePercent === 'number' ? customSettings.initialSizePercent : 18);

    // Text settings
    setText(customSettings.text || '');
    setTextColor(customSettings.textColor || (overlay.name === 'longPosition' || overlay.name === 'shortPosition' ? '#ffffff' : '#2196F3'));
    setFontSize(customSettings.fontSize || 14);
    setIsBold(!!customSettings.bold);
    setIsItalic(!!customSettings.italic);
    setShowBorder(customSettings.showBorder !== false);
    setIsAnchored(!!customSettings.isAnchored);
    setTextValign(customSettings.textPosition?.vertical || 'middle');
    setTextHalign(customSettings.textPosition?.horizontal || 'right');
    setTextPlacement(customSettings.textPlacement || 'inside');

    // Visibility settings
    if (customSettings.visibility) {
      setVisibility(customSettings.visibility);
    }

    // Points coordinates (Opposite mapping: 0 = latest candle, increasing towards first candle, negative in future)
    if (overlay.points) {
      const mappedPoints = overlay.points.map((pt: any) => {
        let barIndex = 0; // Default index relative to latest candle
        if (allCandles.length > 0) {
          const idx = allCandles.findIndex(c => c.timestamp === pt.timestamp);
          if (idx !== -1) {
            // Map idx array index to User Coordinate: C = (L - 1) - idx
            barIndex = (allCandles.length - 1) - idx;
          } else {
            // Approximate relative to last candle if timestamp is not exact
            const lastCandle = allCandles[allCandles.length - 1];
            if (lastCandle) {
              const timeDiff = pt.timestamp - lastCandle.timestamp;
              let timeframeMinutes = 1;
              const tf = timeframe.toLowerCase();
              if (tf.endsWith('m')) timeframeMinutes = parseInt(tf);
              else if (tf.endsWith('h')) timeframeMinutes = parseInt(tf) * 60;
              else if (tf.endsWith('d')) timeframeMinutes = parseInt(tf) * 1440;
              
              const indexDiff = Math.round(timeDiff / (timeframeMinutes * 60 * 1000));
              barIndex = -indexDiff;
            }
          }
        }
        return {
          price: parseFloat(pt.value).toFixed(prec),
          bar: barIndex,
          timestamp: pt.timestamp
        };
      });
      setPoints(mappedPoints);
    }

    // Load templates
    try {
      const saved = localStorage.getItem(`fx_templates_${overlay.name || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const upgraded = parsed
            .filter((t: any) => t !== null && typeof t === 'object')
            .map((t: any) => ({
              id: t.id || Date.now().toString() + Math.random().toString(),
              name: t.name || 'Unnamed',
              group: t.group || 'Default',
              mode: t.mode || 'light',
              settings: t.settings
            }));
          setTemplates(upgraded);
        } else {
          setTemplates([]);
        }
      } else {
        setTemplates([]);
      }
    } catch (e) {
      console.error('[DEBUG] Failed to load templates:', e);
      setTemplates([]);
    }

    setActiveTab('style');
    setActiveColorPicker(null);
    setActiveSelect(null);
    setIsTemplateDropdownOpen(false);
  }, [isOpen, overlay, allCandles, prec]);

  // Dragging event handlers - Direct DOM style mutation for 65fps drag performance
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

  // Real-Time Sync hook
  useEffect(() => {
    if (!isOpen || !overlay) return;

    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      return;
    }

    const updatedSettings = {
      lineColor,
      lineWidth,
      lineStyle,
      extendType,
      fillColor,
      fillBackground,
      profitColor,
      lossColor,
      text,
      textColor,
      fontSize,
      bold: isBold,
      italic: isItalic,
      showBorder,
      isAnchored,
      textPosition: {
        vertical: textValign,
        horizontal: textHalign
      },
      textPlacement,
      visibility,
      alwaysShowStats,
      showLines,
      showActivationLine,
      activationLineColor,
      activationLineWidth,
      activationLineStyle,
      showActivationHighlight,
      activationHighlightOpacity,
      showMarkers,
      initialSizePercent
    };

    const updatedPoints = points.map(pt => {
      let finalTimestamp = pt.timestamp;
      let resolvedDataIndex: number | undefined = undefined;

      if (allCandles.length > 0) {
        if (pt.bar !== undefined) {
          // Map from User Coordinate C to array index idx: idx = (L - 1) - C
          const idx = (allCandles.length - 1) - pt.bar;
          if (idx >= 0 && idx < allCandles.length) {
            const candle = allCandles[idx];
            if (candle) {
              finalTimestamp = candle.timestamp;
              resolvedDataIndex = idx;
            }
          } else if (idx >= allCandles.length) {
            const lastCandle = allCandles[allCandles.length - 1];
            if (lastCandle) {
              // pt.bar is negative in future. Diff index = -pt.bar
              const indexDiff = -pt.bar;
              let timeframeMinutes = 1;
              const tf = timeframe.toLowerCase();
              if (tf.endsWith('m')) timeframeMinutes = parseInt(tf);
              else if (tf.endsWith('h')) timeframeMinutes = parseInt(tf) * 60;
              else if (tf.endsWith('d')) timeframeMinutes = parseInt(tf) * 1440;
              
              finalTimestamp = lastCandle.timestamp + indexDiff * timeframeMinutes * 60 * 1000;
              resolvedDataIndex = idx;
            }
          } else {
            const firstCandle = allCandles[0];
            if (firstCandle) {
              const indexDiff = -idx;
              let timeframeMinutes = 1;
              const tf = timeframe.toLowerCase();
              if (tf.endsWith('m')) timeframeMinutes = parseInt(tf);
              else if (tf.endsWith('h')) timeframeMinutes = parseInt(tf) * 60;
              else if (tf.endsWith('d')) timeframeMinutes = parseInt(tf) * 1440;
              
              finalTimestamp = firstCandle.timestamp - indexDiff * timeframeMinutes * 60 * 1000;
              resolvedDataIndex = idx;
            }
          }
        } else {
          const idx = allCandles.findIndex(c => c.timestamp === pt.timestamp);
          if (idx !== -1) {
            resolvedDataIndex = idx;
          }
        }
      }

      return {
        timestamp: finalTimestamp,
        value: parseFloat(pt.price),
        ...(resolvedDataIndex !== undefined ? { dataIndex: resolvedDataIndex } : {})
      };
    });

    onSave(updatedSettings, updatedPoints);
  }, [lineColor, lineWidth, lineStyle, extendType, fillColor, fillBackground, profitColor, lossColor, text, textColor, fontSize, isBold, isItalic, textValign, textHalign, textPlacement, points, visibility, alwaysShowStats, showLines, showActivationLine, activationLineColor, activationLineWidth, activationLineStyle, showActivationHighlight, activationHighlightOpacity, showMarkers, initialSizePercent]);

  // Helper to ensure selectedGroup updates if mode changes or templates are deleted
  useEffect(() => {
    const activeTpls = (templates || []).filter(t => t && t.mode === activeTemplateMode);
    const groups = Array.from(new Set(activeTpls.map(t => t && (t.group || 'Default'))));
    if (groups.length > 0) {
      if (!groups.includes(selectedGroup)) {
        setSelectedGroup(groups[0]);
      }
    } else {
      setSelectedGroup('Default');
    }
  }, [activeTemplateMode, templates]);

  if (!isOpen || !overlay) return null;

  const handleCancel = () => {
    if (backupSettingsRef.current && backupPointsRef.current) {
      onSave(backupSettingsRef.current, backupPointsRef.current);
    }
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

  const getRRPointsIndices = (len: number) => {
    if (len >= 6) {
      return {
        entryIndices: [4, 5],
        profitIndices: [0, 1],
        stopIndices: [2, 3]
      };
    }
    return {
      entryIndices: [0],
      profitIndices: [1],
      stopIndices: [2]
    };
  };

  const handleEntryPriceChange = (val: string) => {
    setPoints(prev => {
      if (prev.length < 3) return prev;
      const updated = [...prev];
      const { entryIndices } = getRRPointsIndices(prev.length);
      entryIndices.forEach(idx => {
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], price: val };
        }
      });
      return updated;
    });
  };

  const handleProfitPriceChange = (val: string) => {
    setPoints(prev => {
      if (prev.length < 3) return prev;
      const updated = [...prev];
      const { profitIndices } = getRRPointsIndices(prev.length);
      profitIndices.forEach(idx => {
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], price: val };
        }
      });
      return updated;
    });
  };

  const handleProfitTicksChange = (ticks: number) => {
    setPoints(prev => {
      if (prev.length < 3) return prev;
      const updated = [...prev];
      const { entryIndices, profitIndices } = getRRPointsIndices(prev.length);
      const entryPrice = parseFloat(updated[entryIndices[0]].price) || 0;
      const tickSize = 1 / Math.pow(10, prec);
      const isLong = overlay.name === 'longPosition';
      const newPrice = isLong ? entryPrice + (ticks * tickSize) : entryPrice - (ticks * tickSize);
      const valStr = newPrice.toFixed(prec);
      profitIndices.forEach(idx => {
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], price: valStr };
        }
      });
      return updated;
    });
  };

  const handleStopPriceChange = (val: string) => {
    setPoints(prev => {
      if (prev.length < 3) return prev;
      const updated = [...prev];
      const { stopIndices } = getRRPointsIndices(prev.length);
      stopIndices.forEach(idx => {
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], price: val };
        }
      });
      return updated;
    });
  };

  const handleStopTicksChange = (ticks: number) => {
    setPoints(prev => {
      if (prev.length < 3) return prev;
      const updated = [...prev];
      const { entryIndices, stopIndices } = getRRPointsIndices(prev.length);
      const entryPrice = parseFloat(updated[entryIndices[0]].price) || 0;
      const tickSize = 1 / Math.pow(10, prec);
      const isLong = overlay.name === 'longPosition';
      const newPrice = isLong ? entryPrice - (ticks * tickSize) : entryPrice + (ticks * tickSize);
      const valStr = newPrice.toFixed(prec);
      stopIndices.forEach(idx => {
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], price: valStr };
        }
      });
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

  const deleteTemplate = (id: string) => {
    setTemplates(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem(`fx_templates_${overlay.name || 'default'}`, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteNameOption = (name: string) => {
    setTemplates(prev => {
      const updated = prev.filter(t => t.name !== name);
      localStorage.setItem(`fx_templates_${overlay.name || 'default'}`, JSON.stringify(updated));
      return updated;
    });
    if (saveName === name) {
      setSaveName('');
    }
  };

  const deleteGroupOption = (groupName: string) => {
    setTemplates(prev => {
      const updated = prev.filter(t => t.group !== groupName);
      localStorage.setItem(`fx_templates_${overlay.name || 'default'}`, JSON.stringify(updated));
      return updated;
    });
    if (saveGroup === groupName) {
      setSaveGroup('Default');
    }
  };

  const applyTemplate = (settings: any) => {
    if (!settings) return;
    setLineColor(settings.lineColor || '#2196F3');
    setLineWidth(settings.lineWidth || 1);
    setLineStyle(settings.lineStyle || 'solid');
    setExtendType(settings.extendType || 'none');
    setFillColor(settings.fillColor || 'rgba(33, 150, 243, 0.1)');
    setFillBackground(settings.fillBackground !== false);
    setProfitColor(settings.profitColor || 'rgba(76, 175, 80, 0.12)');
    setLossColor(settings.lossColor || 'rgba(244, 67, 54, 0.12)');
    setAlwaysShowStats(settings.alwaysShowStats !== false);
    setShowLines(settings.showLines === true);
    setShowActivationLine(settings.showActivationLine !== false);
    setActivationLineColor(settings.activationLineColor || '#808285');
    setActivationLineWidth(settings.activationLineWidth || 1);
    setActivationLineStyle(settings.activationLineStyle || 'dashed');
    setShowActivationHighlight(settings.showActivationHighlight !== false);
    setActivationHighlightOpacity(typeof settings.activationHighlightOpacity === 'number' ? settings.activationHighlightOpacity : 0.28);
    setShowMarkers(settings.showMarkers !== false);
    setText(settings.text || '');
    setTextColor(settings.textColor || '#2196F3');
    setFontSize(settings.fontSize || 14);
    setIsBold(!!settings.bold);
    setIsItalic(!!settings.italic);
    setTextValign(settings.textPosition?.vertical || 'middle');
    setTextHalign(settings.textPosition?.horizontal || 'right');
    setTextPlacement(settings.textPlacement || 'inside');
    if (settings.visibility) setVisibility(settings.visibility);
    setIsTemplateDropdownOpen(false);

    // Sync template settings and coordinates immediately to prevent state sync race conditions
    const updatedSettings = {
      lineColor: settings.lineColor || '#2196F3',
      lineWidth: settings.lineWidth || 1,
      lineStyle: settings.lineStyle || 'solid',
      extendType: settings.extendType || 'none',
      fillColor: settings.fillColor || 'rgba(33, 150, 243, 0.1)',
      fillBackground: settings.fillBackground !== false,
      profitColor: settings.profitColor || 'rgba(76, 175, 80, 0.12)',
      lossColor: settings.lossColor || 'rgba(244, 67, 54, 0.12)',
      alwaysShowStats: settings.alwaysShowStats !== false,
      showLines: settings.showLines === true,
      showActivationLine: settings.showActivationLine !== false,
      activationLineColor: settings.activationLineColor || '#808285',
      activationLineWidth: settings.activationLineWidth || 1,
      activationLineStyle: settings.activationLineStyle || 'dashed',
      showActivationHighlight: settings.showActivationHighlight !== false,
      activationHighlightOpacity: typeof settings.activationHighlightOpacity === 'number' ? settings.activationHighlightOpacity : 0.28,
      showMarkers: settings.showMarkers !== false,
      initialSizePercent: typeof settings.initialSizePercent === 'number' ? settings.initialSizePercent : initialSizePercent,
      text: settings.text || '',
      textColor: settings.textColor || '#2196F3',
      fontSize: settings.fontSize || 14,
      bold: !!settings.bold,
      italic: !!settings.italic,
      textPosition: {
        vertical: settings.textPosition?.vertical || 'middle',
        horizontal: settings.textPosition?.horizontal || 'right'
      },
      textPlacement: settings.textPlacement || 'inside',
      visibility: settings.visibility || visibility
    };

    const updatedPoints = points.map(pt => {
      let finalTimestamp = pt.timestamp;
      let resolvedDataIndex: number | undefined = undefined;

      if (allCandles.length > 0) {
        if (pt.bar !== undefined) {
          const idx = (allCandles.length - 1) - pt.bar;
          if (idx >= 0 && idx < allCandles.length) {
            const candle = allCandles[idx];
            if (candle) {
              finalTimestamp = candle.timestamp;
              resolvedDataIndex = idx;
            }
          } else if (idx >= allCandles.length) {
            const lastCandle = allCandles[allCandles.length - 1];
            if (lastCandle) {
              const indexDiff = -pt.bar;
              let timeframeMinutes = 1;
              const tf = timeframe.toLowerCase();
              if (tf.endsWith('m')) timeframeMinutes = parseInt(tf);
              else if (tf.endsWith('h')) timeframeMinutes = parseInt(tf) * 60;
              else if (tf.endsWith('d')) timeframeMinutes = parseInt(tf) * 1440;
              
              finalTimestamp = lastCandle.timestamp + indexDiff * timeframeMinutes * 60 * 1000;
              resolvedDataIndex = idx;
            }
          } else {
            const firstCandle = allCandles[0];
            if (firstCandle) {
              const indexDiff = -idx;
              let timeframeMinutes = 1;
              const tf = timeframe.toLowerCase();
              if (tf.endsWith('m')) timeframeMinutes = parseInt(tf);
              else if (tf.endsWith('h')) timeframeMinutes = parseInt(tf) * 60;
              else if (tf.endsWith('d')) timeframeMinutes = parseInt(tf) * 1440;
              
              finalTimestamp = firstCandle.timestamp - indexDiff * timeframeMinutes * 60 * 1000;
              resolvedDataIndex = idx;
            }
          }
        } else {
          const idx = allCandles.findIndex(c => c.timestamp === pt.timestamp);
          if (idx !== -1) {
            resolvedDataIndex = idx;
          }
        }
      }

      return {
        timestamp: finalTimestamp,
        value: parseFloat(pt.price),
        ...(resolvedDataIndex !== undefined ? { dataIndex: resolvedDataIndex } : {})
      };
    });

    onSave(updatedSettings, updatedPoints);
    onClose();
    if (onDeselectOverlay) {
      onDeselectOverlay();
    }
  };

  const resetToDefault = () => {
    setLineColor('#2196F3');
    setLineWidth(1);
    setLineStyle('solid');
    setExtendType('none');
    setFillColor('rgba(33, 150, 243, 0.1)');
    setFillBackground(true);
    setProfitColor('rgba(76, 175, 80, 0.12)');
    setLossColor('rgba(244, 67, 54, 0.12)');
    setAlwaysShowStats(true);
    setShowLines(false);
    setShowActivationLine(true);
    setActivationLineColor('#808285');
    setActivationLineWidth(1);
    setActivationLineStyle('dashed');
    setShowActivationHighlight(true);
    setActivationHighlightOpacity(0.28);
    setShowMarkers(true);
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
    <label className="flex items-center gap-3 cursor-pointer group text-txt-secondary hover:text-txt-primary select-none py-1.5 w-full">
      <div 
        onClick={() => onChange(!checked)}
        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
          checked ? 'bg-accent border-accent text-txt-inverse' : 'border-border-def bg-app-bg group-hover:border-border-focus'
        }`}
      >
        {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </div>
      <span className="text-[12.5px] font-medium tracking-wide">{label}</span>
    </label>
  );

  // Derived template states
  const activeTemplates = (templates || []).filter(t => t && t.mode === activeTemplateMode);
  const uniqueGroups = Array.from(new Set(activeTemplates.map(t => t.group || 'Default')));
  const visibleTemplates = activeTemplates.filter(t => (t.group || 'Default') === selectedGroup);

  const allUniqueNames = Array.from(new Set((templates || []).filter(t => t && t.name).map(t => t.name)));
  const allUniqueGroups = Array.from(new Set((templates || []).filter(t => t && t.group).map(t => t.group)));

  return (
    <div 
      ref={containerRef}
      className="fixed bg-modal-bg border border-border-def rounded-xl shadow-2xl w-[420px] flex flex-col z-50 text-txt-secondary select-none overflow-visible animate-in fade-in zoom-in-95 duration-150"
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
          border: 2px solid var(--accent-primary, #6366f1);
          cursor: pointer;
          transition: transform 0.1s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }
        .custom-range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .custom-range-slider::-webkit-slider-thumb:active {
          transform: scale(1.3);
          background: var(--accent-primary, #6366f1);
        }
      `}} />

      {/* Draggable Header */}
      <div 
        ref={headerRef}
        onMouseDown={handleMouseDown}
        className="flex justify-between items-center px-5 py-4 border-b border-border-def cursor-move active:cursor-grabbing hover:bg-surface-hover transition-colors rounded-t-xl"
      >
        <span className="font-semibold text-[13.5px] tracking-wide text-txt-primary capitalize">
          {overlay.name === 'trendLine' ? 'Trendline' : overlay.name} Settings
        </span>
        <button onClick={handleCancel} className="text-txt-muted hover:text-txt-primary transition-colors cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex px-5 border-b border-border-def text-[12px] font-semibold gap-5 overflow-x-auto select-none bg-surface">
        {(
          overlay.name === 'longPosition' || overlay.name === 'shortPosition'
            ? ['style', 'inputs', 'visibility'] as const
            : ['style', 'text', 'coordinates', 'visibility'] as const
        ).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setActiveColorPicker(null); setActiveSelect(null); }}
            className={`py-3.5 border-b-2 capitalize transition-colors relative cursor-pointer ${
              activeTab === tab 
                ? 'border-accent text-accent font-bold' 
                : 'border-transparent text-txt-muted hover:text-txt-primary'
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
              <span className="text-txt-muted font-medium">Line</span>
              <div className="flex gap-2 items-center relative">
                
                {/* Color Swatch */}
                <div className="relative">
                  <button 
                    onClick={() => { setActiveColorPicker(activeColorPicker === 'line' ? null : 'line'); setActiveSelect(null); }}
                    className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
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
                    className="flex items-center justify-center border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-2.5 py-1.5 text-[12px] font-mono font-bold w-14 h-8 justify-between cursor-pointer transition-all active:scale-95 text-txt-primary"
                  >
                    <span>{lineWidth}px</span>
                  </button>
                  {activeSelect === 'lineWidth' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                      <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-lg shadow-2xl z-50 py-1 w-16 overflow-hidden">
                        {[1, 2, 3, 4].map(w => (
                          <button
                            key={w}
                            onClick={() => { setLineWidth(w); setActiveSelect(null); }}
                            className={`w-full text-center px-3 py-2 hover:bg-surface-hover transition-colors text-[12px] font-mono font-semibold ${lineWidth === w ? 'text-accent bg-accent-muted' : 'text-txt-secondary'}`}
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
                    className="flex items-center justify-center border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 justify-between capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
                  >
                    <span>{lineStyle}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
                  </button>
                  {activeSelect === 'lineStyle' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                      <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-lg shadow-2xl z-50 py-1 w-24 overflow-hidden">
                        {(overlay?.name === 'rectangle' ? ['solid', 'dashed', 'dotted', 'none'] : ['solid', 'dashed', 'dotted']).map(s => (
                          <button
                            key={s}
                            onClick={() => { setLineStyle(s); setActiveSelect(null); }}
                            className={`w-full text-left px-4 py-2 hover:bg-surface-hover transition-colors text-[12px] capitalize ${lineStyle === s ? 'text-accent bg-accent-muted' : 'text-txt-secondary'}`}
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
            {overlay.name === 'trendLine' && (
              <div className="flex items-center justify-between min-h-[36px]">
                <span className="text-txt-muted font-medium">Extend</span>
                <div className="relative">
                  <button
                    onClick={() => { setActiveSelect(activeSelect === 'extend' ? null : 'extend'); setActiveColorPicker(null); }}
                    className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-48 h-8 cursor-pointer transition-all active:scale-95 text-txt-primary"
                  >
                    <span className="capitalize">{extendType === 'none' ? "Don't extend" : `Extend ${extendType}`}</span>
                    <ChevronDown className="w-4 h-4 text-txt-muted" />
                  </button>
                  {activeSelect === 'extend' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                      <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-lg shadow-2xl z-50 py-1 w-48 overflow-hidden">
                        {[
                          { val: 'none', label: "Don't extend" },
                          { val: 'left', label: 'Extend left' },
                          { val: 'right', label: 'Extend right' },
                          { val: 'both', label: 'Extend both' }
                        ].map(item => (
                          <button
                            key={item.val}
                            onClick={() => { setExtendType(item.val); setActiveSelect(null); }}
                            className={`w-full text-left px-4 py-2 hover:bg-surface-hover transition-colors text-[12px] ${extendType === item.val ? 'text-accent bg-accent-muted' : 'text-txt-secondary'}`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Background Fill (Rectangle/Circle) */}
            {(overlay.name === 'rectangle' || overlay.name === 'circle') && (
              <div className="flex items-center justify-between min-h-[36px]">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="fillBackground"
                    checked={fillBackground}
                    onChange={(e) => setFillBackground(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border-def bg-app-bg text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <label htmlFor="fillBackground" className="text-txt-muted font-medium cursor-pointer">Background</label>
                </div>
                {fillBackground && (
                  <div className="relative">
                    <button 
                      onClick={() => { setActiveColorPicker(activeColorPicker === 'fill' ? null : 'fill'); setActiveSelect(null); }}
                      className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
                      style={{ backgroundColor: fillColor }}
                    />
                    {activeColorPicker === 'fill' && (
                      <div className="absolute right-0 top-full mt-2 z-50">
                        <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                        <div className="relative">
                          <ColorPicker color={fillColor} onChange={(c) => setFillColor(c)} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Profit/Loss Colors (Long/Short Positions) */}
            {(overlay.name === 'longPosition' || overlay.name === 'shortPosition') && (
              <>
                <div className="flex items-center justify-between min-h-[36px]">
                  <span className="text-txt-muted font-medium">Profit Zone</span>
                  <div className="relative">
                    <button 
                      onClick={() => { setActiveColorPicker(activeColorPicker === 'profit' ? null : 'profit'); setActiveSelect(null); }}
                      className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
                      style={{ backgroundColor: profitColor }}
                    />
                    {activeColorPicker === 'profit' && (
                      <div className="absolute right-0 top-full mt-2 z-50">
                        <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                        <div className="relative">
                          <ColorPicker color={profitColor} onChange={(c) => setProfitColor(c)} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between min-h-[36px]">
                  <span className="text-txt-muted font-medium">Loss Zone</span>
                  <div className="relative">
                    <button 
                      onClick={() => { setActiveColorPicker(activeColorPicker === 'loss' ? null : 'loss'); setActiveSelect(null); }}
                      className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
                      style={{ backgroundColor: lossColor }}
                    />
                    {activeColorPicker === 'loss' && (
                      <div className="absolute right-0 top-full mt-2 z-50">
                        <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                        <div className="relative">
                          <ColorPicker color={lossColor} onChange={(c) => setLossColor(c)} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 min-h-[36px]">
                  <input
                    type="checkbox"
                    id="alwaysShowStats"
                    checked={alwaysShowStats}
                    onChange={(e) => setAlwaysShowStats(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border-def bg-app-bg text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <label htmlFor="alwaysShowStats" className="text-txt-muted font-medium cursor-pointer">Always Show Stats</label>
                </div>
                <div className="flex items-center gap-2 min-h-[36px]">
                  <input
                    type="checkbox"
                    id="showLines"
                    checked={showLines}
                    onChange={(e) => setShowLines(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border-def bg-app-bg text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <label htmlFor="showLines" className="text-txt-muted font-medium cursor-pointer">Show Lines</label>
                </div>

                {/* Activation Visualization Controls */}
                <div className="pt-3 border-t border-border-sub space-y-3">
                  <div className="text-[11.5px] font-semibold text-txt-secondary uppercase tracking-wider">Activation Visualization</div>
                  
                  {/* Show Activation Line Checkbox */}
                  <div className="flex items-center gap-2 min-h-[32px]">
                    <input
                      type="checkbox"
                      id="showActivationLine"
                      checked={showActivationLine}
                      onChange={(e) => setShowActivationLine(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-border-def bg-app-bg text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <label htmlFor="showActivationLine" className="text-txt-muted font-medium cursor-pointer">Show Activation Line</label>
                  </div>

                  {/* Activation Line Color / Width / Style Row */}
                  {showActivationLine && (
                    <div className="flex items-center justify-between min-h-[36px] pl-5">
                      <span className="text-txt-muted font-medium">Activation Line</span>
                      <div className="flex gap-2 items-center relative">
                        {/* Activation Line Color Swatch */}
                        <div className="relative">
                          <button 
                            onClick={() => { setActiveColorPicker(activeColorPicker === 'actLine' ? null : 'actLine'); setActiveSelect(null); }}
                            className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
                            style={{ backgroundColor: activationLineColor }}
                          />
                          {activeColorPicker === 'actLine' && (
                            <div className="absolute right-0 top-full mt-2 z-50">
                              <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                              <div className="relative">
                                <ColorPicker color={activationLineColor} onChange={(c) => setActivationLineColor(c)} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Activation Line Width */}
                        <div className="relative">
                          <button
                            onClick={() => { setActiveSelect(activeSelect === 'actLineWidth' ? null : 'actLineWidth'); setActiveColorPicker(null); }}
                            className="flex items-center justify-center border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-2.5 py-1.5 text-[12px] font-mono font-bold w-14 h-8 justify-between cursor-pointer transition-all active:scale-95 text-txt-primary"
                          >
                            <span>{activationLineWidth}px</span>
                          </button>
                          {activeSelect === 'actLineWidth' && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                              <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-lg shadow-2xl z-50 py-1 w-16 overflow-hidden">
                                {[1, 2, 3, 4].map(w => (
                                  <button
                                    key={w}
                                    onClick={() => { setActivationLineWidth(w); setActiveSelect(null); }}
                                    className={`w-full text-center px-3 py-2 hover:bg-surface-hover transition-colors text-[12px] font-mono font-semibold ${activationLineWidth === w ? 'text-accent bg-accent-muted' : 'text-txt-secondary'}`}
                                  >
                                    {w}px
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Activation Line Style */}
                        <div className="relative">
                          <button
                            onClick={() => { setActiveSelect(activeSelect === 'actLineStyle' ? null : 'actLineStyle'); setActiveColorPicker(null); }}
                            className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-2.5 py-1.5 text-[12px] font-semibold w-24 h-8 cursor-pointer transition-all active:scale-95 text-txt-primary"
                          >
                            <span className="capitalize">{activationLineStyle}</span>
                            <ChevronDown className="w-4 h-4 text-txt-muted" />
                          </button>
                          {activeSelect === 'actLineStyle' && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                              <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-lg shadow-2xl z-50 py-1 w-24 overflow-hidden">
                                {['solid', 'dashed', 'dotted'].map(s => (
                                  <button
                                    key={s}
                                    onClick={() => { setActivationLineStyle(s); setActiveSelect(null); }}
                                    className={`w-full text-left px-3 py-1.5 hover:bg-surface-hover transition-colors text-[12px] capitalize ${activationLineStyle === s ? 'text-accent bg-accent-muted' : 'text-txt-secondary'}`}
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
                  )}

                  {/* Show Activation Highlight Checkbox */}
                  <div className="flex items-center gap-2 min-h-[32px]">
                    <input
                      type="checkbox"
                      id="showActivationHighlight"
                      checked={showActivationHighlight}
                      onChange={(e) => setShowActivationHighlight(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-border-def bg-app-bg text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <label htmlFor="showActivationHighlight" className="text-txt-muted font-medium cursor-pointer">Show Activation Highlight</label>
                  </div>

                  {/* Activation Highlight Opacity */}
                  {showActivationHighlight && (
                    <div className="flex items-center justify-between min-h-[36px] pl-5">
                      <span className="text-gray-400 font-medium">Highlight Opacity</span>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0.10"
                          max="0.60"
                          step="0.02"
                          value={activationHighlightOpacity}
                          onChange={(e) => setActivationHighlightOpacity(parseFloat(e.target.value))}
                          className="w-28 accent-accent cursor-pointer"
                        />
                        <span className="text-gray-300 font-mono text-[11px] w-10 text-right">
                          {Math.round(activationHighlightOpacity * 100)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Show Markers Checkbox */}
                  <div className="flex items-center gap-2 min-h-[32px]">
                    <input
                      type="checkbox"
                      id="showMarkers"
                      checked={showMarkers}
                      onChange={(e) => setShowMarkers(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-border-def bg-app-bg text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <label htmlFor="showMarkers" className="text-txt-muted font-medium cursor-pointer">Show Markers</label>
                  </div>
                </div>
              </>
            )}

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
                  className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
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
                  className="flex items-center justify-center border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-2.5 py-1.5 text-[12px] font-mono font-bold w-14 h-8 justify-between cursor-pointer transition-all active:scale-95 text-txt-primary"
                >
                  <span>{fontSize}</span>
                </button>
                {activeSelect === 'fontSize' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                    <div className="absolute left-0 top-full mt-1 bg-modal-bg border border-border-def rounded-lg shadow-2xl z-50 py-1 w-16 overflow-hidden">
                      {[10, 11, 12, 14, 16, 20, 24].map(sz => (
                        <button
                          key={sz}
                          onClick={() => { setFontSize(sz); setActiveSelect(null); }}
                          className={`w-full text-center px-3 py-2 hover:bg-surface-hover transition-colors text-[12px] font-mono font-semibold ${fontSize === sz ? 'text-accent bg-accent-muted' : 'text-txt-secondary'}`}
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
                className={`w-8 h-8 flex items-center justify-center rounded-lg border border-border-def font-bold hover:bg-surface-hover transition-colors cursor-pointer select-none ${isBold ? 'text-accent bg-accent-muted border-accent/40' : 'text-txt-secondary'}`}
              >
                B
              </button>

              {/* Italic Toggle */}
              <button
                onClick={() => setIsItalic(!isItalic)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border border-border-def italic hover:bg-surface-hover transition-colors cursor-pointer select-none ${isItalic ? 'text-accent bg-accent-muted border-accent/40' : 'text-txt-secondary'}`}
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
                className="bg-app-bg border border-border-def hover:border-border-focus rounded-lg p-3 h-24 outline-none text-txt-primary focus:border-border-focus resize-none font-sans text-[12.5px] w-full transition-colors"
              />
            </div>

            {/* Text Alignment Row */}
            <div className="flex items-center justify-between min-h-[36px]">
              <span className="text-txt-muted font-medium">Text alignment</span>
              <div className="flex gap-2">
                
                {/* Vertical Alignment */}
                <div className="relative">
                  <button
                    onClick={() => { setActiveSelect(activeSelect === 'valign' ? null : 'valign'); setActiveColorPicker(null); }}
                    className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
                  >
                    <span>{textValign}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
                  </button>
                  {activeSelect === 'valign' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                      <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-lg shadow-2xl z-50 py-1 w-24 overflow-hidden">
                        {['top', 'middle', 'bottom'].map(v => (
                          <button
                            key={v}
                            onClick={() => { setTextValign(v); setActiveSelect(null); }}
                            className={`w-full text-left px-4 py-2 hover:bg-surface-hover transition-colors text-[12px] capitalize ${textValign === v ? 'text-accent bg-accent-muted font-semibold' : 'text-txt-secondary'}`}
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
                    className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
                  >
                    <span>{textHalign}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
                  </button>
                  {activeSelect === 'halign' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                      <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-lg shadow-2xl z-50 py-1 w-24 overflow-hidden">
                        {['left', 'center', 'right'].map(h => (
                          <button
                            key={h}
                            onClick={() => { setTextHalign(h); setActiveSelect(null); }}
                            className={`w-full text-left px-4 py-2 hover:bg-surface-hover transition-colors text-[12px] capitalize ${textHalign === h ? 'text-accent bg-accent-muted font-semibold' : 'text-txt-secondary'}`}
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

            {/* Text Placement Row */}
            <div className="flex items-center justify-between min-h-[36px]">
              <span className="text-txt-muted font-medium">Text placement</span>
              <div className="relative">
                <button
                  onClick={() => { setActiveSelect(activeSelect === 'textPlacement' ? null : 'textPlacement'); setActiveColorPicker(null); }}
                  className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-28 h-8 capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
                >
                  <span>{textPlacement}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
                </button>
                {activeSelect === 'textPlacement' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                    <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-lg shadow-2xl z-50 py-1 w-28 overflow-hidden">
                      {['inside', 'outside'].map(p => (
                        <button
                          key={p}
                          onClick={() => { setTextPlacement(p as 'inside' | 'outside'); setActiveSelect(null); }}
                          className={`w-full text-left px-4 py-2 hover:bg-surface-hover transition-colors text-[12px] capitalize ${textPlacement === p ? 'text-accent bg-accent-muted font-semibold' : 'text-txt-secondary'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        )}

        {/* INPUTS TAB (Risk/Reward Specific) */}
        {activeTab === 'inputs' && points.length >= 3 && (() => {
          const len = points.length;
          const entryIdx = len >= 6 ? 4 : 0;
          const profitIdx = len >= 6 ? 0 : 1;
          const stopIdx = len >= 6 ? 2 : 2;

          const entryPrice = parseFloat(points[entryIdx].price) || 0;
          const profitPrice = parseFloat(points[profitIdx].price) || 0;
          const stopPrice = parseFloat(points[stopIdx].price) || 0;
          const tickSize = 1 / Math.pow(10, prec);
          
          const profitTicks = Math.round(Math.abs(profitPrice - entryPrice) / tickSize);
          const stopTicks = Math.round(Math.abs(entryPrice - stopPrice) / tickSize);
          
          return (
            <div className="space-y-4">
              {/* Entry Price Section */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">Entry Price</span>
                <div className="flex items-center justify-between min-h-[36px]">
                  <span className="text-txt-secondary font-medium">Price</span>
                  <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[160px] overflow-hidden focus-within:border-border-focus transition-colors">
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = Math.max(0, entryPrice - tickSize);
                        handleEntryPriceChange(newVal.toFixed(prec));
                      }}
                      className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      step={tickSize}
                      value={points[entryIdx].price}
                      onChange={(e) => handleEntryPriceChange(e.target.value)}
                      className="w-[96px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = entryPrice + tickSize;
                        handleEntryPriceChange(newVal.toFixed(prec));
                      }}
                      className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-border-sub my-3" />

              {/* Profit Level Section */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-status-success uppercase tracking-wider">Profit Level (Take Profit)</span>
                
                {/* Profit Price Input */}
                <div className="flex items-center justify-between min-h-[36px]">
                  <span className="text-txt-secondary font-medium">Price</span>
                  <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[160px] overflow-hidden focus-within:border-border-focus transition-colors">
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = Math.max(0, profitPrice - tickSize);
                        handleProfitPriceChange(newVal.toFixed(prec));
                      }}
                      className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      step={tickSize}
                      value={points[profitIdx].price}
                      onChange={(e) => handleProfitPriceChange(e.target.value)}
                      className="w-[96px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = profitPrice + tickSize;
                        handleProfitPriceChange(newVal.toFixed(prec));
                      }}
                      className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Profit Ticks Input */}
                <div className="flex items-center justify-between min-h-[36px]">
                  <span className="text-txt-secondary font-medium">Ticks / Points</span>
                  <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[160px] overflow-hidden focus-within:border-border-focus transition-colors">
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = Math.max(0, profitTicks - 1);
                        handleProfitTicksChange(newVal);
                      }}
                      className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      value={profitTicks}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        handleProfitTicksChange(val);
                      }}
                      className="w-[96px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = profitTicks + 1;
                        handleProfitTicksChange(newVal);
                      }}
                      className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-border-sub my-3" />

              {/* Stop Level Section */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-status-error uppercase tracking-wider">Stop Level (Stop Loss)</span>
                
                {/* Stop Price Input */}
                <div className="flex items-center justify-between min-h-[36px]">
                  <span className="text-txt-secondary font-medium">Price</span>
                  <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[160px] overflow-hidden focus-within:border-border-focus transition-colors">
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = Math.max(0, stopPrice - tickSize);
                        handleStopPriceChange(newVal.toFixed(prec));
                      }}
                      className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      step={tickSize}
                      value={points[stopIdx].price}
                      onChange={(e) => handleStopPriceChange(e.target.value)}
                      className="w-[96px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = stopPrice + tickSize;
                        handleStopPriceChange(newVal.toFixed(prec));
                      }}
                      className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stop Ticks Input */}
                <div className="flex items-center justify-between min-h-[36px]">
                  <span className="text-txt-secondary font-medium">Ticks / Points</span>
                  <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[160px] overflow-hidden focus-within:border-border-focus transition-colors">
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = Math.max(0, stopTicks - 1);
                        handleStopTicksChange(newVal);
                      }}
                      className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      value={stopTicks}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        handleStopTicksChange(val);
                      }}
                      className="w-[96px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = stopTicks + 1;
                        handleStopTicksChange(newVal);
                      }}
                      className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-border-sub my-3" />

              {/* Initial Sizing Section */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-accent uppercase tracking-wider">Initial Tool Sizing</span>
                <div className="flex items-center justify-between min-h-[36px]">
                  <span className="text-txt-secondary font-medium">Initial TP/SL Size (% of Viewport)</span>
                  <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[160px] overflow-hidden focus-within:border-border-focus transition-colors">
                    <button
                      type="button"
                      onClick={() => setInitialSizePercent(prev => Math.max(1, prev - 1))}
                      className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={initialSizePercent}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(50, parseInt(e.target.value) || 18));
                        setInitialSizePercent(val);
                      }}
                      className="w-[96px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setInitialSizePercent(prev => Math.min(50, prev + 1))}
                      className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* COORDINATES TAB */}
        {activeTab === 'coordinates' && (
          <div className="space-y-4">
            
            <div className="flex flex-col gap-3.5">
              {points.map((pt, i) => (
                <div key={i} className="flex items-center justify-between min-h-[36px]">
                  <span className="text-txt-muted font-medium">#{i+1} (price, bar)</span>
                  <div className="flex gap-2.5 items-center">
                    
                    {/* Price Input with Plus/Minus buttons */}
                    <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[140px] overflow-hidden focus-within:border-border-focus transition-colors">
                      <button
                        type="button"
                        onClick={() => {
                          const step = 1 / Math.pow(10, prec);
                          const currentVal = parseFloat(pt.price) || 0;
                          const newVal = Math.max(0, currentVal - step);
                          handlePointChange(i, 'price', newVal.toFixed(prec));
                        }}
                        className="w-7 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
                        title="Decrease Price"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        step={1 / Math.pow(10, prec)}
                        value={pt.price}
                        onChange={(e) => handlePointChange(i, 'price', e.target.value)}
                        className="w-[86px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const step = 1 / Math.pow(10, prec);
                          const currentVal = parseFloat(pt.price) || 0;
                          const newVal = currentVal + step;
                          handlePointChange(i, 'price', newVal.toFixed(prec));
                        }}
                        className="w-7 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
                        title="Increase Price"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bar Input with Plus/Minus buttons */}
                    <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[100px] overflow-hidden focus-within:border-border-focus transition-colors">
                      <button
                        type="button"
                        onClick={() => {
                          const currentVal = parseInt(pt.bar) || 0;
                          const newVal = currentVal - 1; // Decreasing coordinate (moves to future)
                          handlePointChange(i, 'bar', String(newVal));
                        }}
                        className="w-7 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
                        title="Decrease Bar Value"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        value={pt.bar}
                        onChange={(e) => handlePointChange(i, 'bar', e.target.value)}
                        className="w-[46px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const currentVal = parseInt(pt.bar) || 0;
                          const newVal = currentVal + 1; // Increasing coordinate (moves to past)
                          handlePointChange(i, 'bar', String(newVal));
                        }}
                        className="w-7 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
                        title="Increase Bar Value"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

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
                      className="bg-app-bg disabled:opacity-20 border border-border-def rounded-lg px-1.5 py-1 w-14 text-center text-[12px] text-txt-primary outline-none focus:border-border-focus font-mono transition-colors"
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
                      className="bg-app-bg disabled:opacity-20 border border-border-def rounded-lg px-1.5 py-1 w-14 text-center text-[12px] text-txt-primary outline-none focus:border-border-focus font-mono transition-colors"
                      min={visibility[unit]?.min || 1}
                      max={maxLimit}
                    />
                  </div>

                </div>
              );
            })}

          </div>
        )}

      </div>

      {/* Footer */}
      <div className="flex justify-between items-center px-5 py-4 border-t border-border-def text-[12px] bg-surface rounded-b-xl">
        
        {/* Templates Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
            className="flex items-center gap-2 bg-app-bg border border-border-def hover:border-border-focus rounded-lg px-3 py-1.5 font-semibold text-txt-secondary hover:text-txt-primary cursor-pointer select-none transition-all active:scale-95"
          >
            <span>Template</span>
            <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
          </button>
          {isTemplateDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsTemplateDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-2 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 py-1 w-52 font-semibold animate-in fade-in slide-in-from-top-2 duration-100 overflow-visible flex flex-col">
                
                {/* Mode Tabs */}
                <div className="flex border-b border-border-sub">
                  <button
                    onClick={() => setActiveTemplateMode('light')}
                    className={`flex-1 text-center py-2 text-xs font-semibold border-r border-border-sub transition-colors ${
                      activeTemplateMode === 'light'
                        ? 'bg-accent-muted text-accent font-bold border-b border-accent'
                        : 'text-txt-muted hover:text-txt-primary'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setActiveTemplateMode('dark')}
                    className={`flex-1 text-center py-2 text-xs font-semibold transition-colors ${
                      activeTemplateMode === 'dark'
                        ? 'bg-accent-muted text-accent font-bold border-b border-accent'
                        : 'text-txt-muted hover:text-txt-primary'
                    }`}
                  >
                    Dark
                  </button>
                </div>

                {/* Actions Row */}
                <div className="flex border-b border-border-sub text-[11px]">
                  <button
                    onClick={() => {
                      setSaveName('');
                      setSaveGroup(selectedGroup || 'Default');
                      setSaveMode(activeTemplateMode);
                      setIsSaveModalOpen(true);
                      setIsTemplateDropdownOpen(false);
                    }}
                    className="flex-1 text-center py-2 text-accent hover:text-accent/80 font-bold border-r border-border-sub hover:bg-surface-hover transition-colors"
                  >
                    + Save As
                  </button>
                  <button
                    onClick={() => {
                      resetToDefault();
                      setIsTemplateDropdownOpen(false);
                    }}
                    className="flex-1 text-center py-2 text-txt-muted hover:text-status-error hover:bg-surface-hover transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {/* Group Selector Dropdown */}
                {uniqueGroups.length > 0 && (
                  <div className="relative px-3 py-2 border-b border-border-sub bg-surface">
                    <button
                      onClick={() => setIsSelectGroupDropdownOpen(!isSelectGroupDropdownOpen)}
                      className="w-full flex items-center justify-between bg-app-bg border border-border-def hover:border-border-focus rounded-lg px-2.5 py-1.5 text-xs text-txt-secondary hover:text-txt-primary transition-all active:scale-98"
                    >
                      <span>{selectedGroup}</span>
                      <ChevronDown className="w-3 h-3 text-txt-muted" />
                    </button>
                    {isSelectGroupDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setIsSelectGroupDropdownOpen(false)} />
                        <div className="absolute left-3 right-3 top-full mt-1 bg-modal-bg border border-border-def rounded-lg shadow-2xl z-[70] py-1 max-h-32 overflow-y-auto">
                          {uniqueGroups.map(grp => (
                            <button
                              key={grp}
                              onClick={() => {
                                setSelectedGroup(grp);
                                setIsSelectGroupDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-txt-secondary text-xs truncate"
                            >
                              {grp}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Templates List */}
                <div className="max-h-40 overflow-y-auto py-1 bg-modal-bg">
                  {visibleTemplates.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-txt-muted text-center italic">No templates</div>
                  ) : (
                    visibleTemplates.map(tpl => (
                      <div
                        key={tpl.id}
                        className="group flex justify-between items-center px-4 py-1.5 hover:bg-surface-hover text-txt-secondary hover:text-txt-primary text-xs cursor-pointer"
                        onClick={() => {
                          applyTemplate(tpl.settings);
                          setIsTemplateDropdownOpen(false);
                        }}
                      >
                        <span className="truncate pr-2">{tpl.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(tpl.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:bg-status-error/25 p-1 rounded transition-all text-status-error hover:text-status-error/80"
                          title="Delete template"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </>
          )}
        </div>

        {/* Action buttons (Cancel / Ok) */}
        <div className="flex gap-2.5">
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 border border-border-def hover:bg-surface-hover text-txt-secondary rounded-lg font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-accent hover:bg-accent-hover text-txt-inverse rounded-lg font-semibold cursor-pointer transition-colors shadow-lg"
          >
            Ok
          </button>
        </div>

      </div>

      {/* Save Template Custom Dialog (Popup) */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-overlay-bg backdrop-blur-xs z-[100] flex items-center justify-center animate-in fade-in duration-150">
          <div className="bg-modal-bg border border-border-def rounded-xl shadow-2xl w-[320px] p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150 text-txt-secondary">
            {/* Header */}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-xs tracking-wider uppercase text-txt-primary">Save drawing template</span>
              <button 
                onClick={() => setIsSaveModalOpen(false)}
                className="text-txt-muted hover:text-txt-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-3">
              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-txt-muted">Name</label>
                <SearchableDropdown
                  value={saveName}
                  onChange={setSaveName}
                  options={allUniqueNames}
                  onDeleteOption={deleteNameOption}
                  placeholder="CHoCH"
                  isOpen={isNameDropdownOpen}
                  setIsOpen={setIsNameDropdownOpen}
                />
              </div>

              {/* Group */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-txt-muted">Group</label>
                <SearchableDropdown
                  value={saveGroup}
                  onChange={setSaveGroup}
                  options={allUniqueGroups}
                  onDeleteOption={deleteGroupOption}
                  placeholder="SMC"
                  isOpen={isGroupDropdownOpen}
                  setIsOpen={setIsGroupDropdownOpen}
                />
              </div>

              {/* Mode Select Buttons */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-txt-muted">Mode</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveMode('light')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      saveMode === 'light'
                        ? 'bg-accent-muted border-accent text-accent font-bold'
                        : 'border-border-def bg-app-bg text-txt-muted hover:text-txt-primary hover:border-border-focus'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveMode('dark')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      saveMode === 'dark'
                        ? 'bg-accent-muted border-accent text-accent font-bold'
                        : 'border-border-def bg-app-bg text-txt-muted hover:text-txt-primary hover:border-border-focus'
                    }`}
                  >
                    Dark
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-1.5 border border-border-def hover:bg-surface-hover text-txt-secondary rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!saveName.trim()}
                onClick={() => {
                  const nameToSave = saveName.trim();
                  const groupToSave = saveGroup.trim() || 'Default';
                  
                  setTemplates(prev => {
                    const filtered = prev.filter(t => 
                      !(t.name.toLowerCase() === nameToSave.toLowerCase() && 
                        t.group.toLowerCase() === groupToSave.toLowerCase() && 
                        t.mode === saveMode)
                    );
                    const newTemplate = {
                      id: Date.now().toString(),
                      name: nameToSave,
                      group: groupToSave,
                      mode: saveMode,
                      settings: {
                        lineColor,
                        lineWidth,
                        lineStyle,
                        extendType,
                        fillColor,
                        fillBackground,
                        profitColor,
                        lossColor,
                        alwaysShowStats,
                        showLines,
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
                    const updated = [...filtered, newTemplate];
                    localStorage.setItem(`fx_templates_${overlay.name || 'default'}`, JSON.stringify(updated));
                    return updated;
                  });
                  
                  setSelectedGroup(groupToSave);
                  setActiveTemplateMode(saveMode);
                  setIsSaveModalOpen(false);
                }}
                className="px-5 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:pointer-events-none text-txt-inverse rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-accent/20 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
