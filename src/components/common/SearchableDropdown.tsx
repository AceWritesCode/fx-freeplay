import React, { useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

export interface SearchableDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  onDeleteOption: (opt: string) => void;
  placeholder?: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  value,
  onChange,
  options,
  onDeleteOption,
  placeholder,
  isOpen,
  setIsOpen,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const filtered = options.filter(opt => 
    opt.toLowerCase().includes(value.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        className="w-full bg-app-bg border border-border-def hover:border-border-focus focus:border-border-focus rounded-lg px-3 py-1.5 text-xs text-txt-primary outline-none transition-colors pr-8 h-8"
      />
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-txt-muted hover:text-txt-primary p-1"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-lg shadow-2xl z-[60] max-h-40 overflow-y-auto py-1">
          {filtered.map(opt => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className="group flex justify-between items-center px-3 py-1.5 hover:bg-surface-hover text-txt-secondary hover:text-txt-primary text-xs cursor-pointer"
            >
              <span className="truncate">{opt}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteOption(opt);
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-red-500/25 p-1 rounded transition-all text-red-400 hover:text-red-300"
                title="Delete option"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
