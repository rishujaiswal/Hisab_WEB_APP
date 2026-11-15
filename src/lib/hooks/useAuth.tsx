// ============================================================
// Auth context and hook
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!IS_DEMO_MODE);

  useEffect(() => {
    if (IS_DEMO_MODE) {
      setLoading(false);
      return;
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
