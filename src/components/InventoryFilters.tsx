import React from 'react';

export type InventorySortOption =
  | 'inStock'
  | 'nameAsc'
  | 'nameDesc'
  | 'minPriceAsc'
  | 'minPriceDesc';

export function InventoryFilters({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  totalCount,
  filteredCount,
}: {
  searchQuery: string;
  setSearchQuery: (_q: string) => void;
  sortBy: InventorySortOption;
  setSortBy: (_s: InventorySortOption) => void;
  totalCount: number;
  filteredCount: number;
}) {
  const hasQuery = searchQuery.trim().length > 0;

  return (
    <div className="filters-container" data-testid="inventory-filters">
      <div className="filters-row">
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
          <input
            type="text"
            placeholder="Search items"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input-modern"
            data-testid="inventory-search"
          />
          {searchQuery && (
            <button
              className="search-clear-modern"
              onClick={() => setSearchQuery('')}
              title="Clear search"
              data-testid="search-clear"
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

        <div className="sort-wrapper">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as InventorySortOption)}
            className="sort-select-modern"
            data-testid="inventory-sort-select"
          >
            <option value="" disabled>
              Sort by
            </option>
            <option value="inStock">Stock Level (High → Low)</option>
            <option value="nameAsc">Name (A–Z)</option>
            <option value="nameDesc">Name (Z–A)</option>
            <option value="minPriceAsc">Min Price (Low → High)</option>
            <option value="minPriceDesc">Min Price (High → Low)</option>
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
      </div>

      <div className="results-info-modern" data-testid="search-results-info">
        {hasQuery ? (
          <>
            {filteredCount} of {totalCount} items found
          </>
        ) : (
          <>
            Showing {filteredCount} of {totalCount} items
          </>
        )}
      </div>
    </div>
  );
}
