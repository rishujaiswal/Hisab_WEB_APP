'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSettings } from '@/lib/hooks/useSettings';
import {
  useCustomers,
  useFruits,
  useAllSales,
  useAllPayments,
} from '@/lib/hooks/useFirestoreData';
import { saveSale } from '@/lib/firebase/mutations';
import {
  calcItemAmount,
  calcTotalAmount,
  calcCustomerBalance,
  formatINR,
  toPaise,
  toRupees,
  getTodayKey,
  parseDateKey,
} from '@/lib/domain';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { PageLoading } from '@/components/ui/Loading';
import {
  ChevronLeft,
  ShoppingCart,
  AlertTriangle,
  Plus,
  Calendar,
} from 'lucide-react';

export default function AddSalePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SaleFormContent />
    </Suspense>
  );
}

function SaleFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId') || '';
  const saleId = searchParams.get('saleId');
  const isEditing = Boolean(saleId);

  const { user } = useAuth();
  const { settings } = useSettings();
  const { customers, loading: customersLoading } = useCustomers();
  const { fruits, loading: fruitsLoading } = useFruits();
  const { sales, loading: salesLoading } = useAllSales();
  const { payments, loading: paymentsLoading } = useAllPayments();
  const { success, error: toastError } = useToast();

  const timezone = settings?.timezone || 'Asia/Kolkata';

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId);
  const [selectedFruitId, setSelectedFruitId] = useState('');
  const [dateStr, setDateStr] = useState(getTodayKey(timezone));
  const [crates, setCrates] = useState<number | string>(1);
  const [weightPerCrate, setWeightPerCrate] = useState<number | string>(15);
  const [ratePerKg, setRatePerKg] = useState<number | string>(0);
  const [deliveryCharge, setDeliveryCharge] = useState<number | string>(0);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [creditLimitWarningOpen, setCreditLimitWarningOpen] = useState(false);

  // Active customers and fruits
  const activeCustomers = useMemo(
    () => customers.filter((c) => c.isActive || c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const activeFruits = useMemo(
    () => fruits.filter((f) => f.isActive || f.id === selectedFruitId),
    [fruits, selectedFruitId]
  );

  // Existing sale if editing
  const existingSale = useMemo(
    () => sales.find((s) => s.id === saleId),
    [sales, saleId]
  );

  useEffect(() => {
    if (existingSale) {
      setSelectedCustomerId(existingSale.customerId);
      setSelectedFruitId(existingSale.fruitId);
      setDateStr(existingSale.dateKey);
      setCrates(existingSale.crates);
      setWeightPerCrate(existingSale.weightPerCrate);
      setRatePerKg(toRupees(existingSale.ratePerKg));
      setDeliveryCharge(toRupees(existingSale.deliveryCharge));
      setNotes(existingSale.notes || '');
    } else if (preselectedCustomerId) {
      setSelectedCustomerId(preselectedCustomerId);
    }
  }, [existingSale, preselectedCustomerId]);

  // When fruit is selected, auto-fill defaults (only when creating new sale or explicitly changing fruit)
  function handleSelectFruit(fruitId: string) {
    setSelectedFruitId(fruitId);
    const fruit = fruits.find((f) => f.id === fruitId);
    if (fruit) {
      setWeightPerCrate(fruit.defaultWeightPerCrate);
      setRatePerKg(toRupees(fruit.defaultRatePerKg || 0));
      setDeliveryCharge(toRupees(fruit.defaultDeliveryCharge || 0));
    }
  }

  // Selected customer object & current balance
  const currentCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const currentBalance = useMemo(() => {
    if (!selectedCustomerId) return 0;
    const custSales = sales.filter((s) => s.customerId === selectedCustomerId && !s.isVoided);
    const custPayments = payments.filter((p) => p.customerId === selectedCustomerId && !p.isVoided);
    return calcCustomerBalance(custSales, custPayments);
  }, [sales, payments, selectedCustomerId]);

  // Live amount calculations
  const numCrates = Number(crates) || 0;
  const numWeight = Number(weightPerCrate) || 0;
  const numRatePaise = toPaise(Number(ratePerKg) || 0);
  const numDeliveryPaise = toPaise(Number(deliveryCharge) || 0);

  const itemAmountPaise = calcItemAmount(numCrates, numWeight, numRatePaise);
  const totalAmountPaise = calcTotalAmount(itemAmountPaise, numDeliveryPaise);

  // Projected balance and credit limit check
  const projectedBalance = currentBalance + totalAmountPaise;
  const creditLimit = currentCustomer?.creditLimit || 0;
  const exceedsCreditLimit = creditLimit > 0 && projectedBalance > creditLimit;

  // Validation
  const isValid =
    selectedCustomerId !== '' &&
    selectedFruitId !== '' &&
    numCrates > 0 &&
    numWeight > 0 &&
    Number(ratePerKg) >= 0 &&
    Number(deliveryCharge) >= 0;

  async function executeSave(addAnother: boolean = false) {
    if (!user || !isValid || !currentCustomer) return;
    const fruit = fruits.find((f) => f.id === selectedFruitId);
    if (!fruit) return;

    setSaving(true);
    try {
      const saleDate = parseDateKey(dateStr);

      await saveSale(
        user.uid,
        {
          customerId: currentCustomer.id,
          customerName: currentCustomer.name,
          fruitId: fruit.id,
          fruitName: fruit.name,
          date: saleDate,
          crates: numCrates,
          weightPerCrate: numWeight,
          ratePerKg: numRatePaise,
          deliveryCharge: numDeliveryPaise,
          notes: notes.trim(),
        },
        timezone,
        saleId || undefined
      );

      success(isEditing ? 'Sale entry updated' : 'Sale entry recorded');

      if (addAnother) {
        // Reset fruit and amounts, preserve customer and date
        setSelectedFruitId('');
        setCrates(1);
        setWeightPerCrate(15);
        setRatePerKg(0);
        setDeliveryCharge(0);
        setNotes('');
      } else {
        router.push(
          selectedCustomerId
            ? `/main/customers/${selectedCustomerId}`
            : '/main/customers'
        );
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to save sale entry');
    } finally {
      setSaving(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent, addAnother: boolean = false) {
    e.preventDefault();
    if (!isValid) return;

    if (exceedsCreditLimit && !creditLimitWarningOpen) {
      setCreditLimitWarningOpen(true);
      return;
    }

    executeSave(addAnother);
  }

  if (customersLoading || fruitsLoading || (isEditing && salesLoading)) {
    return <PageLoading />;
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
          {isEditing ? 'Edit Sale Entry' : 'New Sale Entry'}
        </h1>
        <div className="w-10" />
      </div>

      <Card padding="md" className="p-4 sm:p-6 space-y-5">
        <form onSubmit={(e) => handleFormSubmit(e, false)} className="space-y-4">
          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1">
              Sale Date *
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#EBEBEB] text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A9E6A]"
              required
            />
          </div>

          {/* Customer Selector */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1">
              Customer *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#EBEBEB] text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A9E6A]"
              required
            >
              <option value="">Select a customer</option>
              {activeCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.shopName ? `(${c.shopName})` : ''}
                </option>
              ))}
            </select>
            {currentCustomer && (
              <div className="flex justify-between items-center text-xs text-[#888888] mt-1">
                <span>
                  Current Balance: {formatINR(currentBalance)}
                </span>
                {creditLimit > 0 && (
                  <span>
                    Credit Limit: {formatINR(creditLimit)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Fruit / Produce Selector */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1">
              Produce / Fruit *
            </label>
            <select
              value={selectedFruitId}
              onChange={(e) => handleSelectFruit(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#EBEBEB] text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A9E6A]"
              required
            >
              <option value="">Select fruit item</option>
              {activeFruits.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.defaultWeightPerCrate} kg/crate @ ₹{toRupees(f.defaultRatePerKg)}/kg)
                </option>
              ))}
            </select>
          </div>

          {/* Quantities & Pricing grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Crates *"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={crates}
              onChange={(e) => setCrates(e.target.value)}
              required
            />

            <Input
              label="Weight / crate (kg) *"
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.1"
              value={weightPerCrate}
              onChange={(e) => setWeightPerCrate(e.target.value)}
              required
            />

            <Input
              label="Rate / kg (₹) *"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={ratePerKg}
              onChange={(e) => setRatePerKg(e.target.value)}
              required
            />

            <Input
              label="Delivery (₹)"
              type="number"
              inputMode="decimal"
              min="0"
              step="10"
              value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(e.target.value)}
            />
          </div>

          <Input
            label="Notes (optional)"
            placeholder="e.g. Morning lot, Mandi Gate #2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Live Calculation Summary */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-[#EBEBEB] space-y-2">
            <div className="text-xs font-semibold text-[#888888] uppercase tracking-wide">
              Live Calculation Breakdown
            </div>
            <div className="flex justify-between text-xs text-[#1A1A2E]">
              <span>
                Produce Amount ({numCrates} crates × {numWeight} kg @ ₹{ratePerKg}/kg)
              </span>
              <span className="font-semibold">{formatINR(itemAmountPaise)}</span>
            </div>
            {numDeliveryPaise > 0 && (
              <div className="flex justify-between text-xs text-[#1A1A2E]">
                <span>Delivery Charge</span>
                <span className="font-semibold">{formatINR(numDeliveryPaise)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-[#EBEBEB] flex justify-between items-center">
              <span className="text-sm font-bold text-[#1A1A2E]">Total Sale Due</span>
              <span className="text-lg font-bold text-[#1A9E6A]">
                {formatINR(totalAmountPaise)}
              </span>
            </div>
          </div>

          {/* Credit Limit Alert Banner */}
          {exceedsCreditLimit && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Credit Limit Exceeded:</strong> Customer has a credit limit of{' '}
                {formatINR(creditLimit)}. With this sale, balance will reach{' '}
                {formatINR(projectedBalance)}.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="flex-1"
              disabled={!isValid || saving}
              loading={saving}
            >
              {isEditing ? 'Update Sale Entry' : 'Save Sale Entry'}
            </Button>

            {!isEditing && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={!isValid || saving}
                onClick={(e) => handleFormSubmit(e, true)}
              >
                Save & Add Another
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Credit Limit Warning Confirmation */}
      <ConfirmDialog
        open={creditLimitWarningOpen}
        title="Credit Limit Warning"
        description={`This sale will put ${currentCustomer?.name}'s balance at ${formatINR(
          projectedBalance
        )}, which exceeds their credit limit of ${formatINR(
          creditLimit
        )}. Do you want to proceed and record this sale anyway?`}
        confirmLabel="Confirm & Save"
        confirmVariant="primary"
        onConfirm={() => {
          setCreditLimitWarningOpen(false);
          executeSave(false);
        }}
        onCancel={() => setCreditLimitWarningOpen(false)}
        loading={saving}
      />
    </div>
  );
}
