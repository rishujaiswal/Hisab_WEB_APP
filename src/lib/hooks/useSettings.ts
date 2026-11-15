// ============================================================
// Settings hook — loads and saves AppSettings
// Supports both Firestore and Demo Mode
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  settingsDocRef,
  getDoc,
  setDoc,
  Timestamp,
} from '@/lib/firebase/firestore';
import { IS_DEMO_MODE } from '@/lib/firebase/config';
import { useAuth } from './useAuth';
import type { AppSettings } from '@/lib/types';
import * as demoStore from '@/lib/demo/demoStore';

const DEFAULT_SETTINGS: Omit<AppSettings, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> = {
  ownerName: '',
  shopName: '',
  shopAddress: '',
  shopPhone: '',
  whatsappNumber: '',
  weeklyStartDay: 1,
  timezone: 'Asia/Kolkata',
};

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(() => {
    if (IS_DEMO_MODE) {
      return demoStore.getDemoSettings();
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (IS_DEMO_MODE) {
      const handleDemoChange = () => {
        setSettings(demoStore.getDemoSettings());
      };
      setSettings(demoStore.getDemoSettings());
      setLoading(false);
      window.addEventListener('hisab-demo-store-change', handleDemoChange);
      return () => {
        window.removeEventListener('hisab-demo-store-change', handleDemoChange);
      };
    }

    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSettings() {
      try {
        const docRef = settingsDocRef(user!.uid);
        const snap = await getDoc(docRef);
        if (!cancelled) {
          if (snap.exists()) {
            setSettings(snap.data());
          } else {
            setSettings(null);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load settings');
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveSettings = useCallback(
    async (data: Partial<AppSettings>) => {
      if (IS_DEMO_MODE) {
        const updated = demoStore.saveDemoSettings(data);
        setSettings(updated);
        return updated;
      }

      if (!user) throw new Error('Not authenticated');

      const now = Timestamp.now();
      const docRef = settingsDocRef(user.uid);
      const snap = await getDoc(docRef);

      const updatedSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        ...snap.data(),
        ...data,
        id: user.uid,
        ownerId: user.uid,
        updatedAt: now,
        createdAt: snap.exists()
          ? (snap.data()?.createdAt ?? now)
          : now,
      } as AppSettings;

      await setDoc(docRef, updatedSettings);
      setSettings(updatedSettings);
      return updatedSettings;
    },
    [user]
  );

  const isSetupComplete = Boolean(
    settings?.ownerName && settings?.shopName && settings?.shopPhone
  );

  return { settings, loading, error, saveSettings, isSetupComplete };
}
