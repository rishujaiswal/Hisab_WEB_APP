// ============================================================
// Hisab Web App — Core Type Definitions
// Aligned with iOS app Firestore field names
// ============================================================

import { Timestamp } from 'firebase/firestore';

// ------ Enums / Unions ------

export type CustomerType = 'Retail' | 'Wholesale';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank';
export type BillType = 'today' | 'weekly' | 'monthly';
export type SentVia = 'WhatsApp' | 'PDF' | 'manual';

// 1 = Sunday, 2 = Monday, ..., 7 = Saturday (matches iOS)
export type WeeklyStartDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// ------ Firestore Documents ------

export interface Customer {
  id: string;
  ownerId: string;
  name: string;
  phoneNumber: string;
  whatsappNumber: string;
  address: string;
  shopName: string;
  customerType: CustomerType;
  creditLimit: number; // in paise, 0 = no limit
  notes: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Fruit {
  id: string;
  ownerId: string;
  name: string;
  defaultWeightPerCrate: number; // kg (float)
  defaultRatePerKg: number; // paise
  defaultDeliveryCharge: number; // paise
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SaleEntry {
  id: string;
  ownerId: string;
  customerId: string;
  customerName: string;
  fruitId: string;
  fruitName: string;
  date: Timestamp;
  dateKey: string; // YYYY-MM-DD in shop timezone
  crates: number;
  weightPerCrate: number; // kg
  ratePerKg: number; // paise
  deliveryCharge: number; // paise
  notes: string;
  isVoided: boolean;
  voidedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Payment {
  id: string;
  ownerId: string;
  customerId: string;
  customerName: string;
  amount: number; // paise
  paymentMode: PaymentMode;
  date: Timestamp;
  dateKey: string; // YYYY-MM-DD in shop timezone
  note: string;
  isVoided: boolean;
  voidedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BillHistory {
  id: string;
  ownerId: string;
  customerId: string;
  customerName: string;
  billType: BillType;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  totalPurchases: number; // paise
  totalDelivery: number; // paise
  totalPaid: number; // paise
  pendingAmount: number; // paise
  sentAt: Timestamp;
  sentVia: SentVia;
  createdAt: Timestamp;
}

export interface AppSettings {
  id: string;
  ownerId: string;
  ownerName: string;
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  whatsappNumber: string;
  weeklyStartDay: WeeklyStartDay;
  timezone: string; // e.g. 'Asia/Kolkata'
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ------ Computed / Display Types ------

export interface CustomerWithBalance extends Customer {
  totalSales: number; // paise
  totalPayments: number; // paise
  pendingBalance: number; // paise (positive = owes, negative = credit)
}

export interface BillSummary {
  openingBalance: number; // paise
  fruitTotal: number; // paise (sum of itemAmounts)
  deliveryTotal: number; // paise
  currentBill: number; // paise (fruitTotal + deliveryTotal)
  periodPaid: number; // paise
  periodPending: number; // paise (currentBill - periodPaid)
  totalPending: number; // paise (openingBalance + periodPending)
}

export interface BillPreviewData {
  shop: AppSettings;
  customer: Customer;
  billType: BillType;
  periodLabel: string;
  dateFrom: string;
  dateTo: string;
  sales: SaleEntry[];
  payments: Payment[];
  summary: BillSummary;
}

export interface DashboardStats {
  todaySales: number; // paise
  todayCollections: number; // paise
  totalPending: number; // paise
  totalCustomers: number;
}

// ------ Sale computed helpers ------

export interface SaleAmounts {
  itemAmount: number; // paise: crates × weightPerCrate × ratePerKg
  totalAmount: number; // paise: itemAmount + deliveryCharge
}

// ------ Ledger entry (merged sales + payments) ------

export type LedgerEntry =
  | { type: 'sale'; data: SaleEntry; runningBalance: number }
  | { type: 'payment'; data: Payment; runningBalance: number };
