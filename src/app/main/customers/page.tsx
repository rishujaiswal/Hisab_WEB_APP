'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  useCustomers,
  useAllSales,
  useAllPayments,
} from '@/lib/hooks/useFirestoreData';
import {
  calcCustomerBalance,
  formatINR,
  formatPhoneDisplay,
  getPendingColorClass,
} from '@/lib/domain';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Search,
  UserPlus,
  Users,
  X,
  ChevronRight,
  Phone,
  Store,
} from 'lucide-react';

export default function CustomersPage() {
  const { customers, loading: customersLoading } = useCustomers();
  const { sales, loading: salesLoading } = useAllSales();
  const { payments, loading: paymentsLoading } = useAllPayments();

  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');

  const loading = customersLoading || salesLoading || paymentsLoading;

  const activeSales = useMemo(() => sales.filter((s) => !s.isVoided), [sales]);
  const activePayments = useMemo(() => payments.filter((p) => !p.isVoided), [payments]);

  // Compute balance for every customer
  const enrichedCustomers = useMemo(() => {
    return customers.map((c) => {
      const custSales = activeSales.filter((s) => s.customerId === c.id);
      const custPayments = activePayments.filter((p) => p.customerId === c.id);
      const balance = calcCustomerBalance(custSales, custPayments);
      return { ...c, balance };
    });
  }, [customers, activeSales, activePayments]);

  // Filter and sort
  const filteredCustomers = useMemo(() => {
    let result = enrichedCustomers;

    // Status filter
    if (filterActive === 'active') {
      result = result.filter((c) => c.isActive);
    } else if (filterActive === 'inactive') {
      result = result.filter((c) => !c.isActive);
    }

    // Search query
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phoneNumber.includes(q) ||
          (c.shopName && c.shopName.toLowerCase().includes(q))
      );
    }

    // Default sort: highest positive pending first, then by name
    return result.sort((a, b) => {
      if (a.balance !== b.balance) {
        return b.balance - a.balance;
      }
      return a.name.localeCompare(b.name);
    });
  }, [enrichedCustomers, filterActive, search]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-36 bg-gray-200 animate-pulse rounded-lg" />
          <div className="h-10 w-28 bg-gray-200 animate-pulse rounded-xl" />
        </div>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A2E]">Customers</h1>
          <p className="text-xs text-[#888888]">
            Showing {filteredCustomers.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/main/add-customer">
          <Button variant="primary" size="md" icon={<UserPlus className="h-4 w-4" />}>
            Add Customer
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888888]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or shop..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#EBEBEB] text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A9E6A] focus:border-transparent transition-all"
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

        {/* Filter Chips */}
        <div className="flex gap-1.5 shrink-0">
          {(['all', 'active', 'inactive'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterActive(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filterActive === mode
                  ? 'bg-[#1A1A2E] text-white shadow-sm'
                  : 'bg-white border border-[#EBEBEB] text-[#888888] hover:text-[#1A1A2E]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Customers List */}
      {customers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No customers yet"
          description="Add your produce buyers and retailers to start managing sales and balances."
          action={
            <Link href="/main/add-customer">
              <Button variant="primary" icon={<UserPlus className="h-4 w-4" />}>
                Add First Customer
              </Button>
            </Link>
          }
        />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          title="No matching customers"
          description="No customers match your current search and filter criteria."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setFilterActive('all');
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredCustomers.map((c) => {
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
                  className="p-3 sm:p-4 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-[#1A1A2E] shrink-0 border border-[#EBEBEB]">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#1A1A2E] truncate">
                          {c.name}
                        </span>
                        {!c.isActive && (
                          <Badge variant="warning">Inactive</Badge>
                        )}
                        {c.customerType === 'Wholesale' && (
                          <Badge variant="info">Wholesale</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#888888] mt-0.5">
                        <span className="flex items-center gap-1 truncate">
                          <Store className="h-3 w-3 shrink-0" />
                          {c.shopName || 'No shop name'}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Phone className="h-3 w-3 shrink-0" />
                          {formatPhoneDisplay(c.phoneNumber)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`text-sm sm:text-base font-bold ${getPendingColorClass(c.balance)}`}>
                        {c.balance < 0
                          ? `Credit: ${formatINR(Math.abs(c.balance))}`
                          : formatINR(c.balance)}
                      </div>
                      <div className="text-[11px] text-[#888888]">
                        {c.balance === 0 ? (
                          <span className="text-green-600 font-medium">Clear</span>
                        ) : c.balance < 0 ? (
                          <span className="text-green-600 font-medium">Overpaid</span>
                        ) : (
                          'Due'
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#888888]" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
