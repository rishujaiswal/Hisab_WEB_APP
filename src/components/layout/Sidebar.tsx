'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, FileText, Package, BarChart3, Settings, Sprout } from 'lucide-react';
import { useSettings } from '@/lib/hooks/useSettings';

const navItems = [
  { href: '/main', label: 'Home', icon: Home, exact: true },
  { href: '/main/customers', label: 'Customers', icon: Users },
  { href: '/main/bills', label: 'Bills', icon: FileText },
  { href: '/main/items', label: 'Items', icon: Package },
  { href: '/main/reports', label: 'Reports', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { settings } = useSettings();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden md:flex flex-col w-56 bg-white border-r border-[#EBEBEB] h-screen shrink-0">
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-[#EBEBEB]">
        <div className="w-9 h-9 rounded-xl bg-[#1A1A2E] flex items-center justify-center">
          <Sprout className="h-5 w-5 text-[#1A9E6A]" />
        </div>
        <div>
          <div className="text-sm font-bold text-[#1A1A2E]">Hisab</div>
          {settings?.shopName && (
            <div className="text-xs text-[#888888] truncate max-w-[100px]">{settings.shopName}</div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1" aria-label="Main navigation">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive(href, exact)
                ? 'bg-[#1A9E6A]/10 text-[#1A9E6A]'
                : 'text-[#888888] hover:bg-gray-50 hover:text-[#1A1A2E]'
            }`}
            aria-current={isActive(href, exact) ? 'page' : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="p-2 border-t border-[#EBEBEB]">
        <Link
          href="/main/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isActive('/main/settings')
              ? 'bg-[#1A9E6A]/10 text-[#1A9E6A]'
              : 'text-[#888888] hover:bg-gray-50 hover:text-[#1A1A2E]'
          }`}
          aria-current={isActive('/main/settings') ? 'page' : undefined}
        >
          <Settings className="h-5 w-5 shrink-0" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
