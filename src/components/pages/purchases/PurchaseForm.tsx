import React, { useState } from 'react';
import { Modal } from '../../shared/Modal';
import { QuickAddItemForm } from './QuickAddItemForm';
import { RevenueManager, RevenueSummaryCard } from '../../RevenueManager';
import { DB, Purchase, PurchaseLine, InventoryItem, DEFAULT_SETTINGS } from '../../../types/models';
import { parseNumber, uid, nowIso, fmtUSD } from '../../../lib/utils';
import { RevenueService } from '../../../lib/revenueService';

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

interface PurchaseFormProps {
  db: DB;
  initial?: Purchase;
  onClose: () => void;
  onSave: (
    _purchase: Purchase,
    _updatedItems: InventoryItem[],
    _revenueWithdrawals?: any[]
  ) => void;
}

export function PurchaseForm({ db, initial, onClose, onSave }: PurchaseFormProps) {
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
    return (initial as any)?.orderedDate ?? d.slice(0, 10);
  });
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    const d = initial?.createdAt ?? nowIso();
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
