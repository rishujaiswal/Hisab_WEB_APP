// ============================================================
// Auth context and hook
// Supports both Firebase Auth and Demo Mode fallback
// ============================================================

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange } from '@/lib/firebase/auth';
import { IS_DEMO_MODE } from '@/lib/firebase/config';
import {
  DEMO_USER,
  isDemoUserLoggedIn,
  setDemoUserLoggedIn,
} from '@/lib/demo/demoStore';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isDemoMode: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (IS_DEMO_MODE) {
      return isDemoUserLoggedIn() ? (DEMO_USER as unknown as User) : null;
    }
    return null;
  });
  const [loading, setLoading] = useState(!IS_DEMO_MODE);

  useEffect(() => {
    if (IS_DEMO_MODE) {
      const handleDemoChange = () => {
        setUser(isDemoUserLoggedIn() ? (DEMO_USER as unknown as User) : null);
      };
      window.addEventListener('hisab-demo-store-change', handleDemoChange);
      setLoading(false);
      return () => {
        window.removeEventListener('hisab-demo-store-change', handleDemoChange);
      };
    }

    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isDemoMode: IS_DEMO_MODE }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
