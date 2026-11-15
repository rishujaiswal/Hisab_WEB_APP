'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, X, ShoppingCart, Wallet, UserPlus, Apple } from 'lucide-react';

const actions = [
  { label: 'Add Sale', href: '/main/add-sale', icon: ShoppingCart, color: 'bg-[#1A9E6A]' },
  { label: 'Add Payment', href: '/main/add-payment', icon: Wallet, color: 'bg-[#007AFF]' },
  { label: 'Add Customer', href: '/main/add-customer', icon: UserPlus, color: 'bg-[#1A1A2E]' },
  { label: 'Add Fruit', href: '/main/add-fruit', icon: Apple, color: 'bg-[#F0A500]' },
];

export function QuickAddButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Extract customerId context if on a customer detail page
  const customerMatch = pathname.match(/\/main\/customers\/([^/]+)/);
  const contextCustomerId = customerMatch?.[1];

  function handleAction(href: string) {
    setOpen(false);
    const url = contextCustomerId
      ? `${href}?customerId=${contextCustomerId}`
      : href;
    router.push(url);
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Action sheet (mobile) / Menu (desktop) */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50">
        {open && (
          <div className="mb-3 flex flex-col gap-2 items-end">
            {actions.map(({ label, href, icon: Icon, color }) => (
              <button
                key={href}
                onClick={() => handleAction(href)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-white text-sm font-medium shadow-lg ${color} hover:opacity-90 transition-opacity`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setOpen(!open)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-all duration-200 ${
            open ? 'bg-gray-700 rotate-45' : 'bg-[#1A9E6A] hover:bg-[#168a5b]'
          }`}
          aria-label={open ? 'Close quick add menu' : 'Quick add menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
}
