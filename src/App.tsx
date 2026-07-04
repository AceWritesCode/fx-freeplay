import { useState, useEffect, useRef } from 'react';
import {
  Trash2,
  Settings,
  Upload,
  FileSpreadsheet,
  LineChart,
  AlertCircle,
  X,
  Scissors,
  SkipBack,
  Pause,
  Play,
  SkipForward,
  ChevronsLeft,
  Magnet,
  ChevronDown,
  FolderOpen,
  Folder,
  CheckCircle2,
  List,
  Plus,
  Minus,
  ChevronRight,
  Loader2,
  RefreshCw,
  LayoutGrid,
  Layers
} from 'lucide-react';
import { init, dispose } from 'klinecharts';
import { parseCSV, resample1mToTimeframe, saveChartDataToIndexedDB, loadChartDataFromIndexedDB, clearChartDataInIndexedDB, saveDirectoryHandle, loadDirectoryHandle, clearDirectoryHandle, detectPricePrecision, saveDirectoryHandles, loadDirectoryHandles } from './utils/dataUtils';
import type { KLineData } from './utils/dataUtils';
import { registerCustomOverlays, snapPointToCandle, getInteractiveOverlayOptions } from './utils/overlays';
import { ThemeSettingsModal, PRESET_SETTINGS, TIMEZONE_OPTIONS, getLabelOffset } from './components/ThemeSettingsModal';
import type { ChartSettings } from './components/ThemeSettingsModal';
import { ToolRegistry } from './framework/tools';
import { DrawingFloatingToolbar } from './components/DrawingFloatingToolbar';
import { DrawingSettingsDialog } from './components/DrawingSettingsDialog';
import { FloatingTrendLineText } from './components/FloatingTrendLineText';

type Timeframe = string;

interface TimeframeOption {
  label: string;
  value: string;
  minutes: number;
}

const PRESET_TIMEFRAMES: TimeframeOption[] = [
  // Minutes
  { label: '1m', value: '1m', minutes: 1 },
  { label: '2m', value: '2m', minutes: 2 },
  { label: '3m', value: '3m', minutes: 3 },
  { label: '5m', value: '5m', minutes: 5 },
  { label: '10m', value: '10m', minutes: 10 },
  { label: '15m', value: '15m', minutes: 15 },
  { label: '30m', value: '30m', minutes: 30 },
  { label: '45m', value: '45m', minutes: 45 },
  // Hours
  { label: '1h', value: '1h', minutes: 60 },
  { label: '2h', value: '2h', minutes: 120 },
  { label: '3h', value: '3h', minutes: 180 },
  { label: '4h', value: '4h', minutes: 240 },
  { label: '6h', value: '6h', minutes: 360 },
  { label: '12h', value: '12h', minutes: 720 },
  // Days, Weeks, Months
  { label: 'D', value: 'D', minutes: 1440 },
  { label: 'W', value: 'W', minutes: 10080 },
  { label: 'M', value: 'M', minutes: 43200 },
];

const getTimeframeMinutes = (tf: string): number => {
  if (tf === 'D') return 1440;
  if (tf === 'W') return 10080;
  if (tf === 'M') return 43200;
  if (tf.endsWith('m')) return parseInt(tf) || 1;
  if (tf.endsWith('h') || tf.endsWith('H')) return (parseInt(tf) || 1) * 60;
  return 1;
};

const getBestTimeframeFile = (
  files: Record<string, File>,
  targetTf: string
): { file: File; tf: string; minutes: number } | null => {
  const targetMinutes = getTimeframeMinutes(targetTf);
  
  let bestFile: File | null = null;
  let bestTf = '';
  let bestMinutes = -1;

  for (const [tf, file] of Object.entries(files)) {
    const fileMinutes = getTimeframeMinutes(tf);
    if (fileMinutes <= targetMinutes && targetMinutes % fileMinutes === 0) {
      if (fileMinutes > bestMinutes) {
        bestMinutes = fileMinutes;
        bestTf = tf;
        bestFile = file;
      }
    }
  }

  if (bestFile) {
    return { file: bestFile, tf: bestTf, minutes: bestMinutes };
  }
  
  for (const [tf, file] of Object.entries(files)) {
    const fileMinutes = getTimeframeMinutes(tf);
    if (fileMinutes <= targetMinutes) {
      if (fileMinutes > bestMinutes) {
        bestMinutes = fileMinutes;
        bestTf = tf;
        bestFile = file;
      }
    }
  }

  return bestFile ? { file: bestFile, tf: bestTf, minutes: bestMinutes } : null;
};

const HEADER_TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', 'D', 'W', 'M'];

const SPEED_STEPS = [3, 2, 1, 0.5, 0.1];

const matchFileToTimeframe = (filename: string): string | null => {
  const name = filename.toLowerCase();
  
  // Daily, Weekly, Monthly patterns
  if (name.includes('monthly') || name.includes('mn') || name.includes('1month') || name.endsWith('_m.csv')) {
    return 'M';
  }
  if (name.includes('weekly') || name.includes('w1') || name.includes('1week') || name.endsWith('_w.csv')) {
    return 'W';
  }
  if (name.includes('daily') || name.includes('d1') || name.includes('1day') || name.endsWith('_d.csv')) {
    return 'D';
  }
  
  // Minute and Hour patterns
  const mMatch = name.match(/(\d+)\s*(m|min|minute|s)/);
  if (mMatch) {
    const mins = parseInt(mMatch[1], 10);
    return `${mins}m`;
  }
  const hMatch = name.match(/(\d+)\s*(h|hr|hour)/);
  if (hMatch) {
    const hrs = parseInt(hMatch[1], 10);
    return `${hrs}h`;
  }

  // Check alternative short forms like m1, m5, h1, h4
  const shortMMatch = name.match(/m(\d+)/);
  if (shortMMatch) {
    return `${shortMMatch[1]}m`;
  }
  const shortHMatch = name.match(/h(\d+)/);
  if (shortHMatch) {
    return `${shortHMatch[1]}h`;
  }
  
  // Fallbacks if we can find specific suffixes or keywords
  if (name.includes('_m1') || name.includes('-m1') || name.endsWith('_1.csv')) return '1m';
  if (name.includes('_m5') || name.includes('-m5') || name.endsWith('_5.csv')) return '5m';
  if (name.includes('_m15') || name.includes('-m15') || name.endsWith('_15.csv')) return '15m';
  if (name.includes('_m30') || name.includes('-m30') || name.endsWith('_30.csv')) return '30m';
  if (name.includes('_h1') || name.includes('-h1') || name.endsWith('_60.csv')) return '1h';
  if (name.includes('_h4') || name.includes('-h4') || name.endsWith('_240.csv')) return '4h';
  if (name.includes('_d') || name.includes('-d') || name.endsWith('_1440.csv')) return 'D';
  if (name.includes('_w') || name.includes('-w') || name.endsWith('_10080.csv')) return 'W';
  if (name.includes('_m') || name.includes('-m') || name.endsWith('_43200.csv')) return 'M';

  return null;
};

