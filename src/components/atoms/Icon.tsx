import React from 'react';

export interface IconProps {
  name: 'search' | 'clear' | 'sort' | 'refresh' | 'close' | 'star-filled' | 'star-empty';
  size?: number;
  className?: string;
}

export function Icon({ name, size = 16, className = '' }: IconProps) {
  const getIconPath = () => {
    switch (name) {
      case 'search':
        return (
          <>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </>
        );
      case 'clear':
        return (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        );
      case 'sort':
        return <polyline points="6,9 12,15 18,9" />;
      case 'refresh':
        return (
          <>
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </>
        );
      case 'close':
        return (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        );
      case 'star-filled':
        return '⭐';
      case 'star-empty':
        return '☆';
      default:
        return null;
    }
  };

  if (name === 'star-filled' || name === 'star-empty') {
    return <span className={className}>{getIconPath()}</span>;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      {getIconPath()}
    </svg>
  );
}
