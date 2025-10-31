import { DB, RevenueWithdrawal, Purchase, PaymentSource, Transaction } from '../types/models';
import { uid, nowIso } from './utils';

/**
 * Revenue Management Service
 * Handles revenue calculations and re-investment operations following clean architecture principles
 */
export class RevenueService {
  /**
   * Calculate total revenue from all sales
   */
  static calculateTotalRevenue(db: DB): number {
    return db.sales.reduce((total, sale) => total + sale.totalAmount, 0);
  }

  /**
   * Calculate total revenue spent (withdrawn for purchases)
   */
  static calculateTotalWithdrawn(db: DB): number {
    return db.revenueWithdrawals.reduce((total, withdrawal) => total + withdrawal.amount, 0);
  }

  /**
   * Calculate total transaction withdrawals from revenue
   */
  static calculateTotalTransactionWithdrawals(db: DB): number {
    return db.revenueWithdrawals
      .filter(w => w.reason.startsWith('Transaction:'))
      .reduce((total, withdrawal) => total + withdrawal.amount, 0);
  }

  /**
   * Calculate total income from income transactions
   */
  static calculateTotalIncome(db: DB): number {
    return db.transactions
      .filter(t => t.type === 'income')
      .reduce((total, transaction) => total + transaction.amount, 0);
  }

  /**
   * Calculate available revenue for re-investment
   * Includes income transactions which add to available funds
   */
  static calculateAvailableRevenue(db: DB): number {
    const totalRevenue = this.calculateTotalRevenue(db);
    const totalIncome = this.calculateTotalIncome(db);
    const totalWithdrawn = this.calculateTotalWithdrawn(db);
    return Math.max(0, totalRevenue + totalIncome - totalWithdrawn);
  }

  /**
   * Validate if a revenue withdrawal is possible
   */
  static canWithdrawRevenue(db: DB, amount: number): boolean {
    if (amount <= 0) return false;
    const available = this.calculateAvailableRevenue(db);
    return amount <= available;
  }

  /**
   * Create a revenue withdrawal for a purchase
   */
  static createRevenueWithdrawal(
    amount: number,
    reason: string,
    linkedPurchaseId?: string,
    notes?: string
  ): RevenueWithdrawal {
    return {
      id: uid(),
      amount,
      reason,
      withdrawnAt: nowIso(),
      linkedPurchaseId,
      notes,
    };
  }

  /**
   * Calculate payment breakdown for a purchase using revenue
   */
  static calculatePaymentBreakdown(
    totalCost: number,
    revenueToUse: number
  ): {
    revenueUsed: number;
    externalPayment: number;
    paymentSource: PaymentSource;
  } {
    const clampedRevenueUsed = Math.max(0, Math.min(revenueToUse, totalCost));
    const externalPayment = totalCost - clampedRevenueUsed;

    let paymentSource: PaymentSource;
    if (clampedRevenueUsed === 0) {
      paymentSource = 'external';
    } else if (externalPayment === 0) {
      paymentSource = 'revenue';
    } else {
      paymentSource = 'mixed';
    }

    return {
      revenueUsed: clampedRevenueUsed,
      externalPayment,
      paymentSource,
    };
  }

