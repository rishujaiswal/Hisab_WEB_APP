// ============================================================
// Firestore collection references and typed converters
// ============================================================

import {
  collection,
  doc,
  query,
  where,
  orderBy,
  type DocumentData,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  type FirestoreDataConverter,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  type Query,
  type Unsubscribe,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import type {
  Customer,
  Fruit,
  SaleEntry,
  Payment,
  BillHistory,
  AppSettings,
} from '@/lib/types';
import {
  moneyDocumentFromFirestore,
  moneyDocumentToFirestore,
  type MoneyCollection,
} from './moneyStorage';

// ------ Generic converter ------

function createConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T): DocumentData {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = data;
      return rest;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions
    ): T {
      const data = snapshot.data(options);
      return { id: snapshot.id, ...data } as T;
    },
  };
}

// ------ Converters ------

function createMoneyConverter<T extends { id: string }>(
  collectionName: MoneyCollection
): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T): DocumentData {
      const { id, ...rest } = data;
      void id;
      return moneyDocumentToFirestore(collectionName, rest);
    },
    fromFirestore(snapshot, options): T {
      const data = snapshot.data(options);
      const internalData = moneyDocumentFromFirestore(collectionName, data);
      return { ...internalData, id: snapshot.id } as T;
    },
  };
}

export const customerConverter = createMoneyConverter<Customer>('customers');
export const fruitConverter = createMoneyConverter<Fruit>('fruits');
export const saleConverter = createMoneyConverter<SaleEntry>('sales');
export const paymentConverter = createMoneyConverter<Payment>('payments');
export const billHistoryConverter = createMoneyConverter<BillHistory>('billHistory');

export const settingsConverter = createConverter<AppSettings>();

// ------ Collection helpers ------

export function getCollectionRef(collectionName: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, collectionName);
}

/** Owner-scoped collection: users/{ownerId}/{collectionName}. */
export function getOwnerCollectionRef(ownerId: string, collectionName: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, 'users', ownerId, collectionName);
}

export function getOwnerDocRef(ownerId: string, collectionName: string, docId: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  return doc(db, 'users', ownerId, collectionName, docId);
}

export function getDocRef(collectionName: string, docId: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  return doc(db, collectionName, docId);
}

// ------ Typed query helpers ------

export function customersQuery(ownerId: string) {
  return query(
    getOwnerCollectionRef(ownerId, 'customers').withConverter(customerConverter),
    where('ownerId', '==', ownerId)
  );
}

export function legacyCustomersQuery(ownerId: string) {
  return query(
    getCollectionRef('customers').withConverter(customerConverter),
    where('ownerId', '==', ownerId)
  );
}

export function fruitsQuery(ownerId: string) {
  return query(
    getOwnerCollectionRef(ownerId, 'fruits').withConverter(fruitConverter),
    where('ownerId', '==', ownerId)
  );
}

export function legacyFruitsQuery(ownerId: string) {
  return query(
    getCollectionRef('fruits').withConverter(fruitConverter),
    where('ownerId', '==', ownerId)
  );
}

export function salesQuery(ownerId: string) {
  return query(
    getOwnerCollectionRef(ownerId, 'sales').withConverter(saleConverter),
    where('ownerId', '==', ownerId),
    orderBy('dateKey', 'desc')
  );
}

export function legacySalesQuery(ownerId: string) {
  return query(
    getCollectionRef('sales').withConverter(saleConverter),
    where('ownerId', '==', ownerId),
    orderBy('dateKey', 'desc')
  );
}

export function salesByCustomerQuery(ownerId: string, customerId: string) {
  return query(
    getOwnerCollectionRef(ownerId, 'sales').withConverter(saleConverter),
    where('ownerId', '==', ownerId),
    where('customerId', '==', customerId),
    orderBy('dateKey', 'desc')
  );
}

export function legacySalesByCustomerQuery(ownerId: string, customerId: string) {
  return query(
    getCollectionRef('sales').withConverter(saleConverter),
    where('ownerId', '==', ownerId),
    where('customerId', '==', customerId),
    orderBy('dateKey', 'desc')
  );
}

export function salesByDateRangeQuery(
  ownerId: string,
  startKey: string,
  endKey: string
) {
  return query(
    getOwnerCollectionRef(ownerId, 'sales').withConverter(saleConverter),
    where('ownerId', '==', ownerId),
    where('dateKey', '>=', startKey),
    where('dateKey', '<=', endKey),
    orderBy('dateKey', 'desc')
  );
}

export function legacySalesByDateRangeQuery(
  ownerId: string,
  startKey: string,
  endKey: string
) {
  return query(
    getCollectionRef('sales').withConverter(saleConverter),
    where('ownerId', '==', ownerId),
    where('dateKey', '>=', startKey),
    where('dateKey', '<=', endKey),
    orderBy('dateKey', 'desc')
  );
}

export function paymentsQuery(ownerId: string) {
  return query(
    getOwnerCollectionRef(ownerId, 'payments').withConverter(paymentConverter),
    where('ownerId', '==', ownerId),
    orderBy('dateKey', 'desc')
  );
}

export function legacyPaymentsQuery(ownerId: string) {
  return query(
    getCollectionRef('payments').withConverter(paymentConverter),
    where('ownerId', '==', ownerId),
    orderBy('dateKey', 'desc')
  );
}

export function paymentsByCustomerQuery(ownerId: string, customerId: string) {
  return query(
    getOwnerCollectionRef(ownerId, 'payments').withConverter(paymentConverter),
    where('ownerId', '==', ownerId),
    where('customerId', '==', customerId),
    orderBy('dateKey', 'desc')
  );
}

export function legacyPaymentsByCustomerQuery(ownerId: string, customerId: string) {
  return query(
    getCollectionRef('payments').withConverter(paymentConverter),
    where('ownerId', '==', ownerId),
    where('customerId', '==', customerId),
    orderBy('dateKey', 'desc')
  );
}

export function billHistoryQuery(ownerId: string, customerId: string) {
  return query(
    getOwnerCollectionRef(ownerId, 'billHistory').withConverter(billHistoryConverter),
    where('ownerId', '==', ownerId),
    where('customerId', '==', customerId),
    orderBy('sentAt', 'desc')
  );
}

export function legacyBillHistoryQuery(ownerId: string, customerId: string) {
  return query(
    getCollectionRef('billHistory').withConverter(billHistoryConverter),
    where('ownerId', '==', ownerId),
    where('customerId', '==', customerId),
    orderBy('sentAt', 'desc')
  );
}

export function settingsDocRef(ownerId: string) {
  return doc(
    getOwnerCollectionRef(ownerId, 'settings').withConverter(settingsConverter),
    'app'
  );
}

export function legacySettingsDocRef(ownerId: string) {
  return doc(
    getCollectionRef('appSettings').withConverter(settingsConverter),
    ownerId
  );
}

export async function ensureUserDocument(
  ownerId: string,
  profile: { displayName?: string | null; email?: string | null; phoneNumber?: string | null }
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  const userRef = doc(db, 'users', ownerId);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) return;

  const now = Timestamp.now();
  const userData: DocumentData = {
    ownerId,
    createdAt: now,
    updatedAt: now,
  };
  if (profile.displayName) userData.displayName = profile.displayName;
  if (profile.email) userData.email = profile.email;
  if (profile.phoneNumber) userData.phoneNumber = profile.phoneNumber;
  await setDoc(userRef, userData);
}

// ------ Re-exports for convenience ------

export {
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  doc,
  collection,
};
export type { Query, Unsubscribe };
