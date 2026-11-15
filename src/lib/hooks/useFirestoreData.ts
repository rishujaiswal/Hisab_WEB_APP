// ============================================================
// Firestore data hooks
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  onSnapshot,
  query,
  where,
  orderBy,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/config';
import {
  customersQuery,
  fruitsQuery,
  salesByCustomerQuery,
  paymentsByCustomerQuery,
  salesQuery,
  paymentsQuery,
  billHistoryQuery,
  customerConverter,
  fruitConverter,
  saleConverter,
  paymentConverter,
  billHistoryConverter,
} from '@/lib/firebase/firestore';
import { useAuth } from './useAuth';
import type { Customer, Fruit, SaleEntry, Payment, BillHistory } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getDateKey } from '@/lib/domain/date';

// ------ useCustomers ------

export function useCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    const q = customersQuery(user.uid);
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setCustomers(snap.docs.map((d) => d.data()));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [user]);

  return { customers, loading, error };
}

// ------ useFruits ------

export function useFruits() {
  const { user } = useAuth();
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setFruits([]);
      setLoading(false);
      return;
    }

    const q = fruitsQuery(user.uid);
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setFruits(snap.docs.map((d) => d.data()));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [user]);

  return { fruits, loading, error };
}

// ------ useCustomerSales ------

export function useCustomerSales(customerId: string | null) {
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !customerId) {
      setSales([]);
      setLoading(false);
      return;
    }

    const q = salesByCustomerQuery(user.uid, customerId);
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setSales(snap.docs.map((d) => d.data()));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [user, customerId]);

  return { sales, loading, error };
}

// ------ useCustomerPayments ------

export function useCustomerPayments(customerId: string | null) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !customerId) {
      setPayments([]);
      setLoading(false);
      return;
    }

    const q = paymentsByCustomerQuery(user.uid, customerId);
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setPayments(snap.docs.map((d) => d.data()));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [user, customerId]);

  return { payments, loading, error };
}

// ------ useAllSales ------

export function useAllSales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setSales([]); setLoading(false); return; }
    const q = salesQuery(user.uid);
    const unsubscribe = onSnapshot(q, (snap) => {
      setSales(snap.docs.map((d) => d.data()));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  return { sales, loading };
}

// ------ useAllPayments ------

export function useAllPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setPayments([]); setLoading(false); return; }
    const q = paymentsQuery(user.uid);
    const unsubscribe = onSnapshot(q, (snap) => {
      setPayments(snap.docs.map((d) => d.data()));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  return { payments, loading };
}

// ------ useBillHistory ------

export function useBillHistory(customerId: string | null) {
  const { user } = useAuth();
  const [history, setHistory] = useState<BillHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !customerId) { setHistory([]); setLoading(false); return; }
    const q = billHistoryQuery(user.uid, customerId);
    const unsubscribe = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map((d) => d.data()));
      setLoading(false);
    });
    return unsubscribe;
  }, [user, customerId]);

  return { history, loading };
}
