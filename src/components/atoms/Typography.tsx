import React from 'react';

export interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
}

export function Heading({ level, children, className = '' }: HeadingProps) {
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
  return React.createElement(Tag, { className }, children);
}

export interface TextProps {
  variant?: 'body' | 'muted' | 'small' | 'label';
  children: React.ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

export function Text({ variant = 'body', children, className = '', as = 'span' }: TextProps) {
  const variantClass = variant === 'body' ? '' : variant;
  const fullClassName = [variantClass, className].filter(Boolean).join(' ');

  return React.createElement(as, { className: fullClassName }, children);
}

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const badgeClass = variant === 'default' ? 'badge' : `${variant}-badge`;
  const fullClassName = [badgeClass, className].filter(Boolean).join(' ');

  return <span className={fullClassName}>{children}</span>;
}
