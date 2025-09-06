import React from 'react';
import { PageHeader } from '../molecules/PageHeader';
import { SearchFilters, SortOption } from '../molecules/SearchFilters';
import { ItemGrid } from '../organisms/ItemGrid';
import { Modal } from '../molecules/Modal';
import { InventoryItem } from '../../types/models';

interface InventoryPageTemplateProps {
  // Page Header
  headerActions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    title?: string;
    testId?: string;
  }>;

  // Search and Filters
  searchQuery: string;
  onSearchChange: (_query: string) => void;
  sortBy: SortOption;
  onSortChange: (_sort: SortOption) => void;
  sortOptions: Array<{ value: string; label: string; disabled?: boolean }>;
  totalCount: number;
  filteredCount: number;

  // Items Grid
  items: InventoryItem[];
  onEditItem: (_item: InventoryItem) => void;
  onDeleteItem: (_id: string) => void;
  showEmptyState: boolean;
  showNoResults: boolean;

  // Form Modal
  showForm: boolean;
  formTitle: string;
  onCloseForm: () => void;
  formContent: React.ReactNode;
}

export function InventoryPageTemplate({
  headerActions,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  sortOptions,
  totalCount,
  filteredCount,
  items,
  onEditItem,
  onDeleteItem,
  showEmptyState,
  showNoResults,
  showForm,
  formTitle,
  onCloseForm,
  formContent,
}: InventoryPageTemplateProps) {
  return (
    <div className="page">
      <PageHeader title="Inventory Management" actions={headerActions} />

      <SearchFilters
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        sortBy={sortBy}
        onSortChange={onSortChange}
        sortOptions={sortOptions}
        totalCount={totalCount}
        filteredCount={filteredCount}
        placeholder="Search items"
        testId="inventory-filters"
      />

      <ItemGrid
        items={items}
        onEdit={onEditItem}
        onDelete={onDeleteItem}
        showEmptyState={showEmptyState}
        showNoResults={showNoResults}
        testId="inventory-cards"
        columns="two"
      />

      {showForm && (
        <Modal title={formTitle} onClose={onCloseForm}>
          {formContent}
        </Modal>
      )}
    </div>
  );
}
