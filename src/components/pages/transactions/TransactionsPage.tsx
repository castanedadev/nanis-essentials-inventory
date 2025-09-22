import React, { useState, useMemo } from 'react';
import { DB, Transaction } from '../../../types/models';
import { fmtUSD, isCurrentMonth, isPreviousMonth } from '../../../lib/utils';
import { RevenueService } from '../../../lib/revenueService';
import { TransactionForm } from './TransactionForm';
import { DateFilters, DateFilterOption } from '../../molecules/DateFilters';
import { RevenueWithdrawals } from '../../RevenueWithdrawals';

interface TransactionsPageProps {
  db: DB;
  persist: (_db: DB) => void;
}

export function TransactionsPage({ db, persist }: TransactionsPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('current-month');

  const onDelete = (id: string) => {
    if (!window.confirm('Delete transaction?')) return;
    persist({ ...db, transactions: db.transactions.filter(x => x.id !== id) });
  };

  // Filter transactions based on selected date range
  const filteredTransactions = useMemo(() => {
    switch (dateFilter) {
      case 'current-month':
        return db.transactions.filter(t => isCurrentMonth(t.createdAt));
      case 'previous-month':
        return db.transactions.filter(t => isPreviousMonth(t.createdAt));
      case 'overall':
      default:
        return db.transactions;
    }
  }, [db.transactions, dateFilter]);

  // Filter revenue withdrawals based on selected date range
  const filteredWithdrawals = useMemo(() => {
    switch (dateFilter) {
      case 'current-month':
        return db.revenueWithdrawals.filter(w => isCurrentMonth(w.withdrawnAt));
      case 'previous-month':
        return db.revenueWithdrawals.filter(w => isPreviousMonth(w.withdrawnAt));
      case 'overall':
      default:
        return db.revenueWithdrawals;
    }
  }, [db.revenueWithdrawals, dateFilter]);

  const handleSave = (transaction: Transaction) => {
    const exists = db.transactions.find(t => t.id === transaction.id);
    let updatedDb = { ...db };

    // Process revenue deduction if payment source uses business revenue
    if (transaction.paymentSource === 'revenue' || transaction.paymentSource === 'mixed') {
      const { updatedDb: dbWithRevenue, error } = RevenueService.processTransactionWithRevenue(
        db,
        transaction
      );

      if (error) {
        alert(`Error processing transaction: ${error}`);
        return;
      }

      updatedDb = dbWithRevenue;
    }

    // Update transactions
    const nextTransactions = exists
      ? updatedDb.transactions.map(t => (t.id === transaction.id ? transaction : t))
      : [...updatedDb.transactions, transaction];

    persist({ ...updatedDb, transactions: nextTransactions });
    setShowForm(false);
    setEditing(null);
  };

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFees = filteredTransactions
    .filter(t => t.type === 'fee')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalTransactions = totalExpenses + totalFees;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Business Transactions</h2>
        <button
          className="primary"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          + Add Transaction
        </button>
      </div>

      <DateFilters activeFilter={dateFilter} onFilterChange={setDateFilter} />

      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Expenses</h3>
          <div className="amount">{fmtUSD(totalExpenses)}</div>
          <div className="muted">Business expenses (packaging, marketing, etc.)</div>
        </div>
        <div className="summary-card">
          <h3>Total Fees</h3>
          <div className="amount">{fmtUSD(totalFees)}</div>
          <div className="muted">Platform fees, payment processing, etc.</div>
        </div>
        <div className="summary-card">
          <h3>Total Outgoing</h3>
          <div className="amount total">{fmtUSD(totalTransactions)}</div>
          <div className="muted">All non-inventory business costs</div>
        </div>
      </div>

      <div className="cards two-cols" data-testid="transaction-cards">
        {filteredTransactions
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map(t => (
            <div key={t.id} className="card" data-testid="transaction-card">
              <div className="card-row">
                <div className="card-title">{t.description}</div>
                <div className="transaction-type">
                  <span className={`badge ${t.type}`}>{t.type.toUpperCase()}</span>
                </div>
              </div>
              <div className="card-row">
                <div className="amount-large">{fmtUSD(t.amount)}</div>
                <div className="muted">{new Date(t.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="grid two">
                <div>
                  <b>Category:</b> {t.category}
                </div>
                <div>
                  <b>Payment:</b> {t.paymentMethod || 'Not specified'}
                </div>
              </div>
              <div className="grid two">
                <div>
                  <b>Source:</b>{' '}
                  {t.paymentSource === 'mixed'
                    ? 'Mixed Sources'
                    : t.paymentSource === 'revenue'
                      ? 'Business Revenue'
                      : 'External Funds'}
                </div>
                {t.paymentSource === 'mixed' && t.revenueAmount && t.externalAmount && (
                  <div>
                    <b>Breakdown:</b> {fmtUSD(t.revenueAmount)} revenue + {fmtUSD(t.externalAmount)}{' '}
                    external
                  </div>
                )}
              </div>
              {t.notes && (
                <div className="notes">
                  <b>Notes:</b> {t.notes}
                </div>
              )}
              <div className="row gap">
                <button
                  onClick={() => {
                    setEditing(t);
                    setShowForm(true);
                  }}
                >
                  Edit
                </button>
                <button className="danger" onClick={() => onDelete(t.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        {filteredTransactions.length === 0 && (
          <div className="empty">
            {dateFilter === 'overall'
              ? 'No transactions yet. Add business expenses, packaging costs, fees, and other non-inventory expenses.'
              : `No transactions found for ${dateFilter === 'current-month' ? 'current month' : 'previous month'}.`}
          </div>
        )}
      </div>

      {/* Revenue Withdrawals Section */}
      {filteredWithdrawals.length > 0 && (
        <div className="section">
          <RevenueWithdrawals db={{ ...db, revenueWithdrawals: filteredWithdrawals }} />
        </div>
      )}

      {showForm && (
        <TransactionForm
          initial={editing ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={handleSave}
          db={db}
        />
      )}

      <div className="revenue-withdrawals-section">
        <RevenueWithdrawals db={db} />
      </div>
    </div>
  );
}
