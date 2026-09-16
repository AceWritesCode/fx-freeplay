import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface DrawingCoordinatesTabProps {
  points: any[];
  pricePrecision: number;
  onPointChange: (index: number, field: 'price' | 'bar', val: string) => void;
}

export const DrawingCoordinatesTab: React.FC<DrawingCoordinatesTabProps> = ({
  points,
  pricePrecision,
  onPointChange,
}) => {
  const step = 1 / Math.pow(10, pricePrecision);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3.5">
        {points.map((pt, i) => (
          <div key={i} className="flex items-center justify-between min-h-[36px]">
            <span className="text-txt-muted font-medium">#{i + 1} (price, bar)</span>
            <div className="flex gap-2.5 items-center">
              {/* Price Input with Plus/Minus buttons */}
              <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[140px] overflow-hidden focus-within:border-border-focus transition-colors">
                <button
                  type="button"
                  onClick={() => {
                    const currentVal = parseFloat(pt.price) || 0;
                    const newVal = Math.max(0, currentVal - step);
                    onPointChange(i, 'price', newVal.toFixed(pricePrecision));
                  }}
                  className="w-7 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
                  title="Decrease Price"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  step={step}
                  value={pt.price}
                  onChange={(e) => onPointChange(i, 'price', e.target.value)}
                  className="w-[86px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const currentVal = parseFloat(pt.price) || 0;
                    const newVal = currentVal + step;
                    onPointChange(i, 'price', newVal.toFixed(pricePrecision));
                  }}
                  className="w-7 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
                  title="Increase Price"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bar Input with Plus/Minus buttons */}
              <div className="flex items-center bg-app-bg border border-border-def rounded-lg h-8 w-[100px] overflow-hidden focus-within:border-border-focus transition-colors">
                <button
                  type="button"
                  onClick={() => {
                    const currentVal = parseInt(pt.bar) || 0;
                    const newVal = currentVal - 1; // Decreasing coordinate (moves to future)
                    onPointChange(i, 'bar', String(newVal));
                  }}
                  className="w-7 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-r border-border-sub"
                  title="Decrease Bar Value"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  value={pt.bar}
                  onChange={(e) => onPointChange(i, 'bar', e.target.value)}
                  className="w-[46px] text-center bg-transparent border-0 text-txt-primary text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0 font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const currentVal = parseInt(pt.bar) || 0;
                    const newVal = currentVal + 1; // Increasing coordinate (moves to past)
                    onPointChange(i, 'bar', String(newVal));
                  }}
                  className="w-7 h-full flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors border-l border-border-sub"
                  title="Increase Bar Value"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
