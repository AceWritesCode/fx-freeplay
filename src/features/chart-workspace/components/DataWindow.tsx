import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, CandlestickChart } from 'lucide-react';
import type { Chart } from 'klinecharts';
import type { KLineData } from '@/utils/dataUtils';
import { detectPricePrecision } from '@/utils/dataUtils';
import { useLayoutStore, useReplayStore } from '@/store';
import { getSymbolProfileCache, setSymbolProfileCache } from '@/coordinator/workspaceCache';
import { watchlistRepository } from '@/repository';
import { formatTimeframeDisplay, formatDataRangeDate } from '@/domain/market/timeframeUtils';
import { findCandleIndexByTimestamp } from '@/engine/replay';
import type { ValidatedSymbolProfile } from '@/engine/market/marketImport';

interface DataWindowProps {
  chartInstancesRef: React.MutableRefObject<(Chart | null)[]>;
  activeChartIndex: number;
  activeSymbol: string;
  activeTimeframe: string;
}

function formatCandleDate(ts: number): string {
  const date = new Date(ts);
  if (isNaN(date.getTime())) return '-';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${dayName} ${monthName} ${day}, ${year}`;
}

function formatCandleTime(ts: number): string {
  const date = new Date(ts);
  if (isNaN(date.getTime())) return '-';
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

export const DataWindow: React.FC<DataWindowProps> = ({
  chartInstancesRef,
  activeChartIndex,
  activeSymbol,
  activeTimeframe,
}) => {
  const [hoveredCandle, setHoveredCandle] = useState<KLineData | null>(null);
  const [isCandleOpen, setIsCandleOpen] = useState(true);
  const [isSymbolOpen, setIsSymbolOpen] = useState(true);
  const [symbolProfile, setSymbolProfile] = useState<ValidatedSymbolProfile | null>(null);

  // Derive active slot properties reactively
  const activeSlot = useLayoutStore((state) => state.slots[activeChartIndex]);
  const currentSymbol = activeSlot?.symbol || activeSymbol;
  const currentTimeframe = activeSlot?.timeframe || activeTimeframe;

  const activeChart = chartInstancesRef.current[activeChartIndex];

  // Fetch or retrieve symbol metadata profile
  useEffect(() => {
    let isMounted = true;
    if (!currentSymbol || currentSymbol === 'No Symbol') {
      setSymbolProfile(null);
      return;
    }

    const cached = getSymbolProfileCache(currentSymbol);
    if (cached) {
      setSymbolProfile(cached);
    } else {
      watchlistRepository.getSymbolProfile(currentSymbol).then((prof) => {
        if (isMounted && prof) {
          setSymbolProfileCache(currentSymbol, prof);
          setSymbolProfile(prof);
        }
      }).catch((err) => {
        console.debug('[DataWindow] Error retrieving symbol profile:', err);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [currentSymbol]);

  // Extract active chart data list
  const chartDataList = useMemo(() => {
    if (!activeChart || typeof activeChart.getDataList !== 'function') return [];
    return (activeChart.getDataList() || []) as KLineData[];
  }, [activeChart, currentSymbol, currentTimeframe]);

  const pricePrecision = useMemo(() => {
    if (symbolProfile?.pricePrecision !== undefined && symbolProfile.pricePrecision !== null) {
      return symbolProfile.pricePrecision;
    }
    if (chartDataList.length > 0) {
      return detectPricePrecision(chartDataList);
    }
    return 5;
  }, [symbolProfile, chartDataList]);

  // Subscribe to live crosshair changes using reliable coordinate conversion & replay boundary check
  useEffect(() => {
    const chart = chartInstancesRef.current[activeChartIndex];
    if (!chart) {
      setHoveredCandle(null);
      return;
    }

    const handleCrosshair = (params: any) => {
      let candle: KLineData | null = null;
      const replayState = useReplayStore.getState();
      const isReplay = replayState.isReplayActive && replayState.replayCurrentTimestamp !== null;
      const replayLimit = replayState.replayCurrentTimestamp;

      if (params && typeof params === 'object') {
        const dataList = (chart.getDataList?.() || []) as KLineData[];

        // 1. Check if direct kLineData was passed
        if (params.kLineData && typeof params.kLineData.timestamp === 'number') {
          if (!isReplay || (replayLimit !== null && params.kLineData.timestamp <= replayLimit)) {
            candle = params.kLineData;
          }
        }

        // 2. Fallback to pixel coordinate conversion (same robust path as Replay Magnet)
        if (!candle && typeof params.x === 'number' && dataList.length > 0) {
          try {
            const points = chart.convertFromPixel(
              [{ x: params.x, y: typeof params.y === 'number' ? params.y : 100 }],
              { paneId: 'candle_pane' }
            );
            const pt = Array.isArray(points) ? points[0] : points;
            if (pt) {
              let targetIndex = -1;
              if (typeof pt.dataIndex === 'number' && !isNaN(pt.dataIndex)) {
                targetIndex = Math.round(pt.dataIndex);
              } else if (typeof pt.timestamp === 'number') {
                targetIndex = findCandleIndexByTimestamp(dataList, pt.timestamp);
              }

              if (targetIndex >= 0 && targetIndex < dataList.length) {
                const candidate = dataList[targetIndex];
                if (candidate && (!isReplay || (replayLimit !== null && candidate.timestamp <= replayLimit))) {
                  candle = candidate;
                }
              }
            }
          } catch (err) {
            console.debug('[DataWindow] Coordinate conversion error:', err);
          }
        }
      }

      setHoveredCandle(candle);
    };

    chart.subscribeAction('onCrosshairChange', handleCrosshair);
    return () => {
      try {
        chart.unsubscribeAction('onCrosshairChange', handleCrosshair);
      } catch (err) {
        console.debug('[DataWindow] Failed to unsubscribe crosshair:', err);
      }
    };
  }, [chartInstancesRef, activeChartIndex]);

  // Candle metrics
  const candleMetrics = useMemo(() => {
    if (!hoveredCandle) return null;
    const { open, high, low, close, volume, timestamp } = hoveredCandle;
    const change = (close ?? 0) - (open ?? 0);
    const percentChange = open ? (change / open) * 100 : 0;
    const isUp = (close ?? 0) >= (open ?? 0);

    return {
      date: formatCandleDate(timestamp),
      time: formatCandleTime(timestamp),
      open: open?.toFixed(pricePrecision) ?? '-',
      high: high?.toFixed(pricePrecision) ?? '-',
      low: low?.toFixed(pricePrecision) ?? '-',
      close: close?.toFixed(pricePrecision) ?? '-',
      change: `${isUp ? '+' : ''}${change.toFixed(pricePrecision)} (${isUp ? '+' : ''}${percentChange.toFixed(2)}%)`,
      volume: volume !== undefined && volume !== null && volume >= 0 ? volume.toLocaleString() : '-',
      isUp,
    };
  }, [hoveredCandle, pricePrecision]);

  // Symbol metrics
  const totalBars = chartDataList.length;
  const firstBar = chartDataList[0];
  const lastBar = chartDataList[chartDataList.length - 1];
  const dataStart = firstBar ? formatDataRangeDate(firstBar.timestamp) : '-';
  const dataEnd = lastBar ? formatDataRangeDate(lastBar.timestamp) : '-';
  const timezoneLabel = symbolProfile?.brokerTimezoneLabel || (symbolProfile?.brokerTimezoneOffset !== undefined ? `UTC${symbolProfile.brokerTimezoneOffset >= 0 ? '+' : ''}${symbolProfile.brokerTimezoneOffset / 60}` : 'UTC');

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto text-xs select-none bg-surface custom-scrollbar">
      
      {/* ─── Candle Information Section ─────────────────────────────────── */}
      <div className="border-b border-border-def">
        <button
          type="button"
          onClick={() => setIsCandleOpen(!isCandleOpen)}
          className="w-full flex items-center justify-between py-2 px-3 bg-surface hover:bg-surface-hover/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5 font-semibold text-txt-primary">
            {isCandleOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-txt-muted" />
            )}
            <span>Candle Information</span>
          </div>
        </button>

        {isCandleOpen && (
          <div className="pb-2">
            {/* Date & Time Header Rows */}
            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/20">
              <span className="text-txt-muted">Date</span>
              <span className="font-mono text-txt-primary">{candleMetrics?.date ?? '-'}</span>
            </div>

            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/30">
              <span className="text-txt-muted">Time</span>
              <span className="font-mono text-txt-primary">{candleMetrics?.time ?? '-'}</span>
            </div>

            {/* Symbol & Timeframe Subheader */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-txt-primary bg-surface-elevated/20 border-b border-border-sub/30 mt-1">
              <CandlestickChart className="w-3.5 h-3.5 text-txt-muted" />
              <span>{currentSymbol || 'No Symbol'}</span>
              <span className="text-txt-muted">·</span>
              <span className="text-txt-secondary font-medium">{formatTimeframeDisplay(currentTimeframe)}</span>
            </div>

            {/* OHLCV Rows */}
            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/20 hover:bg-surface-hover/20">
              <span className="text-txt-muted">Open</span>
              <span className="font-mono font-medium text-txt-primary">{candleMetrics?.open ?? '-'}</span>
            </div>

            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/20 hover:bg-surface-hover/20">
              <span className="text-txt-muted">High</span>
              <span className="font-mono font-medium text-txt-primary">{candleMetrics?.high ?? '-'}</span>
            </div>

            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/20 hover:bg-surface-hover/20">
              <span className="text-txt-muted">Low</span>
              <span className="font-mono font-medium text-txt-primary">{candleMetrics?.low ?? '-'}</span>
            </div>

            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/20 hover:bg-surface-hover/20">
              <span className="text-txt-muted">Close</span>
              <span className={`font-mono font-medium ${candleMetrics ? (candleMetrics.isUp ? 'text-status-success' : 'text-status-error') : 'text-txt-primary'}`}>
                {candleMetrics?.close ?? '-'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/20 hover:bg-surface-hover/20">
              <span className="text-txt-muted">Change</span>
              <span className={`font-mono font-medium ${candleMetrics ? (candleMetrics.isUp ? 'text-status-success' : 'text-status-error') : 'text-txt-primary'}`}>
                {candleMetrics?.change ?? '-'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/20 hover:bg-surface-hover/20">
              <span className="text-txt-muted">Vol</span>
              <span className="font-mono text-txt-primary">{candleMetrics?.volume ?? '-'}</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Symbol Information Section ─────────────────────────────────── */}
      <div className="border-b border-border-def">
        <button
          type="button"
          onClick={() => setIsSymbolOpen(!isSymbolOpen)}
          className="w-full flex items-center justify-between py-2 px-3 bg-surface hover:bg-surface-hover/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5 font-semibold text-txt-primary">
            {isSymbolOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-txt-muted" />
            )}
            <span>Symbol Information</span>
          </div>
        </button>

        {isSymbolOpen && (
          <div className="pb-2">
            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/20 hover:bg-surface-hover/20">
              <span className="text-txt-muted">Symbol</span>
              <span className="font-semibold text-txt-primary">{currentSymbol || '-'}</span>
            </div>

            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/20 hover:bg-surface-hover/20">
              <span className="text-txt-muted">Timeframe</span>
              <span className="font-medium text-txt-primary">
                {currentTimeframe ? `${formatTimeframeDisplay(currentTimeframe)} (${currentTimeframe})` : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/20 hover:bg-surface-hover/20">
              <span className="text-txt-muted">Price Precision</span>
              <span className="font-mono text-txt-primary">{pricePrecision} decimals</span>
            </div>

            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/20 hover:bg-surface-hover/20">
              <span className="text-txt-muted">Broker Timezone</span>
              <span className="font-medium text-txt-primary text-right max-w-[170px] truncate" title={timezoneLabel}>
                {timezoneLabel}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/20 hover:bg-surface-hover/20">
              <span className="text-txt-muted">Loaded Bars</span>
              <span className="font-mono text-txt-primary">{totalBars > 0 ? totalBars.toLocaleString() : '-'}</span>
            </div>

            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/20 hover:bg-surface-hover/20">
              <span className="text-txt-muted">Data Start</span>
              <span className="font-mono text-txt-primary text-[11px]">{dataStart}</span>
            </div>

            <div className="flex items-center justify-between py-1 px-3 text-xs border-b border-border-sub/20 hover:bg-surface-hover/20">
              <span className="text-txt-muted">Data End</span>
              <span className="font-mono text-txt-primary text-[11px]">{dataEnd}</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
