import React, { useState, useMemo } from 'react';
import { Modal } from '../../shared/Modal';
import {
  DB,
  Sale,
  SaleLine,
  InventoryItem,
  PaymentMethod,
  SalesChannel,
} from '../../../types/models';
import { parseNumber, uid, nowIso, fmtUSD } from '../../../lib/utils';

interface SaleFormProps {
  db: DB;
  initial?: Sale;
  onClose: () => void;
  onSave: (_sale: Sale, _updatedItems: InventoryItem[]) => void;
}

export function SaleForm({ db, initial, onClose, onSave }: SaleFormProps) {
  const [lines, setLines] = useState<SaleLine[]>(
    initial?.lines ?? [
      {
        id: uid(),
        itemId: db.items[0]?.id ?? '',
        quantity: 1,
        unitPrice: db.items[0]?.minPrice ?? 0,
      },
    ]
  );
  const [buyerName, setBuyerName] = useState<string>(initial?.buyerName ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? 'cash'
  );
  const [channel, setChannel] = useState<SalesChannel | ''>(initial?.channel ?? '');
  const [numberOfPayments, setNumberOfPayments] = useState<number>(
    initial?.installments?.numberOfPayments ?? 2
  );

  // Build unique buyer options from existing sales
  const buyerOptions = useMemo(() => {
    const names = new Set<string>();
    db.sales.forEach((s: any) => {
      if (s.buyerName) names.add(s.buyerName);
    });
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
    setLines([
      ...lines,
      {
        id: uid(),
        itemId: db.items[0]?.id ?? '',
        quantity: 1,
        unitPrice: db.items[0]?.minPrice ?? 0,
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
      channel: channel || undefined,
      installments:
        paymentMethod === 'installments' ? { numberOfPayments, amountPerPayment } : undefined,
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
                  {db.items
                    .filter(i => i.stock > 0)
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(i => (
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
          <label>Sales Channel (optional)</label>
          <select value={channel} onChange={e => setChannel(e.target.value as SalesChannel | '')}>
            <option value="">Select Channel</option>
            <option value="facebook_marketplace">Facebook Marketplace</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="family_friends">Family/Friends</option>
            <option value="other">Other</option>
          </select>
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
