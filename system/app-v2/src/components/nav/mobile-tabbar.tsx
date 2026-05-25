'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { Home, Briefcase, CheckSquare, CalendarDays, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// match: pathname.startsWith() 判定用。dynamic な /home/[memberId] も /home prefix で拾える
type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  dynamic: boolean;
  match: string;
};

const TABS: readonly Tab[] = [
  { href: '/home', label: 'ホーム', icon: Home, dynamic: true, match: '/home' },
  { href: '/deals', label: '案件', icon: Briefcase, dynamic: false, match: '/deals' },
  { href: '/tasks', label: 'タスク', icon: CheckSquare, dynamic: false, match: '/tasks' },
  { href: '/weekly', label: '週次', icon: CalendarDays, dynamic: false, match: '/weekly' },
  { href: '/monthly', label: '月次', icon: BarChart3, dynamic: false, match: '/monthly' },
] as const;

export function MobileTabBar({ memberId }: { memberId: string }) {
  // 「今どこ」を 3 秒で把握できるよう、現在 path と一致するタブを濃く出す。
  // 外出先 = 認知コスト最小化が最優先（美冬 5/25 UX 監査指摘）
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const href = tab.dynamic ? `/home/${memberId}` : tab.href;
          const Icon = tab.icon;
          const isActive = pathname.startsWith(tab.match);
          return (
            <li key={tab.href}>
              <Link
                href={href as Route}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center py-2 px-1 text-xs active:scale-[0.98] transition-all ${
                  isActive
                    ? 'text-gray-900 font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.75} />
                <span className="mt-0.5 leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
