'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  useCustomers,
  useAllSales,
  useAllPayments,
} from '@/lib/hooks/useFirestoreData';
import { useSettings } from '@/lib/hooks/useSettings';
import {
  calcCustomerBalance,
  formatINR,
  getPendingColorClass,
  getTodayKey,
  formatDateDisplay,
  toPaise,
  toRupees,
  getWhatsAppNumber,
  whatsappUrl,
  getPeriodBounds,
  calcBillSummary,
} from '@/lib/domain';
import { savePayment, saveBillHistory } from '@/lib/firebase/mutations';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import {
  FileText,
  Search,
  X,
  Calendar,
  Wallet,
  Send,
  MessageCircle,
  Check,
  AlertTriangle,
  Download,
  Users,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function BillsDashboardPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { customers, loading: customersLoading } = useCustomers();
  const { sales, loading: salesLoading } = useAllSales();
  const { payments, loading: paymentsLoading } = useAllPayments();
  const { success, error: toastError } = useToast();

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'paid' | 'high'>('all');

  // Quick payment state per customer: customerId -> amount string
  const [quickPayments, setQuickPayments] = useState<Record<string, string>>({});
  const [quickPayLoading, setQuickPayLoading] = useState<Record<string, boolean>>({});
  const [quickWaReceipt, setQuickWaReceipt] = useState(true);

  // Bulk review modal state
  const [bulkQueueType, setBulkQueueType] = useState<'weekly' | 'monthly' | null>(null);
  const [sentCustomerIds, setSentCustomerIds] = useState<Record<string, boolean>>({});

  const loading = customersLoading || salesLoading || paymentsLoading;
  const timezone = settings?.timezone || 'Asia/Kolkata';
  const weeklyStartDay = settings?.weeklyStartDay || 1;

  const activeSales = useMemo(() => sales.filter((s) => !s.isVoided), [sales]);
  const activePayments = useMemo(() => payments.filter((p) => !p.isVoided), [payments]);

  // Compute balance and last activity for all customers
  const customersWithFinancials = useMemo(() => {
    return customers.map((c) => {
      const custSales = activeSales.filter((s) => s.customerId === c.id);
      const custPayments = activePayments.filter((p) => p.customerId === c.id);
      const balance = calcCustomerBalance(custSales, custPayments);

      // Find last activity dateKey
      let lastActivity = 'No activity';
      const allDates = [
        ...custSales.map((s) => s.dateKey),
        ...custPayments.map((p) => p.dateKey),
      ].sort();

      if (allDates.length > 0) {
        lastActivity = formatDateDisplay(allDates[allDates.length - 1]);
      }

      return {
        ...c,
        balance,
        lastActivity,
        salesCount: custSales.length,
        paymentsCount: custPayments.length,
      };
    });
  }, [customers, activeSales, activePayments]);

  // Filtered list
  const filteredCustomers = useMemo(() => {
    let list = customersWithFinancials;

    if (filterMode === 'pending') {
      list = list.filter((c) => c.balance > 0);
    } else if (filterMode === 'paid') {
      list = list.filter((c) => c.balance <= 0);
    } else if (filterMode === 'high') {
      list = list.filter((c) => c.balance > 500000); // > ₹5,000
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phoneNumber.includes(q) ||
          (c.shopName && c.shopName.toLowerCase().includes(q))
      );
    }

    // Sort: highest pending balance first
    return list.sort((a, b) => b.balance - a.balance);
  }, [customersWithFinancials, filterMode, search]);

  // Overall totals
  const totalPendingPaise = useMemo(
    () => calcCustomerBalance(activeSales, activePayments),
    [activeSales, activePayments]
  );

  const highBalanceCount = useMemo(
    () => customersWithFinancials.filter((c) => c.balance > 500000).length,
    [customersWithFinancials]
  );

  // Quick payment handler
  async function handleQuickPay(customerId: string) {
    if (!user) return;
    const amountStr = quickPayments[customerId];
    const amountRupees = Number(amountStr);
    if (!amountRupees || amountRupees <= 0) return;

    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    setQuickPayLoading((prev) => ({ ...prev, [customerId]: true }));
    try {
      const amountPaise = toPaise(amountRupees);
      const today = new Date();
      const todayKeyStr = getTodayKey(timezone);

      await savePayment(
        user.uid,
        {
          customerId,
          customerName: customer.name,
          amount: amountPaise,
          paymentMode: 'Cash',
          date: today,
          note: 'Quick payment from Bills dashboard',
        },
        timezone,
        uuidv4()
      );

      success(`₹${amountRupees} recorded for ${customer.name}`);
      setQuickPayments((prev) => ({ ...prev, [customerId]: '' }));

      if (quickWaReceipt) {
        // Calculate new balance
        const updatedBal = (customer as any).balance - amountPaise;
        const balText =
          updatedBal < 0
            ? `Credit: ₹${Math.abs(Math.round(updatedBal / 100))}`
            : `₹${Math.round(updatedBal / 100)}`;

        const receipt =
`*${settings?.shopName || 'Hisab'}* – Payment Receipt
Customer: ${customer.name}${customer.shopName ? ` (${customer.shopName})` : ''}
Received: ₹${amountRupees} via Cash on ${formatDateDisplay(todayKeyStr)}
Balance now: ${balText}
Thank you!`;

        const waPhone = getWhatsAppNumber(customer.whatsappNumber, customer.phoneNumber);
        window.open(whatsappUrl(waPhone, receipt), '_blank');
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to record payment');
    } finally {
      setQuickPayLoading((prev) => ({ ...prev, [customerId]: false }));
    }
  }

  // Bulk queue preparation
  const bulkQueueCustomers = useMemo(() => {
    if (!bulkQueueType) return [];
    // Only customers who have non-zero balance or activity in this period
    const bounds = getPeriodBounds(bulkQueueType, weeklyStartDay, timezone);
    return customersWithFinancials.filter((c) => {
      const custSales = activeSales.filter((s) => s.customerId === c.id);
      const custPayments = activePayments.filter((p) => p.customerId === c.id);
      const summary = calcBillSummary(custSales, custPayments, bounds.startKey, bounds.endKey);
      return summary.totalPending !== 0 || summary.currentBill !== 0;
    });
  }, [bulkQueueType, customersWithFinancials, activeSales, activePayments, weeklyStartDay, timezone]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-36 bg-gray-200 animate-pulse rounded-lg" />
          <div className="h-8 w-48 bg-gray-200 animate-pulse rounded-lg" />
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A2E]">Send Bills</h1>
          <p className="text-xs text-[#888888]">
            Share statements via WhatsApp or PDF and record quick cash collections
          </p>
        </div>

        {/* Bulk Send Actions */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setBulkQueueType('weekly');
              setSentCustomerIds({});
            }}
            icon={<Send className="h-4 w-4 text-[#1A9E6A]" />}
          >
            Send Weekly Bills
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setBulkQueueType('monthly');
              setSentCustomerIds({});
            }}
            icon={<Send className="h-4 w-4 text-[#007AFF]" />}
          >
            Send Monthly Bills
          </Button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card padding="sm" className="p-3 sm:p-4">
          <div className="text-xs text-[#888888]">Total Pending</div>
          <div className={`text-lg sm:text-2xl font-bold mt-1 ${getPendingColorClass(totalPendingPaise)}`}>
            {totalPendingPaise < 0 ? `Credit ${formatINR(Math.abs(totalPendingPaise))}` : formatINR(totalPendingPaise)}
          </div>
        </Card>
        <Card padding="sm" className="p-3 sm:p-4">
          <div className="text-xs text-[#888888]">High Balance (&gt; ₹5,000)</div>
          <div className="text-lg sm:text-2xl font-bold text-red-600 mt-1">
            {highBalanceCount} customer{highBalanceCount !== 1 ? 's' : ''}
          </div>
        </Card>
        <Card padding="sm" className="p-3 sm:p-4 col-span-2 sm:col-span-1">
          <div className="text-xs text-[#888888]">WhatsApp Receipt</div>
          <div className="mt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#1A1A2E]">
              <input
                type="checkbox"
                checked={quickWaReceipt}
                onChange={(e) => setQuickWaReceipt(e.target.checked)}
                className="rounded border-[#EBEBEB] text-[#1A9E6A] focus:ring-[#1A9E6A]"
              />
              <span>Auto-open WhatsApp on quick payment</span>
            </label>
          </div>
        </Card>
      </div>

      {/* Search and Filter Chips */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888888]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, or shop..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#EBEBEB] text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A9E6A]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#1A1A2E]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending Due' },
            { id: 'high', label: 'High Balance' },
            { id: 'paid', label: 'Cleared' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilterMode(id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterMode === id
                  ? 'bg-[#1A1A2E] text-white shadow-sm'
                  : 'bg-white border border-[#EBEBEB] text-[#888888] hover:text-[#1A1A2E]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Cards */}
      {customers.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10 text-[#888888]" />}
          title="No customers for billing"
          description="Add produce customers and sales entries to generate shareable statements."
          action={
            <Link href="/main/add-customer">
              <Button variant="primary">Add Customer</Button>
            </Link>
          }
        />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<Search className="h-10 w-10 text-[#888888]" />}
          title="No customers match criteria"
          description="Try adjusting your search terms or filter selection."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setFilterMode('all');
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((c) => {
            const hasPending = c.balance > 0;
            const isHigh = c.balance > 500000;

            return (
              <Card
                key={c.id}
                padding="md"
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/main/customers/${c.id}`}
                      className="text-base font-bold text-[#1A1A2E] hover:underline truncate"
                    >
                      {c.name}
                    </Link>
                    {isHigh && <Badge variant="danger">High Balance</Badge>}
                    {c.balance < 0 && <Badge variant="success">Credit</Badge>}
                    {c.balance === 0 && <Badge variant="default">All Clear</Badge>}
                  </div>

                  <div className="text-xs text-[#888888] mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{c.shopName || 'No shop name'}</span>
                    <span>• Last Activity: {c.lastActivity}</span>
                  </div>

                  {/* Period Bill Links */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-xs font-medium text-[#888888]">View Statement:</span>
                    <Link href={`/main/bills/${c.id}/today`}>
                      <span className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#1A9E6A]/10 hover:text-[#1A9E6A] text-xs font-medium text-[#1A1A2E] transition-colors">
                        Today
                      </span>
                    </Link>
                    <Link href={`/main/bills/${c.id}/weekly`}>
                      <span className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#1A9E6A]/10 hover:text-[#1A9E6A] text-xs font-medium text-[#1A1A2E] transition-colors">
                        Weekly
                      </span>
                    </Link>
                    <Link href={`/main/bills/${c.id}/monthly`}>
                      <span className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#1A9E6A]/10 hover:text-[#1A9E6A] text-xs font-medium text-[#1A1A2E] transition-colors">
                        Monthly
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Right: Balance & Quick Cash Payment */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-[#EBEBEB]">
                  {/* Balance Display */}
                  <div className="text-left md:text-right shrink-0 min-w-[120px]">
                    <div className="text-xs text-[#888888]">Balance Due</div>
                    <div className={`text-lg sm:text-xl font-bold ${getPendingColorClass(c.balance)}`}>
                      {c.balance < 0
                        ? `Credit ${formatINR(Math.abs(c.balance))}`
                        : formatINR(c.balance)}
                    </div>
                  </div>

                  {/* Quick Payment Input */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#888888]">
                        ₹
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="Amount"
                        value={quickPayments[c.id] || ''}
                        onChange={(e) =>
                          setQuickPayments((prev) => ({
                            ...prev,
                            [c.id]: e.target.value,
                          }))
                        }
                        className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border border-[#EBEBEB] text-[#1A1A2E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A9E6A]"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleQuickPay(c.id)}
                      disabled={!quickPayments[c.id] || quickPayLoading[c.id]}
                      loading={quickPayLoading[c.id]}
                    >
                      Receive
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reviewed Bulk Send Queue Modal (Section 13) */}
      {bulkQueueType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#1A1A2E] capitalize">
                  Review &amp; Send {bulkQueueType} Statements
                </h2>
                <p className="text-xs text-[#888888]">
                  WhatsApp requires user-initiated sending. Review each customer and tap Open WhatsApp.
                </p>
              </div>
              <button
                onClick={() => setBulkQueueType(null)}
                className="p-1 rounded-lg text-[#888888] hover:text-[#1A1A2E]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {bulkQueueCustomers.length === 0 ? (
                <div className="text-center py-8 text-sm text-[#888888]">
                  No customers with pending balances or activity for this period.
                </div>
              ) : (
                bulkQueueCustomers.map((c) => {
                  const isMarkedSent = sentCustomerIds[c.id];
                  const waTarget = getWhatsAppNumber(c.whatsappNumber, c.phoneNumber);

                  // Calculate period bill summary
                  const bounds = getPeriodBounds(bulkQueueType, weeklyStartDay, timezone);
                  const custSales = activeSales.filter((s) => s.customerId === c.id);
                  const custPayments = activePayments.filter((p) => p.customerId === c.id);
                  const summary = calcBillSummary(custSales, custPayments, bounds.startKey, bounds.endKey);

                  const periodLabel = bulkQueueType === 'weekly' ? 'Weekly' : 'Monthly';
                  const waBillText =
`*${settings?.shopName || 'Hisab'}*
Statement: ${periodLabel} (${formatDateDisplay(bounds.startKey)} – ${formatDateDisplay(bounds.endKey)})
Customer: ${c.name}${c.shopName ? ` - ${c.shopName}` : ''}

Previous Pending: ${formatINR(summary.openingBalance)}
Fruit Total: ${formatINR(summary.fruitTotal)}
Delivery: ${formatINR(summary.deliveryTotal)}
Paid: ${formatINR(summary.periodPaid)}
Current Bill: ${formatINR(summary.currentBill)}
*Total Pending: ${formatINR(summary.totalPending)}*

Thank you! – ${settings?.ownerName || 'Owner'}, ${settings?.shopPhone || ''}`;

                  const sendUrl = whatsappUrl(waTarget, waBillText);

                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                        isMarkedSent ? 'bg-green-50/50 border-green-200' : 'bg-gray-50 border-[#EBEBEB]'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-[#1A1A2E]">{c.name}</div>
                        <div className="text-[11px] text-[#888888]">
                          {c.shopName || 'No shop'} • Due: <strong>{formatINR(summary.totalPending)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/main/bills/${c.id}/${bulkQueueType}`}
                          target="_blank"
                          className="px-2 py-1 text-[11px] text-[#888888] hover:text-[#1A1A2E] hover:underline"
                        >
                          Preview
                        </Link>

                        <a
                          href={sendUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            setSentCustomerIds((prev) => ({ ...prev, [c.id]: true }));
                            if (user) {
                              saveBillHistory(user.uid, {
                                customerId: c.id,
                                customerName: c.name,
                                billType: bulkQueueType,
                                dateFrom: bounds.startKey,
                                dateTo: bounds.endKey,
                                totalPurchases: summary.fruitTotal,
                                totalDelivery: summary.deliveryTotal,
                                totalPaid: summary.periodPaid,
                                pendingAmount: summary.totalPending,
                                sentVia: 'WhatsApp',
                              });
                            }
                          }}
                        >
                          <Button
                            variant="primary"
                            size="sm"
                            className="text-xs bg-[#1A9E6A] hover:bg-[#168a5b]"
                            icon={<MessageCircle className="h-3.5 w-3.5" />}
                          >
                            Open WhatsApp
                          </Button>
                        </a>

                        <button
                          onClick={() =>
                            setSentCustomerIds((prev) => ({
                              ...prev,
                              [c.id]: !prev[c.id],
                            }))
                          }
                          className={`p-1.5 rounded-lg border ${
                            isMarkedSent
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white border-[#EBEBEB] text-[#888888]'
                          }`}
                          title="Mark as sent"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-[#EBEBEB] flex justify-between items-center">
              <span className="text-xs text-[#888888]">
                {Object.values(sentCustomerIds).filter(Boolean).length} of {bulkQueueCustomers.length} sent
              </span>
              <Button variant="secondary" size="sm" onClick={() => setBulkQueueType(null)}>
                Close Queue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
