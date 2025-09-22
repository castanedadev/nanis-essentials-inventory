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
    // Recalculate unit costs for all items using weight-based allocation
    const updatedItems = [...db.items];
    const updatedPurchases = [...db.purchases];

    // Process each purchase to recalculate allocations
    db.purchases.forEach((purchase, purchaseIndex) => {
      const { lines, tax, shippingUS, shippingIntl, subtotal } = purchase;

      // Calculate total units and weight for this purchase
      const totalUnits = lines.reduce(
        (acc, l) => acc + l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0),
        0
      );
      const totalWeight = lines.reduce((acc, l) => {
        const item = updatedItems.find(item => item.id === l.itemId);
        const itemWeight = item?.weightLbs ?? 0;
        const lineUnits = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
        return acc + itemWeight * lineUnits;
      }, 0);

      // Recalculate allocations for each line
      const updatedLines = lines.map(l => {
        const item = updatedItems.find(item => item.id === l.itemId);
        const itemWeight = item?.weightLbs ?? 0;
        const lineUnits = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
        const lineWeight = itemWeight * lineUnits;

        // Proportional tax distribution based on unit cost
        const lineCost = l.quantity * l.unitCost;
        const perUnitTax = subtotal > 0 ? (tax * lineCost) / (subtotal * l.quantity) : 0;

        // Equal distribution for US shipping
        const perUnitShippingUS = shippingUS > 0 && totalUnits ? shippingUS / totalUnits : 0;

        // Weight-based distribution for international shipping
        const weightRatio = totalWeight > 0 ? lineWeight / totalWeight : 0;
        const perUnitShippingIntl = lineUnits > 0 ? (shippingIntl * weightRatio) / lineUnits : 0;

        return {
          ...l,
          perUnitTax,
          perUnitShippingUS,
          perUnitShippingIntl,
          unitCostPostShipping: l.unitCost + perUnitTax + perUnitShippingUS + perUnitShippingIntl,
        };
      });

      updatedPurchases[purchaseIndex] = {
        ...purchase,
        lines: updatedLines,
      };

      // Update item costs based on most recent purchase
      updatedLines.forEach(l => {
        const itemIndex = updatedItems.findIndex(item => item.id === l.itemId);
        if (itemIndex !== -1) {
          const costPre = l.unitCost;
          const costPost = l.unitCostPostShipping ?? l.unitCost;
          const autoMin = Math.ceil(costPost * 1.2);
          const autoMax = Math.ceil(costPost * 1.3);

          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            costPreShipping: costPre,
            costPostShipping: costPost,
            minPrice: autoMin,
            maxPrice: autoMax,
            minRevenue: autoMin - costPost,
            maxRevenue: autoMax - costPost,
            updatedAt: nowIso(),
          };
        }
      });
    });

    persist({ ...db, items: updatedItems, purchases: updatedPurchases });
  };

  const headerActions = [
    {
      label: '⚖️ Recalculate Unit Costs',
      onClick: handleRecalculatePrices,
      title:
        'Recalculate all unit costs using weight-based shipping allocation and proportional tax distribution',
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
