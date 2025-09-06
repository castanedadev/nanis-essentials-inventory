import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

export function Select({ label, error, options, className = '', children, ...props }: SelectProps) {
  return (
    <div className="select-group">
      {label && <label htmlFor={props.id}>{label}</label>}
      <div className="select-wrapper">
        <select className={`select ${className}`} {...props}>
          {options.map(option => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
        <div className="select-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </div>
      </div>
      {error && <div className="select-error">{error}</div>}
    </div>
  );
}

export interface SortSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

export function SortSelect({ options, className = '', ...props }: SortSelectProps) {
  return (
    <div className="sort-wrapper">
      <select className={`sort-select-modern ${className}`} {...props}>
        {options.map(option => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="sort-icon">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </div>
    </div>
  );
}
