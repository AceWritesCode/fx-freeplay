import { useState } from 'react';
import { useLayoutStore, useSettingsStore, useDrawingStore } from '@/store';
import { getInteractiveOverlayOptions } from '@/utils/overlays';
import { runWorkspaceReconciliation } from '@/engine/charting';

export function useDrawingCoordinator(
  chartInstancesRef: React.MutableRefObject<(any | null)[]>,
  isShiftPressedRef: React.MutableRefObject<boolean>
) {
  const {
    activeChartIndex,
    slots,
  } = useLayoutStore();

  const {
    settings,
  } = useSettingsStore();

  // Local Coordinator states
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [drawingTrigger, setDrawingTrigger] = useState<number>(0);

  // Snapping and magnet modes (supports legacy normal, normal_magnet, weak_magnet, strong_magnet keys)
  const [magnetMode, setMagnetMode] = useState<'normal' | 'normal_magnet' | 'weak_magnet' | 'strong_magnet'>('normal');

  const handleToggleMagnet = () => {
    const nextMode: typeof magnetMode = magnetMode === 'normal' ? 'normal_magnet' : 'normal';
    setMagnetMode(nextMode);
    applyMagnetModeToCharts(nextMode);
  };

  const selectMagnetMode = (mode: 'normal_magnet' | 'weak_magnet' | 'strong_magnet') => {
    setMagnetMode(mode);
    applyMagnetModeToCharts(mode);
  };

  const getMagnetSensitivity = (mode: string, s: typeof settings) => {
    if (mode === 'normal_magnet') return s.magnetNormalSensitivity ?? 30;
    if (mode === 'weak_magnet') return s.magnetWeakSensitivity ?? 10;
    if (mode === 'strong_magnet') {
      const v = s.magnetStrongSensitivity ?? 85;
      return v >= 100 ? 999999 : v;
    }
    return 999999;
  };

  const applyMagnetModeToCharts = (mode: typeof magnetMode) => {
    chartInstancesRef.current.forEach((chart) => {
      if (chart) {
        chart._magnetMode = mode;
        const overlays = chart.getOverlays();
        overlays.forEach((ov: any) => {
          if (
            ov.id === 'custom_price_line_overlay' ||
            ov.name === 'customPriceLine' ||
            ov.id === 'session_breaks_overlay' ||
            ov.name === 'sessionBreaks'
          )
            return;
          const sensitivity = getMagnetSensitivity(mode, settings);
          const klcMode = mode === 'normal_magnet' ? 'weak_magnet' : mode;
          chart.overrideOverlay({
            id: ov.id,
            mode: klcMode,
            modeSensitivity: sensitivity,
          });
        });
      }
    });
  };

  const createOverlayWithHandlers = (chart: any, overlayData: any) => {
    const interactiveOptions = getInteractiveOverlayOptions(
      overlayData.name,
      { current: chart },
      chartInstancesRef,
      isShiftPressedRef,
      syncAllDrawings,
      setActiveTool
    );
    chart.createOverlay({
      ...interactiveOptions,
      ...overlayData,
      extendData: {
        ...(interactiveOptions.extendData || {}),
        ...(overlayData.extendData || {}),
      },
      onDrawEnd: interactiveOptions.onDrawEnd,
      onRemoved: interactiveOptions.onRemoved,
      onMouseEnter: interactiveOptions.onMouseEnter,
      onMouseLeave: interactiveOptions.onMouseLeave,
      onClick: interactiveOptions.onClick,
      onPressedMoveStart: interactiveOptions.onPressedMoveStart,
      onPressedMoving: interactiveOptions.onPressedMoving,
      onPressedMoveEnd: interactiveOptions.onPressedMoveEnd,
    });
  };

  const syncAllDrawings = () => {
    runWorkspaceReconciliation(chartInstancesRef);
  };

  const handleSelectTool = (toolName: string) => {
    const chart = chartInstancesRef.current[activeChartIndex];
    if (!chart) return;

    if (activeTool === toolName) {
      setActiveTool(null);
      chart.setScrollEnabled(true);
      chart.setZoomEnabled(true);
      return;
    }

    setActiveTool(toolName);
    chart.setScrollEnabled(false);
    chart.setZoomEnabled(false);

    const overlays = (chart as any).getOverlays();
    const maxOrder = overlays.reduce((max: number, ov: any) => {
      const order = ov.extendData?.order ?? 0;
      return order > max ? order : max;
    }, 0);

    const newDrawingId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newOrder = maxOrder + 1;

    const folderSettings = localStorage.getItem(`fx_folders_${slots[activeChartIndex]?.symbol || 'INGEST'}`);
    const parsedFolders = folderSettings ? JSON.parse(folderSettings) : [];
    const activeFolder = parsedFolders.find((f: any) => !f.isCollapsed && !f.isLocked && f.isVisible);
    const activeGroupId = activeFolder?.id || undefined;

    createOverlayWithHandlers(chart, {
      name: toolName,
      id: newDrawingId,
      extendData: {
        order: newOrder,
        groupId: activeGroupId,
      },
    });
  };

  const loadDrawingsForSymbol = async (symbolName: string) => {
    try {
      await useDrawingStore.getState().loadSymbolDrawings(symbolName);
      runWorkspaceReconciliation(chartInstancesRef);
    } catch (err) {
      console.error(`[useDrawingCoordinator] loadDrawingsForSymbol failed:`, err);
    }
  };

  return {
    activeTool,
    setActiveTool,
    drawingTrigger,
    setDrawingTrigger,
    magnetMode,
    handleToggleMagnet,
    selectMagnetMode,
    createOverlayWithHandlers,
    syncAllDrawings,
    handleSelectTool,
    loadDrawingsForSymbol,
  };
}
