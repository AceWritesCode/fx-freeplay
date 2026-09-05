import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';
import { TIME_INTERVALS, to12Hour, to24Hour } from '../utils/timeUtils';

interface TimePickerInputProps {
  value: string; // Canonical "HH:mm" in 24-hour format
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  timeFormat?: '12h' | '24h';
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
  const [prevValue, setPrevValue] = useState(value);
  const [prevFormat, setPrevFormat] = useState(timeFormat);
  const [inputValue, setInputValue] = useState(() => formatDisplayTime(value));
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  // Synchronize local input buffer when props change (state adjustment during render)
  if (value !== prevValue || timeFormat !== prevFormat) {
    setPrevValue(value);
    setPrevFormat(timeFormat);
    setInputValue(formatDisplayTime(value));
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

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
          className="max-h-56 overflow-y-auto bg-modal-bg border border-border-def rounded-md shadow-2xl py-1 select-none scrollbar-thin animate-in fade-in zoom-in-95 duration-100"
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
                    ? 'bg-accent-muted text-accent font-bold'
                    : 'text-txt-primary hover:bg-surface-hover hover:text-txt-primary'
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
