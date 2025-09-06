import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'icon';
  children: React.ReactNode;
}

export function Button({ variant = 'secondary', className = '', children, ...props }: ButtonProps) {
  const baseClass = 'btn';
  const variantClass = variant === 'secondary' ? '' : variant;
  const fullClassName = [baseClass, variantClass, className].filter(Boolean).join(' ');

  return (
    <button className={fullClassName} {...props}>
      {children}
    </button>
  );
}
