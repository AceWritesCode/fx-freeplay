import { useState, useEffect, useRef } from 'react';
import {
  Trash2,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  X,
} from 'lucide-react';
import { init, dispose } from 'klinecharts';
import { registerCustomOverlays } from '@/utils/overlays';
import {
  detectPricePrecision,
} from '@/utils/dataUtils';
import { ThemeSettingsModal } from '@/components/ThemeSettingsModal';
import { DrawingFloatingToolbar } from '@/components/DrawingFloatingToolbar';
import { DrawingSettingsDialog } from '@/components/DrawingSettingsDialog';
import { FloatingTrendLineText } from '@/components/FloatingTrendLineText';

import { Header } from './components/Header';
import { DrawingToolbar } from './components/DrawingToolbar';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { WorkspaceFooter } from './components/WorkspaceFooter';
import { ChartGrid } from './components/ChartGrid';

import { PRESET_TIMEFRAMES, TIMEZONE_OPTIONS } from '@/config';
import type { ChartSettings } from '@/config';

import {
  getLayoutChartCount,
} from '@/domain/market';

import {
  syncCrosshairs as executeCrosshairSync,
  syncTimeScale as executeTimeSync,
  syncDateRange as executeDateRangeSync,
} from '@/engine/charting';

import {
  useSettingsStore,
  useLayoutStore,
  useReplayStore,
  useWatchlistStore,
  useDrawingStore,
} from '@/store';
import {
  useWorkspaceCoordinator,
  useReplayCoordinator,
  useDrawingCoordinator,
} from '@/coordinator';
import { workspaceLayoutRepository, settingsRepository } from '@/repository';

const HEADER_TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', 'D', 'W', 'M'];

const layoutsList = [
  {
    type: '1',
    label: '1 Chart',
    icon: <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900" />,
  },
  {
    type: '2v',
    label: '2 Columns',
    icon: (
      <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex">
        <div className="w-1/2 h-full border-r border-gray-500/85" />
        <div className="w-1/2 h-full" />
      </div>
    ),
  },
  {
    type: '2h',
    label: '2 Rows',
    icon: (
      <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex flex-col">
        <div className="w-full h-1/2 border-b border-gray-500/85" />
        <div className="w-full h-1/2" />
      </div>
    ),
  },
  {
    type: '3v',
    label: '3 Columns',
    icon: (
      <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex">
        <div className="w-1/3 h-full border-r border-gray-500/85" />
        <div className="w-1/3 h-full border-r border-gray-500/85" />
        <div className="w-1/3 h-full" />
      </div>
    ),
  },
  {
    type: '3h',
    label: '3 Rows',
    icon: (
      <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex flex-col">
        <div className="w-full h-1/3 border-b border-gray-500/85" />
        <div className="w-full h-1/3 border-b border-gray-500/85" />
        <div className="w-full h-1/3" />
      </div>
    ),
  },
  {
    type: '3g1',
    label: '3 Split Left',
    icon: (
      <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex">
        <div className="w-1/2 h-full border-r border-gray-500/85" />
        <div className="w-1/2 h-full flex flex-col">
          <div className="w-full h-1/2 border-b border-gray-500/85" />
          <div className="w-full h-1/2" />
        </div>
      </div>
    ),
  },
  {
    type: '3g2',
    label: '3 Split Top',
    icon: (
      <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex flex-col">
        <div className="w-full h-1/2 border-b border-gray-500/85" />
        <div className="w-full h-1/2 flex">
          <div className="w-1/2 h-full border-r border-gray-500/85" />
          <div className="w-1/2 h-full" />
        </div>
      </div>
    ),
  },
  {
    type: '4g',
    label: '2x2 Grid',
    icon: (
      <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 grid grid-cols-2 grid-rows-2">
        <div className="border-r border-b border-gray-500/85" />
        <div className="border-b border-gray-500/85" />
        <div className="border-r border-gray-500/85" />
        <div className="h-full w-full" />
      </div>
    ),
  },
  {
    type: '4v',
    label: '4 Columns',
    icon: (
      <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex">
        <div className="w-1/4 h-full border-r border-gray-500/85" />
        <div className="w-1/4 h-full border-r border-gray-500/85" />
        <div className="w-1/4 h-full border-r border-gray-500/85" />
        <div className="w-1/4 h-full" />
      </div>
    ),
  },
  {
    type: '4h',
    label: '4 Rows',
    icon: (
      <div className="w-6 h-6 border border-gray-500 rounded bg-gray-900 flex flex-col">
        <div className="w-full h-1/4 border-b border-gray-500/85" />
        <div className="w-full h-1/4 border-b border-gray-500/85" />
        <div className="w-full h-1/4 border-b border-gray-500/85" />
        <div className="w-full h-1/4" />
      </div>
    ),
  },
];

