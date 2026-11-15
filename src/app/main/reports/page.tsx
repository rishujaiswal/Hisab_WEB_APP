'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  useCustomers,
  useFruits,
  useAllSales,
  useAllPayments,
} from '@/lib/hooks/useFirestoreData';
import { useSettings } from '@/lib/hooks/useSettings';
import {
  formatINR,
  formatCompact,
  formatDateDisplay,
  getSaleTotalAmount,
  toRupees,
  calcCustomerBalance,
  getDateRange,
  getTodayKey,
} from '@/lib/domain';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Users,
  Apple,
  Download,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

type ReportTab = 'sales' | 'collections' | 'customers' | 'fruits' | 'payments';
type DatePreset = 'today' | '7days' | 'this_month' | 'last_month' | 'custom';

export default function ReportsPage() {
  const { settings } = useSettings();
  const { customers, loading: customersLoading } = useCustomers();
  const { fruits, loading: fruitsLoading } = useFruits();
  const { sales, loading: salesLoading } = useAllSales();
  const { payments, loading: paymentsLoading } = useAllPayments();
  const { success } = useToast();

  const timezone = settings?.timezone || 'Asia/Kolkata';
  const todayKey = getTodayKey(timezone);

  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');

  // Custom range
  const now = new Date();
  const [customStart, setCustomStart] = useState(
    format(startOfMonth(now), 'yyyy-MM-dd')
  );
  const [customEnd, setCustomEnd] = useState(todayKey);

  const loading = customersLoading || fruitsLoading || salesLoading || paymentsLoading;

  // Active entries
  const activeSales = useMemo(() => sales.filter((s) => !s.isVoided), [sales]);
  const activePayments = useMemo(() => payments.filter((p) => !p.isVoided), [payments]);

  // Compute effective date range [startKey, endKey]
  const { startKey, endKey } = useMemo(() => {
    switch (datePreset) {
      case 'today':
        return { startKey: todayKey, endKey: todayKey };
      case '7days': {
        const d = subDays(now, 6);
        return { startKey: format(d, 'yyyy-MM-dd'), endKey: todayKey };
      }
      case 'this_month': {
        const mStart = startOfMonth(now);
        return { startKey: format(mStart, 'yyyy-MM-dd'), endKey: todayKey };
      }
      case 'last_month': {
        const prev = subMonths(now, 1);
        const mStart = startOfMonth(prev);
        const mEnd = endOfMonth(prev);
        return {
          startKey: format(mStart, 'yyyy-MM-dd'),
          endKey: format(mEnd, 'yyyy-MM-dd'),
        };
      }
      case 'custom':
        return {
          startKey: customStart || todayKey,
          endKey: customEnd || todayKey,
        };
      default:
        return { startKey: todayKey, endKey: todayKey };
    }
  }, [datePreset, todayKey, customStart, customEnd]);

  // In-range sales and payments
  const rangedSales = useMemo(
    () =>
      activeSales.filter((s) => s.dateKey >= startKey && s.dateKey <= endKey),
    [activeSales, startKey, endKey]
  );

  const rangedPayments = useMemo(
    () =>
      activePayments.filter((p) => p.dateKey >= startKey && p.dateKey <= endKey),
    [activePayments, startKey, endKey]
  );

  // Tab 1: Sales aggregates
  const totalSalesRevenue = useMemo(
    () => rangedSales.reduce((sum, s) => sum + getSaleTotalAmount(s), 0),
    [rangedSales]
  );
  const totalCratesSold = useMemo(
    () => rangedSales.reduce((sum, s) => sum + s.crates, 0),
    [rangedSales]
  );

  // Daily sales chart data
  const dailySalesData = useMemo(() => {
    const map: Record<string, number> = {};
    const days = getDateRange(startKey, endKey);
    days.forEach((day) => {
      map[day] = 0;
    });
    rangedSales.forEach((s) => {
      map[s.dateKey] = (map[s.dateKey] || 0) + toRupees(getSaleTotalAmount(s));
    });
    return Object.entries(map).map(([day, amount]) => ({
      date: formatDateDisplay(day),
      rawDate: day,
      amount,
    }));
  }, [rangedSales, startKey, endKey]);

  // Tab 2: Collections aggregates
  const totalCollections = useMemo(
    () => rangedPayments.reduce((sum, p) => sum + p.amount, 0),
    [rangedPayments]
  );

  const dailyCollectionsData = useMemo(() => {
    const map: Record<string, number> = {};
    const days = getDateRange(startKey, endKey);
    days.forEach((day) => {
      map[day] = 0;
    });
    rangedPayments.forEach((p) => {
      map[p.dateKey] = (map[p.dateKey] || 0) + toRupees(p.amount);
    });
    return Object.entries(map).map(([day, amount]) => ({
      date: formatDateDisplay(day),
      rawDate: day,
      amount,
    }));
  }, [rangedPayments, startKey, endKey]);

  // Tab 3: Customer rankings
  const customerRankings = useMemo(() => {
    return customers.map((c) => {
      const custRangedSales = rangedSales.filter((s) => s.customerId === c.id);
      const custAllSales = activeSales.filter((s) => s.customerId === c.id);
      const custAllPayments = activePayments.filter((p) => p.customerId === c.id);

      const periodPurchases = custRangedSales.reduce(
        (sum, s) => sum + getSaleTotalAmount(s),
        0
      );
      const balance = calcCustomerBalance(custAllSales, custAllPayments);

      return {
        ...c,
        periodPurchases,
        balance,
        salesCount: custRangedSales.length,
      };
    });
  }, [customers, rangedSales, activeSales, activePayments]);

  const topCustomersBySales = useMemo(
    () =>
      [...customerRankings]
        .filter((c) => c.periodPurchases > 0)
        .sort((a, b) => b.periodPurchases - a.periodPurchases),
    [customerRankings]
  );

  const topCustomersByBalance = useMemo(
    () =>
      [...customerRankings]
        .filter((c) => c.balance > 0)
        .sort((a, b) => b.balance - a.balance),
    [customerRankings]
  );

  // Tab 4: Fruit produce rankings
  const fruitRankings = useMemo(() => {
    const map: Record<
      string,
      { name: string; crates: number; revenue: number; count: number }
    > = {};

    fruits.forEach((f) => {
      map[f.id] = { name: f.name, crates: 0, revenue: 0, count: 0 };
    });

    rangedSales.forEach((s) => {
      if (!map[s.fruitId]) {
        map[s.fruitId] = {
          name: s.fruitName,
          crates: 0,
          revenue: 0,
          count: 0,
        };
      }
      map[s.fruitId].crates += s.crates;
      map[s.fruitId].revenue += getSaleTotalAmount(s);
      map[s.fruitId].count += 1;
    });

    return Object.values(map)
      .filter((f) => f.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [fruits, rangedSales]);

  // Tab 5: Payment modes distribution
  const paymentModeStats = useMemo(() => {
    const modes: Record<string, { count: number; amount: number }> = {
      Cash: { count: 0, amount: 0 },
      UPI: { count: 0, amount: 0 },
      Bank: { count: 0, amount: 0 },
    };

    rangedPayments.forEach((p) => {
      const mode = p.paymentMode || 'Cash';
      if (!modes[mode]) modes[mode] = { count: 0, amount: 0 };
      modes[mode].count += 1;
      modes[mode].amount += p.amount;
    });

    return Object.entries(modes).map(([mode, data]) => ({
      mode,
      count: data.count,
      amountPaise: data.amount,
      amountRupees: toRupees(data.amount),
    }));
  }, [rangedPayments]);

  // CSV Export for active tab
  function handleExportCSV() {
    let rows: (string | number)[][] = [];
    const filename = `Hisab_${activeTab}_${startKey}_to_${endKey}.csv`;

    if (activeTab === 'sales') {
      rows = [
        ['Date', 'Customer', 'Fruit', 'Crates', 'Weight/Crate', 'Rate/Kg', 'Delivery', 'Total (Rs)'],
        ...rangedSales.map((s) => [
          s.dateKey,
          s.customerName,
          s.fruitName,
          s.crates,
          s.weightPerCrate,
          toRupees(s.ratePerKg),
          toRupees(s.deliveryCharge),
          toRupees(getSaleTotalAmount(s)),
        ]),
      ];
    } else if (activeTab === 'collections') {
      rows = [
        ['Date', 'Customer', 'Amount (Rs)', 'Mode', 'Note'],
        ...rangedPayments.map((p) => [
          p.dateKey,
          p.customerName,
          toRupees(p.amount),
          p.paymentMode,
          `"${(p.note || '').replace(/"/g, '""')}"`,
        ]),
      ];
    } else if (activeTab === 'customers') {
      rows = [
        ['Customer Name', 'Shop', 'Phone', 'Period Purchases (Rs)', 'Current Balance Due (Rs)'],
        ...customerRankings.map((c) => [
          c.name,
          c.shopName || '',
          c.phoneNumber,
          toRupees(c.periodPurchases),
          toRupees(c.balance),
        ]),
      ];
    } else if (activeTab === 'fruits') {
      rows = [
        ['Produce Item', 'Crates Sold', 'Sales Entries', 'Total Revenue (Rs)'],
        ...fruitRankings.map((f) => [
          f.name,
          f.crates,
          f.count,
          toRupees(f.revenue),
        ]),
      ];
    } else if (activeTab === 'payments') {
      rows = [
        ['Payment Mode', 'Count', 'Total Amount (Rs)'],
        ...paymentModeStats.map((m) => [
          m.mode,
          m.count,
          m.amountRupees,
        ]),
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success(`${activeTab.toUpperCase()} report exported as CSV`);
  }

  if (loading) return <PageLoading />;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A2E]">
            Business Analytics
          </h1>
          <p className="text-xs text-[#888888]">
            Produce sales, collections, customer dues, and payment breakdowns
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportCSV}
          icon={<Download className="h-4 w-4" />}
        >
          Export CSV
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card padding="sm" className="p-3 sm:p-4 space-y-3 bg-white">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-[#888888] mr-1">Period:</span>
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'custom', label: 'Custom' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setDatePreset(id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                datePreset === id
                  ? 'bg-[#1A9E6A] text-white shadow-sm'
                  : 'bg-gray-100 text-[#888888] hover:text-[#1A1A2E]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EBEBEB] text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[#888888]">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#EBEBEB] text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#888888]">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#EBEBEB] text-xs"
              />
            </div>
          </div>
        )}

        <div className="text-[11px] text-[#888888]">
          Selected Range: <strong>{formatDateDisplay(startKey)}</strong> to{' '}
          <strong>{formatDateDisplay(endKey)}</strong>
        </div>
      </Card>

      {/* Scrollable Tabs */}
      <div className="border-b border-[#EBEBEB] flex gap-3 overflow-x-auto pb-1">
        {[
          { id: 'sales', label: 'Sales Overview', icon: TrendingUp },
          { id: 'collections', label: 'Collections', icon: CreditCard },
          { id: 'customers', label: 'Top Customers', icon: Users },
          { id: 'fruits', label: 'Produce Ranking', icon: Apple },
          { id: 'payments', label: 'Payment Modes', icon: BarChart3 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 pb-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === id
                ? 'border-[#1A9E6A] text-[#1A9E6A]'
                : 'border-transparent text-[#888888] hover:text-[#1A1A2E]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: Sales */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card padding="sm" className="p-4">
              <div className="text-xs text-[#888888]">Total Sales Revenue</div>
              <div className="text-xl sm:text-2xl font-bold text-[#1A1A2E] mt-1">
                {formatINR(totalSalesRevenue)}
              </div>
            </Card>
            <Card padding="sm" className="p-4">
              <div className="text-xs text-[#888888]">Crates Sold</div>
              <div className="text-xl sm:text-2xl font-bold text-[#1A9E6A] mt-1">
                {totalCratesSold} crates
              </div>
            </Card>
            <Card padding="sm" className="p-4 col-span-2 sm:col-span-1">
              <div className="text-xs text-[#888888]">Transactions</div>
              <div className="text-xl sm:text-2xl font-bold text-[#1A1A2E] mt-1">
                {rangedSales.length} entries
              </div>
            </Card>
          </div>

          <Card padding="md" className="space-y-4">
            <h2 className="text-sm font-bold text-[#1A1A2E]">Daily Produce Revenue (₹)</h2>
            {dailySalesData.every((d) => d.amount === 0) ? (
              <div className="py-12 text-center text-xs text-[#888888]">
                No sales recorded in this date range.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySalesData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: any) => [`₹${val}`, 'Revenue']}
                      labelFormatter={(l) => `Date: ${l}`}
                    />
                    <Bar dataKey="amount" fill="#1A9E6A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: Collections */}
      {activeTab === 'collections' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card padding="sm" className="p-4">
              <div className="text-xs text-[#888888]">Total Collected</div>
              <div className="text-xl sm:text-2xl font-bold text-[#007AFF] mt-1">
                {formatINR(totalCollections)}
              </div>
            </Card>
            <Card padding="sm" className="p-4">
              <div className="text-xs text-[#888888]">Payments Count</div>
              <div className="text-xl sm:text-2xl font-bold text-[#1A1A2E] mt-1">
                {rangedPayments.length} payments
              </div>
            </Card>
            <Card padding="sm" className="p-4 col-span-2 sm:col-span-1">
              <div className="text-xs text-[#888888]">Collected vs Billed</div>
              <div className="text-xl sm:text-2xl font-bold text-[#1A1A2E] mt-1">
                {totalSalesRevenue > 0
                  ? `${Math.round((totalCollections / totalSalesRevenue) * 100)}%`
                  : 'N/A'}
              </div>
            </Card>
          </div>

          <Card padding="md" className="space-y-4">
            <h2 className="text-sm font-bold text-[#1A1A2E]">Daily Collections (₹)</h2>
            {dailyCollectionsData.every((d) => d.amount === 0) ? (
              <div className="py-12 text-center text-xs text-[#888888]">
                No collections recorded in this date range.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyCollectionsData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: any) => [`₹${val}`, 'Collected']}
                      labelFormatter={(l) => `Date: ${l}`}
                    />
                    <Bar dataKey="amount" fill="#007AFF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: Customers */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card padding="md" className="space-y-3">
            <h2 className="text-sm font-bold text-[#1A1A2E]">
              Top Buyers By Revenue (Period)
            </h2>
            {topCustomersBySales.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#888888]">
                No customer purchases in this period.
              </div>
            ) : (
              <div className="space-y-2">
                {topCustomersBySales.slice(0, 10).map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/main/customers/${c.id}`}
                    className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-[#888888] font-bold text-center">
                        #{i + 1}
                      </span>
                      <span className="font-semibold text-[#1A1A2E]">{c.name}</span>
                    </div>
                    <span className="font-bold text-[#1A9E6A]">
                      {formatINR(c.periodPurchases)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card padding="md" className="space-y-3">
            <h2 className="text-sm font-bold text-[#1A1A2E]">
              Customers With Highest Outstanding Balance
            </h2>
            {topCustomersByBalance.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#888888]">
                No outstanding customer balances. All clear!
              </div>
            ) : (
              <div className="space-y-2">
                {topCustomersByBalance.slice(0, 10).map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/main/customers/${c.id}`}
                    className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-[#888888] font-bold text-center">
                        #{i + 1}
                      </span>
                      <span className="font-semibold text-[#1A1A2E]">{c.name}</span>
                    </div>
                    <span className="font-bold text-red-600">
                      {formatINR(c.balance)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: Fruits */}
      {activeTab === 'fruits' && (
        <Card padding="md" className="space-y-3">
          <h2 className="text-sm font-bold text-[#1A1A2E]">
            Produce Performance &amp; Revenue Ranking
          </h2>
          {fruitRankings.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#888888]">
              No produce sales recorded in this period.
            </div>
          ) : (
            <div className="divide-y divide-[#EBEBEB]">
              {fruitRankings.map((f, i) => (
                <div key={f.name} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center font-bold text-[#888888]">#{i + 1}</span>
                    <div>
                      <div className="font-bold text-sm text-[#1A1A2E]">{f.name}</div>
                      <div className="text-[#888888]">
                        {f.crates} crates sold across {f.count} transactions
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-[#1A9E6A]">{formatINR(f.revenue)}</div>
                    <div className="text-[11px] text-[#888888]">Gross Sales</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 5: Payment Modes */}
      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {paymentModeStats.map((item) => (
            <Card key={item.mode} padding="md" className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-[#1A1A2E]">{item.mode}</span>
                <Badge variant={item.mode === 'Cash' ? 'success' : item.mode === 'UPI' ? 'info' : 'default'}>
                  {item.count} payment{item.count !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="text-xl font-bold text-[#1A1A2E]">
                {formatINR(item.amountPaise)}
              </div>
              <div className="text-xs text-[#888888]">
                {totalCollections > 0
                  ? `${Math.round((item.amountPaise / totalCollections) * 100)}% of total collected`
                  : '0%'}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
