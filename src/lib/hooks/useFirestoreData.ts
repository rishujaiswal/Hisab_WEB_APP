// ============================================================
// Firestore data hooks
// Automatically delegates to DemoStore when in Demo Mode
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { IS_DEMO_MODE } from '@/lib/firebase/config';
import {
  customersQuery,
  fruitsQuery,
  salesByCustomerQuery,
  paymentsByCustomerQuery,
  salesQuery,
  paymentsQuery,
  billHistoryQuery,
} from '@/lib/firebase/firestore';
import { useAuth } from './useAuth';
import type { Customer, Fruit, SaleEntry, Payment, BillHistory } from '@/lib/types';
import * as demoStore from '@/lib/demo/demoStore';

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
    const q = billHistoryQuery(user.uid, customerId);
    const unsubscribe = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map((d) => d.data()));
      setLoading(false);
    });
    return unsubscribe;
  }, [user, customerId]);

  return { history, loading };
}
