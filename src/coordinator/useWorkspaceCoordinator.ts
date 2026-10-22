import { useState, useEffect, useRef, useCallback } from 'react';
import { useWatchlistStore, useLayoutStore, useSettingsStore, useReplayStore, useDrawingStore } from '@/store';
import { useSessionDisplayStore } from '@/features/session-display/store/useSessionDisplayStore';
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
import { toPresentationData } from '@/utils/heikinAshi';
import {
  getTimeframeMinutes,
  getBestTimeframeFile,
  getLayoutChartCount,
  parseTimeframeToPeriod,
  shiftCandlesTimezone,
} from '@/domain/market';
import {
  buildTimeframeCache,
  parseTimezoneToLabelAndOffset,
  scanDirectoryHandles,
} from '@/engine/market';
import { persistenceService, captureChartViewport, restoreChartViewport, applyAxisRange, type ViewportScaleState } from '@/engine/workspace';
import { findCandleIndexByTimestamp } from '@/engine/replay';
import { getTrueOffsetRightDistance, isSyncEngineActive } from '@/engine/charting';

import {
  getRawDataCache,
  hasRawDataCache,
  setRawDataCache,
  getTimezoneAdjustedBars,
  setTimezoneAdjustedBars,
  clearTimezoneAdjustedCache,
  getSymbolProfileCache,
  hasSymbolProfileCache,
  setSymbolProfileCache,
  clearWorkspaceCaches,
} from './workspaceCache';
import {
  executeImportPipeline,
  type ImportProgressState,
} from './workspaceImportPipeline';
import { mt5BridgeClient, type LiveStreamUpdate, type LiveTickData } from '@/bridge/mt5BridgeClient';

