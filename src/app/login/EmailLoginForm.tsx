'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { IS_DEMO_MODE } from '@/lib/firebase/config';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

interface EmailLoginFormProps {
  onBack: () => void;
}

export default function EmailLoginForm({ onBack }: EmailLoginFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (IS_DEMO_MODE) {
        const { setDemoUserLoggedIn } = await import('@/lib/demo/demoStore');
        setDemoUserLoggedIn(true);
        router.replace('/');
        return;
      }

      if (mode === 'signin') {
        const { signInEmail } = await import('@/lib/firebase/auth');
        await signInEmail(data.email, data.password);
        router.replace('/');
      } else if (mode === 'signup') {
        const { createAccountEmail } = await import('@/lib/firebase/auth');
        await createAccountEmail(data.email, data.password);
        router.replace('/');
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect email or password. Please try again.');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait and try again.');
      } else {
        setError(err?.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const email = getValues('email');
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { resetPassword } = await import('@/lib/firebase/auth');
      await resetPassword(email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-[#888888] hover:text-[#1A1A2E] mb-4">
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      <h2 className="text-lg font-semibold text-[#1A1A2E] mb-1">
        {mode === 'signin' ? 'Sign in with email' : mode === 'signup' ? 'Create an account' : 'Reset password'}
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register('email')}
        />

        {mode !== 'forgot' && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#1A1A2E]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className={`w-full px-3 py-2.5 pr-10 rounded-xl border text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#1A9E6A] focus:border-transparent ${errors.password ? 'border-[#E84040]' : 'border-[#EBEBEB]'}`}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#1A1A2E]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-[#E84040]">{errors.password.message}</p>}
          </div>
        )}

        {error && <p className="text-sm text-[#E84040] rounded-lg bg-red-50 p-3" role="alert">{error}</p>}
        {message && <p className="text-sm text-green-700 rounded-lg bg-green-50 p-3">{message}</p>}

        {mode !== 'forgot' && (
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        )}
      </form>

      <div className="mt-4 flex flex-col gap-2">
        {mode === 'signin' && (
          <>
            <button type="button" onClick={() => setMode('signup')} className="text-sm text-[#1A9E6A] hover:underline text-center">
              Create New Account
            </button>
            <button type="button" onClick={handleForgotPassword} className="text-sm text-[#888888] hover:text-[#1A1A2E] text-center" disabled={loading}>
              Forgot password?
            </button>
          </>
        )}
        {mode === 'signup' && (
          <button type="button" onClick={() => setMode('signin')} className="text-sm text-[#888888] hover:text-[#1A1A2E] text-center">
            Already have an account? Sign In
          </button>
        )}
        {mode === 'forgot' && (
          <button type="button" onClick={() => setMode('signin')} className="text-sm text-[#888888] hover:text-[#1A1A2E] text-center">
            Back to Sign In
          </button>
        )}
      </div>
    </div>
  );
}
