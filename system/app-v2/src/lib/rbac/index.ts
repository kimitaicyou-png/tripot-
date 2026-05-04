/**
 * rbac (Role-Based Access Control) ヘルパー
 *
 * - ADR-0011: rbac は DB 参照型ロール定義を採用（13社展開対応）
 * - ADR-0012: 退職者 JWT 即時無効化は DB 再確認方式で実装
 *
 * 使い分け：
 *   - 各 Server Action 冒頭 → requirePermission({ resource, action })
 *   - 既存 auth() を残したい場合 → requireActiveMember() で member 有効性のみ
 *   - 単純な権限照合だけ欲しい時 → checkPermission(...)
 */

export { checkPermission } from './check-permission';
export {
  requireActiveMember,
  requirePermission,
  type ActiveSession,
  type AuthGuardResult,
  type RequirePermissionResult,
} from './auth-guard';
