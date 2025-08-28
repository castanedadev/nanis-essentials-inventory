import React, { useState, useMemo } from 'react';
import { SaleForm } from './SaleForm';
import { SearchSection } from './SearchSection';
import { CustomerGroup, CustomerGroupType } from './CustomerGroup';
import { DB, Sale, InventoryItem } from '../../../types/models';
// import { fmtUSD } from '../../../lib/utils';

interface SalesPageProps {
  db: DB;
  persist: (_db: DB) => void;
}

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

  const groups: CustomerGroupType[] = useMemo(() => {
    const map = new Map<string, Sale[]>();
    db.sales
      .filter(s => matchesSearch(s, searchQuery))
      .forEach(s => {
        const name = s.buyerName?.trim() || 'Anonymous';
        if (!map.has(name)) map.set(name, []);
        map.get(name)!.push(s);
      });

    const result: CustomerGroupType[] = Array.from(map.entries()).map(([name, sales]) => ({
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

      <SearchSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        summaryStats={summaryStats}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />

      <div className="cards">
        {groups.map(group => (
          <CustomerGroup
            key={group.key}
            group={group}
            db={db}
            isExpanded={expandedGroups.has(group.key)}
            onToggle={() => toggleGroup(group.key)}
            onEditSale={sale => {
              setEditing(sale);
              setShowForm(true);
            }}
            onDeleteSale={onDelete}
          />
        ))}
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
