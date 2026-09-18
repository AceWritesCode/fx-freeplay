import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T = string | number> {
  value: T;
  onChange: (val: T) => void;
  options: (SelectOption<T> | T)[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  placement?: 'bottom' | 'top';
  align?: 'left' | 'right';
  id?: string;
  name?: string;
  title?: string;
}

export function Select<T extends string | number = string>({
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
  className = '',
  menuClassName = '',
  placement = 'bottom',
  align = 'left',
  id,
  title,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Normalize options to SelectOption objects
  const normalizedOptions: SelectOption<T>[] = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt && 'label' in opt) {
      return opt as SelectOption<T>;
    }
    return { value: opt as T, label: String(opt) };
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Auto-scroll to selected option when opened
  useEffect(() => {
    if (isOpen && listRef.current && selectedRef.current) {
      const container = listRef.current;
      const el = selectedRef.current;
      const offset = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
      container.scrollTop = Math.max(0, offset);
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
  };

  const alignmentClass = align === 'right' ? 'right-0' : 'left-0';
  const placementClass = placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5';

  return (
    <div
      ref={containerRef}
      className="relative inline-block select-none"
      id={id}
      title={title}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`h-8 flex items-center justify-between gap-2 bg-surface hover:bg-surface-hover border rounded-lg px-2.5 text-xs font-medium text-txt-primary transition-all cursor-pointer ${
          isOpen
            ? 'border-accent ring-1 ring-accent text-txt-primary'
            : 'border-border-def hover:border-border-focus text-txt-primary'
        } ${
          disabled ? 'opacity-40 cursor-not-allowed hover:bg-surface hover:border-border-def' : ''
        } ${className}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder || String(value)}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-txt-muted transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-accent' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          ref={listRef}
          className={`absolute ${placementClass} ${alignmentClass} min-w-full bg-surface border border-border-def rounded-xl shadow-2xl z-50 p-1 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-surface-elevated animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
        >
          <div className="flex flex-col gap-0.5">
            {normalizedOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  ref={isSelected ? selectedRef : undefined}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                    opt.disabled
                      ? 'opacity-40 cursor-not-allowed text-txt-muted'
                      : isSelected
                      ? 'bg-accent text-txt-inverse font-semibold shadow-xs'
                      : 'text-txt-secondary hover:text-txt-primary hover:bg-surface-hover'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const Dropdown = Select;
