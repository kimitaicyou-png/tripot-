'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * tasks page のフィルタタブ（URL クエリ ?filter=xxx 連動）。
 * 'all' (default) / 'overdue' / 'today' / 'week' / 'unassigned-deal' で切替。
 */

const TABS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'すべて' },
  { key: 'overdue', label: '期限切れ' },
  { key: 'today', label: '今日まで' },
  { key: 'week', label: '7 日以内' },
  { key: 'no-deal', label: '案件未紐付' },
];

export function TaskFilterTabs({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('filter') ?? 'all';

  return (
    <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto whitespace-nowrap">
      {TABS.map((t) => {
        const params = new URLSearchParams(searchParams.toString());
        if (t.key === 'all') {
          params.delete('filter');
        } else {
          params.set('filter', t.key);
        }
        const href = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        const isActive = current === t.key;
        return (
          <Link
            key={t.key}
            href={href}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
              isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-pressed={isActive}
          >
            {t.label}
            {typeof counts[t.key] === 'number' && (
              <span
                className={`font-mono tabular-nums text-[10px] ${
                  isActive ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {counts[t.key]}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
