'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCustomers } from '@/lib/hooks/useFirestoreData';
import { customerSchema, type CustomerFormData } from '@/lib/schemas';
import { saveCustomer, toggleCustomerActive } from '@/lib/firebase/mutations';
import { toPaise, toRupees } from '@/lib/domain';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { PageLoading } from '@/components/ui/Loading';
import { ChevronLeft, AlertTriangle } from 'lucide-react';

export default function AddCustomerPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CustomerFormContent />
    </Suspense>
  );
}

function CustomerFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customerId');
  const isEditing = Boolean(customerId);

  const { user } = useAuth();
  const { customers, loading: customersLoading } = useCustomers();
  const { success, error: toastError } = useToast();

  const [confirmToggleActiveOpen, setConfirmToggleActiveOpen] = useState(false);
  const [toggleActiveLoading, setToggleActiveLoading] = useState(false);

  // Existing customer if editing
  const existingCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId]
  );

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
      whatsappNumber: '',
      sameAsWhatsApp: true,
      shopName: '',
      address: '',
      customerType: 'Retail',
      creditLimit: 0,
      notes: '',
    },
  });

  const sameAsWhatsApp = watch('sameAsWhatsApp');
  const watchedPhone = watch('phoneNumber');

  // Fill existing customer data when loaded
  useEffect(() => {
    if (existingCustomer) {
      const isSameWa =
        !existingCustomer.whatsappNumber ||
        existingCustomer.whatsappNumber === existingCustomer.phoneNumber;

      reset({
        name: existingCustomer.name,
        phoneNumber: existingCustomer.phoneNumber,
        whatsappNumber: isSameWa ? '' : existingCustomer.whatsappNumber,
        sameAsWhatsApp: isSameWa,
        shopName: existingCustomer.shopName || '',
        address: existingCustomer.address || '',
        customerType: existingCustomer.customerType || 'Retail',
        creditLimit: toRupees(existingCustomer.creditLimit || 0),
        notes: existingCustomer.notes || '',
      });
    }
  }, [existingCustomer, reset]);

  // Non-blocking duplicate phone number warning
  const duplicatePhoneWarning = useMemo(() => {
    if (!watchedPhone || watchedPhone.length !== 10) return null;
    const match = customers.find(
      (c) => c.phoneNumber === watchedPhone && c.id !== customerId
    );
    if (match) {
      return `Another customer (${match.name}${match.shopName ? ` - ${match.shopName}` : ''}) already has this phone number.`;
    }
    return null;
  }, [watchedPhone, customers, customerId]);

  if (customersLoading && isEditing) {
    return <PageLoading />;
  }

  async function onSubmit(data: CustomerFormData) {
    if (!user) return;
    try {
      const waNumber = data.sameAsWhatsApp
        ? data.phoneNumber
        : data.whatsappNumber || data.phoneNumber;

      await saveCustomer(
        user.uid,
        {
          name: data.name.trim(),
          phoneNumber: data.phoneNumber,
          whatsappNumber: waNumber,
          shopName: data.shopName.trim(),
          address: data.address.trim(),
          customerType: data.customerType,
          creditLimit: toPaise(data.creditLimit),
          notes: data.notes.trim(),
        },
        customerId || undefined
      );

      success(isEditing ? 'Customer updated successfully' : 'Customer created successfully');
      router.push(isEditing ? `/main/customers/${customerId}` : '/main/customers');
    } catch (err: any) {
      toastError(err.message || 'Failed to save customer');
    }
  }

  async function handleToggleActive() {
    if (!existingCustomer) return;
    setToggleActiveLoading(true);
    try {
      const newState = !existingCustomer.isActive;
      if (!user) throw new Error('Not authenticated');
      await toggleCustomerActive(user.uid, existingCustomer.id, newState);
      success(newState ? 'Customer reactivated' : 'Customer deactivated');
      setConfirmToggleActiveOpen(false);
    } catch (err: any) {
      toastError(err.message || 'Failed to update customer status');
    } finally {
      setToggleActiveLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-[#888888] hover:text-[#1A1A2E]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-[#1A1A2E]">
          {isEditing ? 'Edit Customer' : 'Add New Customer'}
        </h1>
        <div className="w-10" />
      </div>

      <Card padding="md" className="p-4 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Customer Name *"
            placeholder="e.g. Ramesh Bhai"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Shop Name (optional)"
            placeholder="e.g. Fresh Fruit Center"
            error={errors.shopName?.message}
            {...register('shopName')}
          />

          {/* Phone input */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1">
              Phone Number *
            </label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 py-2.5 bg-gray-50 border border-[#EBEBEB] rounded-xl text-sm whitespace-nowrap">
                🇮🇳 +91
              </div>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                className={`flex-1 px-3 py-2.5 rounded-xl border text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#1A9E6A] focus:border-transparent ${
                  errors.phoneNumber ? 'border-[#E84040]' : 'border-[#EBEBEB]'
                }`}
                {...register('phoneNumber')}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setValue('phoneNumber', digits);
                }}
              />
            </div>
            {errors.phoneNumber && (
              <p className="text-xs text-[#E84040] mt-1">{errors.phoneNumber.message}</p>
            )}

            {/* Non-blocking duplicate warning */}
            {duplicatePhoneWarning && (
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>{duplicatePhoneWarning}</span>
              </div>
            )}
          </div>

          {/* Same as WhatsApp toggle */}
          <Controller
            name="sameAsWhatsApp"
            control={control}
            render={({ field }) => (
              <Toggle
                label="WhatsApp is same as phone number"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />

          {/* WhatsApp field if toggle off */}
          {!sameAsWhatsApp && (
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1">
                WhatsApp Number
              </label>
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
              {errors.whatsappNumber && (
                <p className="text-xs text-[#E84040] mt-1">{errors.whatsappNumber.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Customer Type"
              options={[
                { value: 'Retail', label: 'Retail' },
                { value: 'Wholesale', label: 'Wholesale' },
              ]}
              {...register('customerType')}
            />

            <Input
              label="Credit Limit (₹, 0 = no limit)"
              type="number"
              inputMode="decimal"
              min="0"
              step="100"
              placeholder="0"
              error={errors.creditLimit?.message}
              {...register('creditLimit', { valueAsNumber: true })}
            />
          </div>

          <Input
            label="Address (optional)"
            placeholder="e.g. Shop #4, Main Mandi"
            {...register('address')}
          />

          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1">
              Notes (optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Always takes Alphonso; prefers morning delivery"
              className="w-full px-3 py-2.5 rounded-xl border border-[#EBEBEB] text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#1A9E6A]"
              {...register('notes')}
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="flex-1"
              loading={isSubmitting}
            >
              {isEditing ? 'Update Customer' : 'Save Customer'}
            </Button>

            {isEditing && existingCustomer && (
              <Button
                type="button"
                variant={existingCustomer.isActive ? 'secondary' : 'outline'}
                size="lg"
                onClick={() => setConfirmToggleActiveOpen(true)}
              >
                {existingCustomer.isActive ? 'Deactivate' : 'Reactivate'}
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Deactivate/Reactivate Confirm Dialog */}
      {existingCustomer && (
        <ConfirmDialog
          open={confirmToggleActiveOpen}
          title={existingCustomer.isActive ? 'Deactivate Customer?' : 'Reactivate Customer?'}
          description={
            existingCustomer.isActive
              ? 'Deactivated customers will not show in active sales pickers, but all existing sales, payments, and ledger history are safely preserved.'
              : 'Reactivating will make this customer available for new sales and payments.'
          }
          confirmLabel={existingCustomer.isActive ? 'Deactivate' : 'Reactivate'}
          confirmVariant={existingCustomer.isActive ? 'danger' : 'primary'}
          onConfirm={handleToggleActive}
          onCancel={() => setConfirmToggleActiveOpen(false)}
          loading={toggleActiveLoading}
        />
      )}
    </div>
  );
}
