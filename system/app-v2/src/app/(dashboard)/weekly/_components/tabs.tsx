'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/weekly', label: '行動量' },
  { href: '/weekly/cf', label: 'CF予測' },
  { href: '/weekly/input', label: '入力' },
] as const;

export function WeeklyTabs() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-card">
      <div className="px-6 max-w-5xl mx-auto flex items-center gap-1">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-ink text-ink'
                  : 'border-transparent text-muted hover:text-ink hover:border-border'
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