const WeakMagnetIcon = ({ className = "w-4.5 h-4.5" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 16V10a6 6 0 0 1 12 0v6" />
    <path d="M10 16V10a2 2 0 0 1 4 0v6" />
    <path d="M6 16h4" />
    <path d="M14 16h4" />
    <path d="M6 13h4" />
    <path d="M14 13h4" />
  </svg>
);

const StrongMagnetIcon = ({ className = "w-4.5 h-4.5" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 13V9a6 6 0 0 1 12 0v4" />
    <path d="M10 13V9a2 2 0 0 1 4 0v4" />
    <path d="M6 13h4" />
    <path d="M14 13h4" />
    <path d="M6 11h4" />
    <path d="M14 11h4" />
    <path d="M7 16l.5 1.5l-.5 1.5" />
    <path d="M9 16l.5 1.5l-.5 1.5" />
    <path d="M15 16l.5 1.5l-.5 1.5" />
    <path d="M17 16l.5 1.5l-.5 1.5" />
  </svg>
);

const getLayoutChartCount = (type: string): number => {
  if (type.startsWith('4')) return 4;
  if (type.startsWith('3')) return 3;
  if (type.startsWith('2')) return 2;
  return 1;
};


const ToggleSwitch = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-indigo-600' : 'bg-gray-800'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

const layoutsList = [
  { type: '1', label: '1 Chart', icon: (
    <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900" />
  )},
  { type: '2v', label: '2 Columns', icon: (
    <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex">
      <div className="w-1/2 h-full border-r border-gray-500/85" />
      <div className="w-1/2 h-full" />
    </div>
  )},
  { type: '2h', label: '2 Rows', icon: (
    <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex flex-col">
      <div className="w-full h-1/2 border-b border-gray-500/85" />
      <div className="w-full h-1/2" />
    </div>
  )},
  { type: '3v', label: '3 Columns', icon: (
    <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex">
      <div className="w-1/3 h-full border-r border-gray-500/85" />
      <div className="w-1/3 h-full border-r border-gray-500/85" />
      <div className="w-1/3 h-full" />
    </div>
  )},
  { type: '3h', label: '3 Rows', icon: (
    <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex flex-col">
      <div className="w-full h-1/3 border-b border-gray-500/85" />
      <div className="w-full h-1/3 border-b border-gray-500/85" />
      <div className="w-full h-1/3" />
    </div>
  )},
  { type: '3g1', label: '3 Split Left', icon: (
    <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex">
      <div className="w-1/2 h-full border-r border-gray-500/85" />
      <div className="w-1/2 h-full flex flex-col">
        <div className="w-full h-1/2 border-b border-gray-500/85" />
        <div className="w-full h-1/2" />
      </div>
    </div>
  )},
  { type: '3g2', label: '3 Split Top', icon: (
    <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex flex-col">
      <div className="w-full h-1/2 border-b border-gray-500/85" />
      <div className="w-full h-1/2 flex">
        <div className="w-1/2 h-full border-r border-gray-500/85" />
        <div className="w-1/2 h-full" />
      </div>
    </div>
  )},
  { type: '4g', label: '2x2 Grid', icon: (
    <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 grid grid-cols-2 grid-rows-2">
      <div className="border-r border-b border-gray-500/85" />
      <div className="border-b border-gray-500/85" />
      <div className="border-r border-gray-500/85" />
      <div className="h-full w-full" />
    </div>
  )},
  { type: '4v', label: '4 Columns', icon: (
    <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex">
      <div className="w-1/4 h-full border-r border-gray-500/85" />
      <div className="w-1/4 h-full border-r border-gray-500/85" />
      <div className="w-1/4 h-full border-r border-gray-500/85" />
      <div className="w-1/4 h-full" />
    </div>
  )},
  { type: '4h', label: '4 Rows', icon: (
    <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex flex-col">
      <div className="w-full h-1/4 border-b border-gray-500/85" />
      <div className="w-full h-1/4 border-b border-gray-500/85" />
      <div className="w-full h-1/4 border-b border-gray-500/85" />
      <div className="w-full h-1/4" />
    </div>
  )}
];

export default function App() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const chartContainersRef = useRef<(HTMLDivElement | null)[]>([]);
  const chartInstancesRef = useRef<(any | null)[]>([]);
  const isSyncingCrosshairRef = useRef<boolean>(false);
  const syncCrosshairRef = useRef<boolean>(localStorage.getItem('sync_crosshair') !== 'false');
  const isSyncingRangeRef = useRef<boolean>(false);
  const syncTimeRef = useRef<boolean>(localStorage.getItem('sync_time') !== 'false');
  const syncDateRangeRef = useRef<boolean>(localStorage.getItem('sync_date_range') !== 'false');
  const syncDrawingsRef = useRef<boolean>(localStorage.getItem('sync_drawings') !== 'false');
  const activeChartIndexRef = useRef<number>(0);
  const slotsRef = useRef<any[]>([]);
  const layoutTypeRef = useRef<string>('1');
  const layoutContainerRef = useRef<HTMLDivElement>(null);
  const subContainerRef1 = useRef<HTMLDivElement>(null);
  const subContainerRef2 = useRef<HTMLDivElement>(null);
  const subContainerRef3 = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingCutAnimation = useRef<{
    timestamp: number;
    clickX: number;
    savedOffset: number;
  } | null>(null);
  const capturedOffsetRef = useRef<number | null>(null);
  const capturedYAxisRangeRef = useRef<{ from: number; to: number } | null>(null);
  const wasManualScaleRef = useRef<boolean>(false);
  const dataVersionRef = useRef<number>(0);
  const draggedIndexRef = useRef<number | null>(null);

  // Replay state
  const [isReplayActive, setIsReplayActive] = useState<boolean>(false);
  const [isSelectingCutPoint, setIsSelectingCutPoint] = useState<boolean>(false);
  const [replayCurrentTimestamp, setReplayCurrentTimestamp] = useState<number | null>(null);
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1); // seconds per bar
  const [cutPointHoverX, setCutPointHoverX] = useState<number | null>(null);

  // Magnet Mode state
  const [magnetMode, setMagnetMode] = useState<'normal' | 'normal_magnet' | 'weak_magnet' | 'strong_magnet'>('normal');
  const [isMagnetMenuOpen, setIsMagnetMenuOpen] = useState<boolean>(false);
  const [magnetMenuPos, setMagnetMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const magnetMenuRef = useRef<HTMLDivElement>(null);

  // Shift Key tracking for angle snapping
  const isShiftPressedRef = useRef<boolean>(false);

  // Active overlay ID being drawn
  const activeOverlayIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        isShiftPressedRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        isShiftPressedRef.current = false;
      }
    };
    const handleBlur = () => {
      isShiftPressedRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Close custom broker timezone dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brokerTfDropdownRef.current && !brokerTfDropdownRef.current.contains(event.target as Node)) {
        setIsBrokerTfDropdownOpen(false);
      }
      if (footerTzDropdownRef.current && !footerTzDropdownRef.current.contains(event.target as Node)) {
        setIsFooterTzOpen(false);
      }
      if (magnetMenuRef.current && !magnetMenuRef.current.contains(event.target as Node)) {
        setIsMagnetMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getMagnetSensitivity = (mode: string, s: typeof settings) => {
    if (mode === 'normal_magnet') return s.magnetNormalSensitivity ?? 30;
    if (mode === 'weak_magnet') return s.magnetWeakSensitivity ?? 10;
    if (mode === 'strong_magnet') {
      const v = s.magnetStrongSensitivity ?? 85;
      return v >= 100 ? 999999 : v;
    }
    return 999999;
  };

  const selectMagnetMode = (mode: 'normal_magnet' | 'weak_magnet' | 'strong_magnet') => {
    setMagnetMode(mode);
    if (chartInstance.current) {
      // Write to chart instance so overlays.ts snapPointToCandle reads live state during drag
      chartInstance.current._magnetMode = mode;
      const overlays = chartInstance.current.getOverlays();
      overlays.forEach((ov: any) => {
        if (ov.id === 'custom_price_line_overlay' || ov.name === 'customPriceLine' || ov.id === 'session_breaks_overlay' || ov.name === 'sessionBreaks') return;
        const sensitivity = getMagnetSensitivity(mode, settings);
        // Map 'normal_magnet' -> 'weak_magnet' for klinecharts: it only understands weak/strong.
        // Our _magnetMode flag handles sensitivity in snapPointToCandle.
        const klcMode = mode === 'normal_magnet' ? 'weak_magnet' : mode;
        chartInstance.current.overrideOverlay({
          id: ov.id,
          mode: klcMode,
          modeSensitivity: sensitivity,
        });
      });
      console.log(`[DEBUG] Magnet mode updated on ${overlays.length} existing overlays to: ${mode}`);
    }
  };

  const handleToggleMagnet = () => {
    const nextMode: 'normal' | 'normal_magnet' | 'weak_magnet' | 'strong_magnet' = magnetMode === 'normal' ? 'normal_magnet' : 'normal';
    setMagnetMode(nextMode);
    if (chartInstance.current) {
      // Write to chart instance so overlays.ts snapPointToCandle reads live state during drag
      chartInstance.current._magnetMode = nextMode;
      const overlays = chartInstance.current.getOverlays();
      overlays.forEach((ov: any) => {
        if (ov.id === 'custom_price_line_overlay' || ov.name === 'customPriceLine' || ov.id === 'session_breaks_overlay' || ov.name === 'sessionBreaks') return;
        const sensitivity = getMagnetSensitivity(nextMode, settings);
        // Map 'normal_magnet' -> 'weak_magnet' for klinecharts
        const klcMode = (nextMode as string) === 'normal_magnet' ? 'weak_magnet' : nextMode;
        chartInstance.current.overrideOverlay({
          id: ov.id,
          mode: klcMode,
          modeSensitivity: sensitivity,
        });
      });
      console.log(`[DEBUG] Magnet mode updated on ${overlays.length} existing overlays to: ${nextMode}`);
    }
  };

  // Data state
  const [assetName, setAssetName] = useState<string>('No Asset Loaded');
  const [hasData, setHasData] = useState<boolean>(false);
  const [isCheckingCache, setIsCheckingCache] = useState<boolean>(true);
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('1m');
  const [allTimeframesData, setAllTimeframesData] = useState<Record<string, KLineData[]>>({
    '1m': []
  });
  const [raw1mData, setRaw1mData] = useState<KLineData[]>([]);

  // Layout & Multi-Chart states
  const [layoutType, setLayoutType] = useState<string>(() => {
    return localStorage.getItem('layout_type') || '1';
  });
  const [activeChartIndex, setActiveChartIndex] = useState<number>(0);
  const [syncSymbol, setSyncSymbol] = useState<boolean>(() => {
    return localStorage.getItem('sync_symbol') !== 'false';
  });
  const [syncInterval, setSyncInterval] = useState<boolean>(() => {
    return localStorage.getItem('sync_interval') !== 'false';
  });
  const [syncCrosshair, setSyncCrosshair] = useState<boolean>(() => {
    return localStorage.getItem('sync_crosshair') !== 'false';
  });
  const [syncTime, setSyncTime] = useState<boolean>(() => {
    return localStorage.getItem('sync_time') !== 'false';
  });
  const [syncDateRange, setSyncDateRange] = useState<boolean>(() => {
    return localStorage.getItem('sync_date_range') !== 'false';
  });
  const [syncDrawings, setSyncDrawings] = useState<boolean>(() => {
    return localStorage.getItem('sync_drawings') !== 'false';
  });

  // Resizable layout sizes state (in percentages)
  const [layoutSizes, setLayoutSizes] = useState<Record<string, number[]>>(() => {
    const saved = localStorage.getItem('layout_sizes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      '2v': [50, 50],
      '2h': [50, 50],
      '3v': [33.33, 33.33, 33.34],
      '3h': [33.33, 33.33, 33.34],
      '3g1_main': [66.66, 33.34], // [Left width, Right width]
      '3g1_sub': [50, 50],       // [Right top height, Right bottom height]
      '3g2_main': [66.66, 33.34], // [Top height, Bottom height]
      '3g2_sub': [50, 50],       // [Bottom left width, Bottom right width]
      '4g_main': [50, 50],       // [Left col width, Right col width]
      '4g_left': [50, 50],       // [Left top height, Left bottom height]
      '4g_right': [50, 50],      // [Right top height, Right bottom height]
      '4v': [25, 25, 25, 25],
      '4h': [25, 25, 25, 25]
    };
  });

  // Array of symbols & timeframes for the 4 slots
  const [slots, setSlots] = useState<{ symbol: string | null; timeframe: Timeframe }[]>(() => {
    const saved = localStorage.getItem('layout_slots');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { symbol: null, timeframe: '1m' },
      { symbol: null, timeframe: '1m' },
      { symbol: null, timeframe: '1m' },
      { symbol: null, timeframe: '1m' }
    ];
  });
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState<boolean>(false);

  // Sync toolbar changes back to slots
  useEffect(() => {
    if (!hasData) return;
    setSlots(prev => {
      if (prev[activeChartIndex].symbol === assetName && prev[activeChartIndex].timeframe === activeTimeframe) {
        return prev;
      }
      const copy = [...prev];
      copy[activeChartIndex] = { symbol: assetName, timeframe: activeTimeframe };
      
      if (syncSymbol) {
        for (let i = 0; i < 4; i++) {
          copy[i].symbol = assetName;
        }
      }
      if (syncInterval) {
        for (let i = 0; i < 4; i++) {
          copy[i].timeframe = activeTimeframe;
        }
      }
      return copy;
    });
  }, [assetName, activeTimeframe, activeChartIndex, hasData, syncSymbol, syncInterval]);

  // Persist layout type, slot configurations, and split sizes to localStorage
  useEffect(() => {
    localStorage.setItem('layout_type', layoutType);
    layoutTypeRef.current = layoutType;
  }, [layoutType]);

  useEffect(() => {
    localStorage.setItem('layout_slots', JSON.stringify(slots));
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    localStorage.setItem('layout_sizes', JSON.stringify(layoutSizes));
  }, [layoutSizes]);

  useEffect(() => { syncTimeRef.current = syncTime; }, [syncTime]);
  useEffect(() => { syncDateRangeRef.current = syncDateRange; }, [syncDateRange]);
  useEffect(() => { syncDrawingsRef.current = syncDrawings; }, [syncDrawings]);
  useEffect(() => { activeChartIndexRef.current = activeChartIndex; }, [activeChartIndex]);

  useEffect(() => {
    localStorage.setItem('sync_symbol', String(syncSymbol));
    localStorage.setItem('sync_interval', String(syncInterval));
    localStorage.setItem('sync_crosshair', String(syncCrosshair));
    localStorage.setItem('sync_time', String(syncTime));
    localStorage.setItem('sync_date_range', String(syncDateRange));
    localStorage.setItem('sync_drawings', String(syncDrawings));
  }, [syncSymbol, syncInterval, syncCrosshair, syncTime, syncDateRange, syncDrawings]);

  useEffect(() => {
    syncDrawingsRef.current = syncDrawings;
    if (syncDrawings) {
      syncAllDrawings();
    } else {
      const visibleCount = getLayoutChartCount(layoutTypeRef.current);
      for (let i = 0; i < visibleCount; i++) {
        const chart = chartInstancesRef.current[i];
        if (chart) {
          const overlays = chart.getOverlays();
          overlays.forEach((ov: any) => {
            if (ov.isSyncedCopy) {
              chart.removeOverlay({ id: ov.id });
            }
          });
        }
      }
    }
  }, [syncDrawings]);

  useEffect(() => {
    syncCrosshairRef.current = syncCrosshair;
    if (!syncCrosshair) {
      const visibleCount = getLayoutChartCount(layoutType);
      for (let i = 0; i < visibleCount; i++) {
        const chart = chartInstancesRef.current[i];
        if (chart) {
          chart.executeAction('onCrosshairChange', {});
        }
      }
    }
  }, [syncCrosshair, layoutType]);

  const handleSelectChartSlot = async (index: number) => {
    if (index === activeChartIndex) return;
    setActiveChartIndex(index);
    const targetSlot = slots[index];
    if (targetSlot && targetSlot.symbol) {
      setAssetName(targetSlot.symbol);
      setActiveTimeframe(targetSlot.timeframe);
      if (chartInstancesRef.current[index]) {
        chartInstance.current = chartInstancesRef.current[index];
      }

      // Load target slot's resampled data into allTimeframesData cache for replay sync
      try {
        const tf = targetSlot.timeframe;
        let tfData: KLineData[] = [];
        const currentFilesMap = symbolFilesMap[targetSlot.symbol];
        
        if (importMode === 'folder' && currentFilesMap) {
          const fileKey = tf;
          const fileEntry = currentFilesMap[fileKey];
          if (fileEntry) {
            const text = await fileEntry.text();
            const result = parseCSV(text);
            if (result.data.length > 0) {
              tfData = result.data;
            }
          } else {
            const TF_PRIORITY = ['1m','2m','3m','4m','5m','10m','15m','30m','1h','2h','4h','6h','12h','D','W','M'];
            const foundTf = TF_PRIORITY.find(t => currentFilesMap[t]);
            if (foundTf) {
              const text = await currentFilesMap[foundTf].text();
              const result = parseCSV(text);
              if (result.data.length > 0) {
                const baseData = result.data;
                if (foundTf === tf) {
                  tfData = baseData;
                } else {
                  tfData = resample1mToTimeframe(baseData, getTimeframeMinutes(tf));
                }
              }
            }
          }
        }

        if (tfData.length === 0) {
          const rawData = getRawDataForSymbol(targetSlot.symbol);
          if (rawData.length > 0) {
            tfData = resample1mToTimeframe(rawData, getTimeframeMinutes(tf));
            if (settings.timezoneAdjustmentEnabled) {
              const offsetDiffMs = (settings.userTimezoneOffset - settings.brokerTimezoneOffset) * 60 * 1000;
              tfData = tfData.map(c => ({
                ...c,
                timestamp: c.timestamp + offsetDiffMs
              }));
            }
          }
        }

        if (tfData.length > 0) {
          setAllTimeframesData(prev => ({
            ...prev,
            [tf]: tfData
          }));
        }
      } catch (err) {
        console.error('[DEBUG] handleSelectChartSlot - Error loading slot data:', err);
      }
    }
  };

  // Generic drag splitter resizing handler
  const startResize = (
    key: string,
    index: number, // index of the divider
    direction: 'horizontal' | 'vertical',
    containerElement: HTMLDivElement | null
  ) => (mouseDownEvent: React.MouseEvent) => {
    if (!containerElement) return;
    mouseDownEvent.preventDefault();

    const rect = containerElement.getBoundingClientRect();
    const isVertical = direction === 'vertical';
    const totalSize = isVertical ? rect.width : rect.height;

    const initialSizes = [...layoutSizes[key]];
    const startPos = isVertical ? mouseDownEvent.clientX : mouseDownEvent.clientY;

    const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
      const currentPos = isVertical ? mouseMoveEvent.clientX : mouseMoveEvent.clientY;
      const delta = currentPos - startPos;
      const deltaPercent = (delta / totalSize) * 100;

      const newSizes = [...initialSizes];
      const sizeSum = newSizes[index] + newSizes[index + 1];
      let newSize1 = initialSizes[index] + deltaPercent;
      let newSize2 = initialSizes[index + 1] - deltaPercent;

      // Min width/height: 150px
      const minPercent = (150 / totalSize) * 100;

      if (newSize1 < minPercent) {
        newSize1 = minPercent;
        newSize2 = sizeSum - minPercent;
      } else if (newSize2 < minPercent) {
        newSize2 = minPercent;
        newSize1 = sizeSum - minPercent;
      }

      newSizes[index] = newSize1;
      newSizes[index + 1] = newSize2;

      setLayoutSizes(prev => ({
        ...prev,
        [key]: newSizes
      }));

      // Trigger redraws during drag
      const visibleCount = getLayoutChartCount(layoutType);
      for (let i = 0; i < visibleCount; i++) {
        chartInstancesRef.current[i]?.resize();
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleCrosshairSync = (sourceIndex: number, params: any) => {
    if (isSyncingCrosshairRef.current) return;
    if (!syncCrosshairRef.current) return;

    const currentLayout = layoutTypeRef.current;
    const currentSlots = slotsRef.current;
    const visibleCount = getLayoutChartCount(currentLayout);
    const sourceChart = chartInstancesRef.current[sourceIndex];
    if (!sourceChart) return;

    isSyncingCrosshairRef.current = true;
    try {
      const isCrosshairActive = params && typeof params.x === 'number' && typeof params.y === 'number';

      for (let i = 0; i < visibleCount; i++) {
        if (i === sourceIndex) continue;
        const targetChart = chartInstancesRef.current[i];
        if (!targetChart) continue;

        if (isCrosshairActive) {
          const sourceSymbol = currentSlots[sourceIndex]?.symbol;
          const targetSymbol = currentSlots[i]?.symbol;
          if (sourceSymbol && targetSymbol && sourceSymbol === targetSymbol) {
            const points = sourceChart.convertFromPixel([{ x: params.x, y: params.y }]);
            if (points && points.length > 0) {
              const { timestamp, value } = points[0];
              if (timestamp !== undefined && value !== undefined) {
                const coords = targetChart.convertToPixel([{ timestamp, value }]);
                if (coords && coords.length > 0) {
                  const { x, y } = coords[0];
                  if (x !== undefined && y !== undefined) {
                    targetChart.executeAction('onCrosshairChange', { x, y });
                  }
                }
              }
            }
          }
        } else {
          targetChart.executeAction('onCrosshairChange', {});
        }
      }
    } catch (err) {
      console.error('Error syncing crosshairs:', err);
    } finally {
      isSyncingCrosshairRef.current = false;
    }
  };

  const syncAllDrawings = () => {
    if (!syncDrawingsRef.current) return;
    const currentLayout = layoutTypeRef.current;
    const currentSlots = slotsRef.current;
    const visibleCount = getLayoutChartCount(currentLayout);

    // 0. Sync back modified synced copies to original drawings
    for (let i = 0; i < visibleCount; i++) {
      // Only sync back from the active slot where the user is interacting!
      if (i !== activeChartIndexRef.current) continue;

      const chart = chartInstancesRef.current[i];
      if (!chart) continue;

      const overlays = (chart as any).getOverlays();
      overlays.forEach((ov: any) => {
        const syncMatch = ov.id?.match(/^sync_(.+)_from_(\d+)$/);
        if (syncMatch) {
          const originalId = syncMatch[1];
          const sourceIndex = parseInt(syncMatch[2]);
          const sourceChart = chartInstancesRef.current[sourceIndex];
          if (sourceChart) {
            const originalOverlay = (sourceChart as any).getOverlays().find((o: any) => o.id === originalId);
            if (originalOverlay) {
              const pointsChanged = JSON.stringify(originalOverlay.points) !== JSON.stringify(ov.points);
              const extendDataChanged = JSON.stringify(originalOverlay.extendData) !== JSON.stringify(ov.extendData);
              const lockChanged = originalOverlay.lock !== ov.lock;
              if (pointsChanged || extendDataChanged || lockChanged) {
                (sourceChart as any).overrideOverlay({
                  id: originalId,
                  points: JSON.parse(JSON.stringify(ov.points)),
                  extendData: ov.extendData,
                  lock: ov.lock,
                  styles: {
                    point: ov.lock ? {
                      radius: 0,
                      activeRadius: 0,
                      color: 'transparent',
                      borderColor: 'transparent',
                      borderSize: 0,
                      activeColor: 'transparent',
                      activeBorderColor: 'transparent',
                      activeBorderSize: 0
                    } : {
                      radius: 4.5,
                      activeRadius: 5.5,
                      color: '#ffffff',
                      borderColor: '#2196F3',
                      borderSize: 1.5,
                      activeColor: '#ffffff',
                      activeBorderColor: '#2196F3',
                      activeBorderSize: 2
                    }
                  }
                });
              }
            }
          }
        }
      });
    }

    // 1. Gather all original drawings from all visible charts
    const originalDrawingsBySymbol: Record<string, { chartIndex: number; overlay: any }[]> = {};

    for (let i = 0; i < visibleCount; i++) {
      const chart = chartInstancesRef.current[i];
      if (!chart) continue;

      const symbol = currentSlots[i]?.symbol;
      if (!symbol) continue;

      const overlays = (chart as any).getOverlays();
      const originals = overlays.filter(
        (ov: any) =>
          !ov.id?.startsWith('sync_') &&
          ov.id !== 'custom_price_line_overlay' &&
          ov.name !== 'customPriceLine' &&
          ov.id !== 'session_breaks_overlay' &&
          ov.name !== 'sessionBreaks'
      );

      if (!originalDrawingsBySymbol[symbol]) {
        originalDrawingsBySymbol[symbol] = [];
      }
      originals.forEach((ov: any) => {
        originalDrawingsBySymbol[symbol].push({ chartIndex: i, overlay: ov });
      });
    }

    // 2. Apply/sync drawings to each target chart
    for (let i = 0; i < visibleCount; i++) {
      const targetChart = chartInstancesRef.current[i];
      if (!targetChart) continue;

      const symbol = currentSlots[i]?.symbol;
      if (!symbol) {
        // Clear all synced copies if no symbol
        const targetOverlays = (targetChart as any).getOverlays();
        targetOverlays.forEach((ov: any) => {
          if (ov.id?.startsWith('sync_')) {
            (targetChart as any).removeOverlay({ id: ov.id });
          }
        });
        continue;
      }

      const activeOriginals = originalDrawingsBySymbol[symbol] || [];
      const targetOverlays = (targetChart as any).getOverlays();

      // Find synced copies currently on this target chart
      const existingSyncedCopies = targetOverlays.filter((ov: any) => ov.id?.startsWith('sync_'));

      // Determine which synced copies should exist on this target chart
      const desiredCopies = activeOriginals.filter(item => item.chartIndex !== i);
      const desiredCopyIds = new Set(desiredCopies.map(item => `sync_${item.overlay.id}_from_${item.chartIndex}`));

      // Remove any synced copies that are no longer needed
      existingSyncedCopies.forEach((copy: any) => {
        if (!desiredCopyIds.has(copy.id)) {
          (targetChart as any).removeOverlay({ id: copy.id });
        }
      });

      // Create or update desired synced copies
      desiredCopies.forEach(item => {
        const orig = item.overlay;
        const sourceIndex = item.chartIndex;
        const syncId = `sync_${orig.id}_from_${sourceIndex}`;
        const existingCopy = targetOverlays.find((ov: any) => ov.id === syncId);

        const interactiveOptions = getInteractiveOverlayOptions(
          orig.name,
          { current: targetChart },
          chartInstancesRef,
          isShiftPressedRef,
          syncAllDrawings,
          setActiveTool
        );

        const overlayOptions: any = {
          ...interactiveOptions,
          name: orig.name,
          id: syncId,
          paneId: orig.paneId || 'candle_pane',
          points: JSON.parse(JSON.stringify(orig.points)),
          extendData: JSON.parse(JSON.stringify(orig.extendData || {})),
          lock: orig.lock,
          styles: orig.lock ? {
            point: {
              radius: 0,
              activeRadius: 0,
              color: 'transparent',
              borderColor: 'transparent',
              borderSize: 0,
              activeColor: 'transparent',
              activeBorderColor: 'transparent',
              activeBorderSize: 0
            }
          } : {
            point: {
              radius: 4.5,
              activeRadius: 5.5,
              color: '#ffffff',
              borderColor: '#2196F3',
              borderSize: 1.5,
              activeColor: '#ffffff',
              activeBorderColor: '#2196F3',
              activeBorderSize: 2
            }
          },
          onRemoved: (event: any) => {
            console.log(`[DEBUG] synced copy - onRemoved callback fired for id: ${event.overlay.id}`);
            const syncMatch = event.overlay.id?.match(/^sync_(.+)_from_(\d+)$/);
            if (syncMatch) {
              const originalId = syncMatch[1];
              const sourceIndex = parseInt(syncMatch[2]);
              const sourceChart = chartInstancesRef.current[sourceIndex];
              if (sourceChart) {
                (sourceChart as any).removeOverlay({ id: originalId });
              }
            }
            setTimeout(() => {
              syncAllDrawings();
            }, 50);
          }
        };

        if (orig.name !== 'rect' && orig.name !== 'priceChannel' && orig.name !== 'simpleAnnotation') {
          overlayOptions.onPressedMoveStart = (event: any) => {
            const pts = event.chart.convertToPixel(event.overlay.points, { paneId: 'candle_pane' });
            let closestIndex = 0;
            let minDistance = Infinity;
            pts.forEach((pt: any, idx: number) => {
              if (pt) {
                const dist = Math.sqrt((pt.x - event.x) ** 2 + (pt.y - event.y) ** 2);
                if (dist < minDistance) {
                  minDistance = dist;
                  closestIndex = idx;
                }
              }
            });
            const isHandle = minDistance < 12;
            const startMousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];
            event.chart.overrideOverlay({
              id: event.overlay.id,
              extendData: { 
                draggedIndex: isHandle ? closestIndex : null,
                startPoints: JSON.parse(JSON.stringify(event.overlay.points)),
                startMousePt
              }
            });

            if (event.chart._initMultiMove) {
              event.chart._initMultiMove(event);
            }
          };

          overlayOptions.onPressedMoving = (event: any) => {
            const draggedIndex = event.overlay.extendData?.draggedIndex;
            if (draggedIndex === undefined) return;

            if (draggedIndex === null) {
              const startPoints = event.overlay.extendData?.startPoints;
              const startMousePt = event.overlay.extendData?.startMousePt;
              const currentMousePt = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' })?.[0];

              if (startPoints && startMousePt && currentMousePt) {
                const deltaTimestamp = currentMousePt.timestamp - startMousePt.timestamp;
                const deltaValue = currentMousePt.value - startMousePt.value;
                const deltaDataIndex = (currentMousePt.dataIndex !== undefined && startMousePt.dataIndex !== undefined)
                  ? currentMousePt.dataIndex - startMousePt.dataIndex
                  : 0;

                const newPoints = startPoints.map((pt: any) => ({
                  ...pt,
                  timestamp: pt.timestamp + deltaTimestamp,
                  value: pt.value + deltaValue,
                  dataIndex: (pt.dataIndex !== undefined) ? pt.dataIndex + deltaDataIndex : undefined
                }));

                event.chart.overrideOverlay({
                  id: event.overlay.id,
                  points: newPoints
                });
              }

              if (event.chart._handleMultiMove) {
                event.chart._handleMultiMove(event);
              }
              if (event.chart._onDrawingSync) {
                event.chart._onDrawingSync();
              }
              return;
            }

            const points = event.overlay.points;
            if (points && draggedIndex !== null) {
              const rawX = event.x;
              const rawY = event.y;
              const mode: string = event.chart._magnetMode ?? 'normal';
              const isShift = event.chart._isShiftPressedRef?.current || false;

              if (orig.name === 'segment' && isShift) {
                const baseIndex = draggedIndex === 0 ? 1 : 0;
                const pBase = points[baseIndex];
                if (pBase) {
                  const pixels = event.chart.convertToPixel([pBase], { paneId: 'candle_pane' });
                  if (pixels && pixels.length > 0 && pixels[0]) {
                    const x1 = pixels[0].x;
                    const y1 = pixels[0].y;
                    const x2 = rawX;
                    const y2 = rawY;
                    const dx = x2 - x1;
                    const dy = y2 - y1;
                    const r = Math.sqrt(dx * dx + dy * dy);
                    if (r > 0) {
                      const angle = Math.atan2(dy, dx);
                      const angleSteps = Math.PI / 4;
                      const nearestStep = Math.round(angle / angleSteps);
                      const snappedAngle = nearestStep * angleSteps;
                      const projLength = dx * Math.cos(snappedAngle) + dy * Math.sin(snappedAngle);
                      const x2_snapped = x1 + projLength * Math.cos(snappedAngle);
                      const y2_snapped = y1 + projLength * Math.sin(snappedAngle);
                      const snappedPoints = event.chart.convertFromPixel([{ x: x2_snapped, y: y2_snapped }], { paneId: 'candle_pane' });
                      if (snappedPoints && snappedPoints.length > 0 && snappedPoints[0]) {
                        const newPoints = [...points];
                        newPoints[draggedIndex] = snappedPoints[0];
                        event.chart.overrideOverlay({
                          id: event.overlay.id,
                          points: newPoints
                        });
                        if (event.chart._onDrawingSync) {
                          event.chart._onDrawingSync();
                        }
                        return;
                      }
                    }
                  }
                }
              }

              let snapped = null;
              if (mode === 'strong' || (mode === 'weak' && !event.isSelectionPoint)) {
                snapped = snapPointToCandle(event, rawX, rawY);
              }
              const mousePt = event.chart.convertFromPixel([{ x: rawX, y: rawY }], { paneId: 'candle_pane' })?.[0];
              const targetPt = snapped || mousePt;

              if (targetPt) {
                const newPoints = [...points];
                newPoints[draggedIndex] = targetPt;
                event.chart.overrideOverlay({
                  id: event.overlay.id,
                  points: newPoints
                });
              }

              if (event.chart._onDrawingSync) {
                event.chart._onDrawingSync();
              }
            }
          };
        } else if (orig.name === 'simpleAnnotation') {
          overlayOptions.onPressedMoveStart = (event: any) => {
            if (event.chart._initMultiMove) {
              event.chart._initMultiMove(event);
            }
          };
          overlayOptions.onPressedMoving = (event: any) => {
            const currentPoints = event.chart.convertFromPixel([{ x: event.x, y: event.y }], { paneId: 'candle_pane' });
            if (currentPoints && currentPoints.length > 0 && currentPoints[0]) {
              event.chart.overrideOverlay({
                id: event.overlay.id,
                points: currentPoints
              });
              if (event.chart._onDrawingSync) {
                event.chart._onDrawingSync();
              }
            }
          };
        }

        if (existingCopy) {
          const pointsChanged = JSON.stringify(existingCopy.points) !== JSON.stringify(overlayOptions.points);
          const extendDataChanged = JSON.stringify(existingCopy.extendData) !== JSON.stringify(overlayOptions.extendData);
          if (pointsChanged || extendDataChanged) {
            (targetChart as any).overrideOverlay({
              id: syncId,
              points: overlayOptions.points,
              extendData: overlayOptions.extendData,
              styles: overlayOptions.styles
            });
          }
        } else {
          (targetChart as any).createOverlay(overlayOptions);
        }
      });
    }
  };

  const getTimeframeMs = (tf: string): number => {
    const num = parseInt(tf);
    const unit = tf.replace(String(num), '');
    if (!unit || unit === 'm') return num * 60 * 1000;
    if (unit === 'h') return num * 60 * 60 * 1000;
    if (unit === 'D') return num * 24 * 60 * 60 * 1000;
    if (unit === 'W') return num * 7 * 24 * 60 * 60 * 1000;
    return 60 * 1000;
  };

  const getChartBarSpace = (chart: any): number => {
    const space = chart.getBarSpace();
    if (typeof space === 'object' && space !== null) {
      return space.bar || space.barSpace || 6;
    }
    if (typeof space === 'number') {
      return space;
    }
    return 6;
  };

  const getTrueOffsetRightDistance = (chart: any): number => {
    if (chart && chart._chartStore && typeof chart._chartStore._lastBarRightSideDiffBarCount === 'number') {
      const space = getChartBarSpace(chart);
      return chart._chartStore._lastBarRightSideDiffBarCount * space;
    }
    return chart ? chart.getOffsetRightDistance() : 0;
  };

  const findDataIndexByTimestamp = (data: any[], timestamp: number, tfMs: number): number => {
    if (data.length === 0) return 0;
    if (timestamp < data[0].timestamp) {
      const diff = data[0].timestamp - timestamp;
      return -Math.round(diff / tfMs);
    }
    if (timestamp > data[data.length - 1].timestamp) {
      const diff = timestamp - data[data.length - 1].timestamp;
      return (data.length - 1) + Math.round(diff / tfMs);
    }
    let low = 0;
    let high = data.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (data[mid].timestamp === timestamp) return mid;
      if (data[mid].timestamp < timestamp) low = mid + 1;
      else high = mid - 1;
    }
    if (low >= data.length) return data.length - 1;
    if (high < 0) return 0;
    return Math.abs(data[low].timestamp - timestamp) < Math.abs(data[high].timestamp - timestamp) ? low : high;
  };

  const centerTimestampOnChart = (chart: any, timestamp: number, tfMs: number) => {
    const data = chart.getDataList();
    if (data.length === 0) return;
    const targetIndex = findDataIndexByTimestamp(data, timestamp, tfMs);
    const size = chart.getSize();
    const width = size?.width || 800;
    const space = getChartBarSpace(chart);
    const offsetRightDistance = (targetIndex - data.length) * space + (width / 2);
    chart.setOffsetRightDistance(offsetRightDistance);
  };

  const handleTimeSync = (sourceIndex: number, param: any) => {
    if (isSyncingRangeRef.current || !syncTimeRef.current) return;
    const timestamp = param?.data?.current?.timestamp || param?.data?.timestamp || param?.timestamp;
    if (!timestamp) return;

    const currentLayout = layoutTypeRef.current;
    const visibleCount = getLayoutChartCount(currentLayout);
    
    isSyncingRangeRef.current = true;
    try {
      for (let i = 0; i < visibleCount; i++) {
        const targetChart = chartInstancesRef.current[i];
        if (!targetChart) continue;
        const targetTfMs = getTimeframeMs(slotsRef.current[i]?.timeframe || '1m');
        centerTimestampOnChart(targetChart, timestamp, targetTfMs);
      }

      if (syncCrosshairRef.current) {
        setTimeout(() => {
          const sourceChart = chartInstancesRef.current[sourceIndex];
          if (sourceChart) {
            const sourceData = sourceChart.getDataList();
            const sourceIdx = findDataIndexByTimestamp(sourceData, timestamp, getTimeframeMs(slotsRef.current[sourceIndex]?.timeframe || '1m'));
            const sourceCandle = sourceData[sourceIdx];
            if (sourceCandle) {
              const coords = sourceChart.convertToPixel([{ timestamp, value: sourceCandle.close }]);
              if (coords && coords.length > 0) {
                sourceChart.executeAction('onCrosshairChange', { x: coords[0].x, y: coords[0].y });
              }
            }
          }

          for (let i = 0; i < visibleCount; i++) {
            if (i === sourceIndex) continue;
            const targetChart = chartInstancesRef.current[i];
            if (!targetChart) continue;

            const targetData = targetChart.getDataList();
            const targetTfMs = getTimeframeMs(slotsRef.current[i]?.timeframe || '1m');
            const targetIdx = findDataIndexByTimestamp(targetData, timestamp, targetTfMs);
            const targetCandle = targetData[targetIdx];
            if (targetCandle) {
              const coords = targetChart.convertToPixel([{ timestamp, value: targetCandle.close }]);
              if (coords && coords.length > 0) {
                const { x, y } = coords[0];
                if (x !== undefined && y !== undefined) {
                  targetChart.executeAction('onCrosshairChange', { x, y });
                }
              }
            }
          }
        }, 50);
      }
    } catch (err) {
      console.error('Error syncing time:', err);
    } finally {
      isSyncingRangeRef.current = false;
    }
  };

  const handleDateRangeSync = (sourceIndex: number) => {
    if (isSyncingRangeRef.current || !syncDateRangeRef.current) return;

    const currentLayout = layoutTypeRef.current;
    const currentSlots = slotsRef.current;
    const visibleCount = getLayoutChartCount(currentLayout);
    const sourceChart = chartInstancesRef.current[sourceIndex];
    if (!sourceChart) return;

    const sourceData = sourceChart.getDataList();
    const sourceVisibleRange = sourceChart.getVisibleRange();
    if (sourceData.length === 0 || !sourceVisibleRange) return;

    isSyncingRangeRef.current = true;
    try {
      const sourceTfMs = getTimeframeMs(currentSlots[sourceIndex]?.timeframe || '1m');
      
      const fromIdx = Math.round(sourceVisibleRange.realFrom);
      let t1: number;
      if (fromIdx < 0) {
        t1 = sourceData[0].timestamp + fromIdx * sourceTfMs;
      } else if (fromIdx >= sourceData.length) {
        t1 = sourceData[sourceData.length - 1].timestamp + (fromIdx - (sourceData.length - 1)) * sourceTfMs;
      } else {
        t1 = sourceData[fromIdx].timestamp;
      }

      const toIdx = Math.round(sourceVisibleRange.realTo);
      let t2: number;
      if (toIdx < 0) {
        t2 = sourceData[0].timestamp + toIdx * sourceTfMs;
      } else if (toIdx >= sourceData.length) {
        t2 = sourceData[sourceData.length - 1].timestamp + (toIdx - (sourceData.length - 1)) * sourceTfMs;
      } else {
        t2 = sourceData[toIdx].timestamp;
      }

      if (isNaN(t1) || isNaN(t2)) return;

      for (let i = 0; i < visibleCount; i++) {
        if (i === sourceIndex) continue;
        const targetChart = chartInstancesRef.current[i];
        if (!targetChart) continue;
        
        const targetData = targetChart.getDataList();
        if (targetData.length === 0) continue;

        const targetTfMs = getTimeframeMs(currentSlots[i]?.timeframe || '1m');
        const targetSymbol = currentSlots[i]?.symbol;
        const sourceSymbol = currentSlots[sourceIndex]?.symbol;

        if (sourceSymbol === targetSymbol && currentSlots[i]?.timeframe === currentSlots[sourceIndex]?.timeframe) {
          const oldSpace = getChartBarSpace(sourceChart);
          const oldOffset = getTrueOffsetRightDistance(sourceChart);
          targetChart.setBarSpace(oldSpace);
          targetChart.setOffsetRightDistance(oldOffset);
        } else {
          const targetFrom = findDataIndexByTimestamp(targetData, t1, targetTfMs);
          const targetTo = findDataIndexByTimestamp(targetData, t2, targetTfMs);
          const visibleBarsCount = Math.max(1, targetTo - targetFrom);
          const targetWidth = targetChart.getSize()?.width || 800;
          const desiredBarSpace = targetWidth / visibleBarsCount;
          
          targetChart.setBarSpace(desiredBarSpace);
          const actualSpace = getChartBarSpace(targetChart);
          const offsetRightDistance = (targetTo - targetData.length) * actualSpace;
          
          targetChart.setOffsetRightDistance(offsetRightDistance);
        }
      }
    } catch (err) {
      console.error('Error syncing date ranges:', err);
    } finally {
      isSyncingRangeRef.current = false;
    }
  };

  const getRawDataForSymbol = (symbolName: string | null): KLineData[] => {
    if (!symbolName) return [];
    const watchlistMatch = watchlistSymbols.find(s => s.name === symbolName);
    if (watchlistMatch && watchlistMatch.raw1m && watchlistMatch.raw1m.length > 0) {
      return watchlistMatch.raw1m;
    }
    if (symbolName === assetName) {
      return raw1mData;
    }
    return [];
  };

  const getRaw1mDataForSupplement = async (
    symbolName: string,
    currentFilesMap: Record<string, Record<string, File>>
  ): Promise<KLineData[]> => {
    const rawInMemory = getRawDataForSymbol(symbolName);
    if (rawInMemory && rawInMemory.length > 0) {
      return rawInMemory;
    }
    const files = currentFilesMap[symbolName];
    if (files && files['1m']) {
      try {
        const text = await files['1m'].text();
        const parsed = parseCSV(text);
        if (parsed.parsedCount > 0) {
          return parsed.data;
        }
      } catch (err) {
        console.error(`[DEBUG] getRaw1mDataForSupplement - failed to parse 1m file for ${symbolName}:`, err);
      }
    }
    return [];
  };

  const supplementTimeframeData = (
    tfData: KLineData[],
    rawData1m: KLineData[],
    tf: string,
    timezoneAdjustmentEnabled: boolean,
    userTimezoneOffset: number,
    brokerTimezoneOffset: number
  ): KLineData[] => {
    if (rawData1m.length === 0 || tfData.length === 0) return tfData;
    const minutes = getTimeframeMinutes(tf);
    if (minutes === 1) return tfData;

    const lastTfTimestamp = tfData[tfData.length - 1].timestamp;

    let adjusted1m = rawData1m;
    if (timezoneAdjustmentEnabled) {
      const offsetDiffMs = (userTimezoneOffset - brokerTimezoneOffset) * 60 * 1000;
      adjusted1m = rawData1m.map(c => ({
        ...c,
        timestamp: c.timestamp + offsetDiffMs
      }));
    }

    const resampled1m = resample1mToTimeframe(adjusted1m, minutes);
    if (resampled1m.length === 0) return tfData;

    const mergeStartIndex = resampled1m.findIndex(c => c.timestamp >= lastTfTimestamp);
    if (mergeStartIndex !== -1) {
      const newCandles = resampled1m.slice(mergeStartIndex);
      const baseTfData = tfData.filter(c => c.timestamp < lastTfTimestamp);
      return [...baseTfData, ...newCandles];
    }
    return tfData;
  };

  const loadDataForSlot = async (index: number, chart: any) => {
    if (!chart) return;
    const slot = slots[index];
    if (!slot || !slot.symbol) return;

    const tf = slot.timeframe;
    let tfData: KLineData[] = [];

    // Check if we are in Folder Mode and have directory files for this symbol
    const files = symbolFilesMap[slot.symbol];
    if (files) {
      const bestMatch = getBestTimeframeFile(files, tf);
      if (bestMatch) {
        try {
          const text = await bestMatch.file.text();
          const result = parseCSV(text);
          if (result.parsedCount > 0) {
            let baseData = result.data;
            if (settings.timezoneAdjustmentEnabled) {
              const offsetDiffMs = (settings.userTimezoneOffset - settings.brokerTimezoneOffset) * 60 * 1000;
              baseData = result.data.map(c => ({
                ...c,
                timestamp: c.timestamp + offsetDiffMs
              }));
            }
            if (bestMatch.tf === tf) {
              tfData = baseData;
            } else {
              tfData = resample1mToTimeframe(baseData, getTimeframeMinutes(tf));
            }
          }
        } catch (err) {
          console.error(`[DEBUG] loadDataForSlot - Error parsing folder file for slot ${index}:`, err);
        }
      }
    }

    if (tfData.length > 0) {
      const raw1m = await getRaw1mDataForSupplement(slot.symbol, symbolFilesMap);
      if (raw1m.length > 0) {
        tfData = supplementTimeframeData(
          tfData,
          raw1m,
          tf,
          settings.timezoneAdjustmentEnabled,
          settings.userTimezoneOffset,
          settings.brokerTimezoneOffset
        );
      }
    }

    // Fallback to Single File Mode in-memory raw data if folder mode files aren't present or failed
    if (tfData.length === 0) {
      const rawData = getRawDataForSymbol(slot.symbol);
      if (rawData.length > 0) {
        tfData = resample1mToTimeframe(rawData, getTimeframeMinutes(tf));
        if (settings.timezoneAdjustmentEnabled) {
          const offsetDiffMs = (settings.userTimezoneOffset - settings.brokerTimezoneOffset) * 60 * 1000;
          tfData = tfData.map(c => ({
            ...c,
            timestamp: c.timestamp + offsetDiffMs
          }));
        }
      }
    }

    if (tfData.length === 0) {
      console.warn(`[DEBUG] loadDataForSlot - No data found for slot ${index} (${slot.symbol})`);
      return;
    }

    const activeReplay = isReplayActive;
    const alignedTimestamp = activeReplay ? replayCurrentTimestamp : null;
    const visibleData = activeReplay && alignedTimestamp !== null
      ? tfData.filter(d => d.timestamp <= alignedTimestamp)
      : tfData;

    if (
      chart._loadedSymbol === slot.symbol &&
      chart._loadedTimeframe === tf &&
      chart._loadedReplayActive === activeReplay &&
      chart._loadedReplayTimestamp === alignedTimestamp &&
      chart._loadedDataLength === visibleData.length &&
      chart._loadedDataVersion === dataVersionRef.current
    ) {
      return;
    }

    chart._loadedSymbol = slot.symbol;
    chart._loadedTimeframe = tf;
    chart._loadedReplayActive = activeReplay;
    chart._loadedReplayTimestamp = alignedTimestamp;
    chart._loadedDataLength = visibleData.length;
    chart._loadedDataVersion = dataVersionRef.current;

    const precision = settings.pricePrecision !== 0 ? settings.pricePrecision : detectPricePrecision(tfData);
    chart.setSymbol({ ticker: slot.symbol, pricePrecision: precision, volumePrecision: 4 });

    let span = 1;
    let type: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'minute';
    if (tf.endsWith('m')) {
      span = parseInt(tf, 10) || 1;
      type = 'minute';
    } else if (tf.endsWith('H') || tf.endsWith('h')) {
      span = parseInt(tf, 10) || 1;
      type = 'hour';
    } else if (tf.endsWith('D') || tf.endsWith('d')) {
      span = parseInt(tf, 10) || 1;
      type = 'day';
    } else if (tf.endsWith('W') || tf.endsWith('w')) {
      span = parseInt(tf, 10) || 1;
      type = 'week';
    } else if (tf.endsWith('M')) {
      span = parseInt(tf, 10) || 1;
      type = 'month';
    }

    chart.setDataLoader({
      getBars: ({ type: loadType, callback }: any) => {
        if (loadType === 'init') {
          callback(visibleData);
        } else {
          callback([]);
        }
      }
    });

    chart.resetData();
    chart.setPeriod({ type, span });
    chart.resize();
  };

  // 1d. Slot Data Loader Effect
  useEffect(() => {
    if (!hasData) return;
    const visibleCount = getLayoutChartCount(layoutType);
    
    isSyncingRangeRef.current = true;
    const promises: Promise<void>[] = [];
    try {
      for (let i = 0; i < visibleCount; i++) {
        if (isReplayActive && i === activeChartIndex) continue;
        const chart = chartInstancesRef.current[i];
        if (chart) {
          promises.push(loadDataForSlot(i, chart));
        }
      }
    } finally {
      setTimeout(() => {
        isSyncingRangeRef.current = false;
      }, 100);
    }

    Promise.all(promises).then(() => {
      syncAllDrawings();
    }).catch(err => {
      console.error('[DEBUG] Error loading slots data:', err);
    });
  }, [slots, layoutType, hasData, isReplayActive, replayCurrentTimestamp, activeChartIndex]);

  // Custom Timeframes state
  const [customTimeframes, setCustomTimeframes] = useState<{ label: string; value: string; minutes: number }[]>([]);
  const [isTfDropdownOpen, setIsTfDropdownOpen] = useState<boolean>(false);
  const [customValue, setCustomValue] = useState<number>(10);
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks' | 'months'>('minutes');
  const [tempBrokerOffset, setTempBrokerOffset] = useState<string>('exchange');

  // Import Mode selection states
  const [importMode, setImportMode] = useState<'single' | 'folder'>(() => {
    return (localStorage.getItem('tv_clone_import_mode') as 'single' | 'folder') || 'single';
  });
  const changeImportMode = (mode: 'single' | 'folder') => {
    setImportMode(mode);
    localStorage.setItem('tv_clone_import_mode', mode);
  };
  const [folderSymbol, setFolderSymbol] = useState<string>('');
  const [selectedFolderSymbols, setSelectedFolderSymbols] = useState<Record<string, boolean>>({});
  const [folderFilesList, setFolderFilesList] = useState<{ name: string; size: number; timeframe: string | null }[]>([]);
  const [symbolFilesMap, setSymbolFilesMap] = useState<Record<string, Record<string, File>>>({});
  const [isBrokerTfDropdownOpen, setIsBrokerTfDropdownOpen] = useState<boolean>(false);
  const [savedFolderHandle, setSavedFolderHandle] = useState<any>(null);
  const [savedFolderHandles, setSavedFolderHandles] = useState<any[]>([]);
  const [isVerifyingFolder, setIsVerifyingFolder] = useState<boolean>(false);

  // Right panel state (Watchlist / Object Tree)
  const [activeRightTab, setActiveRightTab] = useState<'watchlist' | 'objectTree' | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(260);
  const [isResizingRightPanel, setIsResizingRightPanel] = useState<boolean>(false);
  const isResizingRightPanelRef = useRef<boolean>(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRightPanelRef.current) {
        // Calculate new width: viewport width - mouse X - right icon bar width (48px)
        const newWidth = window.innerWidth - e.clientX - 48;
        if (newWidth >= 200 && newWidth <= 600) {
          setRightPanelWidth(newWidth);
        }
      }
    };
    const handleMouseUp = () => {
      if (isResizingRightPanelRef.current) {
        isResizingRightPanelRef.current = false;
        setIsResizingRightPanel(false);
        document.body.style.cursor = 'default';
        // Resize charts after panel resizes
        setTimeout(() => {
          chartInstancesRef.current.forEach(chart => chart?.resize());
        }, 50);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const [watchlistSymbols, setWatchlistSymbols] = useState<{ name: string; raw1m: KLineData[]; settings: any }[]>([]);
  const [activeWatchlistSymbol, setActiveWatchlistSymbol] = useState<string | null>(null);
  const watchlistAddInputRef = useRef<HTMLInputElement>(null);
  const [watchlistToast, setWatchlistToast] = useState<{ msg: string; type: 'error' | 'info' } | null>(null);
  const [pendingRemoveSymbol, setPendingRemoveSymbol] = useState<string | null>(null);
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string } | null>(null);
  const brokerTfDropdownRef = useRef<HTMLDivElement>(null);
  const [isFooterTzOpen, setIsFooterTzOpen] = useState<boolean>(false);
  const footerTzDropdownRef = useRef<HTMLDivElement>(null);
  const [isLoadingSymbol, setIsLoadingSymbol] = useState<boolean>(false);

  // Parser logs & metrics state
  const [parseFeedback, setParseFeedback] = useState<{
    errors: string[];
    headers: string[];
    rowCount: number;
    parsedCount: number;
    skippedCount: number;
  } | null>(null);
  const [showStats, setShowStats] = useState<boolean>(false);

  // UI state
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Drawing selection states
  const [selectedOverlayIds, setSelectedOverlayIds] = useState<string[]>([]);
  const [drawingTrigger, setDrawingTrigger] = useState<number>(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [isDrawingSettingsOpen, setIsDrawingSettingsOpen] = useState<boolean>(false);
  const [drawingSettingsOverlayId, setDrawingSettingsOverlayId] = useState<string | null>(null);
  
  const getSelectedSettingsOverlay = () => {
    if (!drawingSettingsOverlayId) return null;
    for (let i = 0; i < chartInstancesRef.current.length; i++) {
      const chart = chartInstancesRef.current[i];
      if (chart) {
        const overlay = chart.getOverlays().find((o: any) => o.id === drawingSettingsOverlayId);
        if (overlay) return overlay;
      }
    }
    return null;
  };

  const isCtrlPressedRef = useRef<boolean>(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);



  // Chart Settings state (loaded from localStorage or default to TradingView Classic)
  const [settings, setSettings] = useState<ChartSettings>(() => {
    const saved = localStorage.getItem('tv_clone_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...PRESET_SETTINGS.classic, ...parsed };
      } catch (e) {
        // Fallback
      }
    }
    return PRESET_SETTINGS.classic;
  });
  // Load Cached Dataset from IndexedDB on startup
  useEffect(() => {
    const initCachedData = async () => {
      try {
        const cachedHandles = await loadDirectoryHandles();
        const cachedHandle = await loadDirectoryHandle();
        
        let handles = cachedHandles || [];
        if (handles.length === 0 && cachedHandle) {
          handles = [cachedHandle];
          await saveDirectoryHandles(handles);
        }
        
        const storedImportMode = localStorage.getItem('tv_clone_import_mode');
        if (handles.length > 0) {
          setSavedFolderHandles(handles);
          setSavedFolderHandle(handles[0]);
          if (storedImportMode === 'folder' || !storedImportMode) {
            setImportMode('folder');
            localStorage.setItem('tv_clone_import_mode', 'folder');
          }
          
          // Check if permission is already granted on startup for all handles
          const options = { mode: 'read' as const };
          try {
            let allGranted = true;
            for (const h of handles) {
              if ((await (h as any).queryPermission(options)) !== 'granted') {
                allGranted = false;
                break;
              }
            }
            if (allGranted) {
              console.log('[DEBUG] All directory permissions already granted on startup. Auto-loading folders...');
              await handleSelectFoldersAPI(handles, true);
              setIsCheckingCache(false);
              return;
            }
          } catch (pe) {
            console.error('Error querying directory permission:', pe);
          }
        }

        const cached = await loadChartDataFromIndexedDB();
        if (cached && cached.raw1mData && cached.raw1mData.length > 0 && cached.assetName) {
          console.log(`[DEBUG] IndexedDB - Found cached dataset for symbol: ${cached.assetName}. Restoring...`);
          
          setRaw1mData(cached.raw1mData);
          setAssetName(cached.assetName);
          
          // Wait for the chart instance to be ready, then bind the data
          const checkChartInstance = setInterval(() => {
            if (chartInstance.current) {
              clearInterval(checkChartInstance);
              
              const restoredTf = (cached.activeTimeframe || '1m') as Timeframe;
              
              // Set settings and bind data
              const precision = settings.pricePrecision !== 0 ? settings.pricePrecision : detectPricePrecision(cached.raw1mData || []);
              chartInstance.current.setSymbol({ ticker: cached.assetName!, pricePrecision: precision, volumePrecision: 4 });
              
              // Map timeframe values to type and span parameters
              let span = 1;
              let type: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'minute';
              if (restoredTf.endsWith('m')) {
                span = parseInt(restoredTf, 10) || 1;
                type = 'minute';
              } else if (restoredTf.endsWith('H') || restoredTf.endsWith('h')) {
                span = parseInt(restoredTf, 10) || 1;
                type = 'hour';
              } else if (restoredTf.endsWith('D') || restoredTf.endsWith('d')) {
                span = parseInt(restoredTf, 10) || 1;
                type = 'day';
              } else if (restoredTf.endsWith('W') || restoredTf.endsWith('w')) {
                span = parseInt(restoredTf, 10) || 1;
                type = 'week';
              } else if (restoredTf.endsWith('M')) {
                span = parseInt(restoredTf, 10) || 1;
                type = 'month';
              }
              chartInstance.current.setPeriod({ type, span });
              
              // Seed the cache for the restored timeframe so it doesn't need to resample on first render
              setAllTimeframesData({ [restoredTf]: cached.raw1mData! });
              
              chartInstance.current.setDataLoader({
                getBars: ({ type: loadType, callback }: any) => {
                  if (loadType === 'init') {
                    callback(cached.raw1mData!);
                  } else {
                    callback([]);
                  }
                }
              });
              chartInstance.current.resetData();
              
              setHasData(true);
              setActiveTimeframe(restoredTf);
              
              // Restore watchlist symbols from cache or fallback to active symbol
              const restoredWatchlist = cached.watchlistSymbols && cached.watchlistSymbols.length > 0
                ? cached.watchlistSymbols
                : [{ name: cached.assetName!, raw1m: cached.raw1mData!, settings }];
              setWatchlistSymbols(restoredWatchlist);
              setActiveWatchlistSymbol(cached.assetName!);
              
              centerLastCandle(restoredTf, null, true);
              setIsCheckingCache(false);
            }
          }, 50);
          
          // Clear interval after 5 seconds to avoid infinite loop if chart fails to init
          setTimeout(() => {
            clearInterval(checkChartInstance);
            setIsCheckingCache(false);
          }, 5000);
        } else {
          setIsCheckingCache(false);
        }
      } catch (err) {
        console.error('Error during initial IndexedDB load:', err);
        setIsCheckingCache(false);
      }
    };
    
    initCachedData();
  }, []);
  // Helper to push settings styling onto the KLineChart instance
  const applySettingsToChart = (chart: any, s: ChartSettings) => {
    // Synchronize price line settings onto chart object for custom PriceLine overlay
    chart._showPriceLine = s.showPriceLine;
    chart._priceLineStyle = s.priceLineStyle;
    chart._priceLineSize = s.priceLineSize;
    chart._priceLineColor = s.priceLineColor;
    chart._priceLineUseCandleColor = s.priceLineUseCandleColor;
    chart._bullColor = s.bullColor;
    chart._bearColor = s.bearColor;

    // Synchronize session breaks settings
    chart._showSessionBreaks = s.showSessionBreaks;
    chart._sessionBreaksColor = s.sessionBreaksColor;
    chart._sessionBreaksStyle = s.sessionBreaksStyle;
    chart._sessionBreaksSize = s.sessionBreaksSize;

    chart.setStyles({
      grid: {
        show: s.gridType !== 'None',
        horizontal: {
          show: s.gridType === 'Vert and Horiz' || s.gridType === 'Horizontal Only',
          color: s.gridColor,
          style: s.gridStyle,
        },
        vertical: {
          show: s.gridType === 'Vert and Horiz' || s.gridType === 'Vertical Only',
          color: s.gridColor,
          style: s.gridStyle,
        },
      },
      candle: {
        type: s.showBody ? 'candle_solid' : 'ohlc',
        bar: {
          upColor: s.bullColor,
          downColor: s.bearColor,
          upBorderColor: s.showBorders ? s.bullBorderColor : 'transparent',
          downBorderColor: s.showBorders ? s.bearBorderColor : 'transparent',
          upWickColor: s.showWicks ? s.bullWickColor : 'transparent',
          downWickColor: s.showWicks ? s.bearWickColor : 'transparent',
        },
        tooltip: {
          showRule: 'always',
          offsetTop: 35,
          title: {
            show: false,
            family: 'Noto Sans, sans-serif',
          },
          legend: {
            family: 'Noto Sans, sans-serif',
          }
        },
        priceMark: {
          show: s.showPriceLine,
          high: {
            show: false,
            text: {
              family: 'Noto Sans, sans-serif',
            }
          },
          low: {
            show: false,
            text: {
              family: 'Noto Sans, sans-serif',
            }
          },
          last: {
            show: s.showPriceLine,
            line: {
              show: false, // Hide native line as we draw custom unclamped priceY line
              style: s.priceLineStyle,
              size: s.priceLineSize,
              dashedValue: [4, 4],
            },
            text: {
              show: s.showPriceLineLabel,
              size: s.scalesTextSize,
              color: '#ffffff',
              family: 'Noto Sans, sans-serif',
              weight: 'normal',
            },
            upColor: s.priceLineUseCandleColor ? s.bullColor : s.priceLineColor,
            downColor: s.priceLineUseCandleColor ? s.bearColor : s.priceLineColor,
            noChangeColor: s.priceLineUseCandleColor ? '#8b93a6' : s.priceLineColor,
          },
        },
      },
      indicator: {
        tooltip: {
          title: {
            family: 'Noto Sans, sans-serif',
          },
          legend: {
            family: 'Noto Sans, sans-serif',
          }
        }
      },
      crosshair: {
        show: true,
        horizontal: {
          show: true,
          line: {
            show: true,
            style: 'dashed',
            size: 1,
            color: '#4b5563',
            dashedValue: [4, 4],
          },
          text: {
            family: 'Noto Sans, sans-serif',
          }
        },
        vertical: {
          show: true,
          line: {
            show: true,
            style: 'dashed',
            size: 1,
            color: '#4b5563',
            dashedValue: [4, 4],
          },
          text: {
            family: 'Noto Sans, sans-serif',
          }
        },
      },
      xAxis: {
        show: s.showScalesLines,
        axisLine: {
          show: s.showScalesLines,
          color: s.scalesLinesColor,
        },
        tickText: {
          color: s.scalesTextColor,
          size: s.scalesTextSize,
          family: 'Noto Sans, sans-serif',
        },
      },
      yAxis: {
        show: s.showScalesLines,
        axisLine: {
          show: s.showScalesLines,
          color: s.scalesLinesColor,
        },
        tickText: {
          color: s.scalesTextColor,
          size: s.scalesTextSize,
          family: 'Noto Sans, sans-serif',
        },
      },
      overlay: {
        point: {
          color: '#ffffff',
          borderColor: '#2196F3',
          borderSize: 1.5,
          radius: 4.5,
          activeColor: '#ffffff',
          activeBorderColor: '#2196F3',
          activeBorderSize: 2,
          activeRadius: 5.5,
        },
        line: {
          color: '#2196F3',
          size: 1.5,
          style: 'solid',
        },
        text: {
          family: 'Noto Sans, sans-serif',
        }
      },
    });
  };


  // Center last candle helper
  // preserveOffset: keep the user's current right-margin so the last candle stays
  //                 at the same visual position after timeframe switch.
  // Key insight: setOffsetRightDistance(n) already scrolls the chart so the last
  // bar appears n pixels from the right edge — no scrollToDataIndex needed.
  // scrollToDataIndex MUST be avoided in preserve mode because it resets
  // offsetRightDistance to 0 internally, which causes the chart to jump to the right edge.
  const centerLastCandle = (tf: Timeframe, overrideTimestamp?: number | null, preserveOffset?: boolean) => {
    // Capture the current right-margin SYNCHRONOUSLY before any data update happens.
    // Use the pre-captured ref offset if available, otherwise fall back to getOffsetRightDistance.
    const capturedOffset = preserveOffset
      ? (capturedOffsetRef.current !== null
        ? capturedOffsetRef.current
        : (chartInstance.current ? getTrueOffsetRightDistance(chartInstance.current) : null))
      : null;

    console.log(`[DEBUG] centerLastCandle - captured offset: ${capturedOffset}, preserve: ${!!preserveOffset}`);

    if (preserveOffset && capturedOffset !== null) {
      // Apply synchronously to avoid visual stutter!
      if (chartInstance.current) {
        chartInstance.current.setOffsetRightDistance(capturedOffset);
        console.log(`[DEBUG] centerLastCandle (Sync) - tf: ${tf}, offset preserved: ${capturedOffset.toFixed(1)}px`);

        // Only restore a manually-set Y-axis zoom range (e.g. user dragged the Y-axis scale).
        // Do NOT touch the Y-axis otherwise — klinecharts auto-fits the visible bars correctly.
        if (wasManualScaleRef.current && capturedYAxisRangeRef.current) {
          const pane = chartInstance.current.getDrawPaneById?.('candle_pane');
          const yAxis = pane?.getYAxisComponents?.()?.[0];
          const r = capturedYAxisRangeRef.current;
          if (yAxis && r && !isNaN(r.from) && !isNaN(r.to) && r.from < r.to) {
            console.log(`[DEBUG] centerLastCandle (Sync) - Restoring manual Y-axis range:`, r);
            yAxis.setRange({ ...r });
            yAxis.setAutoCalcTickFlag(false);
          }
        }
      }
      capturedOffsetRef.current = null;
      capturedYAxisRangeRef.current = null;
      wasManualScaleRef.current = false;
      return; // Return immediately, do not schedule timeout!
    }

    setTimeout(() => {
      if (!chartInstance.current) return;
      const chartSize = chartInstance.current.getSize();
      const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;

      const fullData = allTimeframesData[tf];
      if (!fullData) return;
      const targetTimestamp = overrideTimestamp !== undefined ? overrideTimestamp : replayCurrentTimestamp;
      const activeData = isReplayActive && targetTimestamp !== null
        ? fullData.filter(d => d.timestamp <= targetTimestamp)
        : fullData;

      if (!activeData || activeData.length === 0) {
        console.warn(`[DEBUG] centerLastCandle - No active data for timeframe: ${tf}`);
        return;
      }

      // Always re-enable Y-axis auto-scale on default centering so the chart isn't locked vertically.
      try {
        const pane = (chartInstance.current as any).getDrawPaneById?.('candle_pane');
        const yAxis = pane?.getYAxisComponents?.()?.[0];
        if (yAxis) yAxis.setAutoCalcTickFlag(true);
      } catch (_) { /* ignore */ }

      // Horizontal centering only. klinecharts auto-fits Y-axis to visible bars — do not override it.
      chartInstance.current.setOffsetRightDistance(chartWidth / 2);
      chartInstance.current.scrollToDataIndex(activeData.length - 1);

      requestAnimationFrame(() => {
        chartInstance.current?.setOffsetRightDistance(chartWidth / 2);
      });
      console.log(`[DEBUG] centerLastCandle - tf: ${tf}, last index: ${activeData.length - 1}, center: ${(chartWidth / 2).toFixed(1)}px`);

      // Clear refs
      capturedOffsetRef.current = null;
      capturedYAxisRangeRef.current = null;
      wasManualScaleRef.current = false;
    }, 50);
  };

  // Reset chart view: re-center last candle, using the user's saved position if set
  const resetChartView = () => {
    if (!chartInstance.current) return;
    const chart = chartInstance.current;

    const chartSize = chart.getSize();
    const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
    const fullData = allTimeframesData[activeTimeframe];
    if (!fullData) return;
    const activeData =
      isReplayActive && replayCurrentTimestamp !== null
        ? fullData.filter((d: any) => d.timestamp <= replayCurrentTimestamp)
        : fullData;

    if (activeData.length === 0) return;

    // Re-enable Y-axis auto-scale so prices appear correctly after any manual zoom
    try {
      const pane = (chart as any).getDrawPaneById?.('candle_pane');
      const yAxis = pane?.getYAxisComponents?.()?.[0];
      if (yAxis) yAxis.setAutoCalcTickFlag(true);
    } catch (_) { /* ignore */ }

    // Permanently center the last candle close (default reset view location)
    const targetOffset = chartWidth / 2;

    chart.resize();
    chart.setOffsetRightDistance(targetOffset);
    chart.scrollToDataIndex(activeData.length - 1);

    requestAnimationFrame(() => {
      chartInstance.current?.setOffsetRightDistance(targetOffset);
    });
  };



  // Clear Database Cache and Reset App State
  const handleClearDatabase = async () => {
    try {
      console.log('[DEBUG] handleClearDatabase - Clearing IndexedDB cache and resetting app state.');
      await clearChartDataInIndexedDB();
      await clearDirectoryHandle();
      
      // Reset data state
      dataVersionRef.current += 1;
      setRaw1mData([]);
      setAssetName('No Asset Loaded');
      setHasData(false);
      setAllTimeframesData({ '1m': [] });
      setParseFeedback(null);
      setWatchlistSymbols([]);
      setActiveWatchlistSymbol(null);
      setSymbolFilesMap({});
      setSavedFolderHandle(null);
      setSavedFolderHandles([]);
      
      // Clear localStorage variables
      localStorage.removeItem('active_watchlist_symbol');
      localStorage.removeItem('active_timeframe');
      localStorage.removeItem('tv_clone_import_mode');
      
      // Reset replay state
      setIsReplayActive(false);
      setIsSelectingCutPoint(false);
      setIsReplayPlaying(false);
      setReplayCurrentTimestamp(null);
      
      // Clear chart instance data
      if (chartInstance.current) {
        chartInstance.current.resetData();
        chartInstance.current.setSymbol({ ticker: 'INGEST', pricePrecision: settings.pricePrecision, volumePrecision: 4 });
      }
      
      // Close settings modal
      setIsSettingsOpen(false);
    } catch (err) {
      console.error('Failed to clear database and reset app:', err);
    }
  };

  // Watchlist: confirm-remove a symbol — clears its data from IndexedDB then switches or resets
  const handleWatchlistRemoveConfirm = async (symbolName: string) => {
    try {
      // Clear IndexedDB (currently single-slot storage)
      await clearChartDataInIndexedDB();
      console.log(`[DEBUG] handleWatchlistRemoveConfirm - Cleared IndexedDB for '${symbolName}'`);

      // Build the new watchlist without this symbol
      const remaining = watchlistSymbols.filter(s => s.name !== symbolName);
      setWatchlistSymbols(remaining);
      setPendingRemoveSymbol(null);

      if (remaining.length > 0) {
        // Switch to the next available symbol
        const next = remaining[0];
        setActiveWatchlistSymbol(next.name);
        setAssetName(next.name);
        setRaw1mData(next.raw1m);
        setHasData(true);
        setActiveTimeframe('1m');
        setIsReplayActive(false);
        setIsSelectingCutPoint(false);
        setIsReplayPlaying(false);
        setReplayCurrentTimestamp(null);
        regenerateTimeframes(next.raw1m, settings);
        if (chartInstance.current) {
          const precision = settings.pricePrecision !== 0 ? settings.pricePrecision : detectPricePrecision(next.raw1m);
          chartInstance.current.setSymbol({ ticker: next.name, pricePrecision: precision, volumePrecision: 4 });
          chartInstance.current.setPeriod({ type: 'minute', span: 1 });
        }
        // Persist the newly active symbol to IndexedDB
        saveChartDataToIndexedDB(next.raw1m, next.name, null, remaining, '1m');
      } else {
        // No symbols left — reset to import screen
        setRaw1mData([]);
        setAssetName('No Asset Loaded');
        setHasData(false);
        setAllTimeframesData({ '1m': [] });
        setParseFeedback(null);
        setActiveWatchlistSymbol(null);
        setIsReplayActive(false);
        setIsSelectingCutPoint(false);
        setIsReplayPlaying(false);
        setReplayCurrentTimestamp(null);
        if (chartInstance.current) {
          chartInstance.current.resetData();
          chartInstance.current.setSymbol({ ticker: 'INGEST', pricePrecision: settings.pricePrecision, volumePrecision: 4 });
        }
      }
    } catch (err) {
      console.error('[DEBUG] handleWatchlistRemoveConfirm - Failed:', err);
    }
  };

  // Replay Step Forward Helper
  const handleReplayStepForward = () => {
    if (!chartInstance.current || !isReplayActive) {
      console.warn('[DEBUG] handleReplayStepForward - Replay mode is not active or chart is missing.');
      return;
    }

    const fullData = allTimeframesData[activeTimeframe];
    if (!fullData || fullData.length === 0) {
      console.warn('[DEBUG] handleReplayStepForward - Empty or missing data for active timeframe:', activeTimeframe);
      return;
    }

    if (replayCurrentTimestamp === null) {
      console.warn('[DEBUG] handleReplayStepForward - Current replay timestamp is null (no cutpoint selected).');
      return;
    }

    let currentIndex = -1;
    for (let i = fullData.length - 1; i >= 0; i--) {
      if (fullData[i].timestamp <= replayCurrentTimestamp) {
        currentIndex = i;
        break;
      }
    }

    if (currentIndex >= fullData.length - 1) {
      console.log('[DEBUG] handleReplayStepForward - Replay has reached the end of dataset. Pausing autoplay.');
      setIsReplayPlaying(false);
      return;
    }

    const nextCandle = fullData[currentIndex + 1];
    console.log(`[DEBUG] handleReplayStepForward - Advancing from ${new Date(replayCurrentTimestamp).toLocaleString()} to ${new Date(nextCandle.timestamp).toLocaleString()} (Index ${currentIndex + 1}/${fullData.length})`);
    setReplayCurrentTimestamp(nextCandle.timestamp);
  };

  // Replay Step Backward Helper
  const handleReplayStepBackward = () => {
    if (!chartInstance.current || !isReplayActive || replayCurrentTimestamp === null) {
      console.warn('[DEBUG] handleReplayStepBackward - Replay mode is not active or timestamp is null.');
      return;
    }

    const fullData = allTimeframesData[activeTimeframe];
    if (!fullData || fullData.length === 0) {
      console.warn('[DEBUG] handleReplayStepBackward - Empty or missing data for active timeframe:', activeTimeframe);
      return;
    }

    let currentIndex = -1;
    for (let i = fullData.length - 1; i >= 0; i--) {
      if (fullData[i].timestamp <= replayCurrentTimestamp) {
        currentIndex = i;
        break;
      }
    }
    if (currentIndex <= 0) {
      console.warn(`[DEBUG] handleReplayStepBackward - Cannot step back further. Current index: ${currentIndex}`);
      return;
    }

    const prevCandle = fullData[currentIndex - 1];
    console.log(`[DEBUG] handleReplayStepBackward - Reverting from ${new Date(replayCurrentTimestamp).toLocaleString()} to ${new Date(prevCandle.timestamp).toLocaleString()} (Index ${currentIndex - 1}/${fullData.length})`);
    setReplayCurrentTimestamp(prevCandle.timestamp);
  };

  // Revert back to normal mode
  const exitReplayMode = () => {
    console.log('[DEBUG] exitReplayMode - Exiting Replay Mode. Restoring full dataset.');

    const currentOffset = chartInstance.current ? getTrueOffsetRightDistance(chartInstance.current) : null;
    capturedOffsetRef.current = currentOffset;

    let wasManual = false;
    let range = null;
    if (chartInstance.current) {
      const pane = chartInstance.current.getDrawPaneById?.('candle_pane');
      const yAxis = pane?.getYAxisComponents?.()?.[0];
      if (yAxis) {
        wasManual = !yAxis.getAutoCalcTickFlag();
        if (wasManual) {
          const r = yAxis.getRange();
          if (r && !isNaN(r.from) && !isNaN(r.to) && r.from < r.to) {
            range = r;
          } else {
            wasManual = false;
          }
        }
      }
    }
    wasManualScaleRef.current = wasManual;
    capturedYAxisRangeRef.current = range;

    const fullData = allTimeframesData[activeTimeframe];
    let slicedIndex = -1;
    if (replayCurrentTimestamp !== null && fullData) {
      slicedIndex = fullData.findIndex(d => d.timestamp === replayCurrentTimestamp);
      if (slicedIndex === -1) {
        for (let i = fullData.length - 1; i >= 0; i--) {
          if (fullData[i].timestamp <= replayCurrentTimestamp) {
            slicedIndex = i;
            break;
          }
        }
      }
    }

    setIsReplayActive(false);
    setIsReplayPlaying(false);
    setIsSelectingCutPoint(false);
    setReplayCurrentTimestamp(null);

    // Restore full data to chart
    if (chartInstance.current) {
      chartInstance.current.setDataLoader({
        getBars: ({ type: loadType, callback }: any) => {
          if (loadType === 'init') {
            console.log(`[DEBUG] exitReplayMode dataLoader - Ingesting full dataset (${fullData.length} bars)`);
            callback(fullData);
          } else {
            callback([]);
          }
        }
      });
      chartInstance.current.resetData();
      
      if (slicedIndex !== -1) {
        // Snap instantly to the sliced candle index (preserving the saved offset position)
        console.log(`[DEBUG] exitReplayMode - Snapping to sliced index ${slicedIndex}/${fullData.length - 1} at offset ${currentOffset}`);
        chartInstance.current.scrollToDataIndex(slicedIndex);
        
        // Calculate targetIndex to align the last candle exactly at the saved offset
        let offsetBars = 0;
        if (currentOffset !== null && currentOffset !== 0) {
          const barSpaceVal = chartInstance.current.getBarSpace();
          let space = 6; // default fallback
          if (barSpaceVal) {
            if (typeof barSpaceVal === 'number') {
              space = barSpaceVal;
            } else if (typeof barSpaceVal === 'object') {
              space = barSpaceVal.bar || 6;
            }
          }
          offsetBars = Math.round(currentOffset / space);
        }
        const targetIndex = fullData.length - 1 + offsetBars;

        // Defer the animated scroll to the end to let the chart render the snap first
        setTimeout(() => {
          if (chartInstance.current) {
            console.log(`[DEBUG] exitReplayMode - Animating scroll to target index ${targetIndex} (last index ${fullData.length - 1} + ${offsetBars} offset bars) over 700ms`);
            chartInstance.current.scrollToDataIndex(targetIndex, 700);

            // Restore manual Y-axis scale if it was active
            if (wasManualScaleRef.current && capturedYAxisRangeRef.current) {
              const pane = chartInstance.current.getDrawPaneById?.('candle_pane');
              const yAxis = pane?.getYAxisComponents?.()?.[0];
              if (yAxis) {
                console.log(`[DEBUG] exitReplayMode - Restoring manual Y-axis range:`, capturedYAxisRangeRef.current);
                yAxis.setRange({ ...capturedYAxisRangeRef.current });
                yAxis.setAutoCalcTickFlag(false);
              }
            } else {
              // Unlock Y-axis auto-scale when not restoring a manual range
              const pane = chartInstance.current?.getDrawPaneById?.('candle_pane');
              const yAxis = pane?.getYAxisComponents?.()?.[0];
              if (yAxis) yAxis.setAutoCalcTickFlag(true);
            }
          }
          // Clear refs since we've handled it
          capturedYAxisRangeRef.current = null;
          wasManualScaleRef.current = false;
        }, 50);
      } else {
        // Fallback: restore the user's scroll position
        centerLastCandle(activeTimeframe, undefined, true);
      }
    } else {
      console.error('[DEBUG] exitReplayMode - Chart instance is missing!');
    }
  };

  // Autoplay replay bars hook
  useEffect(() => {
    let intervalId: any = null;
    if (isReplayActive && isReplayPlaying && replayCurrentTimestamp !== null) {
      console.log(`[DEBUG] autoplay hook - Starting autoplay timer. Speed interval: ${replaySpeed}s per bar.`);
      intervalId = setInterval(() => {
        handleReplayStepForward();
      }, replaySpeed * 1000);
    }
    return () => {
      if (intervalId) {
        console.log('[DEBUG] autoplay hook - Clearing autoplay timer.');
        clearInterval(intervalId);
      }
    };
  }, [isReplayActive, isReplayPlaying, replayCurrentTimestamp, replaySpeed, activeTimeframe, allTimeframesData]);

  // Sync chart data when replay current timestamp changes hook
  useEffect(() => {
    if (!chartInstance.current || !isReplayActive || replayCurrentTimestamp === null) return;

    isSyncingRangeRef.current = true;
    try {
      // Check if Y-axis auto-calculation flag is custom (manual scale) BEFORE data update
      const pane = (chartInstance.current as any).getDrawPaneById?.('candle_pane');
      const yAxis = pane?.getYAxisComponents?.()?.[0];
      const wasManualScale = yAxis ? !yAxis.getAutoCalcTickFlag() : false;
      const prevRange = wasManualScale && yAxis ? yAxis.getRange() : null;

      const fullData = allTimeframesData[activeTimeframe];
      if (!fullData) {
        console.warn(`[DEBUG] dataSync hook - allTimeframesData[${activeTimeframe}] is not loaded yet.`);
        return;
      }
      const visibleData = fullData.filter(d => d.timestamp <= replayCurrentTimestamp);
      console.log(`[DEBUG] dataSync hook - Slicing data at timestamp: ${new Date(replayCurrentTimestamp).toLocaleString()}. Visible bars: ${visibleData.length}/${fullData.length}`);

      // Read current scroll offset BEFORE updating data.
      // If we have a captured offset from a timeframe switch or resize, use it instead of the current stale chart offset.
      const currentOffset = capturedOffsetRef.current !== null
        ? capturedOffsetRef.current
        : getTrueOffsetRightDistance(chartInstance.current);

      if (capturedOffsetRef.current !== null) {
        capturedOffsetRef.current = null;
      }

      // Check if there is a pending cut animation
      const anim = pendingCutAnimation.current;
      let tempOffset = currentOffset;
      if (anim && anim.timestamp === replayCurrentTimestamp) {
        const chartSize = chartInstance.current.getSize();
        const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
        tempOffset = chartWidth - anim.clickX;
        console.log(`[DEBUG] dataSync hook - Pending cut animation found. Using temporary click offset: ${tempOffset} (clickX: ${anim.clickX}, chartWidth: ${chartWidth})`);
      }

      chartInstance.current.setDataLoader({
        getBars: ({ type: loadType, callback }: any) => {
          if (loadType === 'init') {
            console.log(`[DEBUG] dataSync dataLoader - Supplying ${visibleData.length} visible bars to chart`);
            callback(visibleData);
          } else {
            callback([]);
          }
        }
      });

      chartInstance.current.resetData();
      
      // Explicitly restore the user's custom offset on the chart instance to prevent reset-to-default behavior.
      // By setting this offset globally, KLineCharts will naturally draw the new end candle at this position.
      console.log(`[DEBUG] dataSync hook - Saved offsetRightDistance: ${tempOffset}. Restoring now.`);
      chartInstance.current.setOffsetRightDistance(tempOffset);

      // Restore the custom Y-axis range if wasManualScale is true, otherwise always unlock auto-scale
      if (wasManualScale && yAxis && prevRange) {
        console.log('[DEBUG] dataSync hook - Restoring manual Y-axis range:', prevRange);
        yAxis.setRange({ ...prevRange });
        yAxis.setAutoCalcTickFlag(false);
      } else if (yAxis) {
        // Ensure Y-axis auto-scale is re-enabled so the chart isn't locked vertically
        yAxis.setAutoCalcTickFlag(true);
      }

      // If there is a pending cut animation, trigger it!
      if (anim && anim.timestamp === replayCurrentTimestamp) {
        pendingCutAnimation.current = null; // consume it

        const startTime = performance.now();
        const startOffset = tempOffset;
        const endOffset = anim.savedOffset;
        const duration = 700;

        console.log(`[DEBUG] dataSync hook - Sliced data loaded. Animating offset slide from tempOffset ${tempOffset} to savedOffset ${anim.savedOffset} over 700ms`);

        const animate = (time: number) => {
          if (!chartInstance.current || !isReplayActive) return;
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing: easeOutCubic
          const easeOutCubic = 1 - Math.pow(1 - progress, 3);
          const current = startOffset + (endOffset - startOffset) * easeOutCubic;
          
          chartInstance.current.setOffsetRightDistance(current);
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            console.log(`[DEBUG] dataSync hook - Animation completed. Locking final offset ${endOffset}`);
            chartInstance.current.setOffsetRightDistance(endOffset);
          }
        };

        requestAnimationFrame(animate);
      }
    } finally {
      setTimeout(() => {
        isSyncingRangeRef.current = false;
        handleDateRangeSync(activeChartIndex);
      }, 100);
    }
  }, [replayCurrentTimestamp, activeTimeframe, isReplayActive, allTimeframesData, activeChartIndex]);

  // Click-to-cut point selector hook using DOM click + coordinate convertFromPixel
  useEffect(() => {
    const container = chartContainersRef.current[activeChartIndex];
    console.log('[DEBUG] selector hook - checking refs:', {
      hasChartInstance: !!chartInstance.current,
      hasChartContainer: !!container,
      isSelectingCutPoint
    });
    if (!chartInstance.current || !container) return;

    const handleContainerClick = (event: MouseEvent) => {
      if (!isSelectingCutPoint || !chartInstance.current) return;
      console.log(`[DEBUG] cutpoint click event - Capture phase click registered. Coordinates: X=${event.clientX}, Y=${event.clientY}`);

      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Convert pixel coordinates to chart data index/timestamp
      const result = chartInstance.current.convertFromPixel({ x, y });
      console.log(`[DEBUG] cutpoint click event - convertFromPixel raw result:`, result);
      
      if (result) {
        const dataPoint = Array.isArray(result) ? result[0] : result;
        if (dataPoint) {
          let timestamp = dataPoint.timestamp;
          
          if (!timestamp && typeof dataPoint.dataIndex === 'number') {
            const dataIndex = Math.round(dataPoint.dataIndex);
            const fullData = allTimeframesData[activeTimeframe];
            if (fullData) {
              console.log(`[DEBUG] cutpoint click event - Mapping dataIndex ${dataPoint.dataIndex} (rounded: ${dataIndex}) to timeframe data. Total bars: ${fullData.length}`);
              if (dataIndex >= 0 && dataIndex < fullData.length) {
                timestamp = fullData[dataIndex].timestamp;
              } else if (dataIndex >= fullData.length) {
                timestamp = fullData[fullData.length - 1].timestamp;
                console.warn(`[DEBUG] cutpoint click event - dataIndex ${dataIndex} exceeds bounds. Snapped to last bar.`);
              } else if (dataIndex < 0) {
                timestamp = fullData[0].timestamp;
                console.warn(`[DEBUG] cutpoint click event - dataIndex ${dataIndex} is negative. Snapped to first bar.`);
              }
            }
          }

          if (timestamp) {
            console.log(`[DEBUG] cutpoint click event - Success! Slicing chart starting from: ${new Date(timestamp).toLocaleString()}`);
            setIsSelectingCutPoint(false);
            setCutPointHoverX(null);

            const chartSize = chartInstance.current.getSize();
            const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
            const centerOffset = chartWidth / 2;
            pendingCutAnimation.current = {
              timestamp,
              clickX: x,
              savedOffset: centerOffset
            };

            setReplayCurrentTimestamp(timestamp);
          } else {
            console.error('[DEBUG] cutpoint click event - Failed to map coordinate to timestamp.', dataPoint);
          }
        }
      } else {
        console.warn('[DEBUG] cutpoint click event - convertFromPixel returned null result.');
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isSelectingCutPoint) return;
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      setCutPointHoverX(x);
    };

    const handleMouseLeave = () => {
      setCutPointHoverX(null);
    };

    if (isSelectingCutPoint) {
      console.log('[DEBUG] cutpoint click hook - Active. Binding capturing-phase click and cursor tracking listeners.');
      container.addEventListener('click', handleContainerClick, true);
      container.addEventListener('mousemove', handleMouseMove, true);
      container.addEventListener('mouseleave', handleMouseLeave, true);
    }

    return () => {
      container.removeEventListener('click', handleContainerClick, true);
      container.removeEventListener('mousemove', handleMouseMove, true);
      container.removeEventListener('mouseleave', handleMouseLeave, true);
    };
  }, [isSelectingCutPoint, activeTimeframe, allTimeframesData, activeChartIndex, chartContainersRef.current[activeChartIndex]]);

  // 1a. Layout Manager effect - handles creation and disposal of chart slots
  useEffect(() => {
    const visibleCount = getLayoutChartCount(layoutType);

    // Initialize newly visible slots
    for (let i = 0; i < visibleCount; i++) {
      const container = chartContainersRef.current[i];
      if (container) {
        // If container has no children but chart instance already exists,
        // it means the container was remounted by React and the chart is dead.
        if (chartInstancesRef.current[i] && container.children.length === 0) {
          console.log(`[DEBUG] Container for slot ${i} was remounted. Disposing dead chart instance.`);
          try {
            dispose(chartInstancesRef.current[i]);
          } catch (e) {
            console.error(e);
          }
          chartInstancesRef.current[i] = null;
        }

        if (!chartInstancesRef.current[i]) {
          // Register custom overlays first (safe to call multiple times)
          registerCustomOverlays();

          const chart = init(container, {
            formatter: {
              formatDate: ({ timestamp }) => {
                const date = new Date(timestamp);
                if (isNaN(date.getTime())) return '-';
                const day = String(date.getDate()).padStart(2, '0');
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = months[date.getMonth()];
                const year = date.getFullYear();
                let hours = date.getHours();
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12;
                const hoursStr = String(hours).padStart(2, '0');
                return `${day} ${month} ${year} ${hoursStr}:${minutes} ${ampm}`;
              }
            }
          });
          if (chart) {
            chartInstancesRef.current[i] = chart;
            applySettingsToChart(chart, settings);
            
            chart.setMaxOffsetLeftDistance(10000);
            chart.setMaxOffsetRightDistance(10000);
            
            chart.setSymbol({ ticker: slots[i]?.symbol || 'INGEST', pricePrecision: settings.pricePrecision, volumePrecision: 4 });
            chart.setPeriod({ type: 'minute', span: 1 });

            chart.subscribeAction('onCrosshairChange', (params: any) => {
              handleCrosshairSync(i, params);
            });

            chart.subscribeAction('onVisibleRangeChange', () => {
              handleDateRangeSync(i);
            });

            chart.subscribeAction('onCandleBarClick', (param: any) => {
              handleTimeSync(i, param);
            });

            chart.createOverlay({
              name: 'customPriceLine',
              id: 'custom_price_line_overlay',
              points: [{ timestamp: 0, value: 0 }],
              lock: true
            });

            chart.createOverlay({
              name: 'sessionBreaks',
              id: 'session_breaks_overlay',
              points: [{ timestamp: 0, value: 0 }],
              lock: true
            });

            (chart as any)._onDrawingSync = syncAllDrawings;
            (chart as any)._onHoverChange = () => {
              setDrawingTrigger(prev => prev + 1);
            };
            loadDataForSlot(i, chart);
            chart.resize();
          }
        }
      }
    }

    // Dispose out-of-bounds slots
    for (let i = visibleCount; i < 4; i++) {
      if (chartInstancesRef.current[i]) {
        dispose(chartContainersRef.current[i] || chartInstancesRef.current[i]);
        chartInstancesRef.current[i] = null;
      }
    }

    // Adjust active slot if it went out of bounds
    if (activeChartIndex >= visibleCount) {
      setActiveChartIndex(0);
    }
    
    const activeChart = chartInstancesRef.current[activeChartIndex] || chartInstancesRef.current[0];
    if (activeChart) {
      chartInstance.current = activeChart;
    }

    // Resize and re-center charts to fit the new layout layout size changes
    setTimeout(() => {
      for (let i = 0; i < visibleCount; i++) {
        const chart = chartInstancesRef.current[i];
        if (chart) {
          chart.resize();
          (chart as any)._onDrawingSync = syncAllDrawings;
          (chart as any)._onHoverChange = () => {
            setDrawingTrigger(prev => prev + 1);
          };
        }
      }
      if (hasData) {
        centerLastCandle(activeTimeframe, undefined, true);
      }
    }, 150);
  }, [layoutType, hasData, activeTimeframe]);

  // Clean up all charts on unmount
  useEffect(() => {
    return () => {
      for (let i = 0; i < 4; i++) {
        if (chartInstancesRef.current[i]) {
          dispose(chartInstancesRef.current[i]);
          chartInstancesRef.current[i] = null;
        }
      }
    };
  }, []);

  // 1b. Settings synchronizer
  useEffect(() => {
    const visibleCount = getLayoutChartCount(layoutType);
    for (let i = 0; i < visibleCount; i++) {
      const chart = chartInstancesRef.current[i];
      if (chart) {
        applySettingsToChart(chart, settings);

        // Re-apply magnet sensitivity to all existing drawing overlays
        if (magnetMode !== 'normal') {
          const overlays = chart.getOverlays();
          overlays.forEach((ov: any) => {
            if (ov.id === 'custom_price_line_overlay' || ov.name === 'customPriceLine' || ov.id === 'session_breaks_overlay' || ov.name === 'sessionBreaks') return;
            const sensitivity = getMagnetSensitivity(magnetMode, settings);
            const klcMode = magnetMode === 'normal_magnet' ? 'weak_magnet' : magnetMode;
            chart.overrideOverlay({
              id: ov.id,
              mode: klcMode,
              modeSensitivity: sensitivity,
            });
          });
        }
      }
    }
  }, [settings, layoutType]);

  // 1c. Sync active pointer and compat refs
  useEffect(() => {
    const activeChart = chartInstancesRef.current[activeChartIndex];
    if (activeChart) {
      chartInstance.current = activeChart;
      (chartContainerRef as any).current = chartContainersRef.current[activeChartIndex];
    }
  }, [activeChartIndex]);

  // 2. Handle Browser Resizing
  useEffect(() => {
    const handleResize = () => {
      const visibleCount = getLayoutChartCount(layoutType);
      
      // Resize all active charts
      for (let i = 0; i < visibleCount; i++) {
        const chart = chartInstancesRef.current[i];
        if (chart) {
          chart.resize();
        }
      }

      // Read offset/tick info from active chart
      if (chartInstance.current) {
        capturedOffsetRef.current = getTrueOffsetRightDistance(chartInstance.current);

        let wasManual = false;
        let range = null;
        const pane = chartInstance.current.getDrawPaneById?.('candle_pane');
        const yAxis = pane?.getYAxisComponents?.()?.[0];
        if (yAxis) {
          wasManual = !yAxis.getAutoCalcTickFlag();
          if (wasManual) {
            const r = yAxis.getRange();
            if (r && !isNaN(r.from) && !isNaN(r.to) && r.from < r.to) {
              range = r;
            } else {
              wasManual = false;
            }
          }
        }
        wasManualScaleRef.current = wasManual;
        capturedYAxisRangeRef.current = range;

        if (hasData) {
          centerLastCandle(activeTimeframe, undefined, true);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [hasData, activeTimeframe, allTimeframesData, isReplayActive, replayCurrentTimestamp, layoutType]);

  // Auto-resize and center the chart when data is loaded
  useEffect(() => {
    if (hasData) {
      console.log('[DEBUG] hasData changed to true. Triggering resize on all charts.');
      const visibleCount = getLayoutChartCount(layoutType);
      for (let i = 0; i < visibleCount; i++) {
        const chart = chartInstancesRef.current[i];
        if (chart) {
          chart.resize();
        }
      }
      setTimeout(() => {
        for (let i = 0; i < visibleCount; i++) {
          const chart = chartInstancesRef.current[i];
          if (chart) {
            chart.resize();
          }
        }
        centerLastCandle(activeTimeframe);
      }, 150);
    }
  }, [hasData, layoutType]);

  // 3. Handle Escape Key to Cancel Active Drawing or Clear Selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeTool) {
          if (chartInstance.current) {
            if (activeOverlayIdRef.current) {
              chartInstance.current.removeOverlay({ id: activeOverlayIdRef.current });
              activeOverlayIdRef.current = null;
            }
            chartInstance.current.setScrollEnabled(true);
            chartInstance.current.setZoomEnabled(true);
          }
          setActiveTool(null);
        } else {
          setSelectedOverlayIds([]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTool]);

// Synchronize selected overlay IDs and move helpers with all visible chart slots, and trigger repaint
  useEffect(() => {
    const visibleCount = getLayoutChartCount(layoutType);
    for (let i = 0; i < visibleCount; i++) {
      const chart = chartInstancesRef.current[i];
      if (chart) {
        (chart as any)._selectedOverlayIds = selectedOverlayIds;
        (chart as any)._setSelectedOverlayIds = setSelectedOverlayIds;
        (chart as any)._isCtrlPressedRef = isCtrlPressedRef;
        (chart as any)._isShiftPressedRef = isShiftPressedRef;
        (chart as any)._chartInstancesRef = chartInstancesRef;

        (chart as any)._initMultiMove = (event: any) => {
          const c = event.chart as any;
          if (c._selectedOverlayIds?.includes(event.overlay.id)) {
            c._startingPoints = {};
            c._selectedOverlayIds.forEach((id: string) => {
              const ov = c.getOverlays().find((o: any) => o.id === id);
              if (ov) {
                c._startingPoints[id] = JSON.parse(JSON.stringify(ov.points));
              }
            });
            c._draggedStartPoints = JSON.parse(JSON.stringify(event.overlay.points));
          }
        };

        (chart as any)._handleMultiMove = (event: any) => {
          const c = event.chart as any;
          const draggedOverlay = event.overlay;
          
          if (c._selectedOverlayIds?.includes(draggedOverlay.id) && c._draggedStartPoints && c._startingPoints) {
            const startPt = c._draggedStartPoints[0];
            const currentPt = draggedOverlay.points[0];
            if (startPt && currentPt) {
              const deltaTimestamp = currentPt.timestamp - startPt.timestamp;
              const deltaValue = currentPt.value - startPt.value;
              const deltaDataIndex = (currentPt.dataIndex !== undefined && startPt.dataIndex !== undefined)
                ? currentPt.dataIndex - startPt.dataIndex
                : 0;

              c._selectedOverlayIds.forEach((id: string) => {
                if (id === draggedOverlay.id) return;
                const startingPts = c._startingPoints[id];
                if (startingPts) {
                  const newPts = startingPts.map((pt: any) => ({
                    ...pt,
                    timestamp: pt.timestamp + deltaTimestamp,
                    value: pt.value + deltaValue,
                    dataIndex: (pt.dataIndex !== undefined) ? pt.dataIndex + deltaDataIndex : undefined
                  }));
                  c.overrideOverlay({
                    id,
                    points: newPts
                  });
                }
              });
            }
          }
        };

        // Update styles for all overlays to highlight selection
        const overlays = chart.getOverlays();
        overlays.forEach((ov: any) => {
          if (ov.id === 'custom_price_line_overlay' || ov.name === 'customPriceLine' || ov.id === 'session_breaks_overlay' || ov.name === 'sessionBreaks') return; // Skip persistent overlays
          const normalizeId = (id: string) => id.replace(/^sync_(.+)_from_\d+$/, '$1');
          const isSelected = selectedOverlayIds.some(selId => normalizeId(selId) === normalizeId(ov.id));

          // Set isSelected in extendData so tools can render their own selection handles
          const currentExtendData = typeof ov.extendData === 'object' && ov.extendData !== null ? ov.extendData : {};
          chart.overrideOverlay({
            id: ov.id,
            extendData: {
              ...currentExtendData,
              isSelected
            }
          });
        });
        chart.resize(); // Force canvas redraw to reflect active/locked selection points in real-time
      }
    }
  }, [selectedOverlayIds, layoutType]);

  // Keyboard Events: Control key tracking, Delete/Backspace for deleting selected drawings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing inside inputs or textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Control') {
        isCtrlPressedRef.current = true;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !activeTool) {
        if (chartInstance.current && chartInstance.current._selectedOverlayIds?.length > 0) {
          console.log(`[DEBUG] Deleting selected overlays:`, chartInstance.current._selectedOverlayIds);
          chartInstance.current._selectedOverlayIds.forEach((id: string) => {
            const ov = (chartInstance.current as any).getOverlays().find((o: any) => o.id === id);
            if (id === 'custom_price_line_overlay' || ov?.name === 'customPriceLine' || id === 'session_breaks_overlay' || ov?.name === 'sessionBreaks') return; // Skip persistent overlays
            
            const syncMatch = ov?.id?.match(/^sync_(.+)_from_(\d+)$/);
            if (syncMatch) {
              const originalId = syncMatch[1];
              const sourceIndex = parseInt(syncMatch[2]);
              const sourceChart = chartInstancesRef.current[sourceIndex];
              if (sourceChart) {
                (sourceChart as any).removeOverlay({ id: originalId });
              }
              (chartInstance.current as any).removeOverlay({ id });
            } else {
              (chartInstance.current as any).removeOverlay({ id });
            }
          });
          chartInstance.current._selectedOverlayIds = [];
          setSelectedOverlayIds([]);
          
          setTimeout(() => {
            syncAllDrawings();
          }, 50);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        isCtrlPressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTool]);

  // Mouse selection box drawing
  useEffect(() => {
    const visibleCount = getLayoutChartCount(layoutType);
    const containers: HTMLDivElement[] = [];

    // Gather all active containers
    for (let i = 0; i < visibleCount; i++) {
      const container = chartContainersRef.current[i];
      if (container) {
        containers.push(container);
      }
    }

    if (containers.length === 0) return;

    // Helper to check if drawing intersects the selection box
    const doesOverlayIntersectRect = (ov: any, xMin: number, xMax: number, yMin: number, yMax: number, chart: any): boolean => {
      const points = ov.points;
      if (!points || points.length === 0) return false;
      const pts = chart.convertToPixel(points, { paneId: 'candle_pane' });
      const validPts = pts.filter((p: any) => p !== null && p !== undefined);
      if (validPts.length === 0) return false;

      const isPointInRect = (p: any) => p.x >= xMin && p.x <= xMax && p.y >= yMin && p.y <= yMax;

      if (ov.name === 'segment') {
        if (validPts.length < 2) return false;
        const A = validPts[0];
        const B = validPts[1];
        if (isPointInRect(A) || isPointInRect(B)) return true;

        // Check line segment intersection with rect edges
        const intersects = (p1: any, p2: any, p3: any, p4: any) => {
          const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
          if (d === 0) return false;
          const u = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
          const v = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
          return u >= 0 && u <= 1 && v >= 0 && v <= 1;
        };

        const rTL = { x: xMin, y: yMin };
        const rTR = { x: xMax, y: yMin };
        const rBR = { x: xMax, y: yMax };
        const rBL = { x: xMin, y: yMax };

        return intersects(A, B, rTL, rTR) || 
               intersects(A, B, rTR, rBR) || 
               intersects(A, B, rBR, rBL) || 
               intersects(A, B, rBL, rTL);
      }

      if (ov.name === 'horizontalStraightLine') {
        const y0 = validPts[0].y;
        return y0 >= yMin && y0 <= yMax;
      }

      if (ov.name === 'rect' || ov.name === 'priceChannel') {
        const xs = validPts.map((p: any) => p.x);
        const ys = validPts.map((p: any) => p.y);
        const xMin_ov = Math.min(...xs);
        const xMax_ov = Math.max(...xs);
        const yMin_ov = Math.min(...ys);
        const yMax_ov = Math.max(...ys);

        return Math.max(xMin_ov, xMin) <= Math.min(xMax_ov, xMax) && 
               Math.max(yMin_ov, yMin) <= Math.min(yMax_ov, yMax);
      }

      // Default fallback
      return validPts.some(isPointInRect);
    };

    let activeContainer: HTMLDivElement | null = null;
    let activeChart: any = null;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only handle left click
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };

      const container = e.currentTarget as HTMLDivElement;
      const slotIndex = chartContainersRef.current.indexOf(container);
      if (slotIndex === -1) return;

      const chart = chartInstancesRef.current[slotIndex];
      if (!chart) return;

      activeContainer = container;
      activeChart = chart;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!activeContainer || !activeChart || !mouseDownPosRef.current) return;

      const rect = activeContainer.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      const startX = mouseDownPosRef.current.x - rect.left;
      const startY = mouseDownPosRef.current.y - rect.top;

      const dx = Math.abs(startX - currentX);
      const dy = Math.abs(startY - currentY);

      if (isCtrlPressedRef.current) {
        // Prevent default browser text/drag selection behavior
        e.preventDefault();

        let div = activeContainer.querySelector('#selection-box-indicator') as HTMLDivElement;
        if (!div && (dx > 4 || dy > 4)) {
          div = document.createElement('div');
          div.style.position = 'absolute';
          div.style.border = '1.5px dashed #ff9800';
          div.style.backgroundColor = 'rgba(255, 152, 0, 0.08)';
          div.style.pointerEvents = 'none';
          div.style.zIndex = '50';
          div.style.left = `${startX}px`;
          div.style.top = `${startY}px`;
          div.style.width = '0px';
          div.style.height = '0px';
          div.id = 'selection-box-indicator';
          activeContainer.appendChild(div);

          // Disable scroll and zoom during box selection
          activeChart.setScrollEnabled(false);
          activeChart.setZoomEnabled(false);
        }

        if (div) {
          const xMin = Math.min(startX, currentX);
          const yMin = Math.min(startY, currentY);
          const w = Math.abs(startX - currentX);
          const h = Math.abs(startY - currentY);

          div.style.left = `${xMin}px`;
          div.style.top = `${yMin}px`;
          div.style.width = `${w}px`;
          div.style.height = `${h}px`;
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const startPos = mouseDownPosRef.current;
      mouseDownPosRef.current = null;

      if (activeContainer && activeChart) {
        const div = activeContainer.querySelector('#selection-box-indicator');
        if (div) {
          // Restore scroll and zoom
          if (!activeTool) {
            activeChart.setScrollEnabled(true);
            activeChart.setZoomEnabled(true);
          }

          const rect = activeContainer.getBoundingClientRect();
          const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
          const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

          if (startPos) {
            const startX = startPos.x - rect.left;
            const startY = startPos.y - rect.top;

            const xMin = Math.min(startX, currentX);
            const xMax = Math.max(startX, currentX);
            const yMin = Math.min(startY, currentY);
            const yMax = Math.max(startY, currentY);

            div.remove();

            const dx = xMax - xMin;
            const dy = yMax - yMin;

            if (dx > 4 && dy > 4) {
              const overlays = activeChart.getOverlays();
              const newlySelected: string[] = [];
              overlays.forEach((ov: any) => {
                if (doesOverlayIntersectRect(ov, xMin, xMax, yMin, yMax, activeChart)) {
                  newlySelected.push(ov.id);
                }
              });
              setSelectedOverlayIds(newlySelected);
              console.log(`[DEBUG] Selection rectangle matched overlays:`, newlySelected);
            }
          }
        } else if (startPos) {
          // Normal click check (without Ctrl drag box)
          const dx = Math.abs(e.clientX - startPos.x);
          const dy = Math.abs(e.clientY - startPos.y);
          const isClick = dx <= 4 && dy <= 4;

          if (isClick && !activeTool) {
            if (!isCtrlPressedRef.current) {
              // Only clear selection on normal click without Ctrl
              if (activeChart._clickedOnOverlay) {
                activeChart._clickedOnOverlay = false;
              } else {
                console.log('[DEBUG] Clicked on empty space. Clearing selection.');
                setSelectedOverlayIds([]);
              }
            } else {
              // Ctrl click: reset overlay click flag if it was clicked
              if (activeChart._clickedOnOverlay) {
                activeChart._clickedOnOverlay = false;
              }
            }
          }
        }
      }

      activeContainer = null;
      activeChart = null;
    };

    containers.forEach(container => {
      container.addEventListener('mousedown', handleMouseDown);
    });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      containers.forEach(container => {
        container.removeEventListener('mousedown', handleMouseDown);
      });
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [layoutType, activeTool]);

  // Regenerate all preset and custom timeframes with timezone shift applied
  const regenerateTimeframes = (raw1m: KLineData[], s: ChartSettings) => {
    if (raw1m.length === 0) return;

    console.log('[DEBUG] regenerateTimeframes - Rebuilding timeframe cache with settings:', {
      enabled: s.timezoneAdjustmentEnabled,
      brokerOffset: s.brokerTimezoneOffset,
      userOffset: s.userTimezoneOffset
    });

    let baseData = raw1m;
    if (s.timezoneAdjustmentEnabled) {
      const offsetDiffMs = (s.userTimezoneOffset - s.brokerTimezoneOffset) * 60 * 1000;
      baseData = raw1m.map(c => ({
        ...c,
        timestamp: c.timestamp + offsetDiffMs
      }));
    }

    const newTimeframesData: Record<string, KLineData[]> = {
      '1m': baseData
    };

    if (activeTimeframe && activeTimeframe !== '1m') {
      newTimeframesData[activeTimeframe] = resample1mToTimeframe(baseData, getTimeframeMinutes(activeTimeframe));
    }

    console.log(`[DEBUG] regenerateTimeframes - Rebuild finished. Timeframes loaded: [${Object.keys(newTimeframesData).join(', ')}]`);

    setAllTimeframesData(newTimeframesData);

    // Refresh chart if data is already bound
    if (chartInstance.current) {
      const fullData = newTimeframesData[activeTimeframe] || [];
      
      let alignedTimestamp = replayCurrentTimestamp;
      if (isReplayActive && replayCurrentTimestamp !== null) {
        // If timezone settings shifted the timestamps, we also shift the replay timestamp
        const oldDiff = settings.timezoneAdjustmentEnabled ? (settings.userTimezoneOffset - settings.brokerTimezoneOffset) : 0;
        const newDiff = s.timezoneAdjustmentEnabled ? (s.userTimezoneOffset - s.brokerTimezoneOffset) : 0;
        const diffMs = (newDiff - oldDiff) * 60 * 1000;
        if (diffMs !== 0) {
          alignedTimestamp = replayCurrentTimestamp + diffMs;
          setReplayCurrentTimestamp(alignedTimestamp);
          console.log(`[DEBUG] regenerateTimeframes - Adjusted replay timestamp by ${diffMs / 1000}s to ${new Date(alignedTimestamp).toLocaleString()}`);
        }
      }

      const visibleData = isReplayActive && alignedTimestamp !== null
        ? fullData.filter(d => d.timestamp <= alignedTimestamp)
        : fullData;

      chartInstance.current.setDataLoader({
        getBars: ({ type: loadType, callback }: any) => {
          if (loadType === 'init') {
            callback(visibleData);
          } else {
            callback([]);
          }
        }
      });
      chartInstance.current.resize();
    }
  };

  // Save settings and push changes to the chart
  const handleSettingsSave = (newSettings: ChartSettings) => {
    console.log('[DEBUG] handleSettingsSave - Saving new settings layout:', newSettings);
    
    // Check if timezone settings changed
    const timezoneChanged = 
      newSettings.timezoneAdjustmentEnabled !== settings.timezoneAdjustmentEnabled ||
      newSettings.brokerTimezoneOffset !== settings.brokerTimezoneOffset ||
      newSettings.userTimezoneOffset !== settings.userTimezoneOffset;

    setSettings(newSettings);
    localStorage.setItem('tv_clone_settings', JSON.stringify(newSettings));
    
    if (chartInstance.current) {
      applySettingsToChart(chartInstance.current, newSettings);
      
      // Update symbol precision based on settings
      const activeData = allTimeframesData[activeTimeframe] || [];
      const precision = newSettings.pricePrecision !== 0 ? newSettings.pricePrecision : detectPricePrecision(activeData);
      chartInstance.current.setSymbol({
        ticker: assetName === 'No Asset Loaded' ? 'INGEST' : assetName,
        pricePrecision: precision,
        volumePrecision: 4
      });
      console.log(`[DEBUG] handleSettingsSave - Applied settings and updated chart ticker '${assetName}' precision to ${precision}`);
      
      if (timezoneChanged && raw1mData.length > 0) {
        console.log('[DEBUG] handleSettingsSave - Timezone settings changed. Regenerating all timeframe datasets...');
        dataVersionRef.current += 1;
        regenerateTimeframes(raw1mData, newSettings);
      }
    } else {
      console.warn('[DEBUG] handleSettingsSave - Chart instance not found, skipped applying settings.');
    }
  };

  const handleUserTimezoneChange = (label: string) => {
    const offset = getLabelOffset(label);
    console.log(`[DEBUG] handleUserTimezoneChange - label: ${label}, offset: ${offset}`);
    const newSettings = {
      ...settings,
      timezoneAdjustmentEnabled: true,
      userTimezoneOffset: offset,
      userTimezoneLabel: label
    };
    setSettings(newSettings);
    localStorage.setItem('tv_clone_settings', JSON.stringify(newSettings));
    if (chartInstance.current) {
      applySettingsToChart(chartInstance.current, newSettings);
    }
    if (raw1mData.length > 0) {
      dataVersionRef.current += 1;
      regenerateTimeframes(raw1mData, newSettings);
    }
  };

  // 3. File upload/drag-drop parsers
  const processCSVFile = (file: File) => {
    console.log(`[DEBUG] processCSVFile - Ingesting file '${file.name}' (${file.size} bytes)`);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        console.error('[DEBUG] processCSVFile - CSV text payload is empty.');
        return;
      }

      const result = parseCSV(text);
      console.log(`[DEBUG] processCSVFile - Parsing completed. Row Count: ${result.rowCount}, Valid Bars: ${result.parsedCount}, Skipped: ${result.skippedCount}`);
      
      setParseFeedback({
        errors: result.errors,
        headers: result.headers,
        rowCount: result.rowCount,
        parsedCount: result.parsedCount,
        skippedCount: result.skippedCount,
      });

      if (result.parsedCount === 0) {
        console.error('[DEBUG] processCSVFile - Failed completely. No valid candlestick bars could be extracted.');
        setHasData(false);
        return;
      }


      // Save raw unadjusted data to state
      setRaw1mData(result.data);

      // Determine settings based on tempBrokerOffset selector
      let updatedSettings = { ...settings };
      if (tempBrokerOffset !== 'exchange') {
        const brokerLabel = tempBrokerOffset;
        const brokerOffset = getLabelOffset(brokerLabel);
        updatedSettings = {
          ...settings,
          timezoneAdjustmentEnabled: true,
          brokerTimezoneOffset: brokerOffset,
          brokerTimezoneLabel: brokerLabel
        };
      } else {
        updatedSettings = {
          ...settings,
          timezoneAdjustmentEnabled: false
        };
      }
      setSettings(updatedSettings);
      localStorage.setItem('tv_clone_settings', JSON.stringify(updatedSettings));
      if (chartInstance.current) {
        applySettingsToChart(chartInstance.current, updatedSettings);
      }

      // Update asset name (filename without extension)
      const cleanName = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
      setAssetName(cleanName);

      // Mark as loaded and default to 1m timeframe
      setHasData(true);
      setActiveTimeframe('1m');

      // Reset replay states on new file upload
      setIsReplayActive(false);
      setIsSelectingCutPoint(false);
      setIsReplayPlaying(false);
      setReplayCurrentTimestamp(null);

      // Apply timezone adjustment, resample and cache
      dataVersionRef.current += 1;
      regenerateTimeframes(result.data, updatedSettings);

      // Add / update watchlist entry for this symbol
      let updatedWatchlist: any[] = [];
      setWatchlistSymbols(prev => {
        const entry = { name: cleanName, raw1m: result.data, settings: updatedSettings };
        if (importMode === 'single') {
          const oldSymbol = assetName;
          const filtered = prev.filter(s => s.name !== oldSymbol || oldSymbol === cleanName);
          const exists = filtered.findIndex(s => s.name === cleanName);
          let nextList = [...filtered];
          if (exists >= 0) {
            nextList[exists] = entry;
          } else {
            nextList.push(entry);
          }
          updatedWatchlist = nextList;
          return nextList;
        } else {
          const exists = prev.findIndex(s => s.name === cleanName);
          let nextList = [...prev];
          if (exists >= 0) {
            nextList[exists] = entry;
          } else {
            nextList.push(entry);
          }
          updatedWatchlist = nextList;
          return nextList;
        }
      });
      setActiveWatchlistSymbol(cleanName);
      // Save raw unadjusted data and watchlist to IndexedDB
      saveChartDataToIndexedDB(result.data, cleanName, null, updatedWatchlist, '1m');

      // Populate chart context
      if (chartInstance.current) {
        const precision = updatedSettings.pricePrecision !== 0 ? updatedSettings.pricePrecision : detectPricePrecision(result.data);
        chartInstance.current.setSymbol({ ticker: cleanName, pricePrecision: precision, volumePrecision: 4 });
        chartInstance.current.setPeriod({ type: 'minute', span: 1 });
      } else {
        console.error('[DEBUG] processCSVFile - Chart instance not found during initialization!');
      }

      // Auto-open the watchlist panel when a new dataset is imported for the first time
      setActiveRightTab('watchlist');
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCSVFile(e.target.files[0]);
    }
  };

  const processDirectoryHandle = async (dirHandle: any, symbolMap: Record<string, Record<string, File>>, currentPath: string = '') => {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        if (entry.name.toLowerCase().endsWith('.csv')) {
          const file = await entry.getFile();
          
          const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          const parts = relativePath.split('/');
          
          let symbol = '';
          let filename = '';

          if (parts.length >= 3) {
            symbol = parts[1].toUpperCase();
            filename = parts[parts.length - 1];
          } else if (parts.length === 2) {
            symbol = parts[0].toUpperCase();
            filename = parts[1];
          } else {
            const namePart = file.name.split(/[._-]/)[0];
            symbol = namePart ? namePart.toUpperCase() : 'SYMBOL';
            filename = file.name;
          }

          const tf = matchFileToTimeframe(filename);
          if (tf) {
            if (!symbolMap[symbol]) {
              symbolMap[symbol] = {};
            }
            symbolMap[symbol][tf] = file;
          }
        }
      } else if (entry.kind === 'directory') {
        const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        await processDirectoryHandle(entry, symbolMap, nextPath);
      }
    }
  };

  const handleSelectFoldersAPI = async (handlesToUse: any[], autoImport = false) => {
    try {
      setIsLoadingSymbol(true);
      
      const mergedSymbolMap: Record<string, Record<string, File>> = {};
      
      for (const dirHandle of handlesToUse) {
        const symbolMap: Record<string, Record<string, File>> = {};
        await processDirectoryHandle(dirHandle, symbolMap, dirHandle.name);
        
        // Merge symbolMap into mergedSymbolMap
        Object.entries(symbolMap).forEach(([sym, files]) => {
          mergedSymbolMap[sym] = {
            ...(mergedSymbolMap[sym] || {}),
            ...files
          };
        });
      }
      
      const symbolsList = Object.keys(mergedSymbolMap).sort();
      if (symbolsList.length === 0) {
        setCustomAlert({
          title: 'No CSV Files Detected',
          message: 'No valid timeframe CSV files found. Please ensure files match standard timeframe names (e.g. m1, h4, d1).'
        });
        setIsLoadingSymbol(false);
        return;
      }

      setSymbolFilesMap(mergedSymbolMap);

      const initialSelected: Record<string, boolean> = {};
      symbolsList.forEach(sym => {
        initialSelected[sym] = true;
      });
      setSelectedFolderSymbols(initialSelected);
      
      if (symbolsList.length === 1) {
        setFolderSymbol(symbolsList[0]);
        const mapped = Object.entries(mergedSymbolMap[symbolsList[0]]).map(([tf, file]) => ({
          name: file.name,
          size: file.size,
          timeframe: tf
        }));
        setFolderFilesList(mapped);
      } else {
        setFolderSymbol(`${symbolsList.length} Symbols Detected`);
        const allMapped: { name: string; size: number; timeframe: string | null }[] = [];
        symbolsList.forEach(sym => {
          Object.entries(mergedSymbolMap[sym]).forEach(([tf, file]) => {
            allMapped.push({ name: `${sym}/${file.name}`, size: file.size, timeframe: tf });
          });
        });
        setFolderFilesList(allMapped);
      }
      
      console.log(`[DEBUG] handleSelectFoldersAPI - Extracted Symbol Map:`, mergedSymbolMap);
      if (!autoImport) {
        setIsLoadingSymbol(false);
      }

      if (autoImport) {
        // Automatically confirm import and load the chart
        const firstSymbol = symbolsList[0];
        
        let updatedSettings = { ...settings };
        if (tempBrokerOffset !== 'exchange') {
          const brokerLabel = tempBrokerOffset;
          const brokerOffset = getLabelOffset(brokerLabel);
          updatedSettings = {
            ...settings,
            timezoneAdjustmentEnabled: true,
            brokerTimezoneOffset: brokerOffset,
            brokerTimezoneLabel: brokerLabel
          };
        } else {
          updatedSettings = {
            ...settings,
            timezoneAdjustmentEnabled: false
          };
        }
        setSettings(updatedSettings);
        localStorage.setItem('tv_clone_settings', JSON.stringify(updatedSettings));
        if (chartInstance.current) {
          applySettingsToChart(chartInstance.current, updatedSettings);
        }

        // Merge folder symbols into watchlist symbols instead of overwriting!
        setWatchlistSymbols(prev => {
          const merged = [...prev];
          symbolsList.forEach(sym => {
            if (!merged.some(s => s.name === sym)) {
              merged.push({ name: sym, raw1m: [], settings: updatedSettings });
            }
          });
          
          const lastSymbol = localStorage.getItem('active_watchlist_symbol');
          const targetSymbol = (lastSymbol && symbolsList.includes(lastSymbol)) ? lastSymbol : firstSymbol;
          const lastTf = (localStorage.getItem('active_timeframe') as Timeframe) || '1m';

          setTimeout(() => {
            handleWatchlistSymbolSwitch(targetSymbol, lastTf, mergedSymbolMap);
          }, 0);

          saveChartDataToIndexedDB(raw1mData, assetName, null, merged, activeTimeframe);
          return merged;
        });
        
        setFolderSymbol('');
        setFolderFilesList([]);
        if (!autoImport) {
          setActiveRightTab('watchlist');
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to select folders:', err);
        setCustomAlert({
          title: 'Import Error',
          message: 'Failed to select folders or read files. Please ensure you have read permissions.'
        });
      }
      setIsLoadingSymbol(false);
    }
  };

  const handleSelectFolderAPI = async (handleToUse?: any, autoImport = false) => {
    try {
      let dirHandle = handleToUse;
      if (!dirHandle) {
        if (!('showDirectoryPicker' in window)) {
          setCustomAlert({
            title: 'Unsupported Browser',
            message: 'Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera.'
          });
          return;
        }
        dirHandle = await (window as any).showDirectoryPicker({ startIn: 'documents' });
      }

      setSavedFolderHandle(dirHandle);
      setSavedFolderHandles([dirHandle]);

      await handleSelectFoldersAPI([dirHandle], autoImport);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to select folder:', err);
        setCustomAlert({
          title: 'Import Error',
          message: 'Failed to select folder or read files. Please ensure you have read permissions.'
        });
      }
      setIsLoadingSymbol(false);
    }
  };

  const handleRestoreSavedFolder = async () => {
    if (!savedFolderHandles || savedFolderHandles.length === 0) return;
    setIsVerifyingFolder(true);
    setIsLoadingSymbol(true);
    try {
      const options = { mode: 'read' as const };
      const validHandles = [];
      for (const handle of savedFolderHandles) {
        if ((await (handle as any).queryPermission(options)) !== 'granted') {
          const request = await (handle as any).requestPermission(options);
          if (request !== 'granted') {
            continue;
          }
        }
        validHandles.push(handle);
      }
      if (validHandles.length > 0) {
        await handleSelectFoldersAPI(validHandles, true);
      } else {
        setIsLoadingSymbol(false);
      }
    } catch (err) {
      console.error('Error verifying folder permission:', err);
      setIsLoadingSymbol(false);
    }
    setIsVerifyingFolder(false);
  };

  const handleFolderImportConfirm = async () => {
    const allSymbols = Object.keys(symbolFilesMap).sort();
    const symbolsList = allSymbols.filter(sym => selectedFolderSymbols[sym]);
    if (symbolsList.length === 0) {
      setCustomAlert({
        title: 'Selection Required',
        message: 'Please select at least one symbol subfolder to import.'
      });
      return;
    }

    // Apply timezone adjustment settings
    let updatedSettings = { ...settings };
    if (tempBrokerOffset !== 'exchange') {
      const brokerLabel = tempBrokerOffset;
      const brokerOffset = getLabelOffset(brokerLabel);
      updatedSettings = {
        ...settings,
        timezoneAdjustmentEnabled: true,
        brokerTimezoneOffset: brokerOffset,
        brokerTimezoneLabel: brokerLabel
      };
    } else {
      updatedSettings = {
        ...settings,
        timezoneAdjustmentEnabled: false
      };
    }
    setSettings(updatedSettings);
    localStorage.setItem('tv_clone_settings', JSON.stringify(updatedSettings));
    if (chartInstance.current) {
      applySettingsToChart(chartInstance.current, updatedSettings);
    }

    const firstSymbol = symbolsList[0];
    
    // Merge folder symbols into watchlist symbols instead of overwriting!
    setWatchlistSymbols(prev => {
      const merged = [...prev];
      symbolsList.forEach(sym => {
        if (!merged.some(s => s.name === sym)) {
          merged.push({ name: sym, raw1m: [], settings: updatedSettings });
        }
      });
      
      const lastSymbol = localStorage.getItem('active_watchlist_symbol');
      const targetSymbol = (lastSymbol && symbolsList.includes(lastSymbol)) ? lastSymbol : firstSymbol;
      const lastTf = (localStorage.getItem('active_timeframe') as Timeframe) || '1m';

      // Give state a tick to update, then switch symbol
      setTimeout(() => {
        handleWatchlistSymbolSwitch(targetSymbol, lastTf, symbolFilesMap);
      }, 0);

      saveChartDataToIndexedDB(raw1mData, assetName, null, merged, activeTimeframe);
      return merged;
    });
    
    // Save folder directory handles to IndexedDB after successful import confirmation
    try {
      if (savedFolderHandle) {
        await saveDirectoryHandle(savedFolderHandle);
      }
      if (savedFolderHandles && savedFolderHandles.length > 0) {
        await saveDirectoryHandles(savedFolderHandles);
      }
    } catch (err) {
      console.error('[DEBUG] handleFolderImportConfirm - Failed to save directory handles:', err);
    }

    // Reset folder mode states for next time
    setFolderSymbol('');
    setFolderFilesList([]);

    // Auto-open the watchlist panel
    setActiveRightTab('watchlist');
  };

  const handleWatchlistAddFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        setCustomAlert({
          title: 'Unsupported Browser',
          message: 'Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera.'
        });
        return;
      }
      const dirHandle = await (window as any).showDirectoryPicker({ startIn: 'documents' });
      setIsLoadingSymbol(true);

      const symbolMap: Record<string, Record<string, File>> = {};
      await processDirectoryHandle(dirHandle, symbolMap, dirHandle.name);

      const symbolsList = Object.keys(symbolMap).sort();
      if (symbolsList.length === 0) {
        setCustomAlert({
          title: 'No CSV Files Detected',
          message: 'No valid timeframe CSV files found in the selected folder.'
        });
        setIsLoadingSymbol(false);
        return;
      }

      // Add to savedFolderHandles if not already present
      setSavedFolderHandles(prev => {
        const alreadyExists = prev.some(h => h.name === dirHandle.name);
        const updated = alreadyExists ? prev : [...prev, dirHandle];
        saveDirectoryHandles(updated);
        // Also update savedFolderHandle to the first handle if not already set
        if (!savedFolderHandle) {
          setSavedFolderHandle(dirHandle);
          saveDirectoryHandle(dirHandle);
        }
        return updated;
      });

      // Merge symbolMap into symbolFilesMap
      setSymbolFilesMap(prev => {
        const updated = { ...prev };
        symbolsList.forEach(sym => {
          updated[sym] = {
            ...(updated[sym] || {}),
            ...symbolMap[sym]
          };
        });
        return updated;
      });

      // Merge into watchlistSymbols
      setWatchlistSymbols(prev => {
        const merged = [...prev];
        symbolsList.forEach(sym => {
          if (!merged.some(s => s.name === sym)) {
            merged.push({ name: sym, raw1m: [], settings });
          }
        });
        saveChartDataToIndexedDB(raw1mData, assetName, null, merged, activeTimeframe);
        return merged;
      });

      setIsLoadingSymbol(false);
      
      setWatchlistToast({ msg: `Added ${symbolsList.length} symbol(s) from folder.`, type: 'info' });
      setTimeout(() => setWatchlistToast(null), 2500);

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to select folder:', err);
        setCustomAlert({
          title: 'Import Error',
          message: 'Failed to select folder or read files. Please ensure you have read permissions.'
        });
      }
      setIsLoadingSymbol(false);
    }
  };

  // Watchlist: add a single CSV file as an additional symbol without replacing current chart
  const handleWatchlistAddFile = (file: File) => {
    // Derive the symbol name the same way processCSVFile does — before reading
    const cleanName = file.name.replace(/\.[^/.]+$/, '').toUpperCase();

    // Reject if already in watchlist
    setWatchlistSymbols(prev => {
      if (prev.some(s => s.name === cleanName)) {
        setWatchlistToast({ msg: `'${cleanName}' is already in the watchlist.`, type: 'error' });
        setTimeout(() => setWatchlistToast(null), 2500);
        return prev; // no change
      }
      return prev; // will be updated after parse below
    });

    // Check synchronously via a flag so we don't read unnecessarily
    // Re-read current state via closure isn't reliable here, so we check with a ref-free approach:
    // We do the real duplicate guard inside the setter above; now just bail if it fired a toast
    // by scheduling the reader only after a microtask so the state setter above runs first.
    // Simpler: just check directly — watchlistSymbols is captured in closure here.
    if (watchlistSymbols.some(s => s.name === cleanName)) {
      return; // toast was already triggered above
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const result = parseCSV(text);
      if (result.parsedCount === 0) {
        setWatchlistToast({ msg: `Could not parse '${cleanName}' — no valid bars found.`, type: 'error' });
        setTimeout(() => setWatchlistToast(null), 2500);
        return;
      }
      setWatchlistSymbols(prev => {
        // Final duplicate guard inside setter (handles race conditions)
        if (prev.some(s => s.name === cleanName)) {
          setWatchlistToast({ msg: `'${cleanName}' is already in the watchlist.`, type: 'error' });
          setTimeout(() => setWatchlistToast(null), 2500);
          return prev;
        }
        const updated = [...prev, { name: cleanName, raw1m: result.data, settings }];
        saveChartDataToIndexedDB(raw1mData, assetName, null, updated, activeTimeframe);
        return updated;
      });
      console.log(`[DEBUG] handleWatchlistAddFile - Added '${cleanName}' to watchlist (${result.parsedCount} bars)`);
    };
    reader.readAsText(file);
  };

  // Watchlist: switch active symbol onto the chart (supports on-demand loading for Folder Mode)
  const handleWatchlistSymbolSwitch = async (
    symbolName: string, 
    preferredTf?: string, 
    overrideFilesMap?: Record<string, Record<string, File>>
  ) => {
    setIsLoadingSymbol(true);
    let rawData: KLineData[] = [];
    let targetTf = preferredTf || activeTimeframe || '1m';

    const currentFilesMap = overrideFilesMap || symbolFilesMap;
    const files = currentFilesMap[symbolName];

    if (files) {
      // Folder mode
      if (!preferredTf) {
        // Maintain the active timeframe if a suitable folder file exists or can be resampled.
        const bestMatch = activeTimeframe ? getBestTimeframeFile(files, activeTimeframe) : null;
        if (bestMatch) {
          targetTf = activeTimeframe;
        } else {
          const TF_PRIORITY = ['1m','2m','3m','4m','5m','10m','15m','30m','1h','2h','4h','6h','12h','D','W','M'];
          const foundTf = TF_PRIORITY.find(tf => files[tf]);
          if (!foundTf) {
            setWatchlistToast({ msg: `No valid timeframes found for '${symbolName}'.`, type: 'error' });
            setTimeout(() => setWatchlistToast(null), 2500);
            return;
          }
          targetTf = foundTf;
        }
      }
    } else {
      // Single file mode
      const entry = watchlistSymbols.find(s => s.name === symbolName);
      if (entry) rawData = entry.raw1m;
      
      if (rawData.length === 0) {
        setWatchlistToast({ msg: `No data found for '${symbolName}'.`, type: 'error' });
        setTimeout(() => setWatchlistToast(null), 2500);
        return;
      }
    }

    // Persist active symbol
    localStorage.setItem('active_watchlist_symbol', symbolName);

    setActiveWatchlistSymbol(symbolName);
    setAssetName(symbolName);
    setRaw1mData(rawData);
    dataVersionRef.current += 1;
    setAllTimeframesData({}); // Clear cache for new symbol
    setHasData(true);

    // Stop any active replay
    setIsReplayActive(false);
    setIsSelectingCutPoint(false);
    setIsReplayPlaying(false);
    setReplayCurrentTimestamp(null);

    if (chartInstance.current) {
      const precision = settings.pricePrecision !== 0 ? settings.pricePrecision : (rawData.length > 0 ? detectPricePrecision(rawData) : 4);
      chartInstance.current.setSymbol({ ticker: symbolName, pricePrecision: precision, volumePrecision: 4 });
    }
    console.log(`[DEBUG] handleWatchlistSymbolSwitch - Switched to '${symbolName}'`);
    
    // Trigger lazy loading of the active timeframe
    setTimeout(() => {
      handleTimeframeSwitch(targetTf, symbolName, rawData, currentFilesMap);
    }, 0);
  };

  // Watchlist Drag and Drop Reordering Handlers
  const handleDragStartWatchlist = (e: React.DragEvent, index: number) => {
    draggedIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOverWatchlist = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const dragIndex = draggedIndexRef.current;
    if (dragIndex === null || dragIndex === index) return;

    setWatchlistSymbols(prev => {
      const updated = [...prev];
      const draggedItem = updated[dragIndex];
      updated.splice(dragIndex, 1);
      updated.splice(index, 0, draggedItem);
      
      draggedIndexRef.current = index;
      return updated;
    });
  };

  const handleDragEndWatchlist = () => {
    draggedIndexRef.current = null;
    
    // Save to IndexedDB using functional setter to ensure latest order is written
    setWatchlistSymbols(prev => {
      saveChartDataToIndexedDB(raw1mData, assetName, null, prev, activeTimeframe);
      return prev;
    });
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (importMode === 'single') {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (importMode === 'single') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (importMode === 'single' && e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCSVFile(e.dataTransfer.files[0]);
    }
  };

  // Timeframe switching
  const handleTimeframeSwitch = async (
    tf: Timeframe, 
    overrideSymbol?: string, 
    overrideRawData?: KLineData[], 
    overrideFilesMap?: Record<string, Record<string, File>>
  ) => {
    if (!hasData && !overrideSymbol) {
      console.warn('[DEBUG] handleTimeframeSwitch - Attempted switch but no data is loaded.');
      return;
    }
    const isSymbolSwitch = !!overrideSymbol;
    console.log(`[DEBUG] handleTimeframeSwitch - Switch requested to: ${tf} (symbol: ${overrideSymbol || assetName}), isSymbolSwitch: ${isSymbolSwitch}`);

    setIsLoadingSymbol(true);

    const currentSymbol = overrideSymbol || assetName;
    const currentRaw1m = overrideRawData || raw1mData;
    const currentFilesMap = overrideFilesMap || symbolFilesMap;

    let targetData = isSymbolSwitch ? undefined : allTimeframesData[tf];

    try {
      if (!targetData || targetData.length === 0) {
        let tfData: KLineData[] = [];
        const files = currentFilesMap[currentSymbol];
        
        if (files) {
          const bestMatch = getBestTimeframeFile(files, tf);
          if (bestMatch) {
            console.log(`[DEBUG] handleTimeframeSwitch - Folder mode: found best file ${bestMatch.file.name} for target tf ${tf}`);
            
            let baseData = (isSymbolSwitch ? undefined : allTimeframesData[bestMatch.tf]) || [];
            if (baseData.length === 0) {
              const text = await bestMatch.file.text();
              const result = parseCSV(text);
              if (result.parsedCount > 0) {
                let adjustedData = result.data;
                if (settings.timezoneAdjustmentEnabled) {
                  const offsetDiffMs = (settings.userTimezoneOffset - settings.brokerTimezoneOffset) * 60 * 1000;
                  adjustedData = result.data.map(c => ({
                    ...c,
                    timestamp: c.timestamp + offsetDiffMs
                  }));
                }
                baseData = adjustedData;
                
                setAllTimeframesData(prev => ({ ...prev, [bestMatch.tf]: baseData }));
              } else {
                baseData = [];
              }
            }

            if (bestMatch.tf === tf) {
              tfData = baseData;
            } else if (baseData.length > 0) {
              tfData = resample1mToTimeframe(baseData, getTimeframeMinutes(tf));
            }
          }
        }

        if (tfData.length > 0) {
          const raw1m = await getRaw1mDataForSupplement(currentSymbol, currentFilesMap);
          if (raw1m.length > 0) {
            tfData = supplementTimeframeData(
              tfData,
              raw1m,
              tf,
              settings.timezoneAdjustmentEnabled,
              settings.userTimezoneOffset,
              settings.brokerTimezoneOffset
            );
          }
        }

        if (tfData.length === 0 && currentRaw1m.length > 0) {
          console.log(`[DEBUG] handleTimeframeSwitch - Resampling from raw base data for target tf ${tf}`);
          let baseData = currentRaw1m;
          if (settings.timezoneAdjustmentEnabled) {
            const offsetDiffMs = (settings.userTimezoneOffset - settings.brokerTimezoneOffset) * 60 * 1000;
            baseData = currentRaw1m.map(c => ({
              ...c,
              timestamp: c.timestamp + offsetDiffMs
            }));
          }
          tfData = resample1mToTimeframe(baseData, getTimeframeMinutes(tf));
        }

        if (tfData.length > 0) {
          setAllTimeframesData(prev => ({ ...prev, [tf]: tfData }));
          targetData = tfData;
        } else {
          console.error(`[DEBUG] handleTimeframeSwitch - Failed to generate data for timeframe ${tf}`);
          setIsLoadingSymbol(false);
          return;
        }
      }
    } catch (err) {
      console.error('[DEBUG] handleTimeframeSwitch - Error loading timeframe data:', err);
      setIsLoadingSymbol(false);
      return;
    }

    if (chartInstance.current) {
      if (isSymbolSwitch) {
        // Clear offset/scale cache for new symbol so we don't apply the old symbol's scroll/zoom position
        capturedOffsetRef.current = null;
        wasManualScaleRef.current = false;
        capturedYAxisRangeRef.current = null;
        console.log(`[DEBUG] handleTimeframeSwitch - Symbol switch: cleared offset/scale cache.`);
      } else {
        capturedOffsetRef.current = getTrueOffsetRightDistance(chartInstance.current);

        let wasManual = false;
        let range = null;
        const pane = chartInstance.current.getDrawPaneById?.('candle_pane');
        const yAxis = pane?.getYAxisComponents?.()?.[0];
        if (yAxis) {
          wasManual = !yAxis.getAutoCalcTickFlag();
          if (wasManual) {
            const r = yAxis.getRange();
            if (r && !isNaN(r.from) && !isNaN(r.to) && r.from < r.to) {
              range = r;
            } else {
              wasManual = false;
            }
          }
        }
        wasManualScaleRef.current = wasManual;
        capturedYAxisRangeRef.current = range;

        console.log(`[DEBUG] handleTimeframeSwitch - Captured offset before switch: ${capturedOffsetRef.current}, manual scale: ${wasManual}, range:`, range);
      }
    }

    const activeReplay = isSymbolSwitch ? false : isReplayActive;
    let alignedTimestamp = activeReplay ? replayCurrentTimestamp : null;
    if (activeReplay && alignedTimestamp !== null && targetData) {
      const fullData = targetData;
      let alignedBar = null;
      for (let i = fullData.length - 1; i >= 0; i--) {
        if (fullData[i].timestamp <= alignedTimestamp) {
          alignedBar = fullData[i];
          break;
        }
      }
      if (alignedBar) {
        const originalTs = alignedTimestamp;
        alignedTimestamp = alignedBar.timestamp;
        console.log(`[DEBUG] handleTimeframeSwitch - Aligned replay timestamp from ${new Date(originalTs).toLocaleString()} to new timeframe ${tf} timestamp: ${new Date(alignedTimestamp).toLocaleString()}`);
        setReplayCurrentTimestamp(alignedTimestamp);
      } else if (fullData.length > 0) {
        alignedTimestamp = fullData[0].timestamp;
        console.log(`[DEBUG] handleTimeframeSwitch - No <= timestamp found in timeframe ${tf}. Snapped to first bar: ${new Date(alignedTimestamp).toLocaleString()}`);
        setReplayCurrentTimestamp(alignedTimestamp);
      }
    }

    setActiveTimeframe(tf);
    localStorage.setItem('active_timeframe', tf);
    if (chartInstance.current && targetData) {
      const fullData = targetData;
      const visibleData = isReplayActive && alignedTimestamp !== null
        ? fullData.filter(d => d.timestamp <= alignedTimestamp)
        : fullData;

      // Map timeframe values to type and span parameters
      let span = 1;
      let type: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'minute';
      if (tf.endsWith('m')) {
        span = parseInt(tf, 10) || 1;
        type = 'minute';
      } else if (tf.endsWith('H') || tf.endsWith('h')) {
        span = parseInt(tf, 10) || 1;
        type = 'hour';
      } else if (tf.endsWith('D') || tf.endsWith('d')) {
        span = parseInt(tf, 10) || 1;
        type = 'day';
      } else if (tf.endsWith('W') || tf.endsWith('w')) {
        span = parseInt(tf, 10) || 1;
        type = 'week';
      } else if (tf.endsWith('M')) {
        span = parseInt(tf, 10) || 1;
        type = 'month';
      }

      // Dynamically detect or apply configured price precision
      const precision = settings.pricePrecision !== 0 ? settings.pricePrecision : detectPricePrecision(targetData);
      chartInstance.current.setSymbol({ ticker: currentSymbol, pricePrecision: precision, volumePrecision: 4 });

      // Set the data loader BEFORE resetting data so that the chart immediately triggers the correct loading callback
      chartInstance.current.setDataLoader({
        getBars: ({ type: loadType, callback }: any) => {
          if (loadType === 'init') {
            console.log(`[DEBUG] handleTimeframeSwitch dataLoader - supplying ${visibleData.length} bars to chart for timeframe ${tf}`);
            callback(visibleData);
          } else {
            callback([]);
          }
        }
      });
      chartInstance.current.resetData();

      // Update period to trigger redraw with the new resampled data
      console.log(`[DEBUG] handleTimeframeSwitch - setPeriod triggered with type: ${type}, span: ${span}`);
      chartInstance.current.setPeriod({ type, span });
      
      // Preserve the user's current scroll position when switching timeframes, but center if it's a symbol switch
      centerLastCandle(tf, alignedTimestamp, !isSymbolSwitch);

      // Save loaded timeframe data and watchlist to IndexedDB
      saveChartDataToIndexedDB(visibleData, currentSymbol, capturedOffsetRef.current || null, watchlistSymbols, tf);
    } else {
      console.error('[DEBUG] handleTimeframeSwitch - Chart instance is missing!');
    }
    
    setIsLoadingSymbol(false);
  };

  // Add custom timeframe on the fly
  const handleAddCustomTimeframe = (val: number, unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months') => {
    let minutes = val;
    let suffix = 'm';
    if (unit === 'hours') {
      minutes = val * 60;
      suffix = 'h';
    } else if (unit === 'days') {
      minutes = val * 1440;
      suffix = 'D';
    } else if (unit === 'weeks') {
      minutes = val * 10080;
      suffix = 'W';
    } else if (unit === 'months') {
      minutes = val * 43200;
      suffix = 'M';
    }

    // Map 1D, 1W, 1M to D, W, M to match presets
    let tfValue = `${val}${suffix}`;
    if (val === 1) {
      if (suffix === 'D') tfValue = 'D';
      else if (suffix === 'W') tfValue = 'W';
      else if (suffix === 'M') tfValue = 'M';
    }
    const tfLabel = tfValue;

    const exists = PRESET_TIMEFRAMES.some(t => t.value === tfValue) || customTimeframes.some(t => t.value === tfValue);
    if (exists) {
      handleTimeframeSwitch(tfValue);
      return;
    }

    const newTf = { label: tfLabel, value: tfValue, minutes };
    setCustomTimeframes(prev => [...prev, newTf]);

    setTimeout(() => {
      handleTimeframeSwitch(tfValue);
    }, 50);
  };

  // Left Toolbar
  const handleSelectTool = (toolName: string) => {
    if (!chartInstance.current || !hasData) {
      console.warn('[DEBUG] handleSelectTool - Chart is not ready or data is missing.');
      return;
    }

    // Toggle off if already selected
    if (activeTool === toolName) {
      setActiveTool(null);
      chartInstance.current.setScrollEnabled(true);
      chartInstance.current.setZoomEnabled(true);
      return;
    }

    setActiveTool(toolName);
    chartInstance.current.setScrollEnabled(false);
    chartInstance.current.setZoomEnabled(false);
    
    // Create the overlay using the robust interactive framework options
    const overlayOptions = getInteractiveOverlayOptions(
      toolName,
      chartInstance,
      chartInstancesRef,
      isShiftPressedRef,
      syncAllDrawings,
      setActiveTool
    );
    chartInstance.current.createOverlay(overlayOptions);
  };
  (window as any).handleSelectTool = handleSelectTool;

  // Clear all drawings
  const handleClearDrawings = () => {
    console.log('[DEBUG] handleClearDrawings - Removing all overlays and resetting tools.');
    if (chartInstance.current) {
      chartInstance.current.removeOverlay();
      // Re-create the custom persistent price line overlay
      chartInstance.current.createOverlay({
        name: 'customPriceLine',
        id: 'custom_price_line_overlay',
        points: [{ timestamp: 0, value: 0 }],
        lock: true
      });
      // Re-create the customizable session breaks overlay
      chartInstance.current.createOverlay({
        name: 'sessionBreaks',
        id: 'session_breaks_overlay',
        points: [{ timestamp: 0, value: 0 }],
        lock: true
      });
      setActiveTool(null);
      chartInstance.current.setScrollEnabled(true);
      chartInstance.current.setZoomEnabled(true);
      syncAllDrawings();
    }
  };

  const renderLayout = () => {
    switch (layoutType) {
      case '2v':
        return (
          <div ref={layoutContainerRef} className="flex flex-row h-full w-full bg-[#131722] p-1.5 gap-0">
            <div style={{ width: `${layoutSizes['2v'][0]}%` }} className="h-full">
              {renderSlot(0)}
            </div>
            <div
              onMouseDown={startResize('2v', 0, 'vertical', layoutContainerRef.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ width: `${layoutSizes['2v'][1]}%` }} className="h-full">
              {renderSlot(1)}
            </div>
          </div>
        );
      case '2h':
        return (
          <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-[#131722] p-1.5 gap-0">
            <div style={{ height: `${layoutSizes['2h'][0]}%` }} className="w-full">
              {renderSlot(0)}
            </div>
            <div
              onMouseDown={startResize('2h', 0, 'horizontal', layoutContainerRef.current)}
              className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ height: `${layoutSizes['2h'][1]}%` }} className="w-full">
              {renderSlot(1)}
            </div>
          </div>
        );
      case '3v':
        return (
          <div ref={layoutContainerRef} className="flex flex-row h-full w-full bg-[#131722] p-1.5 gap-0">
            <div style={{ width: `${layoutSizes['3v'][0]}%` }} className="h-full">
              {renderSlot(0)}
            </div>
            <div
              onMouseDown={startResize('3v', 0, 'vertical', layoutContainerRef.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ width: `${layoutSizes['3v'][1]}%` }} className="h-full">
              {renderSlot(1)}
            </div>
            <div
              onMouseDown={startResize('3v', 1, 'vertical', layoutContainerRef.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ width: `${layoutSizes['3v'][2]}%` }} className="h-full">
              {renderSlot(2)}
            </div>
          </div>
        );
      case '3h':
        return (
          <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-[#131722] p-1.5 gap-0">
            <div style={{ height: `${layoutSizes['3h'][0]}%` }} className="w-full">
              {renderSlot(0)}
            </div>
            <div
              onMouseDown={startResize('3h', 0, 'horizontal', layoutContainerRef.current)}
              className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ height: `${layoutSizes['3h'][1]}%` }} className="w-full">
              {renderSlot(1)}
            </div>
            <div
              onMouseDown={startResize('3h', 1, 'horizontal', layoutContainerRef.current)}
              className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ height: `${layoutSizes['3h'][2]}%` }} className="w-full">
              {renderSlot(2)}
            </div>
          </div>
        );
      case '3g1':
        return (
          <div ref={layoutContainerRef} className="flex flex-row h-full w-full bg-[#131722] p-1.5 gap-0">
            <div style={{ width: `${layoutSizes['3g1_main'][0]}%` }} className="h-full">
              {renderSlot(0)}
            </div>
            <div
              onMouseDown={startResize('3g1_main', 0, 'vertical', layoutContainerRef.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div
              ref={subContainerRef1}
              style={{ width: `${layoutSizes['3g1_main'][1]}%` }}
              className="flex flex-col h-full"
            >
              <div style={{ height: `${layoutSizes['3g1_sub'][0]}%` }} className="w-full">
                {renderSlot(1)}
              </div>
              <div
                onMouseDown={startResize('3g1_sub', 0, 'horizontal', subContainerRef1.current)}
                className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
              />
              <div style={{ height: `${layoutSizes['3g1_sub'][1]}%` }} className="w-full">
                {renderSlot(2)}
              </div>
            </div>
          </div>
        );
      case '3g2':
        return (
          <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-[#131722] p-1.5 gap-0">
            <div style={{ height: `${layoutSizes['3g2_main'][0]}%` }} className="w-full">
              {renderSlot(0)}
            </div>
            <div
              onMouseDown={startResize('3g2_main', 0, 'horizontal', layoutContainerRef.current)}
              className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div
              ref={subContainerRef1}
              style={{ height: `${layoutSizes['3g2_main'][1]}%` }}
              className="flex flex-row w-full h-full"
            >
              <div style={{ width: `${layoutSizes['3g2_sub'][0]}%` }} className="h-full">
                {renderSlot(1)}
              </div>
              <div
                onMouseDown={startResize('3g2_sub', 0, 'vertical', subContainerRef1.current)}
                className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
              />
              <div style={{ width: `${layoutSizes['3g2_sub'][1]}%` }} className="h-full">
                {renderSlot(2)}
              </div>
            </div>
          </div>
        );
      case '4g':
        return (
          <div ref={layoutContainerRef} className="flex flex-row h-full w-full bg-[#131722] p-1.5 gap-0">
            <div
              ref={subContainerRef2}
              style={{ width: `${layoutSizes['4g_main'][0]}%` }}
              className="flex flex-col h-full"
            >
              <div style={{ height: `${layoutSizes['4g_left'][0]}%` }} className="w-full">
                {renderSlot(0)}
              </div>
              <div
                onMouseDown={startResize('4g_left', 0, 'horizontal', subContainerRef2.current)}
                className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
              />
              <div style={{ height: `${layoutSizes['4g_left'][1]}%` }} className="w-full">
                {renderSlot(2)}
              </div>
            </div>
            <div
              onMouseDown={startResize('4g_main', 0, 'vertical', layoutContainerRef.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div
              ref={subContainerRef3}
              style={{ width: `${layoutSizes['4g_main'][1]}%` }}
              className="flex flex-col h-full"
            >
              <div style={{ height: `${layoutSizes['4g_right'][0]}%` }} className="w-full">
                {renderSlot(1)}
              </div>
              <div
                onMouseDown={startResize('4g_right', 0, 'horizontal', subContainerRef3.current)}
                className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
              />
              <div style={{ height: `${layoutSizes['4g_right'][1]}%` }} className="w-full">
                {renderSlot(3)}
              </div>
            </div>
          </div>
        );
      case '4v':
        return (
          <div ref={layoutContainerRef} className="flex flex-row h-full w-full bg-[#131722] p-1.5 gap-0">
            <div style={{ width: `${layoutSizes['4v'][0]}%` }} className="h-full">
              {renderSlot(0)}
            </div>
            <div
              onMouseDown={startResize('4v', 0, 'vertical', layoutContainerRef.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ width: `${layoutSizes['4v'][1]}%` }} className="h-full">
              {renderSlot(1)}
            </div>
            <div
              onMouseDown={startResize('4v', 1, 'vertical', layoutContainerRef.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ width: `${layoutSizes['4v'][2]}%` }} className="h-full">
              {renderSlot(2)}
            </div>
            <div
              onMouseDown={startResize('4v', 2, 'vertical', layoutContainerRef.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ width: `${layoutSizes['4v'][3]}%` }} className="h-full">
              {renderSlot(3)}
            </div>
          </div>
        );
      case '4h':
        return (
          <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-[#131722] p-1.5 gap-0">
            <div style={{ height: `${layoutSizes['4h'][0]}%` }} className="w-full">
              {renderSlot(0)}
            </div>
            <div
              onMouseDown={startResize('4h', 0, 'horizontal', layoutContainerRef.current)}
              className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ height: `${layoutSizes['4h'][1]}%` }} className="w-full">
              {renderSlot(1)}
            </div>
            <div
              onMouseDown={startResize('4h', 1, 'horizontal', layoutContainerRef.current)}
              className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ height: `${layoutSizes['4h'][2]}%` }} className="w-full">
              {renderSlot(2)}
            </div>
            <div
              onMouseDown={startResize('4h', 2, 'horizontal', layoutContainerRef.current)}
              className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ height: `${layoutSizes['4h'][3]}%` }} className="w-full">
              {renderSlot(3)}
            </div>
          </div>
        );
      default:
        return (
          <div className="w-full h-full bg-[#131722]">
            {renderSlot(0)}
          </div>
        );
    }
  };

  const renderSlot = (i: number) => {
    const isActive = i === activeChartIndex;
    const showHighlight = layoutType !== '1';
    return (
      <div
        onClick={() => handleSelectChartSlot(i)}
        className={`
          relative w-full h-full bg-[#131722] rounded overflow-hidden transition-colors duration-200 cursor-pointer min-w-[150px] min-h-[150px]
          ${showHighlight && isActive ? 'ring-2 ring-indigo-500/40 z-10 shadow-md shadow-indigo-500/5' : (showHighlight ? 'border border-gray-800 hover:border-gray-750' : '')}
        `}
      >
        <div
          ref={(el) => {
            chartContainersRef.current[i] = el;
          }}
          className={`w-full h-full ${isSelectingCutPoint && isActive ? 'cursor-cell' : ''}`}
          style={{
            backgroundColor: settings.backgroundType === 'None' ? 'transparent' : settings.background,
          }}
        />
        
        {/* Vertical Cut Selection Line */}
        {isSelectingCutPoint && isActive && cutPointHoverX !== null && (
          <div
            className="absolute top-0 bottom-0 w-px border-l border-dashed border-red-500 pointer-events-none z-30"
            style={{ left: `${cutPointHoverX}px` }}
          />
        )}
        
        {/* Slot Info Badge (Top Left of each chart) */}
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded bg-[#1e222d]/85 backdrop-blur-sm border border-gray-800 pointer-events-none select-none text-[10px] font-bold text-gray-300">
          <span className={isActive ? 'text-indigo-400' : 'text-gray-400'}>#{i + 1}</span>
          <span>{slots[i]?.symbol || 'No Symbol'}</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-300 font-semibold">{slots[i]?.timeframe || '1m'}</span>
        </div>
        
        {/* Floating text inputs for all TrendLines */}
        {(() => {
          const chart = chartInstancesRef.current[i];
          const allTrendLines = chart 
            ? chart.getOverlays().filter((o: any) => o.name === 'trendLine')
            : [];
          return allTrendLines.map((ov: any) => (
            <FloatingTrendLineText
              key={ov.id}
              chart={chart}
              overlay={ov}
              isSelected={selectedOverlayIds.includes(ov.id)}
              onTextChange={(newText) => {
                const syncMatch = ov.id?.match(/^sync_(.+)_from_(\d+)$/);
                const originalId = syncMatch ? syncMatch[1] : ov.id;

                chartInstancesRef.current.forEach(c => {
                  if (!c) return;
                  const targetOverlay = c.getOverlays().find((o: any) => 
                    o.id === originalId || o.id?.startsWith(`sync_${originalId}_from_`)
                  );
                  if (targetOverlay) {
                    c.overrideOverlay({
                      id: targetOverlay.id,
                      extendData: {
                        ...(targetOverlay.extendData || {}),
                        customSettings: {
                          ...(targetOverlay.extendData?.customSettings || {}),
                          text: newText
                        }
                      }
                    });
                  }
                  c.resize();
                });
                syncAllDrawings();
                setDrawingTrigger(prev => prev + 1);
              }}
              syncAllDrawings={syncAllDrawings}
            />
          ));
        })()}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#131722] text-[#b2b5be] overflow-hidden select-none">
      
      {/* Top Navbar */}
      <header className="h-12 bg-[#1e222d] border-b border-gray-950 flex items-center justify-between px-4 z-20">
        
        {/* Left Side: Asset Name & Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-indigo-400">
            <LineChart className="w-5 h-5" />
            <span className="font-semibold text-xs tracking-wider uppercase text-white">FX Freeplay</span>
          </div>
          <div className="h-4 w-px bg-gray-800" />
          <span className="text-sm font-semibold text-white truncate max-w-[120px] sm:max-w-xs">{assetName}</span>

          {hasData && parseFeedback && (
            <button
              onClick={() => setShowStats(!showStats)}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                parseFeedback.skippedCount > 0
                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20'
                  : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${parseFeedback.skippedCount > 0 ? 'bg-yellow-400' : 'bg-green-400'}`} />
              <span>{parseFeedback.skippedCount > 0 ? 'Warnings' : 'Import OK'}</span>
            </button>
          )}
        </div>

        {/* Center: Timeframes */}
        <div className="relative flex items-center bg-gray-950/40 p-0.5 rounded-lg border border-gray-800/80">
          {HEADER_TIMEFRAMES.map((tfValue) => {
            const isPresetActive = activeTimeframe === tfValue;
            const preset = PRESET_TIMEFRAMES.find(p => p.value === tfValue);
            const label = preset ? preset.label : tfValue;
            return (
              <button
                key={tfValue}
                disabled={!hasData}
                onClick={() => handleTimeframeSwitch(tfValue)}
                className={`px-3 py-1 rounded-md text-xs font-semibold tracking-wide transition-all ${
                  isPresetActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-850 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400'
                }`}
              >
                {label}
              </button>
            );
          })}

          {/* Temporary Active Button if it is not in the Header presets */}
          {!HEADER_TIMEFRAMES.includes(activeTimeframe) && (
            <button
              disabled={!hasData}
              className="px-3 py-1 rounded-md text-xs font-semibold tracking-wide bg-indigo-600 text-white shadow-md"
            >
              {activeTimeframe}
            </button>
          )}

          {/* Dropdown Chevron Button */}
          <button
            disabled={!hasData}
            onClick={() => setIsTfDropdownOpen(!isTfDropdownOpen)}
            className={`p-1.5 ml-0.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-850 transition-colors disabled:opacity-40 ${
              isTfDropdownOpen ? 'bg-gray-800 text-white' : ''
            }`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {isTfDropdownOpen && (
            <>
              {/* Dismiss backdrop */}
              <div 
                className="fixed inset-0 z-30 cursor-default" 
                onClick={() => setIsTfDropdownOpen(false)}
              />
              
              {/* Premium Dropdown Popover */}
              <div className="absolute top-full right-0 mt-1.5 z-40 w-72 bg-[#1e222d] border border-gray-800 rounded-xl shadow-2xl p-3 flex flex-col gap-3 text-left">
                {/* Minutes Grid */}
                <div>
                  <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Minutes</div>
                  <div className="grid grid-cols-4 gap-1">
                    {['1m', '2m', '3m', '5m', '10m', '15m', '30m', '45m'].map((tfVal) => {
                      const preset = PRESET_TIMEFRAMES.find(p => p.value === tfVal);
                      const label = preset ? preset.label : tfVal;
                      const isActive = activeTimeframe === tfVal;
                      return (
                        <button
                          key={tfVal}
                          onClick={() => {
                            handleTimeframeSwitch(tfVal);
                            setIsTfDropdownOpen(false);
                          }}
                          className={`px-2 py-1 rounded text-xs font-semibold text-center transition-all ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hours Grid */}
                <div>
                  <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Hours</div>
                  <div className="grid grid-cols-4 gap-1">
                    {['1h', '2h', '3h', '4h', '6h', '12h'].map((tfVal) => {
                      const preset = PRESET_TIMEFRAMES.find(p => p.value === tfVal);
                      const label = preset ? preset.label : tfVal;
                      const isActive = activeTimeframe === tfVal;
                      return (
                        <button
                          key={tfVal}
                          onClick={() => {
                            handleTimeframeSwitch(tfVal);
                            setIsTfDropdownOpen(false);
                          }}
                          className={`px-2 py-1 rounded text-xs font-semibold text-center transition-all ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Days & Above Grid */}
                <div>
                  <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Days & Above</div>
                  <div className="grid grid-cols-4 gap-1">
                    {['D', 'W', 'M'].map((tfVal) => {
                      const preset = PRESET_TIMEFRAMES.find(p => p.value === tfVal);
                      const label = preset ? preset.label : tfVal;
                      const isActive = activeTimeframe === tfVal;
                      return (
                        <button
                          key={tfVal}
                          onClick={() => {
                            handleTimeframeSwitch(tfVal);
                            setIsTfDropdownOpen(false);
                          }}
                          className={`px-2 py-1 rounded text-xs font-semibold text-center transition-all ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Timeframes */}
                {customTimeframes.length > 0 && (
                  <div>
                    <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Custom</div>
                    <div className="grid grid-cols-4 gap-1">
                      {customTimeframes.map((tf) => {
                        const isActive = activeTimeframe === tf.value;
                        return (
                          <button
                            key={tf.value}
                            onClick={() => {
                              handleTimeframeSwitch(tf.value);
                              setIsTfDropdownOpen(false);
                            }}
                            className={`px-2 py-1 rounded text-xs font-semibold text-center transition-all ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                          >
                            {tf.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="h-px bg-gray-800/80 my-0.5" />

                {/* Add Custom Interval Form */}
                <div className="flex flex-col gap-1.5">
                  <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Add Custom Interval</div>
                  <div className="flex items-center gap-1.5">
                    {/* Custom Number Input with Spinner buttons replaced */}
                    <div className="flex items-center bg-[#1e222d] border border-gray-800 rounded h-[30px] w-[90px] overflow-hidden focus-within:border-indigo-500 transition-colors">
                      <button
                        type="button"
                        onClick={() => setCustomValue((prev) => Math.max(1, prev - 1))}
                        className="w-7 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800/80 active:bg-gray-800 transition-colors border-r border-gray-800/60"
                        title="Decrease"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        value={customValue}
                        onChange={(e) => setCustomValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-9 text-center bg-transparent border-0 text-white text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomValue((prev) => Math.min(9999, prev + 1))}
                        className="w-7 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800/80 active:bg-gray-800 transition-colors border-l border-gray-800/60"
                        title="Increase"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Custom Dropdown Selector */}
                    <div className="relative flex-1 h-[30px]">
                      <select
                        value={customUnit}
                        onChange={(e: any) => setCustomUnit(e.target.value)}
                        className="w-full h-full bg-[#1e222d] border border-gray-800 text-white text-xs rounded pl-2.5 pr-8 appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Add Button */}
                    <button
                      onClick={() => {
                        handleAddCustomTimeframe(customValue, customUnit);
                        setIsTfDropdownOpen(false);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold px-3 h-[30px] rounded transition-colors flex items-center justify-center"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Side: Replay and Settings */}
        <div className="flex items-center gap-2">
          {hasData && importMode === 'folder' && savedFolderHandle && (
            <button
              onClick={handleRestoreSavedFolder}
              disabled={isVerifyingFolder}
              title="Refresh all folder data (re-read CSV files)"
              className="p-2 rounded-lg border border-gray-800 bg-[#1e222d] hover:bg-gray-800 text-gray-400 hover:text-white transition-colors duration-150 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isVerifyingFolder ? 'animate-spin' : ''}`} />
            </button>
          )}

          {hasData && (
            <div className="relative">
              <button
                onClick={() => setIsLayoutDropdownOpen(!isLayoutDropdownOpen)}
                title="Select layout"
                className={`p-2 rounded-lg border border-gray-800 bg-[#1e222d] hover:bg-gray-800 transition-colors duration-150 flex items-center justify-center ${
                  isLayoutDropdownOpen ? 'text-indigo-400 border-indigo-500/50' : 'text-gray-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              {isLayoutDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsLayoutDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 z-50 w-72 bg-[#1e222d] border border-gray-800 rounded-xl shadow-2xl p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                        Select Layout
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {layoutsList.map((lay) => {
                          const isSelected = layoutType === lay.type;
                          return (
                            <button
                              key={lay.type}
                              onClick={() => {
                                const currentSymbol = slots[0]?.symbol || assetName;
                                const currentTf = slots[0]?.timeframe || activeTimeframe;
                                setSlots(prev => prev.map(() => ({
                                  symbol: hasData ? currentSymbol : null,
                                  timeframe: currentTf
                                })));
                                setLayoutType(lay.type);
                                setIsLayoutDropdownOpen(false);
                              }}
                              title={lay.label}
                              className={`p-1.5 rounded border transition-all duration-150 flex items-center justify-center cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                                  : 'border-gray-800 hover:border-gray-700 text-gray-400 hover:text-gray-200'
                              }`}
                            >
                              {lay.icon}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="h-px bg-gray-800/80" />

                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Sync in Layout
                      </div>
                      <div className="flex flex-col gap-1">
                        <ToggleSwitch
                          label="Symbol"
                          checked={syncSymbol}
                          onChange={setSyncSymbol}
                        />
                        <ToggleSwitch
                          label="Interval"
                          checked={syncInterval}
                          onChange={setSyncInterval}
                        />
                        <ToggleSwitch
                          label="Crosshair"
                          checked={syncCrosshair}
                          onChange={setSyncCrosshair}
                        />
                        <ToggleSwitch
                          label="Time"
                          checked={syncTime}
                          onChange={setSyncTime}
                        />
                        <ToggleSwitch
                          label="Date range"
                          checked={syncDateRange}
                          onChange={setSyncDateRange}
                        />
                        <ToggleSwitch
                          label="Drawings"
                          checked={syncDrawings}
                          onChange={setSyncDrawings}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg border border-gray-800 bg-[#1e222d] hover:bg-gray-800 text-gray-400 hover:text-white transition-colors duration-150"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Floating CSV Import Stats Card */}
      {hasData && parseFeedback && showStats && (
        <div className="fixed top-14 left-4 z-40 w-80 bg-[#1e222d] border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider">CSV Parsing Metrics</span>
            <button
              onClick={() => setShowStats(false)}
              className="text-gray-400 hover:text-white transition-colors duration-150 p-0.5 rounded hover:bg-gray-850"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="p-4 flex flex-col gap-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-gray-800/40 pb-2">
              <span className="text-gray-400 font-medium">Status</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                parseFeedback.skippedCount > 0 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'
              }`}>
                {parseFeedback.skippedCount > 0 ? 'Warnings Detected' : 'Perfect Ingestion'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Total rows read</span>
              <span className="text-white font-medium">{parseFeedback.rowCount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Successfully loaded</span>
              <span className="text-green-400 font-bold">{parseFeedback.parsedCount.toLocaleString()} bars</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Skipped (Format error)</span>
              <span className={`${parseFeedback.skippedCount > 0 ? 'text-yellow-400 font-bold' : 'text-gray-500'}`}>
                {parseFeedback.skippedCount} rows
              </span>
            </div>

            <div className="flex justify-between flex-wrap gap-1">
              <span className="text-gray-400">Columns found</span>
              <span className="text-white font-mono text-[10px] text-right break-all truncate max-w-[150px]">
                {parseFeedback.headers.join(', ')}
              </span>
            </div>

            {parseFeedback.errors.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-800">
                <span className="text-xs font-semibold text-yellow-450 block mb-2 uppercase tracking-wide text-[10px]">Skipped Rows Details:</span>
                <div className="max-h-24 overflow-y-auto bg-black/45 border border-gray-800 rounded-lg p-2.5 text-[10px] text-gray-400 font-mono flex flex-col gap-1.5">
                  {parseFeedback.errors.slice(0, 5).map((err, i) => (
                    <div key={i} className="flex gap-1.5">
                      <span className="text-yellow-500 font-bold">•</span>
                      <span>{err}</span>
                    </div>
                  ))}
                  {parseFeedback.errors.length > 5 && (
                    <div className="text-gray-500 italic mt-0.5">...and {parseFeedback.errors.length - 5} more lines</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex flex-1 w-full h-[calc(100vh-6rem)] overflow-hidden relative">
        
        {/* Left Toolbar */}
        <aside className="w-12 bg-[#1e222d] border-r border-gray-950 flex flex-col items-center py-3 gap-3.5 z-20">
          
          {ToolRegistry.getAll().map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                title={tool.name}
                disabled={!hasData}
                onClick={() => handleSelectTool(tool.id)}
                className={`p-2 rounded-lg border transition-all ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-600/20 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/60 disabled:opacity-30 disabled:hover:bg-transparent'
                }`}
              >
                <Icon />
              </button>
            );
          })}

          <button
            title="Clear Drawings"
            disabled={!hasData}
            onClick={handleClearDrawings}
            className="p-2 rounded-lg border border-transparent text-gray-400 hover:text-white hover:bg-gray-800/60 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>

          <div className="relative">
            <button
              title="Magnet Mode (Snap to OHLC)"
              disabled={!hasData}
              onClick={handleToggleMagnet}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!hasData) return;
                setMagnetMenuPos({ x: e.clientX, y: e.clientY });
                setIsMagnetMenuOpen(true);
              }}
              className={`p-2 rounded-lg border transition-all ${
                magnetMode !== 'normal'
                  ? 'border-indigo-500 bg-indigo-600/20 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/60 disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
            >
              {magnetMode === 'strong_magnet' && (
                <StrongMagnetIcon className="w-4.5 h-4.5" />
              )}
              {magnetMode === 'weak_magnet' && (
                <WeakMagnetIcon className="w-4.5 h-4.5" />
              )}
              {(magnetMode === 'normal_magnet' || magnetMode === 'normal') && (
                <Magnet className="w-4.5 h-4.5" />
              )}
            </button>

            {isMagnetMenuOpen && (
              <div
                ref={magnetMenuRef}
                className="fixed z-50 bg-[#1c2030] border border-gray-700/80 rounded-lg shadow-2xl py-1.5 text-sm min-w-[170px]"
                style={{
                  left: `${magnetMenuPos.x + 10}px`,
                  top: `${magnetMenuPos.y - 40}px`,
                }}
              >
                <button
                  onClick={() => {
                    selectMagnetMode('weak_magnet');
                    setIsMagnetMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    magnetMode === 'weak_magnet'
                      ? 'bg-[#f0f3fa] text-gray-900 font-medium'
                      : 'text-gray-200 hover:bg-gray-800/60'
                  }`}
                >
                  <WeakMagnetIcon className={`w-4.5 h-4.5 ${magnetMode === 'weak_magnet' ? 'text-gray-900' : 'text-gray-400'}`} />
                  <span>Weak magnet</span>
                </button>
                <button
                  onClick={() => {
                    selectMagnetMode('normal_magnet');
                    setIsMagnetMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    magnetMode === 'normal_magnet'
                      ? 'bg-[#f0f3fa] text-gray-900 font-medium'
                      : 'text-gray-200 hover:bg-gray-800/60'
                  }`}
                >
                  <Magnet className={`w-4.5 h-4.5 ${magnetMode === 'normal_magnet' ? 'text-gray-900' : 'text-gray-400'}`} />
                  <span>Normal magnet</span>
                </button>
                <button
                  onClick={() => {
                    selectMagnetMode('strong_magnet');
                    setIsMagnetMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    magnetMode === 'strong_magnet'
                      ? 'bg-[#f0f3fa] text-gray-900 font-medium'
                      : 'text-gray-200 hover:bg-gray-800/60'
                  }`}
                >
                  <StrongMagnetIcon className={`w-4.5 h-4.5 ${magnetMode === 'strong_magnet' ? 'text-gray-900' : 'text-gray-400'}`} />
                  <span>Strong magnet</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Charting Canvas container */}
        <main className="flex-1 h-full min-w-0 relative bg-[#131722] overflow-hidden">
          
          <DrawingFloatingToolbar 
            selectedOverlayIds={selectedOverlayIds} 
            drawingTrigger={drawingTrigger}
            onUpdateSettings={(settingsUpdate) => {
              chartInstancesRef.current.forEach(chart => {
                if (!chart) return;
                selectedOverlayIds.forEach(id => {
                  const syncMatch = id.match(/^sync_(.+)_from_(\d+)$/);
                  const originalId = syncMatch ? syncMatch[1] : id;

                  const overlay = chart.getOverlays().find((o: any) => 
                    o.id === originalId || o.id?.startsWith(`sync_${originalId}_from_`)
                  );
                  if (overlay) {
                    chart.overrideOverlay({
                      id: overlay.id,
                      extendData: {
                        ...overlay.extendData,
                        customSettings: {
                          ...(overlay.extendData?.customSettings || {}),
                          ...settingsUpdate
                        }
                      }
                    });
                  }
                });
              });
              syncAllDrawings();
              setDrawingTrigger(prev => prev + 1);
            }}
            getOverlay={(id) => {
               for (let i = 0; i < chartInstancesRef.current.length; i++) {
                 const chart = chartInstancesRef.current[i];
                 if (chart) {
                   const overlay = chart.getOverlays().find((o: any) => o.id === id);
                   if (overlay) return overlay;
                 }
               }
               return null;
            }}
            onLock={() => {
              chartInstancesRef.current.forEach(chart => {
                if (!chart) return;
                selectedOverlayIds.forEach(id => {
                  const overlay = chart.getOverlays().find((o: any) => o.id === id);
                  if (overlay) {
                    const nextLock = !overlay.lock;
                    chart.overrideOverlay({
                      id,
                      lock: nextLock,
                      styles: {
                        point: nextLock ? {
                          radius: 0,
                          activeRadius: 0,
                          color: 'transparent',
                          borderColor: 'transparent',
                          borderSize: 0,
                          activeColor: 'transparent',
                          activeBorderColor: 'transparent',
                          activeBorderSize: 0
                        } : {
                          radius: 4.5,
                          activeRadius: 5.5,
                          color: '#ffffff',
                          borderColor: '#2196F3',
                          borderSize: 1.5,
                          activeColor: '#ffffff',
                          activeBorderColor: '#2196F3',
                          activeBorderSize: 2
                        }
                      }
                    });
                  }
                });
                chart.resize(); // Force redraw of canvas to reflect new selection point sizes
              });
              syncAllDrawings();
              setDrawingTrigger(prev => prev + 1);
            }}
            onDelete={() => {
              let hasLocked = false;
              selectedOverlayIds.forEach(id => {
                for (let i = 0; i < chartInstancesRef.current.length; i++) {
                  const chart = chartInstancesRef.current[i];
                  if (chart) {
                    const overlay = chart.getOverlays().find((o: any) => o.id === id);
                    if (overlay && overlay.lock) {
                      hasLocked = true;
                    }
                  }
                }
              });

              if (hasLocked) {
                setDeleteConfirmOpen(true);
              } else {
                // Delete immediately if none are locked
                chartInstancesRef.current.forEach(chart => {
                  if (!chart) return;
                  selectedOverlayIds.forEach(id => {
                    chart.removeOverlay({ id });
                  });
                });
                setSelectedOverlayIds([]);
                syncAllDrawings();
                setDrawingTrigger(prev => prev + 1);
              }
            }}
            onSettingsClick={() => {
              if (selectedOverlayIds.length > 0) {
                setDrawingSettingsOverlayId(selectedOverlayIds[0]);
                setIsDrawingSettingsOpen(true);
              }
            }}
          />

          {/* KLineChart mount element(s) based on layout configuration */}
          {hasData && renderLayout()}

          {/* Reset View Button — appears on hover at bottom-center */}
          {hasData && (
            <button
              onClick={resetChartView}
              title="Reset view (center last candle)"
              className="
                absolute bottom-8 left-1/2 -translate-x-1/2 z-20
                flex items-center gap-1.5
                px-3.5 py-1.5
                bg-[#1e222d]/80 hover:bg-[#2a2e3d]/95
                border border-white/10 hover:border-indigo-400/50
                text-gray-400 hover:text-indigo-300
                text-[10px] font-semibold tracking-wider uppercase
                rounded-full
                backdrop-blur-sm
                shadow-lg shadow-black/40
                transition-all duration-200
                opacity-0 hover:opacity-100
                pointer-events-auto
                select-none
              "
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Reset View
            </button>
          )}

          {/* Large responsive asset watermark */}
          {hasData && settings.showWatermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
              <div className="text-[7vw] font-extrabold tracking-wider text-white opacity-[0.025] uppercase font-sans">
                {assetName}
              </div>
            </div>
          )}

          {/* Floating Crosshair Indicator */}
          {activeTool && (
            <div className="absolute top-3 left-3 px-3 py-1 bg-indigo-600 text-white rounded-md text-[10px] font-bold tracking-wider uppercase shadow-lg border border-indigo-500 animate-pulse pointer-events-none z-10">
              Drawing Mode: {activeTool}
            </div>
          )}



          {/* Cutpoint Selection Banner */}
          {isReplayActive && isSelectingCutPoint && (
            <div className="absolute top-14 left-1/2 transform -translate-x-1/2 z-30 bg-[#1e222d]/90 border border-indigo-500/35 backdrop-blur-md px-6 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-250">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" style={{ backgroundColor: '#6366f1' }} />
              <span className="text-xs text-white font-medium">
                Click on any candle in the chart to set the starting point for replay.
              </span>
              <button
                onClick={() => setIsSelectingCutPoint(false)}
                className="text-gray-400 hover:text-white text-xs font-semibold bg-gray-800/50 hover:bg-gray-800 px-2.5 py-1 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          )}



          {/* Loader when checking cache or loading symbol on demand */}
          {(isCheckingCache || isLoadingSymbol) && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#131722]/90 backdrop-blur-sm gap-4 select-none">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute w-12 h-12 border-[3px] border-indigo-500/20 rounded-full" />
                <div className="absolute w-12 h-12 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="flex flex-col items-center gap-1.5 mt-2 animate-pulse">
                <span className="text-xs font-bold uppercase tracking-widest text-white">
                  {isLoadingSymbol ? 'Loading Data' : 'Restoring Session'}
                </span>
                <span className="text-[10px] text-gray-500 font-medium">Please wait while we load your chart data...</span>
              </div>
            </div>
          )}

          {/* Dropzone (Hides automatically when hasData = true) */}
          {!hasData && !isCheckingCache && (
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 bg-[#131722]/98 transition-all gap-5 overflow-y-auto"
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
              />
              
              {parseFeedback && parseFeedback.parsedCount === 0 ? (
                // FAILED INGESTION LOG VIEW
                <div className="max-w-xl w-full text-left flex flex-col bg-[#1e222d] border border-red-500/20 p-8 rounded-2xl shadow-xl backdrop-blur-md">
                  <div className="flex items-center gap-3 text-red-500 mb-4 border-b border-gray-800 pb-3">
                    <AlertCircle className="w-6 h-6" />
                    <span className="font-semibold text-xs tracking-wider uppercase text-white">Import Failed</span>
                  </div>
                  
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    The uploaded CSV file could not be parsed. Please check if the file format matches standard 1-Minute OHLCV columns (Date/Timestamp, Open, High, Low, Close, Volume).
                  </p>

                  <div className="bg-black/40 border border-gray-800 rounded-lg p-3.5 mb-5 flex flex-col gap-1.5 text-xs font-mono text-gray-400">
                    <div><span className="text-gray-500 font-sans">Headers detected:</span> {parseFeedback.headers.length > 0 ? parseFeedback.headers.join(', ') : 'None'}</div>
                    <div><span className="text-gray-500 font-sans">Total rows:</span> {parseFeedback.rowCount}</div>
                  </div>

                  <span className="text-[10px] font-bold text-red-400 mb-2 uppercase tracking-wider">Error Details:</span>
                  <div className="max-h-40 overflow-y-auto bg-red-950/5 border border-red-950/15 rounded-lg p-4 mb-6 flex flex-col gap-2.5 text-xs text-red-300 font-mono">
                    {parseFeedback.errors.map((err, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-red-500 font-bold">•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setParseFeedback(null)}
                      className="px-4 py-2 border border-gray-800 hover:bg-gray-800 hover:text-white rounded-xl text-xs font-semibold text-gray-400 hover:border-gray-700 transition-all"
                    >
                      Reset Upload
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Different File</span>
                    </button>
                  </div>
                </div>
              ) : (
                // STANDARD DUAL MODE IMPORT VIEW
                <div className="flex flex-col items-center justify-start min-h-[578px] h-auto w-full max-w-lg gap-5 py-2">
                  {/* Mode Tab Switcher */}
                  <div className="flex bg-[#131722] p-1 rounded-xl border border-gray-800/85 w-72 h-[38px] transition-all shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        changeImportMode('single');
                        setIsBrokerTfDropdownOpen(false);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg transition-all cursor-pointer text-[11px] font-bold ${
                        importMode === 'single'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Single File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        changeImportMode('folder');
                        setIsBrokerTfDropdownOpen(false);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg transition-all cursor-pointer text-[11px] font-bold ${
                        importMode === 'folder'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Folder Mode</span>
                    </button>
                  </div>

                  {importMode === 'single' ? (
                    // SINGLE FILE IMPORT PROMPT
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full max-w-lg text-center flex flex-col items-center bg-[#1e222d]/60 border border-gray-800 p-8 rounded-2xl shadow-xl backdrop-blur-md hover:border-gray-700 cursor-pointer group min-h-[520px] h-auto justify-between"
                    >
                      <div className="w-full flex-1 flex flex-col justify-start gap-4 items-center">
                        <div className="flex flex-col items-center mb-1">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                            <FileSpreadsheet className="w-6 h-6" />
                          </div>
                          <h3 className="text-base font-semibold text-white mb-1.5 tracking-wide">
                            Import Single CSV File
                          </h3>
                          <p className="text-xs text-gray-400 leading-relaxed max-w-md">
                            Upload your 1-minute OHLCV data file to generate multiple higher timeframe chart views.
                          </p>
                        </div>

                        <div className={`w-full border border-dashed rounded-xl p-6 flex flex-col items-center ${
                          isDragging 
                            ? 'border-indigo-500 bg-indigo-950/10' 
                            : 'border-gray-800/80 group-hover:border-gray-700 bg-black/10'
                        }`}>
                          <Upload className="w-10 h-10 text-gray-500 group-hover:text-indigo-400 transition-colors mb-3" />
                          <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors mb-1">Select 1-Min CSV File</span>
                          <span className="text-[11px] text-gray-500 mb-3.5">Drag & drop your file here, or click to browse</span>
                          <div className="w-72 h-[38px] flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 group-hover:bg-indigo-500 transition-all">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Choose CSV File</span>
                          </div>
                        </div>
                      </div>

                      {/* Custom Timezone Selector */}
                      <div 
                        ref={brokerTfDropdownRef}
                        onClick={(e) => e.stopPropagation()} 
                        className="relative w-72 select-none text-left z-20 mb-5"
                      >
                        <span className="block text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-1.5 text-center">
                          Broker's Server Timezone (Optional)
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsBrokerTfDropdownOpen(!isBrokerTfDropdownOpen)}
                          className="w-full h-[38px] flex items-center justify-between bg-[#131722] hover:bg-[#131722]/80 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 text-xs text-white transition-all cursor-pointer font-medium"
                        >
                          <span className="truncate">{tempBrokerOffset === 'exchange' ? 'Default / Disabled (Configure Later)' : tempBrokerOffset}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isBrokerTfDropdownOpen ? 'rotate-180 text-white' : ''}`} />
                        </button>
                        
                        {isBrokerTfDropdownOpen && (
                          <div className="absolute left-0 right-0 mt-1.5 bg-[#1e222d] border border-gray-800 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-850">
                            <button
                              type="button"
                              onClick={() => {
                                setTempBrokerOffset('exchange');
                                setIsBrokerTfDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-800 hover:text-white cursor-pointer ${
                                tempBrokerOffset === 'exchange' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-gray-400'
                              }`}
                            >
                              Default / Disabled (Configure Later)
                            </button>
                            {TIMEZONE_OPTIONS.filter(opt => opt.value !== 'exchange').map((opt) => (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => {
                                  setTempBrokerOffset(opt.label);
                                  setIsBrokerTfDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-800 hover:text-white cursor-pointer ${
                                  tempBrokerOffset === opt.label ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-gray-400'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap justify-center gap-1.5 text-[10px] text-gray-500 font-mono">
                        <span>Timestamp</span> • <span>Open</span> • <span>High</span> • <span>Low</span> • <span>Close</span> • <span>Volume</span>
                      </div>
                    </div>
                  ) : (
                    // FOLDER IMPORT PROMPT (ACTIVE MULTI-SYMBOL)
                    <div className="max-w-lg w-full text-center flex flex-col items-center bg-[#1e222d]/60 border border-gray-800 p-8 rounded-2xl shadow-xl backdrop-blur-md hover:border-gray-700 select-none group min-h-[520px] h-auto justify-between">
                      
                      <div className="w-full flex-1 flex flex-col justify-start gap-4 items-center">
                        {!folderSymbol ? (
                          <div className="flex flex-col items-center mb-1">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                              <FolderOpen className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-semibold text-white mb-1.5 tracking-wide">
                              Import Symbol Folder
                            </h3>
                            <p className="text-xs text-gray-400 leading-relaxed max-w-md">
                              Select a master folder containing subfolders for each trading pair (e.g. <code>EURUSD</code>, <code>GBPUSD</code>) containing timeframe CSV files.
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center mb-1">
                            <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-1.5">
                              <FolderOpen className="w-4 h-4 text-indigo-400" />
                              <span>Symbol Folder Selected</span>
                            </h3>
                          </div>
                        )}

                        {folderSymbol ? (
                          <div className="flex flex-col gap-3.5 text-left bg-black/30 border border-gray-850/30 rounded-xl p-4 w-full">
                            <div className="flex justify-between items-center border-b border-gray-850 pb-2.5">
                              <div>
                                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                                  {Object.keys(symbolFilesMap).length > 1 ? 'Detected Folder' : 'Detected Symbol'}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-sm font-bold text-white tracking-wide">{folderSymbol}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectFolderAPI()}
                                    className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-indigo-500/10 border border-indigo-500/20 rounded px-1.5 py-0.5"
                                  >
                                    <span>Change</span>
                                  </button>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">CSV Files</div>
                                <div className="text-xs font-semibold text-indigo-400 font-mono mt-0.5">
                                  {
                                    Object.keys(symbolFilesMap).length > 1
                                      ? Object.keys(symbolFilesMap).filter(k => selectedFolderSymbols[k]).reduce((acc, k) => acc + Object.keys(symbolFilesMap[k]).length, 0)
                                      : folderFilesList.length
                                  } detected
                                </div>
                              </div>
                            </div>

                            {Object.keys(symbolFilesMap).length > 1 ? (
                              <div>
                                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2">
                                  Detected Symbol Subfolders ({Object.keys(symbolFilesMap).filter(k => selectedFolderSymbols[k]).length} Selected)
                                </div>
                                <div className="max-h-[160px] overflow-y-auto bg-[#131722]/50 border border-gray-850 rounded-lg p-2 flex flex-col gap-1 scrollbar-thin scrollbar-thumb-gray-800">
                                  {Object.keys(symbolFilesMap).sort().map(sym => {
                                    const isSelected = !!selectedFolderSymbols[sym];
                                    return (
                                      <div
                                        key={sym}
                                        onClick={() => {
                                          setSelectedFolderSymbols(prev => ({
                                            ...prev,
                                            [sym]: !prev[sym]
                                          }));
                                        }}
                                        className={`flex justify-between items-center bg-[#1e222d]/60 border rounded-lg px-3 py-1.5 text-xs text-white cursor-pointer select-none transition-all ${
                                          isSelected ? 'border-indigo-500/40 hover:border-indigo-400/60' : 'border-gray-850/40 opacity-40 hover:opacity-60'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            readOnly
                                            className="w-3.5 h-3.5 accent-indigo-500 rounded cursor-pointer"
                                          />
                                          <span className={`font-semibold tracking-wide ${isSelected ? 'text-indigo-300' : 'text-gray-400'}`}>{sym}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-mono">
                                          {Object.keys(symbolFilesMap[sym]).length} timeframes
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2">Timeframe Mapping Status</div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {HEADER_TIMEFRAMES.map((tf) => {
                                    const matchedFile = folderFilesList.find(f => f.timeframe === tf);
                                    return (
                                      <div 
                                        key={tf} 
                                        className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-[11px] transition-colors ${
                                          matchedFile 
                                            ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300 font-semibold' 
                                            : 'bg-gray-900/40 border-gray-800/80 text-gray-400/85'
                                        }`}
                                      >
                                        <span className="font-bold tracking-wide">{tf}</span>
                                        {matchedFile ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                        ) : (
                                          <span className="text-[8px] px-1 bg-gray-800/40 rounded text-gray-500 border border-gray-700/50">Resample</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full flex flex-col gap-3 items-center">
                            {savedFolderHandle && (
                              <button
                                onClick={handleRestoreSavedFolder}
                                disabled={isVerifyingFolder || isLoadingSymbol}
                                className="w-full border border-emerald-500/30 bg-emerald-600/10 hover:bg-emerald-600/20 rounded-xl p-4 flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <div className="flex items-center gap-3">
                                  <Folder className="w-6 h-6 text-emerald-400" />
                                  <div className="flex flex-col items-start text-left">
                                    <span className="text-sm font-semibold text-emerald-100">Load Saved Folder</span>
                                    <span className="text-[10px] text-emerald-300/70">{savedFolderHandle.name}</span>
                                  </div>
                                </div>
                                {(isVerifyingFolder || isLoadingSymbol) ? <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /> : <ChevronRight className="w-5 h-5 text-emerald-400" />}
                              </button>
                            )}
                            <button
                              onClick={() => handleSelectFolderAPI()}
                              disabled={isVerifyingFolder || isLoadingSymbol}
                              className="w-full border border-dashed rounded-xl p-6 flex flex-col items-center justify-center border-gray-800/80 hover:border-gray-700 bg-black/10 cursor-pointer disabled:opacity-50"
                            >
                              <Folder className="w-10 h-10 text-gray-500 hover:text-indigo-400 transition-colors mb-3" />
                              <span className="text-sm font-semibold text-gray-300 transition-colors mb-1">Select Symbol Directory</span>
                              <span className="text-[11px] text-gray-500 mb-3.5">Click to browse your local symbol folder</span>
                              <div className="w-72 h-[38px] flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all">
                                <FolderOpen className="w-3.5 h-3.5" />
                                <span>Choose Folder</span>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Custom Timezone Selector */}
                      <div 
                        ref={brokerTfDropdownRef}
                        onClick={(e) => e.stopPropagation()} 
                        className="relative w-72 select-none text-left z-20 mt-10 mb-5"
                      >
                        <span className="block text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-1.5 text-center">
                          Broker's Server Timezone (Optional)
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsBrokerTfDropdownOpen(!isBrokerTfDropdownOpen)}
                          className="w-full h-[38px] flex items-center justify-between bg-[#131722] hover:bg-[#131722]/80 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 text-xs text-white transition-all cursor-pointer font-medium"
                        >
                          <span className="truncate">{tempBrokerOffset === 'exchange' ? 'Default / Disabled (Configure Later)' : tempBrokerOffset}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isBrokerTfDropdownOpen ? 'rotate-180 text-white' : ''}`} />
                        </button>
                        
                        {isBrokerTfDropdownOpen && (
                          <div className="absolute left-0 right-0 mt-1.5 bg-[#1e222d] border border-gray-800 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-850">
                            <button
                              type="button"
                              onClick={() => {
                                setTempBrokerOffset('exchange');
                                setIsBrokerTfDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-800 hover:text-white cursor-pointer ${
                                tempBrokerOffset === 'exchange' ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-gray-400'
                              }`}
                            >
                              Default / Disabled (Configure Later)
                            </button>
                            {TIMEZONE_OPTIONS.filter(opt => opt.value !== 'exchange').map((opt) => (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => {
                                  setTempBrokerOffset(opt.label);
                                  setIsBrokerTfDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-800 hover:text-white cursor-pointer ${
                                  tempBrokerOffset === opt.label ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-gray-400'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Import Button */}
                      <button
                        onClick={handleFolderImportConfirm}
                        disabled={!folderSymbol}
                        className={`w-72 h-[38px] mt-2.5 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          folderSymbol
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500'
                            : 'bg-indigo-600/10 border border-indigo-500/5 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>
                          {folderSymbol
                            ? (Object.keys(symbolFilesMap).length > 1
                              ? `Import ${Object.keys(symbolFilesMap).filter(k => selectedFolderSymbols[k]).length} Selected Symbols`
                              : 'Import Detected Symbol')
                            : 'Import Folder'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* ── Right Panel (Watchlist or Object Tree) ── */}
        <aside
          style={{ width: activeRightTab ? `${rightPanelWidth}px` : '0px' }}
          className={`
            flex-shrink-0 h-full
            bg-[#1a1e2e] border-r border-gray-900
            flex flex-col relative overflow-hidden
            ${!isResizingRightPanel ? 'transition-[width] duration-300 ease-in-out' : ''}
          `}
        >
          {/* Resize handle (left edge of panel, acts when panel is open) */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/50 z-10 transition-colors"
            onMouseDown={() => {
              isResizingRightPanelRef.current = true;
              setIsResizingRightPanel(true);
              document.body.style.cursor = 'col-resize';
            }}
          />

          {/* Panel inner — fixed width prevents content bleed during slide */}
          <div 
            style={{ width: `${rightPanelWidth}px` }} 
            className={`h-full flex flex-col transition-opacity duration-200 ${activeRightTab ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >

            {activeRightTab === 'watchlist' && (
              <>
                {/* Watchlist Panel header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800/70">
                  <div className="flex items-center gap-2">
                    <List className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-white">Watchlist</span>
                    {watchlistSymbols.length > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-full">
                        {watchlistSymbols.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Refresh folder button (visible in folder mode when savedFolderHandle is present) */}
                    {importMode === 'folder' && savedFolderHandle && (
                      <button
                        onClick={handleRestoreSavedFolder}
                        disabled={isVerifyingFolder}
                        title="Refresh folder data"
                        className="p-1 rounded-md text-gray-500 hover:text-indigo-300 hover:bg-indigo-600/20 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingFolder ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    {/* + Add symbol icon button */}
                    <button
                      onClick={() => {
                        if (importMode === 'folder') {
                          handleWatchlistAddFolder();
                        } else {
                          watchlistAddInputRef.current?.click();
                        }
                      }}
                      title={importMode === 'folder' ? "Add symbol folder" : "Add symbol from CSV"}
                      className="p-1 rounded-md text-gray-500 hover:text-indigo-300 hover:bg-indigo-600/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      ref={watchlistAddInputRef}
                      type="file"
                      accept=".csv"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          Array.from(e.target.files).forEach(file => {
                            handleWatchlistAddFile(file);
                          });
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Symbol list */}
                <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-gray-800">

                  {/* Inline toast banner */}
                  {watchlistToast && (
                    <div className={`mx-2 mb-2 px-3 py-2 rounded-lg text-[11px] font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
                      watchlistToast.type === 'error'
                        ? 'bg-red-500/10 border border-red-500/25 text-red-400'
                        : 'bg-indigo-500/10 border border-indigo-500/25 text-indigo-300'
                    }`}>
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{watchlistToast.msg}</span>
                    </div>
                  )}

                  {watchlistSymbols.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                        <List className="w-5 h-5 text-indigo-400/60" />
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Load a CSV file to add symbols here. Use the <span className="text-indigo-400 font-semibold">+</span> button to add more.
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-0.5 px-2">
                      {watchlistSymbols.map((sym, idx) => {
                        const isActive = sym.name === activeWatchlistSymbol;
                        return (
                          <li
                            key={sym.name}
                            draggable={true}
                            onDragStart={(e) => handleDragStartWatchlist(e, idx)}
                            onDragOver={(e) => handleDragOverWatchlist(e, idx)}
                            onDragEnd={handleDragEndWatchlist}
                            className="list-none"
                          >
                            <div
                              onClick={() => handleWatchlistSymbolSwitch(sym.name)}
                              className={`
                                w-full flex items-center justify-between gap-2
                                px-3 py-2.5 rounded-xl text-left cursor-pointer
                                transition-all duration-150 group
                                ${isActive
                                  ? 'bg-indigo-600/20 border border-indigo-500/30 text-white'
                                  : 'border border-transparent text-gray-400 hover:bg-gray-800/60 hover:text-white'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {/* Grip drag handle icon */}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0 cursor-grab active:cursor-grabbing">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-500 hover:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="9" cy="12" r="1"/>
                                    <circle cx="9" cy="5" r="1"/>
                                    <circle cx="9" cy="19" r="1"/>
                                    <circle cx="15" cy="12" r="1"/>
                                    <circle cx="15" cy="5" r="1"/>
                                    <circle cx="15" cy="19" r="1"/>
                                  </svg>
                                </div>
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                                  isActive ? 'bg-indigo-400' : 'bg-gray-700 group-hover:bg-gray-500'
                                }`} />
                                <span className="text-xs font-semibold tracking-wide truncate">{sym.name}</span>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-[9px] text-gray-600 group-hover:text-gray-400 transition-colors">
                                  {sym.raw1m.length > 0 ? `${sym.raw1m.length.toLocaleString()}b` : 'Folder'}
                                </span>
                                {isActive && <ChevronRight className="w-3 h-3 text-indigo-400" />}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPendingRemoveSymbol(sym.name);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-600 hover:text-red-400 transition-all"
                                  title="Remove from watchlist"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}

            {activeRightTab === 'objectTree' && (
              <>
                {/* Object Tree Panel header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800/70">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-white">Object Tree</span>
                  </div>
                </div>
                {/* Object Tree content */}
                <div className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin scrollbar-thumb-gray-800">
                  <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-indigo-400/60" />
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Drawings and objects will appear here in the future.
                    </p>
                  </div>
                </div>
              </>
            )}

          </div>
        </aside>

        {/* ── Right icon bar — always pinned to right edge of screen ── */}
        <aside className="w-12 flex-shrink-0 bg-[#1e222d] border-l border-gray-950 flex flex-col items-center py-3 gap-3.5 z-20">

          {/* Watchlist toggle */}
          <div className="relative">
            <button
              onClick={() => setActiveRightTab(v => v === 'watchlist' ? null : 'watchlist')}
              title={activeRightTab === 'watchlist' ? 'Close Watchlist' : 'Open Watchlist'}
              className={`p-2 rounded-lg border transition-all ${
                activeRightTab === 'watchlist'
                  ? 'border-indigo-500 bg-indigo-600/20 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <List className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Object Tree toggle */}
          <div className="relative">
            <button
              onClick={() => setActiveRightTab(v => v === 'objectTree' ? null : 'objectTree')}
              title={activeRightTab === 'objectTree' ? 'Close Object Tree' : 'Open Object Tree'}
              className={`p-2 rounded-lg border transition-all ${
                activeRightTab === 'objectTree'
                  ? 'border-indigo-500 bg-indigo-600/20 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Layers className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Divider — space for future right-panel tools */}
          <div className="w-6 h-px bg-gray-800 my-0.5" />

        </aside>
      </div>



      {/* Footer */}
      <footer className="h-12 bg-[#1e222d] border-t border-gray-950 flex items-center justify-between px-4 z-20 select-none">
        {isReplayActive ? (
          <div className="flex items-center justify-between w-full h-full">
            {/* Left side: Replay Active Status */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Replay Active</span>
            </div>

            {/* Center: Replay Controls */}
            <div className="flex items-center gap-4">
              {/* Jump To / Scissors */}
              <button
                onClick={() => {
                  console.log('[DEBUG] Replay Footer - Clicked Jump To.');
                  setIsSelectingCutPoint(true);
                  setIsReplayPlaying(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-all ${
                  isSelectingCutPoint
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 shadow-md shadow-indigo-500/10'
                    : 'border-transparent text-gray-300 hover:bg-gray-805 hover:bg-gray-800 hover:text-white'
                }`}
                title="Jump to cutpoint (Click candle)"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Jump To</span>
              </button>

              <div className="h-5 w-px bg-gray-800" />

              {/* Step Backward */}
              <button
                disabled={isSelectingCutPoint || replayCurrentTimestamp === null}
                onClick={() => {
                  console.log('[DEBUG] Replay Footer - Step Backward clicked.');
                  handleReplayStepBackward();
                }}
                className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Step Backward"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              {/* Play / Pause */}
              <button
                disabled={isSelectingCutPoint || replayCurrentTimestamp === null}
                onClick={() => {
                  console.log(`[DEBUG] Replay Footer - Play/Pause clicked. Current playing state: ${!isReplayPlaying}`);
                  setIsReplayPlaying(!isReplayPlaying);
                }}
                className={`p-2 rounded-lg transition-all ${
                  isReplayPlaying
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-indigo-650 text-white hover:bg-indigo-650 shadow-lg shadow-indigo-600/10'
                } disabled:opacity-30 disabled:hover:bg-transparent`}
                title={isReplayPlaying ? 'Pause' : 'Play Autoplay'}
              >
                {isReplayPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              {/* Step Forward */}
              <button
                disabled={isSelectingCutPoint || replayCurrentTimestamp === null}
                onClick={() => {
                  console.log('[DEBUG] Replay Footer - Step Forward clicked.');
                  handleReplayStepForward();
                }}
                className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Step Forward"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <div className="h-5 w-px bg-gray-800" />

              {/* Speed Slider with Snap Mechanism */}
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Speed:</span>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={SPEED_STEPS.indexOf(replaySpeed)}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    const speedVal = SPEED_STEPS[idx];
                    console.log(`[DEBUG] Replay Footer Speed - Slider changed to index ${idx} -> speed ${speedVal}s/b`);
                    setReplaySpeed(speedVal);
                  }}
                  className="w-24 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                  title={`Playback speed: ${replaySpeed} seconds per bar`}
                />
                <span className="text-[11px] font-mono font-bold text-indigo-400 w-12 text-right">{replaySpeed}s/b</span>
              </div>
            </div>

            {/* Right side: Exit Button */}
            <button
              onClick={() => {
                console.log('[DEBUG] Replay Footer - Exit Replay clicked.');
                exitReplayMode();
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all"
              title="Exit Replay"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit Replay</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full h-full text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Timezone:</span>
              {/* Custom styled timezone dropdown matching import screen */}
              <div
                ref={footerTzDropdownRef}
                className="relative select-none"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setIsFooterTzOpen(!isFooterTzOpen)}
                  className="h-6 flex items-center gap-1.5 bg-[#131722] hover:bg-[#1e222d] border border-gray-800 hover:border-gray-700 focus:border-indigo-500 rounded-lg px-2.5 text-[10px] text-gray-300 font-bold transition-all cursor-pointer uppercase tracking-wider"
                >
                  <span className="truncate max-w-[140px]">
                    {settings.timezoneAdjustmentEnabled ? (settings.userTimezoneLabel || 'Exchange') : 'Exchange'}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 flex-shrink-0 ${isFooterTzOpen ? 'rotate-180 text-white' : ''}`} />
                </button>

                {isFooterTzOpen && (
                  <div className="absolute bottom-full mb-1.5 left-0 bg-[#1e222d] border border-gray-800 rounded-xl shadow-2xl z-50 min-w-[220px] max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-850">
                    {TIMEZONE_OPTIONS.map((opt) => {
                      const isSelected = opt.value === 'exchange'
                        ? !settings.timezoneAdjustmentEnabled
                        : settings.timezoneAdjustmentEnabled && settings.userTimezoneLabel === opt.label;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => {
                            setIsFooterTzOpen(false);
                            if (opt.value === 'exchange') {
                              const newSettings = { ...settings, timezoneAdjustmentEnabled: false };
                              setSettings(newSettings);
                              localStorage.setItem('tv_clone_settings', JSON.stringify(newSettings));
                              if (raw1mData.length > 0) regenerateTimeframes(raw1mData, newSettings);
                            } else {
                              handleUserTimezoneChange(opt.label);
                            }
                          }}
                          className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-800 hover:text-white cursor-pointer ${
                            isSelected ? 'text-indigo-400 font-bold bg-indigo-500/5' : 'text-gray-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span>
                Precision:{' '}
                {settings.pricePrecision === 0
                  ? `Auto (${hasData ? detectPricePrecision(allTimeframesData[activeTimeframe] || []) : 4}d)`
                  : `${settings.pricePrecision}d`}
              </span>
              <span>•</span>
              <span>Ingested: {hasData ? assetName : 'None'}</span>
              <div className="h-4 w-px bg-gray-800" />
              <button
                disabled={!hasData}
                onClick={() => {
                  setIsReplayActive(true);
                  setIsSelectingCutPoint(true);
                }}
                className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors duration-150 text-xs font-bold normal-case tracking-normal disabled:opacity-30 disabled:pointer-events-none"
                title="Bar Replay"
              >
                <ChevronsLeft className="w-4 h-4" />
                <span>Replay</span>
              </button>
            </div>
          </div>
        )}
      </footer>

      {/* Floating Settings Modal */}
      <ThemeSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsSave={handleSettingsSave}
        hasData={hasData}
        onClearDatabase={handleClearDatabase}
        onUploadNewDataset={processCSVFile}
        assetName={assetName}
        importMode={importMode}
        savedFolderHandle={savedFolderHandle}
        onSelectFolder={async () => {
          setIsSettingsOpen(false);
          await handleSelectFolderAPI(undefined, true);
        }}
      />

      {/* Watchlist Remove Confirmation Dialog */}
      {pendingRemoveSymbol && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1e222d] border border-red-500/20 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wider uppercase text-white mb-1">Remove Symbol?</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Remove <span className="text-white font-semibold">{pendingRemoveSymbol}</span> from the watchlist and delete its stored data?
              </p>
              <p className="text-[11px] text-gray-600 mt-2">
                {watchlistSymbols.filter(s => s.name !== pendingRemoveSymbol).length > 0
                  ? `The chart will switch to the next symbol in the watchlist.`
                  : `No other symbols remain — the import screen will open.`
                }
              </p>
            </div>
            <div className="flex items-center gap-3 justify-center">
              <button
                type="button"
                onClick={() => setPendingRemoveSymbol(null)}
                className="px-4 py-2 border border-gray-800 hover:bg-gray-800 hover:text-white rounded-xl text-xs font-semibold text-gray-400 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleWatchlistRemoveConfirm(pendingRemoveSymbol)}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/25 transition-all cursor-pointer"
              >
                Remove & Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Dialog */}
      {customAlert && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1e222d] border border-indigo-500/20 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wider uppercase text-white mb-1">{customAlert.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">
                {customAlert.message}
              </p>
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setCustomAlert(null)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Drawings Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1e222d] border border-red-500/20 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wider uppercase text-white mb-1">Delete Drawings?</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                One or more selected drawings are locked. Are you sure you want to delete them?
              </p>
            </div>
            <div className="flex items-center gap-3 justify-center mt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 border border-gray-800 hover:bg-gray-800 hover:text-white rounded-xl text-xs font-semibold text-gray-400 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  chartInstancesRef.current.forEach(chart => {
                    if (!chart) return;
                    selectedOverlayIds.forEach(id => {
                      chart.removeOverlay({ id });
                    });
                  });
                  setSelectedOverlayIds([]);
                  syncAllDrawings();
                  setDrawingTrigger(prev => prev + 1);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/25 transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawing Settings Option Dialog */}
      <DrawingSettingsDialog
        isOpen={isDrawingSettingsOpen}
        onClose={() => setIsDrawingSettingsOpen(false)}
        overlay={getSelectedSettingsOverlay()}
        allCandles={allTimeframesData[activeTimeframe] || []}
        timeframe={activeTimeframe}
        pricePrecision={settings.pricePrecision !== 0 ? settings.pricePrecision : detectPricePrecision(allTimeframesData[activeTimeframe] || [])}
        onSave={(updatedSettings, updatedPoints) => {
          chartInstancesRef.current.forEach(chart => {
            if (!chart) return;
            selectedOverlayIds.forEach(id => {
              const syncMatch = id.match(/^sync_(.+)_from_(\d+)$/);
              const originalId = syncMatch ? syncMatch[1] : id;

              const overlay = chart.getOverlays().find((o: any) => 
                o.id === originalId || o.id?.startsWith(`sync_${originalId}_from_`)
              );
              if (overlay) {
                const overrideOptions: any = {
                  id: overlay.id,
                  extendData: {
                    ...overlay.extendData,
                    customSettings: {
                      ...(overlay.extendData?.customSettings || {}),
                      ...updatedSettings
                    }
                  }
                };
                if (updatedPoints && updatedPoints.length > 0) {
                  overrideOptions.points = updatedPoints;
                }
                chart.overrideOverlay(overrideOptions);
              }
            });
            chart.resize();
          });
          syncAllDrawings();
          setDrawingTrigger(prev => prev + 1);
        }}
      />

    </div>
  );
}
