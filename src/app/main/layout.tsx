'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSettings } from '@/lib/hooks/useSettings';
import { PageLoading } from '@/components/ui/Loading';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickAddButton } from '@/components/layout/QuickAddButton';
import { SyncStatusBar } from '@/components/layout/SyncStatusBar';

export default function MainLayout({ children }: LayoutProps<'/main'>) {
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
    }
  }, [user, authLoading, isDemoMode, isSetupComplete, settingsLoading, router]);

  if (authLoading || settingsLoading) return <PageLoading />;
  if (!isDemoMode && !user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7]">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0">
        <SyncStatusBar />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto pb-20 md:pb-0"
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Floating quick-add button */}
      <QuickAddButton />
    </div>
  );
}
