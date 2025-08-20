/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { RevenueService } from '../lib/revenueService';
import { DB } from '../types/models';
import { fmtUSD, parseNumber } from '../lib/utils';

interface RevenueManagerProps {
  db: DB;
  isVisible: boolean;
  onClose: () => void;
  totalCost: number;
  onApplyRevenue: (revenueAmount: number, reason: string, notes?: string) => void;
}

/**
 * Revenue Manager Component
 * Allows users to specify how much revenue to use for a purchase
 */
export function RevenueManager({
  db,
  isVisible,
  onClose,
  totalCost,
  onApplyRevenue,
}: RevenueManagerProps) {
  const [revenueToUse, setRevenueToUse] = useState<number>(0);
  const [reason, setReason] = useState<string>('Business re-investment');
  const [notes, setNotes] = useState<string>('');

  if (!isVisible) return null;

  const revenueStats = RevenueService.getRevenueStats(db);
  const paymentBreakdown = RevenueService.calculatePaymentBreakdown(totalCost, revenueToUse);
  const canProceed = RevenueService.canWithdrawRevenue(db, revenueToUse);

  const handleSubmit = () => {
    if (!canProceed) return;
    onApplyRevenue(revenueToUse, reason, notes);
    onClose();
  };

  const handleUseMaxRevenue = () => {
    const maxUsable = Math.min(revenueStats.availableRevenue, totalCost);
    setRevenueToUse(maxUsable);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Use Revenue for Purchase</div>
          <button className="icon" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Revenue Overview */}
          <div className="section">
            <h3>Revenue Overview</h3>
            <div className="revenue-stats grid two">
              <div className="stat-card">
                <div className="stat-label">Total Revenue</div>
                <div className="stat-value green">{fmtUSD(revenueStats.totalRevenue)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Available for Re-investment</div>
                <div className="stat-value blue">{fmtUSD(revenueStats.availableRevenue)}</div>
              </div>
            </div>
          </div>

          {/* Revenue Input */}
          <div className="section">
            <h3>Re-investment Amount</h3>
            <div className="form">
              <div>
                <label>Amount to use from revenue</label>
                <div className="input-group">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={revenueStats.availableRevenue}
                    value={revenueToUse}
                    onChange={e => setRevenueToUse(parseNumber(e.target.value))}
                    data-testid="revenue-amount-input"
                    placeholder="0.00"
                  />
                  <button
                    type="button"
                    onClick={handleUseMaxRevenue}
                    className="btn-secondary"
                    disabled={revenueStats.availableRevenue === 0}
                  >
                    Use Max Available
                  </button>
                </div>
                {revenueToUse > revenueStats.availableRevenue && (
                  <div className="error-text">
                    Amount exceeds available revenue ({fmtUSD(revenueStats.availableRevenue)})
                  </div>
                )}
              </div>

              <div>
                <label>Reason for withdrawal</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  data-testid="withdrawal-reason-input"
                  placeholder="e.g., Business re-investment, Inventory expansion"
                />
              </div>

              <div>
                <label>Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  data-testid="withdrawal-notes-input"
                  placeholder="Additional details about this withdrawal"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          {revenueToUse > 0 && (
            <div className="section">
              <h3>Payment Breakdown</h3>
              <div className="payment-breakdown">
                <div className="breakdown-row">
                  <span>Total Purchase Cost:</span>
                  <span className="amount">{fmtUSD(totalCost)}</span>
                </div>
                <div className="breakdown-row revenue">
                  <span>From Revenue:</span>
                  <span className="amount green">-{fmtUSD(paymentBreakdown.revenueUsed)}</span>
                </div>
                <div className="breakdown-row external">
                  <span>External Payment Needed:</span>
                  <span className="amount blue">{fmtUSD(paymentBreakdown.externalPayment)}</span>
                </div>
                <div className="breakdown-footer">
                  <span
                    className="payment-source-badge"
                    data-source={paymentBreakdown.paymentSource}
                  >
                    {paymentBreakdown.paymentSource === 'revenue' && 'Fully funded by revenue'}
                    {paymentBreakdown.paymentSource === 'external' && 'External payment only'}
                    {paymentBreakdown.paymentSource === 'mixed' && 'Mixed payment'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-actions">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canProceed || !reason.trim()}
              className="btn-primary"
              data-testid="apply-revenue-button"
            >
              Apply Revenue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Revenue Summary Card Component
 * Shows current revenue status in a compact format
 */
export function RevenueSummaryCard({ db }: { db: DB }) {
  const stats = RevenueService.getRevenueStats(db);

  return (
    <div className="revenue-summary-card" data-testid="revenue-summary-card">
      <div className="card-header">
        <h4>Revenue Status</h4>
      </div>
      <div className="revenue-metrics">
        <div className="metric">
          <span className="label">Available</span>
          <span className="value green">{fmtUSD(stats.availableRevenue)}</span>
        </div>
        <div className="metric">
          <span className="label">Total Earned</span>
          <span className="value">{fmtUSD(stats.totalRevenue)}</span>
        </div>
        <div className="metric">
          <span className="label">Re-invested</span>
          <span className="value">{fmtUSD(stats.totalWithdrawn)}</span>
        </div>
        <div className="metric">
          <span className="label">Utilization</span>
          <span className="value">{stats.revenueUtilizationRate.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
