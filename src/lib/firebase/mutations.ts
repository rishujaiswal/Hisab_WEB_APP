// ============================================================
// Firestore mutation helpers — write operations
// ============================================================

import {
  doc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import type {
  Customer,
  Fruit,
  SaleEntry,
  Payment,
  BillHistory,
  CustomerType,
  PaymentMode,
} from '@/lib/types';
import { getDateKey } from '@/lib/domain/date';
import { toPaise } from '@/lib/domain/money';
import { v4 as uuidv4 } from 'uuid';

function db() {
  const d = getFirebaseDb();
  if (!d) throw new Error('Firestore not initialized');
  return d;
}

// ------ Customer mutations ------

export async function saveCustomer(
  ownerId: string,
  data: {
    name: string;
    phoneNumber: string;
    whatsappNumber: string;
    shopName: string;
    address: string;
    customerType: CustomerType;
    creditLimit: number; // paise
    notes: string;
  },
  existingId?: string
): Promise<Customer> {
  const now = Timestamp.now();
  const id = existingId || uuidv4();
  const ref = doc(db(), 'customers', id);

  const customer: Customer = {
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
    createdAt: existingId ? now : now, // Will be overridden for existing
    updatedAt: now,
  };

  if (existingId) {
    // Preserve createdAt and isActive from existing
    await updateDoc(ref, {
      name: data.name,
      phoneNumber: data.phoneNumber,
      whatsappNumber: data.whatsappNumber || data.phoneNumber,
      shopName: data.shopName,
      address: data.address,
      customerType: data.customerType,
      creditLimit: data.creditLimit,
      notes: data.notes,
      updatedAt: now,
    });
  } else {
    await setDoc(ref, customer);
  }

  return customer;
}

export async function toggleCustomerActive(
  customerId: string,
  isActive: boolean
): Promise<void> {
  await updateDoc(doc(db(), 'customers', customerId), {
    isActive,
    updatedAt: Timestamp.now(),
  });
}

// ------ Fruit mutations ------

export async function saveFruit(
  ownerId: string,
  data: {
    name: string;
    isActive: boolean;
    defaultWeightPerCrate: number;
    defaultRatePerKg: number; // paise
    defaultDeliveryCharge: number; // paise
  },
  existingId?: string
): Promise<Fruit> {
  const now = Timestamp.now();
  const id = existingId || uuidv4();
  const ref = doc(db(), 'fruits', id);

  const fruit: Fruit = {
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

  if (existingId) {
    await updateDoc(ref, {
      name: data.name,
      isActive: data.isActive,
      defaultWeightPerCrate: data.defaultWeightPerCrate,
      defaultRatePerKg: data.defaultRatePerKg,
      defaultDeliveryCharge: data.defaultDeliveryCharge,
      updatedAt: now,
    });
  } else {
    await setDoc(ref, fruit);
  }

  return fruit;
}

export async function deleteFruit(fruitId: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db(), 'fruits', fruitId));
}

// ------ Sale mutations ------

export async function saveSale(
  ownerId: string,
  data: {
    customerId: string;
    customerName: string;
    fruitId: string;
    fruitName: string;
    date: Date;
    crates: number;
    weightPerCrate: number;
    ratePerKg: number; // paise
    deliveryCharge: number; // paise
    notes: string;
  },
  timezone: string = 'Asia/Kolkata',
  existingId?: string
): Promise<SaleEntry> {
  const now = Timestamp.now();
  const id = existingId || uuidv4();
  const ref = doc(db(), 'sales', id);
  const dateKey = getDateKey(data.date, timezone);

  const sale: SaleEntry = {
    id,
    ownerId,
    customerId: data.customerId,
    customerName: data.customerName,
    fruitId: data.fruitId,
    fruitName: data.fruitName,
    date: Timestamp.fromDate(data.date),
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

  if (existingId) {
    await updateDoc(ref, {
      customerId: data.customerId,
      customerName: data.customerName,
      fruitId: data.fruitId,
      fruitName: data.fruitName,
      date: Timestamp.fromDate(data.date),
      dateKey,
      crates: data.crates,
      weightPerCrate: data.weightPerCrate,
      ratePerKg: data.ratePerKg,
      deliveryCharge: data.deliveryCharge,
      notes: data.notes,
      updatedAt: now,
    });
  } else {
    await setDoc(ref, sale);
  }

  return sale;
}

export async function voidSale(
  saleId: string,
  reason: string
): Promise<void> {
  await updateDoc(doc(db(), 'sales', saleId), {
    isVoided: true,
    voidedAt: Timestamp.now(),
    notes: reason,
    updatedAt: Timestamp.now(),
  });
}

// ------ Payment mutations ------

export async function savePayment(
  ownerId: string,
  data: {
    customerId: string;
    customerName: string;
    amount: number; // paise
    paymentMode: PaymentMode;
    date: Date;
    note: string;
  },
  timezone: string = 'Asia/Kolkata',
  existingId?: string
): Promise<Payment> {
  const now = Timestamp.now();
  const id = existingId || uuidv4();
  const ref = doc(db(), 'payments', id);
  const dateKey = getDateKey(data.date, timezone);

  const payment: Payment = {
    id,
    ownerId,
    customerId: data.customerId,
    customerName: data.customerName,
    amount: data.amount,
    paymentMode: data.paymentMode,
    date: Timestamp.fromDate(data.date),
    dateKey,
    note: data.note,
    isVoided: false,
    voidedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  if (existingId) {
    await updateDoc(ref, {
      amount: data.amount,
      paymentMode: data.paymentMode,
      date: Timestamp.fromDate(data.date),
      dateKey,
      note: data.note,
      updatedAt: now,
    });
  } else {
    await setDoc(ref, payment);
  }

  return payment;
}

export async function voidPayment(
  paymentId: string,
  reason: string
): Promise<void> {
  await updateDoc(doc(db(), 'payments', paymentId), {
    isVoided: true,
    voidedAt: Timestamp.now(),
    note: reason,
    updatedAt: Timestamp.now(),
  });
}

// ------ Bill History mutations ------

export async function saveBillHistory(
  ownerId: string,
  data: {
    customerId: string;
    customerName: string;
    billType: 'today' | 'weekly' | 'monthly';
    dateFrom: string;
    dateTo: string;
    totalPurchases: number;
    totalDelivery: number;
    totalPaid: number;
    pendingAmount: number;
    sentVia: 'WhatsApp' | 'PDF' | 'manual';
  }
): Promise<BillHistory> {
  const now = Timestamp.now();
  const id = uuidv4();
  const ref = doc(db(), 'billHistory', id);

  const history: BillHistory = {
    id,
    ownerId,
    ...data,
    sentAt: now,
    createdAt: now,
  };

  await setDoc(ref, history);
  return history;
}
