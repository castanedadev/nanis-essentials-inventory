import React, { useState, useMemo } from 'react';
import { InventoryForm } from './InventoryForm';
import { InventoryPageTemplate } from '../../templates/InventoryPageTemplate';
import { SortOption } from '../../molecules/SearchFilters';
import { DB, InventoryItem } from '../../../types/models';
import { nowIso } from '../../../lib/utils';

interface InventoryPageProps {
  db: DB;
  persist: (_db: DB) => void;
  onRefresh: () => void;
}

export function InventoryPage({ db, persist }: InventoryPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('inStock');

  const items = db.items;

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase().trim();
    return items.filter(
      item =>
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
    );
  }, [items, searchQuery]);

  const sortedItems = useMemo(() => {
    const copy = [...filteredItems];
    switch (sortBy) {
      case 'nameAsc':
        return copy.sort((a, b) => a.name.localeCompare(b.name));
      case 'nameDesc':
        return copy.sort((a, b) => b.name.localeCompare(a.name));
      case 'minPriceAsc':
        return copy.sort((a, b) => {
          const aVal = a.minPrice ?? Number.POSITIVE_INFINITY;
          const bVal = b.minPrice ?? Number.POSITIVE_INFINITY;
          return aVal - bVal;
        });
      case 'minPriceDesc':
        return copy.sort((a, b) => {
          const aVal = a.minPrice ?? Number.NEGATIVE_INFINITY;
          const bVal = b.minPrice ?? Number.NEGATIVE_INFINITY;
          return bVal - aVal;
        });
      case 'outOfStock':
        return copy.sort((a, b) => {
          const aStock = a.stock ?? 0;
          const bStock = b.stock ?? 0;
          return aStock - bStock;
        });
      case 'inStock':
      default:
        return copy.sort((a, b) => {
          const aStock = a.stock ?? 0;
          const bStock = b.stock ?? 0;
          // Sort by stock level (high to low), which naturally puts out-of-stock (0) at bottom
          if (aStock !== bStock) return bStock - aStock;
          // Tie-breaker by name for stable, predictable order
          return a.name.localeCompare(b.name);
        });
    }
  }, [filteredItems, sortBy]);

  const onDelete = (id: string) => {
    if (!window.confirm('Delete item?')) return;
    persist({ ...db, items: db.items.filter(i => i.id !== id) });
  };

  const handleRecalculatePrices = () => {
    const updatedItems = db.items.map(item => {
      if (!item.costPostShipping) return item;
      const autoMin = Math.ceil(item.costPostShipping + 5);
      const autoMax = Math.ceil(item.costPostShipping + 10);
      return {
        ...item,
        minPrice: autoMin,
        maxPrice: autoMax,
        minRevenue: autoMin - item.costPostShipping,
        maxRevenue: autoMax - item.costPostShipping,
        updatedAt: nowIso(),
      };
    });
    persist({ ...db, items: updatedItems });
  };

  const headerActions = [
    {
      label: '💰 Recalculate Prices',
      onClick: handleRecalculatePrices,
      title: 'Recalculate all item prices using current pricing logic',
      testId: 'recalculate-prices-btn',
    },
    {
      label: '+ Add Item',
      onClick: () => {
        setEditing(null);
        setShowForm(true);
      },
      variant: 'primary' as const,
    },
  ];

  const sortOptions = [
    { value: '', label: 'Sort by', disabled: true },
    { value: 'inStock', label: 'Stock Level (High → Low)' },
    { value: 'outOfStock', label: 'Stock Level (Low → High)' },
    { value: 'nameAsc', label: 'Name (A–Z)' },
    { value: 'nameDesc', label: 'Name (Z–A)' },
    { value: 'minPriceAsc', label: 'Min Price (Low → High)' },
    { value: 'minPriceDesc', label: 'Min Price (High → Low)' },
  ];

  const formContent = showForm ? (
    <InventoryForm
      initial={editing ?? undefined}
      onClose={() => setShowForm(false)}
      onSave={item => {
        const exists = db.items.find(i => i.id === item.id);
        const nextItems = exists
          ? db.items.map(i => (i.id === item.id ? item : i))
          : [...db.items, item];
        persist({ ...db, items: nextItems });
        setShowForm(false);
      }}
    />
  ) : null;

  return (
    <InventoryPageTemplate
      headerActions={headerActions}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sortBy={sortBy}
      onSortChange={setSortBy}
      sortOptions={sortOptions}
      totalCount={items.length}
      filteredCount={filteredItems.length}
      items={sortedItems}
      onEditItem={item => {
        setEditing(item);
        setShowForm(true);
      }}
      onDeleteItem={onDelete}
      showEmptyState={filteredItems.length === 0 && items.length === 0}
      showNoResults={filteredItems.length === 0 && items.length > 0}
      showForm={showForm}
      formTitle={editing ? 'Edit Item' : 'Add New Item'}
      onCloseForm={() => setShowForm(false)}
      formContent={formContent}
    />
  );
}
