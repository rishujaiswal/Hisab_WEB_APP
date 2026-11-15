'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSettings } from '@/lib/hooks/useSettings';
import {
  useCustomers,
  useAllSales,
  useAllPayments,
} from '@/lib/hooks/useFirestoreData';
import { savePayment } from '@/lib/firebase/mutations';
import {
  calcCustomerBalance,
  formatINR,
  toPaise,
  toRupees,
  getTodayKey,
  parseDateKey,
  formatDateDisplay,
  getWhatsAppNumber,
  whatsappUrl,
} from '@/lib/domain';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { useToast } from '@/components/ui/Toast';
import { PageLoading } from '@/components/ui/Loading';
import {
  ChevronLeft,
  Wallet,
  MessageCircle,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function AddPaymentPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PaymentFormContent />
    </Suspense>
  );
}

function PaymentFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId') || '';
  const paymentId = searchParams.get('paymentId');
  const isEditing = Boolean(paymentId);

  const { user } = useAuth();
  const { settings } = useSettings();
  const { customers, loading: customersLoading } = useCustomers();
  const { sales, loading: salesLoading } = useAllSales();
  const { payments, loading: paymentsLoading } = useAllPayments();
  const { success, error: toastError } = useToast();

  const timezone = settings?.timezone || 'Asia/Kolkata';

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId);
  const [amountRupees, setAmountRupees] = useState<number | string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [dateStr, setDateStr] = useState(getTodayKey(timezone));
  const [note, setNote] = useState('');
  const [sendReceipt, setSendReceipt] = useState(true);

  const [saving, setSaving] = useState(false);
  const [savedReceiptModal, setSavedReceiptModal] = useState<{
    text: string;
    waUrl: string;
    customerId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Existing payment if editing
  const existingPayment = useMemo(
    () => payments.find((p) => p.id === paymentId),
    [payments, paymentId]
  );

  useEffect(() => {
    if (existingPayment) {
      setSelectedCustomerId(existingPayment.customerId);
      setAmountRupees(toRupees(existingPayment.amount));
      setPaymentMode(existingPayment.paymentMode);
      setDateStr(existingPayment.dateKey);
      setNote(existingPayment.note || '');
      setSendReceipt(false); // don't re-send receipt when editing
    } else if (preselectedCustomerId) {
      setSelectedCustomerId(preselectedCustomerId);
    }
  }, [existingPayment, preselectedCustomerId]);

  const activeCustomers = useMemo(
    () => customers.filter((c) => c.isActive || c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const currentCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  // Current balance
  const currentBalance = useMemo(() => {
    if (!selectedCustomerId) return 0;
    const custSales = sales.filter((s) => s.customerId === selectedCustomerId && !s.isVoided);
    const custPayments = payments.filter((p) => p.customerId === selectedCustomerId && !p.isVoided);
    return calcCustomerBalance(custSales, custPayments);
  }, [sales, payments, selectedCustomerId]);

  const numAmountPaise = toPaise(Number(amountRupees) || 0);
  const projectedBalance = currentBalance - numAmountPaise;

  const isValid =
    selectedCustomerId !== '' &&
    numAmountPaise > 0 &&
    dateStr !== '';

  async function handleSavePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isValid || !currentCustomer) return;

    setSaving(true);
    try {
      const payDate = parseDateKey(dateStr);
      // Client-side doc ID generation for idempotency
      const docId = paymentId || uuidv4();

      await savePayment(
        user.uid,
        {
          customerId: currentCustomer.id,
          customerName: currentCustomer.name,
          amount: numAmountPaise,
          paymentMode,
          date: payDate,
          note: note.trim(),
        },
        timezone,
        docId
      );

      success(isEditing ? 'Payment updated successfully' : 'Payment recorded successfully');

      // Build WhatsApp payment receipt text (format from spec Section 14)
      const shopName = settings?.shopName || 'Hisab';
      const balanceDisplay =
        projectedBalance < 0
          ? `Credit: ₹${Math.abs(Math.round(projectedBalance / 100))}`
          : `₹${Math.round(projectedBalance / 100)}`;

      const receiptText =
`*${shopName}* – Payment Receipt
Customer: ${currentCustomer.name}${currentCustomer.shopName ? ` (${currentCustomer.shopName})` : ''}
Received: ₹${Math.round(numAmountPaise / 100)} via ${paymentMode} on ${formatDateDisplay(dateStr)}
Balance now: ${balanceDisplay}
Thank you!`;

      const waPhone = getWhatsAppNumber(
        currentCustomer.whatsappNumber,
        currentCustomer.phoneNumber
      );
      const url = whatsappUrl(waPhone, receiptText);

      if (sendReceipt && !isEditing) {
        // Try opening WhatsApp in a new tab
        try {
          window.open(url, '_blank');
        } catch (err) {
          console.warn('Popup blocked, falling back to modal');
        }
        // Show receipt confirmation modal with copy option
        setSavedReceiptModal({
          text: receiptText,
          waUrl: url,
          customerId: currentCustomer.id,
        });
      } else {
        router.push(`/main/customers/${currentCustomer.id}`);
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  function handleCopyReceipt() {
    if (!savedReceiptModal) return;
    navigator.clipboard.writeText(savedReceiptModal.text);
    setCopied(true);
    success('Receipt text copied');
    setTimeout(() => setCopied(false), 2000);
  }

  if (customersLoading || (isEditing && paymentsLoading)) {
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
          {isEditing ? 'Edit Payment' : 'Record Payment Received'}
        </h1>
        <div className="w-10" />
      </div>

      <Card padding="md" className="p-4 sm:p-6 space-y-5">
        <form onSubmit={handleSavePayment} className="space-y-4">
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
              <div className="text-xs text-[#888888] mt-1">
                Current Outstanding: <strong>{formatINR(currentBalance)}</strong>
              </div>
            )}
          </div>

          {/* Amount (₹) */}
          <Input
            label="Amount Received (₹) *"
            type="number"
            inputMode="decimal"
            step="1"
            min="1"
            placeholder="0"
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            required
          />

          {/* Payment Mode */}
          <Select
            label="Payment Mode"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as any)}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)' },
              { value: 'Bank', label: 'Bank Transfer / NEFT / IMPS' },
            ]}
          />

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A2E] mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#EBEBEB] text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A9E6A]"
              required
            />
          </div>

          {/* Note */}
          <Input
            label="Note (optional)"
            placeholder="e.g. Cleared bill for Monday, UPI ref #9872"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {/* Balance projection box */}
          {currentCustomer && numAmountPaise > 0 && (
            <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs text-[#1A1A2E]">
              <span>Balance after this payment:</span>
              <span className="font-bold text-sm">
                {projectedBalance < 0
                  ? `Credit: ${formatINR(Math.abs(projectedBalance))}`
                  : formatINR(projectedBalance)}
              </span>
            </div>
          )}

          {/* WhatsApp receipt toggle */}
          {!isEditing && (
            <Toggle
              label="Send payment receipt on WhatsApp"
              checked={sendReceipt}
              onChange={setSendReceipt}
            />
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!isValid || saving}
            loading={saving}
          >
            {isEditing ? 'Update Payment' : 'Save Payment'}
          </Button>
        </form>
      </Card>

      {/* WhatsApp Receipt Fallback Modal */}
      {savedReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-[#1A9E6A] font-bold text-base">
              <Check className="h-5 w-5" />
              Payment Saved & Receipt Ready
            </div>
            <p className="text-xs text-[#888888]">
              Payment has been safely recorded to your ledger. You can share or copy the receipt below:
            </p>

            <pre className="p-3 rounded-xl bg-gray-50 border border-[#EBEBEB] text-xs font-mono whitespace-pre-wrap text-[#1A1A2E]">
              {savedReceiptModal.text}
            </pre>

            <div className="flex flex-col gap-2">
              <a
                href={savedReceiptModal.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button
                  variant="primary"
                  size="md"
                  className="w-full bg-[#1A9E6A] hover:bg-[#168a5b]"
                  icon={<MessageCircle className="h-4 w-4" />}
                >
                  Open in WhatsApp
                </Button>
              </a>
              <Button
                variant="secondary"
                size="md"
                onClick={handleCopyReceipt}
                icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              >
                {copied ? 'Copied' : 'Copy Receipt Text'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/main/customers/${savedReceiptModal.customerId}`)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
