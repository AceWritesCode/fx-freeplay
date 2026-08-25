import { useState, useEffect, useRef } from 'react';
import { useWatchlistStore, useLayoutStore, useSettingsStore, useReplayStore } from '@/store';
import { TIMEZONE_OPTIONS } from '@/config';
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
  parseTimeframeToPeriod,
} from '@/domain/market';
import {
  buildTimeframeCache,
} from '@/engine/market';
import { persistenceService } from '@/engine/workspace/persistence';
import { getTrueOffsetRightDistance } from '@/engine/charting';
import { findCandleIndexByTimestamp } from '@/engine/replay';

export function parseTimezoneToLabelAndOffset(tz: string): { label: string; offset: number } {
  const normalized = tz.toUpperCase().trim();
  if (normalized === 'UTC' || normalized === 'UTC+0' || normalized === 'UTC-0') {
    return { label: 'UTC', offset: 0 };
  }

  const match = normalized.match(/^UTC([+-]\d+(?::\d+)?)$/);
  if (match) {
    const tzStr = match[1]; // e.g. "+3", "+3:30", "-5"
    const targetPrefix = `(UTC${tzStr})`;
    const found = TIMEZONE_OPTIONS.find(opt => opt.label.startsWith(targetPrefix));
    if (found) {
      return { label: found.label, offset: found.value as number };
    }

    const parts = tzStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
    const sign = hours < 0 ? -1 : 1;
    const offset = hours * 60 + sign * minutes;
    return { label: `(UTC${tzStr}) Custom`, offset };
  }

  return { label: 'UTC', offset: 0 };
}

// Static, in-memory cache for raw 1-minute candlestick data to isolate heavy payloads from React state diffing
const rawDataCache = new Map<string, KLineData[]>();

// Static, in-memory cache for timezone-adjusted timeframe data to avoid repeated IndexedDB reads and timezone conversions
const timezoneAdjustedCache = new Map<string, Record<string, KLineData[]>>();

