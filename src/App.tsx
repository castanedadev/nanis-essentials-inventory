import React, { useMemo, useState } from 'react';
import './App.css';
import { loadDB, saveDB, exportBackup, importBackup, clearAll } from './lib/storage';
import { fmtUSD, parseNumber, uid, nowIso, isSameMonth } from './lib/utils';
import {
  Category,
  DB,
  DEFAULT_SETTINGS,
  InventoryItem,
  ItemImage,
  PaymentMethod,
  Purchase,
  PurchaseLine,
  Sale,
  SaleLine,
} from './types/models';
import { ImageUpload } from './components/ImageUpload';
import { ItemCardImage } from './components/ItemImageDisplay';
import { InventoryFilters, InventorySortOption } from './components/InventoryFilters';
import { RevenueManager, RevenueSummaryCard } from './components/RevenueManager';
import { RevenueWithdrawals } from './components/RevenueWithdrawals';
import { RevenueService } from './lib/revenueService';

type Tab = 'inventory' | 'purchases' | 'sales' | 'analytics';

const CATEGORIES: Category[] = [
  'Hair Care',
  'Body Care',
  'Makeup',
  'Fragrance',
  'Skin Care',
  'Other',
];

export default function App() {
  const [db, setDb] = useState<DB>(() => loadDB());
  const [tab, setTab] = useState<Tab>('inventory');

  const persist = (next: DB) => {
    setDb(next);
    saveDB(next);
  };

  const onExport = () => {
    const data = exportBackup();
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Cosmetics Backup ${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const onImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        importBackup(text);
        setDb(loadDB());
        window.alert('Backup imported successfully!');
      } catch (error) {
        window.alert(`Import failed: ${error}`);
      }
    };
    input.click();
  };

  const onClear = () => {
    if (!window.confirm('Clear all data? This cannot be undone.')) return;
    clearAll();
    setDb(loadDB());
  };

  return (
    <div className="app">
      <TopBar
        active={tab}
        setActive={setTab}
        onExport={onExport}
        onImport={onImport}
        onClear={onClear}
      />

      {tab === 'inventory' && (
        <InventoryPage db={db} persist={persist} onRefresh={() => setDb(loadDB())} />
      )}
      {tab === 'purchases' && <PurchasesPage db={db} persist={persist} />}
      {tab === 'sales' && <SalesPage db={db} persist={persist} />}
      {tab === 'analytics' && <AnalyticsPage db={db} />}
    </div>
  );
}

function TopBar({
  active,
  setActive,
  onExport,
  onImport,
  onClear,
}: {
  active: Tab;
  setActive: (_t: Tab) => void;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
}) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="title">Nani's Essentials</div>
      </div>
      <div className="tabs">
        <button
          className={active === 'inventory' ? 'tab active' : 'tab'}
          onClick={() => setActive('inventory')}
        >
          Inventory
        </button>
        <button
          className={active === 'purchases' ? 'tab active' : 'tab'}
          onClick={() => setActive('purchases')}
        >
          Purchases
        </button>
        <button
          className={active === 'sales' ? 'tab active' : 'tab'}
          onClick={() => setActive('sales')}
        >
          Sales
        </button>
        <button
          className={active === 'analytics' ? 'tab active' : 'tab'}
          onClick={() => setActive('analytics')}
        >
          Analytics
        </button>
      </div>
      <div className="actions">
        <button onClick={onExport}>Export Backup</button>
        <button onClick={onImport}>Import</button>
        <button className="danger" onClick={onClear}>
          Clear All Data
        </button>
      </div>
    </div>
  );
}

/* ========== Inventory ========== */

