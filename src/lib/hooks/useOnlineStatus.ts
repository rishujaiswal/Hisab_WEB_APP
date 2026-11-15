// ============================================================
// Online/offline status hook
// ============================================================

'use client';

import { useState, useEffect } from 'react';

export type SyncStatus = 'online' | 'offline' | 'syncing';

export function useOnlineStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>('online');

  useEffect(() => {
    const handleOnline = () => setStatus('online');
    const handleOffline = () => setStatus('offline');

    // Set initial state
    if (!navigator.onLine) {
      setStatus('offline');
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}
