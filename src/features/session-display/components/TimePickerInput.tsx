import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';

interface TimePickerInputProps {
  value: string; // Canonical "HH:mm" in 24-hour format
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  timeFormat?: '12h' | '24h';
}

// 96 immutable 15-minute intervals across 24 hours (00:00 to 23:45)
export const TIME_INTERVALS: string[] = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
});

// Converts canonical "18:00" to "06:00 PM"
export function to12Hour(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

// Converts "06:00 PM", "6:00 pm", "18:00", or "9:00" to canonical "18:00"
export function to24Hour(timeStr: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();

  // 12-hour match: "06:00 PM", "6:00pm", "12:15 AM", "3:01am"
  const match12 = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(trimmed);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const period = match12[3].toLowerCase();
    if (period === 'pm' && h < 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  }

  // 24-hour match: "18:00", "03:01", "9:00"
  const match24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  }

  return timeStr;
}

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder,
  timeFormat = '24h',
}) => {
  const is12Hour = timeFormat === '12h';

  const formatDisplayTime = useCallback((canonical24: string) => {
    return is12Hour ? to12Hour(canonical24) : canonical24;
  }, [is12Hour]);

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(() => formatDisplayTime(value));
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Keep local input buffer in sync if value or timeFormat changes
  useEffect(() => {
    setInputValue(formatDisplayTime(value));
  }, [value, formatDisplayTime]);

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
      width: Math.max(rect.width, is12Hour ? 115 : 100),
    });
  }, [is12Hour]);

  const handleOpen = () => {
    if (disabled) return;
    updateCoords();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Scroll to active item when dropdown opens directly via container scrollTop (no window scroll events)
  useEffect(() => {
    if (isOpen) {
      if (dropdownRef.current && selectedItemRef.current) {
        const container = dropdownRef.current;
        const item = selectedItemRef.current;
        container.scrollTop = Math.max(0, item.offsetTop - container.clientHeight / 2 + item.offsetHeight / 2);
      }
    }
  }, [isOpen]);

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

    const handleScrollOrResize = (e: Event) => {
      // Never close dropdown when scrolling inside the dropdown list itself
      if (e.target && dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
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
    const canonical = to24Hour(nextVal);
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(canonical)) {
      onChange(canonical);
    }
  };

  const handleBlur = () => {
    const trimmed = inputValue.trim();
    const canonical = to24Hour(trimmed);

    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(canonical)) {
      onChange(canonical);
      setInputValue(formatDisplayTime(canonical));
    } else {
      // Revert to valid prop value if invalid
      setInputValue(formatDisplayTime(value));
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
  const activePlaceholder = placeholder || (is12Hour ? 'hh:mm AM' : 'HH:mm');

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
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleBlur();
              handleClose();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              handleOpen();
            }
          }}
          maxLength={is12Hour ? 8 : 5}
          placeholder={activePlaceholder}
          className="w-full px-2 py-1 text-xs font-mono font-medium bg-transparent text-txt-primary outline-none select-text"
          title={`Type time (${activePlaceholder}) or click clock for dropdown`}
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
          {TIME_INTERVALS.map((canonicalTime) => {
            const isMatch = canonicalTime === value || (canonicalTime === activeHighlightedTime && !TIME_INTERVALS.includes(value));
            const displayLabel = is12Hour ? to12Hour(canonicalTime) : canonicalTime;

            return (
              <button
                key={canonicalTime}
                ref={isMatch ? selectedItemRef : undefined}
                type="button"
                onClick={() => {
                  onChange(canonicalTime);
                  setInputValue(formatDisplayTime(canonicalTime));
                  handleClose();
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer flex items-center ${
                  isMatch
                    ? 'bg-[#e0e3eb] text-[#131722] font-bold'
                    : 'text-txt-primary hover:bg-surface-hover'
                }`}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};
