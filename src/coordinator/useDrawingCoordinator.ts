import { useState } from 'react';
import { useLayoutStore, useSettingsStore } from '@/store';
import { drawingRepository } from '@/repository';
import { getInteractiveOverlayOptions } from '@/utils/overlays';
import { getLayoutChartCount } from '@/domain/market';

export function useDrawingCoordinator(
  chartInstancesRef: React.MutableRefObject<(any | null)[]>,
  isShiftPressedRef: React.MutableRefObject<boolean>
) {
  const {
    layoutType,
    activeChartIndex,
    slots,
    syncDrawings,
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
    if (!syncDrawings) return;
    const currentLayout = layoutType;
    const currentSlots = slots;
    const visibleCount = getLayoutChartCount(currentLayout);

    // 0. Sync back modified synced copies to original drawings
    for (let i = 0; i < visibleCount; i++) {
      if (i === activeChartIndex) continue;

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
        const targetOverlays = (targetChart as any).getOverlays();
        targetOverlays.forEach((ov: any) => {
          if (ov.id?.startsWith('sync_')) {
            (targetChart as any).removeOverlay({ id: ov.id });
          }
        });
        continue;
      }

      const activeOriginals = originalDrawingsBySymbol[symbol] || [];
      activeOriginals.sort((a, b) => {
        const orderA = a.overlay.extendData?.order ?? 0;
        const orderB = b.overlay.extendData?.order ?? 0;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return (a.overlay.id || '').localeCompare(b.overlay.id || '', undefined, { numeric: true, sensitivity: 'base' });
      });

      const targetOverlays = (targetChart as any).getOverlays();
      const existingSyncedCopies = targetOverlays.filter((ov: any) => ov.id?.startsWith('sync_'));
      const desiredCopies = activeOriginals.filter((item) => item.chartIndex !== i);

      existingSyncedCopies.forEach((copy: any) => {
        (targetChart as any).removeOverlay({ id: copy.id });
      });

      desiredCopies.forEach((item) => {
        const orig = item.overlay;
        const sourceIndex = item.chartIndex;
        const syncId = `sync_${orig.id}_from_${sourceIndex}`;

        const interactiveOptions = getInteractiveOverlayOptions(
          orig.name,
          { current: targetChart },
          chartInstancesRef,
          isShiftPressedRef,
          syncAllDrawings,
          setActiveTool
        );

        targetChart.createOverlay({
          ...interactiveOptions,
          name: orig.name,
          id: syncId,
          paneId: orig.paneId || 'candle_pane',
          points: JSON.parse(JSON.stringify(orig.points)),
          extendData: JSON.parse(JSON.stringify(orig.extendData || {})),
          lock: orig.lock,
          visible: orig.visible !== false,
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
              const sourceIdx = parseInt(syncMatch[2]);
              const sourceChart = chartInstancesRef.current[sourceIdx];
              if (sourceChart) {
                sourceChart.removeOverlay({ id: originalId });
              }
            }
            setTimeout(() => {
              syncAllDrawings();
            }, 50);
          },
        });
      });
    }

    // Persist original drawings per symbol to DrawingRepository
    Object.entries(originalDrawingsBySymbol).forEach(([sym, items]) => {
      const serializableDrawings = items.map(({ overlay }) => ({
        id: overlay.id,
        name: overlay.name,
        points: overlay.points,
        extendData: overlay.extendData,
        lock: overlay.lock,
        visible: overlay.visible,
      }));
      drawingRepository.saveDrawings(sym, serializableDrawings);
    });
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
      console.log(`[DEBUG] loadDrawingsForSymbol - Restoring drawings for symbol: ${symbolName}`);
      const savedDrawings = await drawingRepository.getDrawings(symbolName);

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

      if (!savedDrawings || savedDrawings.length === 0) {
        setDrawingTrigger((prev) => prev + 1);
        return;
      }

      const chart = chartInstancesRef.current[activeChartIndex];
      if (chart) {
        savedDrawings.forEach((drawing: any) => {
          createOverlayWithHandlers(chart, {
            name: drawing.name,
            id: drawing.id,
            points: drawing.points,
            lock: drawing.lock,
            visible: drawing.visible !== false,
            extendData: drawing.extendData || {},
          });
        });
      }

      setTimeout(() => {
        syncAllDrawings();
        setDrawingTrigger((prev) => prev + 1);
      }, 50);
    } catch (err) {
      console.error(`[DEBUG] loadDrawingsForSymbol failed:`, err);
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
