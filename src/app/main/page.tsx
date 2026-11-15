'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSettings } from '@/lib/hooks/useSettings';
import {
  useCustomers,
  useAllSales,
  useAllPayments,
} from '@/lib/hooks/useFirestoreData';
import {
  calcCustomerBalance,
  formatINR,
  formatCompact,
  formatBalance,
  getPendingColorClass,
  getTodayKey,
  getSaleTotalAmount,
} from '@/lib/domain';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Loading';
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  Users,
  Settings as SettingsIcon,
  ChevronRight,
  UserPlus,
  PlusCircle,
  ShoppingCart,
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const { customers, loading: customersLoading } = useCustomers();
  const { sales, loading: salesLoading } = useAllSales();
  const { payments, loading: paymentsLoading } = useAllPayments();

  const loading = settingsLoading || customersLoading || salesLoading || paymentsLoading;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-48 bg-gray-200 animate-pulse rounded-lg" />
          <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const timezone = settings?.timezone || 'Asia/Kolkata';
  const todayKey = getTodayKey(timezone);

  // Active (non-voided) sales and payments
  const activeSales = sales.filter((s) => !s.isVoided);
  const activePayments = payments.filter((p) => !p.isVoided);

  // Today's metrics
  const todaySales = activeSales
    .filter((s) => s.dateKey === todayKey)
    .reduce((sum, s) => sum + getSaleTotalAmount(s), 0);

  const todayCollections = activePayments
    .filter((p) => p.dateKey === todayKey)
    .reduce((sum, p) => sum + p.amount, 0);

  // All-time pending
  const totalPending = calcCustomerBalance(activeSales, activePayments);
  const activeCustomersCount = customers.filter((c) => c.isActive).length;

  // Calculate per-customer balance for highest balance list
  const customersWithBalance = customers.map((c) => {
    const custSales = activeSales.filter((s) => s.customerId === c.id);
    const custPayments = activePayments.filter((p) => p.customerId === c.id);
    const balance = calcCustomerBalance(custSales, custPayments);
    return { ...c, balance };
  });

  // Top 5 customers with highest positive pending balance
  const topPendingCustomers = customersWithBalance
    .filter((c) => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  const isBrandNewShop = customers.length === 0 && sales.length === 0;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A2E]">
            {settings?.shopName || 'Hisab'}
          </h1>
          <p className="text-xs sm:text-sm text-[#888888]">
            {settings?.ownerName ? `Welcome back, ${settings.ownerName}` : 'Produce & Produce Billing'}
          </p>
        </div>
        <Link
          href="/main/settings"
          className="p-2.5 rounded-xl border border-[#EBEBEB] bg-white text-[#888888] hover:text-[#1A1A2E] hover:border-gray-300 transition-colors"
          aria-label="Settings"
        >
          <SettingsIcon className="h-5 w-5" />
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Sales */}
        <Card padding="sm" className="sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#888888]">Today&apos;s Sales</span>
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-[#1A9E6A]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-[#1A1A2E] tracking-tight">
            {formatCompact(todaySales)}
          </div>
          <div className="text-[11px] text-[#888888] mt-1 truncate">
            Full: {formatINR(todaySales)}
          </div>
        </Card>

        {/* Today's Collections */}
        <Card padding="sm" className="sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#888888]">Collections</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#007AFF]">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-[#1A1A2E] tracking-tight">
            {formatCompact(todayCollections)}
          </div>
          <div className="text-[11px] text-[#888888] mt-1 truncate">
            Full: {formatINR(todayCollections)}
          </div>
        </Card>

        {/* Total Pending */}
        <Card padding="sm" className="sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#888888]">
              {totalPending < 0 ? 'Net Credit' : 'Total Pending'}
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                totalPending <= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`text-lg sm:text-2xl font-bold tracking-tight ${getPendingColorClass(
              totalPending
            )}`}
          >
            {formatCompact(Math.abs(totalPending))}
          </div>
          <div className="text-[11px] text-[#888888] mt-1 truncate">
            {totalPending < 0
              ? 'Overpayment credit'
              : totalPending === 0
              ? 'All clear!'
              : `Full: ${formatINR(totalPending)}`}
          </div>
        </Card>

        {/* Total Customers */}
        <Card padding="sm" className="sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#888888]">Customers</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-[#1A1A2E] tracking-tight">
            {customers.length}
          </div>
          <div className="text-[11px] text-[#888888] mt-1 truncate">
            {activeCustomersCount} active account{activeCustomersCount !== 1 ? 's' : ''}
          </div>
        </Card>
      </div>

      {/* Brand New Shop Onboarding State */}
      {isBrandNewShop && (
        <Card padding="md" className="border-dashed border-2 border-green-300 bg-green-50/40">
          <div className="text-center py-6 max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1A9E6A]/20 text-[#1A9E6A] flex items-center justify-center mx-auto">
              <PlusCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-[#1A1A2E]">Let&apos;s get your shop started!</h2>
            <p className="text-sm text-[#888888]">
              Add your produce items and customers to start recording crate sales and generating bills.
            </p>
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              <Link href="/main/add-fruit">
                <Button variant="primary" size="sm" icon={<PlusCircle className="h-4 w-4" />}>
                  Add Produce Fruit
                </Button>
              </Link>
              <Link href="/main/add-customer">
                <Button variant="secondary" size="sm" icon={<UserPlus className="h-4 w-4" />}>
                  Add Customer
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Highest Balance Customers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1A1A2E]">
              Customers with Balance
            </h2>
            <p className="text-xs text-[#888888]">Highest outstanding balances due</p>
          </div>
          <Link
            href="/main/customers"
            className="text-xs sm:text-sm font-medium text-[#1A9E6A] hover:underline flex items-center gap-0.5"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {topPendingCustomers.length === 0 ? (
          <Card padding="md" className="text-center py-8 text-[#888888]">
            <p className="text-sm">No customers currently have pending balances. All clear!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {topPendingCustomers.map((c) => {
              const initials = c.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <Link key={c.id} href={`/main/customers/${c.id}`} className="block">
                  <Card
                    padding="sm"
                    hover
                    className="flex items-center justify-between gap-3 p-3 sm:p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-xs text-[#1A1A2E] shrink-0 border border-[#EBEBEB]">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#1A1A2E] truncate">
                          {c.name}
                        </div>
                        <div className="text-xs text-[#888888] truncate">
                          {c.shopName || 'No shop name'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm sm:text-base font-bold ${getPendingColorClass(
                          c.balance
                        )}`}
                      >
                        {formatINR(c.balance)}
                      </div>
                      <span className="text-[10px] text-red-500 font-medium">Pending</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
