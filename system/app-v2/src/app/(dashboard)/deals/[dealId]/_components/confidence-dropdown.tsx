'use client';

/**
 * 主観確度ドロップダウン（編集可、Client Component）
 *
 * ADR-0013（G3、2026-05-25）。案件詳細 overview-tab で使用。
 * 楽観的更新 + 失敗時ロールバック + toast 通知。既存 InlineStageChanger と同型。
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateDealConfidence } from '@/lib/actions/deals';
import { toast } from '@/components/ui/toaster';
import {
  CONFIDENCE_BADGE_CLASS,
  CONFIDENCE_NULL_BADGE_CLASS,
  CONFIDENCE_DESCRIPTION,
  CONFIDENCE_LABEL,
  SUBJECTIVE_CONFIDENCE_VALUES,
  type SubjectiveConfidence,
} from '@/lib/deals/confidence';

export function ConfidenceDropdown({
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
    // 楽観的更新
    setValue(next);
    startTransition(async () => {
      const result = await updateDealConfidence(dealId, next);
      if (!result.ok) {
        setValue(prev);
        toast.error(`確度の更新に失敗しました：${result.error ?? 'unknown'}`);
        return;
      }
      toast.success(next ? `確度を ${CONFIDENCE_LABEL[next]} に更新` : '確度を未設定に戻しました');
      router.refresh();
    });
  };

  const cls = value ? CONFIDENCE_BADGE_CLASS[value] : CONFIDENCE_NULL_BADGE_CLASS;
  const labelText = value ? CONFIDENCE_LABEL[value] : '未設定';

  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="text-xs text-gray-600">確度</span>
      <span className="relative inline-flex items-center">
        <select
          value={value ?? ''}
          disabled={isPending}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? null : (v as SubjectiveConfidence));
          }}
          aria-label="主観確度（A〜E + 想定/継続）"
          className={`appearance-none px-2.5 py-0.5 pr-7 text-xs font-medium font-mono tabular-nums rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:opacity-50 ${cls}`}
        >
          <option value="">未設定</option>
          {SUBJECTIVE_CONFIDENCE_VALUES.map((v) => (
            <option key={v} value={v}>
              {CONFIDENCE_LABEL[v]} — {CONFIDENCE_DESCRIPTION[v]}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-1.5 w-3 h-3 text-gray-500"
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
      <span className="sr-only">現在：{labelText}</span>
    </label>
  );
}
