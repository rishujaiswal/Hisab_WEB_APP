// ============================================================
// Bill calculation — opening balance, period summaries
// ============================================================

import type { SaleEntry, Payment, BillSummary } from '@/lib/types';
import { calcItemAmount, calcTotalAmount } from './money';
import { isDateKeyInRange, isDateKeyBefore } from './date';

/**
 * Get the item amount for a sale in paise.
 * itemAmount = crates × weightPerCrate × ratePerKg
 */
export function getSaleItemAmount(sale: SaleEntry): number {
  return calcItemAmount(sale.crates, sale.weightPerCrate, sale.ratePerKg);
}

/**
 * Get the total amount for a sale in paise.
 * totalAmount = itemAmount + deliveryCharge
 */
export function getSaleTotalAmount(sale: SaleEntry): number {
  const itemAmount = getSaleItemAmount(sale);
  return calcTotalAmount(itemAmount, sale.deliveryCharge);
}

/**
 * Filter out voided entries.
 */
function activeOnly<T extends { isVoided: boolean }>(entries: T[]): T[] {
  return entries.filter((e) => !e.isVoided);
}

/**
 * Calculate total sales amount (including delivery) for a set of sales.
 */
export function totalSalesAmount(sales: SaleEntry[]): number {
  return activeOnly(sales).reduce((sum, s) => sum + getSaleTotalAmount(s), 0);
}

/**
 * Calculate total payments amount for a set of payments.
 */
export function totalPaymentsAmount(payments: Payment[]): number {
  return activeOnly(payments).reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Calculate customer balance: sales − payments.
 * Positive = customer owes; Negative = customer has credit.
 */
export function calcCustomerBalance(
  sales: SaleEntry[],
  payments: Payment[]
): number {
  return totalSalesAmount(sales) - totalPaymentsAmount(payments);
}

/**
 * Calculate a full bill summary for a customer and period.
 *
 * @param allSales - All non-voided sales for this customer
 * @param allPayments - All non-voided payments for this customer
 * @param periodStartKey - Period start dateKey (inclusive)
 * @param periodEndKey - Period end dateKey (inclusive)
 */
export function calcBillSummary(
  allSales: SaleEntry[],
  allPayments: Payment[],
  periodStartKey: string,
  periodEndKey: string
): BillSummary {
  const sales = activeOnly(allSales);
  const payments = activeOnly(allPayments);

  // Pre-period: everything before periodStartKey
  const prePeriodSales = sales.filter((s) =>
    isDateKeyBefore(s.dateKey, periodStartKey)
  );
  const prePeriodPayments = payments.filter((p) =>
    isDateKeyBefore(p.dateKey, periodStartKey)
  );

  const openingBalance =
    totalSalesAmount(prePeriodSales) - totalPaymentsAmount(prePeriodPayments);

  // In-period sales
  const periodSales = sales.filter((s) =>
    isDateKeyInRange(s.dateKey, periodStartKey, periodEndKey)
  );
  const periodPayments = payments.filter((p) =>
    isDateKeyInRange(p.dateKey, periodStartKey, periodEndKey)
  );

  const fruitTotal = periodSales.reduce(
    (sum, s) => sum + getSaleItemAmount(s),
    0
  );
  const deliveryTotal = periodSales.reduce(
    (sum, s) => sum + s.deliveryCharge,
    0
  );
  const currentBill = fruitTotal + deliveryTotal;
  const periodPaid = totalPaymentsAmount(periodPayments);
  const periodPending = currentBill - periodPaid;
  const totalPending = openingBalance + periodPending;

  return {
    openingBalance,
    fruitTotal,
    deliveryTotal,
    currentBill,
    periodPaid,
    periodPending,
    totalPending,
  };
}

/**
 * Build a ledger (merged sales + payments) sorted chronologically.
 * Returns entries newest-first with running balance.
 * Running balance is computed chronologically (oldest first),
 * then the array is reversed for display (newest first).
 */
export function buildLedger(
  sales: SaleEntry[],
  payments: Payment[]
): Array<{
  type: 'sale' | 'payment';
  data: SaleEntry | Payment;
  runningBalance: number;
  dateKey: string;
  timestamp: number;
}> {
  const activeSales = activeOnly(sales);
  const activePayments = activeOnly(payments);

  type Entry = {
    type: 'sale' | 'payment';
    data: SaleEntry | Payment;
    dateKey: string;
    timestamp: number;
    amount: number; // positive = debit (sale), negative = credit (payment)
  };

  const entries: Entry[] = [
    ...activeSales.map((s) => ({
      type: 'sale' as const,
      data: s,
      dateKey: s.dateKey,
      timestamp: s.createdAt?.toMillis?.() ?? 0,
      amount: getSaleTotalAmount(s),
    })),
    ...activePayments.map((p) => ({
      type: 'payment' as const,
      data: p,
      dateKey: p.dateKey,
      timestamp: p.createdAt?.toMillis?.() ?? 0,
      amount: -p.amount,
    })),
  ];

  // Sort chronologically (oldest first) for running balance
  entries.sort((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
    return a.timestamp - b.timestamp;
  });

  // Compute running balance
  let balance = 0;
  const withBalance = entries.map((e) => {
    balance += e.amount;
    return { ...e, runningBalance: balance };
  });

  // Reverse for display (newest first)
  withBalance.reverse();

  return withBalance;
}