  /**
   * Process a purchase with revenue re-investment
   */
  static processPurchaseWithRevenue(
    db: DB,
    purchase: Purchase,
    revenueToUse: number,
    withdrawalReason: string,
    withdrawalNotes?: string
  ): {
    updatedDb: DB;
    withdrawal: RevenueWithdrawal | null;
    paymentBreakdown: ReturnType<typeof RevenueService.calculatePaymentBreakdown>;
  } {
    // Validate revenue availability
    if (!this.canWithdrawRevenue(db, revenueToUse)) {
      throw new Error('Insufficient revenue available for withdrawal');
    }

    // Calculate payment breakdown
    const paymentBreakdown = this.calculatePaymentBreakdown(purchase.totalCost, revenueToUse);

    // Create withdrawal if revenue is used
    let withdrawal: RevenueWithdrawal | null = null;
    let updatedWithdrawals = db.revenueWithdrawals;

    if (paymentBreakdown.revenueUsed > 0) {
      withdrawal = this.createRevenueWithdrawal(
        paymentBreakdown.revenueUsed,
        withdrawalReason,
        purchase.id,
        withdrawalNotes
      );
      updatedWithdrawals = [...db.revenueWithdrawals, withdrawal];
    }

    // Update purchase with payment information
    const updatedPurchase: Purchase = {
      ...purchase,
      revenueUsed: paymentBreakdown.revenueUsed,
      paymentSource: paymentBreakdown.paymentSource,
    };

    // Update purchases array
    const updatedPurchases = db.purchases.map(p => (p.id === purchase.id ? updatedPurchase : p));

    const updatedDb: DB = {
      ...db,
      purchases: updatedPurchases,
      revenueWithdrawals: updatedWithdrawals,
    };

    return {
      updatedDb,
      withdrawal,
      paymentBreakdown,
    };
  }

  /**
   * Process a transaction that uses revenue as payment source
   * Income transactions don't require withdrawal - they add to revenue
   */
  static processTransactionWithRevenue(
    db: DB,
    transaction: Transaction
  ): {
    updatedDb: DB;
    withdrawals: RevenueWithdrawal[];
    error?: string;
  } {
    const withdrawals: RevenueWithdrawal[] = [];

    // Income transactions add to revenue and don't need withdrawals
    if (transaction.type === 'income') {
      return {
        updatedDb: db,
        withdrawals: [],
      };
    }

    // Calculate revenue amounts to withdraw (for expenses/fees only)
    let revenueToWithdraw = 0;

    if (transaction.paymentSource === 'revenue') {
      revenueToWithdraw = transaction.amount;
    } else if (transaction.paymentSource === 'mixed' && transaction.revenueAmount) {
      revenueToWithdraw = transaction.revenueAmount;
    }

    // Validate revenue availability
    if (revenueToWithdraw > 0) {
      if (!this.canWithdrawRevenue(db, revenueToWithdraw)) {
        const available = this.calculateAvailableRevenue(db);
        return {
          updatedDb: db,
          withdrawals: [],
          error: `Insufficient revenue available. Need ${revenueToWithdraw.toFixed(2)}, but only ${available.toFixed(2)} available.`,
        };
      }

      // Create withdrawal record
      const withdrawal = this.createRevenueWithdrawal(
        revenueToWithdraw,
        `Transaction: ${transaction.description}`,
        undefined, // no linked purchase for transactions
        `${transaction.type} - ${transaction.category}`
      );

      withdrawals.push(withdrawal);
    }

    const updatedDb: DB = {
      ...db,
      revenueWithdrawals:
        revenueToWithdraw > 0 ? [...db.revenueWithdrawals, ...withdrawals] : db.revenueWithdrawals,
    };

    return {
      updatedDb,
      withdrawals,
    };
  }

  /**
   * Get revenue statistics for analytics
   */
  static getRevenueStats(db: DB) {
    const totalRevenue = this.calculateTotalRevenue(db);
    const totalWithdrawn = this.calculateTotalWithdrawn(db);
    const availableRevenue = this.calculateAvailableRevenue(db);

    const revenueUtilizationRate = totalRevenue > 0 ? (totalWithdrawn / totalRevenue) * 100 : 0;

    // Calculate monthly stats
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const monthlyWithdrawals = db.revenueWithdrawals
      .filter(w => w.withdrawnAt.startsWith(currentMonth))
      .reduce((total, w) => total + w.amount, 0);

    return {
      totalRevenue,
      totalWithdrawn,
      availableRevenue,
      revenueUtilizationRate,
      monthlyWithdrawals,
      withdrawalCount: db.revenueWithdrawals.length,
    };
  }
}
