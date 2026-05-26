'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Filter, X } from 'lucide-react';

/**
 * /deals Kanban / リスト / 週グリッド のフィルタバー（Client Component）。
 *
 * URL クエリ経由でフィルタ状態を保持（ブックマーク・共有可）。
 * Server Component page.tsx 側で searchParams を読んで DB 絞り込み済データを返す。
 *
 * フィルタ項目：
 * - assignee: 担当者（member_id）
 * - confidence: 主観確度（a/b/c/d/e/expected/continuing/unset/all、2026-05-26 G7 拡張）
 * - period: 期間（更新日ベース：all / this_week / this_month / this_quarter）
 * - sort: ソート順（updated_desc / amount_desc / amount_asc / cf_weighted_desc）
 */

export type MemberOption = { id: string; name: string };

const PERIOD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: '全期間' },
  { value: 'this_week', label: '今週更新' },
  { value: 'this_month', label: '今月更新' },
  { value: 'this_quarter', label: '今四半期' },
];

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'updated_desc', label: '更新日 新→古' },
  { value: 'updated_asc', label: '更新日 古→新' },
  { value: 'amount_desc', label: '金額 大→小' },
  { value: 'amount_asc', label: '金額 小→大' },
  { value: 'expected_close_asc', label: '受注予定 近→遠' },
  { value: 'expected_close_desc', label: '受注予定 遠→近' },
  { value: 'cf_weighted_desc', label: 'ヨミ予測売上 大→小' },
];

// 主観確度フィルタ（ADR-0013 enum + 「未設定」+「全部」、2026-05-26 隊長要望）
const CONFIDENCE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '確度：全部' },
  { value: 'a', label: 'A 見積以降' },
  { value: 'b', label: 'B 補助金待ち等' },
  { value: 'c', label: 'C 提案中' },
  { value: 'd', label: 'D アポ段階' },
  { value: 'e', label: 'E 見込み' },
  { value: 'expected', label: '想定' },
  { value: 'continuing', label: '継続' },
  { value: 'unset', label: '未設定のみ' },
];

export function KanbanFilters({
  members,
  currentView,
}: {
  members: MemberOption[];
  currentView: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const assignee = searchParams.get('assignee') ?? '';
  const confidence = searchParams.get('confidence') ?? '';
  const period = searchParams.get('period') ?? 'all';
  const sort = searchParams.get('sort') ?? 'updated_desc';

  const hasActiveFilter =
    assignee !== '' || confidence !== '' || period !== 'all' || sort !== 'updated_desc';

  function pushParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    // view は維持
    if (!next.has('view')) next.set('view', currentView);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}` as never);
    });
  }

  function clearAll() {
    const next = new URLSearchParams();
    next.set('view', currentView);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}` as never);
    });
  }

  return (
    <div className="flex items-center gap-3 flex-wrap text-xs">
      <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />

      <select
        value={assignee}
        onChange={(e) => pushParams({ assignee: e.target.value || null })}
        disabled={pending}
        className="px-2.5 py-1.5 text-xs text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:opacity-50"
        aria-label="担当者で絞り込み"
      >
        <option value="">担当：全員</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <select
        value={confidence}
        onChange={(e) => pushParams({ confidence: e.target.value || null })}
        disabled={pending}
        className="px-2.5 py-1.5 text-xs text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:opacity-50"
        aria-label="主観確度で絞り込み"
      >
        {CONFIDENCE_FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={period}
        onChange={(e) => pushParams({ period: e.target.value })}
        disabled={pending}
        className="px-2.5 py-1.5 text-xs text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:opacity-50"
        aria-label="期間で絞り込み"
      >
        {PERIOD_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={sort}
        onChange={(e) => pushParams({ sort: e.target.value })}
        disabled={pending}
        className="px-2.5 py-1.5 text-xs text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:opacity-50"
        aria-label="ソート順"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {hasActiveFilter && (
        <button
          type="button"
          onClick={clearAll}
          disabled={pending}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
        >
          <X className="w-3 h-3" />
          フィルタ解除
        </button>
      )}
    </div>
  );
}
