'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSettings } from '@/lib/hooks/useSettings';
import { shopSetupSchema, type ShopSetupFormData } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Sprout } from 'lucide-react';
import { PageLoading } from '@/components/ui/Loading';

export default function SetupPage() {
  const { user, loading: authLoading, isDemoMode } = useAuth();
  const { settings, loading: settingsLoading, saveSettings, isSetupComplete, error: settingsLoadError } = useSettings();
  const router = useRouter();
  const [saveError, setSaveError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ShopSetupFormData>({
    resolver: zodResolver(shopSetupSchema),
    defaultValues: {
      sameAsShopPhone: true,
      ownerName: '',
      shopName: '',
      shopPhone: '',
      shopAddress: '',
      whatsappNumber: '',
    },
  });

  const sameAsShopPhone = watch('sameAsShopPhone');
  const shopPhone = watch('shopPhone');

  // If setup is already complete, redirect to main
  useEffect(() => {
    if (!authLoading && !settingsLoading && isSetupComplete) {
      router.replace('/main');
    }
  }, [authLoading, settingsLoading, isSetupComplete, router]);

  if (authLoading || settingsLoading) return <PageLoading />;

  async function onSubmit(data: ShopSetupFormData) {
    setSaveError('');
    try {
      await saveSettings({
        ownerName: data.ownerName,
        shopName: data.shopName,
        shopPhone: data.shopPhone,
        shopAddress: data.shopAddress,
        whatsappNumber: data.sameAsShopPhone ? data.shopPhone : (data.whatsappNumber || ''),
        weeklyStartDay: 1, // Default: Sunday
        timezone: 'Asia/Kolkata',
      });
      router.replace('/main');
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'permission-denied') {
        setSaveError('Firestore denied this settings write. Deploy the project’s firestore.rules, then reload and try again.');
      } else {
        setSaveError(err instanceof Error ? err.message : 'Could not save shop settings. Please try again.');
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1A9E6A] mb-3">
            <Sprout className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Set up your shop</h1>
          <p className="text-gray-400 text-sm">This helps personalise your bills and receipts</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {(saveError || settingsLoadError) && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#E84040]" role="alert" aria-live="polite">
                {saveError || settingsLoadError}
              </p>
            )}
            <Input
              label="Owner name *"
              placeholder="e.g. Ramesh Kumar"
              error={errors.ownerName?.message}
              autoComplete="name"
              {...register('ownerName')}
            />

            <Input
              label="Shop name *"
              placeholder="e.g. Ramesh Fruits"
              error={errors.shopName?.message}
              {...register('shopName')}
            />

            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1">Shop phone *</label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 py-2.5 bg-gray-50 border border-[#EBEBEB] rounded-xl text-sm text-[#1A1A2E] whitespace-nowrap">
                  🇮🇳 +91
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  className={`flex-1 px-3 py-2.5 rounded-xl border text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#1A9E6A] focus:border-transparent ${errors.shopPhone ? 'border-[#E84040]' : 'border-[#EBEBEB]'}`}
                  autoComplete="tel-national"
                  {...register('shopPhone')}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setValue('shopPhone', digits);
                  }}
                />
              </div>
              {errors.shopPhone && <p className="text-xs text-[#E84040] mt-1">{errors.shopPhone.message}</p>}
            </div>

            <Input
              label="Address (optional)"
              placeholder="e.g. 12, Fruit Market, Jaipur"
              {...register('shopAddress')}
            />

            <Controller
              name="sameAsShopPhone"
              control={control}
              render={({ field }) => (
                <Toggle
                  label="WhatsApp is same as shop phone"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            {!sameAsShopPhone && (
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-1">WhatsApp number</label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 py-2.5 bg-gray-50 border border-[#EBEBEB] rounded-xl text-sm whitespace-nowrap">
                    🇮🇳 +91
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-[#EBEBEB] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A9E6A]"
                    {...register('whatsappNumber')}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setValue('whatsappNumber', digits);
                    }}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              loading={isSubmitting}
            >
              Save & Enter App
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
