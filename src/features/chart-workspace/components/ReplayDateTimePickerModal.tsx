import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Shuffle, FastForward, Calendar, Clock, Minus, Plus } from 'lucide-react';
import type { KLineData } from '@/utils/dataUtils';
import { findCandleIndexByTimestamp } from '@/engine/replay';
import { formatTimeframeDisplay, formatDataRangeDate } from '@/domain/market/timeframeUtils';
import { useSessionDisplayStore, DEFAULT_BUILT_IN_SESSIONS } from '@/features/session-display';

interface ReplayDateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimestamp: number | null;
  allTimeframesData: Record<string, KLineData[]>;
  activeTimeframe: string;
  activeSymbol: string;
  onSelectTimestamp: (timestamp: number) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

const DAYS_OF_WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface TimeUnitControlProps {
  label: string;
  value: number;
  max: number; // 23 for hours, 59 for minutes
  onChange: (val: number) => void;
}

const TimeUnitControl: React.FC<TimeUnitControlProps> = ({
  label,
  value,
  max,
  onChange,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [text, setText] = useState(() => String(value).padStart(2, '0'));

  // Sync internal text buffer when value changes externally while not focused
  useEffect(() => {
    if (!isFocused) {
      setText(String(value).padStart(2, '0'));
    }
  }, [value, isFocused]);

  const handleDecrement = () => {
    const next = value <= 0 ? max : value - 1;
    onChange(next);
    setText(String(next).padStart(2, '0'));
  };

  const handleIncrement = () => {
    const next = value >= max ? 0 : value + 1;
    onChange(next);
    setText(String(next).padStart(2, '0'));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) {
      handleIncrement();
    } else if (e.deltaY > 0) {
      handleDecrement();
    }
  };

  const commitValue = (inputStr: string) => {
    const num = parseInt(inputStr, 10);
    const finalVal = isNaN(num) ? 0 : Math.max(0, Math.min(max, num));
    onChange(finalVal);
    setText(String(finalVal).padStart(2, '0'));
  };

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-wider text-txt-muted px-0.5">{label}</div>
      <div
        onWheel={handleWheel}
        className="flex items-center justify-between bg-surface-elevated border border-border-sub hover:border-border-def focus-within:border-accent rounded-lg p-1 transition-colors"
      >
        <button
          type="button"
          onClick={handleDecrement}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-app-bg hover:bg-surface-hover text-txt-muted hover:text-txt-primary active:scale-95 transition-all cursor-pointer border border-border-sub/40 shadow-xs"
          title={`Decrement ${label.toLowerCase()}`}
          aria-label={`Decrement ${label.toLowerCase()}`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <input
          type="text"
          inputMode="numeric"
          value={isFocused ? text : String(value).padStart(2, '0')}
          onFocus={(e) => {
            setIsFocused(true);
            setText(String(value).padStart(2, '0'));
            e.target.select();
          }}
          onBlur={(e) => {
            setIsFocused(false);
            commitValue(e.target.value);
          }}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
            setText(raw);
            if (raw !== '') {
              const num = parseInt(raw, 10);
              if (!isNaN(num)) {
                onChange(Math.max(0, Math.min(max, num)));
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              handleIncrement();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              handleDecrement();
            } else if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-12 text-center font-mono text-xs font-bold text-txt-primary bg-transparent focus:outline-hidden tracking-wider cursor-text select-text"
          aria-label={label}
        />

        <button
          type="button"
          onClick={handleIncrement}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-app-bg hover:bg-surface-hover text-txt-muted hover:text-txt-primary active:scale-95 transition-all cursor-pointer border border-border-sub/40 shadow-xs"
          title={`Increment ${label.toLowerCase()}`}
          aria-label={`Increment ${label.toLowerCase()}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const getAnchorCoords = (anchor: HTMLElement | null) => {
  if (anchor) {
    const rect = anchor.getBoundingClientRect();
    const width = 330;
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
    const bottom = Math.max(60, window.innerHeight - rect.top + 16);
    return { bottom, left };
  }
  if (typeof window !== 'undefined') {
    return { bottom: 60, left: Math.max(12, window.innerWidth / 2 - 165) };
  }
  return { bottom: 60, left: 12 };
};

export const ReplayDateTimePickerModal: React.FC<ReplayDateTimePickerModalProps> = ({
  isOpen,
  onClose,
  currentTimestamp,
  allTimeframesData,
  activeTimeframe,
  activeSymbol,
  onSelectTimestamp,
  anchorRef,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ bottom: number; left: number }>(() => 
    getAnchorCoords(anchorRef?.current ?? null)
  );

  const updatePosition = useCallback(() => {
    setCoords(getAnchorCoords(anchorRef?.current ?? null));
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isOpen, updatePosition]);

  // Close on Escape key or outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        (!anchorRef?.current || !anchorRef.current.contains(target))
      ) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);
  const fullData = useMemo(() => {
    return allTimeframesData?.[activeTimeframe] || [];
  }, [allTimeframesData, activeTimeframe]);

  const minTimestamp = fullData[0]?.timestamp ?? null;
  const maxTimestamp = fullData[fullData.length - 1]?.timestamp ?? null;

  const sessionSettings = useSessionDisplayStore((state) => state.settings);

  const availableSessions = useMemo(() => {
    const sessions: Array<{ id: string; name: string; startTime: string }> = [];
    const builtIns = sessionSettings?.builtInSessions || DEFAULT_BUILT_IN_SESSIONS;

    // Determine built-in sessions to show: enabled ones, or fallback to Asia, London, New York
    const enabledBuiltIns = Object.values(builtIns).filter((s) => s.enabled);
    const targetBuiltIns = enabledBuiltIns.length > 0
      ? enabledBuiltIns
      : [builtIns.asia, builtIns.london, builtIns.newYork].filter(Boolean);

    for (const s of targetBuiltIns) {
      if (s && s.startTime) {
        sessions.push({
          id: s.id,
          name: s.name,
          startTime: s.startTime,
        });
      }
    }

    // Also include any custom sessions that are enabled
    if (sessionSettings?.customSessions) {
      for (const cs of sessionSettings.customSessions) {
        if (cs.enabled && cs.startTime) {
          sessions.push({
            id: cs.id,
            name: cs.name,
            startTime: cs.startTime,
          });
        }
      }
    }

    return sessions;
  }, [sessionSettings]);

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (currentTimestamp && !isNaN(currentTimestamp)) {
      return new Date(currentTimestamp);
    }
    if (minTimestamp) {
      return new Date(minTimestamp);
    }
    return new Date();
  });

  const [viewYear, setViewYear] = useState<number>(() => selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => selectedDate.getMonth());
  const [hour, setHour] = useState<number>(() => selectedDate.getHours());
  const [minute, setMinute] = useState<number>(() => selectedDate.getMinutes());

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialDate = (currentTimestamp && !isNaN(currentTimestamp))
        ? new Date(currentTimestamp)
        : (minTimestamp ? new Date(minTimestamp) : new Date());
      setSelectedDate(initialDate);
      setViewYear(initialDate.getFullYear());
      setViewMonth(initialDate.getMonth());
      setHour(initialDate.getHours());
      setMinute(initialDate.getMinutes());
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Immediate timestamp calculation & dispatcher
  const applyTimestampChange = (date: Date, h: number, m: number) => {
    if (fullData.length === 0) return;
    const targetDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      h,
      m,
      0
    );
    const targetTimestamp = targetDate.getTime();
    const candleIdx = findCandleIndexByTimestamp(fullData, targetTimestamp);
    const resolvedTimestamp = candleIdx !== -1 ? fullData[candleIdx].timestamp : fullData[0].timestamp;
    onSelectTimestamp(resolvedTimestamp);
  };

  // Calendar matrix computation
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
  
  // Monday = 0, Sunday = 6
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  const daysInMonth = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays: Array<{
    day: number;
    monthOffset: number; // -1 = prev, 0 = current, 1 = next
    date: Date;
    isAvailable: boolean;
    isSelected: boolean;
  }> = [];

  // Previous month padding
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = new Date(viewYear, viewMonth - 1, day);
    const isAvailable = (minTimestamp !== null && maxTimestamp !== null)
      && (date.getTime() + 86400000 >= minTimestamp && date.getTime() <= maxTimestamp + 86400000);
    calendarDays.push({
      day,
      monthOffset: -1,
      date,
      isAvailable,
      isSelected: false,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(viewYear, viewMonth, day);
    const dayStart = new Date(viewYear, viewMonth, day, 0, 0, 0, 0).getTime();
    const dayEnd = new Date(viewYear, viewMonth, day, 23, 59, 59, 999).getTime();
    const isAvailable = (minTimestamp !== null && maxTimestamp !== null)
      && (dayEnd >= minTimestamp && dayStart <= maxTimestamp);
    const isSelected = selectedDate.getFullYear() === viewYear
      && selectedDate.getMonth() === viewMonth
      && selectedDate.getDate() === day;

    calendarDays.push({
      day,
      monthOffset: 0,
      date,
      isAvailable,
      isSelected,
    });
  }

  // Next month padding to fill grid
  const remainingCells = 42 - calendarDays.length;
  for (let day = 1; day <= remainingCells; day++) {
    const date = new Date(viewYear, viewMonth + 1, day);
    const isAvailable = (minTimestamp !== null && maxTimestamp !== null)
      && (date.getTime() + 86400000 >= minTimestamp && date.getTime() <= maxTimestamp + 86400000);
    calendarDays.push({
      day,
      monthOffset: 1,
      date,
      isAvailable,
      isSelected: false,
    });
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDaySelect = (d: Date) => {
    setSelectedDate(d);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    applyTimestampChange(d, hour, minute);
  };

  const handleHourChange = (newHour: number) => {
    setHour(newHour);
    applyTimestampChange(selectedDate, newHour, minute);
  };

  const handleMinuteChange = (newMinute: number) => {
    setMinute(newMinute);
    applyTimestampChange(selectedDate, hour, newMinute);
  };

  const handleRandomDate = () => {
    if (fullData.length === 0) return;
    const randomIndex = Math.floor(Math.random() * fullData.length);
    const candle = fullData[randomIndex];
    if (candle) {
      const d = new Date(candle.timestamp);
      setSelectedDate(d);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setHour(d.getHours());
      setMinute(d.getMinutes());
      onSelectTimestamp(candle.timestamp);
    }
  };

  const handleStartFromFirstData = () => {
    if (fullData.length === 0) return;
    const firstCandle = fullData[0];
    if (firstCandle) {
      const d = new Date(firstCandle.timestamp);
      setSelectedDate(d);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setHour(d.getHours());
      setMinute(d.getMinutes());
      onSelectTimestamp(firstCandle.timestamp);
    }
  };

  const formattedSelectedPreview = `${selectedDate.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return (
    <div 
      ref={popoverRef}
      style={{ position: 'fixed', bottom: `${coords.bottom}px`, left: `${coords.left}px` }}
      className="bg-surface border border-border-def rounded-xl shadow-2xl z-50 w-[330px] overflow-hidden flex flex-col text-txt-secondary select-none animate-in fade-in slide-in-from-bottom-3 duration-200 ease-out origin-bottom"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-def bg-surface-elevated/40">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          <h2 className="text-xs font-bold text-txt-primary">Jump to Replay Date</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-txt-muted hover:text-txt-primary hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Data Range Subheader */}
      <div className="px-4 py-1.5 bg-app-bg/60 border-b border-border-sub/40 text-[10px] flex items-center justify-between text-txt-muted">
        <span className="font-semibold text-txt-secondary">
          {activeSymbol} · {formatTimeframeDisplay(activeTimeframe)}
        </span>
        <span className="truncate max-w-[170px]">
          {minTimestamp && maxTimestamp
            ? `${formatDataRangeDate(minTimestamp).split(' ')[0]} ${formatDataRangeDate(minTimestamp).split(' ')[1]} — ${formatDataRangeDate(maxTimestamp).split(' ')[0]} ${formatDataRangeDate(maxTimestamp).split(' ')[1]}`
            : 'No data'}
        </span>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 p-2.5 bg-surface border-b border-border-sub/40">
        <button
          type="button"
          onClick={handleStartFromFirstData}
          disabled={fullData.length === 0}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-border-sub text-[11px] font-medium text-txt-primary transition-all disabled:opacity-40 cursor-pointer"
          title="Jump to the first available candle"
        >
          <FastForward className="w-3.5 h-3.5 rotate-180 text-accent" />
          <span>Start From First</span>
        </button>

        <button
          type="button"
          onClick={handleRandomDate}
          disabled={fullData.length === 0}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-border-sub text-[11px] font-medium text-txt-primary transition-all disabled:opacity-40 cursor-pointer"
          title="Pick a random date within available data"
        >
          <Shuffle className="w-3.5 h-3.5 text-accent" />
          <span>Random Date</span>
        </button>
      </div>

      {/* Calendar Navigation & Month Picker */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-txt-primary">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-md hover:bg-surface-hover text-txt-muted hover:text-txt-primary transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-md hover:bg-surface-hover text-txt-muted hover:text-txt-primary transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div>
          {/* Weekday Names */}
          <div className="grid grid-cols-7 text-center mb-1 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
            {DAYS_OF_WEEK.map((w) => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {calendarDays.map((item, idx) => {
              const isCurrentMonth = item.monthOffset === 0;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!item.isAvailable}
                  onClick={() => handleDaySelect(item.date)}
                  className={`h-7 w-full flex items-center justify-center rounded-md font-medium text-xs transition-all cursor-pointer ${
                    item.isSelected
                      ? 'bg-accent text-txt-inverse font-bold shadow-xs'
                      : item.isAvailable
                      ? isCurrentMonth
                        ? 'text-txt-primary hover:bg-surface-hover'
                        : 'text-txt-muted/70 hover:bg-surface-hover'
                      : 'text-txt-muted/30 cursor-not-allowed'
                  }`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Picker Controls */}
        <div className="pt-2 border-t border-border-sub/40 space-y-2">
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-1.5 text-txt-muted flex-shrink-0">
              <Clock className="w-3.5 h-3.5 text-accent" />
              <span className="font-semibold text-txt-primary">Time</span>
            </div>

            {/* Session Buttons sourced from Indicator Settings */}
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {availableSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => {
                    const [h, m] = session.startTime.split(':').map(Number);
                    if (!isNaN(h) && !isNaN(m)) {
                      const validH = Math.max(0, Math.min(23, h));
                      const validM = Math.max(0, Math.min(59, m));
                      setHour(validH);
                      setMinute(validM);
                      applyTimestampChange(selectedDate, validH, validM);
                    }
                  }}
                  className="px-2 py-0.5 rounded bg-surface-elevated hover:bg-surface-hover border border-border-sub/40 text-[10px] font-semibold text-txt-secondary hover:text-txt-primary transition-all cursor-pointer shadow-xs active:scale-95"
                  title={`Set to ${session.name} start (${session.startTime})`}
                >
                  {session.name}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Stepper & Editable Controls: Hours and Minutes */}
          <div className="grid grid-cols-2 gap-2">
            <TimeUnitControl
              label="Hours"
              value={hour}
              max={23}
              onChange={handleHourChange}
            />
            <TimeUnitControl
              label="Minutes"
              value={minute}
              max={59}
              onChange={handleMinuteChange}
            />
          </div>
        </div>

        {/* Selected Preview */}
        <div className="py-1 px-2.5 rounded-lg bg-surface-elevated/50 border border-border-sub/30 flex items-center justify-between text-[11px]">
          <span className="text-txt-muted">Target:</span>
          <span className="font-mono font-semibold text-txt-primary">{formattedSelectedPreview}</span>
        </div>
      </div>
    </div>
  );
};
