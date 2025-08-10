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

type Tab = 'inventory' | 'purchases' | 'sales' | 'analytics';

const CATEGORIES: Category[] = ['Hair Care', 'Body Care', 'Makeup', 'Fragrance', 'Skin Care', 'Other'];

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

      {tab === 'inventory' && <InventoryPage db={db} persist={persist} />}
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
  setActive: (t: Tab) => void;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
}) {
  return (
    <div className="topbar">
      <div className="title">Nani's Essentials</div>
      <div className="tabs">
        <button className={active === 'inventory' ? 'tab active' : 'tab'} onClick={() => setActive('inventory')}>Inventory</button>
        <button className={active === 'purchases' ? 'tab active' : 'tab'} onClick={() => setActive('purchases')}>Purchases</button>
        <button className={active === 'sales' ? 'tab active' : 'tab'} onClick={() => setActive('sales')}>Sales</button>
        <button className={active === 'analytics' ? 'tab active' : 'tab'} onClick={() => setActive('analytics')}>Analytics</button>
      </div>
      <div className="actions">
        <button onClick={onExport}>Export Backup</button>
        <button onClick={onImport}>Import</button>
        <button className="danger" onClick={onClear}>Clear All Data</button>
      </div>
    </div>
  );
}

/* ========== Inventory ========== */

