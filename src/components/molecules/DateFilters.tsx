import React from 'react';
import { Button } from '../atoms/Button';

export type DateFilterOption = 'current-month' | 'previous-month' | 'overall';

interface DateFiltersProps {
  activeFilter: DateFilterOption;
  onFilterChange: (_filter: DateFilterOption) => void;
}

export function DateFilters({ activeFilter, onFilterChange }: DateFiltersProps) {
  const filters: { key: DateFilterOption; label: string }[] = [
    { key: 'current-month', label: 'Current Month' },
    { key: 'previous-month', label: 'Previous Month' },
    { key: 'overall', label: 'Overall' },
  ];

  return (
    <div className="date-filters">
      <div className="filter-buttons">
        {filters.map(filter => (
          <Button
            key={filter.key}
            variant={activeFilter === filter.key ? 'primary' : 'secondary'}
            onClick={() => onFilterChange(filter.key)}
            className="filter-button"
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
