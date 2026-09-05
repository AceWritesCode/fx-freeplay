import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trash2,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  X,
  FolderOpen,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { init, dispose } from 'klinecharts';
import { registerCustomOverlays } from '@/utils/overlays';
import { DrawingChartAdapter, getOriginalDrawingId } from '@/engine/charting';
import { drawingRepository } from '@/repository';
import {
  detectPricePrecision,
} from '@/utils/dataUtils';
import { ThemeSettingsModal } from '@/components/ThemeSettingsModal';
import { DrawingFloatingToolbar } from '@/components/DrawingFloatingToolbar';
import { FavoriteDrawingToolbar } from '@/components/FavoriteDrawingToolbar';
import { DrawingSettingsDialog } from '@/components/DrawingSettingsDialog';
import { DataManagementDashboard } from '@/components/DataManagementDashboard';
import { initThemeFromStorage } from '@/utils/themeApplier';
import { useDrawingInteraction, useDrawingHoverCursor, useBrushDrawing, useEraserDrawing, useMeasurementTool, useZoomTool } from '@/framework/interaction';

import { Header } from './components/Header';
import { DrawingToolbar } from './components/DrawingToolbar';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { WorkspaceFooter } from './components/WorkspaceFooter';
import { ChartGrid } from './components/ChartGrid';
import { ChartSlot } from './components/ChartSlot';

import { PRESET_TIMEFRAMES, TIMEZONE_OPTIONS } from '@/config';
import type { ChartSettings } from '@/config';

import {
  getLayoutChartCount,
  parseTimeframeToPeriod,
} from '@/domain/market';

