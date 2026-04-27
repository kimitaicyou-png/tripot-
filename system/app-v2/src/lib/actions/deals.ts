/**
 * 案件 (deal) Server Actions
 *
 * Next.js 16 + React 19 useActionState 対応
 * Zod バリデーション必須（Server Action のセキュリティ要件）
 */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { deals } from '@/db/schema';

const dealSchema = z.object({
  title: z.string().min(1, '案件名は必須です').max(200),
  customer_id: z.string().uuid().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  stage: z.enum(['prospect', 'proposing', 'ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'paid', 'lost']),
  amount: z.coerce.number().int().nonnegative().default(0),
  monthly_amount: z.coerce.number().int().nonnegative().default(0),
  revenue_type: z.enum(['spot', 'running', 'both']).default('spot'),
  expected_close_date: z.string().optional().nullable(),
});

export type DealFormState = {
  errors?: {
    title?: string[];
    customer_id?: string[];
    assignee_id?: string[];
    stage?: string[];
    amount?: string[];
    _form?: string[];
  };
  success?: boolean;
  redirectTo?: string;
};

export async function createDeal(_prev: DealFormState, formData: FormData): Promise<DealFormState> {
  const session = await auth();
  if (!session?.user?.member_id) {
    return { errors: { _form: ['認証が必要です'] } };
  }

  const parsed = dealSchema.safeParse({
    title: formData.get('title'),
    customer_id: formData.get('customer_id') || null,
    assignee_id: formData.get('assignee_id') || session.user.member_id,
    stage: formData.get('stage') ?? 'prospect',
    amount: formData.get('amount') ?? 0,
    monthly_amount: formData.get('monthly_amount') ?? 0,
    revenue_type: formData.get('revenue_type') ?? 'spot',
    expected_close_date: formData.get('expected_close_date') || null,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const [created] = await db
    .insert(deals)
    .values({
      company_id: session.user.company_id,
      ...parsed.data,
      customer_id: parsed.data.customer_id ?? null,
      assignee_id: parsed.data.assignee_id ?? session.user.member_id,
    })
    .returning({ id: deals.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.create',
    resource_type: 'deal',
    resource_id: created!.id,
    metadata: { title: parsed.data.title, stage: parsed.data.stage },
  });

  revalidatePath('/deals');
  redirect(`/deals/${created!.id}`);
}

export async function updateDeal(dealId: string, _prev: DealFormState, formData: FormData): Promise<DealFormState> {
  const session = await auth();
  if (!session?.user?.member_id) {
    return { errors: { _form: ['認証が必要です'] } };
  }

  const parsed = dealSchema.partial().safeParse({
    title: formData.get('title') ?? undefined,
    stage: formData.get('stage') ?? undefined,
    amount: formData.get('amount') ?? undefined,
    monthly_amount: formData.get('monthly_amount') ?? undefined,
    revenue_type: formData.get('revenue_type') ?? undefined,
    expected_close_date: formData.get('expected_close_date') || null,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db
    .update(deals)
    .set({ ...parsed.data, updated_at: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.update',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: parsed.data as Record<string, unknown>,
  });

  revalidatePath('/deals');
  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

export async function deleteDeal(dealId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) {
    throw new Error('認証が必要です');
  }

  await db
    .update(deals)
    .set({ deleted_at: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.delete',
    resource_type: 'deal',
    resource_id: dealId,
  });

  revalidatePath('/deals');
  redirect('/deals');
}

export type InternalNoteState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function updateDealInternalNote(
  dealId: string,
  _prev: InternalNoteState,
  formData: FormData
): Promise<InternalNoteState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };

  const note = String(formData.get('internal_note') ?? '').slice(0, 4000);

  const existing = await db.query.deals.findFirst({
    where: (d, { and: aand, eq: eeq }) => aand(eeq(d.id, dealId), eeq(d.company_id, session.user.company_id)),
    columns: { metadata: true },
  });

  if (!existing) return { errors: { _form: ['案件が見つかりません'] } };

  const meta = (existing.metadata as Record<string, unknown> | null) ?? {};
  const nextMeta = { ...meta, internal_note: note, internal_note_updated_at: new Date().toISOString(), internal_note_by: session.user.member_id };

  await db
    .update(deals)
    .set({ metadata: nextMeta })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.update_internal_note',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: { length: note.length },
  });

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}
