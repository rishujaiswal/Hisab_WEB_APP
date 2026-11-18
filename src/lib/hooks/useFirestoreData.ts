// ============================================================
// Firestore data hooks
// Automatically delegates to DemoStore when in Demo Mode
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, runTransaction, type DocumentData as FirebaseDocumentData } from 'firebase/firestore';
import { getFirebaseDb, IS_DEMO_MODE } from '@/lib/firebase/config';
import {
  customersQuery,
  fruitsQuery,
  salesByCustomerQuery,
  paymentsByCustomerQuery,
  salesQuery,
  paymentsQuery,
  billHistoryQuery,
  legacyCustomersQuery,
  legacyFruitsQuery,
  legacySalesQuery,
  legacySalesByCustomerQuery,
  legacyPaymentsQuery,
  legacyPaymentsByCustomerQuery,
  legacyBillHistoryQuery,
} from '@/lib/firebase/firestore';
import { useAuth } from './useAuth';
import type { Customer, Fruit, SaleEntry, Payment, BillHistory } from '@/lib/types';
import * as demoStore from '@/lib/demo/demoStore';
import { legacyMoneyMigrationPatch, type MoneyCollection } from '@/lib/firebase/moneyStorage';

function subscribeWithLegacy<T extends { id: string }>(
  primary: Parameters<typeof onSnapshot>[0],
  legacy: Parameters<typeof onSnapshot>[0],
  onData: (items: T[]) => void,
  onError: (error: Error) => void,
  moneyCollection: MoneyCollection
) {
  let primaryItems: T[] = [];
  let legacyItems: T[] = [];
  const emit = () => {
    const byId = new Map<string, T>();
    legacyItems.forEach((item) => byId.set(item.id, item));
    primaryItems.forEach((item) => byId.set(item.id, item));
    onData([...byId.values()]);
  };
  const migrateOldMoneyValues = (snap: any) => {
    const firestore = getFirebaseDb();
    if (!firestore) return;
    for (const item of snap.docs) {
      const ref = item.ref.withConverter(null);
      void runTransaction(firestore, async (transaction) => {
        const current = await transaction.get(ref);
        if (!current.exists()) return;
        const patch = legacyMoneyMigrationPatch(
          moneyCollection,
          current.data() as Record<string, unknown>
        );
        if (patch) transaction.update(ref, patch as FirebaseDocumentData);
      }).catch((error) => console.error('Could not migrate money fields to rupees', error));
    }
  };
  const unsubPrimary = onSnapshot(primary as never, (snap: any) => {
    migrateOldMoneyValues(snap);
    primaryItems = snap.docs.map((d: any) => d.data() as T);
    emit();
  }, onError);
  const unsubLegacy = onSnapshot(legacy as never, (snap: any) => {
    migrateOldMoneyValues(snap);
    legacyItems = snap.docs.map((d: any) => d.data() as T);
    emit();
  }, onError);
  return () => { unsubPrimary(); unsubLegacy(); };
}

// ------ useCustomers ------

export function useCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (IS_DEMO_MODE) return demoStore.getDemoCustomers();
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (IS_DEMO_MODE) {
      const update = () => setCustomers(demoStore.getDemoCustomers());
      setCustomers(demoStore.getDemoCustomers());
      setLoading(false);
      window.addEventListener('hisab-demo-store-change', update);
      return () => window.removeEventListener('hisab-demo-store-change', update);
    }

    if (!user) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeWithLegacy<Customer>(
      customersQuery(user.uid), legacyCustomersQuery(user.uid),
      (items) => {
        setCustomers(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      'customers'
    );
    return unsubscribe;
  }, [user]);

  return { customers, loading, error };
}

// ------ useFruits ------

