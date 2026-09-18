import React from 'react';
import { DualRangeSlider } from './DualRangeSlider';
import { Checkbox } from '../common';

export interface DrawingVisibilityTabProps {
  visibility: Record<string, any>;
  onVisibilityChange: (unit: string, field: 'show' | 'min' | 'max', val: any) => void;
}

export const DrawingVisibilityTab: React.FC<DrawingVisibilityTabProps> = ({
  visibility,
  onVisibilityChange
}) => {
  return (
    <div className="space-y-4 select-none pr-1">
      {/* Ticks Checkbox */}
      <Checkbox 
        checked={!!visibility.ticks?.show}
        onChange={(e) => onVisibilityChange('ticks', 'show', e.target.checked)}
        label="Ticks" 
        labelClassName="text-[12.5px] font-medium tracking-wide"
        wrapperClassName="py-1.5 w-full"
      />

      {/* Timeframes Rows */}
      {['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'].map(unit => {
        const maxLimit = 
          unit === 'seconds' || unit === 'minutes' ? 59 :
          unit === 'hours' ? 24 :
          unit === 'days' ? 365 :
          unit === 'weeks' ? 52 :
          12; // months

        return (
          <div key={unit} className="flex items-center justify-between min-h-[36px]">
            {/* Left Label + Checkbox */}
            <div className="w-24">
              <Checkbox 
                checked={!!visibility[unit]?.show}
                onChange={(e) => onVisibilityChange(unit, 'show', e.target.checked)}
                label={unit} 
                labelClassName="text-[12.5px] font-medium tracking-wide capitalize"
                wrapperClassName="py-1.5 w-full"
              />
            </div>

            {/* Min / Max Range Controls */}
            <div className="flex gap-2.5 items-center flex-1 justify-end">
              <input 
                type="number" 
                disabled={!visibility[unit]?.show}
                value={visibility[unit]?.min} 
                onChange={(e) => {
                  const val = Math.min(parseInt(e.target.value) || 1, visibility[unit]?.max || 1);
                  onVisibilityChange(unit, 'min', val);
                }}
                className="bg-app-bg disabled:opacity-20 border border-border-def rounded-lg px-1.5 py-1 w-14 text-center text-[12px] text-txt-primary outline-none focus:border-border-focus font-mono transition-colors"
                min={1}
                max={visibility[unit]?.max}
              />
              
              {/* Functional Dual Range Slider */}
              <DualRangeSlider
                min={visibility[unit]?.min || 1}
                max={visibility[unit]?.max || 1}
                maxLimit={maxLimit}
                disabled={!visibility[unit]?.show}
                onChange={(newMin, newMax) => {
                  onVisibilityChange(unit, 'min', newMin);
                  onVisibilityChange(unit, 'max', newMax);
                }}
              />

              <input 
                type="number" 
                disabled={!visibility[unit]?.show}
                value={visibility[unit]?.max} 
                onChange={(e) => {
                  const val = Math.max(parseInt(e.target.value) || 1, visibility[unit]?.min || 1);
                  onVisibilityChange(unit, 'max', val);
                }}
                className="bg-app-bg disabled:opacity-20 border border-border-def rounded-lg px-1.5 py-1 w-14 text-center text-[12px] text-txt-primary outline-none focus:border-border-focus font-mono transition-colors"
                min={visibility[unit]?.min || 1}
                max={maxLimit}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
