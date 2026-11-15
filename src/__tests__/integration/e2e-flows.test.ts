// ============================================================
// Comprehensive End-to-End User Flow & Integration Tests
// Validates: Auth, Setup, Customers, Fruits, Sales, Payments,
// Ledgers, Period Statements, Voiding, Bill History, Settings
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import * as demoStore from '@/lib/demo/demoStore';
import {
  calcItemAmount,
  calcTotalAmount,
  calcCustomerBalance,
  calcBillSummary,
  buildLedger,
  toPaise,
  formatINR,
  getPendingColorClass,
} from '@/lib/domain';

describe('End-to-End User Flows & System Audit', () => {
  beforeEach(() => {
    // Reset demo storage before each test
    demoStore.resetDemoStore();
  });

  describe('1. Authentication & Onboarding Flow', () => {
    it('initializes demo user and allows login and logout', () => {
      // Default: logged in
      expect(demoStore.isDemoUserLoggedIn()).toBe(true);
      expect(demoStore.DEMO_USER.uid).toBe('demo_owner_123');

      // Logout
      demoStore.setDemoUserLoggedIn(false);
      expect(demoStore.isDemoUserLoggedIn()).toBe(false);

      // Login
      demoStore.setDemoUserLoggedIn(true);
      expect(demoStore.isDemoUserLoggedIn()).toBe(true);
    });

    it('saves shop onboarding details and computes setup completeness', () => {
      const settings = demoStore.saveDemoSettings({
        ownerName: 'Ramesh Kumar',
        shopName: 'Ramesh Produce',
        shopPhone: '9876543210',
        shopAddress: 'APMC Market Vashi',
        weeklyStartDay: 1, // Sunday
      });

      expect(settings.ownerName).toBe('Ramesh Kumar');
      expect(settings.shopName).toBe('Ramesh Produce');
      expect(settings.weeklyStartDay).toBe(1);

      const isComplete = Boolean(
        settings.ownerName && settings.shopName && settings.shopPhone
      );
      expect(isComplete).toBe(true);
    });
  });

  describe('2. Produce Items (Fruits) Management', () => {
    it('provides initial produce items and supports adding custom fruits', () => {
      const fruits = demoStore.getDemoFruits();
      expect(fruits.length).toBeGreaterThanOrEqual(3);

      const newFruit = demoStore.saveDemoFruit('demo_owner_123', {
        name: 'Nagpur Orange',
        isActive: true,
        defaultWeightPerCrate: 20,
        defaultRatePerKg: toPaise(45), // ₹45/kg
        defaultDeliveryCharge: toPaise(25), // ₹25
      });

      expect(newFruit.name).toBe('Nagpur Orange');
      expect(newFruit.defaultWeightPerCrate).toBe(20);
      expect(newFruit.defaultRatePerKg).toBe(4500);

      // Edit fruit
      const updatedFruit = demoStore.saveDemoFruit(
        'demo_owner_123',
        {
          name: 'Nagpur Sweet Orange',
          isActive: true,
          defaultWeightPerCrate: 22,
          defaultRatePerKg: toPaise(50),
          defaultDeliveryCharge: toPaise(30),
        },
        newFruit.id
      );

      expect(updatedFruit.name).toBe('Nagpur Sweet Orange');
      expect(updatedFruit.defaultWeightPerCrate).toBe(22);

      // Delete fruit with 0 sales
      demoStore.deleteDemoFruit(newFruit.id);
      const remaining = demoStore.getDemoFruits();
      expect(remaining.find((f) => f.id === newFruit.id)).toBeUndefined();
    });
  });

  describe('3. Customer Management & Validation', () => {
    it('creates, edits, deactivates, and reactivates customers', () => {
      const customer = demoStore.saveDemoCustomer('demo_owner_123', {
        name: 'Suresh Patil',
        phoneNumber: '9820012345',
        whatsappNumber: '9820012345',
        shopName: 'Patil General Stores',
        address: 'Sector 17, Vashi',
        customerType: 'Retail',
        creditLimit: toPaise(10000), // ₹10,000 credit limit
        notes: 'Regular buyer',
      });

      expect(customer.name).toBe('Suresh Patil');
      expect(customer.isActive).toBe(true);
      expect(customer.creditLimit).toBe(1000000);

      // Edit customer
      const updated = demoStore.saveDemoCustomer(
        'demo_owner_123',
        {
          name: 'Suresh Patil',
          phoneNumber: '9820012345',
          whatsappNumber: '9820012345',
          shopName: 'Patil Supermarket',
          address: 'Sector 17, Vashi',
          customerType: 'Wholesale',
          creditLimit: toPaise(20000),
          notes: 'Upgraded to wholesale',
        },
        customer.id
      );

      expect(updated.shopName).toBe('Patil Supermarket');
      expect(updated.customerType).toBe('Wholesale');

      // Deactivate customer
      demoStore.toggleDemoCustomerActive(customer.id, false);
      const customersAfterDeactivate = demoStore.getDemoCustomers();
      const deactivated = customersAfterDeactivate.find((c) => c.id === customer.id);
      expect(deactivated?.isActive).toBe(false);

      // Reactivate customer
      demoStore.toggleDemoCustomerActive(customer.id, true);
      const reactivated = demoStore.getDemoCustomers().find((c) => c.id === customer.id);
      expect(reactivated?.isActive).toBe(true);
    });
  });

  describe('4. Full Sales, Payments, and Ledger Workflow (Section 20 Worked Example)', () => {
    it('accurately computes live amounts, customer balance, running ledger, and period statements', () => {
      const customer = demoStore.saveDemoCustomer('demo_owner_123', {
        name: 'Sharma Fruits',
        phoneNumber: '9811122233',
        whatsappNumber: '9811122233',
        shopName: 'Sharma Mart',
        address: 'Market Yard',
        customerType: 'Retail',
        creditLimit: toPaise(20000),
        notes: '',
      });

      const apple = demoStore.getDemoFruits()[0];

      // Step A: Record Sale A (02 Nov 2026): 10 crates × 15 kg × ₹40/kg = ₹6,000 + ₹100 delivery = ₹6,100
      const saleA = demoStore.saveDemoSale(
        'demo_owner_123',
        {
          customerId: customer.id,
          customerName: customer.name,
          fruitId: apple.id,
          fruitName: apple.name,
          date: new Date('2026-11-02T10:00:00+05:30'),
          crates: 10,
          weightPerCrate: 15,
          ratePerKg: toPaise(40),
          deliveryCharge: toPaise(100),
          notes: 'Morning batch',
        },
        'Asia/Kolkata'
      );

      expect(saleA.dateKey).toBe('2026-11-02');
      const itemAmtA = calcItemAmount(saleA.crates, saleA.weightPerCrate, saleA.ratePerKg);
      const totalAmtA = calcTotalAmount(itemAmtA, saleA.deliveryCharge);
      expect(totalAmtA).toBe(610000); // ₹6,100 in paise

      // Verify customer balance after Sale A
      let balance = calcCustomerBalance([saleA], []);
      expect(balance).toBe(610000);
      expect(formatINR(balance)).toBe('₹6,100');

      // Step B: Record Payment A (03 Nov 2026): ₹2,000 via UPI
      const paymentA = demoStore.saveDemoPayment(
        'demo_owner_123',
        {
          customerId: customer.id,
          customerName: customer.name,
          amount: toPaise(2000),
          paymentMode: 'UPI',
          date: new Date('2026-11-03T15:30:00+05:30'),
          note: 'GPay transfer',
        },
        'Asia/Kolkata'
      );

      balance = calcCustomerBalance([saleA], [paymentA]);
      expect(balance).toBe(410000); // ₹4,100 in paise
      expect(formatINR(balance)).toBe('₹4,100');

      // Step C: Record Sale B (09 Nov 2026, Sunday): 4 crates × 15 kg × ₹50/kg = ₹3,000 + ₹0 delivery = ₹3,000
      const saleB = demoStore.saveDemoSale(
        'demo_owner_123',
        {
          customerId: customer.id,
          customerName: customer.name,
          fruitId: apple.id,
          fruitName: apple.name,
          date: new Date('2026-11-09T08:00:00+05:30'),
          crates: 4,
          weightPerCrate: 15,
          ratePerKg: toPaise(50),
          deliveryCharge: toPaise(0),
          notes: 'Sunday delivery',
        },
        'Asia/Kolkata'
      );

      const totalAmtB = calcTotalAmount(
        calcItemAmount(saleB.crates, saleB.weightPerCrate, saleB.ratePerKg),
        saleB.deliveryCharge
      );
      expect(totalAmtB).toBe(300000); // ₹3,000 in paise

      balance = calcCustomerBalance([saleA, saleB], [paymentA]);
      expect(balance).toBe(710000); // ₹7,100 in paise

      // Step D: Record Payment B (11 Nov 2026): ₹1,000 Cash
      const paymentB = demoStore.saveDemoPayment(
        'demo_owner_123',
        {
          customerId: customer.id,
          customerName: customer.name,
          amount: toPaise(1000),
          paymentMode: 'Cash',
          date: new Date('2026-11-11T12:00:00+05:30'),
          note: 'Counter cash',
        },
        'Asia/Kolkata'
      );

      balance = calcCustomerBalance([saleA, saleB], [paymentA, paymentB]);
      expect(balance).toBe(610000); // ₹6,100 in paise

      // Step E: Verify Ledger Running Balances (sorted newest first)
      const ledger = buildLedger([saleA, saleB], [paymentA, paymentB]);
      expect(ledger.length).toBe(4);

      // Chronological order: Sale A (+6100) -> Pay A (-2000 -> 4100) -> Sale B (+3000 -> 7100) -> Pay B (-1000 -> 6100)
      // Newest first:
      expect(ledger[0].type).toBe('payment');
      expect(ledger[0].runningBalance).toBe(610000); // Ending balance after Pay B

      expect(ledger[1].type).toBe('sale');
      expect(ledger[1].runningBalance).toBe(710000); // After Sale B

      expect(ledger[2].type).toBe('payment');
      expect(ledger[2].runningBalance).toBe(410000); // After Pay A

      expect(ledger[3].type).toBe('sale');
      expect(ledger[3].runningBalance).toBe(610000); // After Sale A

      // Step F: Verify Weekly Statement (Sunday 09 Nov to Wednesday 12 Nov 2026)
      const weeklySummary = calcBillSummary(
        [saleA, saleB],
        [paymentA, paymentB],
        '2026-11-09',
        '2026-11-12'
      );

      expect(weeklySummary.openingBalance).toBe(410000); // ₹4,100 from prior week
      expect(weeklySummary.fruitTotal).toBe(300000); // ₹3,000 in this week
      expect(weeklySummary.deliveryTotal).toBe(0);
      expect(weeklySummary.currentBill).toBe(300000);
      expect(weeklySummary.periodPaid).toBe(100000); // ₹1,000 paid this week
      expect(weeklySummary.periodPending).toBe(200000); // ₹2,000
      expect(weeklySummary.totalPending).toBe(610000); // ₹6,100 total debt

      // Debt > ₹5,000 must be formatted with red alert class
      expect(getPendingColorClass(weeklySummary.totalPending)).toBe('text-red-600');

      // Step G: Test Voiding
      demoStore.voidDemoSale(saleB.id, 'Entry duplicate error');
      const salesAfterVoid = demoStore.getDemoSales();
      const nonVoidSales = salesAfterVoid.filter((s) => !s.isVoided);

      // With Sale B voided, total pending drops by ₹3,000: 6,100 - 3,000 = 3,100
      const balanceAfterVoid = calcCustomerBalance(nonVoidSales, [paymentA, paymentB]);
      expect(balanceAfterVoid).toBe(310000); // ₹3,100

      // Step H: Test Overpayment / Customer Credit
      const overpayment = demoStore.saveDemoPayment(
        'demo_owner_123',
        {
          customerId: customer.id,
          customerName: customer.name,
          amount: toPaise(5000), // Pays ₹5,000 on ₹3,100 debt -> -₹1,900 credit
          paymentMode: 'Bank',
          date: new Date('2026-11-12T14:00:00+05:30'),
          note: 'RTGS Advance',
        },
        'Asia/Kolkata'
      );

      const balanceWithCredit = calcCustomerBalance(nonVoidSales, [
        paymentA,
        paymentB,
        overpayment,
      ]);
      expect(balanceWithCredit).toBe(-190000); // -₹1,900
      expect(getPendingColorClass(balanceWithCredit)).toBe('text-green-600');

      // Step I: Record Bill History
      const history = demoStore.saveDemoBillHistory('demo_owner_123', {
        customerId: customer.id,
        customerName: customer.name,
        billType: 'weekly',
        dateFrom: '2026-11-09',
        dateTo: '2026-11-12',
        totalPurchases: weeklySummary.fruitTotal,
        totalDelivery: weeklySummary.deliveryTotal,
        totalPaid: weeklySummary.periodPaid,
        pendingAmount: weeklySummary.totalPending,
        sentVia: 'WhatsApp',
      });

      expect(history.id).toBeDefined();
      expect(history.sentVia).toBe('WhatsApp');

      const retrievedHistory = demoStore.getDemoBillHistory(customer.id);
      expect(retrievedHistory.length).toBe(1);
      expect(retrievedHistory[0].pendingAmount).toBe(610000);
    });
  });
});
