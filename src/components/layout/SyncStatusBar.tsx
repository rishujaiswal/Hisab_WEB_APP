'use client';

import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { IS_DEMO_MODE } from '@/lib/firebase/config';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

export function SyncStatusBar() {
  const status = useOnlineStatus();

  if (IS_DEMO_MODE) {
    return (
      <div className="bg-amber-500 text-white text-xs text-center py-1.5 px-4 font-medium" role="status">
        Demo data — not saved to cloud
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className="bg-[#E84040] text-white text-xs text-center py-1.5 px-4 flex items-center justify-center gap-2" role="status" aria-live="polite">
        <WifiOff className="h-3.5 w-3.5" />
        Offline — changes will queue and sync when you reconnect
      </div>
    );
  }

  if (status === 'syncing') {
    return (
      <div className="bg-[#007AFF] text-white text-xs text-center py-1 px-4 flex items-center justify-center gap-2" role="status">
        <Wifi className="h-3 w-3 animate-pulse" />
        Syncing changes to cloud...
      </div>
    );
  }

  return null; // Online & Synced — no banner needed
}
