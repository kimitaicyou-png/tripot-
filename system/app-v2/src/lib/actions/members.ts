/**
 * メンバー (member) Server Actions
 *
 * ADR-0012 P0-2 退職者 JWT 即時無効化の運用エンドポイント。
 * `members.status` を 'active' ⇄ 'inactive' で切り替え、
 * 次回 API リクエスト時の requireActiveMember で 401 が返る。
 *
 * 2026-05-27 拡張：/settings/members 画面用に listMembers / createMember /
 * updateMemberRole を追加（隊長明示 12:48 石田 QA 招待を起点に作り忘れていた
 * メンバー管理画面を急ぎ実装、5/26 までに作っておくべきだった機能）。
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { db, logAudit } from '@/lib/db';
import { members } from '@/db/schema';
import { requirePermission } from '@/lib/rbac';

export type MemberStatusChangeResult = {
  success: boolean;
  error?: string;
};

export type MemberFormState = {
  errors?: { name?: string[]; email?: string[]; role?: string[]; _form?: string[] };
  success?: boolean;
  memberId?: string;
};

const memberInviteSchema = z.object({
  name: z.string().min(1, '氏名は必須です').max(100),
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('メール形式が不正です（例：name@gmail.com）')
    .max(200),
  role: z.enum(['president', 'hq_member', 'member'], {
    errorMap: () => ({ message: '役割を選択してください' }),
  }),
  department: z.string().max(80).optional().nullable().or(z.literal('')),
});

/**
 * 一覧（president / hq_member 用）。
 * status = 'inactive' も含めて表示、削除済（deleted_at）のみ除外。
 */
export async function listMembers() {
  const guard = await requirePermission({ resource: 'member', action: 'read' });
  if (!guard.ok) return [];
  const { session } = guard;
  return db
    .select({
      id: members.id,
      name: members.name,
      email: members.email,
      role: members.role,
      status: members.status,
      department: members.department,
      created_at: members.created_at,
    })
    .from(members)
    .where(and(eq(members.company_id, session.user.company_id), isNull(members.deleted_at)))
    .orderBy(asc(members.created_at));
}

/**
 * 新規メンバー招待（招待制 Google OAuth 前提、status='active' で即作成）。
 *
 * Google OAuth 側で email が一致したら login 可能。
 * 重複 email は DB unique 制約で 失敗 → エラー文に変換して返す。
 */
export async function createMember(
  _prev: MemberFormState,
  formData: FormData
): Promise<MemberFormState> {
  const guard = await requirePermission({ resource: 'member', action: 'create' });
  if (!guard.ok) return { errors: { _form: [guard.error] } };
  const { session } = guard;

  const parsed = memberInviteSchema.safeParse({
    name: formData.get('name'),
    email: (formData.get('email') ?? '').toString().trim().toLowerCase(),
    role: formData.get('role'),
    department: formData.get('department') || null,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  try {
    const [created] = await db
      .insert(members)
      .values({
        company_id: session.user.company_id,
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        department: parsed.data.department || null,
        status: 'active',
      })
      .returning({ id: members.id });

    await logAudit({
      member_id: session.user.member_id,
      company_id: session.user.company_id,
      action: 'member.create',
      resource_type: 'member',
      resource_id: created!.id,
      metadata: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
      },
    });

    revalidatePath('/settings/members');
    revalidatePath('/team');
    return { success: true, memberId: created!.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Postgres unique violation（members_email_unique）→ 人にわかる日本語へ
    if (msg.includes('members_email_unique') || msg.includes('duplicate key')) {
      return { errors: { email: ['このメールアドレスは既に登録されています'] } };
    }
    return { errors: { _form: [`登録に失敗しました：${msg}`] } };
  }
}

/**
 * メンバーの役割変更。president / hq_member のみ。
 * 自分自身の役割降格は禁止（最後の president が消える事故を防ぐ）。
 */
export async function updateMemberRole(
  memberId: string,
  role: 'president' | 'hq_member' | 'member'
): Promise<MemberStatusChangeResult> {
  const guard = await requirePermission({ resource: 'member', action: 'update' });
  if (!guard.ok) return { success: false, error: guard.error };
  const { session } = guard;

  if (memberId === session.user.member_id) {
    return { success: false, error: '自分自身の役割は変更できません' };
  }

  const [updated] = await db
    .update(members)
    .set({ role, updated_at: new Date() })
    .where(and(eq(members.id, memberId), eq(members.company_id, session.user.company_id)))
    .returning({ id: members.id, name: members.name });

  if (!updated) return { success: false, error: 'メンバーが見つかりません' };

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'member.role_update',
    resource_type: 'member',
    resource_id: memberId,
    metadata: { target_name: updated.name, new_role: role },
  });

  revalidatePath('/settings/members');
  revalidatePath('/team');
  return { success: true };
}

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
