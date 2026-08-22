import { useState, useEffect } from 'react';
import { useWatchlistStore, useLayoutStore, useSettingsStore, useReplayStore } from '@/store';
import {
  initRepositories,
  marketDataRepository,
  watchlistRepository,
  workspaceLayoutRepository,
  settingsRepository,
  drawingRepository,
} from '@/repository';
import {
  parseCSV,
  resample1mToTimeframe,
  detectPricePrecision,
} from '@/utils/dataUtils';
import type { KLineData } from '@/utils/dataUtils';
import {
  matchFileToTimeframe,
  getTimeframeMinutes,
  getBestTimeframeFile,
  getLayoutChartCount,
} from '@/domain/market';
import {
  buildTimeframeCache,
} from '@/engine/market';
import { persistenceService } from '@/engine/workspace/persistence';
import { getTrueOffsetRightDistance } from '@/engine/charting';
import { findCandleIndexByTimestamp } from '@/engine/replay';

// Static, in-memory cache for raw 1-minute candlestick data to isolate heavy payloads from React state diffing
const rawDataCache = new Map<string, KLineData[]>();

export function useWorkspaceCoordinator(
  chartInstancesRef: React.MutableRefObject<(any | null)[]>,
  _chartContainersRef: React.MutableRefObject<(HTMLDivElement | null)[]>,
  dataVersionRef: React.MutableRefObject<number>,
  applySettingsToChart: (chart: any, s: any) => void,
  syncAllDrawings: () => void,
  loadDrawingsForSymbol: (symbol: string) => Promise<void>,
  capturedOffsetRef: React.MutableRefObject<number | null>,
  wasManualScaleRef: React.MutableRefObject<boolean>,
  capturedYAxisRangeRef: React.MutableRefObject<any>,
  _pendingCutAnimation: React.MutableRefObject<any>
) {
  // Store Hooks
  const {
    settings,
    setSettings,
  } = useSettingsStore();

  const {
    activeChartIndex,
    slots,
    setActiveChartIndex,
  } = useLayoutStore();

  const {
    watchlistSymbols,
    activeWatchlistSymbol,
    savedFolderHandles,
    setWatchlistSymbols,
    setActiveWatchlistSymbol,
    setSavedFolderHandles,
    setSymbolFilesMap,
    removeWatchlistSymbol,
  } = useWatchlistStore();

  const {
    resetReplay,
    isReplayActive,
    replayCurrentTimestamp,
    setReplayCurrentTimestamp,
  } = useReplayStore();

  // Local Coordinator states
  const [allTimeframesData, setAllTimeframesData] = useState<Record<string, KLineData[]>>({ '1m': [] });
  const [isLoadingSymbol, setIsLoadingSymbol] = useState<boolean>(false);
  const [isVerifyingFolder, setIsVerifyingFolder] = useState<boolean>(false);
  const [isRestoreError, setIsRestoreError] = useState<boolean>(false);
  const [parseFeedback, setParseFeedback] = useState<any | null>(null);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string } | null>(null);
  const [watchlistToast, setWatchlistToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);

  // Bootstrap repositories and restore stored workspace state into Stores
  useEffect(() => {
    let isMounted = true;
    async function bootstrapWorkspace() {
      try {
        await initRepositories();

        // Restore settings
        const savedSettings = await settingsRepository.getSettings();
        const customTfs = await settingsRepository.getCustomTimeframes();
        if (savedSettings && isMounted) {
          useSettingsStore.getState().setInitialState(savedSettings, customTfs);
        }

        // Restore layout configuration
        const savedLayout = await workspaceLayoutRepository.getLayoutConfig();
        if (savedLayout && isMounted) {
          useLayoutStore.getState().setInitialState({
            layoutType: savedLayout.layoutType,
            slots: savedLayout.slots,
            layoutSizes: savedLayout.layoutSizes,
            ...savedLayout.syncSettings,
          });
        }

        // Restore Watchlist & Import Mode & Active Symbol & Folder Handles
        const savedWatchlist = await watchlistRepository.getWatchlistSymbols();
        const savedImportMode = await watchlistRepository.getImportMode();
        const savedActiveSymbol = await watchlistRepository.getActiveSymbol();
        const savedFolderHandles = await watchlistRepository.getFolderHandles();

        if (isMounted) {
          useWatchlistStore.getState().setInitialState({
            watchlistSymbols: savedWatchlist,
            importMode: savedImportMode,
            activeWatchlistSymbol: savedActiveSymbol,
            savedFolderHandles,
          });
        }

        // Restore market data for all saved slots
        const visibleCount = getLayoutChartCount(savedLayout?.layoutType || '1');
        console.log(`[DEBUG] bootstrapWorkspace - visibleCount: ${visibleCount}, savedLayout slots:`, savedLayout?.slots);
        for (let i = 0; i < visibleCount; i++) {
          const slot = savedLayout?.slots?.[i];
          if (slot && slot.symbol && isMounted) {
            const bars1m = await marketDataRepository.getBars(slot.symbol, '1m');
            if (bars1m && bars1m.length > 0) {
              rawDataCache.set(slot.symbol, bars1m);
            }
            const chart = chartInstancesRef.current[i];
            if (chart && isMounted) {
              await loadDataForSlot(i, chart);
            }
          }
        }

        // Load drawings for the active symbol
        if (savedActiveSymbol && isMounted) {
          console.log(`[DEBUG] bootstrapWorkspace - Loading drawings for active symbol ${savedActiveSymbol}`);
          await loadDrawingsForSymbol(savedActiveSymbol);
        }
      } catch (err) {
        console.error('Failed to bootstrap workspace repositories:', err);
      }
    }

    bootstrapWorkspace();
    return () => {
      isMounted = false;
    };
  }, []);

  // Helper to retrieve raw 1m data for a symbol from in-memory cache
  const getRawDataFromCache = (symbol: string): KLineData[] => {
    return rawDataCache.get(symbol) || [];
  };

  const getOrImportTimeframeData = async (symbol: string, tf: string): Promise<KLineData[]> => {
    // 1. Try to read from IndexedDB repository first!
    let data = await marketDataRepository.getBars(symbol, tf) || [];
    if (data.length > 0) {
      return data;
    }

    // 2. If not in DB, check files map (Folder import mode)
    const filesMap = useWatchlistStore.getState().symbolFilesMap;
    const files = filesMap[symbol];
    if (files) {
      // Find the best match file
      const bestMatch = getBestTimeframeFile(files, tf);
      if (bestMatch) {
        console.log(`[DEBUG] getOrImportTimeframeData - Folder mode: found best file ${bestMatch.file.name} for target tf ${tf}`);
        const text = await bestMatch.file.text();
        const result = parseCSV(text);
        if (result.parsedCount > 0) {
          let adjustedData = result.data;
          if (settings.timezoneAdjustmentEnabled) {
            const offsetDiffMs = (settings.userTimezoneOffset - settings.brokerTimezoneOffset) * 60 * 1000;
            adjustedData = result.data.map((c) => ({
              ...c,
              timestamp: c.timestamp + offsetDiffMs,
            }));
          }
          let tfData = adjustedData;
          if (bestMatch.tf !== tf) {
            // Need to resample the parsed base file to the target timeframe
            tfData = resample1mToTimeframe(adjustedData, getTimeframeMinutes(tf));
          }
          // Save the parsed timeframe data so we never have to parse it again!
          await marketDataRepository.saveBars(symbol, tf, tfData);
          return tfData;
        }
      }
    }

    // 3. Fallback: try to load raw 1m from DB/cache and resample it
    let raw1m = getRawDataFromCache(symbol);
    if (raw1m.length === 0) {
      raw1m = await marketDataRepository.getBars(symbol, '1m') || [];
      if (raw1m.length > 0) {
        rawDataCache.set(symbol, raw1m);
      }
    }
    if (raw1m.length > 0) {
      let baseData = raw1m;
      if (settings.timezoneAdjustmentEnabled) {
        const offsetDiffMs = (settings.userTimezoneOffset - settings.brokerTimezoneOffset) * 60 * 1000;
        baseData = raw1m.map((c) => ({
          ...c,
          timestamp: c.timestamp + offsetDiffMs,
        }));
      }
      const tfData = resample1mToTimeframe(baseData, getTimeframeMinutes(tf));
      // Save it
      await marketDataRepository.saveBars(symbol, tf, tfData);
      return tfData;
    }

    return [];
  };

  const regenerateTimeframes = (raw1m: KLineData[], s: typeof settings, timeframe: string, targetChartIndex?: number) => {
    if (raw1m.length === 0) return;

    console.log('[DEBUG] regenerateTimeframes - Rebuilding timeframe cache with settings:', {
      enabled: s.timezoneAdjustmentEnabled,
      brokerOffset: s.brokerTimezoneOffset,
      userOffset: s.userTimezoneOffset,
    });

    const newTimeframesData = buildTimeframeCache(raw1m, s, timeframe);
    setAllTimeframesData(newTimeframesData);

    const idx = targetChartIndex !== undefined ? targetChartIndex : useLayoutStore.getState().activeChartIndex;
    const chart = chartInstancesRef.current[idx];
    if (chart) {
      const fullData = newTimeframesData[timeframe] || [];
      const replayState = useReplayStore.getState();
      const visibleData = replayState.isReplayActive && replayState.replayCurrentTimestamp !== null
        ? fullData.filter((d) => d.timestamp <= replayState.replayCurrentTimestamp!)
        : fullData;

      chart.setDataLoader({
        getBars: ({ type: loadType, callback }: any) => {
          if (loadType === 'init') {
            callback(visibleData);
          } else {
            callback([]);
          }
        },
      });

      chart.resetData();
      chart.resize();
    }
  };

  // Switch timeframe
  const handleTimeframeSwitch = async (
    tf: string,
    overrideSymbol?: string
  ) => {
    const hasData = activeWatchlistSymbol !== null;
    if (!hasData && !overrideSymbol) {
      console.warn('[DEBUG] handleTimeframeSwitch - Attempted switch but no data is loaded.');
      return;
    }
    const isSymbolSwitch = !!overrideSymbol;
    const currentSymbol = overrideSymbol || activeWatchlistSymbol || '';

    setIsLoadingSymbol(true);

    let targetData = isSymbolSwitch ? undefined : allTimeframesData[tf];

    try {
      if (!targetData || targetData.length === 0) {
        targetData = await getOrImportTimeframeData(currentSymbol, tf);
        if (targetData && targetData.length > 0) {
          setAllTimeframesData((prev) => ({ ...prev, [tf]: targetData } as Record<string, KLineData[]>));
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

    const chart = chartInstancesRef.current[activeChartIndex];
    if (chart) {
      if (isSymbolSwitch) {
        capturedOffsetRef.current = null;
        wasManualScaleRef.current = false;
        capturedYAxisRangeRef.current = null;
        console.log(`[DEBUG] handleTimeframeSwitch - Symbol switch: cleared offset/scale cache.`);
      } else {
        capturedOffsetRef.current = getTrueOffsetRightDistance(chart);

        let wasManual = false;
        let range = null;
        const pane = chart.getDrawPaneById?.('candle_pane');
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
      }
    }

    const layoutStore = useLayoutStore.getState();
    const newSlots = [...layoutStore.slots];
    
    newSlots[activeChartIndex] = { symbol: currentSymbol, timeframe: tf };
    
    if (layoutStore.syncSymbol && currentSymbol) {
      newSlots.forEach((_, idx) => {
        newSlots[idx] = { ...newSlots[idx], symbol: currentSymbol };
      });
    }
    if (layoutStore.syncInterval) {
      newSlots.forEach((_, idx) => {
        newSlots[idx] = { ...newSlots[idx], timeframe: tf };
      });
    }
    
    layoutStore.setSlots(newSlots);
    workspaceLayoutRepository.saveLayoutConfig({ slots: newSlots });

    if (chart && targetData) {
      const visibleData = activeReplay && alignedTimestamp !== null
        ? targetData.filter((d) => d.timestamp <= alignedTimestamp)
        : targetData;

      chart.setDataLoader({
        getBars: ({ type: loadType, callback }: any) => {
          if (loadType === 'init') {
            callback(visibleData);
          } else {
            callback([]);
          }
        },
      });
      chart.resetData();

      const scrollIndex = activeReplay && alignedTimestamp !== null
        ? findCandleIndexByTimestamp(visibleData, alignedTimestamp)
        : targetData.length - 1;

      if (scrollIndex !== -1) {
        chart.scrollToDataIndex(scrollIndex);

        let space = 6;
        const barSpaceVal = chart.getBarSpace();
        if (barSpaceVal) {
          if (typeof barSpaceVal === 'number') space = barSpaceVal;
          else if (typeof barSpaceVal === 'object') space = barSpaceVal.bar || 6;
        }

        const offsetVal = capturedOffsetRef.current;
        if (offsetVal !== null && offsetVal !== 0 && !isSymbolSwitch) {
          const barsOffset = Math.round(offsetVal / space);
          const targetScrollIndex = scrollIndex + barsOffset;
          console.log(`[DEBUG] handleTimeframeSwitch - Restoring saved scroll offset: ${offsetVal}px (${barsOffset} bars). Snapping scroll index to: ${targetScrollIndex}`);
          chart.scrollToDataIndex(targetScrollIndex);
        } else {
          const defaultOffset = chart.getSize() ? chart.getSize().width / 2 : 400;
          const defaultBars = Math.round(defaultOffset / space);
          const defaultScrollIndex = scrollIndex + defaultBars;
          console.log(`[DEBUG] handleTimeframeSwitch - Using fallback scroll snap offset (center screen) index: ${defaultScrollIndex}`);
          chart.scrollToDataIndex(defaultScrollIndex);
        }

        if (wasManualScaleRef.current && capturedYAxisRangeRef.current && !isSymbolSwitch) {
          const pane = chart.getDrawPaneById?.('candle_pane');
          const yAxis = pane?.getYAxisComponents?.()?.[0];
          if (yAxis) {
            yAxis.setRange(capturedYAxisRangeRef.current.from, capturedYAxisRangeRef.current.to);
          }
        }
      }
    }

    setTimeout(() => {
      syncAllDrawings();
    }, 50);

    setIsLoadingSymbol(false);
  };

  // Switch active symbol
  const handleWatchlistSymbolSwitch = async (
    symbolName: string,
    preferredTf?: string,
    overrideFilesMap?: Record<string, Record<string, File>>
  ) => {
    setIsLoadingSymbol(true);
    const activeTf = slots[activeChartIndex]?.timeframe || '1m';
    let targetTf = preferredTf || activeTf || '1m';

    const currentFilesMap = overrideFilesMap || useWatchlistStore.getState().symbolFilesMap;
    const files = currentFilesMap[symbolName];

    let targetData: KLineData[] = [];

    // Determine target timeframe
    if (files && !preferredTf) {
      const bestMatch = activeTf ? getBestTimeframeFile(files, activeTf) : null;
      if (bestMatch) {
        targetTf = activeTf;
      } else {
        const TF_PRIORITY = ['1m', '2m', '3m', '4m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', 'D', 'W', 'M'];
        const foundTf = TF_PRIORITY.find((tf) => files[tf]);
        if (!foundTf) {
          setWatchlistToast({ msg: `No valid timeframes found for '${symbolName}'.`, type: 'error' });
          setTimeout(() => setWatchlistToast(null), 2500);
          setIsLoadingSymbol(false);
          return;
        }
        targetTf = foundTf;
      }
    }

    try {
      targetData = await getOrImportTimeframeData(symbolName, targetTf);
    } catch (err) {
      console.error(`[DEBUG] handleWatchlistSymbolSwitch - failed to load data for ${symbolName}:`, err);
    }

    if (targetData.length === 0) {
      setWatchlistToast({ msg: `No data found for '${symbolName}'.`, type: 'error' });
      setTimeout(() => setWatchlistToast(null), 2500);
      setIsLoadingSymbol(false);
      return;
    }

    await watchlistRepository.saveActiveSymbol(symbolName);
    persistenceService.setActiveWatchlistSymbol(symbolName);
    setActiveWatchlistSymbol(symbolName);

    // Cache raw 1m data if it exists for supplement/resampling fallback purposes
    let raw1m = await marketDataRepository.getBars(symbolName, '1m');
    if (raw1m.length === 0 && files && files['1m']) {
      try {
        const text = await files['1m'].text();
        const parsed = parseCSV(text);
        if (parsed.parsedCount > 0) {
          raw1m = parsed.data;
          await marketDataRepository.saveBars(symbolName, '1m', parsed.data);
        }
      } catch (err) {
        console.error(`[DEBUG] Failed to cache 1m data for ${symbolName}:`, err);
      }
    }
    if (raw1m.length > 0) {
      rawDataCache.set(symbolName, raw1m);
    }

    dataVersionRef.current += 1;
    setAllTimeframesData({ [targetTf]: targetData });

    resetReplay();

    const chart = chartInstancesRef.current[activeChartIndex];
    if (chart) {
      const precision = settings.pricePrecision !== 0 ? settings.pricePrecision : detectPricePrecision(targetData);
      chart.setSymbol({ ticker: symbolName, pricePrecision: precision, volumePrecision: 4 });
    }
    console.log(`[DEBUG] handleWatchlistSymbolSwitch - Switched to '${symbolName}'`);

    setTimeout(async () => {
      await handleTimeframeSwitch(targetTf, symbolName);
      await loadDrawingsForSymbol(symbolName);
    }, 0);
  };

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
        return;
      }

      const cleanName = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
      rawDataCache.set(cleanName, result.data);

      let updatedSettings = { ...settings };
      const detectedPrecision = detectPricePrecision(result.data);

      setSettings(updatedSettings);

      const chart = chartInstancesRef.current[activeChartIndex];
      if (chart) {
        applySettingsToChart(chart, updatedSettings);
      }

      resetReplay();
      dataVersionRef.current += 1;
      regenerateTimeframes(result.data, updatedSettings, '1m');

      let updatedWatchlist: any[] = [];
      const entry = { name: cleanName, settings: updatedSettings };

      const filtered = watchlistSymbols.filter(
        (s) => s.name !== activeWatchlistSymbol || activeWatchlistSymbol === cleanName
      );
      const exists = filtered.findIndex((s) => s.name === cleanName);
      let nextList = [...filtered];
      if (exists >= 0) {
        nextList[exists] = entry;
      } else {
        nextList.push(entry);
      }
      updatedWatchlist = nextList;
      setWatchlistSymbols(updatedWatchlist);

      setActiveWatchlistSymbol(cleanName);
      const layoutStore = useLayoutStore.getState();
      const newSlots = [...layoutStore.slots];
      newSlots[activeChartIndex] = { symbol: cleanName, timeframe: '1m' };
      if (layoutStore.syncSymbol) {
        newSlots.forEach((_, idx) => {
          newSlots[idx] = { ...newSlots[idx], symbol: cleanName };
        });
      }
      if (layoutStore.syncInterval) {
        newSlots.forEach((_, idx) => {
          newSlots[idx] = { ...newSlots[idx], timeframe: '1m' };
        });
      }
      layoutStore.setSlots(newSlots);
      workspaceLayoutRepository.saveLayoutConfig({ slots: newSlots });

      marketDataRepository.saveBars(cleanName, '1m', result.data);
      watchlistRepository.saveWatchlistSymbols(updatedWatchlist);
      watchlistRepository.saveActiveSymbol(cleanName);

      if (chart) {
        const precision = updatedSettings.pricePrecision !== 0 ? updatedSettings.pricePrecision : detectedPrecision;
        chart.setSymbol({ ticker: cleanName, pricePrecision: precision, volumePrecision: 4 });
        chart.setPeriod({ type: 'minute', span: 1 });
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCSVFile(e.target.files[0]);
    }
  };

  const processDirectoryHandle = async (
    dirHandle: any,
    symbolMap: Record<string, Record<string, File>>,
    currentPath: string = ''
  ) => {
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

        Object.entries(symbolMap).forEach(([sym, files]) => {
          mergedSymbolMap[sym] = {
            ...(mergedSymbolMap[sym] || {}),
            ...files,
          };
        });
      }

      const symbolsList = Object.keys(mergedSymbolMap).sort();
      if (symbolsList.length === 0) {
        setCustomAlert({
          title: 'No CSV Files Detected',
          message: 'No valid timeframe CSV files found. Please ensure files match standard timeframe names (e.g. m1, h4, d1).',
        });
        setIsLoadingSymbol(false);
        return;
      }

      setSymbolFilesMap(mergedSymbolMap);

      const watchlistItems = symbolsList.map(name => ({ name }));
      setWatchlistSymbols(watchlistItems);
      await watchlistRepository.saveWatchlistSymbols(watchlistItems);

      const initialSelected: Record<string, boolean> = {};
      symbolsList.forEach((sym) => {
        initialSelected[sym] = true;
      });

      setSavedFolderHandles(handlesToUse);
      await watchlistRepository.saveFolderHandles(handlesToUse);

      if (autoImport && symbolsList.length > 0) {
        const target = symbolsList[0];
        await handleWatchlistSymbolSwitch(target, undefined, mergedSymbolMap);
      }
    } catch (err) {
      console.error('[DEBUG] Failed to import folder:', err);
    } finally {
      setIsLoadingSymbol(false);
    }
  };

  const handleSelectFolderAPI = async (handleToUse?: any, autoImport = false) => {
    try {
      let handle = handleToUse;
      if (!handle) {
        handle = await (window as any).showDirectoryPicker();
      }
      if (!handle) return;
      await handleSelectFoldersAPI([handle], autoImport);
    } catch (err) {
      console.warn('[DEBUG] Folder picker canceled or failed:', err);
    }
  };

  const handleRestoreSavedFolder = async () => {
    try {
      setIsVerifyingFolder(true);
      const cachedHandles = await watchlistRepository.getFolderHandles();
      let handles = cachedHandles || [];
      if (handles.length > 0) {
        for (const h of handles) {
          const perm = await (h as any).queryPermission({ mode: 'readwrite' });
          if (perm !== 'granted') {
            const request = await (h as any).requestPermission({ mode: 'readwrite' });
            if (request !== 'granted') {
              throw new Error('Permission denied');
            }
          }
        }
        await handleSelectFoldersAPI(handles, true);
      }
    } catch (err) {
      console.warn('[DEBUG] Failed to restore saved directory handle:', err);
      setIsRestoreError(true);
    } finally {
      setIsVerifyingFolder(false);
    }
  };

  const handleClearFolderHandles = async () => {
    try {
      await watchlistRepository.saveFolderHandles([]);
      localStorage.removeItem('fx_directory_handles');
      setSavedFolderHandles([]);
      setSymbolFilesMap({});
      setWatchlistSymbols([]);
      setActiveWatchlistSymbol(null);
    } catch (err) {
      console.error('[DEBUG] Error clearing handles:', err);
    }
  };

  const loadDataForSlot = async (index: number, chart: any) => {
    const slot = useLayoutStore.getState().slots[index];
    console.log(`[DEBUG] loadDataForSlot - index: ${index}, slot:`, slot);
    if (!slot || !slot.symbol) {
      console.log(`[DEBUG] loadDataForSlot - index: ${index} - slot or symbol is empty!`);
      return;
    }

    try {
      const tf = slot.timeframe;
      const tfData = await getOrImportTimeframeData(slot.symbol, tf);

      if (tfData.length > 0) {
        const precision = settings.pricePrecision !== 0 ? settings.pricePrecision : detectPricePrecision(tfData);

        chart.setSymbol({ ticker: slot.symbol, pricePrecision: precision, volumePrecision: 4 });
        chart.setPeriod({ type: tf.endsWith('h') ? 'hour' : 'minute', span: tf.endsWith('h') ? parseInt(tf) : 1 });

        const replayState = useReplayStore.getState();
        const visibleData = replayState.isReplayActive && replayState.replayCurrentTimestamp !== null
          ? tfData.filter((d) => d.timestamp <= replayState.replayCurrentTimestamp!)
          : tfData;

        chart.setDataLoader({
          getBars: ({ type: loadType, callback }: any) => {
            if (loadType === 'init') {
              callback(visibleData);
            } else {
              callback([]);
            }
          },
        });
        chart.resetData();
      }
    } catch (err) {
      console.error(`[DEBUG] Error loading slot ${index} data:`, err);
    }
  };

  const handleSelectChartSlot = async (index: number) => {
    if (index === activeChartIndex) return;
    setActiveChartIndex(index);
    const targetSlot = slots[index];
    if (targetSlot && targetSlot.symbol) {
      const rawData = getRawDataFromCache(targetSlot.symbol);
      if (rawData.length > 0) {
        dataVersionRef.current += 1;
        regenerateTimeframes(rawData, settings, targetSlot.timeframe);
      }
    }
  };

  const handleClearDatabase = async () => {
    await marketDataRepository.clearAll();
    await watchlistRepository.saveWatchlistSymbols([]);
    await watchlistRepository.saveActiveSymbol(null);
    await handleClearFolderHandles();
    rawDataCache.clear();
    setAllTimeframesData({ '1m': [] });
    setWatchlistSymbols([]);
    setActiveWatchlistSymbol(null);
  };

  const handleWatchlistRemoveConfirm = async (symbolName: string) => {
    removeWatchlistSymbol(symbolName);
    const nextList = watchlistSymbols.filter((s) => s.name !== symbolName);
    await marketDataRepository.deleteBars(symbolName);
    await drawingRepository.clearDrawings(symbolName);
    await watchlistRepository.saveWatchlistSymbols(nextList);

    if (activeWatchlistSymbol === symbolName) {
      if (nextList.length > 0) {
        handleWatchlistSymbolSwitch(nextList[0].name);
      } else {
        rawDataCache.clear();
        setAllTimeframesData({ '1m': [] });
        setActiveWatchlistSymbol(null);
      }
    }
  };

  const handleWatchlistAddFolder = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker();
      if (!handle) return;

      const newHandles = [...savedFolderHandles, handle];
      await handleSelectFoldersAPI(newHandles, false);
    } catch (err) {
      console.warn('[DEBUG] Watchlist add folder canceled:', err);
    }
  };

  const handleWatchlistAddFile = (file: File) => {
    const cleanName = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const result = parseCSV(text);
      if (result.parsedCount > 0) {
        rawDataCache.set(cleanName, result.data);

        const exists = watchlistSymbols.some((s) => s.name === cleanName);
        const nextList = [...watchlistSymbols];
        if (!exists) {
          nextList.push({ name: cleanName });
          setWatchlistSymbols(nextList);
        }
        await marketDataRepository.saveBars(cleanName, '1m', result.data);
        await watchlistRepository.saveWatchlistSymbols(nextList);
      }
    };
    reader.readAsText(file);
  };

  return {
    allTimeframesData,
    setAllTimeframesData,
    isLoadingSymbol,
    isVerifyingFolder,
    isRestoreError,
    parseFeedback,
    setParseFeedback,
    showStats,
    setShowStats,
    customAlert,
    setCustomAlert,
    watchlistToast,
    setWatchlistToast,
    getRawDataFromCache,
    processCSVFile,
    handleFileChange,
    handleSelectFolderAPI,
    handleRestoreSavedFolder,
    handleClearFolderHandles,
    loadDataForSlot,
    handleSelectChartSlot,
    handleClearDatabase,
    handleWatchlistRemoveConfirm,
    handleWatchlistAddFolder,
    handleWatchlistAddFile,
    regenerateTimeframes,
    handleTimeframeSwitch,
    handleWatchlistSymbolSwitch,
  };
}
