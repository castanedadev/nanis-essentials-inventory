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
  const [weight, setWeight] = useState<number>(initial?.weightLbs ?? 1);
  const [subtotal, setSubtotal] = useState<number>(initial?.subtotal ?? calcSubtotal(lines));
  const taxRate = db.settings?.taxRatePercent ?? DEFAULT_SETTINGS.taxRatePercent;
  const autoTax = Math.round(subtotal * (taxRate / 100) * 100) / 100; // Round to 2 decimal places
  const [tax, setTax] = useState<number>(initial?.tax ?? autoTax);
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

  // Auto-update tax when subtotal changes
  React.useEffect(() => {
    if (!initial) {
      // Only auto-calculate for new purchases
      const newAutoTax = Math.round(subtotal * (taxRate / 100) * 100) / 100; // Round to 2 decimal places
      setTax(newAutoTax);
    }
  }, [subtotal, taxRate, initial]);

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

    // Calculate total actual weight for proportional allocation
    const totalWeight = lines.reduce((acc, l) => {
      const item = items.find(item => item.id === l.itemId);
      const itemWeight = item?.weightLbs ?? 0;
      const lineUnits = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
      return acc + itemWeight * lineUnits;
    }, 0);

    // Allocate costs to each purchase line
    const enriched = lines.map(l => {
      const item = items.find(item => item.id === l.itemId);
      const itemWeight = item?.weightLbs ?? 0;
      const lineUnits = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
      const lineWeight = itemWeight * lineUnits;

      // Proportional tax distribution based on unit cost
      const lineCost = l.quantity * l.unitCost;
      const perUnitTax = subtotal > 0 ? (tax * lineCost) / (subtotal * l.quantity) : 0;

      // Equal distribution for US shipping
      const perUnitShippingUS = shipUS > 0 && units ? shipUS / units : 0;

      // Weight-based distribution for international shipping
      const weightRatio = totalWeight > 0 ? lineWeight / totalWeight : 0;
      const perUnitShippingIntl = lineUnits > 0 ? (shipIntl * weightRatio) / lineUnits : 0;

      return {
        ...l,
        perUnitTax,
        perUnitShippingUS,
        perUnitShippingIntl,
        unitCostPostShipping: l.unitCost + perUnitTax + perUnitShippingUS + perUnitShippingIntl,
      };
    });

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
          const autoMax = Math.ceil(costPost + 10);
          const nextMinRev = autoMin - costPost;
          const nextMaxRev = autoMax - costPost;
          return {
            ...it,
            stock: nextStock,
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
                      const newLines = lines.map(x => (x.id === l.id ? { ...x, itemId: v } : x));
                      setLines(newLines);

                      // Update weight when item changes (if items have weights)
                      const newWeight = newLines.reduce((acc, line) => {
                        const item = items.find(item => item.id === line.itemId);
                        const itemWeight = item?.weightLbs ?? 0;
                        const lineUnits =
                          line.quantity + (line.hasSubItems ? (line.subItemsQty ?? 0) : 0);
                        return acc + itemWeight * lineUnits;
                      }, 0);
                      if (newWeight > 0) {
                        setWeight(Math.max(1, Math.ceil(newWeight)));
                        setShipIntl(Math.max(1, Math.ceil(newWeight)) * weightCost);
                      }
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
                value={l.quantity === 0 ? '' : l.quantity}
                onChange={e => {
                  const value = e.target.value;
                  const newLines = lines.map(x =>
                    x.id === l.id ? { ...x, quantity: value === '' ? 0 : parseNumber(value) } : x
                  );
                  setLines(newLines);

                  // Update subtotal when quantity changes
                  const newSubtotal = calcSubtotal(newLines);
                  setSubtotal(newSubtotal);

                  // Update weight when quantity changes (if items have weights)
                  const newWeight = newLines.reduce((acc, line) => {
                    const item = items.find(item => item.id === line.itemId);
                    const itemWeight = item?.weightLbs ?? 0;
                    const lineUnits =
                      line.quantity + (line.hasSubItems ? (line.subItemsQty ?? 0) : 0);
                    return acc + itemWeight * lineUnits;
                  }, 0);
                  if (newWeight > 0) {
                    setWeight(Math.max(1, Math.ceil(newWeight)));
                    setShipIntl(Math.max(1, Math.ceil(newWeight)) * weightCost);
                  }
                }}
                data-testid="quantity-input"
              />
            </div>
            <div>
              <label>Unit Cost</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={l.unitCost === 0 ? '' : l.unitCost}
                onChange={e => {
                  const value = e.target.value;
                  const v = value === '' ? 0 : parseNumber(value);
                  const next = lines.map(x => (x.id === l.id ? { ...x, unitCost: v } : x));
                  setLines(next);
                  const newSubtotal = calcSubtotal(next);
                  setSubtotal(newSubtotal);
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
                  value={(l.subItemsQty ?? 0) === 0 ? '' : (l.subItemsQty ?? 0)}
                  onChange={e => {
                    const value = e.target.value;
                    const newLines = lines.map(x =>
                      x.id === l.id
                        ? { ...x, subItemsQty: value === '' ? 0 : parseNumber(value) }
                        : x
                    );
                    setLines(newLines);

                    // Update weight when sub-items quantity changes (if items have weights)
                    const newWeight = newLines.reduce((acc, line) => {
                      const item = items.find(item => item.id === line.itemId);
                      const itemWeight = item?.weightLbs ?? 0;
                      const lineUnits =
                        line.quantity + (line.hasSubItems ? (line.subItemsQty ?? 0) : 0);
                      return acc + itemWeight * lineUnits;
                    }, 0);
                    if (newWeight > 0) {
                      setWeight(Math.max(1, Math.ceil(newWeight)));
                      setShipIntl(Math.max(1, Math.ceil(newWeight)) * weightCost);
                    }
                  }}
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
            value={subtotal === 0 ? '' : subtotal}
            onChange={e => {
              const value = e.target.value;
              setSubtotal(value === '' ? 0 : parseNumber(value));
            }}
            data-testid="subtotal-input"
          />
        </div>
        <div>
          <label>Tax</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={tax === 0 ? '' : tax.toFixed(2)}
            onChange={e => {
              const value = e.target.value;
              setTax(value === '' ? 0 : parseNumber(value));
            }}
            data-testid="tax-input"
          />
          <div className="muted tiny">Auto: {taxRate}% of subtotal</div>
        </div>
        <div>
          <label>Shipping (US)</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={shipUS === 0 ? '' : shipUS}
            onChange={e => {
              const value = e.target.value;
              setShipUS(value === '' ? 0 : parseNumber(value));
            }}
            data-testid="shipping-us-input"
          />
        </div>
        <div>
          <label>Weight (lbs)</label>
          <input
            type="number"
            step="1"
            min="1"
            inputMode="numeric"
            value={weight}
            onChange={e => {
              const value = e.target.value;
              const v = value === '' ? 1 : Math.max(1, Math.floor(parseNumber(value))); // Force integer, min 1
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
            step="0.50"
            inputMode="decimal"
            value={shipIntl === 0 ? '' : shipIntl}
            onChange={e => {
              const value = e.target.value;
              setShipIntl(value === '' ? 0 : parseNumber(value));
            }}
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
