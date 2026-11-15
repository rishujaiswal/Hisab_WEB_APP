'use client';

import { useState, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCustomers,
  useCustomerSales,
  useCustomerPayments,
  useBillHistory,
} from '@/lib/hooks/useFirestoreData';
import { useSettings } from '@/lib/hooks/useSettings';
import {
  calcCustomerBalance,
  formatINR,
  formatDateDisplay,
  formatPhoneDisplay,
  getPendingColorClass,
  getSaleItemAmount,
  getSaleTotalAmount,
  buildLedger,
  getWhatsAppNumber,
  whatsappUrl,
  toRupees,
} from '@/lib/domain';
import { voidSale, voidPayment } from '@/lib/firebase/mutations';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import {
  ChevronLeft,
  ShoppingCart,
  Wallet,
  Edit,
  Phone,
  MessageCircle,
  FileText,
  Ban,
  Download,
  Calendar,
  Clock,
  Send,
} from 'lucide-react';

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.customerId;
  const router = useRouter();

  const { settings } = useSettings();
  const { customers, loading: customersLoading } = useCustomers();
  const { sales, loading: salesLoading } = useCustomerSales(customerId);
  const { payments, loading: paymentsLoading } = useCustomerPayments(customerId);
  const { history, loading: historyLoading } = useBillHistory(customerId);
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'ledger' | 'payments' | 'bills'>('ledger');
  const [voidItem, setVoidItem] = useState<{ type: 'sale' | 'payment'; id: string } | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  const customer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId]
  );

  const loading = customersLoading || salesLoading || paymentsLoading;

  // Active entries (non-voided)
  const activeSales = useMemo(() => sales.filter((s) => !s.isVoided), [sales]);
  const activePayments = useMemo(() => payments.filter((p) => !p.isVoided), [payments]);

  // Derived balance
  const balance = useMemo(
    () => calcCustomerBalance(activeSales, activePayments),
    [activeSales, activePayments]
  );

  const totalSalesVal = useMemo(
    () => activeSales.reduce((sum, s) => sum + getSaleTotalAmount(s), 0),
    [activeSales]
  );

  const totalReceivedVal = useMemo(
    () => activePayments.reduce((sum, p) => sum + p.amount, 0),
    [activePayments]
  );

  // Chronologically calculated ledger with running balance, sorted newest first
  const ledger = useMemo(
    () => buildLedger(sales, payments),
    [sales, payments]
  );

  if (loading) return <PageLoading />;

  if (!customer) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <EmptyState
          title="Customer not found"
          description="The requested customer does not exist or has been removed."
          action={
            <Link href="/main/customers">
              <Button variant="secondary">Back to Customers</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const waTarget = getWhatsAppNumber(customer.whatsappNumber, customer.phoneNumber);

  async function handleConfirmVoid() {
    if (!voidItem) return;
    setVoidLoading(true);
    try {
      if (voidItem.type === 'sale') {
        await voidSale(voidItem.id, voidReason || 'Voided by user');
        success('Sale entry voided');
      } else {
        await voidPayment(voidItem.id, voidReason || 'Voided by user');
        success('Payment entry voided');
      }
      setVoidItem(null);
      setVoidReason('');
    } catch (err: any) {
      toastError(err.message || 'Failed to void entry');
    } finally {
      setVoidLoading(false);
    }
  }

  function exportLedgerCSV() {
    if (!customer || ledger.length === 0) return;
    const rows = [
      ['Date', 'Type', 'Description', 'Debit (₹)', 'Credit (₹)', 'Running Balance (₹)', 'Status'],
    ];

    ledger.forEach((item) => {
      const isSale = item.type === 'sale';
      const isVoid = item.data.isVoided;
      const date = item.data.dateKey;
      let desc = '';
      let debit = 0;
      let credit = 0;

      if (isSale) {
        const s = item.data as any;
        desc = `${s.fruitName} (${s.crates} crates @ ₹${toRupees(s.ratePerKg)}/kg)`;
        debit = toRupees(getSaleTotalAmount(s));
      } else {
        const p = item.data as any;
        desc = `Payment (${p.paymentMode}${p.note ? ` - ${p.note}` : ''})`;
        credit = toRupees(p.amount);
      }

      rows.push([
        date,
        isSale ? 'Sale' : 'Payment',
        `"${desc.replace(/"/g, '""')}"`,
        debit > 0 ? debit.toString() : '',
        credit > 0 ? credit.toString() : '',
        toRupees(item.runningBalance).toString(),
        isVoid ? 'Voided' : 'Active',
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${customer.name.replace(/\s+/g, '_')}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Ledger exported as CSV');
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Back button & Actions header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/main/customers')}
          className="flex items-center gap-1 text-sm text-[#888888] hover:text-[#1A1A2E]"
        >
          <ChevronLeft className="h-4 w-4" />
          All Customers
        </button>

        <div className="flex flex-wrap gap-2">
          <Link href={`/main/add-sale?customerId=${customer.id}`}>
            <Button variant="primary" size="sm" icon={<ShoppingCart className="h-4 w-4" />}>
              Add Sale
            </Button>
          </Link>
          <Link href={`/main/add-payment?customerId=${customer.id}`}>
            <Button variant="secondary" size="sm" icon={<Wallet className="h-4 w-4" />}>
              Add Payment
            </Button>
          </Link>
          <Link href={`/main/add-customer?customerId=${customer.id}`}>
            <Button variant="secondary" size="sm" icon={<Edit className="h-4 w-4" />}>
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Customer Profile Card */}
      <Card padding="md" className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A2E]">{customer.name}</h1>
              {!customer.isActive && <Badge variant="warning">Inactive</Badge>}
              {customer.customerType === 'Wholesale' && <Badge variant="info">Wholesale</Badge>}
            </div>
            <div className="text-sm text-[#888888] mt-0.5">
              {customer.shopName || 'No shop name'}
              {customer.address ? ` • ${customer.address}` : ''}
            </div>
            <div className="flex items-center gap-3 text-xs text-[#888888] mt-2">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {formatPhoneDisplay(customer.phoneNumber)}
              </span>
              <a
                href={whatsappUrl(waTarget, `Namaste ${customer.name} ji,`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#1A9E6A] hover:underline"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            </div>
          </div>

          {/* Balance block */}
          <div className="p-3 sm:p-4 rounded-2xl bg-gray-50 border border-[#EBEBEB] text-right shrink-0">
            <div className="text-xs font-medium text-[#888888]">Outstanding Balance</div>
            <div className={`text-xl sm:text-2xl font-bold mt-0.5 ${getPendingColorClass(balance)}`}>
              {balance < 0 ? `Credit ${formatINR(Math.abs(balance))}` : formatINR(balance)}
            </div>
            <div className="text-[11px] font-medium text-[#888888]">
              {balance === 0 ? 'All Clear!' : balance < 0 ? 'Customer Credit' : 'Pending Due'}
            </div>
          </div>
        </div>

        {/* 3-Part Financial Summary */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#EBEBEB] text-center">
          <div>
            <div className="text-[11px] font-medium text-[#888888]">All-time Sales</div>
            <div className="text-sm sm:text-base font-bold text-[#1A1A2E] mt-0.5">
              {formatINR(totalSalesVal)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-[#888888]">Total Received</div>
            <div className="text-sm sm:text-base font-bold text-[#1A9E6A] mt-0.5">
              {formatINR(totalReceivedVal)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-[#888888]">Pending Due</div>
            <div className={`text-sm sm:text-base font-bold mt-0.5 ${getPendingColorClass(balance)}`}>
              {balance < 0 ? `-${formatINR(Math.abs(balance))}` : formatINR(balance)}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-[#EBEBEB] flex items-center justify-between">
        <div className="flex gap-4">
          {(['ledger', 'payments', 'bills'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-semibold capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#1A9E6A] text-[#1A9E6A]'
                  : 'border-transparent text-[#888888] hover:text-[#1A1A2E]'
              }`}
            >
              {tab === 'bills' ? 'Bills & Statements' : tab}
            </button>
          ))}
        </div>

        {activeTab === 'ledger' && ledger.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={exportLedgerCSV}
            icon={<Download className="h-4 w-4" />}
          >
            Export CSV
          </Button>
        )}
      </div>

      {/* Tab 1: Ledger */}
      {activeTab === 'ledger' && (
        <div className="space-y-3">
          {ledger.length === 0 ? (
            <EmptyState
              title="No entries yet"
              description="Record a sale or payment to start generating the customer ledger."
              action={
                <Link href={`/main/add-sale?customerId=${customer.id}`}>
                  <Button variant="primary" size="sm">
                    Record First Sale
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {ledger.map((item) => {
                const isSale = item.type === 'sale';
                const isVoided = item.data.isVoided;

                if (isSale) {
                  const sale = item.data as any;
                  const itemAmt = getSaleItemAmount(sale);
                  const totalAmt = getSaleTotalAmount(sale);

                  return (
                    <Card
                      key={`sale-${sale.id}`}
                      padding="sm"
                      className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isVoided ? 'opacity-50 bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-green-50 text-[#1A9E6A] flex items-center justify-center shrink-0 mt-0.5">
                          <ShoppingCart className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#1A1A2E]">
                              {sale.fruitName}
                            </span>
                            <span className="text-xs text-[#888888]">
                              ({sale.crates} crate{sale.crates !== 1 ? 's' : ''} × {sale.weightPerCrate}kg @ ₹{toRupees(sale.ratePerKg)}/kg)
                            </span>
                            {isVoided && <Badge variant="danger">Voided</Badge>}
                          </div>
                          <div className="text-xs text-[#888888] mt-0.5">
                            {formatDateDisplay(sale.dateKey)}
                            {sale.deliveryCharge > 0 && ` • Delivery: ${formatINR(sale.deliveryCharge)}`}
                            {sale.notes && ` • Note: ${sale.notes}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-11 sm:pl-0">
                        <div className="text-left sm:text-right">
                          <div className="text-sm font-bold text-red-600">
                            +{formatINR(totalAmt)}
                          </div>
                          <div className="text-[11px] text-[#888888]">
                            Balance: {formatINR(item.runningBalance)}
                          </div>
                        </div>

                        {!isVoided && (
                          <div className="flex gap-1">
                            <Link href={`/main/add-sale?saleId=${sale.id}`}>
                              <button
                                className="p-1.5 text-[#888888] hover:text-[#1A1A2E] rounded-lg hover:bg-gray-100"
                                title="Edit sale"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            </Link>
                            <button
                              onClick={() => setVoidItem({ type: 'sale', id: sale.id })}
                              className="p-1.5 text-[#888888] hover:text-red-600 rounded-lg hover:bg-gray-100"
                              title="Void sale entry"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                } else {
                  const payment = item.data as any;

                  return (
                    <Card
                      key={`pay-${payment.id}`}
                      padding="sm"
                      className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isVoided ? 'opacity-50 bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#007AFF] flex items-center justify-center shrink-0 mt-0.5">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#1A1A2E]">
                              Payment Received
                            </span>
                            <Badge variant="success">{payment.paymentMode}</Badge>
                            {isVoided && <Badge variant="danger">Voided</Badge>}
                          </div>
                          <div className="text-xs text-[#888888] mt-0.5">
                            {formatDateDisplay(payment.dateKey)}
                            {payment.note && ` • Note: ${payment.note}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-11 sm:pl-0">
                        <div className="text-left sm:text-right">
                          <div className="text-sm font-bold text-green-600">
                            -{formatINR(payment.amount)}
                          </div>
                          <div className="text-[11px] text-[#888888]">
                            Balance: {formatINR(item.runningBalance)}
                          </div>
                        </div>

                        {!isVoided && (
                          <div className="flex gap-1">
                            <Link href={`/main/add-payment?paymentId=${payment.id}`}>
                              <button
                                className="p-1.5 text-[#888888] hover:text-[#1A1A2E] rounded-lg hover:bg-gray-100"
                                title="Edit payment"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            </Link>
                            <button
                              onClick={() => setVoidItem({ type: 'payment', id: payment.id })}
                              className="p-1.5 text-[#888888] hover:text-red-600 rounded-lg hover:bg-gray-100"
                              title="Void payment entry"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                }
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Payments Only */}
      {activeTab === 'payments' && (
        <div className="space-y-3">
          {payments.length === 0 ? (
            <EmptyState
              title="No payments recorded"
              description="No payments have been received from this customer yet."
              action={
                <Link href={`/main/add-payment?customerId=${customer.id}`}>
                  <Button variant="primary" size="sm">
                    Add Payment
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <Card
                  key={p.id}
                  padding="sm"
                  className={`p-3 sm:p-4 flex items-center justify-between gap-3 ${
                    p.isVoided ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#007AFF] flex items-center justify-center shrink-0">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#1A1A2E]">
                          {formatINR(p.amount)}
                        </span>
                        <Badge variant="success">{p.paymentMode}</Badge>
                        {p.isVoided && <Badge variant="danger">Voided</Badge>}
                      </div>
                      <div className="text-xs text-[#888888] mt-0.5">
                        {formatDateDisplay(p.dateKey)}
                        {p.note && ` • ${p.note}`}
                      </div>
                    </div>
                  </div>

                  {!p.isVoided && (
                    <button
                      onClick={() => setVoidItem({ type: 'payment', id: p.id })}
                      className="text-xs text-red-600 hover:underline p-1"
                    >
                      Void
                    </button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Bills & Statements */}
      {activeTab === 'bills' && (
        <div className="space-y-6">
          {/* Quick statement generators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { type: 'today', label: "Today's Bill", desc: 'Activity and due for today' },
              { type: 'weekly', label: 'Weekly Statement', desc: 'Current billing week' },
              { type: 'monthly', label: 'Monthly Statement', desc: 'Current calendar month' },
            ].map(({ type, label, desc }) => (
              <Card key={type} padding="md" className="space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#1A9E6A] font-semibold text-sm">
                    <Calendar className="h-4 w-4" />
                    {label}
                  </div>
                  <p className="text-xs text-[#888888] mt-1">{desc}</p>
                </div>
                <Link href={`/main/bills/${customer.id}/${type}`} className="block">
                  <Button variant="secondary" size="sm" className="w-full">
                    View Statement
                  </Button>
                </Link>
              </Card>
            ))}
          </div>

          {/* Past Send History */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-[#1A1A2E]">Bill Send History</h2>
            {history.length === 0 ? (
              <Card padding="md" className="text-center py-6 text-sm text-[#888888]">
                No bills or statements sent to this customer yet.
              </Card>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <Card
                    key={h.id}
                    padding="sm"
                    className="p-3 sm:p-4 flex items-center justify-between text-xs sm:text-sm"
                  >
                    <div>
                      <div className="font-semibold text-[#1A1A2E] capitalize">
                        {h.billType} Statement ({h.dateFrom} to {h.dateTo})
                      </div>
                      <div className="text-xs text-[#888888] mt-0.5">
                        Sent via {h.sentVia} • Amount Due: {formatINR(h.pendingAmount)}
                      </div>
                    </div>
                    <Badge variant="info">{h.sentVia}</Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Void Dialog */}
      <ConfirmDialog
        open={Boolean(voidItem)}
        title={`Void ${voidItem?.type === 'sale' ? 'Sale Entry' : 'Payment'}?`}
        description="Voiding will remove this entry from accounting totals and update customer balance immediately. This action cannot be reversed."
        confirmLabel="Void Entry"
        confirmVariant="danger"
        onConfirm={handleConfirmVoid}
        onCancel={() => {
          setVoidItem(null);
          setVoidReason('');
        }}
        loading={voidLoading}
      />
    </div>
  );
}