export function ChartWorkspace() {
  const chartContainersRef = useRef<(HTMLDivElement | null)[]>([]);
  const chartInstancesRef = useRef<(any | null)[]>([]);
  const isSyncingCrosshairRef = useRef<boolean>(false);
  const syncCrosshairRef = useRef<boolean>(false);
  const isSyncingRangeRef = useRef<boolean>(false);
  const syncTimeRef = useRef<boolean>(false);
  const syncDateRangeRef = useRef<boolean>(false);
  const syncDrawingsRef = useRef<boolean>(false);
  const activeChartIndexRef = useRef<number>(0);
  const slotsRef = useRef<any[]>([]);
  const layoutTypeRef = useRef<string>('1');
  const layoutContainerRef = useRef<HTMLDivElement>(null);
  const subContainerRef1 = useRef<HTMLDivElement>(null);
  const subContainerRef2 = useRef<HTMLDivElement>(null);
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
  const isShiftPressedRef = useRef<boolean>(false);
  const activeOverlayIdRef = useRef<string | null>(null);

  // Zustand Store Hooks
  const { settings, setSettings, customTimeframes } = useSettingsStore();

  const {
    layoutType,
    setLayoutType,
    activeChartIndex,
    slots,
    setSlots,
    layoutSizes,
    setLayoutSizes,
    syncCrosshair,
    syncTime,
    syncDateRange,
    syncDrawings,
  } = useLayoutStore();

  const {
    isReplayActive,
    replayCurrentTimestamp,
    replaySpeed,
    isReplayPlaying,
    setIsReplayActive,
    setReplaySpeed,
    setIsReplayPlaying,
  } = useReplayStore();

  const {
    watchlistSymbols,
    activeWatchlistSymbol,
    savedFolderHandle,
    symbolFilesMap,
    importMode,
    setImportMode,
  } = useWatchlistStore();

  const {
    selectedOverlayIds,
    setSelectedOverlayIds,
  } = useDrawingStore();

  // Visual layout states
  const [activeRightTab, setActiveRightTab] = useState<'watchlist' | 'objectTree' | null>('watchlist');
  const [rightPanelWidth] = useState<number>(300);
  const [isResizingRightPanel, setIsResizingRightPanel] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isTfDropdownOpen, setIsTfDropdownOpen] = useState<boolean>(false);
  const [customValue, setCustomValue] = useState<number>(10);
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks' | 'months'>('minutes');
  const [tempBrokerOffset, setTempBrokerOffset] = useState<string>('exchange');
  const [isBrokerTfDropdownOpen, setIsBrokerTfDropdownOpen] = useState<boolean>(false);
  const [isFooterTzOpen, setIsFooterTzOpen] = useState<boolean>(false);
  const [pendingRemoveSymbol, setPendingRemoveSymbol] = useState<string | null>(null);
  const [isDrawingSettingsOpen, setIsDrawingSettingsOpen] = useState<boolean>(false);
  const [drawingSettingsOverlayId, setDrawingSettingsOverlayId] = useState<string | null>(null);
  const [watchlistToast, setWatchlistToast] = useState<{ msg: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Dropdown flyout states for DrawingToolbar
  const [selectedCursorId, setSelectedCursorId] = useState<string>('cross');
  const [isCursorMenuOpen, setIsCursorMenuOpen] = useState<boolean>(false);
  const [cursorMenuPos, setCursorMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedLineToolId, setSelectedLineToolId] = useState<string>('trendLine');
  const [isLineMenuOpen, setIsLineMenuOpen] = useState<boolean>(false);
  const [lineMenuPos, setLineMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedShapeToolId, setSelectedShapeToolId] = useState<string>('rectangle');
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState<boolean>(false);
  const [shapeMenuPos, setShapeMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedForecastToolId, setSelectedForecastToolId] = useState<string>('longPosition');
  const [isForecastMenuOpen, setIsForecastMenuOpen] = useState<boolean>(false);
  const [forecastMenuPos, setForecastMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMagnetMenuOpen, setIsMagnetMenuOpen] = useState<boolean>(false);
  const [magnetMenuPos, setMagnetMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dropdown flyout references
  const brokerTfDropdownRef = useRef<HTMLDivElement>(null);
  const footerTzDropdownRef = useRef<HTMLDivElement>(null);
  const rightPanelResizeRef = useRef<boolean>(false);
  const cursorMenuRef = useRef<HTMLDivElement>(null);
  const lineMenuRef = useRef<HTMLDivElement>(null);
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const forecastMenuRef = useRef<HTMLDivElement>(null);
  const magnetMenuRef = useRef<HTMLDivElement>(null);

  // Derived states
  const hasData = activeWatchlistSymbol !== null;
  const assetName = activeWatchlistSymbol || 'No Asset Loaded';
  const activeTimeframe = slots[activeChartIndex]?.timeframe || '1m';

  function applySettingsToChart(chart: any, s: ChartSettings) {
    chart._showPriceLine = s.showPriceLine;
    chart._priceLineStyle = s.priceLineStyle;
    chart._priceLineSize = s.priceLineSize;
    chart._priceLineColor = s.priceLineColor;
    chart._priceLineUseCandleColor = s.priceLineUseCandleColor;
    chart._bullColor = s.bullColor;
    chart._bearColor = s.bearColor;
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
        show: chart._showCandles !== false,
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
          title: { show: false, family: 'Noto Sans, sans-serif' },
          legend: { family: 'Noto Sans, sans-serif' },
        },
        priceMark: {
          show: s.showPriceLine,
          high: { show: false, text: { family: 'Noto Sans, sans-serif' } },
          low: { show: false, text: { family: 'Noto Sans, sans-serif' } },
          last: {
            show: s.showPriceLine,
            upColor: s.bullColor,
            downColor: s.bearColor,
            noChangeColor: '#888888',
            line: {
              show: s.showPriceLine,
              style: s.priceLineStyle,
              size: s.priceLineSize,
              color: s.priceLineColor,
            },
            text: {
              show: s.showPriceLineLabel,
              size: 11,
              family: 'Noto Sans, sans-serif',
              color: '#ffffff',
            },
          },
        },
      },
      xAxis: {
        axisLine: { show: s.showScalesLines, color: s.scalesLinesColor, size: 1 },
        tickText: {
          show: true,
          color: s.scalesTextColor,
          size: s.scalesTextSize,
          family: 'Noto Sans, sans-serif',
        },
      },
      yAxis: {
        axisLine: { show: s.showScalesLines, color: s.scalesLinesColor, size: 1 },
        tickText: {
          show: true,
          color: s.scalesTextColor,
          size: s.scalesTextSize,
          family: 'Noto Sans, sans-serif',
        },
      },
    });
  }

  // Initialize Coordinators
  const drawingCoord = useDrawingCoordinator(chartInstancesRef, isShiftPressedRef);

  const workspaceCoord = useWorkspaceCoordinator(
    chartInstancesRef,
    chartContainersRef,
    dataVersionRef,
    applySettingsToChart,
    drawingCoord.syncAllDrawings,
    drawingCoord.loadDrawingsForSymbol,
    capturedOffsetRef,
    wasManualScaleRef,
    capturedYAxisRangeRef,
    pendingCutAnimation
  );

  const replayCoord = useReplayCoordinator(
    chartInstancesRef,
    chartContainersRef,
    workspaceCoord.allTimeframesData,
    activeTimeframe,
    pendingCutAnimation,
    capturedOffsetRef,
    wasManualScaleRef,
    capturedYAxisRangeRef
  );

  // Connect toast triggers
  useEffect(() => {
    workspaceCoord.setWatchlistToast = setWatchlistToast;
  }, [workspaceCoord]);

  // Update refs when stores change for synchronizations
  useEffect(() => {
    syncCrosshairRef.current = syncCrosshair;
  }, [syncCrosshair]);
  useEffect(() => {
    syncTimeRef.current = syncTime;
  }, [syncTime]);
  useEffect(() => {
    syncDateRangeRef.current = syncDateRange;
  }, [syncDateRange]);
  useEffect(() => {
    syncDrawingsRef.current = syncDrawings;
  }, [syncDrawings]);
  useEffect(() => {
    activeChartIndexRef.current = activeChartIndex;
  }, [activeChartIndex]);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);
  useEffect(() => {
    layoutTypeRef.current = layoutType;
  }, [layoutType]);

  // Layout Manager effect - handles creation and disposal of chart slots
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
          // Register custom overlays first
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

            (chart as any)._onDrawingSync = drawingCoord.syncAllDrawings;
            (chart as any)._onHoverChange = () => {
              drawingCoord.setDrawingTrigger(prev => prev + 1);
            };
            workspaceCoord.loadDataForSlot(i, chart);
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
      useLayoutStore.getState().setActiveChartIndex(0);
    }

    // Resize and re-center charts to fit the new layout size changes
    setTimeout(() => {
      for (let i = 0; i < visibleCount; i++) {
        const chart = chartInstancesRef.current[i];
        if (chart) {
          chart.resize();
          (chart as any)._onDrawingSync = drawingCoord.syncAllDrawings;
          (chart as any)._onHoverChange = () => {
            drawingCoord.setDrawingTrigger(prev => prev + 1);
          };
        }
      }
      if (hasData) {
        workspaceCoord.handleTimeframeSwitch(activeTimeframe, undefined);
      }
    }, 150);
  }, [layoutType, hasData, activeTimeframe]);

  // Clean up all charts on unmount
  useEffect(() => {
    return () => {
      for (let i = 0; i < 4; i++) {
        if (chartInstancesRef.current[i]) {
          dispose(chartInstancesRef.current[i]);
        }
      }
    };
  }, []);

  // Synchronize keydown and clicks
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

  // Close custom timezone and flyouts when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brokerTfDropdownRef.current && !brokerTfDropdownRef.current.contains(event.target as Node)) {
        setIsBrokerTfDropdownOpen(false);
      }
      if (footerTzDropdownRef.current && !footerTzDropdownRef.current.contains(event.target as Node)) {
        setIsFooterTzOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Crosshairs & Scales Event Handlers
  const handleCrosshairSync = (sourceIndex: number, params: any) => {
    if (isSyncingCrosshairRef.current || !syncCrosshairRef.current) return;
    isSyncingCrosshairRef.current = true;
    executeCrosshairSync(sourceIndex, params, chartInstancesRef.current, slotsRef.current, layoutTypeRef.current);
    isSyncingCrosshairRef.current = false;
  };

  const handleTimeSync = (sourceIndex: number, param: any) => {
    if (isSyncingRangeRef.current || !syncTimeRef.current) return;
    isSyncingRangeRef.current = true;
    executeTimeSync(sourceIndex, param, chartInstancesRef.current, slotsRef.current, layoutTypeRef.current, syncCrosshairRef.current);
    isSyncingRangeRef.current = false;
  };

  const handleDateRangeSync = (sourceIndex: number) => {
    if (isSyncingRangeRef.current || !syncDateRangeRef.current) return;
    isSyncingRangeRef.current = true;
    executeDateRangeSync(sourceIndex, chartInstancesRef.current, slotsRef.current, layoutTypeRef.current);
    isSyncingRangeRef.current = false;
  };

  // Resizing layout columns
  const startResize = (
    key: string,
    index: number,
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

      setLayoutSizes({ [key]: newSizes });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      chartInstancesRef.current.forEach((c) => c && c.resize());
      workspaceLayoutRepository.saveLayoutConfig({
        layoutSizes: useLayoutStore.getState().layoutSizes,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Staging Layout triggers
  const handleSelectLayout = (type: string) => {
    const currentSymbol = slots[0]?.symbol || assetName;
    const currentTf = slots[0]?.timeframe || activeTimeframe;
    const newSlots = slots.map(() => ({
      symbol: hasData ? currentSymbol : null,
      timeframe: currentTf,
    }));
    setSlots(newSlots);
    setLayoutType(type);
    workspaceLayoutRepository.saveLayoutConfig({
      layoutType: type,
      slots: newSlots,
    });
  };

  const handleSettingsSave = (newSettings: ChartSettings) => {
    const timezoneChanged =
      newSettings.timezoneAdjustmentEnabled !== settings.timezoneAdjustmentEnabled ||
      newSettings.brokerTimezoneOffset !== settings.brokerTimezoneOffset ||
      newSettings.userTimezoneOffset !== settings.userTimezoneOffset;

    setSettings(newSettings);
    settingsRepository.saveSettings(newSettings);

    const visibleCount = getLayoutChartCount(layoutType);
    for (let i = 0; i < visibleCount; i++) {
      const c = chartInstancesRef.current[i];
      if (c) {
        applySettingsToChart(c, newSettings);
        const slot = slots[i];
        if (slot && slot.symbol) {
          const rawData = workspaceCoord.getRawDataFromCache(slot.symbol);
          const precision = newSettings.pricePrecision !== 0 ? newSettings.pricePrecision : detectPricePrecision(rawData);
          c.setSymbol({
            ticker: slot.symbol,
            pricePrecision: precision,
            volumePrecision: 4,
          });
        }
      }
    }

    if (timezoneChanged) {
      const rawData = workspaceCoord.getRawDataFromCache(activeWatchlistSymbol || '');
      if (rawData.length > 0) {
        dataVersionRef.current += 1;
        workspaceCoord.regenerateTimeframes(rawData, newSettings, activeTimeframe);
      }
    }
  };

  const handleUserTimezoneChange = (label: string) => {
    const timezoneOpt = TIMEZONE_OPTIONS.find((t) => t.label === label);
    const offset = timezoneOpt && typeof timezoneOpt.value === 'number' ? timezoneOpt.value : 0;

    const newSettings = {
      ...settings,
      timezoneAdjustmentEnabled: true,
      userTimezoneOffset: offset,
      userTimezoneLabel: label,
    };
    setSettings(newSettings);
    settingsRepository.saveSettings(newSettings);
    const visibleCount = getLayoutChartCount(layoutType);
    for (let i = 0; i < visibleCount; i++) {
      const c = chartInstancesRef.current[i];
      if (c) {
        applySettingsToChart(c, newSettings);
      }
    }
    const rawData = workspaceCoord.getRawDataFromCache(activeWatchlistSymbol || '');
    if (rawData.length > 0) {
      dataVersionRef.current += 1;
      workspaceCoord.regenerateTimeframes(rawData, newSettings, activeTimeframe);
    }
  };

  const handleWatchlistSymbolSwitch = async (symbolName: string) => {
    await workspaceCoord.handleWatchlistSymbolSwitch(symbolName);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (importMode === 'single' && e.dataTransfer.files && e.dataTransfer.files[0]) {
      workspaceCoord.processCSVFile(e.dataTransfer.files[0]);
    }
  };

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
    let tfValue = `${val}${suffix}`;
    if (val === 1) {
      if (suffix === 'D') tfValue = 'D';
      else if (suffix === 'W') tfValue = 'W';
      else if (suffix === 'M') tfValue = 'M';
    }
    const tfLabel = tfValue;

    const exists = PRESET_TIMEFRAMES.some((t) => t.value === tfValue) || customTimeframes.some((t) => t.value === tfValue);
    if (exists) {
      workspaceCoord.handleTimeframeSwitch(tfValue);
      return;
    }
    useSettingsStore.getState().addCustomTimeframe({ label: tfLabel, value: tfValue, minutes });
    setTimeout(() => {
      workspaceCoord.handleTimeframeSwitch(tfValue);
    }, 50);
  };

  const updateDefaultSettings = (toolName: string, settingsUpdate: any) => {
    if (!toolName) return;
    try {
      const key = `fx_default_settings_${toolName}`;
      const saved = localStorage.getItem(key);
      let current = saved ? JSON.parse(saved) : {};
      const merged = {
        ...current,
        ...settingsUpdate,
      };
      delete merged.text;
      localStorage.setItem(key, JSON.stringify(merged));
    } catch (err) {
      console.error('[DEBUG] Failed to update default settings:', err);
    }
  };

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

  const handleClearDrawings = () => {
    chartInstancesRef.current.forEach((c) => {
      if (!c) return;
      const overlays = c.getOverlays();
      overlays.forEach((ov: any) => {
        if (
          ov.id !== 'custom_price_line_overlay' &&
          ov.name !== 'customPriceLine' &&
          ov.id !== 'session_breaks_overlay' &&
          ov.name !== 'sessionBreaks'
        ) {
          c.removeOverlay({ id: ov.id });
        }
      });
    });
    drawingCoord.syncAllDrawings();
    setSelectedOverlayIds([]);
    drawingCoord.setDrawingTrigger((prev) => prev + 1);
  };

  // Render chart slots
  const renderSlot = (i: number) => {
    const isActive = i === activeChartIndex;
    const showHighlight = layoutType !== '1';
    return (
      <div
        onClick={() => workspaceCoord.handleSelectChartSlot(i)}
        className={`
          relative w-full h-full bg-[#131722] rounded overflow-hidden transition-colors duration-200 cursor-pointer min-w-[150px] min-h-[150px]
          ${showHighlight && isActive ? 'ring-2 ring-indigo-500/40 z-10 shadow-md shadow-indigo-500/5' : showHighlight ? 'border border-gray-800 hover:border-gray-750' : ''}
        `}
      >
        <div
          ref={(el) => {
            chartContainersRef.current[i] = el;
          }}
          className={`w-full h-full ${replayCoord.isSelectingCutPoint && isActive ? 'cursor-cell' : ''}`}
          style={{
            backgroundColor: settings.backgroundType === 'None' ? 'transparent' : settings.background,
          }}
        />

        {/* Vertical Cut Selection Line */}
        {replayCoord.isSelectingCutPoint && isActive && replayCoord.cutPointHoverX !== null && (
          <div
            className="absolute top-0 bottom-0 w-px border-l border-dashed border-red-500 pointer-events-none z-30"
            style={{ left: `${replayCoord.cutPointHoverX}px` }}
          />
        )}

        {/* Slot Info Badge */}
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded bg-[#1e222d]/85 backdrop-blur-sm border border-gray-800 pointer-events-none select-none text-[10px] font-bold text-gray-300">
          <span className={isActive ? 'text-indigo-400' : 'text-gray-400'}>#{i + 1}</span>
          <span>{slots[i]?.symbol || 'No Symbol'}</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-300 font-semibold">{slots[i]?.timeframe || '1m'}</span>
        </div>

        {/* Floating text inputs for all TrendLines */}
        {(() => {
          const chart = chartInstancesRef.current[i];
          const allTrendLines = chart ? chart.getOverlays().filter((o: any) => o.name === 'trendLine') : [];
          return allTrendLines.map((ov: any) => (
            <FloatingTrendLineText
              key={ov.id}
              chart={chart}
              overlay={ov}
              isSelected={selectedOverlayIds.includes(ov.id)}
              onTextChange={(newText) => {
                const syncMatch = ov.id?.match(/^sync_(.+)_from_(\d+)$/);
                const originalId = syncMatch ? syncMatch[1] : ov.id;

                chartInstancesRef.current.forEach((c) => {
                  if (!c) return;
                  const targetOverlay = c.getOverlays().find(
                    (o: any) => o.id === originalId || o.id?.startsWith(`sync_${originalId}_from_`)
                  );
                  if (targetOverlay) {
                    c.overrideOverlay({
                      id: targetOverlay.id,
                      extendData: {
                        ...(targetOverlay.extendData || {}),
                        customSettings: {
                          ...(targetOverlay.extendData?.customSettings || {}),
                          text: newText,
                        },
                      },
                    });
                  }
                  c.resize();
                });
                drawingCoord.syncAllDrawings();
                drawingCoord.setDrawingTrigger((prev) => prev + 1);
              }}
              syncAllDrawings={drawingCoord.syncAllDrawings}
            />
          ));
        })()}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#131722] text-[#b2b5be] overflow-hidden select-none">
      <Header
        assetName={assetName}
        hasData={hasData}
        parseFeedback={workspaceCoord.parseFeedback}
        showStats={workspaceCoord.showStats}
        setShowStats={workspaceCoord.setShowStats}
        activeTimeframe={activeTimeframe}
        onTimeframeSelect={(tf) => workspaceCoord.handleTimeframeSwitch(tf)}
        HEADER_TIMEFRAMES={HEADER_TIMEFRAMES}
        PRESET_TIMEFRAMES={PRESET_TIMEFRAMES}
        isTfDropdownOpen={isTfDropdownOpen}
        setIsTfDropdownOpen={setIsTfDropdownOpen}
        customValue={customValue}
        setCustomValue={setCustomValue}
        customUnit={customUnit}
        setCustomUnit={setCustomUnit}
        handleAddCustomTimeframe={handleAddCustomTimeframe}
        customTimeframes={customTimeframes}
        isReplayActive={isReplayActive}
        setIsReplayActive={setIsReplayActive}
        isSelectingCutPoint={replayCoord.isSelectingCutPoint}
        setIsSelectingCutPoint={replayCoord.setIsSelectingCutPoint}
        replayCurrentTimestamp={replayCurrentTimestamp}
        isLayoutDropdownOpen={isTfDropdownOpen}
        setIsLayoutDropdownOpen={setIsTfDropdownOpen}
        layoutType={layoutType}
        LAYOUT_OPTIONS={layoutsList}
        handleSelectLayout={handleSelectLayout}
        onOpenThemeModal={() => setIsSettingsOpen(true)}
        importMode={importMode}
        savedFolderHandle={savedFolderHandle}
        isVerifyingFolder={workspaceCoord.isVerifyingFolder}
        handleRestoreSavedFolder={workspaceCoord.handleRestoreSavedFolder}
      />

      {/* Floating CSV Import Stats Card */}
      {hasData && workspaceCoord.parseFeedback && workspaceCoord.showStats && (
        <div className="fixed top-14 left-4 z-40 w-80 bg-[#1e222d] border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="font-semibold text-xs tracking-wider uppercase text-white flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              CSV Dataset Ingested
            </span>
            <button
              onClick={() => workspaceCoord.setShowStats(false)}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
          <div className="p-4 flex flex-col gap-3 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Rows Processed</span>
              <span className="font-mono text-white font-semibold">{workspaceCoord.parseFeedback.rowCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Valid OHLCV Candlesticks</span>
              <span className="font-mono text-emerald-400 font-semibold">{workspaceCoord.parseFeedback.parsedCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ignored Header / Invalid Rows</span>
              <span className="font-mono text-amber-500 font-semibold">{workspaceCoord.parseFeedback.skippedCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div
        className="flex-1 flex w-full relative overflow-hidden"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Import Preferences Modal */}
        {isBrokerTfDropdownOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
              ref={brokerTfDropdownRef}
              className="bg-[#1c2030] border border-[#2a2e45] rounded-xl shadow-2xl w-[320px] p-5 flex flex-col gap-4"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs tracking-wider uppercase text-white">Import Configuration</span>
                <button
                  onClick={() => setIsBrokerTfDropdownOpen(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-gray-400">Timezone Shift</label>
                  <select
                    value={tempBrokerOffset}
                    onChange={(e) => setTempBrokerOffset(e.target.value)}
                    className="bg-[#131722] border border-gray-800 text-white rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="exchange">No Timezone Shift (Local)</option>
                    {TIMEZONE_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.label}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-gray-400">Import Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setImportMode('single')}
                      className={`flex-1 p-2 border rounded text-xs cursor-pointer ${importMode === 'single' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-transparent border-gray-800 text-gray-400'}`}
                    >
                      Single File
                    </button>
                    <button
                      onClick={() => setImportMode('folder')}
                      className={`flex-1 p-2 border rounded text-xs cursor-pointer ${importMode === 'folder' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-transparent border-gray-800 text-gray-400'}`}
                    >
                      Folder Structure
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DrawingToolbar
          hasData={hasData}
          activeTool={drawingCoord.activeTool}
          setActiveTool={drawingCoord.setActiveTool}
          selectedCursorId={selectedCursorId}
          setSelectedCursorId={setSelectedCursorId}
          isCursorMenuOpen={isCursorMenuOpen}
          setIsCursorMenuOpen={setIsCursorMenuOpen}
          cursorMenuPos={cursorMenuPos}
          setCursorMenuPos={setCursorMenuPos}
          selectedLineToolId={selectedLineToolId}
          setSelectedLineToolId={setSelectedLineToolId}
          isLineMenuOpen={isLineMenuOpen}
          setIsLineMenuOpen={setIsLineMenuOpen}
          lineMenuPos={lineMenuPos}
          setLineMenuPos={setLineMenuPos}
          selectedShapeToolId={selectedShapeToolId}
          setSelectedShapeToolId={setSelectedShapeToolId}
          isShapeMenuOpen={isShapeMenuOpen}
          setIsShapeMenuOpen={setIsShapeMenuOpen}
          shapeMenuPos={shapeMenuPos}
          setShapeMenuPos={setShapeMenuPos}
          selectedForecastToolId={selectedForecastToolId}
          setSelectedForecastToolId={setSelectedForecastToolId}
          isForecastMenuOpen={isForecastMenuOpen}
          setIsForecastMenuOpen={setIsForecastMenuOpen}
          forecastMenuPos={forecastMenuPos}
          setForecastMenuPos={setForecastMenuPos}
          magnetMode={drawingCoord.magnetMode}
          isMagnetMenuOpen={isMagnetMenuOpen}
          setIsMagnetMenuOpen={setIsMagnetMenuOpen}
          magnetMenuPos={magnetMenuPos}
          setMagnetMenuPos={setMagnetMenuPos}
          handleSelectTool={drawingCoord.handleSelectTool}
          handleClearDrawings={handleClearDrawings}
          handleToggleMagnet={drawingCoord.handleToggleMagnet}
          selectMagnetMode={drawingCoord.selectMagnetMode}
          cursorMenuRef={cursorMenuRef}
          lineMenuRef={lineMenuRef}
          shapeMenuRef={shapeMenuRef}
          forecastMenuRef={forecastMenuRef}
          magnetMenuRef={magnetMenuRef}
          chartInstanceRef={{ current: chartInstancesRef.current[activeChartIndex] }}
          activeOverlayIdRef={activeOverlayIdRef}
        />

        <main className="flex-1 h-full relative overflow-hidden bg-[#131722] p-1 flex">
          {!hasData && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#131722]/95 backdrop-blur-sm p-6 text-center select-none">
              <div className="max-w-md flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
                  <Upload className="w-7 h-7 text-indigo-400" />
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">Load Forex Market Data</h2>
                  <p className="text-gray-400 text-xs leading-relaxed px-4">
                    Import MT5 CSV candlesticks to replay, annotate, and test your trading edge.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 w-full">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/15 border border-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    Select CSV File (Single Mode)
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={workspaceCoord.handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => workspaceCoord.handleSelectFolderAPI(undefined, true)}
                    className="w-full py-2.5 px-4 bg-[#1e222d] hover:bg-[#262b3a] text-gray-200 border border-gray-800 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    Open Directory (Folder Mode)
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="h-full w-full relative">
            <ChartGrid
              layoutType={layoutType}
              layoutContainerRef={layoutContainerRef}
              subContainerRef1={subContainerRef1}
              subContainerRef2={subContainerRef2}
              layoutSizes={layoutSizes}
              startResize={startResize}
              renderSlot={renderSlot}
            />
          </div>
        </main>

        <WorkspaceSidebar
          activeRightTab={activeRightTab}
          setActiveRightTab={setActiveRightTab}
          rightPanelWidth={rightPanelWidth}
          isResizingRightPanel={isResizingRightPanel}
          onResizeStart={() => {
            rightPanelResizeRef.current = true;
            setIsResizingRightPanel(true);
          }}
          onResizeEnd={() => {
            rightPanelResizeRef.current = false;
            setIsResizingRightPanel(false);
          }}
          watchlistSymbols={watchlistSymbols}
          importMode={importMode}
          savedFolderHandle={savedFolderHandle}
          isVerifyingFolder={workspaceCoord.isVerifyingFolder}
          handleRestoreSavedFolder={workspaceCoord.handleRestoreSavedFolder}
          onClearFolderHandles={workspaceCoord.handleClearFolderHandles}
          isRestoreError={workspaceCoord.isRestoreError}
          symbolFilesMap={symbolFilesMap}
          loadSymbolFromFolder={handleWatchlistSymbolSwitch}
          activeSymbol={activeWatchlistSymbol}
          onRemoveSymbol={setPendingRemoveSymbol}
          onAddSymbolFolder={workspaceCoord.handleWatchlistAddFolder}
          onAddSymbolFile={workspaceCoord.handleWatchlistAddFile}
          chartInstancesRef={chartInstancesRef}
          syncAllDrawings={drawingCoord.syncAllDrawings}
          drawingTrigger={drawingCoord.drawingTrigger}
          setDrawingTrigger={drawingCoord.setDrawingTrigger}
          createOverlayWithHandlers={drawingCoord.createOverlayWithHandlers}
          activeChartIndex={activeChartIndex}
          activeTimeframe={activeTimeframe}
          watchlistToast={watchlistToast}
        />
      </div>

      <WorkspaceFooter
        isReplayActive={isReplayActive}
        isSelectingCutPoint={replayCoord.isSelectingCutPoint}
        setIsSelectingCutPoint={replayCoord.setIsSelectingCutPoint}
        replayCurrentTimestamp={replayCurrentTimestamp}
        isReplayPlaying={isReplayPlaying}
        replaySpeed={replaySpeed}
        onSpeedChange={setReplaySpeed}
        handleTogglePlayPause={() => setIsReplayPlaying(!isReplayPlaying)}
        handleStepForward={replayCoord.handleReplayStepForward}
        handleStepBackward={replayCoord.handleReplayStepBackward}
        exitReplayMode={replayCoord.exitReplayMode}
        setIsReplayActive={setIsReplayActive}
        hasData={hasData}
        assetName={assetName}
        settings={settings}
        allTimeframesData={workspaceCoord.allTimeframesData}
        activeTimeframe={activeTimeframe}
        isFooterTzOpen={isFooterTzOpen}
        setIsFooterTzOpen={setIsFooterTzOpen}
        footerTzDropdownRef={footerTzDropdownRef}
        timezoneOptions={TIMEZONE_OPTIONS}
        onUserTimezoneChange={handleUserTimezoneChange}
        onClearTimezoneAdjustment={() => {
          const newSettings = { ...settings, timezoneAdjustmentEnabled: false };
          setSettings(newSettings);
          const rawData = workspaceCoord.getRawDataFromCache(activeWatchlistSymbol || '');
          if (rawData.length > 0) {
            dataVersionRef.current += 1;
            workspaceCoord.regenerateTimeframes(rawData, newSettings, activeTimeframe);
          }
        }}
        detectPricePrecision={detectPricePrecision}
      />

      {/* Floating Settings Modal */}
      <ThemeSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsSave={handleSettingsSave}
        hasData={hasData}
        onClearDatabase={workspaceCoord.handleClearDatabase}
        onUploadNewDataset={workspaceCoord.processCSVFile}
        assetName={assetName}
        importMode={importMode}
        savedFolderHandle={savedFolderHandle}
        onSelectFolder={async () => {
          setIsSettingsOpen(false);
          await workspaceCoord.handleSelectFolderAPI(undefined, true);
        }}
      />

      {/* Watchlist Remove Confirmation Dialog */}
      {pendingRemoveSymbol && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1c2030] border border-[#2a2e45] rounded-xl shadow-2xl w-[340px] p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete watch symbol</h3>
                <p className="text-gray-400 text-[11px] mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-gray-300 text-xs leading-normal">
              Are you sure you want to delete <span className="font-semibold text-white">"{pendingRemoveSymbol}"</span> from your watchlist? All cached timeframe directories will be cleared.
            </p>
            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => setPendingRemoveSymbol(null)}
                className="flex-1 py-2 bg-[#1e222d] border border-gray-800 text-gray-400 text-xs font-semibold rounded hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const target = pendingRemoveSymbol;
                  setPendingRemoveSymbol(null);
                  await workspaceCoord.handleWatchlistRemoveConfirm(target);
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 border border-red-500 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
              >
                Delete symbol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Overlay Modal */}
      {workspaceCoord.customAlert && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1c2030] border border-[#2a2e45] rounded-xl shadow-2xl w-[360px] p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{workspaceCoord.customAlert.title}</h3>
              </div>
            </div>
            <p className="text-gray-300 text-xs leading-normal">
              {workspaceCoord.customAlert.message}
            </p>
            <button
              onClick={() => workspaceCoord.setCustomAlert(null)}
              className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Drawing Floating Toolbar */}
      <DrawingFloatingToolbar
        selectedOverlayIds={selectedOverlayIds}
        drawingTrigger={drawingCoord.drawingTrigger}
        onApplyTemplate={(tplSettings) => {
          if (selectedOverlayIds.length > 0) {
            const firstId = selectedOverlayIds[0];
            const syncMatch = firstId.match(/^sync_(.+)_from_(\d+)$/);
            const originalId = syncMatch ? syncMatch[1] : firstId;
            let toolName = '';
            for (let i = 0; i < chartInstancesRef.current.length; i++) {
              const chart = chartInstancesRef.current[i];
              if (chart) {
                const ov = chart.getOverlays().find((o: any) => o.id === originalId);
                if (ov) {
                  toolName = ov.name;
                  break;
                }
              }
            }
            if (toolName) {
              updateDefaultSettings(toolName, tplSettings);
            }
          }
          chartInstancesRef.current.forEach((chart) => {
            if (!chart) return;
            selectedOverlayIds.forEach((id) => {
              const syncMatch = id.match(/^sync_(.+)_from_(\d+)$/);
              const originalId = syncMatch ? syncMatch[1] : id;
              const overlay = chart.getOverlays().find(
                (o: any) => o.id === originalId || o.id?.startsWith(`sync_${originalId}_from_`)
              );
              if (overlay) {
                chart.overrideOverlay({
                  id: overlay.id,
                  extendData: {
                    ...overlay.extendData,
                    customSettings: {
                      ...(overlay.extendData?.customSettings || {}),
                      ...tplSettings,
                    },
                  },
                });
              }
            });
          });
          drawingCoord.syncAllDrawings();
          setSelectedOverlayIds([]);
          drawingCoord.setDrawingTrigger((prev) => prev + 1);
        }}
        onLock={() => {
          chartInstancesRef.current.forEach((chart) => {
            if (!chart) return;
            selectedOverlayIds.forEach((id) => {
              const overlay = chart.getOverlays().find((o: any) => o.id === id);
              if (overlay) {
                const nextLock = !overlay.lock;
                chart.overrideOverlay({
                  id,
                  lock: nextLock,
                  styles: {
                    point: nextLock
                      ? {
                          radius: 0,
                          activeRadius: 0,
                          color: 'transparent',
                          borderColor: 'transparent',
                          borderSize: 0,
                          activeColor: 'transparent',
                          activeBorderColor: 'transparent',
                          activeBorderSize: 0,
                        }
                      : {
                          radius: 4.5,
                          activeRadius: 5.5,
                          color: '#ffffff',
                          borderColor: '#2196F3',
                          borderSize: 1.5,
                          activeColor: '#ffffff',
                          activeBorderColor: '#2196F3',
                          activeBorderSize: 2,
                        },
                  },
                });
              }
            });
            chart.resize();
          });
          drawingCoord.syncAllDrawings();
          drawingCoord.setDrawingTrigger((prev) => prev + 1);
        }}
        onUpdateSettings={(settingsUpdate) => {
          if (selectedOverlayIds.length > 0) {
            const firstId = selectedOverlayIds[0];
            const syncMatch = firstId.match(/^sync_(.+)_from_(\d+)$/);
            const originalId = syncMatch ? syncMatch[1] : firstId;
            let toolName = '';
            for (let i = 0; i < chartInstancesRef.current.length; i++) {
              const chart = chartInstancesRef.current[i];
              if (chart) {
                const ov = chart.getOverlays().find((o: any) => o.id === originalId);
                if (ov) {
                  toolName = ov.name;
                  break;
                }
              }
            }
            if (toolName) {
              updateDefaultSettings(toolName, settingsUpdate);
            }
          }
          chartInstancesRef.current.forEach((chart) => {
            if (!chart) return;
            selectedOverlayIds.forEach((id) => {
              const syncMatch = id.match(/^sync_(.+)_from_(\d+)$/);
              const originalId = syncMatch ? syncMatch[1] : id;

              const overlay = chart.getOverlays().find(
                (o: any) => o.id === originalId || o.id?.startsWith(`sync_${originalId}_from_`)
              );
              if (overlay) {
                chart.overrideOverlay({
                  id: overlay.id,
                  extendData: {
                    ...overlay.extendData,
                    customSettings: {
                      ...(overlay.extendData?.customSettings || {}),
                      ...settingsUpdate,
                    },
                  },
                });
              }
            });
          });
          drawingCoord.syncAllDrawings();
          drawingCoord.setDrawingTrigger((prev) => prev + 1);
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
        onSettingsClick={() => {
          if (selectedOverlayIds.length > 0) {
            setDrawingSettingsOverlayId(selectedOverlayIds[0]);
            setIsDrawingSettingsOpen(true);
          }
        }}
        onDelete={() => {
          chartInstancesRef.current.forEach((chart) => {
            if (!chart) return;
            selectedOverlayIds.forEach((id) => {
              const syncMatch = id.match(/^sync_(.+)_from_(\d+)$/);
              const originalId = syncMatch ? syncMatch[1] : id;
              chart.removeOverlay({ id: originalId });
              chart.removeOverlay({ id });

              chart.getOverlays().forEach((o: any) => {
                if (o.id?.startsWith(`sync_${originalId}_from_`)) {
                  chart.removeOverlay({ id: o.id });
                }
              });
            });
          });
          drawingCoord.syncAllDrawings();
          setSelectedOverlayIds([]);
          drawingCoord.setDrawingTrigger((prev) => prev + 1);
        }}
      />

      {/* Drawing Settings Dialog */}
      <DrawingSettingsDialog
        isOpen={isDrawingSettingsOpen}
        onClose={() => setIsDrawingSettingsOpen(false)}
        overlay={getSelectedSettingsOverlay()}
        allCandles={workspaceCoord.allTimeframesData[activeTimeframe] || []}
        timeframe={activeTimeframe}
        pricePrecision={settings.pricePrecision !== 0 ? settings.pricePrecision : detectPricePrecision(workspaceCoord.allTimeframesData[activeTimeframe] || [])}
        onDeselectOverlay={() => setSelectedOverlayIds([])}
        onSave={(updatedSettings, updatedPoints) => {
          chartInstancesRef.current.forEach((chart) => {
            if (!chart) return;
            selectedOverlayIds.forEach((id) => {
              const syncMatch = id.match(/^sync_(.+)_from_(\d+)$/);
              const originalId = syncMatch ? syncMatch[1] : id;

              const overlay = chart.getOverlays().find(
                (o: any) => o.id === originalId || o.id?.startsWith(`sync_${originalId}_from_`)
              );
              if (overlay) {
                updateDefaultSettings(overlay.name, updatedSettings);
                const overrideOptions: any = {
                  id: overlay.id,
                  extendData: {
                    ...overlay.extendData,
                    customSettings: {
                      ...(overlay.extendData?.customSettings || {}),
                      ...updatedSettings,
                    },
                  },
                };
                if (updatedPoints && updatedPoints.length > 0) {
                  overrideOptions.points = updatedPoints;
                }
                chart.overrideOverlay(overrideOptions);
              }
            });
            chart.resize();
          });
          drawingCoord.syncAllDrawings();
          drawingCoord.setDrawingTrigger((prev) => prev + 1);
        }}
      />
    </div>
  );
}