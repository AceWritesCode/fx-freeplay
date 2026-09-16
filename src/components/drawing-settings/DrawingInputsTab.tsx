import React from 'react';
import { Minus, Plus } from 'lucide-react';

const getRRPointsIndices = (len: number) => {
  if (len >= 6) {
    return {
      entryIndices: [4, 5],
      profitIndices: [0, 1],
      stopIndices: [2, 3]
    };
  }
  return {
    entryIndices: [0],
    profitIndices: [1],
    stopIndices: [2]
  };
};

export interface DrawingInputsTabProps {
  points: any[];
  overlayName: string;
  pricePrecision: number;
  initialSizePercent: number;
  onPointsChange: React.Dispatch<React.SetStateAction<any[]>>;
  onInitialSizePercentChange: React.Dispatch<React.SetStateAction<number>>;
}

export const DrawingInputsTab: React.FC<DrawingInputsTabProps> = ({
  points,
  overlayName,
  pricePrecision,
  initialSizePercent,
  onPointsChange,
  onInitialSizePercentChange
}) => {
  if (points.length < 3) return null;

  const len = points.length;
  const entryIdx = len >= 6 ? 4 : 0;
  const profitIdx = len >= 6 ? 0 : 1;
  const stopIdx = len >= 6 ? 2 : 2;

  const entryPrice = parseFloat(points[entryIdx].price) || 0;
  const profitPrice = parseFloat(points[profitIdx].price) || 0;
  const stopPrice = parseFloat(points[stopIdx].price) || 0;
  const tickSize = 1 / Math.pow(10, pricePrecision);

  const profitTicks = Math.round(Math.abs(profitPrice - entryPrice) / tickSize);
  const stopTicks = Math.round(Math.abs(entryPrice - stopPrice) / tickSize);

  const handleEntryPriceChange = (val: string) => {
    onPointsChange(prev => {
      if (prev.length < 3) return prev;
      const updated = [...prev];
      const { entryIndices } = getRRPointsIndices(prev.length);
      entryIndices.forEach(idx => {
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], price: val };
        }
      });
      return updated;
    });
  };

  const handleProfitPriceChange = (val: string) => {
    onPointsChange(prev => {
      if (prev.length < 3) return prev;
      const updated = [...prev];
      const { profitIndices } = getRRPointsIndices(prev.length);
      profitIndices.forEach(idx => {
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], price: val };
        }
      });
      return updated;
    });
  };

  const handleProfitTicksChange = (ticks: number) => {
    onPointsChange(prev => {
      if (prev.length < 3) return prev;
      const updated = [...prev];
      const { entryIndices, profitIndices } = getRRPointsIndices(prev.length);
      const entryPrice = parseFloat(updated[entryIndices[0]].price) || 0;
      const isLong = overlayName === 'longPosition';
      const newPrice = isLong ? entryPrice + (ticks * tickSize) : entryPrice - (ticks * tickSize);
      const valStr = newPrice.toFixed(pricePrecision);
      profitIndices.forEach(idx => {
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], price: valStr };
        }
      });
      return updated;
    });
  };

  const handleStopPriceChange = (val: string) => {
    onPointsChange(prev => {
      if (prev.length < 3) return prev;
      const updated = [...prev];
      const { stopIndices } = getRRPointsIndices(prev.length);
      stopIndices.forEach(idx => {
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], price: val };
        }
      });
      return updated;
    });
  };

  const handleStopTicksChange = (ticks: number) => {
    onPointsChange(prev => {
      if (prev.length < 3) return prev;
      const updated = [...prev];
      const { entryIndices, stopIndices } = getRRPointsIndices(prev.length);
      const entryPrice = parseFloat(updated[entryIndices[0]].price) || 0;
      const isLong = overlayName === 'longPosition';
      const newPrice = isLong ? entryPrice - (ticks * tickSize) : entryPrice + (ticks * tickSize);
      const valStr = newPrice.toFixed(pricePrecision);
      stopIndices.forEach(idx => {
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], price: valStr };
        }
      });
      return updated;
    });
  };

  return (
    <div className="space-y-4">
      {/* Entry Price Section */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">Entry Price</span>
        <div className="flex items-center justify-between min-h-[36px]">
          <span className="text-txt-secondary font-medium">Price</span>
          <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[160px] overflow-hidden focus-within:border-border-focus transition-colors">
            <button
              type="button"
              onClick={() => {
                const newVal = Math.max(0, entryPrice - tickSize);
                handleEntryPriceChange(newVal.toFixed(pricePrecision));
              }}
              className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              step={tickSize}
              value={points[entryIdx].price}
              onChange={(e) => handleEntryPriceChange(e.target.value)}
              className="w-[96px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
            />
            <button
              type="button"
              onClick={() => {
                const newVal = entryPrice + tickSize;
                handleEntryPriceChange(newVal.toFixed(pricePrecision));
              }}
              className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-border-sub my-3" />

      {/* Profit Level Section */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-status-success uppercase tracking-wider">Profit Level (Take Profit)</span>
        
        {/* Profit Price Input */}
        <div className="flex items-center justify-between min-h-[36px]">
          <span className="text-txt-secondary font-medium">Price</span>
          <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[160px] overflow-hidden focus-within:border-border-focus transition-colors">
            <button
              type="button"
              onClick={() => {
                const newVal = Math.max(0, profitPrice - tickSize);
                handleProfitPriceChange(newVal.toFixed(pricePrecision));
              }}
              className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              step={tickSize}
              value={points[profitIdx].price}
              onChange={(e) => handleProfitPriceChange(e.target.value)}
              className="w-[96px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
            />
            <button
              type="button"
              onClick={() => {
                const newVal = profitPrice + tickSize;
                handleProfitPriceChange(newVal.toFixed(pricePrecision));
              }}
              className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Profit Ticks Input */}
        <div className="flex items-center justify-between min-h-[36px]">
          <span className="text-txt-secondary font-medium">Ticks / Points</span>
          <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[160px] overflow-hidden focus-within:border-border-focus transition-colors">
            <button
              type="button"
              onClick={() => {
                const newVal = Math.max(0, profitTicks - 1);
                handleProfitTicksChange(newVal);
              }}
              className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              value={profitTicks}
              onChange={(e) => {
                const val = Math.max(0, parseInt(e.target.value) || 0);
                handleProfitTicksChange(val);
              }}
              className="w-[96px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
            />
            <button
              type="button"
              onClick={() => {
                const newVal = profitTicks + 1;
                handleProfitTicksChange(newVal);
              }}
              className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-border-sub my-3" />

      {/* Stop Level Section */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-status-error uppercase tracking-wider">Stop Level (Stop Loss)</span>
        
        {/* Stop Price Input */}
        <div className="flex items-center justify-between min-h-[36px]">
          <span className="text-txt-secondary font-medium">Price</span>
          <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[160px] overflow-hidden focus-within:border-border-focus transition-colors">
            <button
              type="button"
              onClick={() => {
                const newVal = Math.max(0, stopPrice - tickSize);
                handleStopPriceChange(newVal.toFixed(pricePrecision));
              }}
              className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              step={tickSize}
              value={points[stopIdx].price}
              onChange={(e) => handleStopPriceChange(e.target.value)}
              className="w-[96px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
            />
            <button
              type="button"
              onClick={() => {
                const newVal = stopPrice + tickSize;
                handleStopPriceChange(newVal.toFixed(pricePrecision));
              }}
              className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stop Ticks Input */}
        <div className="flex items-center justify-between min-h-[36px]">
          <span className="text-txt-secondary font-medium">Ticks / Points</span>
          <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[160px] overflow-hidden focus-within:border-border-focus transition-colors">
            <button
              type="button"
              onClick={() => {
                const newVal = Math.max(0, stopTicks - 1);
                handleStopTicksChange(newVal);
              }}
              className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              value={stopTicks}
              onChange={(e) => {
                const val = Math.max(0, parseInt(e.target.value) || 0);
                handleStopTicksChange(val);
              }}
              className="w-[96px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
            />
            <button
              type="button"
              onClick={() => {
                const newVal = stopTicks + 1;
                handleStopTicksChange(newVal);
              }}
              className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-border-sub my-3" />

      {/* Initial Sizing Section */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-accent uppercase tracking-wider">Initial Tool Sizing</span>
        <div className="flex items-center justify-between min-h-[36px]">
          <span className="text-txt-secondary font-medium">Initial TP/SL Size (% of Viewport)</span>
          <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[160px] overflow-hidden focus-within:border-border-focus transition-colors">
            <button
              type="button"
              onClick={() => onInitialSizePercentChange(prev => Math.max(1, prev - 1))}
              className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min={1}
              max={50}
              value={initialSizePercent}
              onChange={(e) => {
                const val = Math.max(1, Math.min(50, parseInt(e.target.value) || 18));
                onInitialSizePercentChange(val);
              }}
              className="w-[96px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
            />
            <button
              type="button"
              onClick={() => onInitialSizePercentChange(prev => Math.min(50, prev + 1))}
              className="w-8 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