function InventoryPage({
  db,
  persist,
  onRefresh,
}: {
  db: DB;
  persist: (_db: DB) => void;
  onRefresh: () => void;
}) {
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
            onClick={() => {
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
            }}
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

function InventoryForm({
  initial,
  onClose,
  onSave,
}: {
  initial?: InventoryItem;
  onClose: () => void;
  onSave: (_it: InventoryItem) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'Other');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [stock, setStock] = useState<number>(initial?.stock ?? 0);
  const [costPostShipping, setCostPostShipping] = useState<number>(initial?.costPostShipping ?? 0);
  const [costPreShipping, setCostPreShipping] = useState<number>(initial?.costPreShipping ?? 0);
  const [compA, setCompA] = useState<number | undefined>(initial?.competitorAPrice);
  const [compB, setCompB] = useState<number | undefined>(initial?.competitorBPrice);
  const [images, setImages] = useState<ItemImage[]>(initial?.images || []);
  const [primaryImageId, setPrimaryImageId] = useState<string | undefined>(initial?.primaryImageId);

  const autoMin = useMemo(() => {
    const raw = (costPostShipping || 0) + 5;
    return Math.ceil(raw);
  }, [costPostShipping]);

  const autoMax = useMemo(() => {
    const raw = (costPostShipping || 0) + 10;
    return Math.ceil(raw);
  }, [costPostShipping]);

  const [minPrice, setMinPrice] = useState<number | undefined>(initial?.minPrice ?? autoMin);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(initial?.maxPrice ?? autoMax);

  // Update min/max prices when cost post-shipping changes
  React.useEffect(() => {
    setMinPrice(autoMin);
    setMaxPrice(autoMax);
  }, [autoMin, autoMax]);

  const minRevenue = (minPrice ?? 0) - (costPostShipping || costPreShipping || 0);
  const maxRevenue = (maxPrice ?? 0) - (costPostShipping || costPreShipping || 0);

  const save = () => {
    if (!name.trim()) {
      alert('Name is required');
      return;
    }
    const item: InventoryItem = {
      id: initial?.id ?? uid(),
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      stock,
      images,
      primaryImageId,
      costPreShipping: costPreShipping || undefined,
      costPostShipping: costPostShipping || undefined,
      minPrice,
      maxPrice,
      competitorAPrice: compA,
      competitorBPrice: compB,
      minRevenue,
      maxRevenue,
      createdAt: initial?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    onSave(item);
  };

  return (
    <Modal title={initial ? 'Edit Item' : 'Add New Item'} onClose={onClose}>
      <div className="form grid two">
        <div>
          <label>Item Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            data-testid="item-name-input"
          />
        </div>
        <div>
          <label>Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as Category)}
            data-testid="item-category-select"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label>Description</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            data-testid="item-description-input"
          />
        </div>

        <div>
          <label>Initial Count</label>
          <input
            type="number"
            value={stock}
            onChange={e => setStock(parseNumber(e.target.value))}
            data-testid="item-stock-input"
          />
        </div>
        <div>
          <label>Total Cost (per unit, post-shipping)</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={costPostShipping}
            onChange={e => setCostPostShipping(parseNumber(e.target.value))}
            data-testid="item-cost-post-shipping-input"
          />
        </div>
        <div>
          <label>Cost (per unit, pre-shipping)</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={costPreShipping}
            onChange={e => setCostPreShipping(parseNumber(e.target.value))}
            data-testid="item-cost-pre-shipping-input"
          />
        </div>

        <div>
          <label>
            Min Price <span className="formula-hint">(Cost + $5.00)</span>
          </label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={minPrice ?? 0}
            onChange={e => setMinPrice(parseNumber(e.target.value))}
            data-testid="item-min-price-input"
          />
        </div>
        <div>
          <label>
            Max Price <span className="formula-hint">(Cost + $10.00)</span>
          </label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={maxPrice ?? 0}
            onChange={e => setMaxPrice(parseNumber(e.target.value))}
            data-testid="item-max-price-input"
          />
        </div>

        <div>
          <label>Competitor A Price (optional)</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={compA ?? ''}
            onChange={e => setCompA(e.target.value ? parseNumber(e.target.value) : undefined)}
          />
        </div>
        <div>
          <label>Competitor B Price (optional)</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={compB ?? ''}
            onChange={e => setCompB(e.target.value ? parseNumber(e.target.value) : undefined)}
          />
        </div>

        <div className="col-span-2">
          <label>Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      <ImageUpload
        images={images}
        onImagesChange={setImages}
        primaryImageId={primaryImageId}
        onPrimaryImageChange={setPrimaryImageId}
      />

      <div className="summary grid two">
        <div>
          <b>Min Revenue:</b> {fmtUSD(minRevenue)}
        </div>
        <div>
          <b>Max Revenue:</b> {fmtUSD(maxRevenue)}
        </div>
      </div>

      <div className="row gap end">
        <button className="primary" onClick={save}>
          {initial ? 'Save Changes' : 'Add Item'}
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ========== Purchases ========== */

function PurchasesPage({ db, persist }: { db: DB; persist: (_db: DB) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);

  const onDelete = (id: string) => {
    if (!window.confirm('Delete purchase?')) return;
    const p = db.purchases.find(x => x.id === id);
    if (p) {
      const nextItems = db.items.map(it => {
        const qty = p.lines
          .filter(l => l.itemId === it.id)
          .reduce((acc, l) => acc + l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0), 0);
        return { ...it, stock: Math.max(0, it.stock - qty) };
      });
      persist({ ...db, items: nextItems, purchases: db.purchases.filter(x => x.id !== id) });
    } else {
      persist({ ...db, purchases: db.purchases.filter(x => x.id !== id) });
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Purchase Management</h2>
        <button
          className="primary"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          + Register Purchase
        </button>
      </div>

      <div className="cards" data-testid="purchase-cards">
        {db.purchases.map(p => (
          <div key={p.id} className="card" data-testid="purchase-card">
            <div className="card-row">
              <div className="card-title">Purchase #{p.id}</div>
              <div className="muted">{new Date(p.createdAt).toLocaleDateString()}</div>
            </div>
            <div className="grid three">
              <div>
                <b>Subtotal:</b> {fmtUSD(p.subtotal)}
              </div>
              <div>
                <b>Tax:</b> {fmtUSD(p.tax)}
              </div>
              <div>
                <b>Total:</b> {fmtUSD(p.totalCost)}
              </div>
              <div>
                <b>Shipping (US):</b> {fmtUSD(p.shippingUS)}
              </div>
              <div>
                <b>Shipping (Intl):</b> {fmtUSD(p.shippingIntl)}
              </div>
              <div>
                <b>Items:</b> {p.totalUnits}
              </div>
            </div>
            <div className="row gap">
              <button
                onClick={() => {
                  setEditing(p);
                  setShowForm(true);
                }}
              >
                Edit
              </button>
              <button className="danger" onClick={() => onDelete(p.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {db.purchases.length === 0 && <div className="empty">No purchases yet.</div>}
      </div>

      {showForm && (
        <PurchaseForm
          db={db}
          initial={editing ?? undefined}
          onClose={() => setShowForm(false)}
          onSave={(purchase, updatedItems, updatedWithdrawals) => {
            const exists = db.purchases.find(p => p.id === purchase.id);
            let itemsWorking = [...db.items];
            if (exists) {
              exists.lines.forEach(l => {
                const units = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
                itemsWorking = itemsWorking.map(it =>
                  it.id === l.itemId ? { ...it, stock: Math.max(0, it.stock - units) } : it
                );
              });
            }
            updatedItems.forEach(ui => {
              const existingIdx = itemsWorking.findIndex(it => it.id === ui.id);
              if (existingIdx >= 0) {
                itemsWorking[existingIdx] = ui;
              } else {
                // New item added during purchase
                itemsWorking.push(ui);
              }
            });
            const nextPurchases = exists
              ? db.purchases.map(p => (p.id === purchase.id ? purchase : p))
              : [...db.purchases, purchase];

            const nextWithdrawals = updatedWithdrawals ?? db.revenueWithdrawals;

            persist({
              ...db,
              items: itemsWorking,
              purchases: nextPurchases,
              revenueWithdrawals: nextWithdrawals,
            });
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

// Helper function to check if purchase line quantities changed
function hasQuantityChanges(oldLines: PurchaseLine[], newLines: PurchaseLine[]): boolean {
  if (oldLines.length !== newLines.length) return true;

  for (let i = 0; i < oldLines.length; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines.find(nl => nl.itemId === oldLine.itemId);

    if (!newLine) return true; // Item was removed/replaced

    const oldUnits = oldLine.quantity + (oldLine.hasSubItems ? (oldLine.subItemsQty ?? 0) : 0);
    const newUnits = newLine.quantity + (newLine.hasSubItems ? (newLine.subItemsQty ?? 0) : 0);

    if (oldUnits !== newUnits) return true;
  }

  return false;
}

function PurchaseForm({
  db,
  initial,
  onClose,
  onSave,
}: {
  db: DB;
  initial?: Purchase;
  onClose: () => void;
  onSave: (
    _purchase: Purchase,
    _updatedItems: InventoryItem[],
    _revenueWithdrawals?: any[]
  ) => void;
}) {
  const [items, setItems] = useState<InventoryItem[]>(db.items);
  const [lines, setLines] = useState<PurchaseLine[]>(
    initial?.lines ?? [
      {
        id: uid(),
        itemId: items[0]?.id ?? '',
        quantity: 1,
        unitCost: 0,
        hasSubItems: false,
        subItemsQty: 0,
      },
    ]
  );
  const [weight, setWeight] = useState<number>(initial?.weightLbs ?? 0);
  const [subtotal, setSubtotal] = useState<number>(initial?.subtotal ?? calcSubtotal(lines));
  const [tax, setTax] = useState<number>(initial?.tax ?? 0);
  const [shipUS, setShipUS] = useState<number>(initial?.shippingUS ?? 0);
  const weightCost = db.settings?.weightCostPerLb ?? DEFAULT_SETTINGS.weightCostPerLb;
  const defaultIntl = weight * weightCost;
  const [shipIntl, setShipIntl] = useState<number>(initial?.shippingIntl ?? defaultIntl);
  const [orderedDate, setOrderedDate] = useState<string>(() => {
    const d = initial?.createdAt ?? nowIso();
    // default to today; if editing and we later set orderedDate, it will be loaded below
    return (initial as any)?.orderedDate ?? d.slice(0, 10);
  });
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    const d = initial?.createdAt ?? nowIso();
    // default to today; if editing and we later set paymentDate, it will be loaded below
    return (initial as any)?.paymentDate ?? d.slice(0, 10);
  });
  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemForLineId, setAddItemForLineId] = useState<string | null>(null);

  // Revenue re-investment state
  const [showRevenueManager, setShowRevenueManager] = useState(false);
  const [revenueToUse, setRevenueToUse] = useState<number>(initial?.revenueUsed ?? 0);
  const [withdrawalReason, setWithdrawalReason] = useState<string>('Business re-investment');
  const [withdrawalNotes, setWithdrawalNotes] = useState<string>('');

  function calcSubtotal(ls: PurchaseLine[]) {
    return ls.reduce((acc, l) => acc + l.quantity * l.unitCost, 0);
  }

  function addLine() {
    setLines([
      ...lines,
      {
        id: uid(),
        itemId: items[0]?.id ?? '',
        quantity: 1,
        unitCost: 0,
        hasSubItems: false,
        subItemsQty: 0,
      },
    ]);
  }

  function deleteLine(lineId: string) {
    if (lines.length > 1) {
      const newLines = lines.filter(l => l.id !== lineId);
      setLines(newLines);
      setSubtotal(calcSubtotal(newLines));
    }
  }

  const onAddItem = (newItem: InventoryItem) => {
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setShowAddItem(false);

    // Update the specific line that triggered the "Add New Item" action
    if (addItemForLineId) {
      setLines(lines.map(l => (l.id === addItemForLineId ? { ...l, itemId: newItem.id } : l)));
      setAddItemForLineId(null);
    }
  };

  function totalUnits(ls = lines) {
    return ls.reduce((acc, l) => acc + l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0), 0);
  }

  function save() {
    if (!lines.length) {
      alert('Add at least one item');
      return;
    }
    if (!lines.every(l => l.itemId)) {
      alert('Select item for all lines');
      return;
    }

    const units = totalUnits();
    const perUnitTax = units ? tax / units : 0;
    const perUnitUS = units ? shipUS / units : 0;
    const perUnitIntl = units ? shipIntl / units : 0;

    const enriched = lines.map(l => ({
      ...l,
      perUnitTax,
      perUnitShippingUS: perUnitUS,
      perUnitShippingIntl: perUnitIntl,
      unitCostPostShipping: l.unitCost + perUnitTax + perUnitUS + perUnitIntl,
    }));

    const totalCost = subtotal + tax + shipUS + shipIntl;

    const p: Purchase = {
      id: initial?.id ?? uid(),
      createdAt: initial?.createdAt ?? nowIso(),
      orderedDate,
      paymentDate,
      lines: enriched,
      subtotal,
      tax,
      shippingUS: shipUS,
      shippingIntl: shipIntl,
      weightLbs: weight,
      totalUnits: units,
      totalCost,
      revenueUsed: revenueToUse,
      paymentSource: RevenueService.calculatePaymentBreakdown(totalCost, revenueToUse)
        .paymentSource,
    };

    let itemsUpdated = [...items];

    // Only update inventory items if this is a new purchase OR if item quantities actually changed
    const shouldUpdateInventory = !initial || hasQuantityChanges(initial.lines, enriched);

    if (shouldUpdateInventory) {
      enriched.forEach(l => {
        const unitsLine = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
        itemsUpdated = itemsUpdated.map(it => {
          if (it.id !== l.itemId) return it;
          const nextStock = (it.stock ?? 0) + unitsLine;
          const costPre = l.unitCost;
          const costPost = l.unitCostPostShipping ?? l.unitCost;
          const autoMin = Math.ceil(costPost + 5);
          const avgComp =
            it.competitorAPrice && it.competitorBPrice
              ? (it.competitorAPrice + it.competitorBPrice) / 2
              : it.maxPrice;
          const nextMax = it.maxPrice ?? avgComp ?? Math.ceil(costPost + 10);
          const nextMinRev = (autoMin ?? 0) - costPost;
          const nextMaxRev = (nextMax ?? 0) - costPost;
          return {
            ...it,
            stock: nextStock,
            costPreShipping: costPre,
            costPostShipping: costPost,
            minPrice: autoMin,
            maxPrice: nextMax,
            minRevenue: nextMinRev,
            maxRevenue: nextMaxRev,
            updatedAt: nowIso(),
          };
        });
      });
    } else {
      // For shipping/tax-only edits, just update cost calculations without changing stock
      enriched.forEach(l => {
        itemsUpdated = itemsUpdated.map(it => {
          if (it.id !== l.itemId) return it;
          const costPre = l.unitCost;
          const costPost = l.unitCostPostShipping ?? l.unitCost;
          const autoMin = Math.ceil(costPost + 5);
          const autoMax = Math.ceil(costPost + 10);
          const nextMinRev = autoMin - costPost;
          const nextMaxRev = autoMax - costPost;
          return {
            ...it,
            costPreShipping: costPre,
            costPostShipping: costPost,
            minPrice: autoMin,
            maxPrice: autoMax,
            minRevenue: nextMinRev,
            maxRevenue: nextMaxRev,
            updatedAt: nowIso(),
          };
        });
      });
    }

    // Process revenue withdrawal if revenue is being used
    try {
      if (revenueToUse > 0) {
        // Create a temporary database with the purchase included for processing
        const exists = db.purchases.find(purchase => purchase.id === p.id);
        const tempPurchases = exists
          ? db.purchases.map(purchase => (purchase.id === p.id ? p : purchase))
          : [...db.purchases, p];

        const result = RevenueService.processPurchaseWithRevenue(
          { ...db, items: itemsUpdated, purchases: tempPurchases },
          p,
          revenueToUse,
          withdrawalReason,
          withdrawalNotes
        );

        // Find the updated purchase from the result
        const updatedPurchase = result.updatedDb.purchases.find(purchase => purchase.id === p.id);
        if (!updatedPurchase) {
          throw new Error('Failed to process purchase with revenue');
        }

        onSave(updatedPurchase, itemsUpdated, result.updatedDb.revenueWithdrawals);
      } else {
        onSave(p, itemsUpdated);
      }
    } catch (error) {
      alert(`Error processing purchase: ${error}`);
      return;
    }
  }

  return (
    <Modal title={initial ? 'Edit Purchase' : 'Register Purchase'} onClose={onClose}>
      <div className="section-title">Purchase Items</div>

      {lines.map((l, idx) => (
        <div key={l.id} className="grid-with-delete" data-testid={`purchase-line-${idx}`}>
          <div className="grid four row-gap">
            <div>
              <label>Select Item</label>
              <div className="item-selector">
                <select
                  value={l.itemId}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === 'ADD_NEW') {
                      setAddItemForLineId(l.id);
                      setShowAddItem(true);
                    } else {
                      setLines(lines.map(x => (x.id === l.id ? { ...x, itemId: v } : x)));
                    }
                  }}
                  data-testid="item-select"
                >
                  <option value="" disabled>
                    Select Item
                  </option>
                  <option
                    value="ADD_NEW"
                    style={{ fontWeight: 'bold', borderTop: '1px solid #ccc' }}
                  >
                    + Add New Item
                  </option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label>Quantity</label>
              <input
                type="number"
                value={l.quantity}
                onChange={e =>
                  setLines(
                    lines.map(x =>
                      x.id === l.id ? { ...x, quantity: parseNumber(e.target.value) } : x
                    )
                  )
                }
                data-testid="quantity-input"
              />
            </div>
            <div>
              <label>Unit Cost</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={l.unitCost}
                onChange={e => {
                  const v = parseNumber(e.target.value);
                  const next = lines.map(x => (x.id === l.id ? { ...x, unitCost: v } : x));
                  setLines(next);
                  setSubtotal(calcSubtotal(next));
                }}
                data-testid="unit-cost-input"
              />
            </div>
            <div className="checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={l.hasSubItems}
                  onChange={e =>
                    setLines(
                      lines.map(x => (x.id === l.id ? { ...x, hasSubItems: e.target.checked } : x))
                    )
                  }
                  data-testid="sub-items-checkbox"
                />
                Sub-items
              </label>
              {l.hasSubItems && (
                <input
                  placeholder="Sub-items qty"
                  value={l.subItemsQty ?? 0}
                  onChange={e =>
                    setLines(
                      lines.map(x =>
                        x.id === l.id ? { ...x, subItemsQty: parseNumber(e.target.value) } : x
                      )
                    )
                  }
                  data-testid="sub-items-quantity-input"
                />
              )}
            </div>

            {idx === lines.length - 1 && (
              <div className="col-span-4">
                <button className="link" onClick={addLine} data-testid="add-purchase-line-btn">
                  + Add Another Item
                </button>
              </div>
            )}
          </div>
          {lines.length > 1 && (
            <button
              type="button"
              className="delete-line-btn"
              onClick={() => deleteLine(l.id)}
              title="Remove item"
              data-testid="delete-line-btn"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      <div className="grid four row-gap">
        <div>
          <label>Ordered Date</label>
          <input
            type="date"
            value={orderedDate}
            onChange={e => setOrderedDate(e.target.value)}
            data-testid="ordered-date-input"
          />
        </div>
        <div>
          <label>Payment Date</label>
          <input
            type="date"
            value={paymentDate}
            onChange={e => setPaymentDate(e.target.value)}
            data-testid="payment-date-input"
          />
        </div>
        <div>
          <label>Subtotal</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={subtotal}
            onChange={e => setSubtotal(parseNumber(e.target.value))}
            data-testid="subtotal-input"
          />
        </div>
        <div>
          <label>Tax</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={tax}
            onChange={e => setTax(parseNumber(e.target.value))}
            data-testid="tax-input"
          />
        </div>
        <div>
          <label>Shipping (US)</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={shipUS}
            onChange={e => setShipUS(parseNumber(e.target.value))}
            data-testid="shipping-us-input"
          />
        </div>
        <div>
          <label>Weight (lbs)</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={weight}
            onChange={e => {
              const v = parseNumber(e.target.value);
              setWeight(v);
              setShipIntl(v * (db.settings?.weightCostPerLb ?? DEFAULT_SETTINGS.weightCostPerLb));
            }}
            data-testid="weight-input"
          />
        </div>
        <div>
          <label>Shipping (International)</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={shipIntl}
            onChange={e => setShipIntl(parseNumber(e.target.value))}
            data-testid="shipping-intl-input"
          />
          <div className="muted tiny">
            Auto: weight × weight cost (
            {fmtUSD(db.settings?.weightCostPerLb ?? DEFAULT_SETTINGS.weightCostPerLb)}/lb)
          </div>
        </div>
        <div className="col-span-4 summary">
          <b>Total Cost:</b> {fmtUSD(subtotal + tax + shipUS + shipIntl)} &nbsp;
          <span className="muted">Items (incl. sub-items): {totalUnits()}</span>
        </div>
      </div>

      {/* Revenue Re-investment Section */}
      <div className="section revenue-section">
        <div className="section-header">
          <h3>Payment & Revenue Re-investment</h3>
          <RevenueSummaryCard db={db} />
        </div>

        {revenueToUse > 0 && (
          <div className="revenue-breakdown">
            <div className="breakdown-info">
              <div className="breakdown-row">
                <span>Total Cost:</span>
                <span>{fmtUSD(subtotal + tax + shipUS + shipIntl)}</span>
              </div>
              <div className="breakdown-row revenue">
                <span>Using Revenue:</span>
                <span className="green">-{fmtUSD(revenueToUse)}</span>
              </div>
              <div className="breakdown-row external">
                <span>External Payment:</span>
                <span className="blue">
                  {fmtUSD(subtotal + tax + shipUS + shipIntl - revenueToUse)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="revenue-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowRevenueManager(true)}
            data-testid="use-revenue-btn"
          >
            {revenueToUse > 0 ? 'Adjust Revenue Usage' : 'Use Revenue for Purchase'}
          </button>
          {revenueToUse > 0 && (
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setRevenueToUse(0);
                setWithdrawalReason('Business re-investment');
                setWithdrawalNotes('');
              }}
              data-testid="clear-revenue-btn"
            >
              Clear Revenue Usage
            </button>
          )}
        </div>
      </div>

      <div className="row gap end">
        <button
          className="primary"
          onClick={save}
          data-testid={initial ? 'update-purchase-btn' : 'register-purchase-btn'}
        >
          {initial ? 'Save Changes' : 'Register Purchase'}
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>

      {showAddItem && (
        <div className="modal-overlay" data-testid="quick-add-overlay">
          <QuickAddItemForm
            onSave={onAddItem}
            onCancel={() => {
              setShowAddItem(false);
              setAddItemForLineId(null);
            }}
          />
        </div>
      )}

      <RevenueManager
        db={db}
        isVisible={showRevenueManager}
        onClose={() => setShowRevenueManager(false)}
        totalCost={subtotal + tax + shipUS + shipIntl}
        onApplyRevenue={(amount, reason, notes) => {
          setRevenueToUse(amount);
          setWithdrawalReason(reason);
          setWithdrawalNotes(notes || '');
        }}
      />
    </Modal>
  );
}

function QuickAddItemForm({
  onSave,
  onCancel,
}: {
  onSave: (_item: InventoryItem) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Other');
  const [description, setDescription] = useState('');

  const save = () => {
    if (!name.trim()) {
      window.alert('Item name is required');
      return;
    }

    const item: InventoryItem = {
      id: uid(),
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      stock: 0, // Will be set by the purchase
      images: [], // No images for quick add
      primaryImageId: undefined,
      costPreShipping: 0, // Will be set by the purchase
      costPostShipping: 0, // Will be set by the purchase
      minPrice: 5, // Cost + $5 (will be updated when cost is set)
      maxPrice: 10, // Cost + $10 (will be updated when cost is set)
      minRevenue: 0,
      maxRevenue: 0,
      createdAt: nowIso(),
    };
    onSave(item);
  };

  return (
    <div className="quick-add-form">
      <div className="form-header">
        <h3>Quick Add Item</h3>
        <button className="icon" onClick={onCancel}>
          ✕
        </button>
      </div>

      <div className="form-body grid two">
        <div>
          <label>Item Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter item name"
            autoFocus
            data-testid="quick-add-name-input"
          />
        </div>
        <div>
          <label>Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as Category)}
            data-testid="quick-add-category-select"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label>Description (optional)</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description"
          />
        </div>
      </div>

      <div className="form-footer row gap end">
        <button className="primary" onClick={save} data-testid="quick-add-add-btn">
          Add Item
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ========== Sales ========== */

function SalesPage({ db, persist }: { db: DB; persist: (_db: DB) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const onDelete = (id: string) => {
    if (!window.confirm('Delete sale?')) return;
    const s = db.sales.find(x => x.id === id);
    let itemsWorking = [...db.items];
    if (s) {
      s.lines.forEach(l => {
        itemsWorking = itemsWorking.map(it =>
          it.id === l.itemId ? { ...it, stock: it.stock + l.quantity } : it
        );
      });
    }
    persist({ ...db, items: itemsWorking, sales: db.sales.filter(x => x.id !== id) });
  };

  function matchesSearch(sale: Sale, query: string): boolean {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (sale.buyerName?.toLowerCase().includes(q) ?? false) ||
      sale.id.toLowerCase().includes(q) ||
      sale.paymentMethod.toLowerCase().includes(q) ||
      sale.totalAmount.toString().includes(q) ||
      new Date(sale.createdAt).toLocaleDateString().toLowerCase().includes(q)
    );
  }

  type CustomerGroup = {
    customerName: string;
    key: string;
    sales: Sale[];
    salesCount: number;
    totalAmount: number;
  };

  const groups: CustomerGroup[] = useMemo(() => {
    const map = new Map<string, Sale[]>();
    db.sales
      .filter(s => matchesSearch(s, searchQuery))
      .forEach(s => {
        const name = s.buyerName?.trim() || 'Anonymous';
        if (!map.has(name)) map.set(name, []);
        map.get(name)!.push(s);
      });

    const result: CustomerGroup[] = Array.from(map.entries()).map(([name, sales]) => ({
      customerName: name,
      key: name.toLowerCase(),
      sales: sales.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      salesCount: sales.length,
      totalAmount: sales.reduce((sum, s) => sum + s.totalAmount, 0),
    }));

    // Sort by total spent desc, then name asc
    result.sort(
      (a, b) => b.totalAmount - a.totalAmount || a.customerName.localeCompare(b.customerName)
    );
    return result;
  }, [db.sales, searchQuery]);

  const summaryStats = useMemo(() => {
    const totalSales = groups.reduce((acc, g) => acc + g.salesCount, 0);
    const totalAmount = groups.reduce((acc, g) => acc + g.totalAmount, 0);
    const uniqueCustomers = groups.length;
    return { totalSales, totalAmount, uniqueCustomers };
  }, [groups]);

  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function expandAll() {
    setExpandedGroups(new Set(groups.map(g => g.key)));
  }

  function collapseAll() {
    setExpandedGroups(new Set());
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Sales Management</h2>
        <button
          className="primary"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          + Register Sale
        </button>
      </div>

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
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
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
            <button onClick={expandAll}>Expand All</button>
            <button onClick={collapseAll}>Collapse All</button>
          </div>
        </div>
      </div>

      <div className="cards">
        {groups.map(group => {
          const isExpanded = expandedGroups.has(group.key);
          const initials = group.customerName
            .split(' ')
            .map(p => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          return (
            <div key={group.key} className="card customer-group">
              <div className="customer-group-header" onClick={() => toggleGroup(group.key)}>
                <div className="customer-info">
                  <div className="customer-avatar" aria-hidden>
                    {initials || 'A'}
                  </div>
                  <div>
                    <div className="customer-name">{group.customerName}</div>
                    <div className="customer-stats">
                      {group.salesCount} sale{group.salesCount !== 1 ? 's' : ''} •{' '}
                      {fmtUSD(group.totalAmount)}
                    </div>
                  </div>
                </div>
                <button className="icon" title={isExpanded ? 'Collapse' : 'Expand'}>
                  {isExpanded ? '▾' : '▸'}
                </button>
              </div>
              <div className={`customer-sales-list ${isExpanded ? 'expanded' : ''}`}>
                {group.sales.map(s => {
                  const itemCount = s.lines.reduce((acc, l) => acc + l.quantity, 0);
                  return (
                    <div key={s.id} className="sale-item-grouped">
                      <div className="sale-id">#{s.id}</div>
                      <div className="sale-date">{new Date(s.createdAt).toLocaleDateString()}</div>
                      <div className="sale-payment">{s.paymentMethod}</div>
                      <div className="sale-items">
                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                      </div>
                      <div className="sale-items-list">
                        {s.lines.map(l => {
                          const item = db.items.find(i => i.id === l.itemId);
                          return (
                            <div key={l.id}>
                              {item?.name} ({l.quantity})
                            </div>
                          );
                        })}
                      </div>
                      <div className="sale-total">{fmtUSD(s.totalAmount)}</div>
                      <div className="sale-actions gap">
                        <button
                          onClick={() => {
                            setEditing(s);
                            setShowForm(true);
                          }}
                        >
                          Edit
                        </button>
                        <button className="danger" onClick={() => onDelete(s.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
                {group.sales.length === 0 && (
                  <div className="empty">No sales for this customer.</div>
                )}
              </div>
            </div>
          );
        })}
        {groups.length === 0 && <div className="empty">No sales found.</div>}
      </div>

      {showForm && (
        <SaleForm
          db={db}
          initial={editing ?? undefined}
          onClose={() => setShowForm(false)}
          onSave={(sale, updatedItems) => {
            const exists = db.sales.find(s => s.id === sale.id);
            let itemsWorking = [...db.items];
            if (exists) {
              exists.lines.forEach(l => {
                itemsWorking = itemsWorking.map(it =>
                  it.id === l.itemId ? { ...it, stock: it.stock + l.quantity } : it
                );
              });
            }
            updatedItems.forEach(ui => {
              itemsWorking = itemsWorking.map(it => (it.id === ui.id ? ui : it));
            });
            const nextSales = exists
              ? db.sales.map(s => (s.id === sale.id ? sale : s))
              : [...db.sales, sale];
            persist({ ...db, items: itemsWorking, sales: nextSales });
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function SaleForm({
  db: _db,
  initial,
  onClose,
  onSave,
}: {
  db: DB;
  initial?: Sale;
  onClose: () => void;
  onSave: (_sale: Sale, _updatedItems: InventoryItem[]) => void;
}) {
  const [lines, setLines] = useState<SaleLine[]>(
    initial?.lines ?? [
      {
        id: uid(),
        itemId: _db.items[0]?.id ?? '',
        quantity: 1,
        unitPrice: _db.items[0]?.minPrice ?? 0,
      },
    ]
  );
  const [buyerName, setBuyerName] = useState<string>(initial?.buyerName ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? 'cash'
  );
  const [numberOfPayments, setNumberOfPayments] = useState<number>(
    initial?.installments?.numberOfPayments ?? 2
  );

  // Build unique buyer options from existing sales
  const buyerOptions = useMemo(() => {
    const names = new Set<string>();
    _db.sales.forEach((s: any) => {
      if (s.buyerName) names.add(s.buyerName);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [_db.sales]);

  // Autocomplete state for buyer name
  const [showBuyerSuggestions, setShowBuyerSuggestions] = useState(false);
  const [buyerActiveIndex, setBuyerActiveIndex] = useState(0);
  const filteredBuyerOptions = useMemo(() => {
    const q = buyerName.trim().toLowerCase();
    if (!q) return buyerOptions;
    return buyerOptions.filter(n => n.toLowerCase().includes(q));
  }, [buyerName, buyerOptions]);

  function addLine() {
    setLines([
      ...lines,
      {
        id: uid(),
        itemId: _db.items[0]?.id ?? '',
        quantity: 1,
        unitPrice: _db.items[0]?.minPrice ?? 0,
      },
    ]);
  }

  function deleteLine(lineId: string) {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== lineId));
    }
  }

  const total = lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
  const amountPerPayment =
    paymentMethod === 'installments' && numberOfPayments > 0 ? total / numberOfPayments : 0;

  function save() {
    if (!lines.length) {
      alert('Add at least one item');
      return;
    }
    if (!lines.every(l => l.itemId)) {
      alert('Select item for all lines');
      return;
    }

    const s: Sale = {
      id: initial?.id ?? uid(),
      createdAt: initial?.createdAt ?? nowIso(),
      buyerName: buyerName.trim() || undefined,
      paymentMethod,
      installments:
        paymentMethod === 'installments' ? { numberOfPayments, amountPerPayment } : undefined,
      lines,
      totalAmount: total,
    };

    let itemsUpdated = [..._db.items];
    lines.forEach(l => {
      itemsUpdated = itemsUpdated.map(it => {
        if (it.id !== l.itemId) return it;
        const next = Math.max(0, it.stock - l.quantity);
        return { ...it, stock: next, updatedAt: nowIso() };
      });
    });

    onSave(s, itemsUpdated);
  }

  return (
    <Modal title={initial ? 'Edit Sale' : 'Register Sale'} onClose={onClose}>
      <div className="section-title">Sale Items</div>

      {lines.map((l, idx) => {
        const selectedItem = _db.items.find(i => i.id === l.itemId);
        const priceRange = selectedItem
          ? `${fmtUSD(selectedItem.minPrice ?? 0)} - ${fmtUSD(selectedItem.maxPrice ?? 0)}`
          : '';

        return (
          <div key={l.id} className="grid-with-delete">
            <div className="grid three row-gap">
              <div>
                <label>Select Item</label>
                <select
                  value={l.itemId}
                  onChange={e => {
                    const newItemId = e.target.value;
                    const newItem = _db.items.find(i => i.id === newItemId);
                    const defaultPrice = newItem?.minPrice ?? 0;

                    setLines(
                      lines.map(x =>
                        x.id === l.id
                          ? {
                              ...x,
                              itemId: newItemId,
                              unitPrice: defaultPrice,
                            }
                          : x
                      )
                    );
                  }}
                >
                  <option value="" disabled>
                    Select Item
                  </option>
                  {_db.items.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Quantity</label>
                <input
                  type="number"
                  value={l.quantity}
                  onChange={e =>
                    setLines(
                      lines.map(x =>
                        x.id === l.id ? { ...x, quantity: parseNumber(e.target.value) } : x
                      )
                    )
                  }
                />
              </div>
              <div>
                <label>
                  Unit Price
                  {priceRange && <span className="price-range-inline">Range: {priceRange}</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={l.unitPrice}
                  onChange={e =>
                    setLines(
                      lines.map(x =>
                        x.id === l.id ? { ...x, unitPrice: parseNumber(e.target.value) } : x
                      )
                    )
                  }
                />
              </div>
              {idx === lines.length - 1 && (
                <div className="col-span-3">
                  <button className="link" onClick={addLine}>
                    + Add Another Item
                  </button>
                </div>
              )}
            </div>
            {lines.length > 1 && (
              <button
                type="button"
                className="delete-line-btn"
                onClick={() => deleteLine(l.id)}
                title="Remove item"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}

      <div className="grid three row-gap">
        <div>
          <label>Buyer Name (optional)</label>
          <div className="autocomplete">
            <input
              type="text"
              placeholder="Enter customer name..."
              value={buyerName}
              onFocus={() => setShowBuyerSuggestions(true)}
              onChange={e => {
                setBuyerName(e.target.value);
                setShowBuyerSuggestions(true);
                setBuyerActiveIndex(0);
              }}
              onKeyDown={e => {
                if (!showBuyerSuggestions || filteredBuyerOptions.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setBuyerActiveIndex(i => Math.min(i + 1, filteredBuyerOptions.length - 1));
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setBuyerActiveIndex(i => Math.max(i - 1, 0));
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = filteredBuyerOptions[buyerActiveIndex];
                  if (val) {
                    setBuyerName(val);
                    setShowBuyerSuggestions(false);
                  }
                }
                if (e.key === 'Escape') {
                  setShowBuyerSuggestions(false);
                }
              }}
              onBlur={() => setTimeout(() => setShowBuyerSuggestions(false), 100)}
              autoComplete="off"
            />
            {showBuyerSuggestions && filteredBuyerOptions.length > 0 && (
              <div className="autocomplete-list" role="listbox">
                {filteredBuyerOptions.map((name, idx) => (
                  <div
                    key={name}
                    role="option"
                    aria-selected={buyerActiveIndex === idx}
                    className={`autocomplete-item ${buyerActiveIndex === idx ? 'active' : ''}`}
                    onMouseDown={() => {
                      setBuyerName(name);
                      setShowBuyerSuggestions(false);
                    }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <label>Payment Method</label>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            <option value="cash">Cash</option>
            <option value="transfer">Transfer</option>
            <option value="installments">Installments</option>
          </select>
        </div>
        {paymentMethod === 'installments' && (
          <>
            <div>
              <label># of Payments</label>
              <input
                type="number"
                value={numberOfPayments}
                onChange={e => setNumberOfPayments(parseNumber(e.target.value))}
              />
            </div>
            <div className="summary">
              <b>Amount per payment:</b> {fmtUSD(amountPerPayment)}
            </div>
          </>
        )}
        <div className="col-span-3 summary">
          <b>Total Amount:</b> {fmtUSD(total)}
        </div>
      </div>

      <div className="row gap end">
        <button className="primary" onClick={save}>
          {initial ? 'Save Changes' : 'Register Sale'}
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ========== Analytics ========== */

function AnalyticsPage({ db }: { db: DB }) {
  const mostPopularItem = useMemo(() => {
    const countByItem: Record<string, number> = {};
    db.sales.forEach(s =>
      s.lines.forEach(l => {
        countByItem[l.itemId] = (countByItem[l.itemId] ?? 0) + l.quantity;
      })
    );
    let topId = '';
    let topCount = 0;
    Object.entries(countByItem).forEach(([id, cnt]) => {
      if (cnt > topCount) {
        topCount = cnt;
        topId = id;
      }
    });
    return db.items.find(i => i.id === topId);
  }, [db.sales, db.items]);

  const revenueStats = RevenueService.getRevenueStats(db);

  const mostExpensive = db.items.reduce(
    (a, b) => ((b.maxPrice ?? 0) > (a?.maxPrice ?? 0) ? b : a),
    undefined as InventoryItem | undefined
  );
  const leastExpensive = db.items.reduce(
    (a, b) => ((b.minPrice ?? Infinity) < (a?.minPrice ?? Infinity) ? b : a),
    undefined as InventoryItem | undefined
  );

  const totalSalesOverall = db.sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalSalesThisMonth = db.sales
    .filter(s => isSameMonth(s.createdAt))
    .reduce((acc, s) => acc + s.totalAmount, 0);

  // Payment method summaries
  const salesByMethod = db.sales.reduce(
    (acc, s) => {
      const key = s.paymentMethod;
      if (!acc[key]) acc[key] = { count: 0, amount: 0 } as { count: number; amount: number };
      acc[key].count += 1;
      acc[key].amount += s.totalAmount;
      return acc;
    },
    {} as Record<'cash' | 'transfer' | 'installments', { count: number; amount: number }>
  );

  const totalInvWithShipping = db.items.reduce(
    (acc, it) => acc + (it.costPostShipping ?? it.costPreShipping ?? 0) * it.stock,
    0
  );
  const totalInvWithoutShipping = db.items.reduce(
    (acc, it) => acc + (it.costPreShipping ?? 0) * it.stock,
    0
  );

  return (
    <div className="page">
      <h2>Analytics</h2>

      <div className="cards two-cols">
        <div className="card analytics-item-card" data-testid="most-popular-card">
          <div className="card-title">Most Popular Item</div>
          {mostPopularItem ? (
            <div className="analytics-item-content">
              <div className="analytics-item-image">
                <ItemCardImage
                  images={mostPopularItem.images || []}
                  primaryImageId={mostPopularItem.primaryImageId}
                  category={mostPopularItem.category}
                  itemName={mostPopularItem.name}
                />
              </div>
              <div className="analytics-item-details">
                <div className="analytics-item-name">{mostPopularItem.name}</div>
                <div className="analytics-item-meta">
                  <span className="muted">{mostPopularItem.category}</span>
                </div>
              </div>
            </div>
          ) : (
            <span className="muted">No sales data yet</span>
          )}
        </div>

        <div className="card analytics-item-card" data-testid="most-expensive-card">
          <div className="card-title">Most Expensive Item</div>
          {mostExpensive ? (
            <div className="analytics-item-content">
              <div className="analytics-item-image">
                <ItemCardImage
                  images={mostExpensive.images || []}
                  primaryImageId={mostExpensive.primaryImageId}
                  category={mostExpensive.category}
                  itemName={mostExpensive.name}
                />
              </div>
              <div className="analytics-item-details">
                <div className="analytics-item-name">{mostExpensive.name}</div>
                <div className="analytics-item-meta">
                  <span className="green">{fmtUSD(mostExpensive.maxPrice ?? 0)}</span>
                </div>
              </div>
            </div>
          ) : (
            <span className="muted">N/A</span>
          )}
        </div>

        <div className="card analytics-item-card" data-testid="least-expensive-card">
          <div className="card-title">Less Expensive Item</div>
          {leastExpensive ? (
            <div className="analytics-item-content">
              <div className="analytics-item-image">
                <ItemCardImage
                  images={leastExpensive.images || []}
                  primaryImageId={leastExpensive.primaryImageId}
                  category={leastExpensive.category}
                  itemName={leastExpensive.name}
                />
              </div>
              <div className="analytics-item-details">
                <div className="analytics-item-name">{leastExpensive.name}</div>
                <div className="analytics-item-meta">
                  <span className="blue">{fmtUSD(leastExpensive.minPrice ?? 0)}</span>
                </div>
              </div>
            </div>
          ) : (
            <span className="muted">N/A</span>
          )}
        </div>

        <div className="card" data-testid="total-sales-month-card">
          <div className="card-title">Total Sales (This Month)</div>
          <div className="green">{fmtUSD(totalSalesThisMonth)}</div>
        </div>

        <div className="card" data-testid="total-sales-overall-card">
          <div className="card-title">Total Sales (Overall)</div>
          <div className="green">{fmtUSD(totalSalesOverall)}</div>
        </div>

        <div className="card">
          <div className="card-title">Total Inventory Value (with shipping)</div>
          <div className="blue">{fmtUSD(totalInvWithShipping)}</div>
        </div>

        <div className="card">
          <div className="card-title">Total Inventory Value (without shipping)</div>
          <div className="blue">{fmtUSD(totalInvWithoutShipping)}</div>
        </div>

        {/* Revenue Analytics */}
        <div className="card" data-testid="available-revenue-card">
          <div className="card-title">Available Revenue</div>
          <div className="green">{fmtUSD(revenueStats.availableRevenue)}</div>
        </div>

        <div className="card" data-testid="revenue-reinvested-card">
          <div className="card-title">Revenue Re-invested</div>
          <div className="orange">{fmtUSD(revenueStats.totalWithdrawn)}</div>
        </div>

        <div className="card" data-testid="revenue-utilization-card">
          <div className="card-title">Revenue Utilization Rate</div>
          <div className="purple">{revenueStats.revenueUtilizationRate.toFixed(1)}%</div>
        </div>

        {/* Sales by payment method (only show when count > 0) */}
        {salesByMethod.cash?.count > 0 && (
          <div className="card subcard" data-testid="sales-by-cash-card">
            <div className="card-title">Sales by Cash</div>
            <div className="grid two">
              <div>
                <b>Count:</b> {salesByMethod.cash.count}
              </div>
              <div>
                <b>Amount:</b> {fmtUSD(salesByMethod.cash.amount)}
              </div>
            </div>
          </div>
        )}

        {salesByMethod.transfer?.count > 0 && (
          <div className="card subcard" data-testid="sales-by-transfer-card">
            <div className="card-title">Sales by Card/Transfer</div>
            <div className="grid two">
              <div>
                <b>Count:</b> {salesByMethod.transfer.count}
              </div>
              <div>
                <b>Amount:</b> {fmtUSD(salesByMethod.transfer.amount)}
              </div>
            </div>
          </div>
        )}

        {salesByMethod.installments?.count > 0 && (
          <div className="card subcard" data-testid="sales-by-installments-card">
            <div className="card-title">Sales by Installments</div>
            <div className="grid two">
              <div>
                <b>Count:</b> {salesByMethod.installments.count}
              </div>
              <div>
                <b>Amount:</b> {fmtUSD(salesByMethod.installments.amount)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Revenue Withdrawals Section */}
      {db.revenueWithdrawals.length > 0 && (
        <div className="section">
          <RevenueWithdrawals db={db} />
        </div>
      )}
    </div>
  );
}

/* ========== Modal ========== */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="icon" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
