'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChevronLeft } from 'lucide-react';
import { IS_DEMO_MODE } from '@/lib/firebase/config';

interface PhoneLoginFormProps {
  onBack: () => void;
}

export default function PhoneLoginForm({ onBack }: PhoneLoginFormProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const captchaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const cleanPhone = phone.replace(/\D/g, '').slice(0, 10);
  const isValid = cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone);
  const remaining = 10 - cleanPhone.length;

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError('');

    try {
      if (IS_DEMO_MODE) {
        // Demo: skip OTP, store phone in session and go to OTP page
        sessionStorage.setItem('hisab_otp_phone', cleanPhone);
        sessionStorage.setItem('hisab_demo_otp', 'true');
        router.push('/otp');
        return;
      }

      const { setupRecaptcha, sendOTP } = await import('@/lib/firebase/auth');
      
      if (!captchaRef.current) return;
      const verifier = setupRecaptcha('recaptcha-container');
      if (!verifier) throw new Error('reCAPTCHA failed to initialize');

      const result = await sendOTP(cleanPhone);
      if (!result) throw new Error('Failed to send OTP');

      // Store confirmation result in sessionStorage (via ID; actual object in memory)
      sessionStorage.setItem('hisab_otp_phone', cleanPhone);
      // Store confirmation result ID using a workaround
      (window as any).__hisabConfirmationResult = result;

      router.push('/otp');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-phone-number') {
        setError('Invalid phone number. Please check and try again.');
      } else if (code === 'auth/billing-not-enabled') {
        setError('Firebase requires a Cloud Billing account for real phone sign-in SMS. SMS is billed per message. For development, configure a test phone number in Firebase Authentication.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('Phone sign-in is not enabled for this Firebase project. Enable the Phone provider in Firebase Authentication.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else if (code === 'auth/captcha-check-failed') {
        setError('reCAPTCHA verification failed. Please refresh and try again.');
      } else {
        setError(err?.message || 'Failed to send OTP. Please try again.');
      }
      if (!IS_DEMO_MODE) {
        const { clearRecaptcha } = await import('@/lib/firebase/auth');
        clearRecaptcha();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-[#888888] hover:text-[#1A1A2E] mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      <h2 className="text-lg font-semibold text-[#1A1A2E] mb-1">Phone number</h2>
      <p className="text-sm text-[#888888] mb-4">We&apos;ll send a verification code to your number</p>

      <form onSubmit={handleSendOTP} className="space-y-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-[#1A1A2E] mb-1">
            Phone number
          </label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 py-2.5 bg-gray-50 border border-[#EBEBEB] rounded-xl text-sm text-[#1A1A2E] whitespace-nowrap">
              🇮🇳 +91
            </div>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhone(digits);
                setError('');
              }}
              placeholder="98765 43210"
              autoComplete="tel-national"
              className="flex-1 px-3 py-2.5 rounded-xl border border-[#EBEBEB] text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#1A9E6A] focus:border-transparent"
              aria-describedby="phone-hint"
            />
          </div>
          {!isValid && cleanPhone.length > 0 && (
            <p id="phone-hint" className="text-xs text-[#888888] mt-1">
              {remaining > 0 ? `${remaining} more digit${remaining !== 1 ? 's' : ''} needed` : 'Phone number must start with 6, 7, 8, or 9'}
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-[#E84040] rounded-lg bg-red-50 p-3" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!isValid}
          loading={loading}
        >
          Send OTP
        </Button>
      </form>

      {/* Invisible reCAPTCHA container */}
      <div ref={captchaRef} id="recaptcha-container" />
      
      {process.env.NODE_ENV === 'development' && (
        <p className="text-xs text-center text-[#888888] mt-3">
          🛠 Dev: Use test phone numbers configured in Firebase console
        </p>
      )}
    </div>
  );
}
