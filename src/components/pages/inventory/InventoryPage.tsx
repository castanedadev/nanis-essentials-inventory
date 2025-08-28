import React, { useState, useMemo } from 'react';
import { InventoryForm } from './InventoryForm';
import { ItemCardImage } from '../../ItemImageDisplay';
import { InventoryFilters, InventorySortOption } from '../../InventoryFilters';
import { DB, InventoryItem } from '../../../types/models';
import { fmtUSD, nowIso } from '../../../lib/utils';

interface InventoryPageProps {
  db: DB;
  persist: (_db: DB) => void;
  onRefresh: () => void;
}

export function InventoryPage({ db, persist, onRefresh }: InventoryPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<InventorySortOption>('inStock');

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

  return (
    <div className="page">
      <div className="page-header">
        <h2>Inventory Management</h2>
        <div className="row gap">
          <button
            onClick={onRefresh}
            title="Refresh inventory data"
            data-testid="refresh-inventory-btn"
          >
            🔄 Refresh
          </button>
          <button
            onClick={handleRecalculatePrices}
            title="Recalculate all item prices using current pricing logic"
            data-testid="recalculate-prices-btn"
          >
            💰 Recalculate Prices
          </button>
          <button
            className="primary"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            + Add Item
          </button>
        </div>
      </div>

      <InventoryFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        totalCount={items.length}
        filteredCount={filteredItems.length}
      />

      <div className="cards two-cols" data-testid="inventory-cards">
        {sortedItems.map(it => (
          <div
            key={it.id}
            className={`card item-card ${it.stock === 0 ? 'out-of-stock-card' : ''}`}
            data-testid="item-card"
            data-name={it.name}
          >
            <div className="card-row">
              <div className="card-title">{it.name}</div>
              <div className="muted">{new Date(it.createdAt).toLocaleDateString()}</div>
            </div>

            <div className="card-content-with-image">
              <div className="card-image-section">
                <ItemCardImage
                  images={it.images || []}
                  primaryImageId={it.primaryImageId}
                  category={it.category}
                  itemName={it.name}
                />
              </div>

              <div className="card-details-section">
                {/* Category directly under the title to free space for Price Range */}
                <div className="category-inline">
                  <span className="label">Category:</span>
                  <span className="value">{it.category}</span>
                </div>

                {/* Price range on its own full-width row */}
                <div className="item-meta-row price-range-row">
                  <span className="label">Price Range:</span>
                  <span className="value">
                    {fmtUSD(it.minPrice ?? 0)}
                    {'\u00A0-\u00A0'}
                    {fmtUSD(it.maxPrice ?? 0)}
                  </span>
                </div>

                {/* Other meta in two columns */}
                <div className="grid two meta-grid">
                  <div className="item-meta-row">
                    <span className="label">Unit Cost:</span>
                    <span className="value">
                      {fmtUSD(it.costPostShipping ?? it.costPreShipping ?? 0)}
                    </span>
                  </div>
                  <div className="item-meta-row">
                    <span className="label">Stock:</span>
                    <span className="value">
                      {it.stock}
                      {it.stock === 0 && <span className="out-of-stock-badge">out of stock</span>}
                      {it.stock === 1 && <span className="last-item-badge">last item</span>}
                    </span>
                  </div>
                </div>

                {it.description && <div className="muted item-description">{it.description}</div>}
              </div>
            </div>

            <div className="row gap">
              <button
                onClick={() => {
                  setEditing(it);
                  setShowForm(true);
                }}
              >
                Edit
              </button>
              <button className="danger" onClick={() => onDelete(it.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && items.length === 0 && (
          <div className="empty">No items yet.</div>
        )}
        {filteredItems.length === 0 && items.length > 0 && (
          <div className="empty">No items match your search.</div>
        )}
      </div>

      {showForm && (
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
      )}
    </div>
  );
}
