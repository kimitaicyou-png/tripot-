'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { commitments } from '@/db/schema';

const commitmentSchema = z.object({
  text: z.string().min(1, 'コミット内容は必須です').max(500),
  due_date: z.string().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
});

export type CommitmentFormState = {
  errors?: { text?: string[]; due_date?: string[]; _form?: string[] };
  success?: boolean;
  commitmentId?: string;
};

export async function listCommitmentsForMember(memberId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  await setTenantContext(session.user.company_id);
  return db
    .select()
    .from(commitments)
    .where(
      and(
        eq(commitments.member_id, memberId),
        eq(commitments.company_id, session.user.company_id)
      )
    )
    .orderBy(commitments.status, desc(commitments.created_at))
    .limit(20);
}

export async function createCommitment(
  _prev: CommitmentFormState,
  formData: FormData
): Promise<CommitmentFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const parsed = commitmentSchema.safeParse({
    text: formData.get('text'),
    due_date: formData.get('due_date') || null,
    deal_id: formData.get('deal_id') || null,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const [created] = await db
    .insert(commitments)
    .values({
      company_id: session.user.company_id,
      member_id: session.user.member_id,
      deal_id: parsed.data.deal_id ?? null,
      text: parsed.data.text,
      due_date: parsed.data.due_date ?? null,
      status: 'todo',
    })
    .returning({ id: commitments.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'commitment.create',
    resource_type: 'commitment',
    resource_id: created!.id,
    metadata: { text: parsed.data.text, deal_id: parsed.data.deal_id },
  });

  revalidatePath(`/home/${session.user.member_id}`);
  return { success: true, commitmentId: created!.id };
}

export async function completeCommitment(commitmentId: string, memberId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  await db
    .update(commitments)
    .set({
      status: 'done',
      completed_at: new Date(),
    })
    .where(
      and(
        eq(commitments.id, commitmentId),
        eq(commitments.company_id, session.user.company_id)
      )
    );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'commitment.complete',
    resource_type: 'commitment',
    resource_id: commitmentId,
  });

  revalidatePath(`/home/${memberId}`);
}

export async function deleteCommitment(commitmentId: string, memberId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  await db
    .delete(commitments)
    .where(
      and(
        eq(commitments.id, commitmentId),
        eq(commitments.company_id, session.user.company_id)
      )
    );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'commitment.delete',
    resource_type: 'commitment',
    resource_id: commitmentId,
  });

  revalidatePath(`/home/${memberId}`);
}
