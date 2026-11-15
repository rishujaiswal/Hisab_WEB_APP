'use client';

import { useState, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCustomers,
  useCustomerSales,
  useCustomerPayments,
} from '@/lib/hooks/useFirestoreData';
import { useSettings } from '@/lib/hooks/useSettings';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  getPeriodBounds,
  calcBillSummary,
  formatINR,
  formatDateDisplay,
  formatPhoneDisplay,
  getPendingColorClass,
  getSaleItemAmount,
  getSaleTotalAmount,
  getWhatsAppNumber,
  whatsappUrl,
  toRupees,
  isDateKeyInRange,
} from '@/lib/domain';
import { saveBillHistory } from '@/lib/firebase/mutations';
import type { BillType } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import {
  ChevronLeft,
  Copy,
  Check,
  MessageCircle,
  Download,
  Printer,
  Calendar,
  Share2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function BillPreviewPage({
  params,
}: {
  params: Promise<{ customerId: string; billType: string }>;
}) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.customerId;
  const rawBillType = resolvedParams.billType;
  const billType: BillType =
    rawBillType === 'weekly' || rawBillType === 'monthly' ? rawBillType : 'today';

  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { customers, loading: customersLoading } = useCustomers();
  const { sales, loading: salesLoading } = useCustomerSales(customerId);
  const { payments, loading: paymentsLoading } = useCustomerPayments(customerId);
  const { success, error: toastError } = useToast();

  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const timezone = settings?.timezone || 'Asia/Kolkata';
  const weeklyStartDay = settings?.weeklyStartDay || 1;

  const loading = customersLoading || salesLoading || paymentsLoading;

  const customer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId]
  );

  // Period bounds
  const bounds = useMemo(
    () => getPeriodBounds(billType, weeklyStartDay, timezone),
    [billType, weeklyStartDay, timezone]
  );

  // Active entries
  const activeSales = useMemo(() => sales.filter((s) => !s.isVoided), [sales]);
  const activePayments = useMemo(() => payments.filter((p) => !p.isVoided), [payments]);

  // In-period entries
  const periodSales = useMemo(
    () =>
      activeSales.filter((s) =>
        isDateKeyInRange(s.dateKey, bounds.startKey, bounds.endKey)
      ),
    [activeSales, bounds]
  );

  const periodPayments = useMemo(
    () =>
      activePayments.filter((p) =>
        isDateKeyInRange(p.dateKey, bounds.startKey, bounds.endKey)
      ),
    [activePayments, bounds]
  );

  // Bill summary calculation
  const summary = useMemo(
    () =>
      calcBillSummary(
        activeSales,
        activePayments,
        bounds.startKey,
        bounds.endKey
      ),
    [activeSales, activePayments, bounds]
  );

  const periodCaption = useMemo(() => {
    if (billType === 'today') {
      return `Today (${formatDateDisplay(bounds.endKey)})`;
    }
    const cap = billType === 'weekly' ? 'Weekly' : 'Monthly';
    return `${cap} Statement (${formatDateDisplay(bounds.startKey)} – ${formatDateDisplay(bounds.endKey)})`;
  }, [billType, bounds]);

  // WhatsApp plain text format (from Section 14)
  const whatsAppText = useMemo(() => {
    if (!customer) return '';
    const shopName = settings?.shopName || 'Hisab';
    const ownerName = settings?.ownerName || 'Owner';
    const shopPhone = settings?.shopPhone ? formatPhoneDisplay(settings.shopPhone) : '';

    const lines = [
      `*${shopName}*`,
      `Statement: ${billType === 'today' ? 'Today' : billType === 'weekly' ? 'Weekly' : 'Monthly'} (${formatDateDisplay(bounds.startKey)}${billType !== 'today' ? ` – ${formatDateDisplay(bounds.endKey)}` : ''})`,
      `Customer: ${customer.name}${customer.shopName ? ` - ${customer.shopName}` : ''}`,
      '',
      `Previous Pending: ${formatINR(summary.openingBalance)}`,
      `Fruit Total: ${formatINR(summary.fruitTotal)}`,
      `Delivery: ${formatINR(summary.deliveryTotal)}`,
      `Paid: ${formatINR(summary.periodPaid)}`,
      `Current Bill: ${formatINR(summary.currentBill)}`,
      `*Total Pending: ${formatINR(summary.totalPending)}*`,
      '',
    ];

    if (periodSales.length > 0) {
      lines.push('--- Item Details ---');
      periodSales.forEach((s) => {
        lines.push(
          `${formatDateDisplay(s.dateKey)} – ${s.fruitName} ${s.crates} crates × ${s.weightPerCrate}kg @ ₹${toRupees(s.ratePerKg)} = ₹${toRupees(getSaleTotalAmount(s))}`
        );
      });
      lines.push('');
    }

    lines.push(`Thank you! – ${ownerName}${shopPhone ? `, ${shopPhone}` : ''}`);
    return lines.join('\n');
  }, [customer, settings, billType, bounds, summary, periodSales]);

  if (loading) return <PageLoading />;

  if (!customer) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <EmptyState
          title="Customer not found"
          description="Could not load statement for the specified customer."
          action={
            <Link href="/main/bills">
              <Button variant="secondary">Back to Bills</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const waTarget = getWhatsAppNumber(customer.whatsappNumber, customer.phoneNumber);
  const waUrl = whatsappUrl(waTarget, whatsAppText);

  // Actions
  function handleCopy() {
    navigator.clipboard.writeText(whatsAppText);
    setCopied(true);
    success('Bill statement text copied');
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleWhatsAppShare() {
    if (!customer) return;
    window.open(waUrl, '_blank');
    if (user) {
      await saveBillHistory(user.uid, {
        customerId: customer.id,
        customerName: customer.name,
        billType,
        dateFrom: bounds.startKey,
        dateTo: bounds.endKey,
        totalPurchases: summary.fruitTotal,
        totalDelivery: summary.deliveryTotal,
        totalPaid: summary.periodPaid,
        pendingAmount: summary.totalPending,
        sentVia: 'WhatsApp',
      });
    }
  }

  async function handleDownloadPDF() {
    if (!customer) return;
    setDownloadingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const shopName = settings?.shopName || 'Hisab Produce';
      const ownerName = settings?.ownerName || '';
      const shopPhone = settings?.shopPhone || '';
      const shopAddress = settings?.shopAddress || '';

      // Header Branding
      doc.setFillColor(26, 26, 46); // #1A1A2E ink
      doc.rect(0, 0, 210, 30, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(shopName, 14, 15);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${ownerName ? `${ownerName} • ` : ''}${shopPhone ? `Phone: ${shopPhone}` : ''}${shopAddress ? ` • ${shopAddress}` : ''}`,
        14,
        23
      );

      // Statement Metadata
      doc.setTextColor(26, 26, 46);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(periodCaption, 14, 42);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Customer: ${customer.name}${customer.shopName ? ` (${customer.shopName})` : ''}`, 14, 49);
      doc.text(`Phone: ${formatPhoneDisplay(customer.phoneNumber)}`, 14, 55);

      // Table of Sales
      const tableRows = periodSales.map((s) => [
        formatDateDisplay(s.dateKey),
        s.fruitName,
        `${s.crates} crates`,
        `${s.weightPerCrate} kg`,
        `Rs. ${toRupees(s.ratePerKg)}`,
        s.deliveryCharge > 0 ? `Rs. ${toRupees(s.deliveryCharge)}` : '-',
        `Rs. ${toRupees(getSaleTotalAmount(s))}`,
      ]);

      const startY = 62;
      autoTable(doc, {
        startY,
        head: [['Date', 'Item', 'Crates', 'Wt/Crate', 'Rate/Kg', 'Delivery', 'Total']],
        body:
          tableRows.length > 0
            ? tableRows
            : [['-', 'No produce sales in this period', '-', '-', '-', '-', 'Rs. 0']],
        theme: 'striped',
        headStyles: { fillColor: [26, 158, 106] }, // #1A9E6A
        styles: { fontSize: 9 },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;

      // Summary Block on the Right
      const rightX = 120;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Previous Pending:', rightX, finalY);
      doc.text(`Rs. ${toRupees(summary.openingBalance)}`, 195, finalY, { align: 'right' });

      doc.text('Fruit Purchases:', rightX, finalY + 6);
      doc.text(`Rs. ${toRupees(summary.fruitTotal)}`, 195, finalY + 6, { align: 'right' });

      doc.text('Delivery Charges:', rightX, finalY + 12);
      doc.text(`Rs. ${toRupees(summary.deliveryTotal)}`, 195, finalY + 12, { align: 'right' });

      doc.text('Period Paid:', rightX, finalY + 18);
      doc.text(`Rs. ${toRupees(summary.periodPaid)}`, 195, finalY + 18, { align: 'right' });

      doc.setDrawColor(200, 200, 200);
      doc.line(rightX, finalY + 22, 195, finalY + 22);

      doc.setFont('helvetica', 'bold');
      doc.text('Total Balance Due:', rightX, finalY + 28);
      doc.text(`Rs. ${toRupees(summary.totalPending)}`, 195, finalY + 28, { align: 'right' });

      // Save PDF
      doc.save(`${customer.name.replace(/\s+/g, '_')}_${billType}_statement.pdf`);
      success('PDF downloaded');

      if (user) {
        await saveBillHistory(user.uid, {
          customerId: customer.id,
          customerName: customer.name,
          billType,
          dateFrom: bounds.startKey,
          dateTo: bounds.endKey,
          totalPurchases: summary.fruitTotal,
          totalDelivery: summary.deliveryTotal,
          totalPaid: summary.periodPaid,
          pendingAmount: summary.totalPending,
          sentVia: 'PDF',
        });
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to generate PDF');
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-[#888888] hover:text-[#1A1A2E]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          >
            {copied ? 'Copied' : 'Copy Text'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            className="bg-[#1A9E6A] hover:bg-[#168a5b]"
            onClick={handleWhatsAppShare}
            icon={<MessageCircle className="h-4 w-4" />}
          >
            WhatsApp
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadPDF}
            loading={downloadingPdf}
            icon={<Download className="h-4 w-4" />}
          >
            Download PDF
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            icon={<Printer className="h-4 w-4" />}
          >
            Print
          </Button>
        </div>
      </div>

      {/* Printable Statement Sheet */}
      <div className="bg-white rounded-3xl border border-[#EBEBEB] p-6 sm:p-10 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Shop Branding Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#EBEBEB]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] tracking-tight">
              {settings?.shopName || 'Hisab'}
            </h1>
            <div className="text-xs sm:text-sm text-[#888888] mt-1 space-y-0.5">
              {settings?.ownerName && <div>Owner: {settings.ownerName}</div>}
              {settings?.shopAddress && <div>Address: {settings.shopAddress}</div>}
              {settings?.shopPhone && <div>Phone: {formatPhoneDisplay(settings.shopPhone)}</div>}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <Badge variant="info" className="text-xs">
              {billType === 'today' ? 'Daily' : billType === 'weekly' ? 'Weekly' : 'Monthly'} Statement
            </Badge>
            <div className="text-xs text-[#888888] mt-2">
              Period: <strong>{formatDateDisplay(bounds.startKey)}</strong>
              {billType !== 'today' && (
                <> to <strong>{formatDateDisplay(bounds.endKey)}</strong></>
              )}
            </div>
          </div>
        </div>

        {/* Bill-To Customer Info */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-[#EBEBEB] flex flex-col sm:flex-row justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-[#888888] uppercase tracking-wide">
              Billed To
            </div>
            <div className="text-base font-bold text-[#1A1A2E] mt-0.5">
              {customer.name}
            </div>
            <div className="text-xs text-[#888888]">
              {customer.shopName ? `${customer.shopName} • ` : ''}
              {formatPhoneDisplay(customer.phoneNumber)}
            </div>
          </div>
          <div className="text-left sm:text-right self-end sm:self-auto">
            <div className="text-xs text-[#888888]">Statement Date</div>
            <div className="text-xs font-semibold text-[#1A1A2E] mt-0.5">
              {formatDateDisplay(bounds.endKey)}
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div>
          <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-wide mb-2">
            Produce Purchases
          </h2>
          {periodSales.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#888888] bg-gray-50 rounded-xl">
              No produce sales recorded during this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EBEBEB] text-[#888888]">
                    <th className="py-2.5 font-medium">Date</th>
                    <th className="py-2.5 font-medium">Item</th>
                    <th className="py-2.5 font-medium">Crates</th>
                    <th className="py-2.5 font-medium">Weight/Crate</th>
                    <th className="py-2.5 font-medium">Rate/kg</th>
                    <th className="py-2.5 font-medium">Delivery</th>
                    <th className="py-2.5 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEBEB] text-[#1A1A2E]">
                  {periodSales.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 whitespace-nowrap">{formatDateDisplay(s.dateKey)}</td>
                      <td className="py-2.5 font-semibold">{s.fruitName}</td>
                      <td className="py-2.5">{s.crates}</td>
                      <td className="py-2.5">{s.weightPerCrate} kg</td>
                      <td className="py-2.5">{formatINR(s.ratePerKg)}</td>
                      <td className="py-2.5">
                        {s.deliveryCharge > 0 ? formatINR(s.deliveryCharge) : '-'}
                      </td>
                      <td className="py-2.5 text-right font-bold">
                        {formatINR(getSaleTotalAmount(s))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Period Payments (if any) */}
        {periodPayments.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-wide mb-2">
              Payments Received In Period
            </h2>
            <div className="divide-y divide-[#EBEBEB] text-xs">
              {periodPayments.map((p) => (
                <div key={p.id} className="py-2 flex justify-between items-center text-[#1A1A2E]">
                  <span>
                    {formatDateDisplay(p.dateKey)} via {p.paymentMode}
                    {p.note ? ` (${p.note})` : ''}
                  </span>
                  <span className="font-bold text-green-600">-{formatINR(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Summary Breakdown */}
        <div className="pt-4 border-t border-[#EBEBEB] flex justify-end">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-[#888888]">
              <span>Previous Pending:</span>
              <span className="font-semibold text-[#1A1A2E]">{formatINR(summary.openingBalance)}</span>
            </div>
            <div className="flex justify-between text-[#888888]">
              <span>Fruit Total:</span>
              <span className="font-semibold text-[#1A1A2E]">{formatINR(summary.fruitTotal)}</span>
            </div>
            {summary.deliveryTotal > 0 && (
              <div className="flex justify-between text-[#888888]">
                <span>Delivery:</span>
                <span className="font-semibold text-[#1A1A2E]">{formatINR(summary.deliveryTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#888888]">
              <span>Paid in Period:</span>
              <span className="font-semibold text-green-600">-{formatINR(summary.periodPaid)}</span>
            </div>
            <div className="flex justify-between text-[#888888]">
              <span>Current Period Bill:</span>
              <span className="font-semibold text-[#1A1A2E]">{formatINR(summary.currentBill)}</span>
            </div>
            <div className="pt-2 border-t border-[#EBEBEB] flex justify-between items-center text-sm">
              <span className="font-bold text-[#1A1A2E]">Total Pending Due:</span>
              <span className={`text-base font-extrabold ${getPendingColorClass(summary.totalPending)}`}>
                {summary.totalPending < 0
                  ? `Credit ${formatINR(Math.abs(summary.totalPending))}`
                  : formatINR(summary.totalPending)}
              </span>
            </div>
          </div>
        </div>

        {/* Thank You Note */}
        <div className="text-center pt-6 border-t border-[#EBEBEB] text-xs text-[#888888]">
          Thank you for your business! For queries, contact{' '}
          <strong>{settings?.shopPhone ? formatPhoneDisplay(settings.shopPhone) : 'us'}</strong>.
        </div>
      </div>
    </div>
  );
}
