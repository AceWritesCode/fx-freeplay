import React, { useState, useEffect } from 'react';
import { RgbaStringColorPicker } from 'react-colorful';
import { Pipette, ChevronDown } from 'lucide-react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

// Pre-defined color grid similar to TradingView
const SHADES_OF_GRAY = [
  '#ffffff', '#cccccc', '#999999', '#777777', '#555555', '#333333', '#222222', '#000000'
];

const COLOR_GRID = [
  ['#ffebee', '#fce4ec', '#f3e5f5', '#e8eaf6', '#e3f2fd', '#e0f7fa', '#e8f5e9', '#fff3e0'],
  ['#ffcdd2', '#f8bbd0', '#e1bee7', '#c5cae9', '#bbdefb', '#b2ebf2', '#c8e6c9', '#ffe0b2'],
  ['#ef9a9a', '#f48fb1', '#ce93d8', '#9fa8da', '#90caf9', '#80deea', '#a5d6a7', '#ffcc80'],
  ['#e57373', '#f06292', '#ba68c8', '#7986cb', '#64b5f6', '#4dd0e1', '#81c784', '#ffb74d'],
  ['#ef5350', '#ec407a', '#ab47bc', '#5c6bc0', '#42a5f5', '#26c6da', '#66bb6a', '#ffa726'],
  ['#f44336', '#e91e63', '#9c27b0', '#3f51b5', '#2196f3', '#00bcd4', '#4caf50', '#ff9800'],
  ['#e53935', '#d81b60', '#8e24aa', '#3949ab', '#1e88e5', '#00acc1', '#43a047', '#fb8c00'],
  ['#c62828', '#ad1457', '#6a1b9a', '#283593', '#1565c0', '#00838f', '#2e7d32', '#ef6c00']
];

const MAX_RECENT_COLORS = 8;

// Utility to convert hex or simple colors to rgba string to maintain opacity slider support
const toRgbaString = (str: string): string => {
  if (str.startsWith('rgba')) return str;
  if (str.startsWith('rgb(')) {
    return str.replace('rgb(', 'rgba(').replace(')', ', 1)');
  }
  if (str.startsWith('#')) {
    const hex = str.replace('#', '');
    let r = 0, g = 0, b = 0, a = 1;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else if (hex.length === 8) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
      a = parseInt(hex.substring(6, 8), 16) / 255;
    }
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return 'rgba(0,0,0,1)';
};

const extractHex = (rgbaStr: string) => {
  const match = rgbaStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#000000';
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
};

const hexToRgba = (hex: string, alpha: number) => {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const rgbaToHsla = (r: number, g: number, b: number, a: number) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: Math.round(a * 100)
  };
};

const hslaToRgba = (h: number, s: number, l: number, a: number) => {
  h /= 360;
  s /= 100;
  l /= 100;
  let r = l;
  let g = l;
  let b = l;

  if (s !== 0) {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: a / 100
  };
};

