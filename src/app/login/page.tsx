'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { IS_DEMO_MODE } from '@/lib/firebase/config';
import PhoneLoginForm from './PhoneLoginForm';
import EmailLoginForm from './EmailLoginForm';
import { Button } from '@/components/ui/Button';
import { Sprout } from 'lucide-react';

type AuthMethod = 'select' | 'phone' | 'email';

export default function LoginPage() {
  const { user, loading, isDemoMode } = useAuth();
  const router = useRouter();
  const [method, setMethod] = useState<AuthMethod>('select');

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#1A1A2E] flex flex-col items-center justify-center p-4">
      {isDemoMode && (
        <div className="w-full max-w-sm mb-4">
          <div className="bg-amber-100 border border-amber-300 text-amber-800 text-xs font-medium px-4 py-2 rounded-xl text-center">
            🧪 Demo mode — data not saved to cloud
          </div>
        </div>
      )}

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1A9E6A] mb-4">
            <Sprout className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Hisab</h1>
          <p className="text-gray-400 text-sm">Your fruit business, organized</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          {method === 'select' && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4 text-center">Sign in to continue</h2>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => setMethod('phone')}
              >
                📱 Continue with Phone
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() => setMethod('email')}
              >
                ✉️ Continue with Email
              </Button>
              <GoogleSignInButton />
              {isDemoMode && (
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full text-[#888888]"
                  onClick={async () => {
                    const { setDemoUserLoggedIn } = await import('@/lib/demo/demoStore');
                    setDemoUserLoggedIn(true);
                    router.replace('/');
                  }}
                >
                  Try Demo (no sign in)
                </Button>
              )}
            </div>
          )}

          {method === 'phone' && (
            <PhoneLoginForm onBack={() => setMethod('select')} />
          )}

          {method === 'email' && (
            <EmailLoginForm onBack={() => setMethod('select')} />
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleGoogleSignIn() {
    if (IS_DEMO_MODE) return;
    setLoading(true);
    setError('');
    try {
      const { signInGoogle } = await import('@/lib/firebase/auth');
      await signInGoogle();
      router.replace('/');
    } catch (err: any) {
      if (err?.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email address. Try signing in with a different method.');
      } else {
        setError(err?.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (IS_DEMO_MODE) return null;

  return (
    <div>
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        loading={loading}
        onClick={handleGoogleSignIn}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </Button>
      {error && <p className="text-xs text-[#E84040] mt-2 text-center">{error}</p>}
    </div>
  );
}
