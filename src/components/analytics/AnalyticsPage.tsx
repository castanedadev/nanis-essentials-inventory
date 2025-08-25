import React, { useMemo } from 'react';
import { DB, InventoryItem } from '../../types/models';
import { fmtUSD, isSameMonth } from '../../lib/utils';
import { RevenueService } from '../../lib/revenueService';
import { ItemCardImage } from '../ItemImageDisplay';
import { RevenueWithdrawals } from '../RevenueWithdrawals';

export interface AnalyticsPageProps {
  db: DB;
}

export function AnalyticsPage({ db }: AnalyticsPageProps) {
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
