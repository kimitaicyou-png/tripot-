/**
 * 主観確度（subjective_confidence）の表示用ヘルパー
 *
 * 現行スプレッドシート互換の営業温度感ラベル（A〜E + 想定/継続）。
 * stage（客観事実）と直交する補完軸（ADR-0013、G3、2026-05-25）。
 *
 * 中止は stage='lost' で表現するため、確度には含めない（DRY 維持）。
 */

export const SUBJECTIVE_CONFIDENCE_VALUES = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'expected',
  'continuing',
] as const;

export type SubjectiveConfidence = (typeof SUBJECTIVE_CONFIDENCE_VALUES)[number];

export const CONFIDENCE_LABEL: Record<SubjectiveConfidence, string> = {
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
  e: 'E',
  expected: '想定',
  continuing: '継続',
};

export const CONFIDENCE_DESCRIPTION: Record<SubjectiveConfidence, string> = {
  a: '見積以降・受注確度高',
  b: 'ヒアリング・補助金待ち',
  c: '提案中・検討中',
  d: 'アポ段階',
  e: '見込み・温度感低',
  expected: '想定・計画段階',
  continuing: '継続・既存顧客追加',
};

// design rules 準拠：font-bold/font-black 禁止 / shadow-md+ 禁止 / focus:ring-gray-900/20
// 色は意味づけ：A=赤系（熱い）, B=橙, C=黄, D=灰, E=灰薄, 想定=青, 継続=緑
export const CONFIDENCE_BADGE_CLASS: Record<SubjectiveConfidence, string> = {
  a: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  b: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  c: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
  d: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
  e: 'bg-gray-50 text-gray-500 ring-1 ring-gray-200',
  expected: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  continuing: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
};

// 未設定（null）の場合の表示
export const CONFIDENCE_NULL_BADGE_CLASS =
  'bg-white text-gray-500 ring-1 ring-dashed ring-gray-300';

export function getConfidenceLabel(value: SubjectiveConfidence | null | undefined): string {
  if (!value) return '未設定';
  return CONFIDENCE_LABEL[value];
}

export function getConfidenceFullLabel(
  value: SubjectiveConfidence | null | undefined,
): string {
  if (!value) return '確度未設定';
  return `${CONFIDENCE_LABEL[value]}（${CONFIDENCE_DESCRIPTION[value]}）`;
}
