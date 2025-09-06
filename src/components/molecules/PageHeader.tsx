import React from 'react';
import { Button } from '../atoms/Button';
import { Heading } from '../atoms/Typography';

interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  title?: string;
  testId?: string;
}

interface PageHeaderProps {
  title: string;
  actions?: ActionButton[];
  children?: React.ReactNode;
}

export function PageHeader({ title, actions = [], children }: PageHeaderProps) {
  return (
    <div className="page-header">
      <Heading level={2}>{title}</Heading>
      {(actions.length > 0 || children) && (
        <div className="row gap">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              onClick={action.onClick}
              title={action.title}
              data-testid={action.testId}
            >
              {action.label}
            </Button>
          ))}
          {children}
        </div>
      )}
    </div>
  );
}
