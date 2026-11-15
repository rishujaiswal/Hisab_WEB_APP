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

export const customerConverter = createConverter<Customer>();
export const fruitConverter = createConverter<Fruit>();
export const saleConverter = createConverter<SaleEntry>();
export const paymentConverter = createConverter<Payment>();
export const billHistoryConverter = createConverter<BillHistory>();
export const settingsConverter = createConverter<AppSettings>();

// ------ Collection helpers ------

export function getCollectionRef(collectionName: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, collectionName);
}

export function getDocRef(collectionName: string, docId: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore not initialized');
  return doc(db, collectionName, docId);
}

// ------ Typed query helpers ------

export function customersQuery(ownerId: string) {
  return query(
    getCollectionRef('customers').withConverter(customerConverter),
    where('ownerId', '==', ownerId)
  );
}

export function fruitsQuery(ownerId: string) {
  return query(
    getCollectionRef('fruits').withConverter(fruitConverter),
    where('ownerId', '==', ownerId)
  );
}

export function salesQuery(ownerId: string) {
  return query(
    getCollectionRef('sales').withConverter(saleConverter),
    where('ownerId', '==', ownerId),
    orderBy('dateKey', 'desc')
  );
}

export function salesByCustomerQuery(ownerId: string, customerId: string) {
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
    getCollectionRef('sales').withConverter(saleConverter),
    where('ownerId', '==', ownerId),
    where('dateKey', '>=', startKey),
    where('dateKey', '<=', endKey),
    orderBy('dateKey', 'desc')
  );
}

export function paymentsQuery(ownerId: string) {
  return query(
    getCollectionRef('payments').withConverter(paymentConverter),
    where('ownerId', '==', ownerId),
    orderBy('dateKey', 'desc')
  );
}

export function paymentsByCustomerQuery(ownerId: string, customerId: string) {
  return query(
    getCollectionRef('payments').withConverter(paymentConverter),
    where('ownerId', '==', ownerId),
    where('customerId', '==', customerId),
    orderBy('dateKey', 'desc')
  );
}

export function billHistoryQuery(ownerId: string, customerId: string) {
  return query(
    getCollectionRef('billHistory').withConverter(billHistoryConverter),
    where('ownerId', '==', ownerId),
    where('customerId', '==', customerId),
    orderBy('sentAt', 'desc')
  );
}

export function settingsDocRef(ownerId: string) {
  return doc(
    getCollectionRef('appSettings').withConverter(settingsConverter),
    ownerId
  );
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
