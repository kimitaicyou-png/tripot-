import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, setTenantContext } from '@/lib/db';
import { members } from '@/db/schema';
import type { Session } from 'next-auth';
import { checkPermission } from './check-permission';

export type ActiveSession = Session & {
  user: {
    member_id: string;
    company_id: string;
    role: 'president' | 'hq_member' | 'member';
  };
};

export type AuthGuardResult =
  | { ok: true; session: ActiveSession }
  | { ok: false; reason: 'unauthenticated' | 'inactive' | 'deleted' };

/**
 * ADR-0012 P0-2 退職者 JWT 即時無効化（DB 再確認方式）。
 *
 * NextAuth の signIn callback は **新規ログイン時のみ** member.status を確認するため、
 * 既存JWT を持ったユーザは status='inactive' に変更されても 30日 maxAge まで有効に残る穴がある。
 * このガードは **API 実行時に DB 再確認**することで穴を塞ぐ。
 *
 * 既存 column 活用：
 *   - members.deleted_at != NULL  → 'deleted'
 *   - members.status !== 'active' → 'inactive'（pending / inactive など）
 *
 * 新規 column 追加なし（schema 変更ゼロ）、migration 不要。
 *
 * tenant context も同時に設定（setTenantContext は RLS 必須）。
 */
export async function requireActiveMember(): Promise<AuthGuardResult> {
  const session = await auth();
  if (!session?.user?.member_id || !session.user.company_id) {
    return { ok: false, reason: 'unauthenticated' };
  }

  const member = await db
    .select({ status: members.status, deleted_at: members.deleted_at })
    .from(members)
    .where(
      and(
        eq(members.id, session.user.member_id),
        eq(members.company_id, session.user.company_id)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!member || member.deleted_at) {
    return { ok: false, reason: 'deleted' };
  }
  if (member.status !== 'active') {
    return { ok: false, reason: 'inactive' };
  }

  await setTenantContext(session.user.company_id);
  return { ok: true, session: session as ActiveSession };
}

export type RequirePermissionResult =
  | { ok: true; session: ActiveSession }
  | { ok: false; error: string; reason: 'unauthenticated' | 'inactive' | 'deleted' | 'forbidden' };

/**
 * ADR-0011 G-1 + ADR-0012 P0-2 統合ガード。
 *
 * 各 Server Action 冒頭で1行呼ぶだけで以下が全部成立：
 *   1. 認証チェック（auth）
 *   2. メンバー有効性チェック（status='active' AND deleted_at=NULL、DB再確認）
 *   3. tenant context 設定（RLS）
 *   4. role × resource × action での権限チェック（role_permissions 参照）
 *
 * 使用例:
 *   const guard = await requirePermission({ resource: 'deal', action: 'delete' });
 *   if (!guard.ok) return { errors: { _form: [guard.error] } };
 *   // 以降 guard.session.user.* で member_id / company_id / role を使える
 */
export async function requirePermission(params: {
  resource: string;
  action: string;
}): Promise<RequirePermissionResult> {
  const member = await requireActiveMember();
  if (!member.ok) {
    const error =
      member.reason === 'unauthenticated'
        ? '認証が必要です'
        : member.reason === 'inactive'
          ? 'アカウントが無効化されています'
          : 'アカウントが見つかりません';
    return { ok: false, error, reason: member.reason };
  }

  const allowed = await checkPermission(
    member.session.user.company_id,
    member.session.user.role,
    params.resource,
    params.action
  );

  if (!allowed) {
    return { ok: false, error: 'この操作の権限がありません', reason: 'forbidden' };
  }

  return { ok: true, session: member.session };
}
