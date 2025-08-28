import React from 'react';
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
    <div className="search-section">
      <div className="search-input-container">
        <input
          type="text"
          placeholder="Search by customer, sale id, payment, amount or date..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')} title="Clear search">
            ✕
          </button>
        )}
      </div>
      <div className="row gap">
        <div className="search-results-info">
          {summaryStats.totalSales} sales | {fmtUSD(summaryStats.totalAmount)} |{' '}
          {summaryStats.uniqueCustomers} customers
        </div>
        <div className="group-controls">
          <button onClick={onExpandAll}>Expand All</button>
          <button onClick={onCollapseAll}>Collapse All</button>
        </div>
      </div>
    </div>
  );
}
