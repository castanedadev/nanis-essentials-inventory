import React from 'react';
import { SearchInput } from '../atoms/Input';
import { SortSelect } from '../atoms/Select';
import { Text } from '../atoms/Typography';
import { Button } from '../atoms/Button';

export type SortOption = string;

interface SearchFiltersProps {
  searchQuery: string;
  onSearchChange: (_query: string) => void;
  sortBy: SortOption;
  onSortChange: (_sort: SortOption) => void;
  sortOptions: Array<{ value: string; label: string; disabled?: boolean }>;
  totalCount: number;
  filteredCount: number;
  placeholder?: string;
  testId?: string;
  categoryFilter?: string;
  onCategoryChange?: (_category: string) => void;
  categoryOptions?: Array<{ value: string; label: string; disabled?: boolean }>;
}

export function SearchFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  sortOptions,
  totalCount,
  filteredCount,
  placeholder = 'Search items',
  testId = 'search-filters',
  categoryFilter,
  onCategoryChange,
  categoryOptions,
}: SearchFiltersProps) {
  const hasQuery = searchQuery.trim().length > 0;
  const hasCategoryFilter = categoryFilter && categoryFilter !== '';

  return (
    <div className="filters-container" data-testid={testId}>
      <div className="filters-row">
        <SearchInput
          placeholder={placeholder}
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
          showClearButton={!!searchQuery}
          data-testid={`${testId}-search`}
        />

        <SortSelect
          value={sortBy}
          onChange={e => onSortChange(e.target.value || '')}
          options={sortOptions}
          data-testid={`${testId}-sort`}
        />
      </div>

      {categoryOptions && onCategoryChange && (
        <div className="date-filters" data-testid={`${testId}-category`}>
          <div className="filter-buttons">
            {categoryOptions.map(option => {
              const isActive = (categoryFilter || '') === option.value;
              return (
                <Button
                  key={option.value}
                  variant={isActive ? 'primary' : 'secondary'}
                  onClick={() => onCategoryChange(option.value)}
                  className="filter-button"
                  data-testid={`${testId}-category-${option.value || 'all'}`}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div className="results-info-modern" data-testid={`${testId}-results-info`}>
        {hasQuery || hasCategoryFilter ? (
          <Text variant="small">
            {filteredCount} of {totalCount} items found
          </Text>
        ) : (
          <Text variant="small">
            Showing {filteredCount} of {totalCount} items
          </Text>
        )}
      </div>
    </div>
  );
}
