'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSettings } from '@/lib/hooks/useSettings';
import { PageLoading } from '@/components/ui/Loading';

export default function RootPage() {
  const { user, loading: authLoading, isDemoMode } = useAuth();
  const { isSetupComplete, loading: settingsLoading } = useSettings();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || settingsLoading) return;

    if (!user && !isDemoMode) {
      router.replace('/login');
      return;
    }

    if (!isSetupComplete) {
      router.replace('/setup');
      return;
    }

    router.replace('/main');
  }, [user, authLoading, isDemoMode, isSetupComplete, settingsLoading, router]);

  return <PageLoading />;
}
