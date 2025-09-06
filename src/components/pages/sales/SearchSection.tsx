import React from 'react';
import { SearchInput } from '../../atoms/Input';
import { Text } from '../../atoms/Typography';
import { fmtUSD } from '../../../lib/utils';

interface SearchSectionProps {
  searchQuery: string;
  setSearchQuery: (_query: string) => void;
  summaryStats: {
    totalSales: number;
    totalAmount: number;
    uniqueCustomers: number;
  };
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export function SearchSection({
  searchQuery,
  setSearchQuery,
  summaryStats,
  onExpandAll,
  onCollapseAll,
}: SearchSectionProps) {
  return (
    <div className="filters-container">
      <div className="filters-row">
        <SearchInput
          placeholder="Search by customer, sale id, payment, amount or date..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          showClearButton={!!searchQuery}
        />
        <div className="group-controls">
          <button onClick={onExpandAll}>Expand All</button>
          <button onClick={onCollapseAll}>Collapse All</button>
        </div>
      </div>
      <div className="results-info-modern">
        <Text variant="small">
          {summaryStats.totalSales} sales | {fmtUSD(summaryStats.totalAmount)} |{' '}
          {summaryStats.uniqueCustomers} customers
        </Text>
      </div>
    </div>
  );
}
