'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, FileText, Package, BarChart3 } from 'lucide-react';

const navItems = [
  { href: '/main', label: 'Home', icon: Home, exact: true },
  { href: '/main/customers', label: 'Customers', icon: Users },
  { href: '/main/bills', label: 'Bills', icon: FileText },
  { href: '/main/items', label: 'Items', icon: Package },
  { href: '/main/reports', label: 'Reports', icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#EBEBEB] z-30 pb-safe"
      aria-label="Mobile navigation"
    >
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 transition-colors ${
                active ? 'text-[#1A9E6A]' : 'text-[#888888]'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
