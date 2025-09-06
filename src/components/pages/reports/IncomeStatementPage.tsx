import React from 'react';
import { DB } from '../../../types/models';
import { fmtUSD } from '../../../lib/utils';
import { PageHeader } from '../../molecules/PageHeader';
import { Text } from '../../atoms/Typography';

interface IncomeStatementPageProps {
  db: DB;
}

export function IncomeStatementPage({ db }: IncomeStatementPageProps) {
  // Calculate revenue from sales
  const totalRevenue = db.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  // Calculate cost of goods sold from purchases
  const totalCOGS = db.purchases.reduce((sum, purchase) => sum + purchase.totalCost, 0);

  // Calculate operating expenses from transactions
  const totalExpenses = db.transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const totalFees = db.transactions
    .filter(t => t.type === 'fee')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const grossProfit = totalRevenue - totalCOGS;
  const operatingIncome = grossProfit - totalExpenses - totalFees;
  const netIncome = operatingIncome; // Simplified - no taxes/interest for now

  return (
    <div className="page">
      <PageHeader title="Income Statement" />
      <div className="report-card">
        <div className="report-period">
          <Text variant="small">All Time</Text>
        </div>

        <div className="statement-section">
          <div className="section-header">Revenue</div>
          <div className="line-item">
            <span>Total Sales Revenue</span>
            <span className="amount positive">{fmtUSD(totalRevenue)}</span>
          </div>
        </div>

        <div className="statement-section">
          <div className="section-header">Cost of Goods Sold</div>
          <div className="line-item">
            <span>Total Purchase Costs</span>
            <span className="amount negative">({fmtUSD(totalCOGS)})</span>
          </div>
          <div className="line-item total">
            <span>
              <strong>Gross Profit</strong>
            </span>
            <span className={`amount ${grossProfit >= 0 ? 'positive' : 'negative'}`}>
              <strong>{fmtUSD(grossProfit)}</strong>
            </span>
          </div>
        </div>

        <div className="statement-section">
          <div className="section-header">Operating Expenses</div>
          <div className="line-item">
            <span>Business Expenses</span>
            <span className="amount negative">({fmtUSD(totalExpenses)})</span>
          </div>
          <div className="line-item">
            <span>Fees</span>
            <span className="amount negative">({fmtUSD(totalFees)})</span>
          </div>
          <div className="line-item total">
            <span>
              <strong>Operating Income</strong>
            </span>
            <span className={`amount ${operatingIncome >= 0 ? 'positive' : 'negative'}`}>
              <strong>{fmtUSD(operatingIncome)}</strong>
            </span>
          </div>
        </div>

        <div className="statement-section final">
          <div className="line-item total final-total">
            <span>
              <strong>Net Income</strong>
            </span>
            <span className={`amount ${netIncome >= 0 ? 'positive' : 'negative'}`}>
              <strong>{fmtUSD(netIncome)}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
