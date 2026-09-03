import React, { useState, useEffect } from 'react';
import type { Chart } from 'klinecharts';
import type { KLineData } from '@/utils/dataUtils';
import { formatDateFeedback } from '@/components/ThemeSettingsModal';

interface DataWindowProps {
  chartInstancesRef: React.MutableRefObject<(Chart | null)[]>;
  activeChartIndex: number;
  activeSymbol: string;
  activeTimeframe: string;
}

export const DataWindow: React.FC<DataWindowProps> = ({
  chartInstancesRef,
  activeChartIndex,
  activeSymbol,
  activeTimeframe,
}) => {
  const [hoveredCandle, setHoveredCandle] = useState<KLineData | null>(null);

  useEffect(() => {
    const chart = chartInstancesRef.current[activeChartIndex];
    if (!chart) return;

    const handleCrosshair = (data: unknown) => {
      const params = data as { kLineData?: KLineData } | undefined;
      if (params?.kLineData) {
        setHoveredCandle(params.kLineData);
      } else {
        setHoveredCandle(null);
      }
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

  if (!hoveredCandle) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-txt-muted">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" className="text-txt-muted mb-2 opacity-50">
          <path stroke="currentColor" strokeWidth="2" d="M3 6h22M3 12h22M3 18h22" />
        </svg>
        <p className="text-[11px] leading-relaxed">Hover over a candle to view data window stats.</p>
      </div>
    );
  }

  const { open, high, low, close, volume, timestamp } = hoveredCandle;
  const change = (close ?? 0) - (open ?? 0);
  const percentChange = open ? (change / open) * 100 : 0;
  const isUp = (close ?? 0) >= (open ?? 0);

  return (
    <div className="flex-1 flex flex-col p-4 text-xs select-none overflow-y-auto">
      {/* Symbol & Timeframe Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-sub">
        <div className="flex items-center gap-2">
          <span className="font-bold text-txt-primary">{activeSymbol}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-txt-muted border border-border-sub font-semibold uppercase">
            {activeTimeframe}
          </span>
        </div>
        {open !== undefined && close !== undefined && (
          <span className={`text-[11px] font-bold ${isUp ? 'text-status-success' : 'text-status-error'}`}>
            {isUp ? '+' : ''}{change.toFixed(5)} ({isUp ? '+' : ''}{percentChange.toFixed(2)}%)
          </span>
        )}
      </div>

      {/* Date & Time */}
      {timestamp && (
        <div className="flex items-center justify-between py-1.5 text-txt-muted">
          <span>Date/Time</span>
          <span className="text-txt-primary font-medium">{formatDateFeedback(timestamp)}</span>
        </div>
      )}

      {/* OHLC Values */}
      <div className="space-y-1.5 pt-2">
        <div className="flex items-center justify-between py-1 border-t border-border-sub/50">
          <span className="text-txt-muted">Open</span>
          <span className="text-txt-primary font-mono font-medium">{open?.toFixed(5) ?? '-'}</span>
        </div>
        <div className="flex items-center justify-between py-1 border-t border-border-sub/50">
          <span className="text-txt-muted">High</span>
          <span className="text-txt-primary font-mono font-medium">{high?.toFixed(5) ?? '-'}</span>
        </div>
        <div className="flex items-center justify-between py-1 border-t border-border-sub/50">
          <span className="text-txt-muted">Low</span>
          <span className="text-txt-primary font-mono font-medium">{low?.toFixed(5) ?? '-'}</span>
        </div>
        <div className="flex items-center justify-between py-1 border-t border-border-sub/50">
          <span className="text-txt-muted">Close</span>
          <span className={`font-mono font-medium ${isUp ? 'text-status-success' : 'text-status-error'}`}>
            {close?.toFixed(5) ?? '-'}
          </span>
        </div>
        {volume !== undefined && volume !== null && volume > 0 && (
          <div className="flex items-center justify-between py-1 border-t border-border-sub/50">
            <span className="text-txt-muted">Volume</span>
            <span className="text-txt-primary font-mono font-medium">{volume.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};
