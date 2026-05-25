'use client';

/**
 * 案件一覧 List view 用 — 主観確度のインライン編集（G7、2026-05-26）
 *
 * Badge クリック → native select overlay。
 * 既存 ConfidenceDropdown（案件詳細用、説明文付き）の軽量版。
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateDealConfidence } from '@/lib/actions/deals';
import { toast } from '@/components/ui/toaster';
import {
  CONFIDENCE_BADGE_CLASS,
  CONFIDENCE_NULL_BADGE_CLASS,
  CONFIDENCE_LABEL,
  SUBJECTIVE_CONFIDENCE_VALUES,
  getConfidenceLabel,
  type SubjectiveConfidence,
} from '@/lib/deals/confidence';

export function InlineConfidenceSelect({
  dealId,
  initial,
}: {
  dealId: string;
  initial: SubjectiveConfidence | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState<SubjectiveConfidence | null>(initial);
  const [isPending, startTransition] = useTransition();

  const onChange = (next: SubjectiveConfidence | null) => {
    if (next === value) return;
    const prev = value;
    setValue(next);
    startTransition(async () => {
      const result = await updateDealConfidence(dealId, next);
      if (!result.ok) {
        setValue(prev);
        toast.error(`確度の更新に失敗：${result.error ?? 'unknown'}`);
        return;
      }
      toast.success(next ? `確度を ${CONFIDENCE_LABEL[next]} に更新` : '確度を未設定に戻しました');
      router.refresh();
    });
  };

  const cls = value ? CONFIDENCE_BADGE_CLASS[value] : CONFIDENCE_NULL_BADGE_CLASS;

  return (
    <span className="relative inline-block">
      <select
        value={value ?? ''}
        disabled={isPending}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : (v as SubjectiveConfidence));
        }}
        aria-label="主観確度（A〜E + 想定/継続）"
        className={`appearance-none px-1.5 py-0.5 pr-5 text-xs font-medium font-mono tabular-nums rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:opacity-50 ${cls}`}
        title={value ? `確度 ${getConfidenceLabel(value)}` : '確度未設定（クリックで設定）'}
      >
        <option value="">—</option>
        {SUBJECTIVE_CONFIDENCE_VALUES.map((v) => (
          <option key={v} value={v}>
            {CONFIDENCE_LABEL[v]}
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
