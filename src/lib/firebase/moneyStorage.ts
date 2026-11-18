export type MoneyCollection = 'customers' | 'fruits' | 'sales' | 'payments' | 'billHistory';

const MONEY_FIELDS: Record<MoneyCollection, readonly string[]> = {
  customers: ['creditLimit'],
  fruits: ['defaultRatePerKg', 'defaultDeliveryCharge'],
  sales: ['ratePerKg', 'deliveryCharge'],
  payments: ['amount'],
  billHistory: ['totalPurchases', 'totalDelivery', 'totalPaid', 'pendingAmount'],
};

export function moneyDocumentToFirestore<T extends object>(
  collection: MoneyCollection,
  data: T
): T {
  const rupeeData: Record<string, unknown> = { ...(data as Record<string, unknown>), moneyUnit: 'INR' };
  for (const field of MONEY_FIELDS[collection]) {
    const value = rupeeData[field];
    if (typeof value === 'number') rupeeData[field] = value / 100;
  }
  if (collection === 'payments') rupeeData.amountUnit = 'INR';
  return rupeeData as T;
}

export function moneyDocumentFromFirestore<T extends object>(
  collection: MoneyCollection,
  data: T
): T {
  const record = data as Record<string, unknown>;
  const isStoredInRupees = record.moneyUnit === 'INR' ||
    (collection === 'payments' && record.amountUnit === 'INR');
  if (!isStoredInRupees) return data;

  const paiseData: Record<string, unknown> = { ...record };
  for (const field of MONEY_FIELDS[collection]) {
    const value = paiseData[field];
    if (typeof value === 'number') paiseData[field] = Math.round(value * 100);
  }
  return paiseData as T;
}

/** Creates a transactional migration patch for older paise-valued documents. */
export function legacyMoneyMigrationPatch(
  collection: MoneyCollection,
  data: Record<string, unknown>
): Record<string, unknown> | null {
  if (data.moneyUnit === 'INR') return null;

  const alreadyRupees = collection === 'payments' && data.amountUnit === 'INR';
  const patch: Record<string, unknown> = { moneyUnit: 'INR' };
  for (const field of MONEY_FIELDS[collection]) {
    const value = data[field];
    if (typeof value === 'number') {
      patch[field] = alreadyRupees ? value : value / 100;
    }
  }
  if (collection === 'payments') patch.amountUnit = 'INR';
  return patch;
}
