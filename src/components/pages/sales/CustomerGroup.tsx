import React from 'react';
import { Sale, DB } from '../../../types/models';
import { fmtUSD } from '../../../lib/utils';

export type CustomerGroupType = {
  customerName: string;
  key: string;
  sales: Sale[];
  salesCount: number;
  totalAmount: number;
};

interface CustomerGroupProps {
  group: CustomerGroupType;
  db: DB;
  isExpanded: boolean;
  onToggle: () => void;
  onEditSale: (_sale: Sale) => void;
  onDeleteSale: (_saleId: string) => void;
}

export function CustomerGroup({
  group,
  db,
  isExpanded,
  onToggle,
  onEditSale,
  onDeleteSale,
}: CustomerGroupProps) {
  const initials = group.customerName
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="card customer-group">
      <div className="customer-group-header" onClick={onToggle}>
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
                <button onClick={() => onEditSale(s)}>Edit</button>
                <button className="danger" onClick={() => onDeleteSale(s.id)}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
        {group.sales.length === 0 && <div className="empty">No sales for this customer.</div>}
      </div>
    </div>
  );
}
