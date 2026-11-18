import { describe, expect, it } from 'vitest';
import {
  legacyMoneyMigrationPatch,
  moneyDocumentFromFirestore,
  moneyDocumentToFirestore,
} from '@/lib/firebase/moneyStorage';

describe('Firestore rupee storage', () => {
  it('stores customer credit limits in rupees and restores paise for calculations', () => {
    const stored = moneyDocumentToFirestore('customers', { creditLimit: 125050 });
    expect(stored).toMatchObject({ creditLimit: 1250.5, moneyUnit: 'INR' });
    expect(moneyDocumentFromFirestore('customers', stored)).toMatchObject({ creditLimit: 125050 });
  });

  it('converts every money field for fruits, sales, and bill history', () => {
    expect(moneyDocumentToFirestore('payments', { amount: 500000 })).toMatchObject({
      amount: 5000,
      amountUnit: 'INR',
      moneyUnit: 'INR',
    });

    expect(moneyDocumentToFirestore('fruits', {
      defaultRatePerKg: 1999,
      defaultDeliveryCharge: 5050,
    })).toMatchObject({ defaultRatePerKg: 19.99, defaultDeliveryCharge: 50.5 });

    expect(moneyDocumentFromFirestore('sales', {
      ratePerKg: 23.45,
      deliveryCharge: 2.5,
      moneyUnit: 'INR',
    })).toMatchObject({ ratePerKg: 2345, deliveryCharge: 250 });

    expect(moneyDocumentToFirestore('billHistory', {
      totalPurchases: 125000,
      totalDelivery: 1500,
      totalPaid: 25000,
      pendingAmount: 101500,
    })).toMatchObject({
      totalPurchases: 1250,
      totalDelivery: 15,
      totalPaid: 250,
      pendingAmount: 1015,
    });
  });

  it('keeps legacy paise values readable and produces a one-time rupee migration patch', () => {
    const legacy = { amount: 500000 };
    expect(moneyDocumentFromFirestore('payments', legacy)).toEqual(legacy);
    expect(legacyMoneyMigrationPatch('payments', legacy)).toEqual({
      moneyUnit: 'INR',
      amount: 5000,
      amountUnit: 'INR',
    });
    expect(legacyMoneyMigrationPatch('payments', { amount: 5000, amountUnit: 'INR' }))
      .toEqual({ moneyUnit: 'INR', amount: 5000, amountUnit: 'INR' });
    expect(legacyMoneyMigrationPatch('payments', {
      amount: 5000,
      amountUnit: 'INR',
      moneyUnit: 'INR',
    })).toBeNull();
  });
});
