'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Hisab application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold text-[#1A1A2E] mb-2">Something went wrong</h1>
      <p className="text-sm text-[#888888] max-w-sm mb-6">
        {error.message || 'An unexpected error occurred while processing your produce data.'}
      </p>
      <div className="flex gap-3">
        <Button variant="primary" onClick={() => reset()} icon={<RefreshCw className="h-4 w-4" />}>
          Try Again
        </Button>
        <Button variant="secondary" onClick={() => window.location.assign('/main')}>
          Go to Home
        </Button>
      </div>
    </div>
  );
}