import {
  syncCrosshairs as executeCrosshairSync,
  syncTimeScale as executeTimeSync,
  syncDateRange as executeDateRangeSync,
  runWorkspaceReconciliation,
  reconcileWorkspace,
  mirrorLiveOverlayUpdate,
  registerChartInstance,
  unregisterChartInstance,
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

// Stable empty array to prevent useDrawingStore selectors from returning new [] instances on every render
// (which would cause "getSnapshot should be cached" infinite loop)
const EMPTY_DRAWING_LIST: ReturnType<typeof useDrawingStore.getState>['drawingsBySymbol'][string] = [];

const layoutsList = [
  {
    type: '1',
    label: '1 Chart',
    icon: <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated" />,
  },
  {
    type: '2v',
    label: '2 Columns',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex">
        <div className="w-1/2 h-full border-r border-border-sub" />
        <div className="w-1/2 h-full" />
      </div>
    ),
  },
  {
    type: '2h',
    label: '2 Rows',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex flex-col">
        <div className="w-full h-1/2 border-b border-border-sub" />
        <div className="w-full h-1/2" />
      </div>
    ),
  },
  {
    type: '3v',
    label: '3 Columns',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex">
        <div className="w-1/3 h-full border-r border-border-sub" />
        <div className="w-1/3 h-full border-r border-border-sub" />
        <div className="w-1/3 h-full" />
      </div>
    ),
  },
  {
    type: '3h',
    label: '3 Rows',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex flex-col">
        <div className="w-full h-1/3 border-b border-border-sub" />
        <div className="w-full h-1/3 border-b border-border-sub" />
        <div className="w-full h-1/3" />
      </div>
    ),
  },
  {
    type: '3g1',
    label: '3 Split Left',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex">
        <div className="w-1/2 h-full border-r border-border-sub" />
        <div className="w-1/2 h-full flex flex-col">
          <div className="w-full h-1/2 border-b border-border-sub" />
          <div className="w-full h-1/2" />
        </div>
      </div>
    ),
  },
  {
    type: '3g2',
    label: '3 Split Top',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex flex-col">
        <div className="w-full h-1/2 border-b border-border-sub" />
        <div className="w-full h-1/2 flex">
          <div className="w-1/2 h-full border-r border-border-sub" />
          <div className="w-1/2 h-full" />
        </div>
      </div>
    ),
  },
  {
    type: '4g',
    label: '2x2 Grid',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated grid grid-cols-2 grid-rows-2">
        <div className="border-r border-b border-border-sub" />
        <div className="border-b border-border-sub" />
        <div className="border-r border-border-sub" />
        <div className="h-full w-full" />
      </div>
    ),
  },
  {
    type: '4v',
    label: '4 Columns',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex">
        <div className="w-1/4 h-full border-r border-border-sub" />
        <div className="w-1/4 h-full border-r border-border-sub" />
        <div className="w-1/4 h-full border-r border-border-sub" />
        <div className="w-1/4 h-full" />
      </div>
    ),
  },
  {
    type: '4h',
    label: '4 Rows',
    icon: (
      <div className="w-6 h-6 border border-border-def rounded bg-surface-elevated flex flex-col">
        <div className="w-full h-1/4 border-b border-border-sub" />
        <div className="w-full h-1/4 border-b border-border-sub" />
        <div className="w-full h-1/4 border-b border-border-sub" />
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
  const userInteractingSlotRef = useRef<number | null>(null);
  const slotsRef = useRef<any[]>([]);
  const layoutTypeRef = useRef<string>('1');
  const prevSlotsRef = useRef<any[] | null>(null);
  const prevLayoutTypeRef = useRef<string | null>(null);
  const layoutContainerRef = useRef<HTMLDivElement>(null);
  const subContainerRef1 = useRef<HTMLDivElement>(null);
  const subContainerRef2 = useRef<HTMLDivElement>(null);
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
  const isCtrlPressedRef = useRef<boolean>(false);
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
    syncSymbol,
    syncInterval,
    syncCrosshair,
    syncTime,
    syncDateRange,
    syncDrawings,
    setSyncSetting,
    isBootstrapped,
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
    savedFolderHandles,
  } = useWatchlistStore();

  const {
    selectedOverlayIds,
    setSelectedOverlayIds,
  } = useDrawingStore();

  // Visual layout states
  const [activeRightTab, setActiveRightTab] = useState<'watchlist' | 'objectTree' | 'sessionDisplay' | null>('watchlist');
  const [rightPanelWidth] = useState<number>(300);
  const [isResizingRightPanel, setIsResizingRightPanel] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isDataManagementOpen, setIsDataManagementOpen] = useState<boolean>(false);
  const [isTfDropdownOpen, setIsTfDropdownOpen] = useState<boolean>(false);
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState<boolean>(false);
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
  const [selectedTextToolId, setSelectedTextToolId] = useState<string>('text');
  const [isTextMenuOpen, setIsTextMenuOpen] = useState<boolean>(false);
  const [textMenuPos, setTextMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedForecastToolId, setSelectedForecastToolId] = useState<string>('longPosition');
  const [isForecastMenuOpen, setIsForecastMenuOpen] = useState<boolean>(false);
  const [forecastMenuPos, setForecastMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMagnetMenuOpen, setIsMagnetMenuOpen] = useState<boolean>(false);
  const [magnetMenuPos, setMagnetMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredOverlayId, setHoveredOverlayId] = useState<string | null>(null);
  const [isHoveringBottom10, setIsHoveringBottom10] = useState<boolean>(false);

  // Reset View interactive configuration states
  const [isSettingResetView, setIsSettingResetView] = useState<boolean>(false);
  const [resetViewHoverX, setResetViewHoverX] = useState<number | null>(null);
  const [isHoldingResetView, setIsHoldingResetView] = useState<boolean>(false);
  const resetViewHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resetViewHoldStartTimeRef = useRef<number>(0);

  const handleCanvasContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const distanceFromBottom = rect.bottom - e.clientY;
    const bottomThreshold = rect.height * 0.10;
    const isBottom = distanceFromBottom >= 0 && distanceFromBottom <= bottomThreshold;
    if (isBottom !== isHoveringBottom10) {
      setIsHoveringBottom10(isBottom);
    }
  };

  const handleCanvasContainerMouseLeave = () => {
    if (isHoveringBottom10) {
      setIsHoveringBottom10(false);
    }
  };

  // Dropdown flyout references
  const brokerTfDropdownRef = useRef<HTMLDivElement>(null);
  const footerTzDropdownRef = useRef<HTMLDivElement>(null);
  const rightPanelResizeRef = useRef<boolean>(false);
  const cursorMenuRef = useRef<HTMLDivElement>(null);
  const lineMenuRef = useRef<HTMLDivElement>(null);
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const textMenuRef = useRef<HTMLDivElement>(null);
  const forecastMenuRef = useRef<HTMLDivElement>(null);
  const magnetMenuRef = useRef<HTMLDivElement>(null);

  // Derived states
  const hasData = slots.some((s) => s.symbol !== null);
  const assetName = slots[activeChartIndex]?.symbol || (isBootstrapped ? 'No Asset Loaded' : '');
  const activeTimeframe = slots[activeChartIndex]?.timeframe || '1m';

  // Hydrate UI Theme CSS variables from storage on mount
  useEffect(() => {
    initThemeFromStorage();
  }, []);

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
    capturedYAxisRangeRef,
    workspaceCoord.loadDataForSlot,
    settings
  );

  // Connect toast triggers
  useEffect(() => {
    workspaceCoord.setWatchlistToast = setWatchlistToast;
  }, [workspaceCoord]);

  // Synchronous selection update handler that updates ref properties, Zustand store, and canvas repaints in one frame
  const handleSelectOverlayIds = useCallback(
    (idsOrFn: string[] | ((prev: string[]) => string[])) => {
      const current = useDrawingStore.getState().selectedOverlayIds;
      const nextIds = typeof idsOrFn === 'function' ? idsOrFn(current) : idsOrFn;

      // Auto-delete empty text drawings on exit edit mode if no text was entered
      current.forEach((prevId) => {
        if (!nextIds.includes(prevId)) {
          const originalId = getOriginalDrawingId(prevId);
          const resolved = useDrawingStore.getState().findSymbolByDrawingId(originalId);
          if (resolved && (resolved.drawing.name === 'fxText' || resolved.drawing.name === 'text')) {
            const rawText = resolved.drawing.extendData?.customSettings?.text;
            const hasText = typeof rawText === 'string' && rawText.trim().length > 0 && rawText !== 'Add text';
            if (!hasText) {
              console.log(`[Auto-Delete] Removing empty text box "${originalId}" on exit edit mode`);
              useDrawingStore.getState().removeSymbolDrawing(resolved.symbol, originalId);
              chartInstancesRef.current.forEach((chart) => {
                if (chart) {
                  chart.removeOverlay({ id: originalId });
                  chart.removeOverlay({ id: prevId });
                  const overlays = chart.getOverlays() || [];
                  overlays.forEach((ov: any) => {
                    if (ov.id === originalId || ov.id?.startsWith(`sync_${originalId}_`)) {
                      chart.removeOverlay({ id: ov.id });
                    }
                  });
                  DrawingChartAdapter.invalidatePane(chart, 'candle_pane');
                }
              });
            }
          }
        }
      });

      chartInstancesRef.current.forEach((chart) => {
        if (chart) {
          chart._selectedOverlayIds = nextIds;
          const overlays = chart.getOverlays();
          overlays.forEach((ov: any) => {
            if (
              ov.id === 'custom_price_line_overlay' ||
              ov.name === 'customPriceLine' ||
              ov.id === 'session_breaks_overlay' ||
              ov.name === 'sessionBreaks'
            )
              return;
            const isSelected = nextIds.includes(ov.id);

            // If entering edit mode on an anchored overlay with a pinned screen position,
            // immediately convert the pinned screen coordinates to current candle points under the box
            // and save to drawing store so selecting never jumps back to old candle positions.
            if (isSelected && ov.extendData?.customSettings?.isAnchored && ov.extendData?.customSettings?.pinnedPixelPosition) {
              const fp = ov.extendData.customSettings.pinnedPixelPosition;
              const p1Conv = chart.convertFromPixel([{ x: fp.x, y: fp.y }], { paneId: 'candle_pane' })?.[0];
              const p2Conv = chart.convertFromPixel([{ x: fp.x + (fp.width || 120), y: fp.y + 16 }], { paneId: 'candle_pane' })?.[0];
              if (p1Conv && p2Conv) {
                const cleanCustomSettings = { ...ov.extendData.customSettings };
                delete cleanCustomSettings.pinnedPixelPosition;
                delete cleanCustomSettings.fixedPixelPosition;

                const nextPoints = [
                  { timestamp: p1Conv.timestamp, value: p1Conv.value, dataIndex: p1Conv.dataIndex },
                  { timestamp: p2Conv.timestamp, value: p2Conv.value ?? p1Conv.value, dataIndex: p2Conv.dataIndex }
                ];

                chart.overrideOverlay({
                  id: ov.id,
                  points: nextPoints,
                  extendData: {
                    ...(ov.extendData || {}),
                    isSelected: true,
                    customSettings: cleanCustomSettings
                  }
                });

                const originalId = getOriginalDrawingId(ov.id);
                const resolved = useDrawingStore.getState().findSymbolByDrawingId(originalId);
                if (resolved) {
                  useDrawingStore.getState().updateSymbolDrawing(resolved.symbol, originalId, {
                    points: nextPoints,
                    extendData: {
                      ...(resolved.drawing.extendData || {}),
                      customSettings: cleanCustomSettings
                    }
                  });
                }
                return;
              }
            }

            if (ov.extendData?.isSelected !== isSelected) {
              chart.overrideOverlay({
                id: ov.id,
                extendData: {
                  ...(ov.extendData || {}),
                  isSelected,
                },
              });
            }
          });
          DrawingChartAdapter.invalidatePane(chart);
        }
      });

      setSelectedOverlayIds(nextIds);
    },
    [setSelectedOverlayIds]
  );

  // Initialize Drawing Interaction Layer (modifier keys, marquee selection, keyboard shortcuts)
  const drawingInteraction = useDrawingInteraction({
    chartContainersRef,
    chartInstancesRef,
    activeTool: drawingCoord.activeTool,
    selectedOverlayIds,
    onSelectOverlayIds: handleSelectOverlayIds,
    onDeleteSelected: () => {
      selectedOverlayIds.forEach((id) => {
        useDrawingStore.getState().removeSymbolDrawingById(id);
      });
      handleSelectOverlayIds([]);
      runWorkspaceReconciliation(chartInstancesRef);
    },
    onCancelTool: drawingCoord.cancelDrawingSession,
    slots,
  });

  // Keep chart instance styling automatically synchronized with useSettingsStore settings
  useEffect(() => {
    chartInstancesRef.current.forEach((chart) => {
      if (chart) {
        applySettingsToChart(chart, settings);
      }
    });
  }, [settings]);

  // Keep chart selection & active tool state synced to chart instances
  useEffect(() => {
    chartInstancesRef.current.forEach((chart) => {
      if (chart) {
        chart._selectedOverlayIds = selectedOverlayIds;
        chart._setSelectedOverlayIds = handleSelectOverlayIds;
        chart._activeTool = drawingCoord.activeTool;
        chart._activeCursorTool = selectedCursorId;
      }
    });
  }, [selectedOverlayIds, handleSelectOverlayIds, drawingCoord.activeTool, selectedCursorId]);

  // Deselection transition effect: when a selected drawing is deselected, compare its chart state against stored record and commit changes
  const prevSelectedOverlayIdsRef = useRef<string[]>([]);
  useEffect(() => {
    const prevSelected = prevSelectedOverlayIdsRef.current;
    const currentSelected = selectedOverlayIds;

    const deselectedIds = prevSelected.filter((id) => !currentSelected.includes(id));
    prevSelectedOverlayIdsRef.current = currentSelected;

    if (deselectedIds.length > 0) {
      let storeUpdated = false;

      deselectedIds.forEach((id) => {
        // Storage-First rule: Only original drawings (not sync_* copies) update storage
        if (!id.startsWith('sync_')) {
          const resolved = useDrawingStore.getState().findSymbolByDrawingId(id);
          if (resolved) {
            const { symbol: drawingSymbol, drawing: storedDrawing } = resolved;
            
            for (let i = 0; i < chartInstancesRef.current.length; i++) {
              const chart = chartInstancesRef.current[i];
              if (chart) {
                const chartOverlay = chart.getOverlays().find((o: any) => o.id === id);
                if (chartOverlay && storedDrawing) {
                  const pointsChanged = JSON.stringify(chartOverlay.points) !== JSON.stringify(storedDrawing.points);
                  const lockChanged = chartOverlay.lock !== storedDrawing.lock;
                  const visibleChanged = chartOverlay.visible !== (storedDrawing.visible !== false);
                  const extendDataChanged = JSON.stringify(chartOverlay.extendData) !== JSON.stringify(storedDrawing.extendData || {});

                  if (pointsChanged || lockChanged || visibleChanged || extendDataChanged) {
                    useDrawingStore.getState().updateSymbolDrawing(drawingSymbol, id, {
                      points: JSON.parse(JSON.stringify(chartOverlay.points || [])),
                      lock: chartOverlay.lock,
                      visible: chartOverlay.visible !== false,
                      extendData: JSON.parse(JSON.stringify(chartOverlay.extendData || {})),
                    });
                    storeUpdated = true;
                  }
                }
              }
            }
          }
        }
      });

      if (storeUpdated) {
        runWorkspaceReconciliation(chartInstancesRef);
      }
    }
  }, [selectedOverlayIds, activeChartIndex, slots]);

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
    drawingCoord.syncAllDrawings();
  }, [syncDrawings, drawingCoord]);
  useEffect(() => {
    activeChartIndexRef.current = activeChartIndex;
  }, [activeChartIndex]);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);
  useEffect(() => {
    layoutTypeRef.current = layoutType;
  }, [layoutType]);
  const drawingTargetChartIndexRef = useRef<number | null>(drawingCoord.drawingTargetChartIndex);
  useEffect(() => {
    drawingTargetChartIndexRef.current = drawingCoord.drawingTargetChartIndex;
  }, [drawingCoord.drawingTargetChartIndex]);

  // Universal Storage-First Drawing Reconciliation Pipeline (Checkpoint F)
  const drawingsBySymbol = useDrawingStore((s) => s.drawingsBySymbol);

  useEffect(() => {
    runWorkspaceReconciliation(chartInstancesRef);
  }, [drawingsBySymbol, slots, activeChartIndex, syncDrawings]);

  // Slot Data Loader Effect - runs whenever slots or layoutType changes
  useEffect(() => {
    if (!hasData) {
      prevSlotsRef.current = slots;
      prevLayoutTypeRef.current = layoutType;
      return;
    }

    const visibleCount = getLayoutChartCount(layoutType);
    const prevSlots = prevSlotsRef.current;
    
    const layoutTypeChanged = layoutType !== prevLayoutTypeRef.current;

    prevSlotsRef.current = slots;
    prevLayoutTypeRef.current = layoutType;

    const forceAll = !prevSlots || layoutTypeChanged;

    const promises: Promise<void>[] = [];
    for (let i = 0; i < visibleCount; i++) {
      const chart = chartInstancesRef.current[i];
      if (chart) {
        const currentSlot = slots[i];
        const prevSlot = prevSlots?.[i];

        const symbolChanged = currentSlot?.symbol !== prevSlot?.symbol;
        const timeframeChanged = currentSlot?.timeframe !== prevSlot?.timeframe;

        if (forceAll || symbolChanged || timeframeChanged) {
          promises.push(workspaceCoord.loadDataForSlot(i, chart));
        }
      }
    }

    if (promises.length > 0) {
      Promise.all(promises).then(() => {
        drawingCoord.syncAllDrawings();
      }).catch(err => {
        console.error('[DEBUG] Error loading slots data:', err);
      });
    }
  }, [slots, layoutType, hasData]);

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
          console.log(`[DATE-SYNC UNSUBSCRIBE] chart: chart-${i}`);
          try {
            dispose(chartInstancesRef.current[i]);
          } catch (e) {
            console.error(e);
          }
          chartInstancesRef.current[i] = null;
          unregisterChartInstance(i);
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
            registerChartInstance(i, chart);
            (chart as any)._magnetMode = drawingCoord.magnetMode;
            applySettingsToChart(chart, settings);
            
            const markUserInteraction = (e: Event) => {
              if (drawingTargetChartIndexRef.current !== null && drawingTargetChartIndexRef.current !== i) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return;
              }
              userInteractingSlotRef.current = i;
              handleSelectSlot(i);
            };
            container.addEventListener('mousedown', markUserInteraction, { capture: true });
            container.addEventListener('pointerdown', markUserInteraction, { capture: true });
            container.addEventListener('click', markUserInteraction, { capture: true });
            container.addEventListener('mouseup', markUserInteraction, { capture: true });
            container.addEventListener('wheel', markUserInteraction, { capture: true });

            chart.setMaxOffsetLeftDistance(10000);
            chart.setMaxOffsetRightDistance(10000);
            
            const slotTf = slots[i]?.timeframe || '1m';
            chart.setPeriod(parseTimeframeToPeriod(slotTf));
            (chart as any)._loadedTimeframe = slotTf;

            chart.subscribeAction('onCrosshairChange', (params: any) => {
              handleCrosshairSync(i, params);
            });

            chart.subscribeAction('onVisibleRangeChange', () => {
              handleDateRangeSync(i);
            });

            chart.subscribeAction('onScroll', () => {
              if ((chart as any)._isProgrammaticScroll || isSyncingRangeRef.current) return;
              if ((chart as any)._clickedOnOverlay || drawingCoord.activeTool !== null) return;
              const replayState = useReplayStore.getState();
              if (replayState.isReplayActive && replayState.isAutoShiftEnabled) {
                console.log('[DEBUG] Chart pan detected during replay - Disabling Auto Shift');
                replayState.setIsAutoShiftEnabled(false);
              }
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
            (chart as any)._chartIndex = i;
            (chart as any)._selectedOverlayIds = selectedOverlayIds;
            (chart as any)._setSelectedOverlayIds = handleSelectOverlayIds;
            (chart as any)._isCtrlPressedRef = isCtrlPressedRef;
            (chart as any)._isShiftPressedRef = isShiftPressedRef;
            (chart as any)._chartInstancesRef = chartInstancesRef;
            (chart as any)._activeTool = drawingCoord.activeTool;
            workspaceCoord.loadDataForSlot(i, chart);
            chart.resize();
          }
        }
      }
    }

    // Dispose out-of-bounds slots
    for (let i = visibleCount; i < 4; i++) {
      if (chartInstancesRef.current[i]) {
        console.log(`[DATE-SYNC UNSUBSCRIBE] chart: chart-${i}`);
        dispose(chartContainersRef.current[i] || chartInstancesRef.current[i]);
        chartInstancesRef.current[i] = null;
        unregisterChartInstance(i);
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
  }, [layoutType, hasData]);

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

  // Synchronize empty space deselection and anchor/body hover hit testing
  useDrawingHoverCursor({
    chartContainersRef,
    chartInstancesRef,
    selectedOverlayIds,
    hoveredOverlayId,
    setHoveredOverlayId,
    handleSelectOverlayIds,
    drawingCoord,
    isDrawingSettingsOpen,
    selectedCursorId,
  });

  // Continuous freehand pointer tracking and persistence for the Brush tool
  useBrushDrawing({
    chartContainersRef,
    chartInstancesRef,
    activeTool: drawingCoord.activeTool,
    activeChartIndex,
    slots,
    isSpacePressedRef: drawingInteraction.isSpacePressedRef,
    onSelectOverlayIds: handleSelectOverlayIds,
    setActiveTool: drawingCoord.setActiveTool,
    syncAllDrawings: drawingCoord.syncAllDrawings,
    setDrawingTrigger: drawingCoord.setDrawingTrigger,
  });

  // Eraser custom cursor & Shift+drag whiteboard erasing trail
  useEraserDrawing({
    chartContainersRef,
    chartInstancesRef,
    activeTool: drawingCoord.activeTool,
    activeChartIndex,
  });

  // Scale / Measure tool with interactive rectangle overlay and metric info card
  useMeasurementTool({
    chartContainersRef,
    chartInstancesRef,
    activeTool: drawingCoord.activeTool,
    activeChartIndex,
    setActiveTool: drawingCoord.setActiveTool,
  });

  // Zoom In marquee selection & reversible Zoom Out
  const { canZoomOut, zoomOut } = useZoomTool({
    chartContainersRef,
    chartInstancesRef,
    activeTool: drawingCoord.activeTool,
    activeChartIndex,
    setActiveTool: drawingCoord.setActiveTool,
  });

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

  const prevActiveChartIndexRef = useRef<number>(activeChartIndex);
  useEffect(() => {
    prevActiveChartIndexRef.current = activeChartIndex;
    activeChartIndexRef.current = activeChartIndex;
  }, [activeChartIndex]);

  const handleSelectSlot = (i: number) => {
    if (drawingCoord.drawingTargetChartIndex !== null && drawingCoord.drawingTargetChartIndex !== i) {
      return;
    }
    activeChartIndexRef.current = i;
    workspaceCoord.handleSelectChartSlot(i);
  };

  const handleDateRangeSync = (eventSlotIndex: number) => {
    if (!syncDateRangeRef.current || isSyncingRangeRef.current || workspaceCoord.isSwitchingTimeframeRef.current) return;

    // Distinguish genuine physical user interaction from programmatic sync update
    const isPhysicalUserSource = userInteractingSlotRef.current === eventSlotIndex || activeChartIndexRef.current === eventSlotIndex;
    if (!isPhysicalUserSource && userInteractingSlotRef.current !== null) return;

    const sourceIndex = eventSlotIndex;

    isSyncingRangeRef.current = true;
    try {
      executeDateRangeSync(sourceIndex, chartInstancesRef.current, slotsRef.current, layoutTypeRef.current);
    } catch (err) {
      console.error('Error syncing date ranges:', err);
    } finally {
      requestAnimationFrame(() => {
        isSyncingRangeRef.current = false;
      });
    }
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

    const rawVal = layoutSizes[key];
    const initialSizes = [...(rawVal || [50, 50])];
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
    drawingCoord.cancelDrawingSession();
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
      for (let i = 0; i < visibleCount; i++) {
        const slot = slots[i];
        if (slot && slot.symbol) {
          const rawData = workspaceCoord.getRawDataFromCache(slot.symbol);
          if (rawData.length > 0) {
            dataVersionRef.current += 1;
            workspaceCoord.regenerateTimeframes(rawData, newSettings, slot.timeframe, i);
          }
        }
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
      const slot = slots[i];
      if (slot && slot.symbol) {
        const rawData = workspaceCoord.getRawDataFromCache(slot.symbol);
        if (rawData.length > 0) {
          dataVersionRef.current += 1;
          workspaceCoord.regenerateTimeframes(rawData, newSettings, slot.timeframe, i);
        }
      }
    }
  };

  const handleWatchlistSymbolSwitch = async (symbolName: string) => {
    await workspaceCoord.handleWatchlistSymbolSwitch(symbolName);
  };

  const resetChartView = () => {
    chartInstancesRef.current.forEach((chart, index) => {
      if (!chart) return;
      const chartSize = chart.getSize();
      const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
      const slot = slots[index];
      if (!slot) return;
      const fullData = workspaceCoord.allTimeframesData[slot.timeframe] || [];
      if (fullData.length === 0) return;
      
      const activeData = isReplayActive && replayCurrentTimestamp !== null
        ? fullData.filter((d: any) => d.timestamp <= replayCurrentTimestamp)
        : fullData;
        
      if (activeData.length === 0) return;
      
      // Re-enable Y-axis auto-scale so prices appear correctly
      try {
        const pane = (chart as any).getDrawPaneById?.('candle_pane') || (chart as any)._paneIdMap?.get?.('candle_pane');
        const yAxis = pane?.getYAxisComponents?.()?.[0] || chart._candlePaneYAxis;
        if (yAxis) {
          yAxis.setAutoCalcTickFlag?.(true);
        }
      } catch (_) {}
      
      const resetRatio = settings.resetViewOffsetRatio ?? 0.5;
      const targetOffset = chartWidth * resetRatio;
      chart.resize();
      chart.setOffsetRightDistance(targetOffset);
      chart.scrollToDataIndex(activeData.length - 1);

      // Lock the offset in the next frame so scrollToDataIndex cannot override it
      requestAnimationFrame(() => {
        chart.setOffsetRightDistance(targetOffset);
      });
    });
  };

  // Interactive listener for setting custom reset view point
  useEffect(() => {
    if (!isSettingResetView) return;

    const container = chartContainersRef.current[activeChartIndex];
    if (!container) return;

    const handleContainerClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const chartWidth = rect.width;
      if (chartWidth <= 0) return;

      const distanceFromRight = chartWidth - clickX;
      const ratio = Math.max(0.05, Math.min(0.95, distanceFromRight / chartWidth));

      // Save setting
      const updated = { ...settings, resetViewOffsetRatio: ratio };
      setSettings(updated);
      settingsRepository.saveSettings(updated).catch(console.error);

      setIsSettingResetView(false);
      setResetViewHoverX(null);

      // Slide all chart instances to the new reset view point
      chartInstancesRef.current.forEach((chart, idx) => {
        if (!chart) return;
        const width = chart.getSize() && chart.getSize().width > 0 ? chart.getSize().width : chartWidth;
        const targetOffset = width * ratio;
        const slot = slots[idx];
        const tfData = workspaceCoord.allTimeframesData[slot?.timeframe || '1m'] || [];
        const lastIdx = tfData.length > 0 ? tfData.length - 1 : 0;
        chart.resize();
        chart.setOffsetRightDistance(targetOffset);
        chart.scrollToDataIndex(lastIdx);
        requestAnimationFrame(() => {
          chart.setOffsetRightDistance(targetOffset);
        });
      });

      setWatchlistToast({
        msg: `Reset view point set to ${Math.round(ratio * 100)}% from right edge.`,
        type: 'success',
      });
      setTimeout(() => setWatchlistToast(null), 3000);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      setResetViewHoverX(e.clientX - rect.left);
    };

    const handleMouseLeave = () => {
      setResetViewHoverX(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSettingResetView(false);
        setResetViewHoverX(null);
      }
    };

    container.addEventListener('click', handleContainerClick, true);
    container.addEventListener('mousemove', handleMouseMove, true);
    container.addEventListener('mouseleave', handleMouseLeave, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('click', handleContainerClick, true);
      container.removeEventListener('mousemove', handleMouseMove, true);
      container.removeEventListener('mouseleave', handleMouseLeave, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSettingResetView, activeChartIndex, settings, setSettings, slots, workspaceCoord.allTimeframesData]);

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
    const originalId = getOriginalDrawingId(drawingSettingsOverlayId);
    for (let i = 0; i < chartInstancesRef.current.length; i++) {
      const chart = chartInstancesRef.current[i];
      if (chart) {
        const overlay = chart.getOverlays().find((o: any) => o.id === originalId);
        if (overlay) return overlay;
      }
    }
    return null;
  };

  const currentSymbolDrawings = useDrawingStore(
    (s) => (activeWatchlistSymbol ? s.drawingsBySymbol[activeWatchlistSymbol.toUpperCase()] ?? EMPTY_DRAWING_LIST : EMPTY_DRAWING_LIST)
  );
  const isAllDrawingsLocked =
    currentSymbolDrawings.length > 0 && currentSymbolDrawings.every((d) => d.lock === true);
  const isAllDrawingsHidden =
    currentSymbolDrawings.length > 0 && currentSymbolDrawings.every((d) => d.visible === false);

  const handleToggleLockAllDrawings = useCallback(() => {
    const symbol = activeWatchlistSymbol;
    if (!symbol) return;
    const key = symbol.toUpperCase();
    const existing = useDrawingStore.getState().drawingsBySymbol[key] || [];
    if (existing.length === 0) return;

    const allLocked = existing.every((d) => d.lock === true);
    const nextLock = !allLocked;

    const updatedList = existing.map((d) => ({ ...d, lock: nextLock }));
    useDrawingStore.setState((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [key]: updatedList,
      },
    }));
    drawingRepository.saveDrawings(key, updatedList);

    chartInstancesRef.current.forEach((chart) => {
      if (chart) {
        existing.forEach((d) => {
          try {
            chart.overrideOverlay({ id: d.id, lock: nextLock });
          } catch (_) {}
          try {
            chart.overrideOverlay({ id: `sync_${d.id}_from_${chart._chartIndex}`, lock: nextLock });
          } catch (_) {}
        });
        DrawingChartAdapter.invalidatePane(chart);
      }
    });

    if (nextLock) {
      setSelectedOverlayIds([]);
    }

    runWorkspaceReconciliation(chartInstancesRef);
    drawingCoord.setDrawingTrigger((prev) => prev + 1);
  }, [activeWatchlistSymbol, setSelectedOverlayIds, drawingCoord]);

  const handleToggleHideAllDrawings = useCallback(() => {
    const symbol = activeWatchlistSymbol;
    if (!symbol) return;
    const key = symbol.toUpperCase();
    const existing = useDrawingStore.getState().drawingsBySymbol[key] || [];
    if (existing.length === 0) return;

    const allHidden = existing.every((d) => d.visible === false);
    const nextVisible = allHidden; // If all were hidden, unhide (true); else hide (false)

    const updatedList = existing.map((d) => ({ ...d, visible: nextVisible }));
    useDrawingStore.setState((state) => ({
      drawingsBySymbol: {
        ...state.drawingsBySymbol,
        [key]: updatedList,
      },
    }));
    drawingRepository.saveDrawings(key, updatedList);

    chartInstancesRef.current.forEach((chart) => {
      if (chart) {
        existing.forEach((d) => {
          try {
            chart.overrideOverlay({ id: d.id, visible: nextVisible });
          } catch (_) {}
          try {
            chart.overrideOverlay({ id: `sync_${d.id}_from_${chart._chartIndex}`, visible: nextVisible });
          } catch (_) {}
        });
        DrawingChartAdapter.invalidatePane(chart);
      }
    });

    if (!nextVisible) {
      setSelectedOverlayIds([]);
    }

    runWorkspaceReconciliation(chartInstancesRef);
    drawingCoord.setDrawingTrigger((prev) => prev + 1);
  }, [activeWatchlistSymbol, setSelectedOverlayIds, drawingCoord]);

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
  const renderSlot = (i: number) => (
    <ChartSlot
      key={`chart_slot_${i}`}
      slotIndex={i}
      isActive={i === activeChartIndex}
      isMultiChart={layoutType !== '1'}
      slotInfo={slots[i]}
      settings={settings}
      isSelectingCutPoint={replayCoord.isSelectingCutPoint}
      cutPointHoverX={replayCoord.cutPointHoverX}
      isSettingResetView={isSettingResetView}
      resetViewHoverX={resetViewHoverX}
      isDrawingBlocked={drawingCoord.drawingTargetChartIndex !== null && drawingCoord.drawingTargetChartIndex !== i}
      selectedOverlayIds={selectedOverlayIds}
      hoveredOverlayId={hoveredOverlayId}
      chartInstancesRef={chartInstancesRef}
      syncAllDrawings={drawingCoord.syncAllDrawings}
      setDrawingTrigger={drawingCoord.setDrawingTrigger}
      onSelectSlot={handleSelectSlot}
      setContainerRef={(el) => {
        chartContainersRef.current[i] = el;
      }}
    />
  );

  const handleSyncSettingChange = (
    key: 'syncSymbol' | 'syncInterval' | 'syncCrosshair' | 'syncTime' | 'syncDateRange' | 'syncDrawings',
    val: boolean
  ) => {
    setSyncSetting(key, val);

    // Persist to database
    workspaceLayoutRepository.saveLayoutConfig({
      syncSettings: {
        syncSymbol: key === 'syncSymbol' ? val : syncSymbol,
        syncInterval: key === 'syncInterval' ? val : syncInterval,
        syncCrosshair: key === 'syncCrosshair' ? val : syncCrosshair,
        syncTime: key === 'syncTime' ? val : syncTime,
        syncDateRange: key === 'syncDateRange' ? val : syncDateRange,
        syncDrawings: key === 'syncDrawings' ? val : syncDrawings,
      }
    });
    
    // Immediately synchronize if the flag is enabled
    if (key === 'syncSymbol') {
      setSelectedOverlayIds([]);
      if (val) {
        const activeSlot = slots[activeChartIndex];
        if (activeSlot && activeSlot.symbol) {
          const newSlots = slots.map((s) => ({ ...s, symbol: activeSlot.symbol }));
          setSlots(newSlots);
          workspaceLayoutRepository.saveLayoutConfig({ slots: newSlots });
          reconcileWorkspace(newSlots, chartInstancesRef, activeChartIndex, syncDrawings);
        }
      } else {
        reconcileWorkspace(slots, chartInstancesRef, activeChartIndex, syncDrawings);
      }
    }
    if (key === 'syncInterval' && val) {
      const activeSlot = slots[activeChartIndex];
      if (activeSlot) {
        const newSlots = slots.map((s) => ({ ...s, timeframe: activeSlot.timeframe }));
        setSlots(newSlots);
        workspaceLayoutRepository.saveLayoutConfig({ slots: newSlots });
      }
    }
    if (key === 'syncDrawings') {
      reconcileWorkspace(slots, chartInstancesRef, activeChartIndex, val);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-app-bg text-txt-secondary overflow-hidden select-none">
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
        isLayoutDropdownOpen={isLayoutDropdownOpen}
        setIsLayoutDropdownOpen={setIsLayoutDropdownOpen}
        layoutType={layoutType}
        LAYOUT_OPTIONS={layoutsList}
        handleSelectLayout={handleSelectLayout}
        onOpenThemeModal={() => setIsSettingsOpen(true)}
        onOpenDataManagementModal={() => setIsDataManagementOpen(true)}
        syncSymbol={syncSymbol}
        syncInterval={syncInterval}
        syncCrosshair={syncCrosshair}
        syncDrawings={syncDrawings}
        syncTime={syncTime}
        syncDateRange={syncDateRange}
        onSyncSettingChange={handleSyncSettingChange}
      />

      {/* Floating CSV Import Stats Card */}
      {hasData && workspaceCoord.parseFeedback && workspaceCoord.showStats && (
        <div className="fixed top-14 left-4 z-40 w-80 bg-modal-bg border border-border-def rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-def">
            <span className="font-semibold text-xs tracking-wider uppercase text-txt-primary flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-status-success" />
              CSV Dataset Ingested
            </span>
            <button
              onClick={() => workspaceCoord.setShowStats(false)}
              className="text-txt-muted hover:text-txt-primary cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
          <div className="p-4 flex flex-col gap-3 text-xs">
            <div className="flex justify-between">
              <span className="text-txt-muted">Total Rows Processed</span>
              <span className="font-mono text-txt-primary font-semibold">{workspaceCoord.parseFeedback.rowCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-txt-muted">Valid OHLCV Candlesticks</span>
              <span className="font-mono text-status-success font-semibold">{workspaceCoord.parseFeedback.parsedCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-txt-muted">Ignored Header / Invalid Rows</span>
              <span className="font-mono text-status-warning font-semibold">{workspaceCoord.parseFeedback.skippedCount.toLocaleString()}</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-bg backdrop-blur-xs">
            <div
              ref={brokerTfDropdownRef}
              className="bg-modal-bg border border-border-def rounded-xl shadow-2xl w-[320px] p-5 flex flex-col gap-4 text-txt-secondary"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs tracking-wider uppercase text-txt-primary">Import Configuration</span>
                <button
                  onClick={() => setIsBrokerTfDropdownOpen(false)}
                  className="text-txt-muted hover:text-txt-primary cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-txt-muted">Timezone Shift</label>
                  <select
                    value={tempBrokerOffset}
                    onChange={(e) => setTempBrokerOffset(e.target.value)}
                    className="bg-app-bg border border-border-def text-txt-primary rounded p-2 text-xs focus:outline-none focus:border-accent"
                  >
                    <option value="exchange">No Timezone Shift (Local)</option>
                    {TIMEZONE_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.label}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        <DrawingToolbar
          hasData={hasData}
          activeTool={drawingCoord.activeTool}
          setActiveTool={drawingCoord.setActiveTool}
          cancelDrawingSession={drawingCoord.cancelDrawingSession}
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
          selectedTextToolId={selectedTextToolId}
          setSelectedTextToolId={setSelectedTextToolId}
          isTextMenuOpen={isTextMenuOpen}
          setIsTextMenuOpen={setIsTextMenuOpen}
          textMenuPos={textMenuPos}
          setTextMenuPos={setTextMenuPos}
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
          textMenuRef={textMenuRef}
          forecastMenuRef={forecastMenuRef}
          magnetMenuRef={magnetMenuRef}
          canZoomOut={canZoomOut}
          handleZoomOut={zoomOut}
          chartInstanceRef={{ current: chartInstancesRef.current[activeChartIndex] }}
          activeOverlayIdRef={activeOverlayIdRef}
          isAllDrawingsLocked={isAllDrawingsLocked}
          handleToggleLockAllDrawings={handleToggleLockAllDrawings}
          isAllDrawingsHidden={isAllDrawingsHidden}
          handleToggleHideAllDrawings={handleToggleHideAllDrawings}
        />

        <main className={`flex-1 h-full relative overflow-hidden bg-app-bg ${layoutType !== '1' ? 'p-1' : 'p-0'} flex`}>
          {workspaceCoord.importProgress ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-overlay-bg backdrop-blur-xs p-6 text-center select-none transition-all duration-300">
              <div className="max-w-md w-full bg-modal-bg border border-border-def rounded-xl p-6 shadow-2xl flex flex-col items-center gap-5">
                {workspaceCoord.importProgress.status === 'error' ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-status-error/10 border border-status-error/20 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-status-error" />
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      <h2 className="text-base font-bold text-txt-primary tracking-tight">Import Failed</h2>
                      <p className="text-xs text-status-error bg-status-error/10 border border-status-error/20 rounded-lg p-3 text-left whitespace-pre-wrap font-mono max-h-36 overflow-y-auto">
                        {workspaceCoord.importProgress.errorMessage}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 w-full pt-1">
                      <button
                        onClick={() => workspaceCoord.resetImportProgress()}
                        className="flex-1 py-2 px-3 bg-surface-elevated hover:bg-surface-hover text-txt-secondary rounded-lg text-xs font-semibold border border-border-def transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => workspaceCoord.handleSelectFolderAPI(undefined, true)}
                        className="flex-1 py-2 px-3 bg-accent hover:bg-accent-hover text-txt-inverse rounded-lg text-xs font-semibold shadow-lg border border-accent transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Select Folder</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-accent-muted border border-accent/20 flex items-center justify-center">
                      <Database className="w-6 h-6 text-accent animate-pulse" />
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                      <h2 className="text-base font-bold text-txt-primary tracking-tight">Loading Market Data</h2>
                      <p className="text-xs text-txt-muted">
                        {workspaceCoord.importProgress.currentActivity}
                      </p>
                    </div>

                    {/* Real Progress Bar */}
                    <div className="w-full flex flex-col gap-2">
                      <div className="w-full bg-app-bg rounded-full h-2 overflow-hidden border border-border-sub relative">
                        {workspaceCoord.importProgress.status === 'scanning' ? (
                          <div className="h-full bg-accent rounded-full animate-pulse w-full" />
                        ) : (
                          <div
                            className="h-full bg-accent rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                workspaceCoord.importProgress.totalCount > 0
                                  ? Math.min(
                                      100,
                                      Math.round(
                                        (workspaceCoord.importProgress.processedCount /
                                          workspaceCoord.importProgress.totalCount) *
                                          100
                                      )
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-txt-muted font-medium px-0.5">
                        <span>
                          {workspaceCoord.importProgress.status === 'scanning'
                            ? 'Scanning files...'
                            : workspaceCoord.importProgress.status === 'validating'
                            ? 'Validating files...'
                            : workspaceCoord.importProgress.status === 'preparing'
                            ? 'Preparing chart...'
                            : `Processing ${workspaceCoord.importProgress.processedCount} / ${workspaceCoord.importProgress.totalCount}`}
                        </span>
                        <span>
                          {workspaceCoord.importProgress.totalCount > 0 && workspaceCoord.importProgress.status !== 'scanning'
                            ? `${Math.min(
                                100,
                                Math.round(
                                  (workspaceCoord.importProgress.processedCount /
                                    workspaceCoord.importProgress.totalCount) *
                                    100
                                )
                              )}%`
                            : ''}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : !isBootstrapped ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-app-bg select-none">
              <div className="w-8 h-8 rounded-full border-[3px] border-border-def border-t-accent animate-spin" />
            </div>
          ) : !hasData ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-app-bg p-6 text-center select-none">
              <div className="max-w-md flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-accent-muted border border-accent/20 flex items-center justify-center animate-pulse">
                  <Upload className="w-7 h-7 text-accent" />
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-bold text-txt-primary tracking-tight">Load Forex Market Data</h2>
                  <p className="text-txt-muted text-xs leading-relaxed px-4">
                    Import MT5 CSV candlesticks to replay, annotate, and test your trading edge.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 w-full">
                  <button
                    onClick={() => workspaceCoord.handleSelectFolderAPI(undefined, true)}
                    className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-txt-inverse rounded-lg text-xs font-semibold shadow-lg border border-accent transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Open Directory (Folder Mode)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          <div
            data-chart-workspace="true"
            className="h-full w-full relative"
            onMouseMove={handleCanvasContainerMouseMove}
            onMouseLeave={handleCanvasContainerMouseLeave}
          >
            <ChartGrid
              layoutType={layoutType}
              layoutContainerRef={layoutContainerRef}
              subContainerRef1={subContainerRef1}
              subContainerRef2={subContainerRef2}
              layoutSizes={layoutSizes}
              startResize={startResize}
              renderSlot={renderSlot}
            />
            {/* Canvas-only loading spinner overlay for existing chart symbol switches */}
            {hasData && workspaceCoord.isLoadingSymbol && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-overlay-bg backdrop-blur-xs select-none pointer-events-auto">
                <div className="w-8 h-8 rounded-full border-[3px] border-border-def border-t-accent animate-spin" />
              </div>
            )}
            {/* Reset View Point Setting Active Banner */}
            {isSettingResetView && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-surface-elevated/95 border border-accent shadow-xl backdrop-blur-md text-[11px] font-semibold text-accent select-none">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                <span>Click anywhere on the chart to set your new Reset View point</span>
                <button
                  onClick={() => {
                    setIsSettingResetView(false);
                    setResetViewHoverX(null);
                  }}
                  className="ml-2 px-2 py-0.5 rounded text-[10px] text-txt-muted hover:text-txt-primary hover:bg-surface-hover cursor-pointer"
                >
                  Cancel (Esc)
                </button>
              </div>
            )}
            {hasData && !isSettingResetView && (
              <button
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  resetViewHoldStartTimeRef.current = Date.now();
                  setIsHoldingResetView(true);
                  resetViewHoldTimerRef.current = setTimeout(() => {
                    setIsHoldingResetView(false);
                    setIsSettingResetView(true);
                    setWatchlistToast({
                      msg: 'Click anywhere on the chart canvas to set the new Reset View point (Esc to cancel).',
                      type: 'info',
                    });
                    setTimeout(() => setWatchlistToast(null), 4000);
                  }, 2000);
                }}
                onPointerUp={() => {
                  if (resetViewHoldTimerRef.current) {
                    clearTimeout(resetViewHoldTimerRef.current);
                    resetViewHoldTimerRef.current = null;
                  }
                  const elapsed = Date.now() - resetViewHoldStartTimeRef.current;
                  setIsHoldingResetView(false);
                  if (elapsed < 2000 && !isSettingResetView) {
                    resetChartView();
                  }
                }}
                onPointerLeave={() => {
                  if (resetViewHoldTimerRef.current) {
                    clearTimeout(resetViewHoldTimerRef.current);
                    resetViewHoldTimerRef.current = null;
                  }
                  setIsHoldingResetView(false);
                }}
                title="Click to reset view • Hold 2s to set reset view point"
                className={`
                  absolute bottom-8 left-1/2 -translate-x-1/2 z-20
                  relative overflow-hidden flex items-center gap-1.5
                  px-3.5 py-1.5
                  bg-surface-elevated/90 hover:bg-surface-hover
                  border ${isHoldingResetView ? 'border-accent shadow-accent/20' : 'border-border-def hover:border-border-focus'}
                  text-txt-secondary hover:text-txt-primary
                  text-[10px] font-semibold tracking-wider uppercase
                  rounded-full
                  backdrop-blur-xs
                  shadow-lg
                  transition-all duration-200
                  select-none
                  cursor-pointer
                  ${isHoveringBottom10 || isHoldingResetView ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-95'}
                `}
              >
                {/* Hold visual progress indicator */}
                {isHoldingResetView && (
                  <span
                    className="absolute inset-0 bg-accent/20 transition-all duration-[2000ms] ease-linear"
                    style={{ width: isHoldingResetView ? '100%' : '0%' }}
                  />
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isHoldingResetView ? 'animate-spin text-accent' : ''}
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                <span className="relative z-10">
                  {isHoldingResetView ? 'Hold to Set...' : 'Reset View'}
                </span>
              </button>
            )}
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
          importMode="folder"
          loadSymbolFromFolder={handleWatchlistSymbolSwitch}
          activeSymbol={slots[activeChartIndex]?.symbol || activeWatchlistSymbol}
          onRemoveSymbol={setPendingRemoveSymbol}
          onAddSymbolFolder={workspaceCoord.handleWatchlistAddFolder}
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
        isAutoShiftEnabled={replayCoord.isAutoShiftEnabled}
        handleToggleAutoShift={replayCoord.handleToggleAutoShift}
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
          settingsRepository.saveSettings(newSettings);
          const visibleCount = getLayoutChartCount(layoutType);
          for (let i = 0; i < visibleCount; i++) {
            const slot = slots[i];
            if (slot && slot.symbol) {
              const rawData = workspaceCoord.getRawDataFromCache(slot.symbol);
              if (rawData.length > 0) {
                dataVersionRef.current += 1;
                workspaceCoord.regenerateTimeframes(rawData, newSettings, slot.timeframe, i);
              }
            }
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
        assetName={assetName}
        savedFolderHandles={savedFolderHandles}
        onSelectFolder={async () => {
          setIsSettingsOpen(false);
          await workspaceCoord.handleSelectFolderAPI(undefined, true);
        }}
      />

      {/* Watchlist Remove Confirmation Dialog */}
      {pendingRemoveSymbol && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-overlay-bg backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-modal-bg border border-border-def rounded-xl shadow-2xl w-[340px] p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-status-error/10 border border-status-error/20 flex items-center justify-center text-status-error">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-txt-primary">Delete Symbol Data</h3>
                <p className="text-txt-muted text-[11px] mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-txt-secondary text-xs leading-normal">
              Are you sure you want to delete symbol <span className="font-semibold text-txt-primary">"{pendingRemoveSymbol}"</span>? This will permanently delete its timeframe data, drawings, and info profile from local storage. Other symbols will not be affected.
            </p>
            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => setPendingRemoveSymbol(null)}
                className="flex-1 py-2 bg-surface-elevated border border-border-def text-txt-secondary text-xs font-semibold rounded hover:bg-surface-hover hover:text-txt-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const target = pendingRemoveSymbol;
                  setPendingRemoveSymbol(null);
                  await workspaceCoord.handleWatchlistRemoveConfirm(target);
                }}
                className="flex-1 py-2 bg-status-error hover:bg-status-error/90 border border-status-error text-txt-inverse text-xs font-semibold rounded transition-colors cursor-pointer"
              >
                Delete Symbol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Overlay Modal */}
      {workspaceCoord.customAlert && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-overlay-bg backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-modal-bg border border-border-def rounded-xl shadow-2xl w-[360px] p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-status-warning">
              <div className="w-10 h-10 rounded-full bg-status-warning/10 border border-status-warning/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-txt-primary">{workspaceCoord.customAlert.title}</h3>
              </div>
            </div>
            <p className="text-txt-secondary text-xs leading-normal">
              {workspaceCoord.customAlert.message}
            </p>
            <button
              onClick={() => workspaceCoord.setCustomAlert(null)}
              className="w-full mt-2 py-2 bg-accent hover:bg-accent-hover text-txt-inverse text-xs font-semibold rounded transition-colors cursor-pointer"
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
        getOverlay={(id) => {
          const originalId = getOriginalDrawingId(id);
          for (let i = 0; i < chartInstancesRef.current.length; i++) {
            const chart = chartInstancesRef.current[i];
            if (chart) {
              const ov = chart.getOverlays().find((o: any) => o.id === originalId);
              if (ov) return ov;
            }
          }
          // Store-first fallback if in-memory chart overlays are momentarily reconciling
          const resolved = useDrawingStore.getState().findSymbolByDrawingId(originalId);
          if (resolved?.drawing) {
            return {
              id: resolved.drawing.id,
              name: resolved.drawing.name,
              points: resolved.drawing.points,
              lock: resolved.drawing.lock,
              visible: resolved.drawing.visible,
              extendData: resolved.drawing.extendData,
              styles: resolved.drawing.styles
            };
          }
          return null;
        }}
        onApplyTemplate={(tplSettings) => {
          if (selectedOverlayIds.length > 0) {
            const firstId = selectedOverlayIds[0];
            const originalId = getOriginalDrawingId(firstId);
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
          // Store-first migration: Dispatch style template to useDrawingStore for selected drawings
          selectedOverlayIds.forEach((id) => {
            const originalId = getOriginalDrawingId(id);
            const resolved = useDrawingStore.getState().findSymbolByDrawingId(originalId);
            if (resolved) {
              const { symbol: drawingSymbol, drawing: currentDrawing } = resolved;
              const mergedExtendData = {
                ...(currentDrawing.extendData || {}),
                customSettings: {
                  ...(currentDrawing.extendData?.customSettings || {}),
                  ...tplSettings,
                },
              };
              useDrawingStore.getState().updateSymbolDrawing(drawingSymbol, originalId, {
                extendData: mergedExtendData,
              });
              const activeChart = chartInstancesRef.current[activeChartIndex];
              if (activeChart) {
                mirrorLiveOverlayUpdate(activeChart, originalId, { extendData: mergedExtendData }, chartInstancesRef);
              }
            }
          });

          runWorkspaceReconciliation(chartInstancesRef);
          drawingCoord.setDrawingTrigger((prev) => prev + 1);
        }}
        onLock={() => {
          // Store-first migration: Dispatch lock state to useDrawingStore for selected drawings
          selectedOverlayIds.forEach((id) => {
            const originalId = getOriginalDrawingId(id);
            const resolved = useDrawingStore.getState().findSymbolByDrawingId(originalId);
            if (resolved) {
              const { symbol: drawingSymbol, drawing: currentDrawing } = resolved;
              const nextLock = !currentDrawing.lock;
              useDrawingStore.getState().updateSymbolDrawing(drawingSymbol, originalId, {
                lock: nextLock,
              });

              // Apply lock directly on all live chart instances
              chartInstancesRef.current.forEach((chart) => {
                if (chart) {
                  try {
                    chart.overrideOverlay({ id: originalId, lock: nextLock });
                  } catch (_) {}
                  try {
                    chart.overrideOverlay({ id: `sync_${originalId}_from_${chart._chartIndex}`, lock: nextLock });
                  } catch (_) {}
                  DrawingChartAdapter.invalidatePane(chart);
                }
              });
            }
          });

          runWorkspaceReconciliation(chartInstancesRef);
          drawingCoord.setDrawingTrigger((prev) => prev + 1);
        }}
        onUpdateSettings={(settingsUpdate) => {
          if (selectedOverlayIds.length > 0) {
            const firstId = selectedOverlayIds[0];
            const originalId = getOriginalDrawingId(firstId);
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

          // Store-first migration: Dispatch settings update to useDrawingStore for selected drawings
          selectedOverlayIds.forEach((id) => {
            const originalId = getOriginalDrawingId(id);
            const resolved = useDrawingStore.getState().findSymbolByDrawingId(originalId);
            if (resolved) {
              const { symbol: drawingSymbol, drawing: currentDrawing } = resolved;
              const mergedExtendData = {
                ...(currentDrawing.extendData || {}),
                customSettings: {
                  ...(currentDrawing.extendData?.customSettings || {}),
                  ...settingsUpdate,
                },
              };
              useDrawingStore.getState().updateSymbolDrawing(drawingSymbol, originalId, {
                extendData: mergedExtendData,
              });
              // Direct immediate overlay override & pane invalidation across all chart slots
              chartInstancesRef.current.forEach((chart) => {
                if (!chart) return;
                const overlays = chart.getOverlays() || [];
                overlays.forEach((ov: any) => {
                  const ovOriginalId = getOriginalDrawingId(ov.id);
                  if (ovOriginalId === originalId) {
                    chart.overrideOverlay({
                      id: ov.id,
                      extendData: mergedExtendData,
                    });
                    DrawingChartAdapter.invalidatePane(chart, 'candle_pane');
                  }
                });
              });
              const activeChart = chartInstancesRef.current[activeChartIndex];
              if (activeChart) {
                mirrorLiveOverlayUpdate(activeChart, originalId, { extendData: mergedExtendData }, chartInstancesRef);
              }
            }
          });

          runWorkspaceReconciliation(chartInstancesRef);
          drawingCoord.setDrawingTrigger((prev) => prev + 1);
        }}
        onSettingsClick={() => {
          if (selectedOverlayIds.length > 0) {
            setDrawingSettingsOverlayId(selectedOverlayIds[0]);
            setIsDrawingSettingsOpen(true);
          }
        }}
        onDelete={() => {
          selectedOverlayIds.forEach((id) => {
            useDrawingStore.getState().removeSymbolDrawingById(id);
          });
          setSelectedOverlayIds([]);
          runWorkspaceReconciliation(chartInstancesRef);
        }}
      />

      {/* Favorite Drawing Tools Floating Toolbar */}
      <FavoriteDrawingToolbar
        activeTool={drawingCoord.activeTool}
        selectedCursorId={selectedCursorId}
        setSelectedCursorId={setSelectedCursorId}
        setSelectedLineToolId={setSelectedLineToolId}
        setSelectedShapeToolId={setSelectedShapeToolId}
        setSelectedTextToolId={setSelectedTextToolId}
        setSelectedForecastToolId={setSelectedForecastToolId}
        handleSelectTool={drawingCoord.handleSelectTool}
        cancelDrawingSession={drawingCoord.cancelDrawingSession}
        setActiveTool={drawingCoord.setActiveTool}
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
          if (!drawingSettingsOverlayId) return;
          const originalId = getOriginalDrawingId(drawingSettingsOverlayId);

          const resolved = useDrawingStore.getState().findSymbolByDrawingId(originalId);
          if (resolved) {
            const { symbol: drawingSymbol, drawing: currentDrawing } = resolved;
            updateDefaultSettings(currentDrawing.name, updatedSettings);
            const mergedExtendData = {
              ...(currentDrawing.extendData || {}),
              customSettings: {
                ...(currentDrawing.extendData?.customSettings || {}),
                ...updatedSettings,
              },
            };
            useDrawingStore.getState().updateSymbolDrawing(drawingSymbol, originalId, {
              extendData: mergedExtendData,
              ...(updatedPoints && updatedPoints.length > 0 ? { points: updatedPoints } : {}),
            });
            // Direct immediate overlay override & pane invalidation across all chart slots
            chartInstancesRef.current.forEach((chart) => {
              if (!chart) return;
              const overlays = chart.getOverlays() || [];
              overlays.forEach((ov: any) => {
                const ovOriginalId = getOriginalDrawingId(ov.id);
                if (ovOriginalId === originalId) {
                  chart.overrideOverlay({
                    id: ov.id,
                    ...(updatedPoints && updatedPoints.length > 0 ? { points: updatedPoints } : {}),
                    extendData: mergedExtendData,
                  });
                  DrawingChartAdapter.invalidatePane(chart, 'candle_pane');
                }
              });
            });
            const activeChart = chartInstancesRef.current[activeChartIndex];
            if (activeChart) {
              mirrorLiveOverlayUpdate(activeChart, originalId, { points: updatedPoints, extendData: mergedExtendData }, chartInstancesRef);
            }
          }

          runWorkspaceReconciliation(chartInstancesRef);
          drawingCoord.setDrawingTrigger((prev) => prev + 1);
        }}
      />

      {/* Data Management Dashboard Modal */}
      {isDataManagementOpen && (
        <div className="fixed inset-0 z-50 bg-overlay-bg backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-modal-bg border border-border-def rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative p-2">
            <DataManagementDashboard onClose={() => setIsDataManagementOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}