// ============================================================
// Demo Store — client-side in-memory / localStorage fallback
// Activated when IS_DEMO_MODE is true (Firebase credentials omitted)
// ============================================================

import type {
  Customer,
  Fruit,
  SaleEntry,
  Payment,
  BillHistory,
  AppSettings,
  CustomerType,
  PaymentMode,
  BillType,
  SentVia,
} from '@/lib/types';
import { getDateKey } from '@/lib/domain/date';
import { v4 as uuidv4 } from 'uuid';

export const DEMO_OWNER_ID = 'demo_owner_123';

export const DEMO_USER = {
  uid: DEMO_OWNER_ID,
  email: 'demo@hisab.app',
  displayName: 'Demo Shopkeeper',
  phoneNumber: '+919876543210',
};

const STORAGE_KEYS = {
  USER_LOGGED_IN: 'hisab_demo_user_active',
  SETTINGS: 'hisab_demo_settings',
  CUSTOMERS: 'hisab_demo_customers',
  FRUITS: 'hisab_demo_fruits',
  SALES: 'hisab_demo_sales',
  PAYMENTS: 'hisab_demo_payments',
  BILL_HISTORY: 'hisab_demo_bill_history',
};

function createTimestamp(date: Date = new Date()) {
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1000000,
    toDate: () => date,
  } as any;
}

// In-memory fallback map for Node/SSR/testing environments
const memoryStore = new Map<string, any>();

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hisab-demo-store-change'));
  }
}

function getStored<T>(key: string, defaultValue: T): T {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        memoryStore.set(key, parsed);
        return parsed;
      }
    } catch {
      // Fall through to memoryStore
    }
  }

  if (memoryStore.has(key)) {
    return memoryStore.get(key) as T;
  }

  return defaultValue;
}

function setStored<T>(key: string, value: T): void {
  memoryStore.set(key, value);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('Failed to write to demo localStorage:', err);
    }
  }
}

export function resetDemoStore(): void {
  memoryStore.clear();
  if (typeof window !== 'undefined') {
    try {
      localStorage.clear();
    } catch {}
  }
  notifyChange();
}

// ------ Auth ------

export function isDemoUserLoggedIn(): boolean {
  return getStored<boolean>(STORAGE_KEYS.USER_LOGGED_IN, false);
}

export function setDemoUserLoggedIn(active: boolean): void {
  setStored(STORAGE_KEYS.USER_LOGGED_IN, active);
  notifyChange();
}

// ------ Settings ------

export function getDemoSettings(): AppSettings | null {
  const settings = getStored<AppSettings | null>(STORAGE_KEYS.SETTINGS, null);
  return settings;
}

export function saveDemoSettings(data: Partial<AppSettings>): AppSettings {
  const current = getDemoSettings();
  const updated: AppSettings = {
    id: DEMO_OWNER_ID,
    ownerId: DEMO_OWNER_ID,
    ownerName: data.ownerName ?? current?.ownerName ?? '',
    shopName: data.shopName ?? current?.shopName ?? '',
    shopAddress: data.shopAddress ?? current?.shopAddress ?? '',
    shopPhone: data.shopPhone ?? current?.shopPhone ?? '',
    whatsappNumber: data.whatsappNumber ?? current?.whatsappNumber ?? '',
    weeklyStartDay: data.weeklyStartDay || current?.weeklyStartDay || 1,
    timezone: data.timezone || current?.timezone || 'Asia/Kolkata',
    createdAt: current?.createdAt || createTimestamp(),
    updatedAt: createTimestamp(),
  };
  setStored(STORAGE_KEYS.SETTINGS, updated);
  notifyChange();
  return updated;
}

// ------ Customers ------

export function getDemoCustomers(): Customer[] {
  return getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
}

