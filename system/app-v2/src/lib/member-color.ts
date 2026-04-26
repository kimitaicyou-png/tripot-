/**
 * メンバー識別色の決定論的生成
 *
 * 旧tripot v1：MEMBER_COLORS[i % 8] の並び順依存 → メンバー追加で全員の色が変わる事故
 * v2：memberId（UUID文字列）を hash して永続的な色を割当て
 */

const PALETTE = [
  'bg-pink-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-rose-500',
] as const;

export function getMemberColor(memberId: string): string {
  let hash = 0;
  for (let i = 0; i < memberId.length; i++) {
    hash = (hash << 5) - hash + memberId.charCodeAt(i);
    hash = hash & hash;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function getMemberInitial(name: string): string {
  if (!name) return '?';
  return name.charAt(0);
}
