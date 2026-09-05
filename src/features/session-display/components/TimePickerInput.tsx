import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';

interface TimePickerInputProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

// 96 15-minute intervals across 24 hours (00:00 to 23:45)
const TIME_INTERVALS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hh = h.toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    TIME_INTERVALS.push(`${hh}:${mm}`);
  }
}

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'HH:mm',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Keep local input buffer in sync if parent prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Calculate coordinates for portal placement
  const updateCoords = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownHeight = 224; // 14rem (max-h-56)
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setCoords({
      left: rect.left,
      top: openUp ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      width: Math.max(rect.width, 100),
    });
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    updateCoords();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Scroll to active item when dropdown opens
  useEffect(() => {
    if (isOpen) {
      updateCoords();
      requestAnimationFrame(() => {
        if (selectedItemRef.current) {
          selectedItemRef.current.scrollIntoView({ block: 'nearest' });
        }
      });
    }
  }, [isOpen, updateCoords]);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      handleClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const handleScrollOrResize = () => {
      handleClose();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  // Handle typing inside text field
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setInputValue(nextVal);
    // If user typed a full valid 24h HH:mm format, propagate to parent immediately
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(nextVal)) {
      onChange(nextVal);
    }
  };

  const handleBlur = () => {
    const trimmed = inputValue.trim();
    // Auto-normalize single digit hour e.g. "9:00" -> "09:00"
    const singleHourMatch = /^(\d):([0-5]\d)$/.exec(trimmed);
    if (singleHourMatch) {
      const formatted = `0${singleHourMatch[1]}:${singleHourMatch[2]}`;
      setInputValue(formatted);
      onChange(formatted);
      return;
    }

    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) {
      onChange(trimmed);
    } else {
      // Revert to valid prop value if invalid
      setInputValue(value);
    }
  };

  // Find closest interval to highlight if exact match not found (e.g. for custom "03:01" -> "03:00")
  const getSelectedOrClosest = () => {
    if (TIME_INTERVALS.includes(value)) return value;
    const [vh, vm] = value.split(':').map(Number);
    if (isNaN(vh) || isNaN(vm)) return TIME_INTERVALS[0];
    const totalMinutes = vh * 60 + vm;
    let closest = TIME_INTERVALS[0];
    let minDiff = Infinity;
    for (const t of TIME_INTERVALS) {
      const [h, m] = t.split(':').map(Number);
      const diff = Math.abs(h * 60 + m - totalMinutes);
      if (diff < minDiff) {
        minDiff = diff;
        closest = t;
      }
    }
    return closest;
  };

  const activeHighlightedTime = getSelectedOrClosest();

  return (
    <>
      <div
        ref={containerRef}
        className={`relative flex items-center justify-between rounded-md border transition-all ${
          isOpen
            ? 'border-accent ring-1 ring-accent bg-app-bg'
            : 'border-border-def bg-app-bg hover:border-txt-muted'
        } ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''} ${className}`}
      >
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onClick={handleOpen}
          onFocus={handleOpen}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleBlur();
              handleClose();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              handleOpen();
            }
          }}
          maxLength={5}
          placeholder={placeholder}
          className="w-full px-2 py-1 text-xs font-mono font-medium bg-transparent text-txt-primary outline-none select-text"
          title="Type 24h time or click clock for dropdown"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (isOpen) {
              handleClose();
            } else {
              handleOpen();
            }
          }}
          className="p-1 pr-1.5 text-txt-muted hover:text-txt-primary transition-colors cursor-pointer flex-shrink-0"
          title="Select time from dropdown"
        >
          <Clock className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dropdown Menu via Portal */}
      {isOpen && coords && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 9999,
          }}
          className="max-h-56 overflow-y-auto bg-[#1e222d] border border-border-def rounded-md shadow-2xl py-1 select-none scrollbar-thin animate-in fade-in zoom-in-95 duration-100"
        >
          {TIME_INTERVALS.map((time) => {
            const isMatch = time === value || (time === activeHighlightedTime && !TIME_INTERVALS.includes(value));
            return (
              <button
                key={time}
                ref={isMatch ? selectedItemRef : undefined}
                type="button"
                onClick={() => {
                  setInputValue(time);
                  onChange(time);
                  handleClose();
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer flex items-center ${
                  isMatch
                    ? 'bg-[#e0e3eb] text-[#131722] font-bold'
                    : 'text-txt-primary hover:bg-surface-hover'
                }`}
              >
                {time}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};
