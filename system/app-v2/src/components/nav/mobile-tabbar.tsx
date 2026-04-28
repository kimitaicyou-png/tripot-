import Link from 'next/link';
import { Home, Briefcase, CheckSquare, CalendarDays, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Tab = { href: string; label: string; icon: LucideIcon; dynamic: boolean };

const TABS: readonly Tab[] = [
  { href: '/home', label: 'ホーム', icon: Home, dynamic: true },
  { href: '/deals', label: '案件', icon: Briefcase, dynamic: false },
  { href: '/tasks', label: 'タスク', icon: CheckSquare, dynamic: false },
  { href: '/weekly', label: '週次', icon: CalendarDays, dynamic: false },
  { href: '/monthly', label: '月次', icon: BarChart3, dynamic: false },
] as const;

export function MobileTabBar({ memberId }: { memberId: string }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const href = tab.dynamic ? `/home/${memberId}` : tab.href;
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                href={href as any}
                className="flex flex-col items-center justify-center py-2 px-1 text-xs text-gray-700 hover:text-gray-900 active:scale-[0.98] transition-all"
              >
                <Icon className="w-5 h-5" />
                <span className="mt-0.5 leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