export function saveDemoCustomer(
  ownerId: string,
  data: {
    name: string;
    phoneNumber: string;
    whatsappNumber: string;
    shopName: string;
    address: string;
    customerType: CustomerType;
    creditLimit: number;
    notes: string;
  },
  existingId?: string
): Customer {
  const list = [...getDemoCustomers()];
  const id = existingId || uuidv4();
  const now = createTimestamp();

  if (existingId) {
    const idx = list.findIndex((c) => c.id === existingId);
    if (idx >= 0) {
      const existing = list[idx];
      const updated: Customer = {
        ...existing,
        name: data.name,
        phoneNumber: data.phoneNumber,
        whatsappNumber: data.whatsappNumber || data.phoneNumber,
        shopName: data.shopName,
        address: data.address,
        customerType: data.customerType,
        creditLimit: data.creditLimit,
        notes: data.notes,
        updatedAt: now,
      };
      list[idx] = updated;
      setStored(STORAGE_KEYS.CUSTOMERS, list);
      notifyChange();
      return updated;
    }
  }

  const newCust: Customer = {
    id,
    ownerId,
    name: data.name,
    phoneNumber: data.phoneNumber,
    whatsappNumber: data.whatsappNumber || data.phoneNumber,
    shopName: data.shopName,
    address: data.address,
    customerType: data.customerType,
    creditLimit: data.creditLimit,
    notes: data.notes,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  list.push(newCust);
  setStored(STORAGE_KEYS.CUSTOMERS, list);
  notifyChange();
  return newCust;
}

export function toggleDemoCustomerActive(customerId: string, isActive: boolean): void {
  const list = [...getDemoCustomers()];
  const idx = list.findIndex((c) => c.id === customerId);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      isActive,
      updatedAt: createTimestamp(),
    };
    setStored(STORAGE_KEYS.CUSTOMERS, list);
    notifyChange();
  }
}

// ------ Fruits ------

export function getDemoFruits(): Fruit[] {
  return getStored<Fruit[]>(STORAGE_KEYS.FRUITS, []);
}

export function saveDemoFruit(
  ownerId: string,
  data: {
    name: string;
    isActive: boolean;
    defaultWeightPerCrate: number;
    defaultRatePerKg: number;
    defaultDeliveryCharge: number;
  },
  existingId?: string
): Fruit {
  const list = [...getDemoFruits()];
  const id = existingId || uuidv4();
  const now = createTimestamp();

  if (existingId) {
    const idx = list.findIndex((f) => f.id === existingId);
    if (idx >= 0) {
      const updated: Fruit = {
        ...list[idx],
        name: data.name,
        isActive: data.isActive,
        defaultWeightPerCrate: data.defaultWeightPerCrate,
        defaultRatePerKg: data.defaultRatePerKg,
        defaultDeliveryCharge: data.defaultDeliveryCharge,
        updatedAt: now,
      };
      list[idx] = updated;
      setStored(STORAGE_KEYS.FRUITS, list);
      notifyChange();
      return updated;
    }
  }

  const newFruit: Fruit = {
    id,
    ownerId,
    name: data.name,
    isActive: data.isActive,
    defaultWeightPerCrate: data.defaultWeightPerCrate,
    defaultRatePerKg: data.defaultRatePerKg,
    defaultDeliveryCharge: data.defaultDeliveryCharge,
    createdAt: now,
    updatedAt: now,
  };

  list.push(newFruit);
  setStored(STORAGE_KEYS.FRUITS, list);
  notifyChange();
  return newFruit;
}

export function deleteDemoFruit(fruitId: string): void {
  const list = getDemoFruits().filter((f) => f.id !== fruitId);
  setStored(STORAGE_KEYS.FRUITS, list);
  notifyChange();
}

// ------ Sales ------

export function getDemoSales(): SaleEntry[] {
  return getStored<SaleEntry[]>(STORAGE_KEYS.SALES, []);
}

