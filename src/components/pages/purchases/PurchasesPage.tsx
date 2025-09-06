import React, { useState } from 'react';
import { PurchaseForm } from './PurchaseForm';
import { DB, Purchase, InventoryItem } from '../../../types/models';
import { fmtUSD } from '../../../lib/utils';

interface PurchasesPageProps {
  db: DB;
  persist: (_db: DB) => void;
}

export function PurchasesPage({ db, persist }: PurchasesPageProps) {
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

  const handleSave = (
    purchase: Purchase,
    updatedItems: InventoryItem[],
    updatedWithdrawals?: any[]
  ) => {
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

      <div className="cards two-cols" data-testid="purchase-cards">
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
          onSave={handleSave}
        />
      )}
    </div>
  );
}
