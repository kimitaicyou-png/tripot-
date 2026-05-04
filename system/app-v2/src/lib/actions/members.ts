/**
 * メンバー (member) Server Actions
 *
 * ADR-0012 P0-2 退職者 JWT 即時無効化の運用エンドポイント。
 * `members.status` を 'active' ⇄ 'inactive' で切り替え、
 * 次回 API リクエスト時の requireActiveMember で 401 が返る。
 */

'use server';

import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { db, logAudit } from '@/lib/db';
import { members } from '@/db/schema';
import { requirePermission } from '@/lib/rbac';

export type MemberStatusChangeResult = {
  success: boolean;
  error?: string;
};

/**
 * メンバー無効化（退職・休職・セキュリティ事案など）。
 * president / hq_member 限定（DEFAULT_MATRIX で member は member.deactivate なし）。
 *
 * 即時反映：DB 直書きで status='inactive' → 次回 requirePermission の
 * requireActiveMember 内 DB 再確認で 'inactive' 検知 → reason='inactive' 返却。
 */
export async function deactivateMember(
  memberId: string,
  reason?: string
): Promise<MemberStatusChangeResult> {
  const guard = await requirePermission({ resource: 'member', action: 'deactivate' });
  if (!guard.ok) return { success: false, error: guard.error };
  const { session } = guard;

  if (memberId === session.user.member_id) {
    return { success: false, error: '自分自身を無効化することはできません' };
  }

  const [updated] = await db
    .update(members)
    .set({ status: 'inactive', updated_at: new Date() })
    .where(and(eq(members.id, memberId), eq(members.company_id, session.user.company_id)))
    .returning({ id: members.id, name: members.name });

  if (!updated) return { success: false, error: 'メンバーが見つかりません' };

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'member.deactivate',
    resource_type: 'member',
    resource_id: memberId,
    metadata: {
      target_name: updated.name,
      reason: reason ?? null,
    },
  });

  revalidatePath(`/team/${memberId}`);
  revalidatePath('/team');
  return { success: true };
}

/**
 * メンバー再有効化（無効化を取り消す）。
 * president / hq_member 限定。
 */
export async function activateMember(memberId: string): Promise<MemberStatusChangeResult> {
  const guard = await requirePermission({ resource: 'member', action: 'update' });
  if (!guard.ok) return { success: false, error: guard.error };
  const { session } = guard;

  const [updated] = await db
    .update(members)
    .set({ status: 'active', updated_at: new Date() })
    .where(and(eq(members.id, memberId), eq(members.company_id, session.user.company_id)))
    .returning({ id: members.id, name: members.name });

  if (!updated) return { success: false, error: 'メンバーが見つかりません' };

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'member.activate',
    resource_type: 'member',
    resource_id: memberId,
    metadata: { target_name: updated.name },
  });

  revalidatePath(`/team/${memberId}`);
  revalidatePath('/team');
  return { success: true };
}
