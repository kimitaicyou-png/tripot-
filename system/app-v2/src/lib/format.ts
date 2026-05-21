/**
 * 金額・数値フォーマットの共通 helper。
 *
 * tripot 全画面で重複定義されている formatYen / formatMan / formatShortYen を
 * 1 箇所に集約。31 ファイルの重複は段階移行（新規実装から本 helper を使用、
 * 既存は隊長判断で全置換 or そのまま）。
 *
 * 全関数は純粋関数（外部依存ゼロ）、vitest でテスト可。
 */

/** ¥1,234,567 形式（千区切りつきフル）。null/undefined/0 は ¥0。 */
export function formatYen(value: number | null | undefined): string {
  if (!value) return '¥0';
  return `¥${value.toLocaleString('ja-JP')}`;
}

/** formatYen の dash variant：null/undefined/0 のとき "—" を返す（attack-section 等で使用）。 */
export function formatYenOrDash(value: number | null | undefined): string {
  if (!value) return '—';
  return `¥${value.toLocaleString('ja-JP')}`;
}

/** 1,234万 形式（万円単位、千区切り）。0 は 0万。 */
export function formatMan(value: number | null | undefined): string {
  return `${Math.round((value ?? 0) / 10000).toLocaleString('ja-JP')}万`;
}

/**
 * 桁数に応じて短縮表示：
 * - 1000万以上 → 「¥1.2千万」
 * - 1万以上 → 「¥123万」
 * - それ以下 → 「¥1,234」
 * Kanban カード等の幅制約下で使用。
 */
export function formatShortYen(value: number | null | undefined): string {
  if (!value) return '¥0';
  if (value >= 10_000_000) return `¥${(value / 10_000_000).toFixed(1)}千万`;
  if (value >= 10_000) return `¥${Math.round(value / 10_000)}万`;
  return `¥${value.toLocaleString('ja-JP')}`;
}

/** 「+12.3%」形式（符号付き、少数 1 位）。0 は +0.0%。 */
export function formatPercent(value: number | null | undefined): string {
  const v = value ?? 0;
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
}

/** 「12%」形式（符号なし整数、進捗率系用）。null は —。 */
export function formatRate(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${Math.round(value)}%`;
}