export function saveDemoSale(
  ownerId: string,
  data: {
    customerId: string;
    customerName: string;
    fruitId: string;
    fruitName: string;
    date: Date;
    crates: number;
    weightPerCrate: number;
    ratePerKg: number;
    deliveryCharge: number;
    notes: string;
  },
  timezone: string = 'Asia/Kolkata',
  existingId?: string
): SaleEntry {
  const list = [...getDemoSales()];
  const id = existingId || uuidv4();
  const now = createTimestamp();
  const dateKey = getDateKey(data.date, timezone);

  if (existingId) {
    const idx = list.findIndex((s) => s.id === existingId);
    if (idx >= 0) {
      const updated: SaleEntry = {
        ...list[idx],
        customerId: data.customerId,
        customerName: data.customerName,
        fruitId: data.fruitId,
        fruitName: data.fruitName,
        date: createTimestamp(data.date),
        dateKey,
        crates: data.crates,
        weightPerCrate: data.weightPerCrate,
        ratePerKg: data.ratePerKg,
        deliveryCharge: data.deliveryCharge,
        notes: data.notes,
        updatedAt: now,
      };
      list[idx] = updated;
      setStored(STORAGE_KEYS.SALES, list);
      notifyChange();
      return updated;
    }
  }

  const newSale: SaleEntry = {
    id,
    ownerId,
    customerId: data.customerId,
    customerName: data.customerName,
    fruitId: data.fruitId,
    fruitName: data.fruitName,
    date: createTimestamp(data.date),
    dateKey,
    crates: data.crates,
    weightPerCrate: data.weightPerCrate,
    ratePerKg: data.ratePerKg,
    deliveryCharge: data.deliveryCharge,
    notes: data.notes,
    isVoided: false,
    voidedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  list.push(newSale);
  setStored(STORAGE_KEYS.SALES, list);
  notifyChange();
  return newSale;
}

export function voidDemoSale(saleId: string, _reason: string): void {
  const list = [...getDemoSales()];
  const idx = list.findIndex((s) => s.id === saleId);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      isVoided: true,
      voidedAt: createTimestamp(),
      updatedAt: createTimestamp(),
    };
    setStored(STORAGE_KEYS.SALES, list);
    notifyChange();
  }
}

// ------ Payments ------

export function getDemoPayments(): Payment[] {
  return getStored<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
}

export function saveDemoPayment(
  ownerId: string,
  data: {
    customerId: string;
    customerName: string;
    amount: number;
    paymentMode: PaymentMode;
    date: Date;
    note: string;
  },
  timezone: string = 'Asia/Kolkata',
  existingId?: string
): Payment {
  const list = [...getDemoPayments()];
  const id = existingId || uuidv4();
  const now = createTimestamp();
  const dateKey = getDateKey(data.date, timezone);

  if (existingId) {
    const idx = list.findIndex((p) => p.id === existingId);
    if (idx >= 0) {
      const updated: Payment = {
        ...list[idx],
        customerId: data.customerId,
        customerName: data.customerName,
        amount: data.amount,
        paymentMode: data.paymentMode,
        date: createTimestamp(data.date),
        dateKey,
        note: data.note,
        updatedAt: now,
      };
      list[idx] = updated;
      setStored(STORAGE_KEYS.PAYMENTS, list);
      notifyChange();
      return updated;
    }
  }

  const newPayment: Payment = {
    id,
    ownerId,
    customerId: data.customerId,
    customerName: data.customerName,
    amount: data.amount,
    paymentMode: data.paymentMode,
    date: createTimestamp(data.date),
    dateKey,
    note: data.note,
    isVoided: false,
    voidedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  list.push(newPayment);
  setStored(STORAGE_KEYS.PAYMENTS, list);
  notifyChange();
  return newPayment;
}

export function voidDemoPayment(paymentId: string, _reason: string): void {
  const list = [...getDemoPayments()];
  const idx = list.findIndex((p) => p.id === paymentId);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      isVoided: true,
      voidedAt: createTimestamp(),
      updatedAt: createTimestamp(),
    };
    setStored(STORAGE_KEYS.PAYMENTS, list);
    notifyChange();
  }
}

// ------ Bill History ------

export function getDemoBillHistory(customerId?: string): BillHistory[] {
  const all = getStored<BillHistory[]>(STORAGE_KEYS.BILL_HISTORY, []);
  if (customerId) {
    return all.filter((b) => b.customerId === customerId);
  }
  return all;
}

export function saveDemoBillHistory(
  ownerId: string,
  data: {
    customerId: string;
    customerName: string;
    billType: BillType;
    dateFrom: string;
    dateTo: string;
    totalPurchases: number;
    totalDelivery: number;
    totalPaid: number;
    pendingAmount: number;
    sentVia: SentVia;
  }
): BillHistory {
  const list = [...getStored<BillHistory[]>(STORAGE_KEYS.BILL_HISTORY, [])];
  const now = createTimestamp();
  const id = uuidv4();

  const newHistory: BillHistory = {
    id,
    ownerId,
    ...data,
    sentAt: now,
    createdAt: now,
  };

  list.push(newHistory);
  setStored(STORAGE_KEYS.BILL_HISTORY, list);
  notifyChange();
  return newHistory;
}