export { parseTimezoneToLabelAndOffset, clearWorkspaceCaches };
export type { ImportProgressState };

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
  } = useReplayStore();

  // Local Coordinator states
  const isSwitchingTimeframeRef = useRef<boolean>(false);
  const [isSwitchingTimeframe, setIsSwitchingTimeframe] = useState<boolean>(false);
  const [allTimeframesData, setAllTimeframesData] = useState<Record<string, KLineData[]>>({ '1m': [] });
  const [isLoadingSymbol, setIsLoadingSymbol] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<ImportProgressState | null>(null);

  const [parseFeedback, setParseFeedback] = useState<any | null>(null);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string } | null>(null);
  const [watchlistToast, setWatchlistToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [liveTicksBySymbol, setLiveTicksBySymbol] = useState<Record<string, LiveTickData>>({});

  // Active chart stream subscribers map: slotIndex -> callback
  const liveSubscribersRef = useRef<Map<number, { symbol: string; timeframe: string; callback: (bar: KLineData) => void }>>(new Map());

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

        // Restore Session Display settings
        const savedSessionDisplay = await settingsRepository.getSessionDisplaySettings();
        if (savedSessionDisplay && isMounted) {
          useSessionDisplayStore.getState().setInitialState(savedSessionDisplay);
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
            // Pre-load drawings for ALL imported watchlist symbols into useDrawingStore upfront (Checkpoint G)
            const watchlistSymbolNames = savedWatchlist.map((s) => s.name);
            await useDrawingStore.getState().loadAllSymbolDrawings(watchlistSymbolNames);
          }

          // Restore market data for all saved slots
          const visibleCount = getLayoutChartCount(savedLayout?.layoutType || '1');
          console.log(`[DEBUG] bootstrapWorkspace - visibleCount: ${visibleCount}, savedLayout slots:`, savedLayout?.slots);
          setIsLoadingSymbol(true);
          try {
            for (let i = 0; i < visibleCount; i++) {
              const slot = savedLayout?.slots?.[i];
              if (slot && slot.symbol && isMounted) {
                const bars1m = await marketDataRepository.getBars(slot.symbol, '1m');
                if (bars1m && bars1m.length > 0) {
                  setRawDataCache(slot.symbol, bars1m);
                }
                // Pre-load slot's timeframe data in background to make initial boot instant
                getOrImportTimeframeData(slot.symbol, slot.timeframe).catch(console.error);
                const chart = chartInstancesRef.current[i];
                if (chart && isMounted) {
                  await loadDataForSlot(i, chart);
                }
              }
            }
          } finally {
            if (isMounted) {
              setIsLoadingSymbol(false);
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
      } finally {
        if (isMounted) {
          useLayoutStore.getState().setIsBootstrapped(true);
        }
      }
    }

    bootstrapWorkspace();
    return () => {
      isMounted = false;
    };
  }, []);

  // Invalidate timezoneAdjustedCache when timezone settings change
  useEffect(() => {
    clearTimezoneAdjustedCache();
  }, [settings.userTimezoneOffset, settings.brokerTimezoneOffset, settings.timezoneAdjustmentEnabled]);

  // Helper to retrieve raw 1m data for a symbol from in-memory cache
  const getRawDataFromCache = (symbol: string): KLineData[] => {
    return getRawDataCache(symbol) || [];
  };

  const adjustTimezone = useCallback((bars: KLineData[]): KLineData[] => {
    return shiftCandlesTimezone(
      bars,
      settings.timezoneAdjustmentEnabled,
      settings.brokerTimezoneOffset,
      settings.userTimezoneOffset
    );
  }, [settings.timezoneAdjustmentEnabled, settings.brokerTimezoneOffset, settings.userTimezoneOffset]);

  // Keep references to active chart and settings for the live feed listener
  const activeChartIndexRef = useRef(activeChartIndex);
  activeChartIndexRef.current = activeChartIndex;
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const isReplayActiveRef = useRef(isReplayActive);
  isReplayActiveRef.current = isReplayActive;

  // Global Electron IPC Live Feed Listener
  useEffect(() => {
    if (!mt5BridgeClient.isAvailable()) return;

    const cleanup = mt5BridgeClient.onLiveFeed((update: LiveStreamUpdate) => {
      if (update.type !== 'stream_update' || !update.bars || update.bars.length === 0) {
        return;
      }

      // Safeguard: Check if replay simulation is currently active (do not advance live bars during backtesting replay)
      if (isReplayActiveRef.current) {
        return;
      }

      const activeIdx = activeChartIndexRef.current;
      const currentSlot = slotsRef.current[activeIdx];
      if (!currentSlot || !currentSlot.symbol) return;

      // Safeguard 3: Stale event filtering - ensure incoming payload matches active symbol and timeframe
      if (update.symbol !== currentSlot.symbol || update.timeframe !== currentSlot.timeframe) {
        return;
      }

      // Update live tick state for watchlist & active symbols
      if (update.tick && update.symbol) {
        setLiveTicksBySymbol((prev) => ({
          ...prev,
          [update.symbol]: update.tick!,
        }));
      }

      // Convert bars according to user/broker timezone settings
      const rawBars = update.bars;
      const s = settingsRef.current;
      const adjustedBars = shiftCandlesTimezone(
        rawBars,
        s.timezoneAdjustmentEnabled,
        s.brokerTimezoneOffset,
        s.userTimezoneOffset
      );
      if (adjustedBars.length === 0) return;

      // Extract forming bar [-1] and finalized bar [-2] (if count >= 2)
      const formingBar = adjustedBars[adjustedBars.length - 1];
      const prevBar = adjustedBars.length >= 2 ? adjustedBars[adjustedBars.length - 2] : null;

      // Dispatch to active subscribers (KLineCharts dataLoader.subscribeBar callbacks)
      liveSubscribersRef.current.forEach((sub, slotIdx) => {
        if (sub.symbol === update.symbol && sub.timeframe === update.timeframe) {
          const chart = chartInstancesRef.current[slotIdx];
          if (!chart) return;

          // When previous candle just finalized, pass it first to update its final close
          if (prevBar) {
            sub.callback(prevBar);
          }
          // Pass current forming bar to render real-time tick in-place
          sub.callback(formingBar);
        }
      });

      // Update in-memory timeframes data and SQLite on bar rollover
      setAllTimeframesData((prev) => {
        const existing = prev[update.timeframe] || [];
        if (existing.length === 0) return prev;

        const lastBar = existing[existing.length - 1];

        // Gap detection on live stream update:
        // If forming bar is more than 1.5 candles ahead of lastBar, an inactivity gap occurred
        // (e.g. app was sleeping or closed for 20 minutes). Trigger background incremental backfill!
        const tfMinutes = getTimeframeMinutes(update.timeframe);
        const tfMs = tfMinutes * 60 * 1000;
        if (formingBar.timestamp - lastBar.timestamp > tfMs * 1.5) {
          const throttleKey = `${update.symbol}:${update.timeframe}`;
          const lastCheck = lastIncrementalCheckRef.current.get(throttleKey) || 0;
          if (Date.now() - lastCheck > 10000) {
            lastIncrementalCheckRef.current.set(throttleKey, Date.now());
            // Run background incremental fill to close the gap
            mt5BridgeClient.refreshIncremental(update.symbol, update.timeframe).then(async (res) => {
              if (res.new_bars_count > 0 && res.new_bars.length > 0) {
                const rawBars = await marketDataRepository.getBars(update.symbol, update.timeframe) || [];
                const rawMap = new Map(rawBars.map(b => [b.timestamp, b]));
                res.new_bars.forEach(b => rawMap.set(b.timestamp, b));
                const mergedRaw = Array.from(rawMap.values()).sort((a, b) => a.timestamp - b.timestamp);
                await marketDataRepository.saveBars(update.symbol, update.timeframe, mergedRaw);

                const adjusted = adjustTimezone(mergedRaw);
                setTimezoneAdjustedBars(update.symbol, update.timeframe, adjusted);
                setAllTimeframesData(p => ({ ...p, [update.timeframe]: adjusted }));

                // Re-feed full chart dataset with gap filled
                const chart = chartInstancesRef.current[activeIdx];
                if (chart && adjusted.length > 0) {
                  const visibleData = toPresentationData(adjusted, settingsRef.current.chartType);
                  chart.setDataLoader({
                    getBars: ({ type: loadType, callback }: any) => {
                      if (loadType === 'init') callback(visibleData);
                      else callback([]);
                    }
                  });
                  chart.resetData();
                }
              }
            }).catch(console.error);
          }
        }

        if (formingBar.timestamp > lastBar.timestamp) {
          // A NEW candle has started! The previous bar is now closed and finalized.
          const updatedSeries = [...existing];
          if (prevBar) {
            updatedSeries[updatedSeries.length - 1] = prevBar;
            // Commit finalized previous bar to SQLite asynchronously
            const rawPrevBar = rawBars.length >= 2 ? rawBars[rawBars.length - 2] : null;
            if (rawPrevBar) {
              marketDataRepository.saveBars(update.symbol, update.timeframe, [rawPrevBar]).catch(console.error);
            }
          }
          updatedSeries.push(formingBar);
          setTimezoneAdjustedBars(update.symbol, update.timeframe, updatedSeries);
          return { ...prev, [update.timeframe]: updatedSeries };
        } else if (formingBar.timestamp === lastBar.timestamp) {
          // Update in-progress candle in memory
          const updatedSeries = [...existing];
          updatedSeries[updatedSeries.length - 1] = formingBar;
          setTimezoneAdjustedBars(update.symbol, update.timeframe, updatedSeries);
          return { ...prev, [update.timeframe]: updatedSeries };
        }
        return prev;
      });
    });

    return () => {
      cleanup();
    };
  }, [chartInstancesRef]);

  // Periodic polling for all watchlist symbols to update live Bid, Ask & Spread
  // Runs in-memory only (no disk/database storage), keeping the watchlist UI live and accurate
  useEffect(() => {
    if (!mt5BridgeClient.isAvailable() || watchlistSymbols.length === 0) return;

    let isMounted = true;

    const pollWatchlistTicks = async () => {
      if (isReplayActiveRef.current) return;
      const symbolNames = watchlistSymbols.map((s) => s.name).filter(Boolean);
      if (symbolNames.length === 0) return;

      const ticks = await mt5BridgeClient.getSymbolsTicks(symbolNames);
      if (isMounted && ticks && Object.keys(ticks).length > 0) {
        setLiveTicksBySymbol((prev) => ({
          ...prev,
          ...ticks,
        }));
      }
    };

    // Execute initial poll immediately on mount/list change
    pollWatchlistTicks();

    // Poll every 1.5 seconds for fresh quotes
    const interval = setInterval(pollWatchlistTicks, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [watchlistSymbols]);

  // Throttle map to prevent spamming incremental check for same symbol/tf within 30 seconds
  const lastIncrementalCheckRef = useRef<Map<string, number>>(new Map());

  const getOrImportTimeframeData = useCallback(async (symbol: string, tf: string): Promise<KLineData[]> => {
    // Check if symbol came from MT5 Bridge
    const profile = getSymbolProfileCache(symbol) || await watchlistRepository.getSymbolProfile(symbol);
    const isMT5Symbol = profile?.source === 'MT5_AUTO_BRIDGE';

    // 1. Try to read from in-memory timezoneAdjustedCache first!
    let cachedBars = getTimezoneAdjustedBars(symbol, tf);

    // If MT5 symbol has a suspicious/truncated cached stub (less than 100 bars while history exists in SQLite), invalidate it
    if (isMT5Symbol && cachedBars && cachedBars.length > 0 && cachedBars.length < 100) {
      cachedBars = undefined;
    }

    // 2. If not in memory, try to read from IndexedDB repository!
    if (!cachedBars || cachedBars.length === 0) {
      const data = await marketDataRepository.getBars(symbol, tf) || [];
      if (data.length > 0 && (!isMT5Symbol || data.length >= 100)) {
        cachedBars = adjustTimezone(data);
        setTimezoneAdjustedBars(symbol, tf, cachedBars);
      }
    }

    // 2b. For MT5 symbols: check SQLite storage if not in memory or IndexedDB
    if (isMT5Symbol && (!cachedBars || cachedBars.length === 0) && mt5BridgeClient.isAvailable()) {
      try {
        const storedBars = await mt5BridgeClient.getStoredSeries(symbol, tf);
        if (storedBars && storedBars.length > 0) {
          await marketDataRepository.saveBars(symbol, tf, storedBars);
          cachedBars = adjustTimezone(storedBars);
          setTimezoneAdjustedBars(symbol, tf, cachedBars);
          // Do not early return here so step 3 can immediately perform gap checking against current time!
        }
      } catch (e) {
        console.warn(`[getOrImportTimeframeData] SQLite read fallback error for ${symbol} (${tf}):`, e);
      }
    }

    // 3. Optimized Incremental Sync for MT5 symbols:
    // If bars exist, check if more than 30s passed since last check, OR if the stored data is outdated
    // compared to current time (e.g. user reloaded/reopened the app after inactivity).
    if (isMT5Symbol && mt5BridgeClient.isAvailable() && cachedBars && cachedBars.length > 0) {
      const throttleKey = `${symbol}:${tf}`;
      const lastCheck = lastIncrementalCheckRef.current.get(throttleKey) || 0;

      // Convert local current timestamp to broker time (using brokerTimezoneOffset)
      // to ensure accurate gap comparison regardless of user's local timezone.
      const brokerOffsetMin = settings.brokerTimezoneOffset ?? 180;
      const nowUtc = Date.now();
      const brokerNowMs = nowUtc + (brokerOffsetMin * 60 * 1000);

      // Raw bars in DB are stored in broker timestamp
      const rawStoredBars = await marketDataRepository.getBars(symbol, tf) || [];
      const lastRawBarTs = rawStoredBars[rawStoredBars.length - 1]?.timestamp || 0;

      // Calculate timeframe duration in ms to detect missing/outdated candles
      const tfMinutes = getTimeframeMinutes(tf);
      const tfMs = tfMinutes * 60 * 1000;
      // If the last bar is more than 1.5 bars behind broker time, it has a gap of closed candles
      const isOutdated = lastRawBarTs > 0 && (brokerNowMs - lastRawBarTs) > (tfMs * 1.5);

      if (isOutdated || (nowUtc - lastCheck > 30000)) {
        lastIncrementalCheckRef.current.set(throttleKey, nowUtc);
        try {
          const res = await mt5BridgeClient.refreshIncremental(symbol, tf);
          if (res.new_bars_count > 0 && res.new_bars.length > 0) {
            const rawBars = rawStoredBars.length > 0 ? rawStoredBars : (await marketDataRepository.getBars(symbol, tf) || []);
            // Merge raw bars by timestamp
            const rawMap = new Map(rawBars.map(b => [b.timestamp, b]));
            res.new_bars.forEach(b => rawMap.set(b.timestamp, b));
            const mergedRaw = Array.from(rawMap.values()).sort((a, b) => a.timestamp - b.timestamp);
            await marketDataRepository.saveBars(symbol, tf, mergedRaw);

            const adjusted = adjustTimezone(mergedRaw);
            setTimezoneAdjustedBars(symbol, tf, adjusted);
            return adjusted;
          }
        } catch (e) {
          console.warn(`[DEBUG] Incremental check error for ${symbol} (${tf}):`, e);
        }
      }
      return cachedBars;
    }

    if (cachedBars && cachedBars.length > 0) {
      return cachedBars;
    }

    // 4. If not loaded yet and symbol is from MT5, fetch full timeframe series on-demand
    if (isMT5Symbol && mt5BridgeClient.isAvailable()) {
      try {
        const mt5Bars = await mt5BridgeClient.fetchTimeframe(symbol, tf, 50000);
        if (mt5Bars && mt5Bars.length > 0) {
          await marketDataRepository.saveBars(symbol, tf, mt5Bars);
          const adjusted = adjustTimezone(mt5Bars);
          setTimezoneAdjustedBars(symbol, tf, adjusted);
          return adjusted;
        }
      } catch (e) {
        console.warn(`[DEBUG] Failed to fetch MT5 timeframe ${tf} on demand:`, e);
      }
    }

    // 5. If not in DB, check files map (Folder import mode)
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
          setTimezoneAdjustedBars(symbol, tf, adjusted);
          return adjusted;
        }
      }
    }

    // 4. Fallback: try to load raw 1m from DB/cache and resample it
    let raw1m = getRawDataFromCache(symbol);
    if (raw1m.length === 0) {
      raw1m = await marketDataRepository.getBars(symbol, '1m') || [];
      if (raw1m.length > 0) {
        setRawDataCache(symbol, raw1m);
      }
    }
    if (raw1m.length > 0) {
      const tfData = resample1mToTimeframe(raw1m, getTimeframeMinutes(tf));
      // Save raw resampled bars to DB
      await marketDataRepository.saveBars(symbol, tf, tfData);
      const adjusted = adjustTimezone(tfData);
      setTimezoneAdjustedBars(symbol, tf, adjusted);
      return adjusted;
    }

    return [];
  }, [adjustTimezone]);

  const regenerateAllSlotsTimeframes = async (
    slotsToUpdate: Array<{ symbol: string; timeframe: string; slotIndex: number }>,
    s: typeof settings
  ) => {
    if (slotsToUpdate.length === 0) return;

    // Group slots by symbol to ensure raw data is shifted only once per symbol
    const slotsBySymbol = new Map<string, Array<{ timeframe: string; slotIndex: number }>>();
    for (const slot of slotsToUpdate) {
      const list = slotsBySymbol.get(slot.symbol) || [];
      list.push({ timeframe: slot.timeframe, slotIndex: slot.slotIndex });
      slotsBySymbol.set(slot.symbol, list);
    }

    const mergedTimeframesData: Record<string, KLineData[]> = {};

    for (const [symbol, slotEntries] of slotsBySymbol.entries()) {
      const uniqueTfs = Array.from(new Set(slotEntries.map((e) => e.timeframe)));
      const profile = getSymbolProfileCache(symbol) || await watchlistRepository.getSymbolProfile(symbol);
      const isMT5Symbol = profile?.source === 'MT5_AUTO_BRIDGE';

      // For MT5 auto bridge imports, each timeframe has its own exact historical dataset stored in SQLite/IndexedDB
      if (isMT5Symbol) {
        for (const tf of uniqueTfs) {
          const rawBars = await marketDataRepository.getBars(symbol, tf) || [];
          if (rawBars.length > 0) {
            const adjusted = shiftCandlesTimezone(
              rawBars,
              s.timezoneAdjustmentEnabled,
              s.brokerTimezoneOffset,
              s.userTimezoneOffset
            );
            setTimezoneAdjustedBars(symbol, tf, adjusted);
            mergedTimeframesData[tf] = adjusted;
          }
        }
        for (const entry of slotEntries) {
          const chart = chartInstancesRef.current[entry.slotIndex];
          if (chart) {
            const rawVisibleData = mergedTimeframesData[entry.timeframe] || [];
            const visibleData = toPresentationData(rawVisibleData, s.chartType);
            chart.setDataLoader({
              getBars: ({ type: loadType, callback }: any) => {
                if (loadType === 'init') {
                  callback(visibleData);
                } else {
                  callback([]);
                }
              },
              subscribeBar: ({ callback }: any) => {
                liveSubscribersRef.current.set(entry.slotIndex, {
                  symbol,
                  timeframe: entry.timeframe,
                  callback,
                });
                if (entry.slotIndex === activeChartIndexRef.current && isMT5Symbol) {
                  mt5BridgeClient.subscribeStream(symbol, entry.timeframe).catch(console.error);
                }
              },
              unsubscribeBar: () => {
                liveSubscribersRef.current.delete(entry.slotIndex);
                if (entry.slotIndex === activeChartIndexRef.current && isMT5Symbol) {
                  mt5BridgeClient.unsubscribeStream().catch(console.error);
                }
              },
            });
            chart.resetData();
          }
        }
      } else {
        // Manual CSV / 1m Resampling pipeline
        let raw1m = getRawDataFromCache(symbol);
        if (raw1m.length === 0) {
          raw1m = await marketDataRepository.getBars(symbol, '1m') || [];
          if (raw1m.length > 0) {
            setRawDataCache(symbol, raw1m);
          }
        }

        if (raw1m.length > 0) {
          const tfCache = buildTimeframeCache(raw1m, s, uniqueTfs);
          Object.assign(mergedTimeframesData, tfCache);

          for (const entry of slotEntries) {
            const chart = chartInstancesRef.current[entry.slotIndex];
            if (chart) {
              const rawVisibleData = tfCache[entry.timeframe] || [];
              const visibleData = toPresentationData(rawVisibleData, s.chartType);
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
          }
        } else {
          // Fallback if 1m is not found
          for (const tf of uniqueTfs) {
            const rawBars = await marketDataRepository.getBars(symbol, tf) || [];
            if (rawBars.length > 0) {
              const adjusted = shiftCandlesTimezone(
                rawBars,
                s.timezoneAdjustmentEnabled,
                s.brokerTimezoneOffset,
                s.userTimezoneOffset
              );
              setTimezoneAdjustedBars(symbol, tf, adjusted);
              mergedTimeframesData[tf] = adjusted;
            }
          }
          for (const entry of slotEntries) {
            const chart = chartInstancesRef.current[entry.slotIndex];
            if (chart) {
              const rawVisibleData = mergedTimeframesData[entry.timeframe] || [];
              const visibleData = toPresentationData(rawVisibleData, s.chartType);
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
          }
        }
      }
    }

    setAllTimeframesData((prev) => ({ ...prev, ...mergedTimeframesData }));
  };

  const regenerateTimeframes = (raw1m: KLineData[], s: typeof settings, timeframe: string, targetChartIndex?: number) => {
    if (raw1m.length === 0) return;

    const idx = targetChartIndex !== undefined ? targetChartIndex : useLayoutStore.getState().activeChartIndex;
    const tfCache = buildTimeframeCache(raw1m, s, timeframe);
    setAllTimeframesData((prev) => ({ ...prev, ...tfCache }));

    const chart = chartInstancesRef.current[idx];
    if (chart) {
      const rawVisibleData = tfCache[timeframe] || [];
      const visibleData = toPresentationData(rawVisibleData, s.chartType);
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
    setIsSwitchingTimeframe(true);

    // 1. Immediately capture the active chart's viewport & exact candle position synchronously
    let capturedViewportState: ViewportScaleState | null = null;
    const activeChart = chartInstancesRef.current[activeChartIndex];
    if (activeChart) {
      if (isSymbolSwitch) {
        capturedOffsetRef.current = null;
        wasManualScaleRef.current = false;
        capturedYAxisRangeRef.current = null;
      } else {
        capturedViewportState = captureChartViewport(activeChart);
        capturedOffsetRef.current = capturedViewportState.offset;
        wasManualScaleRef.current = capturedViewportState.wasManualScale;
        capturedYAxisRangeRef.current = capturedViewportState.yAxisRange;
      }
    }

    // 2. Yield at least one animation frame so the browser paints the faded state (opacity-35)
    // even if target timeframe data is already in memory
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

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
        }
      }

      const layoutStore = useLayoutStore.getState();
      const newSlots = [...layoutStore.slots];
      
      newSlots[activeChartIndex] = { symbol: currentSymbol, timeframe: tf };
      
      const isMulti = isSyncEngineActive(layoutStore.layoutType);
      
      if (isMulti && layoutStore.syncSymbol && currentSymbol) {
        newSlots.forEach((_, idx) => {
          newSlots[idx] = { ...newSlots[idx], symbol: currentSymbol };
        });
      }
      if (isMulti && layoutStore.syncInterval) {
        newSlots.forEach((_, idx) => {
          newSlots[idx] = { ...newSlots[idx], timeframe: tf };
        });
      }
      
      layoutStore.setSlots(newSlots);
      workspaceLayoutRepository.saveLayoutConfig({ slots: newSlots });

      const visibleCount = getLayoutChartCount(layoutStore.layoutType);
      const affectedIndices = isSymbolSwitch
        ? (isMulti && layoutStore.syncSymbol ? Array.from({ length: visibleCount }, (_, i) => i) : [activeChartIndex])
        : (isMulti && layoutStore.syncInterval ? Array.from({ length: visibleCount }, (_, i) => i) : [activeChartIndex]);

      for (const idx of affectedIndices) {
        const chart = chartInstancesRef.current[idx];
        const slotSym = newSlots[idx]?.symbol || currentSymbol;
        const slotTf = newSlots[idx]?.timeframe || tf;
        if (!chart || !slotSym) continue;

        let slotData = (idx === activeChartIndex && targetData)
          ? targetData
          : await getOrImportTimeframeData(slotSym, slotTf);
        if (!slotData || slotData.length === 0) continue;

        const visibleData = toPresentationData(slotData, settings.chartType);

        const slotProfile = await watchlistRepository.getSymbolProfile(slotSym);
        const isMT5 = slotProfile?.source === 'MT5_AUTO_BRIDGE';

        chart.setDataLoader({
          getBars: ({ type: loadType, callback }: any) => {
            if (loadType === 'init') {
              callback(visibleData);
            } else {
              callback([]);
            }
          },
          subscribeBar: ({ callback }: any) => {
            liveSubscribersRef.current.set(idx, {
              symbol: slotSym,
              timeframe: slotTf,
              callback,
            });
            if (idx === activeChartIndexRef.current && isMT5) {
              mt5BridgeClient.subscribeStream(slotSym, slotTf).catch(console.error);
            }
          },
          unsubscribeBar: () => {
            liveSubscribersRef.current.delete(idx);
            if (idx === activeChartIndexRef.current && isMT5) {
              mt5BridgeClient.unsubscribeStream().catch(console.error);
            }
          },
        });
        chart.resetData();
        chart.setPeriod(parseTimeframeToPeriod(slotTf));
        (chart as any)._loadedTimeframe = slotTf;

        if (activeReplay && alignedTimestamp !== null) {
          const lastRevealed = findCandleIndexByTimestamp(slotData, alignedTimestamp);
          if (lastRevealed !== -1) {
            const N = slotData.length;
            const K = lastRevealed;
            const H = Math.max(0, N - 1 - K);
            if (typeof chart.setLeftMinVisibleBarCount === 'function') {
              chart.setLeftMinVisibleBarCount(H + 1);
            }

            const chartSize = chart.getSize?.();
            const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
            const resetRatio = settings.resetViewOffsetRatio ?? 0.5;
            const targetOffset = chartWidth * resetRatio;

            const barSpaceVal = chart.getBarSpace?.();
            let space = 6;
            if (typeof barSpaceVal === 'number') space = barSpaceVal;
            else if (typeof barSpaceVal === 'object' && barSpaceVal) space = (barSpaceVal as any).bar || 6;

            const hiddenWidth = H * space;
            const effectiveOffset = targetOffset - hiddenWidth;

            (chart as any)._isProgrammaticScroll = true;
            chart.setOffsetRightDistance(effectiveOffset);
            requestAnimationFrame(() => {
              chart.setOffsetRightDistance(effectiveOffset);
              (chart as any)._isProgrammaticScroll = false;
            });
          }

          if (idx === activeChartIndex && wasManualScaleRef.current && capturedYAxisRangeRef.current) {
            const p = chart.getDrawPaneById?.('candle_pane');
            const ya = p?.getYAxisComponents?.()?.[0];
            if (ya) {
              applyAxisRange(ya, capturedYAxisRangeRef.current.from, capturedYAxisRangeRef.current.to);
              ya.setAutoCalcTickFlag?.(false);
            }
          }
        } else {
          let scrollIndex = -1;
          let isHistorical = false;

          if (capturedViewportState && !isSymbolSwitch) {
            if (capturedViewportState.isNearRightEdge) {
              scrollIndex = slotData.length - 1;
            } else if (capturedViewportState.centerTimestamp) {
              const matchedIdx = findCandleIndexByTimestamp(visibleData, capturedViewportState.centerTimestamp);
              if (matchedIdx !== -1) {
                scrollIndex = matchedIdx;
                isHistorical = true;
              } else {
                scrollIndex = slotData.length - 1;
              }
            } else {
              scrollIndex = slotData.length - 1;
            }
          } else {
            scrollIndex = slotData.length - 1;
          }

          if (scrollIndex !== -1) {
            if (idx === activeChartIndex) {
              const resetRatio = settings.resetViewOffsetRatio ?? 0.5;

              restoreChartViewport(
                chart,
                capturedViewportState || {
                  offset: capturedOffsetRef.current,
                  wasManualScale: wasManualScaleRef.current,
                  yAxisRange: capturedYAxisRangeRef.current,
                },
                scrollIndex,
                isSymbolSwitch,
                resetRatio,
                isHistorical
              );
            } else {
              chart.scrollToDataIndex(scrollIndex);
            }
          }
        }
      }

      setTimeout(() => {
        syncAllDrawings();
      }, 50);
    } catch (err) {
      console.error('[DEBUG] handleTimeframeSwitch - Error loading timeframe data:', err);
    } finally {
      // Yield an animation frame before clearing the transition so the chart canvas has repainted
      requestAnimationFrame(() => {
        setIsSwitchingTimeframe(false);
        isSwitchingTimeframeRef.current = false;
      });
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
              // MT5 symbols fetch on demand per timeframe, so only load the active target timeframe.
              // Folder-based symbols have local files in memory, so they can preload available timeframes.
              if (files) {
                const tfsToLoad = Object.keys(files);
                await Promise.all(tfsToLoad.map(tf => getOrImportTimeframeData(symbolName, tf)));
              }
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
            if (!hasRawDataCache(symbolName)) {
              const raw1m = await marketDataRepository.getBars(symbolName, '1m');
              if (raw1m.length > 0) {
                setRawDataCache(symbolName, raw1m);
              }
            }

            // 4. Load profile from cache (instant) or DB
            let profile = getSymbolProfileCache(symbolName) || null;
            if (!profile) {
              profile = await watchlistRepository.getSymbolProfile(symbolName);
              if (profile) {
                setSymbolProfileCache(symbolName, profile);
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
    clearWorkspaceCaches();
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

  const handleSelectFoldersAPI = async (handlesToUse: any[], autoImport = false) => {
    try {
      setIsLoadingSymbol(true);
      setImportProgress({
        status: 'scanning',
        currentActivity: 'Scanning directory for MT5 CSV candlestick files...',
        processedCount: 0,
        totalCount: 0,
      });

      const { symbolMap: mergedSymbolMap, profileMap: mergedProfileMap } = await scanDirectoryHandles(handlesToUse);

      const symbolsList = Object.keys(mergedSymbolMap).sort();
      if (symbolsList.length === 0) {
        setImportProgress({
          status: 'error',
          currentActivity: 'No Files Found',
          errorMessage: 'No valid timeframe CSV files found in selected directory. Please ensure files match standard timeframe names (e.g. m1, h4, d1).',
          processedCount: 0,
          totalCount: 0,
        });
        setIsLoadingSymbol(false);
        return;
      }

      const { validSymbols, validationErrors } = await executeImportPipeline({
        symbolsList,
        mergedSymbolMap,
        mergedProfileMap,
        adjustTimezone,
        onProgress: setImportProgress,
      });

      if (validSymbols.length === 0) {
        setImportProgress({
          status: 'error',
          currentActivity: 'Validation Failed',
          errorMessage: `None of the symbol folders passed validation:\n\n${validationErrors.join('\n')}`,
          processedCount: 0,
          totalCount: symbolsList.length,
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

      setSymbolFilesMap(mergedSymbolMap);

      setImportProgress({
        status: 'preparing',
        currentActivity: 'Preparing chart workspace...',
        processedCount: validSymbols.length,
        totalCount: validSymbols.length,
      });

      const watchlistItems = validSymbols.map((name) => ({ name }));
      setWatchlistSymbols(watchlistItems);
      await watchlistRepository.saveWatchlistSymbols(watchlistItems);
      await useDrawingStore.getState().loadAllSymbolDrawings(validSymbols);

      setSavedFolderHandles(handlesToUse);
      await watchlistRepository.saveFolderHandles(handlesToUse);

      if (autoImport && validSymbols.length > 0) {
        const target = validSymbols[0];
        await handleWatchlistSymbolSwitch(target, undefined, mergedSymbolMap);
      }

      setImportProgress(null);
    } catch (err: any) {
      console.error('[DEBUG] Failed to import folder:', err);
      setImportProgress({
        status: 'error',
        currentActivity: 'Import Failed',
        errorMessage: err?.message || 'An unexpected error occurred while importing market data.',
        processedCount: 0,
        totalCount: 0,
      });
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



  const handleClearFolderHandles = async () => {
    try {
      await resetWorkspace();
    } catch (err) {
      console.error('[DEBUG] Error clearing handles:', err);
    }
  };

  const loadDataForSlot = useCallback(async (
    index: number,
    chart: any,
    options?: { preserveOffset?: boolean; customOffset?: number | null }
  ) => {
    const slot = useLayoutStore.getState().slots[index];
    if (!slot || !slot.symbol) {
      return;
    }

    try {
      const tf = slot.timeframe;
      const tfData = await getOrImportTimeframeData(slot.symbol, tf);

      if (tfData.length > 0) {
        setAllTimeframesData((prev) => {
          if (prev[tf] === tfData) {
            return prev;
          }
          return {
            ...prev,
            [tf]: tfData,
          };
        });
        const profile = getSymbolProfileCache(slot.symbol) || await watchlistRepository.getSymbolProfile(slot.symbol);
        if (profile && !hasSymbolProfileCache(slot.symbol)) {
          setSymbolProfileCache(slot.symbol, profile);
        }
        const precision = profile?.pricePrecision !== undefined
          ? profile.pricePrecision
          : (settings.pricePrecision !== 0 ? settings.pricePrecision : detectPricePrecision(tfData));

        chart.setSymbol({ ticker: slot.symbol, pricePrecision: precision, volumePrecision: 4 });
        chart.setPeriod(parseTimeframeToPeriod(tf));
        (chart as any)._loadedTimeframe = tf;

        const visibleData = toPresentationData(tfData, settings.chartType);

        const slotProfile = profile || await watchlistRepository.getSymbolProfile(slot.symbol);
        const isMT5 = slotProfile?.source === 'MT5_AUTO_BRIDGE';

        chart.setDataLoader({
          getBars: ({ type: loadType, callback }: any) => {
            if (loadType === 'init') {
              callback(visibleData);
            } else {
              callback([]);
            }
          },
          subscribeBar: ({ callback }: any) => {
            liveSubscribersRef.current.set(index, {
              symbol: slot.symbol!,
              timeframe: tf,
              callback,
            });
            if (index === activeChartIndexRef.current && isMT5) {
              mt5BridgeClient.subscribeStream(slot.symbol!, tf).catch(console.error);
            }
          },
          unsubscribeBar: () => {
            liveSubscribersRef.current.delete(index);
            if (index === activeChartIndexRef.current && isMT5) {
              mt5BridgeClient.unsubscribeStream().catch(console.error);
            }
          },
        });
        chart.resetData();
        if (typeof chart.resize === 'function') {
          chart.resize();
          (chart as any)._layout?.();
        }
        if (visibleData.length > 0) {
          const applyPosition = () => {
            if (typeof chart.resize === 'function') {
              chart.resize();
              (chart as any)._layout?.();
            }
            const chartSize = chart.getSize();
            const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
            const resetRatio = settings.resetViewOffsetRatio ?? 0.5;
            const targetOffset = (options?.customOffset !== undefined && options?.customOffset !== null)
              ? options.customOffset
              : (options?.preserveOffset
                ? getTrueOffsetRightDistance(chart)
                : chartWidth * resetRatio);

            (chart as any)._isProgrammaticScroll = true;
            chart.setOffsetRightDistance(targetOffset);
            chart.scrollToDataIndex(visibleData.length - 1);
            requestAnimationFrame(() => {
              chart.setOffsetRightDistance(targetOffset);
              (chart as any)._isProgrammaticScroll = false;
            });
          };

          // Execute immediately and once more after DOM layout reflow has stabilized
          applyPosition();
          requestAnimationFrame(() => {
            applyPosition();
          });
        }
      }
    } catch (err) {
      console.error(`[DEBUG] Error loading slot ${index} data:`, err);
    }
  }, [getOrImportTimeframeData, settings.pricePrecision, settings.resetViewOffsetRatio]);

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

  // Add a new symbol from MT5 to the watchlist (optionally opening it and importing active TF)
  const handleAddMT5Symbol = async (
    symbolName: string,
    options?: {
      openChart?: boolean;
      symbolInfo?: {
        name?: string;
        description?: string;
        digits?: number;
        point?: number;
        category?: string;
      };
    }
  ) => {
    const shouldOpenChart = options?.openChart !== false;
    const symInfo = options?.symbolInfo;

    try {
      if (shouldOpenChart) {
        setIsLoadingSymbol(true);
        setImportProgress({
          status: 'importing',
          currentActivity: `Connecting to MT5 and preparing ${symbolName}...`,
          processedCount: 0,
          totalCount: 1,
          currentSymbol: symbolName,
        });
      }

      // 1. Ensure symbol profile exists in cache and DB with MT5_AUTO_BRIDGE provenance
      let existingProfile = getSymbolProfileCache(symbolName) || (await watchlistRepository.getSymbolProfile(symbolName));
      if (!existingProfile) {
        const precision = symInfo?.digits ?? 5;
        const profileObj = {
          symbol: symbolName,
          name: symInfo?.description || symbolName,
          pricePrecision: precision,
          brokerTimezoneLabel: settings.brokerTimezoneLabel ?? '(UTC+3) Broker',
          brokerTimezoneOffset: settings.brokerTimezoneOffset ?? 180,
          timeframeKeys: ['1m', '5m', '15m', '30m', '1h', '4h', 'D'],
          source: 'MT5_AUTO_BRIDGE',
        };
        await watchlistRepository.saveSymbolProfile(symbolName, profileObj);
        setSymbolProfileCache(symbolName, profileObj);
      }

      // 2. Check if already in watchlist; if not, persist
      const exists = watchlistSymbols.some((s) => s.name.toUpperCase() === symbolName.toUpperCase());
      if (!exists) {
        const nextList = [...watchlistSymbols, { name: symbolName }];
        setWatchlistSymbols(nextList);
        await watchlistRepository.saveWatchlistSymbols(nextList);
        await useDrawingStore.getState().loadSymbolDrawings(symbolName);
      }

      // 2b. Immediately populate live tick quote in-memory so Bid/Ask/Spr are instantly visible
      if (symInfo && (symInfo as any).bid !== undefined && (symInfo as any).ask !== undefined) {
        const bid = Number((symInfo as any).bid) || 0;
        const ask = Number((symInfo as any).ask) || 0;
        const spread = Number((symInfo as any).spread) || 0;
        if (bid > 0 || ask > 0) {
          setLiveTicksBySymbol((prev) => ({
            ...prev,
            [symbolName]: {
              bid,
              ask,
              last: bid,
              spread,
              time_msc: Date.now(),
            },
          }));
        }
      }

      // If user only clicked '+' button (add to watchlist only):
      if (!shouldOpenChart) {
        setWatchlistToast({ msg: `Added ${symbolName} to Watchlist`, type: 'success' });
        setTimeout(() => setWatchlistToast(null), 2500);
        return;
      }

      // 3. If opening chart: fetch active timeframe data and switch to it
      const activeTf = slots[activeChartIndex]?.timeframe || '15m';
      setImportProgress({
        status: 'importing',
        currentActivity: `Loading ${symbolName} (${activeTf.toUpperCase()}) from MT5...`,
        processedCount: 1,
        totalCount: 1,
        currentSymbol: symbolName,
      });

      await handleWatchlistSymbolSwitch(symbolName, activeTf);
      setImportProgress(null);
    } catch (err: any) {
      console.error('[handleAddMT5Symbol] Failed to add MT5 symbol:', err);
      if (shouldOpenChart) {
        setImportProgress({
          status: 'error',
          currentActivity: 'Import Failed',
          errorMessage: err?.message || `Failed to load ${symbolName} from MT5.`,
          processedCount: 0,
          totalCount: 1,
        });
      } else {
        setWatchlistToast({ msg: `Failed to add ${symbolName}`, type: 'error' });
        setTimeout(() => setWatchlistToast(null), 2500);
      }
    } finally {
      setIsLoadingSymbol(false);
    }
  };

  const handleAutoImportMT5 = async (syncResult: any) => {
    try {
      const { symbol, active_timeframe, timeframes_data, profile } = syncResult;
      const targetTf = active_timeframe || '15m';

      setIsLoadingSymbol(true);
      setImportProgress({
        status: 'importing',
        currentActivity: `Importing MT5 data for ${symbol}...`,
        processedCount: 0,
        totalCount: Object.keys(timeframes_data || {}).length || 1,
      });

      // 1. Save profile to Watchlist repository & in-memory cache
      const detectedOffset = syncResult?.broker_timezone_offset ?? profile?.broker_timezone_offset ?? 180;
      const detectedLabel = syncResult?.broker_timezone_label ?? profile?.broker_timezone_label ?? '(UTC+3) Broker';

      const symbolProfile = {
        symbol,
        name: profile?.description || symbol,
        pricePrecision: profile?.digits ?? 5,
        brokerTimezoneLabel: detectedLabel,
        brokerTimezoneOffset: detectedOffset,
        timeframeKeys: Object.keys(timeframes_data || {}),
        source: 'MT5_AUTO_BRIDGE',
      };
      await watchlistRepository.saveSymbolProfile(symbol, symbolProfile);
      setSymbolProfileCache(symbol, symbolProfile);

      // Sync settings broker timezone so adjustments align seamlessly
      const updatedSettings = {
        ...settings,
        brokerTimezoneOffset: detectedOffset,
        brokerTimezoneLabel: detectedLabel,
      };
      setSettings(updatedSettings);
      settingsRepository.saveSettings(updatedSettings).catch(console.error);

      // 2. Save bars into market data repository and populate in-memory caches
      const tfs = Object.keys(timeframes_data || {});
      let count = 0;
      for (const tf of tfs) {
        const rawBars = timeframes_data[tf] || [];
        if (rawBars.length > 0) {
          await marketDataRepository.saveBars(symbol, tf, rawBars);
          const adjusted = adjustTimezone(rawBars);
          setTimezoneAdjustedBars(symbol, tf, adjusted);
        }
        count++;
        setImportProgress({
          status: 'importing',
          currentActivity: `Processed timeframe ${tf.toUpperCase()} (${count} of ${tfs.length})`,
          processedCount: count,
          totalCount: tfs.length,
          currentSymbol: symbol,
        });
      }

      setImportProgress({
        status: 'preparing',
        currentActivity: 'Rendering chart canvas...',
        processedCount: tfs.length,
        totalCount: tfs.length,
      });

      // 3. Update watchlist
      const watchlistItems = [{ name: symbol }];
      setWatchlistSymbols(watchlistItems);
      await watchlistRepository.saveWatchlistSymbols(watchlistItems);
      await useDrawingStore.getState().loadAllSymbolDrawings([symbol]);

      // 4. Update layout slot with symbol and timeframe
      const layoutStore = useLayoutStore.getState();
      const currentSlots = [...layoutStore.slots];
      currentSlots[activeChartIndex] = { symbol, timeframe: targetTf };
      layoutStore.setSlots(currentSlots);
      await workspaceLayoutRepository.saveLayoutConfig({
        layoutType: layoutStore.layoutType,
        slots: currentSlots,
        layoutSizes: layoutStore.layoutSizes,
      });

      // 5. Load and display on the chart canvas
      const targetBars = getTimezoneAdjustedBars(symbol, targetTf) || [];
      setAllTimeframesData({ [targetTf]: targetBars });
      setActiveWatchlistSymbol(symbol);
      await watchlistRepository.saveActiveSymbol(symbol);
      persistenceService.setActiveWatchlistSymbol(symbol);

      const chart = chartInstancesRef.current[activeChartIndex];
      if (chart) {
        chart.setSymbol({
          ticker: symbol,
          pricePrecision: symbolProfile.pricePrecision,
          volumePrecision: 4,
        });
      }

      await handleTimeframeSwitch(targetTf, symbol);
      await loadDrawingsForSymbol(symbol);

      setImportProgress(null);
    } catch (err: any) {
      console.error('[DEBUG] Failed handleAutoImportMT5:', err);
      setImportProgress({
        status: 'error',
        currentActivity: 'Import Failed',
        errorMessage: err?.message || 'Failed to apply MT5 chart data.',
        processedCount: 0,
        totalCount: 0,
      });
    } finally {
      setIsLoadingSymbol(false);
    }
  };

  const [isRefreshingData, setIsRefreshingData] = useState(false);

  // Explicit user-triggered refresh button: pulls newly closed bars for active symbol and timeframe
  const handleRefreshActiveData = async () => {
    const symbol = slots[activeChartIndex]?.symbol;
    const tf = slots[activeChartIndex]?.timeframe || '1m';
    if (!symbol) return;

    const profile = getSymbolProfileCache(symbol) || await watchlistRepository.getSymbolProfile(symbol);
    if (profile?.source !== 'MT5_AUTO_BRIDGE' || !mt5BridgeClient.isAvailable()) {
      setWatchlistToast({ msg: 'Data refresh is available for MT5 synchronized symbols.', type: 'info' });
      setTimeout(() => setWatchlistToast(null), 2500);
      return;
    }

    try {
      setIsRefreshingData(true);

      // Verify that the local cache/IndexedDB has full data from SQLite
      let currentBars = await marketDataRepository.getBars(symbol, tf) || [];
      if (currentBars.length < 100) {
        const storedBars = await mt5BridgeClient.getStoredSeries(symbol, tf);
        if (storedBars && storedBars.length > 0) {
          currentBars = storedBars;
          await marketDataRepository.saveBars(symbol, tf, currentBars);
        }
      }

      const res = await mt5BridgeClient.refreshIncremental(symbol, tf);
      if (res.new_bars_count > 0 && res.new_bars.length > 0) {
        const rawBars = currentBars.length > 0 ? currentBars : (await marketDataRepository.getBars(symbol, tf) || []);
        const rawMap = new Map(rawBars.map((b) => [b.timestamp, b]));
        res.new_bars.forEach((b) => rawMap.set(b.timestamp, b));
        const mergedRaw = Array.from(rawMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        await marketDataRepository.saveBars(symbol, tf, mergedRaw);

        const adjusted = adjustTimezone(mergedRaw);
        setTimezoneAdjustedBars(symbol, tf, adjusted);
        setAllTimeframesData((prev) => ({ ...prev, [tf]: adjusted }));

        // Update chart directly with freshly merged data
        const chart = chartInstancesRef.current[activeChartIndex];
        if (chart) {
          const visibleData = toPresentationData(adjusted, settings.chartType);
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

          if (visibleData.length > 0) {
            const chartSize = chart.getSize?.();
            const chartWidth = chartSize && chartSize.width > 0 ? chartSize.width : 800;
            const resetRatio = settings.resetViewOffsetRatio ?? 0.5;
            const targetOffset = chartWidth * resetRatio;

            (chart as any)._isProgrammaticScroll = true;
            chart.setOffsetRightDistance(targetOffset);
            chart.scrollToDataIndex(visibleData.length - 1);
            requestAnimationFrame(() => {
              chart.setOffsetRightDistance(targetOffset);
              (chart as any)._isProgrammaticScroll = false;
            });
          }
        }
        setWatchlistToast({ msg: `Updated with ${res.new_bars_count} new closed bar(s)!`, type: 'success' });
      } else {
        // Even if 0 new bars from MT5, ensure the chart displays the full stored data if it was previously truncated
        const adjusted = adjustTimezone(currentBars);
        if (adjusted.length > 0) {
          setTimezoneAdjustedBars(symbol, tf, adjusted);
          setAllTimeframesData((prev) => ({ ...prev, [tf]: adjusted }));
          const chart = chartInstancesRef.current[activeChartIndex];
          if (chart) {
            const visibleData = toPresentationData(adjusted, settings.chartType);
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
        }
        setWatchlistToast({ msg: 'All data is up to date.', type: 'info' });
      }
      setTimeout(() => setWatchlistToast(null), 2500);
    } catch (e: any) {
      console.error('[handleRefreshActiveData] Error:', e);
      setWatchlistToast({ msg: 'Failed to refresh market data.', type: 'error' });
      setTimeout(() => setWatchlistToast(null), 2500);
    } finally {
      setIsRefreshingData(false);
    }
  };

  const handleWatchlistAddFile = async (file: File) => {
    try {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
      const text = await file.text();
      if (!text) return;
      const result = parseCSV(text);
      if (result.parsedCount > 0) {
        setRawDataCache(cleanName, result.data);

        const exists = watchlistSymbols.some((s) => s.name === cleanName);
        const nextList = [...watchlistSymbols];
        if (!exists) {
          nextList.push({ name: cleanName });
          setWatchlistSymbols(nextList);
        }
        await marketDataRepository.saveBars(cleanName, '1m', result.data);
        await watchlistRepository.saveWatchlistSymbols(nextList);
        await useDrawingStore.getState().loadSymbolDrawings(cleanName);
      }
    } catch (err) {
      console.error('[DEBUG] Failed to import single file into watchlist:', err);
    }
  };

  return {
    allTimeframesData,
    setAllTimeframesData,
    isLoadingSymbol,
    importProgress,
    resetImportProgress: () => setImportProgress(null),
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
    handleClearFolderHandles,
    loadDataForSlot,
    handleSelectChartSlot,
    handleClearDatabase,
    handleWatchlistRemoveConfirm,
    handleWatchlistAddFolder,
    handleAddMT5Symbol,
    handleWatchlistAddFile,
    handleAutoImportMT5,
    handleRefreshActiveData,
    isRefreshingData,
    regenerateTimeframes,
    regenerateAllSlotsTimeframes,
    handleTimeframeSwitch,
    handleWatchlistSymbolSwitch,
    isSwitchingTimeframe,
    isSwitchingTimeframeRef,
    getOrImportTimeframeData,
    liveTicksBySymbol,
  };
}
