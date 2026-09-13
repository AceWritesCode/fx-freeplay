import React, { useState, useEffect } from 'react';
import { AlertCircle, ChevronsRight, ArrowUpRight } from 'lucide-react';
import type { KLineData } from '@/utils/dataUtils';
import { 
  findCoveringHigherTimeframe, 
  formatTimeframeDisplay, 
  formatDataRangeDate 
} from '@/domain/market/timeframeUtils';

interface InsufficientReplayDataOverlayProps {
  slotIndex: number;
  symbol: string;
  timeframe: string;
  replayCurrentTimestamp: number;
  firstAvailableTimestamp: number;
  allTimeframesData: Record<string, KLineData[]>;
  getOrImportTimeframeData?: (symbol: string, tf: string) => Promise<KLineData[]>;
  onShiftToAvailableData: (slotIndex: number) => void;
  onMoveToTimeframe: (tf: string) => void;
}

export const InsufficientReplayDataOverlay: React.FC<InsufficientReplayDataOverlayProps> = ({
  slotIndex,
  symbol,
  timeframe,
  replayCurrentTimestamp,
  firstAvailableTimestamp,
  allTimeframesData,
  getOrImportTimeframeData,
  onShiftToAvailableData,
  onMoveToTimeframe,
}) => {
  const [higherTf, setHigherTf] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    findCoveringHigherTimeframe(
      timeframe,
      symbol,
      replayCurrentTimestamp,
      allTimeframesData,
      getOrImportTimeframeData
    ).then((foundTf) => {
      if (isMounted) {
        setHigherTf(foundTf);
      }
    }).catch(() => {
      if (isMounted) {
        setHigherTf(null);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [timeframe, symbol, replayCurrentTimestamp, allTimeframesData, getOrImportTimeframeData]);

  return (
    <div
      data-testid="insufficient-replay-data-overlay"
      className="absolute inset-0 z-30 flex items-center justify-center bg-app-bg/85 backdrop-blur-xs select-none p-4"
    >
      <div className="max-w-md w-full bg-surface border border-border-def rounded-xl p-5 shadow-2xl flex flex-col items-center text-center gap-3 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center text-accent">
          <AlertCircle className="w-5 h-5" />
        </div>

        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-semibold text-txt-primary">
            Data is not available for this replay timestamp on the selected timeframe.
          </h4>
          <p className="text-[11px] font-mono text-txt-muted">
            Replay at <span className="text-txt-secondary font-semibold">{formatDataRangeDate(replayCurrentTimestamp)}</span> · {formatTimeframeDisplay(timeframe)} starts <span className="text-txt-secondary font-semibold">{formatDataRangeDate(firstAvailableTimestamp)}</span>
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
          {/* Action 1: Shift to Available Data */}
          <button
            type="button"
            onClick={() => onShiftToAvailableData(slotIndex)}
            className="h-8 px-3 rounded-lg bg-accent text-txt-inverse hover:bg-accent-hover text-xs font-semibold shadow-md shadow-accent/20 transition-all flex items-center gap-1.5 cursor-pointer"
            title={`Shift replay to the first available candle of ${formatTimeframeDisplay(timeframe)}`}
          >
            <ChevronsRight className="w-3.5 h-3.5" />
            <span>Shift to Available Data</span>
          </button>

          {/* Action 2: Alternative Timeframe Button (if available) */}
          {higherTf && (
            <button
              type="button"
              onClick={() => onMoveToTimeframe(higherTf)}
              className="h-8 px-3 rounded-lg bg-surface-elevated border border-border-def hover:border-accent text-txt-primary hover:text-accent text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              title={`Switch to ${formatTimeframeDisplay(higherTf)} where data is available for this replay timestamp`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Move Replay to {formatTimeframeDisplay(higherTf)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
