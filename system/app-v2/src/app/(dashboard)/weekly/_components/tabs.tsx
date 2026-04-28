'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/weekly', label: '行動量' },
  { href: '/weekly/cf', label: 'CF予測' },
  { href: '/weekly/pl', label: 'PL' },
  { href: '/weekly/input', label: '入力' },
] as const;

export function WeeklyTabs() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="px-6 max-w-5xl mx-auto flex items-center gap-1">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-200'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
