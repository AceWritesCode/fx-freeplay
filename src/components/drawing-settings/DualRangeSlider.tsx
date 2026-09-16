import React from 'react';

export interface DualRangeSliderProps {
  min: number;
  max: number;
  maxLimit: number;
  disabled: boolean;
  onChange: (min: number, max: number) => void;
}

// Reusable Dual Range Slider Component
export const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min,
  max,
  maxLimit,
  disabled,
  onChange
}) => {
  const minPercent = (min / maxLimit) * 100;
  const maxPercent = (max / maxLimit) * 100;

  return (
    <div className={`relative w-[70px] h-5 flex items-center ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      {/* Super-imposed Range Sliders Styling */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-range-slider {
          -webkit-appearance: none;
          width: 100%;
          background: transparent;
          position: absolute;
          left: 0;
          pointer-events: none;
          outline: none;
          height: 6px;
        }
        .custom-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          pointer-events: auto;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid var(--accent-primary, #6366f1);
          cursor: pointer;
          transition: transform 0.1s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }
        .custom-range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .custom-range-slider::-webkit-slider-thumb:active {
          transform: scale(1.3);
          background: var(--accent-primary, #6366f1);
        }
      `}} />

      {/* Slider Track */}
      <div className="w-full h-1 bg-border-sub border border-border-def rounded-full relative">
        {/* Indigo highlighted range */}
        <div 
          className="absolute h-full bg-accent rounded-full"
          style={{ 
            left: `${minPercent}%`, 
            width: `${maxPercent - minPercent}%` 
          }}
        />
      </div>
      
      {/* Super-imposed range inputs */}
      <input
        type="range"
        min={1}
        max={maxLimit}
        value={min}
        disabled={disabled}
        onChange={(e) => {
          const val = Math.min(parseInt(e.target.value) || 1, max);
          onChange(val, max);
        }}
        className="custom-range-slider z-20"
      />
      <input
        type="range"
        min={1}
        max={maxLimit}
        value={max}
        disabled={disabled}
        onChange={(e) => {
          const val = Math.max(parseInt(e.target.value) || 1, min);
          onChange(min, val);
        }}
        className="custom-range-slider z-20"
      />
    </div>
  );
};
