/**
 * 主観確度バッジ（表示専用、Server Component）
 *
 * ADR-0013（G3、2026-05-25）。Kanban カード・List 行・案件詳細サマリーで使用。
 * 編集は ConfidenceDropdown（client）側で行う。
 */

import {
  CONFIDENCE_BADGE_CLASS,
  CONFIDENCE_NULL_BADGE_CLASS,
  getConfidenceLabel,
  type SubjectiveConfidence,
} from '@/lib/deals/confidence';

type Size = 'sm' | 'md';

const SIZE_CLASS: Record<Size, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
};

export function ConfidenceBadge({
  value,
  size = 'md',
  showLabel = true,
}: {
  value: SubjectiveConfidence | null | undefined;
  size?: Size;
  showLabel?: boolean;
}) {
  const cls = value ? CONFIDENCE_BADGE_CLASS[value] : CONFIDENCE_NULL_BADGE_CLASS;
  const label = showLabel ? getConfidenceLabel(value) : value ?? '—';
  return (
    <span
      className={`inline-flex items-center rounded-md font-medium font-mono tabular-nums ${SIZE_CLASS[size]} ${cls}`}
      title={value ? `確度 ${label}` : '確度未設定'}
    >
      {label}
    </span>
  );
}
