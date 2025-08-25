import React, { useState, useMemo } from 'react';
import { DB, Sale, InventoryItem } from '../../types/models';
import { fmtUSD } from '../../lib/utils';
import { SaleForm } from './SaleForm';

export interface SalesPageProps {
  db: DB;
  persist: (_db: DB) => void;
}

type CustomerGroup = {
  customerName: string;
  key: string;
  sales: Sale[];
  salesCount: number;
  totalAmount: number;
};

export function SalesPage({ db, persist }: SalesPageProps) {
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

  const handleSave = (sale: Sale, updatedItems: InventoryItem[]) => {
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
  };

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
          onSave={handleSave}
        />
      )}
    </div>
  );
}