export function useFruits() {
  const { user } = useAuth();
  const [fruits, setFruits] = useState<Fruit[]>(() => {
    if (IS_DEMO_MODE) return demoStore.getDemoFruits();
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (IS_DEMO_MODE) {
      const update = () => setFruits(demoStore.getDemoFruits());
      setFruits(demoStore.getDemoFruits());
      setLoading(false);
      window.addEventListener('hisab-demo-store-change', update);
      return () => window.removeEventListener('hisab-demo-store-change', update);
    }

    if (!user) {
      setFruits([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeWithLegacy<Fruit>(
      fruitsQuery(user.uid), legacyFruitsQuery(user.uid),
      (items) => {
        setFruits(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      'fruits'
    );
    return unsubscribe;
  }, [user]);

  return { fruits, loading, error };
}

// ------ useCustomerSales ------

export function useCustomerSales(customerId: string | null) {
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleEntry[]>(() => {
    if (IS_DEMO_MODE && customerId) {
      return demoStore.getDemoSales().filter((s) => s.customerId === customerId);
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (IS_DEMO_MODE) {
      const update = () => {
        if (!customerId) {
          setSales([]);
        } else {
          setSales(demoStore.getDemoSales().filter((s) => s.customerId === customerId));
        }
      };
      update();
      setLoading(false);
      window.addEventListener('hisab-demo-store-change', update);
      return () => window.removeEventListener('hisab-demo-store-change', update);
    }

    if (!user || !customerId) {
      setSales([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeWithLegacy<SaleEntry>(
      salesByCustomerQuery(user.uid, customerId), legacySalesByCustomerQuery(user.uid, customerId),
      (items) => {
        setSales(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      'sales'
    );
    return unsubscribe;
  }, [user, customerId]);

  return { sales, loading, error };
}

// ------ useCustomerPayments ------

export function useCustomerPayments(customerId: string | null) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>(() => {
    if (IS_DEMO_MODE && customerId) {
      return demoStore.getDemoPayments().filter((p) => p.customerId === customerId);
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (IS_DEMO_MODE) {
      const update = () => {
        if (!customerId) {
          setPayments([]);
        } else {
          setPayments(demoStore.getDemoPayments().filter((p) => p.customerId === customerId));
        }
      };
      update();
      setLoading(false);
      window.addEventListener('hisab-demo-store-change', update);
      return () => window.removeEventListener('hisab-demo-store-change', update);
    }

    if (!user || !customerId) {
      setPayments([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeWithLegacy<Payment>(
      paymentsByCustomerQuery(user.uid, customerId), legacyPaymentsByCustomerQuery(user.uid, customerId),
      (items) => {
        setPayments(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      'payments'
    );
    return unsubscribe;
  }, [user, customerId]);

  return { payments, loading, error };
}

// ------ useAllSales ------

export function useAllSales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleEntry[]>(() => {
    if (IS_DEMO_MODE) return demoStore.getDemoSales();
    return [];
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_DEMO_MODE) {
      const update = () => setSales(demoStore.getDemoSales());
      setSales(demoStore.getDemoSales());
      setLoading(false);
      window.addEventListener('hisab-demo-store-change', update);
      return () => window.removeEventListener('hisab-demo-store-change', update);
    }

    if (!user) {
      setSales([]);
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeWithLegacy<SaleEntry>(salesQuery(user.uid), legacySalesQuery(user.uid), (items) => {
      setSales(items);
      setLoading(false);
    }, (err) => console.error('Failed to load sales', err), 'sales');
    return unsubscribe;
  }, [user]);

  return { sales, loading };
}

// ------ useAllPayments ------

export function useAllPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>(() => {
    if (IS_DEMO_MODE) return demoStore.getDemoPayments();
    return [];
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_DEMO_MODE) {
      const update = () => setPayments(demoStore.getDemoPayments());
      setPayments(demoStore.getDemoPayments());
      setLoading(false);
      window.addEventListener('hisab-demo-store-change', update);
      return () => window.removeEventListener('hisab-demo-store-change', update);
    }

    if (!user) {
      setPayments([]);
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeWithLegacy<Payment>(paymentsQuery(user.uid), legacyPaymentsQuery(user.uid), (items) => {
      setPayments(items);
      setLoading(false);
    }, (err) => console.error('Failed to load payments', err), 'payments');
    return unsubscribe;
  }, [user]);

  return { payments, loading };
}

// ------ useBillHistory ------

export function useBillHistory(customerId: string | null) {
  const { user } = useAuth();
  const [history, setHistory] = useState<BillHistory[]>(() => {
    if (IS_DEMO_MODE) return demoStore.getDemoBillHistory(customerId || undefined);
    return [];
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_DEMO_MODE) {
      const update = () => setHistory(demoStore.getDemoBillHistory(customerId || undefined));
      setHistory(demoStore.getDemoBillHistory(customerId || undefined));
      setLoading(false);
      window.addEventListener('hisab-demo-store-change', update);
      return () => window.removeEventListener('hisab-demo-store-change', update);
    }

    if (!user || !customerId) {
      setHistory([]);
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeWithLegacy<BillHistory>(billHistoryQuery(user.uid, customerId), legacyBillHistoryQuery(user.uid, customerId), (items) => {
      setHistory(items);
      setLoading(false);
    }, (err) => console.error('Failed to load bill history', err), 'billHistory');
    return unsubscribe;
  }, [user, customerId]);

  return { history, loading };
}
