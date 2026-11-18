'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFruits, useAllSales } from '@/lib/hooks/useFirestoreData';
import { fruitSchema, type FruitFormData } from '@/lib/schemas';
import { saveFruit, deleteFruit } from '@/lib/firebase/mutations';
import { toPaise, toRupees, formatINR, getSaleTotalAmount } from '@/lib/domain';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { PageLoading } from '@/components/ui/Loading';
import { ChevronLeft, Info, Trash2 } from 'lucide-react';

export default function AddFruitPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <FruitFormContent />
    </Suspense>
  );
}

function FruitFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fruitId = searchParams.get('fruitId');
  const isEditing = Boolean(fruitId);

  const { user } = useAuth();
  const { fruits, loading: fruitsLoading } = useFruits();
  const { sales, loading: salesLoading } = useAllSales();
  const { success, error: toastError } = useToast();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const existingFruit = useMemo(
    () => fruits.find((f) => f.id === fruitId),
    [fruits, fruitId]
  );

  // Compute lifetime stats for this fruit
  const fruitStats = useMemo(() => {
    if (!fruitId) return null;
    const activeFruitSales = sales.filter(
      (s) => s.fruitId === fruitId && !s.isVoided
    );
    const count = activeFruitSales.length;
    const crates = activeFruitSales.reduce((sum, s) => sum + s.crates, 0);
    const revenue = activeFruitSales.reduce(
      (sum, s) => sum + getSaleTotalAmount(s),
      0
    );
    return { count, crates, revenue };
  }, [sales, fruitId]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FruitFormData>({
    resolver: zodResolver(fruitSchema),
    defaultValues: {
      name: '',
      isActive: true,
      defaultWeightPerCrate: 15,
      defaultRatePerKg: 0,
      defaultDeliveryCharge: 0,
    },
  });

  useEffect(() => {
    if (existingFruit) {
      reset({
        name: existingFruit.name,
        isActive: existingFruit.isActive,
        defaultWeightPerCrate: existingFruit.defaultWeightPerCrate,
        defaultRatePerKg: toRupees(existingFruit.defaultRatePerKg || 0),
        defaultDeliveryCharge: toRupees(existingFruit.defaultDeliveryCharge || 0),
      });
    }
  }, [existingFruit, reset]);

  if (fruitsLoading && isEditing) {
    return <PageLoading />;
  }

  async function onSubmit(data: FruitFormData) {
    if (!user) return;
    try {
      await saveFruit(
        user.uid,
        {
          name: data.name.trim(),
          isActive: data.isActive,
          defaultWeightPerCrate: Number(data.defaultWeightPerCrate),
          defaultRatePerKg: toPaise(Number(data.defaultRatePerKg)),
          defaultDeliveryCharge: toPaise(Number(data.defaultDeliveryCharge)),
        },
        fruitId || undefined
      );

      success(isEditing ? 'Fruit changes saved' : 'Produce item added successfully');
      router.push('/main/items');
    } catch (err: any) {
      toastError(err.message || 'Failed to save fruit');
    }
  }

  async function handleDeleteFruit() {
    if (!fruitId || (fruitStats && fruitStats.count > 0)) return;
    setDeleteLoading(true);
    try {
      if (!user) throw new Error('Not authenticated');
      await deleteFruit(user.uid, fruitId);
      success('Produce item deleted');
      router.push('/main/items');
    } catch (err: any) {
      toastError(err.message || 'Failed to delete fruit');
    } finally {
      setDeleteLoading(false);
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
          {isEditing ? 'Edit Produce Item' : 'Add New Produce Item'}
        </h1>
        <div className="w-10" />
      </div>

      {/* Edit Mode Stats Banner */}
      {isEditing && fruitStats && (
        <Card padding="sm" className="p-4 bg-gray-50 border-[#EBEBEB]">
          <div className="text-xs font-semibold text-[#888888] mb-2 uppercase tracking-wide">
            Historic Performance
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xs text-[#888888]">Total Sales</div>
              <div className="text-base font-bold text-[#1A1A2E] mt-0.5">
                {fruitStats.count} entries
              </div>
            </div>
            <div>
              <div className="text-xs text-[#888888]">Crates Sold</div>
              <div className="text-base font-bold text-[#1A1A2E] mt-0.5">
                {fruitStats.crates} crates
              </div>
            </div>
            <div>
              <div className="text-xs text-[#888888]">Total Revenue</div>
              <div className="text-base font-bold text-[#1A9E6A] mt-0.5">
                {formatINR(fruitStats.revenue)}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card padding="md" className="p-4 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Produce / Fruit Name *"
            placeholder="e.g. Alphonso Mango, Shimla Apple, Kivi"
            error={errors.name?.message}
            {...register('name')}
          />

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Toggle
                label="Active produce (available in sales entries)"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Weight / crate (kg) *"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0.1"
              placeholder="15"
              error={errors.defaultWeightPerCrate?.message}
              {...register('defaultWeightPerCrate', { valueAsNumber: true })}
            />

            <Input
              label="Price / kg (₹)"
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              placeholder="0"
              error={errors.defaultRatePerKg?.message}
              {...register('defaultRatePerKg', { valueAsNumber: true })}
            />

            <Input
              label="Delivery charge (₹)"
              type="number"
              inputMode="decimal"
              step="10"
              min="0"
              placeholder="0"
              error={errors.defaultDeliveryCharge?.message}
              {...register('defaultDeliveryCharge', { valueAsNumber: true })}
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-xl flex items-start gap-2.5 text-xs text-[#888888]">
            <Info className="h-4 w-4 shrink-0 text-[#1A9E6A] mt-0.5" />
            <span>
              These defaults prefill new sales entries automatically. You can always adjust weights, rates, and delivery per sale without modifying these defaults.
            </span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="flex-1"
              loading={isSubmitting}
            >
              {isEditing ? 'Save Changes' : 'Add Fruit'}
            </Button>

            {isEditing && fruitStats && fruitStats.count === 0 && (
              <Button
                type="button"
                variant="danger"
                size="lg"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => setConfirmDeleteOpen(true)}
              >
                Delete
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete Produce Item?"
        description="Are you sure you want to delete this fruit? This item has no recorded sales."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDeleteFruit}
        onCancel={() => setConfirmDeleteOpen(false)}
        loading={deleteLoading}
      />
    </div>
  );
}
