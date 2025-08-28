import React, { useMemo } from 'react';
import { AnalyticsItemCard, AnalyticsSimpleCard, AnalyticsPaymentCard } from './AnalyticsCard';
import { RevenueWithdrawals } from '../../RevenueWithdrawals';
import { DB, InventoryItem } from '../../../types/models';
import { fmtUSD, isSameMonth } from '../../../lib/utils';
import { RevenueService } from '../../../lib/revenueService';

interface AnalyticsPageProps {
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
        <AnalyticsItemCard
          title="Most Popular Item"
          item={mostPopularItem}
          emptyMessage="No sales data yet"
          testId="most-popular-card"
        />

        <AnalyticsItemCard
          title="Most Expensive Item"
          item={mostExpensive}
          valueDisplay="price"
          testId="most-expensive-card"
        />

        <AnalyticsItemCard
          title="Less Expensive Item"
          item={leastExpensive}
          valueDisplay="price"
          testId="least-expensive-card"
        />

        <AnalyticsSimpleCard
          title="Total Sales (This Month)"
          value={fmtUSD(totalSalesThisMonth)}
          testId="total-sales-month-card"
        />

        <AnalyticsSimpleCard
          title="Total Sales (Overall)"
          value={fmtUSD(totalSalesOverall)}
          testId="total-sales-overall-card"
        />

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
          <AnalyticsPaymentCard
            title="Sales by Cash"
            count={salesByMethod.cash.count}
            amount={salesByMethod.cash.amount}
            testId="sales-by-cash-card"
          />
        )}

        {salesByMethod.transfer?.count > 0 && (
          <AnalyticsPaymentCard
            title="Sales by Card/Transfer"
            count={salesByMethod.transfer.count}
            amount={salesByMethod.transfer.amount}
            testId="sales-by-transfer-card"
          />
        )}

        {salesByMethod.installments?.count > 0 && (
          <AnalyticsPaymentCard
            title="Sales by Installments"
            count={salesByMethod.installments.count}
            amount={salesByMethod.installments.amount}
            testId="sales-by-installments-card"
          />
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