const parseRgba = (rgbaStr: string) => {
  const match = rgbaStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return { r: 0, g: 0, b: 0, a: 1 };
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1
  };
};

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const [recentColors, setRecentColors] = useState<string[]>(Array(MAX_RECENT_COLORS).fill(''));
  const [rgbaColor, setRgbaColor] = useState<string>(toRgbaString(color));

  const [format, setFormat] = useState<'HEX' | 'RGB' | 'HSL'>('HEX');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [hexInput, setHexInput] = useState('');
  const [rgbInput, setRgbInput] = useState({ r: '', g: '', b: '', a: '' });
  const [hslInput, setHslInput] = useState({ h: '', s: '', l: '', a: '' });

  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  // Load recent colors
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fx_recent_colors');
      if (saved) {
        const parsed = JSON.parse(saved);
        const filled = [...parsed, ...Array(MAX_RECENT_COLORS).fill('')].slice(0, MAX_RECENT_COLORS);
        setRecentColors(filled);
      }
    } catch (e) { }
  }, []);

  // 1. Sync color prop from parent to local state
  useEffect(() => {
    setRgbaColor(toRgbaString(color));
  }, [color]);

  // 2. Sync local state to input fields
  useEffect(() => {
    const { r, g, b, a } = parseRgba(rgbaColor);
    const hsla = rgbaToHsla(r, g, b, a);
    const hStr = extractHex(rgbaColor);

    if (document.activeElement?.getAttribute('data-color-input') !== 'true') {
      setHexInput(hStr.toUpperCase());
      setRgbInput({
        r: r.toString(),
        g: g.toString(),
        b: b.toString(),
        a: Math.round(a * 100).toString()
      });
      setHslInput({
        h: hsla.h.toString(),
        s: hsla.s.toString(),
        l: hsla.l.toString(),
        a: hsla.a.toString()
      });
    }
  }, [rgbaColor]);

  const handleColorChange = (newColor: string) => {
    const rgba = toRgbaString(newColor);
    setRgbaColor(rgba);
    onChange(rgba);
  };

  const handleHexInputChange = (val: string) => {
    let clean = val;
    if (clean.startsWith('#')) clean = clean.slice(1);
    if (!/^[0-9A-Fa-f]*$/.test(clean) || clean.length > 6) return;
    
    setHexInput(val);
    
    if (clean.length === 6) {
      const alpha = parseRgba(rgbaColor).a;
      const rgb = hexToRgba(`#${clean}`, alpha);
      handleColorChange(rgb);
    }
  };

  const handleRgbInputChange = (key: 'r' | 'g' | 'b' | 'a', val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    const num = val === '' ? 0 : parseInt(val);
    if (key === 'a') {
      if (num > 100) return;
    } else {
      if (num > 255) return;
    }
    
    const newRgb = { ...rgbInput, [key]: val };
    setRgbInput(newRgb);
    
    const rVal = newRgb.r === '' ? 0 : parseInt(newRgb.r);
    const gVal = newRgb.g === '' ? 0 : parseInt(newRgb.g);
    const bVal = newRgb.b === '' ? 0 : parseInt(newRgb.b);
    const aVal = newRgb.a === '' ? 0 : parseInt(newRgb.a) / 100;
    
    const rgbStr = `rgba(${rVal}, ${gVal}, ${bVal}, ${aVal})`;
    handleColorChange(rgbStr);
  };

  const handleHslInputChange = (key: 'h' | 's' | 'l' | 'a', val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    const num = val === '' ? 0 : parseInt(val);
    if (key === 'h') {
      if (num > 360) return;
    } else {
      if (num > 100) return;
    }
    
    const newHsl = { ...hslInput, [key]: val };
    setHslInput(newHsl);
    
    const hVal = newHsl.h === '' ? 0 : parseInt(newHsl.h);
    const sVal = newHsl.s === '' ? 0 : parseInt(newHsl.s);
    const lVal = newHsl.l === '' ? 0 : parseInt(newHsl.l);
    const aVal = newHsl.a === '' ? 0 : parseInt(newHsl.a);
    
    const rgb = hslaToRgba(hVal, sVal, lVal, aVal);
    const rgbStr = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`;
    handleColorChange(rgbStr);
  };

  const handleFormatChange = (newFormat: 'HEX' | 'RGB' | 'HSL') => {
    setFormat(newFormat);
    
    // Sync current values immediately to newly selected format
    const { r, g, b, a } = parseRgba(rgbaColor);
    const hsla = rgbaToHsla(r, g, b, a);
    const hStr = extractHex(rgbaColor);
    
    setHexInput(hStr.toUpperCase());
    setRgbInput({
      r: r.toString(),
      g: g.toString(),
      b: b.toString(),
      a: Math.round(a * 100).toString()
    });
    setHslInput({
      h: hsla.h.toString(),
      s: hsla.s.toString(),
      l: hsla.l.toString(),
      a: hsla.a.toString()
    });
  };

  const handleEyedropper = async () => {
    if (!hasEyeDropper) return;
    try {
      // @ts-ignore
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      handleColorChange(toRgbaString(result.sRGBHex));
    } catch (e) {
      console.error('Eyedropper failed:', e);
    }
  };

  const saveRecentColor = () => {
    setRecentColors(prev => {
      const filtered = prev.filter(c => c !== rgbaColor && c !== '');
      const updated = [rgbaColor, ...filtered, ...Array(MAX_RECENT_COLORS).fill('')].slice(0, MAX_RECENT_COLORS);
      localStorage.setItem('fx_recent_colors', JSON.stringify(updated.filter(c => c !== '')));
      return updated;
    });
  };

  return (
    <div className="flex bg-white dark:bg-[#1e222d] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 p-4 gap-6 select-none animate-in fade-in zoom-in-95 duration-150" style={{ width: '560px' }}>
      
      <style>{`
        .custom-picker-wrapper .react-colorful {
          width: 100% !important;
          height: auto !important;
          background: none !important;
          box-shadow: none !important;
          border: none !important;
          gap: 8px !important;
        }
        .custom-picker-wrapper .react-colorful__saturation {
          height: 190px !important;
          border-radius: 8px !important;
          border-bottom: none !important;
        }
        .custom-picker-wrapper .react-colorful__hue,
        .custom-picker-wrapper .react-colorful__alpha {
          height: 12px !important;
          border-radius: 6px !important;
          width: calc(100% - 40px) !important;
          margin-left: 40px !important;
        }
        .custom-picker-wrapper .react-colorful__alpha-gradient {
          border-radius: 6px !important;
        }
        .custom-picker-wrapper .react-colorful__hue-pointer,
        .custom-picker-wrapper .react-colorful__alpha-pointer {
          width: 16px !important;
          height: 16px !important;
          border-radius: 50% !important;
        }
      `}</style>

      {/* Left Side: Predefined Grid */}
      <div className="flex flex-col gap-2 border-r border-gray-200 dark:border-gray-800 pr-6">
        
        {/* Grayscale Row */}
        <div className="flex gap-1.5">
          {SHADES_OF_GRAY.map(c => (
            <button
              key={c}
              onClick={() => handleColorChange(c)}
              className="w-6 h-6 rounded border border-black/10 dark:border-white/10 hover:scale-110 transition-transform flex items-center justify-center"
              style={{ backgroundColor: c }}
            >
              {extractHex(rgbaColor) === c && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c === '#ffffff' ? '#000' : '#fff'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </button>
          ))}
        </div>

        <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-1" />

        {/* Colorful Grid */}
        <div className="flex flex-col gap-1.5">
          {COLOR_GRID.map((row, i) => (
            <div key={i} className="flex gap-1.5">
              {row.map(c => (
                <button
                  key={c}
                  onClick={() => handleColorChange(c)}
                  className="w-6 h-6 rounded border border-black/10 dark:border-white/10 hover:scale-110 transition-transform flex items-center justify-center"
                  style={{ backgroundColor: c }}
                >
                  {extractHex(rgbaColor).toLowerCase() === c && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={i < 3 ? '#000' : '#fff'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-1" />

        {/* Recent Colors */}
        <div className="flex gap-1.5 min-h-[24px]">
          {recentColors.map((c, i) => (
            <button
              key={`${c}-${i}`}
              onClick={() => c && handleColorChange(c)}
              className={`w-6 h-6 rounded border ${c ? 'border-black/10 dark:border-white/10 hover:scale-110' : 'border-gray-200 dark:border-gray-800'} transition-transform flex items-center justify-center`}
              style={c ? { backgroundColor: c } : {}}
              title={c ? "Recent color" : "Empty slot"}
            />
          ))}
        </div>
      </div>

      {/* Right Side: Custom Color Picker */}
      <div className="flex flex-col flex-1 gap-4 custom-color-picker justify-between">
        
        {/* Sliders and Saturation */}
        <div className="relative custom-picker-wrapper">
          <RgbaStringColorPicker color={rgbaColor} onChange={handleColorChange} />
          
          {/* Eyedropper Button (Circular) */}
          {hasEyeDropper && (
            <button
              onClick={handleEyedropper}
              className="absolute left-0 bottom-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#131722] dark:hover:bg-[#202738] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-indigo-500 transition-colors shadow-sm"
              title="Pick color from screen"
            >
              <Pipette className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Dynamic Inputs Row */}
        <div className="flex gap-2 items-stretch text-xs">
          
          {/* Custom Dropdown UI */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 bg-gray-100 dark:bg-[#131722] border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1.5 outline-none text-gray-800 dark:text-gray-200 font-semibold cursor-pointer select-none min-w-[72px] justify-between h-8 transition-colors hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <span>{format}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute left-0 bottom-full mb-1.5 w-24 bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl z-50 py-1 font-semibold animate-in fade-in slide-in-from-bottom-2 duration-100">
                  {(['HEX', 'RGB', 'HSL'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => {
                        handleFormatChange(fmt);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${format === fmt ? 'text-indigo-500' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Segmented Inputs Container */}
          <div className="flex flex-1 items-stretch bg-gray-100 dark:bg-[#131722] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden h-8">
            {format === 'HEX' && (
              <>
                <div className="flex-1 min-w-0 flex items-center px-2.5 border-r border-gray-200 dark:border-gray-800 h-full">
                  <span className="text-gray-400 mr-1 select-none font-mono">#</span>
                  <input 
                    type="text" 
                    data-color-input="true"
                    value={hexInput.replace('#', '')} 
                    onChange={(e) => handleHexInputChange(e.target.value)}
                    className="bg-transparent w-full h-full outline-none text-gray-800 dark:text-gray-200 font-mono uppercase text-left text-xs"
                    maxLength={7}
                    placeholder="000000"
                  />
                </div>
                <div className="relative w-20 flex-shrink-0 flex items-center h-full">
                  <input 
                    type="text" 
                    data-color-input="true"
                    value={rgbInput.a} 
                    onChange={(e) => handleRgbInputChange('a', e.target.value)}
                    className="bg-transparent text-center w-full h-full pr-5 outline-none text-gray-800 dark:text-gray-200 font-mono text-xs"
                    placeholder="A"
                    maxLength={3}
                  />
                  <span className="absolute right-2.5 text-[9px] text-gray-400 select-none">%</span>
                </div>
              </>
            )}

            {format === 'RGB' && (
              <>
                {['r', 'g', 'b'].map((key) => (
                  <input 
                    key={key}
                    type="text" 
                    data-color-input="true"
                    value={rgbInput[key as 'r' | 'g' | 'b']} 
                    onChange={(e) => handleRgbInputChange(key as any, e.target.value)}
                    className="bg-transparent border-r border-gray-200 dark:border-gray-800 text-center w-full h-full outline-none text-gray-800 dark:text-gray-200 font-mono flex-1 min-w-0 text-xs"
                    placeholder={key.toUpperCase()}
                    maxLength={3}
                  />
                ))}
                <div className="relative flex-1 min-w-0 flex items-center h-full">
                  <input 
                    type="text" 
                    data-color-input="true"
                    value={rgbInput.a} 
                    onChange={(e) => handleRgbInputChange('a', e.target.value)}
                    className="bg-transparent text-center w-full h-full pr-3.5 outline-none text-gray-800 dark:text-gray-200 font-mono text-xs"
                    placeholder="A"
                    maxLength={3}
                  />
                  <span className="absolute right-1 text-[9px] text-gray-400 select-none">%</span>
                </div>
              </>
            )}

            {format === 'HSL' && (
              <>
                <input 
                  type="text" 
                  data-color-input="true"
                  value={hslInput.h} 
                  onChange={(e) => handleHslInputChange('h', e.target.value)}
                  className="bg-transparent border-r border-gray-200 dark:border-gray-800 text-center w-full h-full outline-none text-gray-800 dark:text-gray-200 font-mono flex-1 min-w-0 text-xs"
                  placeholder="H"
                  maxLength={3}
                />
                {['s', 'l'].map((key) => (
                  <div key={key} className="relative flex-1 min-w-0 flex items-center border-r border-gray-200 dark:border-gray-800 h-full">
                    <input 
                      type="text" 
                      data-color-input="true"
                      value={hslInput[key as 's' | 'l']} 
                      onChange={(e) => handleHslInputChange(key as any, e.target.value)}
                      className="bg-transparent text-center w-full h-full pr-3.5 outline-none text-gray-800 dark:text-gray-200 font-mono text-xs"
                      placeholder={key.toUpperCase()}
                      maxLength={3}
                    />
                    <span className="absolute right-1 text-[9px] text-gray-400 select-none">%</span>
                  </div>
                ))}
                <div className="relative flex-1 min-w-0 flex items-center h-full">
                  <input 
                    type="text" 
                    data-color-input="true"
                    value={hslInput.a} 
                    onChange={(e) => handleHslInputChange('a', e.target.value)}
                    className="bg-transparent text-center w-full h-full pr-3.5 outline-none text-gray-800 dark:text-gray-200 font-mono text-xs"
                    placeholder="A"
                    maxLength={3}
                  />
                  <span className="absolute right-1 text-[9px] text-gray-400 select-none">%</span>
                </div>
              </>
            )}
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button 
            onClick={saveRecentColor}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Add to Library
          </button>
        </div>
      </div>

    </div>
  );
};
