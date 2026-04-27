'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { approvals } from '@/db/schema';

const decisionSchema = z.enum(['approved', 'rejected']);

export async function decideApproval(approvalId: string, decision: 'approved' | 'rejected'): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  const parsed = decisionSchema.safeParse(decision);
  if (!parsed.success) throw new Error('decision が不正です');

  const target = await db
    .select({ id: approvals.id, status: approvals.status, requester_id: approvals.requester_id })
    .from(approvals)
    .where(and(eq(approvals.id, approvalId), eq(approvals.company_id, session.user.company_id)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!target) throw new Error('承認案件が見つかりません');
  if (target.status !== 'pending') throw new Error('承認待ちではありません');
  if (target.requester_id === session.user.member_id) {
    throw new Error('自分の申請は自分で承認できません');
  }

  await db
    .update(approvals)
    .set({
      status: parsed.data,
      approver_id: session.user.member_id,
      responded_at: new Date(),
    })
    .where(and(eq(approvals.id, approvalId), eq(approvals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: `approval.${parsed.data}`,
    resource_type: 'approval',
    resource_id: approvalId,
  });

  revalidatePath('/approval');
}

const requestSchema = z.object({
  deal_id: z.string().uuid().optional().nullable(),
  type: z.enum(['discount', 'expense', 'contract', 'custom']),
  payload_note: z.string().max(2000).optional().nullable(),
});

export type ApprovalRequestState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function requestApproval(
  _prev: ApprovalRequestState,
  formData: FormData,
): Promise<ApprovalRequestState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const parsed = requestSchema.safeParse({
    deal_id: formData.get('deal_id') || null,
    type: formData.get('type'),
    payload_note: formData.get('payload_note') || null,
  });

  if (!parsed.success) return { errors: { _form: ['入力値が不正です'] } };

  const [created] = await db
    .insert(approvals)
    .values({
      company_id: session.user.company_id,
      deal_id: parsed.data.deal_id,
      requester_id: session.user.member_id,
      type: parsed.data.type,
      status: 'pending',
      payload: parsed.data.payload_note ? { note: parsed.data.payload_note } : {},
    })
    .returning({ id: approvals.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'approval.request',
    resource_type: 'approval',
    resource_id: created!.id,
    metadata: { type: parsed.data.type, deal_id: parsed.data.deal_id },
  });

  revalidatePath('/approval');
  if (parsed.data.deal_id) revalidatePath(`/deals/${parsed.data.deal_id}`);
  return { success: true };
}
