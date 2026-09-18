import React, { forwardRef } from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  wrapperClassName?: string;
  boxClassName?: string;
  labelClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  checked,
  defaultChecked,
  onChange,
  disabled,
  label,
  className = '',
  wrapperClassName = '',
  boxClassName = '',
  labelClassName = '',
  id,
  ...props
}, ref) => {
  const isChecked = Boolean(checked);

  return (
    <label
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none group ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${wrapperClassName}`}
    >
      <div className="relative inline-flex items-center justify-center flex-shrink-0">
        <input
          ref={ref}
          type="checkbox"
          id={id}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div
          className={`w-4 h-4 rounded-[5px] flex items-center justify-center transition-all duration-150 flex-shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-app-bg ${
            isChecked
              ? 'bg-accent border border-accent text-txt-inverse shadow-sm shadow-accent/25'
              : 'bg-surface-elevated border border-border-def group-hover:border-border-focus group-hover:bg-surface-hover'
          } ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          } ${boxClassName}`}
        >
          <svg
            className={`w-2.5 h-2.5 text-txt-inverse transition-all duration-150 ease-out ${
              isChecked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
      {label && (
        <span className={`text-xs font-medium transition-colors ${
          isChecked ? 'text-txt-primary' : 'text-txt-secondary group-hover:text-txt-primary'
        } ${labelClassName}`}>
          {label}
        </span>
      )}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';
