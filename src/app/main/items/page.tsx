'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFruits, useAllSales } from '@/lib/hooks/useFirestoreData';
import { formatINR, toRupees } from '@/lib/domain';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Apple,
  Search,
  Plus,
  Edit,
  X,
  Package,
} from 'lucide-react';

export default function ItemsPage() {
  const { fruits, loading: fruitsLoading } = useFruits();
  const { sales, loading: salesLoading } = useAllSales();

  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');

  const loading = fruitsLoading || salesLoading;

  // Filter fruits
  const filteredFruits = useMemo(() => {
    let result = fruits;

    if (filterActive === 'active') {
      result = result.filter((f) => f.isActive);
    } else if (filterActive === 'inactive') {
      result = result.filter((f) => !f.isActive);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [fruits, filterActive, search]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-36 bg-gray-200 animate-pulse rounded-lg" />
          <div className="h-10 w-28 bg-gray-200 animate-pulse rounded-xl" />
        </div>
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
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A2E]">Items & Produce</h1>
          <p className="text-xs text-[#888888]">
            Manage fruits, default crate weights, and standard rates
          </p>
        </div>
        <Link href="/main/add-fruit">
          <Button variant="primary" size="md" icon={<Plus className="h-4 w-4" />}>
            Add Fruit
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
            placeholder="Search produce by name..."
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

      {/* Items list */}
      {fruits.length === 0 ? (
        <EmptyState
          icon={<Apple className="h-10 w-10 text-amber-500" />}
          title="No produce items yet"
          description="Add produce items with default crate weights and rates to make recording sales instant."
          action={
            <Link href="/main/add-fruit">
              <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
                Add First Fruit
              </Button>
            </Link>
          }
        />
      ) : filteredFruits.length === 0 ? (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          title="No matching fruits"
          description="No produce matches your current search or filter."
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
          {filteredFruits.map((f) => (
            <Card
              key={f.id}
              padding="sm"
              className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Apple className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#1A1A2E] truncate">
                      {f.name}
                    </span>
                    {!f.isActive && <Badge variant="warning">Inactive</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#888888] mt-0.5">
                    <span>Default: {f.defaultWeightPerCrate} kg / crate</span>
                    <span>Rate: {f.defaultRatePerKg > 0 ? `${formatINR(f.defaultRatePerKg)}/kg` : 'Variable'}</span>
                    {f.defaultDeliveryCharge > 0 && (
                      <span>Delivery: {formatINR(f.defaultDeliveryCharge)}</span>
                    )}
                  </div>
                </div>
              </div>

              <Link href={`/main/add-fruit?fruitId=${f.id}`}>
                <Button variant="secondary" size="sm" icon={<Edit className="h-3.5 w-3.5" />}>
                  Edit
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
