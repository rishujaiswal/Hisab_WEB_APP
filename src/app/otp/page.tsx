'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ChevronLeft } from 'lucide-react';

const OTP_LENGTH = 6;

export default function OTPPage() {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  const phone = typeof window !== 'undefined' ? sessionStorage.getItem('hisab_otp_phone') || '' : '';
  const isDemo = typeof window !== 'undefined' ? sessionStorage.getItem('hisab_demo_otp') === 'true' : false;
  const maskedPhone = phone ? `+91 ****${phone.slice(-4)}` : '';

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const otpValue = otp.join('');

  function handleInputChange(index: number, value: string) {
    // Handle paste
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      const newOtp = [...otp];
      digits.split('').forEach((d, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    if (!digit && value !== '') return;

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otpValue.length !== OTP_LENGTH) return;
    setLoading(true);
    setError('');

    try {
      if (isDemo) {
        // Demo: accept any 6-digit code, or "123456" as the test code
        if (otpValue === '123456' || otpValue.length === OTP_LENGTH) {
          sessionStorage.removeItem('hisab_demo_otp');
          router.replace('/');
        } else {
          setError('Invalid code. Use 123456 in demo mode.');
        }
        return;
      }

      const confirmationResult = (window as any).__hisabConfirmationResult;
      if (!confirmationResult) {
        setError('Session expired. Please go back and request a new OTP.');
        return;
      }

      const { verifyOTP } = await import('@/lib/firebase/auth');
      await verifyOTP(confirmationResult, otpValue);
      router.replace('/');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-verification-code') {
        setError('Invalid code. Please check and try again.');
      } else if (code === 'auth/code-expired') {
        setError('Code expired. Please request a new one.');
      } else {
        setError(err?.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    setResending(true);
    setError('');
    try {
      const { sendOTP, setupRecaptcha } = await import('@/lib/firebase/auth');
      const verifier = setupRecaptcha('resend-recaptcha');
      if (!verifier) throw new Error('reCAPTCHA failed');
      const result = await sendOTP(phone);
      (window as any).__hisabConfirmationResult = result;
      setCountdown(60);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="flex items-center gap-1 text-sm text-[#888888] hover:text-[#1A1A2E] mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-lg font-semibold text-[#1A1A2E] mb-1">Enter verification code</h1>
        <p className="text-sm text-[#888888] mb-6">
          Sent to {maskedPhone || 'your phone'}
        </p>

        {isDemo && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 text-xs p-2 rounded-lg text-center">
            🛠 Demo mode: use code <strong>123456</strong>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex gap-2 justify-center">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                value={digit}
                onChange={(e) => handleInputChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                className="w-11 h-14 text-center text-xl font-bold border-2 border-[#EBEBEB] rounded-xl focus:outline-none focus:border-[#1A9E6A] focus:ring-2 focus:ring-[#1A9E6A]/20 transition-colors"
                aria-label={`OTP digit ${i + 1}`}
              />
            ))}
          </div>

          {error && <p className="text-sm text-[#E84040] text-center" role="alert">{error}</p>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={otpValue.length !== OTP_LENGTH}
            loading={loading}
          >
            Verify
          </Button>
        </form>

        <div className="mt-4 text-center">
          {countdown > 0 ? (
            <p className="text-sm text-[#888888]">Resend in {countdown}s</p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-sm text-[#1A9E6A] hover:underline disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend OTP'}
            </button>
          )}
        </div>
      </div>

      <div id="resend-recaptcha" />
    </div>
  );
}
