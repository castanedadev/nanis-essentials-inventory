import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="input-group">
      {label && <label htmlFor={props.id}>{label}</label>}
      <input className={`input ${className}`} {...props} />
      {error && <div className="input-error">{error}</div>}
    </div>
  );
}

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  showClearButton?: boolean;
}

export function SearchInput({
  onClear,
  showClearButton = false,
  className = '',
  ...props
}: SearchInputProps) {
  return (
    <div className="search-input-wrapper">
      <div className="search-icon">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <input className={`search-input-modern ${className}`} {...props} />
      {showClearButton && onClear && (
        <button
          type="button"
          className="search-clear-modern"
          onClick={onClear}
          title="Clear search"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