function InventoryPage({ db, persist }: { db: DB; persist: (db: DB) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const items = db.items;

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase().trim();
    return items.filter(item => 
      item.name.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  }, [items, searchQuery]);

  const onDelete = (id: string) => {
    if (!window.confirm('Delete item?')) return;
    persist({ ...db, items: db.items.filter(i => i.id !== id) });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Inventory Management</h2>
        <button className="primary" onClick={() => { setEditing(null); setShowForm(true); }}>+ Add Item</button>
      </div>

      <div className="search-section">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Search items by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
        {searchQuery && (
          <div className="search-results-info">
            {filteredItems.length} of {items.length} items found
          </div>
        )}
      </div>

      <div className="cards two-cols">
        {filteredItems.map(it => (
          <div key={it.id} className={`card item-card ${it.stock === 0 ? 'out-of-stock-card' : ''}`}>
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
                <div className="grid two">
                  <div><b>Category:</b> {it.category}</div>
                  <div><b>Price Range:</b> {fmtUSD(it.minPrice ?? 0)} - {fmtUSD(it.maxPrice ?? 0)}</div>
                  <div><b>Unit Cost:</b> {fmtUSD(it.costPostShipping ?? it.costPreShipping ?? 0)}</div>
                  <div>
                    <b>Stock:</b> {it.stock}
                    {it.stock === 0 && <span className="out-of-stock-badge">out of stock</span>}
                    {it.stock === 1 && <span className="last-item-badge">last item</span>}
                  </div>
                </div>
                {it.description && <div className="muted item-description">{it.description}</div>}
              </div>
            </div>
            
            <div className="row gap">
              <button onClick={() => { setEditing(it); setShowForm(true); }}>Edit</button>
              <button className="danger" onClick={() => onDelete(it.id)}>Delete</button>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && items.length === 0 && <div className="empty">No items yet.</div>}
        {filteredItems.length === 0 && items.length > 0 && <div className="empty">No items match your search.</div>}
      </div>

      {showForm && (
        <InventoryForm
          initial={editing ?? undefined}
          onClose={() => setShowForm(false)}
          onSave={(item) => {
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
  onSave: (it: InventoryItem) => void;
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
    const decimal = raw % 1;
    if (decimal < 0.5) {
      return Math.floor(raw);
    } else {
      return Math.ceil(raw);
    }
  }, [costPostShipping]);
  
  const autoMax = useMemo(() => {
    const raw = (costPostShipping || 0) + 10;
    const decimal = raw % 1;
    if (decimal < 0.5) {
      return Math.floor(raw);
    } else {
      return Math.ceil(raw);
    }
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
    if (!name.trim()) return alert('Name is required');
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
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value as Category)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label>Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div>
          <label>Initial Count</label>
          <input type="number" value={stock} onChange={e => setStock(parseNumber(e.target.value))} />
        </div>
        <div>
          <label>Total Cost (per unit, post-shipping)</label>
          <input 
            type="number" 
            step="0.01" 
            inputMode="decimal" 
            value={costPostShipping} 
            onChange={e => setCostPostShipping(parseNumber(e.target.value))} 
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
          />
        </div>

        <div>
          <label>Min Price <span className="formula-hint">(Cost + $5.00)</span></label>
          <input 
            type="number" 
            step="0.01" 
            inputMode="decimal" 
            value={minPrice ?? 0} 
            onChange={e => setMinPrice(parseNumber(e.target.value))} 
          />
        </div>
        <div>
          <label>Max Price <span className="formula-hint">(Cost + $10.00)</span></label>
          <input 
            type="number" 
            step="0.01" 
            inputMode="decimal" 
            value={maxPrice ?? 0} 
            onChange={e => setMaxPrice(parseNumber(e.target.value))} 
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
        <div><b>Min Revenue:</b> {fmtUSD(minRevenue)}</div>
        <div><b>Max Revenue:</b> {fmtUSD(maxRevenue)}</div>
      </div>

      <div className="row gap end">
        <button className="primary" onClick={save}>{initial ? 'Save Changes' : 'Add Item'}</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ========== Purchases ========== */

function PurchasesPage({ db, persist }: { db: DB; persist: (db: DB) => void }) {
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
        <button className="primary" onClick={() => { setEditing(null); setShowForm(true); }}>+ Register Purchase</button>
      </div>

      <div className="cards">
        {db.purchases.map(p => (
          <div key={p.id} className="card">
            <div className="card-row">
              <div className="card-title">Purchase #{p.id}</div>
              <div className="muted">{new Date(p.createdAt).toLocaleDateString()}</div>
            </div>
            <div className="grid three">
              <div><b>Subtotal:</b> {fmtUSD(p.subtotal)}</div>
              <div><b>Tax:</b> {fmtUSD(p.tax)}</div>
              <div><b>Total:</b> {fmtUSD(p.totalCost)}</div>
              <div><b>Shipping (US):</b> {fmtUSD(p.shippingUS)}</div>
              <div><b>Shipping (Intl):</b> {fmtUSD(p.shippingIntl)}</div>
              <div><b>Items:</b> {p.totalUnits}</div>
            </div>
            <div className="row gap">
              <button onClick={() => { setEditing(p); setShowForm(true); }}>Edit</button>
              <button className="danger" onClick={() => onDelete(p.id)}>Delete</button>
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
          onSave={(purchase, updatedItems) => {
            const exists = db.purchases.find(p => p.id === purchase.id);
            let itemsWorking = [...db.items];
            if (exists) {
              exists.lines.forEach(l => {
                const units = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
                itemsWorking = itemsWorking.map(it => it.id === l.itemId ? { ...it, stock: Math.max(0, it.stock - units) } : it);
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
              ? db.purchases.map(p => p.id === purchase.id ? purchase : p)
              : [...db.purchases, purchase];
            persist({ ...db, items: itemsWorking, purchases: nextPurchases });
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
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
  onSave: (purchase: Purchase, updatedItems: InventoryItem[]) => void;
}) {
  const [items, setItems] = useState<InventoryItem[]>(db.items);
  const [lines, setLines] = useState<PurchaseLine[]>(
    initial?.lines ?? [{
      id: uid(),
      itemId: items[0]?.id ?? '',
      quantity: 1,
      unitCost: 0,
      hasSubItems: false,
      subItemsQty: 0,
    }]
  );
  const [weight, setWeight] = useState<number>(initial?.weightLbs ?? 0);
  const [subtotal, setSubtotal] = useState<number>(initial?.subtotal ?? calcSubtotal(lines));
  const [tax, setTax] = useState<number>(initial?.tax ?? 0);
  const [shipUS, setShipUS] = useState<number>(initial?.shippingUS ?? 0);
  const weightCost = db.settings?.weightCostPerLb ?? DEFAULT_SETTINGS.weightCostPerLb;
  const defaultIntl = weight * weightCost;
  const [shipIntl, setShipIntl] = useState<number>(initial?.shippingIntl ?? defaultIntl);
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    const d = initial?.createdAt ?? nowIso();
    // default to today; if editing and we later set paymentDate, it will be loaded below
    return (initial as any)?.paymentDate ?? d.slice(0, 10);
  });
  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemForLineId, setAddItemForLineId] = useState<string | null>(null);

  function calcSubtotal(ls: PurchaseLine[]) {
    return ls.reduce((acc, l) => acc + l.quantity * l.unitCost, 0);
  }

  function addLine() {
    setLines([...lines, {
      id: uid(),
      itemId: items[0]?.id ?? '',
      quantity: 1,
      unitCost: 0,
      hasSubItems: false,
      subItemsQty: 0,
    }]);
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
      setLines(lines.map(l => 
        l.id === addItemForLineId ? { ...l, itemId: newItem.id } : l
      ));
      setAddItemForLineId(null);
    }
  };

  function totalUnits(ls = lines) {
    return ls.reduce((acc, l) => acc + l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0), 0);
  }

  function save() {
    if (!lines.length) return alert('Add at least one item');
    if (!lines.every(l => l.itemId)) return alert('Select item for all lines');

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

    const p: Purchase = {
      id: initial?.id ?? uid(),
      createdAt: initial?.createdAt ?? nowIso(),
      paymentDate,
      lines: enriched,
      subtotal,
      tax,
      shippingUS: shipUS,
      shippingIntl: shipIntl,
      weightLbs: weight,
      totalUnits: units,
      totalCost: subtotal + tax + shipUS + shipIntl,
    };

    let itemsUpdated = [...items];
    enriched.forEach(l => {
      const unitsLine = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
      itemsUpdated = itemsUpdated.map(it => {
        if (it.id !== l.itemId) return it;
        const nextStock = (it.stock ?? 0) + unitsLine;
        const costPre = l.unitCost;
        const costPost = l.unitCostPostShipping ?? l.unitCost;
        const autoMin = (it.minPrice ?? (costPost + 5));
        const avgComp = (it.competitorAPrice && it.competitorBPrice) ? (it.competitorAPrice + it.competitorBPrice) / 2 : it.maxPrice;
        const nextMax = it.maxPrice ?? avgComp ?? (autoMin + 5);
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

    onSave(p, itemsUpdated);
  }

  return (
    <Modal title={initial ? 'Edit Purchase' : 'Register Purchase'} onClose={onClose}>
      <div className="section-title">Purchase Items</div>

      {lines.map((l, idx) => (
        <div key={l.id} className="grid-with-delete">
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
                      setLines(lines.map(x => x.id === l.id ? { ...x, itemId: v } : x));
                    }
                  }}
                >
                  <option value="" disabled>Select Item</option>
                  <option value="ADD_NEW" style={{ fontWeight: 'bold', borderTop: '1px solid #ccc' }}>+ Add New Item</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label>Quantity</label>
              <input
                type="number"
                value={l.quantity}
                onChange={e => setLines(lines.map(x => x.id === l.id ? { ...x, quantity: parseNumber(e.target.value) } : x))}
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
                  const next = lines.map(x => x.id === l.id ? { ...x, unitCost: v } : x);
                  setLines(next);
                  setSubtotal(calcSubtotal(next));
                }}
              />
            </div>
            <div className="checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={l.hasSubItems}
                  onChange={e => setLines(lines.map(x => x.id === l.id ? { ...x, hasSubItems: e.target.checked } : x))}
                />
                Sub-items
              </label>
              {l.hasSubItems && (
                <input
                  placeholder="Sub-items qty"
                  value={l.subItemsQty ?? 0}
                  onChange={e => setLines(lines.map(x => x.id === l.id ? { ...x, subItemsQty: parseNumber(e.target.value) } : x))}
                />
              )}
            </div>

            {idx === lines.length - 1 && (
              <div className="col-span-4">
                <button className="link" onClick={addLine}>+ Add Another Item</button>
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
      ))}

      <div className="grid four row-gap">
        <div>
          <label>Payment Date</label>
          <input
            type="date"
            value={paymentDate}
            onChange={e => setPaymentDate(e.target.value)}
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
          />
          <div className="muted tiny">Auto: weight × weight cost ({fmtUSD(db.settings?.weightCostPerLb ?? DEFAULT_SETTINGS.weightCostPerLb)}/lb)</div>
        </div>
        <div className="col-span-4 summary">
          <b>Total Cost:</b> {fmtUSD(subtotal + tax + shipUS + shipIntl)} &nbsp;
          <span className="muted">Items (incl. sub-items): {totalUnits()}</span>
        </div>
      </div>

      <div className="row gap end">
        <button className="primary" onClick={save}>{initial ? 'Save Changes' : 'Register Purchase'}</button>
        <button onClick={onClose}>Cancel</button>
      </div>

      {showAddItem && (
        <div className="modal-overlay">
          <QuickAddItemForm
            onSave={onAddItem}
            onCancel={() => {
              setShowAddItem(false);
              setAddItemForLineId(null);
            }}
          />
        </div>
      )}
    </Modal>
  );
}

function QuickAddItemForm({
  onSave,
  onCancel,
}: {
  onSave: (item: InventoryItem) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Other');
  const [description, setDescription] = useState('');

  const save = () => {
    if (!name.trim()) return window.alert('Item name is required');
    
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
        <button className="icon" onClick={onCancel}>✕</button>
      </div>
      
      <div className="form-body grid two">
        <div>
          <label>Item Name *</label>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)}
            placeholder="Enter item name"
            autoFocus
          />
        </div>
        <div>
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value as Category)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
        <button className="primary" onClick={save}>Add Item</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ========== Sales ========== */

function SalesPage({ db, persist }: { db: DB; persist: (db: DB) => void }) {
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
        itemsWorking = itemsWorking.map(it => it.id === l.itemId ? { ...it, stock: it.stock + l.quantity } : it);
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
      sales: sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      salesCount: sales.length,
      totalAmount: sales.reduce((sum, s) => sum + s.totalAmount, 0),
    }));

    // Sort by total spent desc, then name asc
    result.sort((a, b) => (b.totalAmount - a.totalAmount) || a.customerName.localeCompare(b.customerName));
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
      if (next.has(key)) next.delete(key); else next.add(key);
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
        <button className="primary" onClick={() => { setEditing(null); setShowForm(true); }}>+ Register Sale</button>
      </div>

      <div className="search-section">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Search by customer, sale id, payment, amount or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')} title="Clear search">✕</button>
          )}
        </div>
        <div className="row gap">
          <div className="search-results-info">
            {summaryStats.totalSales} sales | {fmtUSD(summaryStats.totalAmount)} | {summaryStats.uniqueCustomers} customers
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
          const initials = group.customerName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={group.key} className="card customer-group">
              <div className="customer-group-header" onClick={() => toggleGroup(group.key)}>
                <div className="customer-info">
                  <div className="customer-avatar" aria-hidden>{initials || 'A'}</div>
                  <div>
                    <div className="customer-name">{group.customerName}</div>
                    <div className="customer-stats">{group.salesCount} sale{group.salesCount !== 1 ? 's' : ''} • {fmtUSD(group.totalAmount)}</div>
                  </div>
                </div>
                <button className="icon" title={isExpanded ? 'Collapse' : 'Expand'}>{isExpanded ? '▾' : '▸'}</button>
              </div>
              <div className={`customer-sales-list ${isExpanded ? 'expanded' : ''}`}>
                {group.sales.map(s => {
                  const itemCount = s.lines.reduce((acc, l) => acc + l.quantity, 0);
                  return (
                    <div key={s.id} className="sale-item-grouped">
                      <div className="sale-id">#{s.id}</div>
                      <div className="sale-date">{new Date(s.createdAt).toLocaleDateString()}</div>
                      <div className="sale-payment">{s.paymentMethod}</div>
                      <div className="sale-items">{itemCount} item{itemCount !== 1 ? 's' : ''}</div>
                      <div className="sale-total">{fmtUSD(s.totalAmount)}</div>
                      <div className="sale-actions row gap end">
                        <button onClick={() => { setEditing(s); setShowForm(true); }}>Edit</button>
                        <button className="danger" onClick={() => onDelete(s.id)}>Delete</button>
                      </div>
                    </div>
                  );
                })}
                {group.sales.length === 0 && <div className="empty">No sales for this customer.</div>}
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
                itemsWorking = itemsWorking.map(it => it.id === l.itemId ? { ...it, stock: it.stock + l.quantity } : it);
              });
            }
            updatedItems.forEach(ui => {
              itemsWorking = itemsWorking.map(it => it.id === ui.id ? ui : it);
            });
            const nextSales = exists ? db.sales.map(s => s.id === sale.id ? sale : s) : [...db.sales, sale];
            persist({ ...db, items: itemsWorking, sales: nextSales });
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function SaleForm({
  db,
  initial,
  onClose,
  onSave,
}: {
  db: DB;
  initial?: Sale;
  onClose: () => void;
  onSave: (sale: Sale, updatedItems: InventoryItem[]) => void;
}) {
  const [lines, setLines] = useState<SaleLine[]>(
    initial?.lines ?? [{
      id: uid(),
      itemId: db.items[0]?.id ?? '',
      quantity: 1,
      unitPrice: db.items[0]?.minPrice ?? 0,
    }]
  );
  const [buyerName, setBuyerName] = useState<string>(initial?.buyerName ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? 'cash');
  const [numberOfPayments, setNumberOfPayments] = useState<number>(initial?.installments?.numberOfPayments ?? 2);

  // Build unique buyer options from existing sales
  const buyerOptions = useMemo(() => {
    const names = new Set<string>();
    db.sales.forEach(s => { if (s.buyerName) names.add(s.buyerName); });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [db.sales]);

  // Autocomplete state for buyer name
  const [showBuyerSuggestions, setShowBuyerSuggestions] = useState(false);
  const [buyerActiveIndex, setBuyerActiveIndex] = useState(0);
  const filteredBuyerOptions = useMemo(() => {
    const q = buyerName.trim().toLowerCase();
    if (!q) return buyerOptions;
    return buyerOptions.filter(n => n.toLowerCase().includes(q));
  }, [buyerName, buyerOptions]);

  function addLine() {
    setLines([...lines, { 
      id: uid(), 
      itemId: db.items[0]?.id ?? '', 
      quantity: 1, 
      unitPrice: db.items[0]?.minPrice ?? 0 
    }]);
  }

  function deleteLine(lineId: string) {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== lineId));
    }
  }

  const total = lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
  const amountPerPayment = paymentMethod === 'installments' && numberOfPayments > 0 ? total / numberOfPayments : 0;

  function save() {
    if (!lines.length) return alert('Add at least one item');
    if (!lines.every(l => l.itemId)) return alert('Select item for all lines');

    const s: Sale = {
      id: initial?.id ?? uid(),
      createdAt: initial?.createdAt ?? nowIso(),
      buyerName: buyerName.trim() || undefined,
      paymentMethod,
      installments: paymentMethod === 'installments' ? { numberOfPayments, amountPerPayment } : undefined,
      lines,
      totalAmount: total,
    };

    let itemsUpdated = [...db.items];
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
        const selectedItem = db.items.find(i => i.id === l.itemId);
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
                    const newItem = db.items.find(i => i.id === newItemId);
                    const defaultPrice = newItem?.minPrice ?? 0;
                    
                    setLines(lines.map(x => x.id === l.id ? { 
                      ...x, 
                      itemId: newItemId,
                      unitPrice: defaultPrice
                    } : x));
                  }}
                >
                  <option value="" disabled>Select Item</option>
                  {db.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label>Quantity</label>
                <input type="number" value={l.quantity} onChange={e => setLines(lines.map(x => x.id === l.id ? { ...x, quantity: parseNumber(e.target.value) } : x))} />
              </div>
                          <div>
              <label>
                Unit Price
                {priceRange && (
                  <span className="price-range-inline">Range: {priceRange}</span>
                )}
              </label>
              <input 
                type="number" 
                step="0.01" 
                inputMode="decimal" 
                value={l.unitPrice} 
                onChange={e => setLines(lines.map(x => x.id === l.id ? { ...x, unitPrice: parseNumber(e.target.value) } : x))} 
              />
            </div>
              {idx === lines.length - 1 && <div className="col-span-3"><button className="link" onClick={addLine}>+ Add Another Item</button></div>}
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
              onChange={e => { setBuyerName(e.target.value); setShowBuyerSuggestions(true); setBuyerActiveIndex(0); }}
              onKeyDown={e => {
                if (!showBuyerSuggestions || filteredBuyerOptions.length === 0) return;
                if (e.key === 'ArrowDown') { e.preventDefault(); setBuyerActiveIndex(i => Math.min(i + 1, filteredBuyerOptions.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setBuyerActiveIndex(i => Math.max(i - 1, 0)); }
                if (e.key === 'Enter') { e.preventDefault(); const val = filteredBuyerOptions[buyerActiveIndex]; if (val) { setBuyerName(val); setShowBuyerSuggestions(false); } }
                if (e.key === 'Escape') { setShowBuyerSuggestions(false); }
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
                    onMouseDown={() => { setBuyerName(name); setShowBuyerSuggestions(false); }}
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
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
            <option value="cash">Cash</option>
            <option value="transfer">Transfer</option>
            <option value="installments">Installments</option>
          </select>
        </div>
        {paymentMethod === 'installments' && (
          <>
            <div>
              <label># of Payments</label>
              <input type="number" value={numberOfPayments} onChange={e => setNumberOfPayments(parseNumber(e.target.value))} />
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
        <button className="primary" onClick={save}>{initial ? 'Save Changes' : 'Register Sale'}</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ========== Analytics ========== */

function AnalyticsPage({ db }: { db: DB }) {
  const mostPopularItem = useMemo(() => {
    const countByItem: Record<string, number> = {};
    db.sales.forEach(s => s.lines.forEach(l => {
      countByItem[l.itemId] = (countByItem[l.itemId] ?? 0) + l.quantity;
    }));
    let topId = '';
    let topCount = 0;
    Object.entries(countByItem).forEach(([id, cnt]) => {
      if (cnt > topCount) { topCount = cnt; topId = id; }
    });
    return db.items.find(i => i.id === topId);
  }, [db.sales, db.items]);

  const mostExpensive = db.items.reduce((a, b) => (b.maxPrice ?? 0) > (a?.maxPrice ?? 0) ? b : a, undefined as InventoryItem | undefined);
  const leastExpensive = db.items.reduce((a, b) => (b.minPrice ?? Infinity) < (a?.minPrice ?? Infinity) ? b : a, undefined as InventoryItem | undefined);

  const totalSalesOverall = db.sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalSalesThisMonth = db.sales.filter(s => isSameMonth(s.createdAt)).reduce((acc, s) => acc + s.totalAmount, 0);

  const totalInvWithShipping = db.items.reduce((acc, it) => acc + (it.costPostShipping ?? it.costPreShipping ?? 0) * it.stock, 0);
  const totalInvWithoutShipping = db.items.reduce((acc, it) => acc + (it.costPreShipping ?? 0) * it.stock, 0);

  return (
    <div className="page">
      <h2>Analytics</h2>

      <div className="cards">
        <div className="card analytics-item-card">
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

        <div className="card analytics-item-card">
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

        <div className="card analytics-item-card">
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

        <div className="card">
          <div className="card-title">Total Sales (This Month)</div>
          <div className="green">{fmtUSD(totalSalesThisMonth)}</div>
        </div>

        <div className="card">
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
      </div>
    </div>
  );
}

/* ========== Modal ========== */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
