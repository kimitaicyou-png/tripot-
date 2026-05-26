'use client';

/**
 * 担当者のインライン編集（G7 拡張、2026-05-27 隊長明示「触れなかったら意味ない」直撃）
 *
 * List view + 週グリッド view 両方で使用、楽観的更新 + toast。
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateDealAssignee } from '@/lib/actions/deals';
import { toast } from '@/components/ui/toaster';

export type MemberOption = { id: string; name: string };

export function InlineAssigneeSelect({
  dealId,
  initial,
  members,
}: {
  dealId: string;
  initial: string | null;
  members: MemberOption[];
}) {
  const router = useRouter();
  const [value, setValue] = useState<string>(initial ?? '');
  const [isPending, startTransition] = useTransition();

  const onChange = (next: string) => {
    const normalized = next === '' ? '' : next;
    if (normalized === value) return;
    const prev = value;
    setValue(normalized);
    startTransition(async () => {
      const result = await updateDealAssignee(dealId, normalized === '' ? null : normalized);
      if (!result.ok) {
        setValue(prev);
        toast.error(`担当の更新に失敗：${result.error ?? 'unknown'}`);
        return;
      }
      const nextName = members.find((m) => m.id === normalized)?.name ?? '担当なし';
      toast.success(`担当を ${nextName} に変更`);
      router.refresh();
    });
  };

  return (
    <span className="relative inline-block">
      <select
        value={value}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value)}
        aria-label="担当者"
        className="appearance-none px-1.5 py-0.5 pr-5 text-xs text-gray-900 bg-white border border-gray-200 rounded cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:opacity-50 max-w-[100px] truncate"
        title="クリックで担当変更"
      >
        <option value="">—</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 opacity-60"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}
