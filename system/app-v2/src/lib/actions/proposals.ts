'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { proposals } from '@/db/schema';

const proposalSchema = z.object({
  deal_id: z.string().uuid(),
  title: z.string().min(1, 'タイトルは必須です').max(200),
  status: z.enum(['draft', 'shared', 'won', 'lost', 'archived']).default('draft'),
  slides: z.array(z.unknown()).default([]),
});

export type ProposalFormState = {
  errors?: { title?: string[]; status?: string[]; _form?: string[] };
  success?: boolean;
  proposalId?: string;
};

async function nextVersion(dealId: string, companyId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${proposals.version}), 0)` })
    .from(proposals)
    .where(and(eq(proposals.deal_id, dealId), eq(proposals.company_id, companyId)));
  return (row?.max ?? 0) + 1;
}

export async function createProposal(
  _prev: ProposalFormState,
  formData: FormData
): Promise<ProposalFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };

  const slidesRaw = formData.get('slides');
  let slides: unknown[] = [];
  if (typeof slidesRaw === 'string' && slidesRaw.length > 0) {
    try {
      const parsed = JSON.parse(slidesRaw);
      if (Array.isArray(parsed)) slides = parsed;
    } catch {
      return { errors: { _form: ['スライドJSONが不正です'] } };
    }
  }

  const parsed = proposalSchema.safeParse({
    deal_id: formData.get('deal_id'),
    title: formData.get('title'),
    status: formData.get('status') ?? 'draft',
    slides,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const version = await nextVersion(parsed.data.deal_id, session.user.company_id);

  const [created] = await db
    .insert(proposals)
    .values({
      company_id: session.user.company_id,
      deal_id: parsed.data.deal_id,
      version,
      title: parsed.data.title,
      status: parsed.data.status,
      slides: parsed.data.slides,
      created_by: session.user.member_id,
    })
    .returning({ id: proposals.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'proposal.create',
    resource_type: 'proposal',
    resource_id: created!.id,
    metadata: { deal_id: parsed.data.deal_id, version, title: parsed.data.title },
  });

  revalidatePath(`/deals/${parsed.data.deal_id}`);
  return { success: true, proposalId: created!.id };
}

export async function updateProposal(
  proposalId: string,
  _prev: ProposalFormState,
  formData: FormData
): Promise<ProposalFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };

  const slidesRaw = formData.get('slides');
  let slides: unknown[] | undefined;
  if (typeof slidesRaw === 'string' && slidesRaw.length > 0) {
    try {
      const parsed = JSON.parse(slidesRaw);
      if (Array.isArray(parsed)) slides = parsed;
    } catch {
      return { errors: { _form: ['スライドJSONが不正です'] } };
    }
  }

  const updateData: Record<string, unknown> = { updated_at: new Date() };
  const titleVal = formData.get('title');
  const statusVal = formData.get('status');
  if (typeof titleVal === 'string' && titleVal.length > 0) updateData.title = titleVal;
  if (typeof statusVal === 'string') updateData.status = statusVal;
  if (slides) updateData.slides = slides;

  await db
    .update(proposals)
    .set(updateData)
    .where(and(eq(proposals.id, proposalId), eq(proposals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'proposal.update',
    resource_type: 'proposal',
    resource_id: proposalId,
  });

  return { success: true, proposalId };
}

export async function deleteProposal(proposalId: string, dealId?: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');

  await db
    .update(proposals)
    .set({ deleted_at: new Date() })
    .where(and(eq(proposals.id, proposalId), eq(proposals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'proposal.delete',
    resource_type: 'proposal',
    resource_id: proposalId,
  });

  if (dealId) revalidatePath(`/deals/${dealId}`);
}

export type ProposalStatus = 'draft' | 'shared' | 'won' | 'lost' | 'archived';

export async function updateProposalStatus(
  proposalId: string,
  status: ProposalStatus,
  dealId?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.member_id) return { success: false, error: '認証が必要です' };

  const allowed: ProposalStatus[] = ['draft', 'shared', 'won', 'lost', 'archived'];
  if (!allowed.includes(status)) return { success: false, error: '不正なステータス' };

  const [updated] = await db
    .update(proposals)
    .set({ status, updated_at: new Date() })
    .where(and(eq(proposals.id, proposalId), eq(proposals.company_id, session.user.company_id)))
    .returning({ id: proposals.id });

  if (!updated) return { success: false, error: '提案書が見つかりません' };

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'proposal.update_status',
    resource_type: 'proposal',
    resource_id: proposalId,
    metadata: { new_status: status },
  });

  if (dealId) revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

export async function listProposalsForDeal(dealId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  return db
    .select()
    .from(proposals)
    .where(
      and(
        eq(proposals.deal_id, dealId),
        eq(proposals.company_id, session.user.company_id),
        isNull(proposals.deleted_at)
      )
    )
    .orderBy(desc(proposals.version));
}
