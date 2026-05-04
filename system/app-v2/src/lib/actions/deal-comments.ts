'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { db, logAudit } from '@/lib/db';
import { deal_comments, members } from '@/db/schema';
import { requirePermission } from '@/lib/rbac';

const schema = z.object({
  body: z.string().min(1, '本文は必須').max(2000),
});

export type CommentFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function createDealComment(
  dealId: string,
  _prev: CommentFormState,
  formData: FormData
): Promise<CommentFormState> {
  const guard = await requirePermission({ resource: 'deal', action: 'create' });
  if (!guard.ok) return { errors: { _form: [guard.error] } };
  const { session } = guard;

  const parsed = schema.safeParse({
    body: formData.get('body'),
  });

  if (!parsed.success) return { errors: { _form: parsed.error.errors.map((e) => e.message) } };

  const [created] = await db
    .insert(deal_comments)
    .values({
      company_id: session.user.company_id,
      deal_id: dealId,
      member_id: session.user.member_id,
      body: parsed.data.body,
    })
    .returning({ id: deal_comments.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal_comment.create',
    resource_type: 'deal_comment',
    resource_id: created!.id,
    metadata: { deal_id: dealId, length: parsed.data.body.length },
  });

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

export async function deleteDealComment(commentId: string, dealId: string): Promise<void> {
  const guard = await requirePermission({ resource: 'deal', action: 'delete' });
  if (!guard.ok) throw new Error(guard.error);
  const { session } = guard;

  await db
    .update(deal_comments)
    .set({ deleted_at: new Date() })
    .where(
      and(
        eq(deal_comments.id, commentId),
        eq(deal_comments.company_id, session.user.company_id),
        eq(deal_comments.member_id, session.user.member_id)
      )
    );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal_comment.delete',
    resource_type: 'deal_comment',
    resource_id: commentId,
  });

  revalidatePath(`/deals/${dealId}`);
}

export async function listDealComments(dealId: string) {
  const guard = await requirePermission({ resource: 'deal', action: 'read_self' });
  if (!guard.ok) return [];
  const { session } = guard;

  return db
    .select({
      id: deal_comments.id,
      body: deal_comments.body,
      created_at: deal_comments.created_at,
      member_id: deal_comments.member_id,
      member_name: members.name,
    })
    .from(deal_comments)
    .leftJoin(members, eq(deal_comments.member_id, members.id))
    .where(
      and(
        eq(deal_comments.deal_id, dealId),
        eq(deal_comments.company_id, session.user.company_id),
        isNull(deal_comments.deleted_at)
      )
    )
    .orderBy(desc(deal_comments.created_at));
}