// Static, in-memory cache for symbol profiles to avoid IndexedDB reads during symbol switching
const symbolProfileCache = new Map<string, any>();

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
  const isSwitchingTimeframeRef = useRef<boolean>(false);
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

        // Check for timezone database migration
        const migrationKey = 'timezone_migration_v2';
        if (localStorage.getItem(migrationKey) !== 'true') {
          console.log('[DEBUG] bootstrapWorkspace - Invalidating old mixed-timezone IndexedDB cache...');
          await marketDataRepository.clearAll();
          await watchlistRepository.saveWatchlistSymbols([]);
          await watchlistRepository.saveFolderHandles([]);
          await watchlistRepository.saveActiveSymbol(null);
          localStorage.setItem(migrationKey, 'true');
          
          if (isMounted) {
            useWatchlistStore.getState().setInitialState({
              watchlistSymbols: [],
              activeWatchlistSymbol: null,
              savedFolderHandles: [],
            });
            useLayoutStore.getState().setSlots([
              { symbol: null, timeframe: '1m' },
              { symbol: null, timeframe: '1m' },
              { symbol: null, timeframe: '1m' },
              { symbol: null, timeframe: '1m' },
            ]);
          }
        }

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
        if (savedWatchlist.length === 0) {
          if (isMounted) {
            await resetWorkspace();
          }
        } else {
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
              // Pre-load slot's timeframe data in background to make initial boot instant
              getOrImportTimeframeData(slot.symbol, slot.timeframe).catch(console.error);
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

  // Invalidate timezoneAdjustedCache when timezone settings change
  useEffect(() => {
    timezoneAdjustedCache.clear();
  }, [settings.userTimezoneOffset, settings.brokerTimezoneOffset, settings.timezoneAdjustmentEnabled]);

  // Helper to retrieve raw 1m data for a symbol from in-memory cache
  const getRawDataFromCache = (symbol: string): KLineData[] => {
    return rawDataCache.get(symbol) || [];
  };

  const adjustTimezone = (bars: KLineData[]): KLineData[] => {
    if (settings.timezoneAdjustmentEnabled) {
      const offsetDiffMs = (settings.userTimezoneOffset - settings.brokerTimezoneOffset) * 60 * 1000;
      if (offsetDiffMs !== 0) {
        return bars.map((c) => ({
          ...c,
          timestamp: c.timestamp + offsetDiffMs,
        }));
      }
    }
    return bars;
  };

  const getOrImportTimeframeData = async (symbol: string, tf: string): Promise<KLineData[]> => {
    // 1. Try to read from in-memory timezoneAdjustedCache first!
    const cachedSymbol = timezoneAdjustedCache.get(symbol);
    if (cachedSymbol && cachedSymbol[tf]) {
      return cachedSymbol[tf];
    }

    // 2. Try to read from IndexedDB repository first!
    const data = await marketDataRepository.getBars(symbol, tf) || [];
    if (data.length > 0) {
      const adjusted = adjustTimezone(data);
      if (!timezoneAdjustedCache.has(symbol)) {
        timezoneAdjustedCache.set(symbol, {});
      }
      timezoneAdjustedCache.get(symbol)![tf] = adjusted;
      return adjusted;
    }

    // 3. If not in DB, check files map (Folder import mode)
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
          let tfData = result.data;
          if (bestMatch.tf !== tf) {
            // Need to resample the parsed base file to the target timeframe
            tfData = resample1mToTimeframe(result.data, getTimeframeMinutes(tf));
          }
          // Save the RAW parsed timeframe data so we never have to parse it again!
          await marketDataRepository.saveBars(symbol, tf, tfData);
          const adjusted = adjustTimezone(tfData);
          if (!timezoneAdjustedCache.has(symbol)) {
            timezoneAdjustedCache.set(symbol, {});
          }
          timezoneAdjustedCache.get(symbol)![tf] = adjusted;
          return adjusted;
        }
      }
    }

    // 4. Fallback: try to load raw 1m from DB/cache and resample it
    let raw1m = getRawDataFromCache(symbol);
    if (raw1m.length === 0) {
      raw1m = await marketDataRepository.getBars(symbol, '1m') || [];
      if (raw1m.length > 0) {
        rawDataCache.set(symbol, raw1m);
      }
    }
    if (raw1m.length > 0) {
      const tfData = resample1mToTimeframe(raw1m, getTimeframeMinutes(tf));
      // Save raw resampled bars to DB
      await marketDataRepository.saveBars(symbol, tf, tfData);
      const adjusted = adjustTimezone(tfData);
      if (!timezoneAdjustedCache.has(symbol)) {
        timezoneAdjustedCache.set(symbol, {});
      }
      timezoneAdjustedCache.get(symbol)![tf] = adjusted;
      return adjusted;
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
      let visibleData = fullData;
      if (replayState.isReplayActive && replayState.replayCurrentTimestamp !== null) {
        const lastIdx = findCandleIndexByTimestamp(fullData, replayState.replayCurrentTimestamp);
        visibleData = lastIdx !== -1 ? fullData.slice(0, lastIdx + 1) : [];
      }

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
    const hasData = slots.some((s) => s.symbol !== null);
    if (!hasData && !overrideSymbol) {
      console.warn('[DEBUG] handleTimeframeSwitch - Attempted switch but no data is loaded.');
      return;
    }
    const isSymbolSwitch = !!overrideSymbol;
    const currentSymbol = overrideSymbol || slots[activeChartIndex]?.symbol || '';

    isSwitchingTimeframeRef.current = true;
    setIsLoadingSymbol(true);

    try {
      let targetData = isSymbolSwitch ? undefined : allTimeframesData[tf];

      if (!targetData || targetData.length === 0) {
        targetData = await getOrImportTimeframeData(currentSymbol, tf);
        if (targetData && targetData.length > 0) {
          setAllTimeframesData((prev) => ({ ...prev, [tf]: targetData } as Record<string, KLineData[]>));
        } else {
          console.error(`[DEBUG] handleTimeframeSwitch - Failed to generate data for timeframe ${tf}`);
          return;
        }
      }

      const activeChart = chartInstancesRef.current[activeChartIndex];
      if (activeChart) {
        if (isSymbolSwitch) {
          capturedOffsetRef.current = null;
          wasManualScaleRef.current = false;
          capturedYAxisRangeRef.current = null;
        } else {
          capturedOffsetRef.current = getTrueOffsetRightDistance(activeChart);

          let wasManual = false;
          let range = null;
          const pane = activeChart.getDrawPaneById?.('candle_pane');
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
          alignedTimestamp = alignedBar.timestamp;
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

      const visibleCount = getLayoutChartCount(layoutStore.layoutType);
      const affectedIndices = layoutStore.syncInterval
        ? Array.from({ length: visibleCount }, (_, i) => i)
        : [activeChartIndex];

      for (const idx of affectedIndices) {
        const chart = chartInstancesRef.current[idx];
        const slotSym = newSlots[idx]?.symbol || currentSymbol;
        if (!chart || !slotSym) continue;

        let slotData = (idx === activeChartIndex && targetData) ? targetData : await getOrImportTimeframeData(slotSym, tf);
        if (!slotData || slotData.length === 0) continue;

        const visibleData = activeReplay && alignedTimestamp !== null
          ? slotData.filter((d) => d.timestamp <= alignedTimestamp)
          : slotData;

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
        chart.setPeriod(parseTimeframeToPeriod(tf));

        const scrollIndex = activeReplay && alignedTimestamp !== null
          ? findCandleIndexByTimestamp(visibleData, alignedTimestamp)
          : slotData.length - 1;

        if (scrollIndex !== -1) {
          if (idx === activeChartIndex) {
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
              chart.scrollToDataIndex(targetScrollIndex);
            } else {
              const defaultOffset = chart.getSize() ? chart.getSize().width / 2 : 400;
              const defaultBars = Math.round(defaultOffset / space);
              const defaultScrollIndex = scrollIndex + defaultBars;
              chart.scrollToDataIndex(defaultScrollIndex);
            }

            if (wasManualScaleRef.current && capturedYAxisRangeRef.current && !isSymbolSwitch) {
              const pane = chart.getDrawPaneById?.('candle_pane');
              const yAxis = pane?.getYAxisComponents?.()?.[0];
              if (yAxis) {
                yAxis.setRange(capturedYAxisRangeRef.current.from, capturedYAxisRangeRef.current.to);
              }
            }
          } else {
            chart.scrollToDataIndex(scrollIndex);
          }
        }
      }

      setTimeout(() => {
        syncAllDrawings();
      }, 50);
    } catch (err) {
      console.error('[DEBUG] handleTimeframeSwitch - Error loading timeframe data:', err);
    } finally {
      setIsLoadingSymbol(false);
      isSwitchingTimeframeRef.current = false;
    }
  };

  // Switch active symbol
  const handleWatchlistSymbolSwitch = async (
    symbolName: string,
    preferredTf?: string,
    overrideFilesMap?: Record<string, Record<string, File>>
  ) => {
    const activeTf = slots[activeChartIndex]?.timeframe || '1m';
    let targetTf = preferredTf || activeTf || '1m';

    const currentFilesMap = overrideFilesMap || useWatchlistStore.getState().symbolFilesMap;
    const files = currentFilesMap[symbolName];

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
          return;
        }
        targetTf = foundTf;
      }
    }

    // Show loader and yield a paint frame so the spinner actually renders
    setIsLoadingSymbol(true);

    // Wrap all heavy work in a requestAnimationFrame + setTimeout to guarantee
    // React paints the loading overlay before we start chart operations
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        setTimeout(async () => {
          try {
            // 1. Load timeframe data (cache hit = instant)
            let targetData: KLineData[] = [];
            try {
              const tfsToLoad = files ? Object.keys(files) : ['1m', '5m', '15m', '30m', '1h', '4h', 'D'];
              await Promise.all(tfsToLoad.map(tf => getOrImportTimeframeData(symbolName, tf)));
              targetData = await getOrImportTimeframeData(symbolName, targetTf);
            } catch (err) {
              console.error(`[DEBUG] handleWatchlistSymbolSwitch - failed to load data for ${symbolName}:`, err);
            }

            if (targetData.length === 0) {
              setWatchlistToast({ msg: `No data found for '${symbolName}'.`, type: 'error' });
              setTimeout(() => setWatchlistToast(null), 2500);
              return;
            }

            // 2. Update active symbol state (persistence non-blocking)
            watchlistRepository.saveActiveSymbol(symbolName).catch(console.error);
            persistenceService.setActiveWatchlistSymbol(symbolName);
            setActiveWatchlistSymbol(symbolName);

            // 3. Cache raw 1m if not already cached
            if (!rawDataCache.has(symbolName)) {
              const raw1m = await marketDataRepository.getBars(symbolName, '1m');
              if (raw1m.length > 0) {
                rawDataCache.set(symbolName, raw1m);
              }
            }

            // 4. Load profile from cache (instant) or DB
            let profile = symbolProfileCache.get(symbolName) || null;
            if (!profile) {
              profile = await watchlistRepository.getSymbolProfile(symbolName);
              if (profile) {
                symbolProfileCache.set(symbolName, profile);
              }
            }
            let updatedSettings = { ...settings };
            if (profile) {
              updatedSettings = {
                ...settings,
                brokerTimezoneOffset: profile.brokerTimezoneOffset,
                brokerTimezoneLabel: profile.brokerTimezoneLabel,
                pricePrecision: profile.pricePrecision,
              };
              setSettings(updatedSettings);
              settingsRepository.saveSettings(updatedSettings).catch(console.error);

              const visibleCount = getLayoutChartCount(useLayoutStore.getState().layoutType);
              for (let i = 0; i < visibleCount; i++) {
                const c = chartInstancesRef.current[i];
                if (c) {
                  applySettingsToChart(c, updatedSettings);
                }
              }
            }

            // 5. Update state and chart
            dataVersionRef.current += 1;
            setAllTimeframesData({ [targetTf]: targetData });
            resetReplay();

            const chart = chartInstancesRef.current[activeChartIndex];
            if (chart) {
              const precision = updatedSettings.pricePrecision !== 0 ? updatedSettings.pricePrecision : detectPricePrecision(targetData);
              chart.setSymbol({ ticker: symbolName, pricePrecision: precision, volumePrecision: 4 });
            }

            // 6. Apply data to chart directly (skip redundant handleTimeframeSwitch)
            await handleTimeframeSwitch(targetTf, symbolName);
            await loadDrawingsForSymbol(symbolName);
          } catch (err) {
            console.error(err);
          } finally {
            setIsLoadingSymbol(false);
            resolve();
          }
        }, 0);
      });
    });
  };

  const validateImportedSymbol = async (
    symbol: string,
    timeframeFiles: Record<string, File>,
    profileFile?: File
  ): Promise<{ isValid: boolean; errorMsg?: string; profileData?: any }> => {
    // 1. Validate Symbol Info if provided
    let profileData: any = null;
    if (profileFile) {
      try {
        const text = await profileFile.text();
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          return { isValid: false, errorMsg: `Symbol Info for ${symbol} is not a valid JSON object.` };
        }
        if (!parsed.symbol || typeof parsed.symbol !== 'string' || parsed.symbol.trim() === '') {
          return { isValid: false, errorMsg: `Symbol Info for ${symbol} must contain a non-empty 'symbol' string.` };
        }
        const fileSym = parsed.symbol.toUpperCase();
        const folderSym = symbol.toUpperCase();
        if (fileSym !== folderSym && !folderSym.startsWith(fileSym)) {
          return { isValid: false, errorMsg: `Symbol Info symbol '${parsed.symbol}' does not match folder symbol '${symbol}'.` };
        }
        if (
          parsed.digits === undefined ||
          parsed.timezone === undefined
        ) {
          return {
            isValid: false,
            errorMsg: `Symbol Info for ${symbol} must contain required fields: digits, timezone.`,
          };
        }
        const tzInfo = parseTimezoneToLabelAndOffset(parsed.timezone);
        profileData = {
          symbol: parsed.symbol,
          pricePrecision: parsed.digits,
          brokerTimezoneOffset: tzInfo.offset,
          brokerTimezoneLabel: tzInfo.label,
        };
      } catch (err) {
        return { isValid: false, errorMsg: `Failed to parse Symbol Info JSON for ${symbol}: ${(err as Error).message}` };
      }
    } else {
      return { isValid: false, errorMsg: `Missing Symbol Info JSON (*_info.json) for ${symbol} in the selected folder.` };
    }

    // 2. Validate Timeframe CSV files
    const timeframes = Object.keys(timeframeFiles);
    if (timeframes.length === 0) {
      return { isValid: false, errorMsg: `No timeframe CSV files found for symbol ${symbol}.` };
    }

    for (const tf of timeframes) {
      const file = timeframeFiles[tf];
      try {
        const text = await file.text();
        const parsed = parseCSV(text);
        if (parsed.parsedCount === 0) {
          return { isValid: false, errorMsg: `File ${file.name} for timeframe ${tf} contains no valid candlestick data.` };
        }
      } catch (err) {
        return { isValid: false, errorMsg: `Failed to parse CSV file ${file.name}: ${(err as Error).message}` };
      }
    }

    return { isValid: true, profileData };
  };

  const resetWorkspace = async () => {
    // 1. Reset layout store
    const layoutStore = useLayoutStore.getState();
    const defaultSlots = [
      { symbol: null, timeframe: '1m' },
      { symbol: null, timeframe: '1m' },
      { symbol: null, timeframe: '1m' },
      { symbol: null, timeframe: '1m' },
    ];
    layoutStore.setSlots(defaultSlots);
    layoutStore.setLayoutType('1');
    layoutStore.setActiveChartIndex(0);

    // 2. Save reset layout to DB
    await workspaceLayoutRepository.saveLayoutConfig({
      layoutType: '1',
      slots: defaultSlots,
      layoutSizes: {},
    });

    // 3. Reset watchlist store active symbol, handles, etc.
    setActiveWatchlistSymbol(null);
    await watchlistRepository.saveActiveSymbol(null);
    setWatchlistSymbols([]);
    await watchlistRepository.saveWatchlistSymbols([]);
    setSymbolFilesMap({});
    await watchlistRepository.saveFolderHandles([]);
    await watchlistRepository.clearAllSymbolProfiles();
    localStorage.removeItem('fx_directory_handles');
    setSavedFolderHandles([]);
    setParseFeedback(null);

    // 4. Clear memory caches
    rawDataCache.clear();
    timezoneAdjustedCache.clear();
    symbolProfileCache.clear();
    setAllTimeframesData({ '1m': [] });

    // 5. Reset Replay
    resetReplay();

    // 6. Reset each chart instance
    chartInstancesRef.current.forEach((chart, idx) => {
      if (chart) {
        try {
          chart.setDataLoader({
            getBars: ({ callback }: any) => {
              callback([]);
            },
          });
          chart.resetData();
          chart.setSymbol({ ticker: 'No Symbol', pricePrecision: 4, volumePrecision: 4 });
        } catch (e) {
          console.warn(`[DEBUG] Failed to reset chart ${idx}:`, e);
        }
      }
    });
  };

  const processDirectoryHandle = async (
    dirHandle: any,
    symbolMap: Record<string, Record<string, File>>,
    profileMap: Record<string, File>,
    currentPath: string = ''
  ) => {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const lowerName = entry.name.toLowerCase();
        if (lowerName.endsWith('.csv')) {
          const file = await entry.getFile();
          const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          const parts = relativePath.split('/');

          let symbol = '';
          let filename = '';

          if (parts.length >= 3) {
            symbol = parts[parts.length - 2].toUpperCase();
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
        } else if (lowerName.endsWith('_info.json')) {
          const file = await entry.getFile();
          const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          const parts = relativePath.split('/');

          let symbol = '';
          if (parts.length >= 2) {
            symbol = parts[parts.length - 2].toUpperCase();
          } else {
            const baseName = entry.name.slice(0, -10);
            symbol = baseName.toUpperCase();
          }
          if (symbol) {
            profileMap[symbol] = file;
          }
        }
      } else if (entry.kind === 'directory') {
        const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        await processDirectoryHandle(entry, symbolMap, profileMap, nextPath);
      }
    }
  };

  const handleSelectFoldersAPI = async (handlesToUse: any[], autoImport = false) => {
    try {
      setIsLoadingSymbol(true);
      const mergedSymbolMap: Record<string, Record<string, File>> = {};
      const mergedProfileMap: Record<string, File> = {};

      for (const dirHandle of handlesToUse) {
        const symbolMap: Record<string, Record<string, File>> = {};
        const profileMap: Record<string, File> = {};
        await processDirectoryHandle(dirHandle, symbolMap, profileMap, dirHandle.name);

        Object.entries(symbolMap).forEach(([sym, files]) => {
          mergedSymbolMap[sym] = {
            ...(mergedSymbolMap[sym] || {}),
            ...files,
          };
        });

        Object.entries(profileMap).forEach(([sym, file]) => {
          mergedProfileMap[sym] = file;
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

      // Validate all discovered symbols
      const validSymbols: string[] = [];
      const validationErrors: string[] = [];
      const parsedProfiles: Record<string, any> = {};

      for (const sym of symbolsList) {
        const profileFile = mergedProfileMap[sym];
        const tfFiles = mergedSymbolMap[sym];

        const validationResult = await validateImportedSymbol(sym, tfFiles, profileFile);
        if (validationResult.isValid) {
          validSymbols.push(sym);
          parsedProfiles[sym] = validationResult.profileData;
        } else {
          validationErrors.push(validationResult.errorMsg || `Validation failed for ${sym}`);
        }
      }

      if (validSymbols.length === 0) {
        setCustomAlert({
          title: 'Import Validation Failed',
          message: `None of the symbol folders passed validation:\n\n${validationErrors.join('\n')}`,
        });
        setIsLoadingSymbol(false);
        return;
      }

      if (validationErrors.length > 0) {
        setCustomAlert({
          title: 'Import Warning',
          message: `The following folders failed validation and were skipped:\n\n${validationErrors.join('\n')}\n\nValid symbols will be imported.`,
        });
      }

      // Commit the valid symbols' data and profiles to persistent storage
      for (const sym of validSymbols) {
        const profile = parsedProfiles[sym];
        await watchlistRepository.saveSymbolProfile(sym, profile);
        symbolProfileCache.set(sym, profile);

        const tfFiles = mergedSymbolMap[sym];
        const importPromises = Object.entries(tfFiles).map(async ([tf, file]) => {
          const text = await file.text();
          const parsed = parseCSV(text);
          if (parsed.parsedCount > 0) {
            await marketDataRepository.saveBars(sym, tf, parsed.data);
            
            // Pre-populate in-memory cache so switching after import is instant with zero loading screen
            const adjusted = adjustTimezone(parsed.data);
            if (!timezoneAdjustedCache.has(sym)) {
              timezoneAdjustedCache.set(sym, {});
            }
            timezoneAdjustedCache.get(sym)![tf] = adjusted;
          }
        });
        await Promise.all(importPromises);
      }

      setSymbolFilesMap(mergedSymbolMap);

      const watchlistItems = validSymbols.map((name) => ({ name }));
      setWatchlistSymbols(watchlistItems);
      await watchlistRepository.saveWatchlistSymbols(watchlistItems);

      setSavedFolderHandles(handlesToUse);
      await watchlistRepository.saveFolderHandles(handlesToUse);

      if (autoImport && validSymbols.length > 0) {
        const target = validSymbols[0];
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
      await resetWorkspace();
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
        setAllTimeframesData((prev) => ({
          ...prev,
          [tf]: tfData,
        }));
        const profile = symbolProfileCache.get(slot.symbol) || await watchlistRepository.getSymbolProfile(slot.symbol);
        if (profile && !symbolProfileCache.has(slot.symbol)) {
          symbolProfileCache.set(slot.symbol, profile);
        }
        const precision = profile?.pricePrecision !== undefined
          ? profile.pricePrecision
          : (settings.pricePrecision !== 0 ? settings.pricePrecision : detectPricePrecision(tfData));

        chart.setSymbol({ ticker: slot.symbol, pricePrecision: precision, volumePrecision: 4 });
        chart.setPeriod(parseTimeframeToPeriod(tf));

        const replayState = useReplayStore.getState();
        let visibleData = tfData;
        if (replayState.isReplayActive && replayState.replayCurrentTimestamp !== null) {
          const lastIdx = findCandleIndexByTimestamp(tfData, replayState.replayCurrentTimestamp);
          visibleData = lastIdx !== -1 ? tfData.slice(0, lastIdx + 1) : [];
        }

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

  const handleSelectChartSlot = (index: number) => {
    const currentActiveIndex = useLayoutStore.getState().activeChartIndex;
    if (index === currentActiveIndex) return;
    setActiveChartIndex(index);
  };

  const handleClearDatabase = async () => {
    await marketDataRepository.clearAll();
    await resetWorkspace();
  };

  const handleWatchlistRemoveConfirm = async (symbolName: string) => {
    removeWatchlistSymbol(symbolName);
    const nextList = watchlistSymbols.filter((s) => s.name !== symbolName);
    await marketDataRepository.deleteBars(symbolName);
    await drawingRepository.clearDrawings(symbolName);
    await watchlistRepository.deleteSymbolProfile(symbolName);
    await watchlistRepository.saveWatchlistSymbols(nextList);

    const layoutStore = useLayoutStore.getState();
    const newSlots = layoutStore.slots.map(slot =>
      slot.symbol === symbolName ? { ...slot, symbol: null } : slot
    );
    layoutStore.setSlots(newSlots);
    await workspaceLayoutRepository.saveLayoutConfig({ slots: newSlots });

    if (nextList.length === 0) {
      await resetWorkspace();
    } else {
      if (activeWatchlistSymbol === symbolName || slots[activeChartIndex]?.symbol === symbolName) {
        await handleWatchlistSymbolSwitch(nextList[0].name);
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
    isSwitchingTimeframeRef,
  };
}
