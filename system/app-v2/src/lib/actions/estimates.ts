'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { estimates } from '@/db/schema';

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nonnegative(),
  unit_price: z.number().nonnegative(),
  amount: z.number().nonnegative(),
});

const estimateSchema = z.object({
  deal_id: z.string().uuid(),
  title: z.string().min(1, 'タイトルは必須です').max(200),
  status: z.enum(['draft', 'sent', 'accepted', 'declined']).default('draft'),
  subtotal: z.coerce.number().int().nonnegative().default(0),
  tax: z.coerce.number().int().nonnegative().default(0),
  total: z.coerce.number().int().nonnegative().default(0),
  line_items: z.array(lineItemSchema).default([]),
  valid_until: z.string().optional().nullable(),
});

export type EstimateFormState = {
  errors?: { title?: string[]; total?: string[]; _form?: string[] };
  success?: boolean;
  estimateId?: string;
};

async function nextVersion(dealId: string, companyId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${estimates.version}), 0)` })
    .from(estimates)
    .where(and(eq(estimates.deal_id, dealId), eq(estimates.company_id, companyId)));
  return (row?.max ?? 0) + 1;
}

export async function createEstimate(
  _prev: EstimateFormState,
  formData: FormData
): Promise<EstimateFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };

  const lineItemsRaw = formData.get('line_items');
  let lineItems: unknown = [];
  if (typeof lineItemsRaw === 'string' && lineItemsRaw.length > 0) {
    try {
      lineItems = JSON.parse(lineItemsRaw);
    } catch {
      return { errors: { _form: ['明細JSONが不正です'] } };
    }
  }

  const parsed = estimateSchema.safeParse({
    deal_id: formData.get('deal_id'),
    title: formData.get('title'),
    status: formData.get('status') ?? 'draft',
    subtotal: formData.get('subtotal') ?? 0,
    tax: formData.get('tax') ?? 0,
    total: formData.get('total') ?? 0,
    line_items: lineItems,
    valid_until: formData.get('valid_until') || null,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const version = await nextVersion(parsed.data.deal_id, session.user.company_id);

  const [created] = await db
    .insert(estimates)
    .values({
      company_id: session.user.company_id,
      deal_id: parsed.data.deal_id,
      version,
      title: parsed.data.title,
      status: parsed.data.status,
      subtotal: parsed.data.subtotal,
      tax: parsed.data.tax,
      total: parsed.data.total,
      line_items: parsed.data.line_items,
      valid_until: parsed.data.valid_until ?? null,
      created_by: session.user.member_id,
    })
    .returning({ id: estimates.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'estimate.create',
    resource_type: 'estimate',
    resource_id: created!.id,
    metadata: { deal_id: parsed.data.deal_id, version, total: parsed.data.total },
  });

  revalidatePath(`/deals/${parsed.data.deal_id}`);
  return { success: true, estimateId: created!.id };
}

export async function listEstimatesForDeal(dealId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  return db
    .select()
    .from(estimates)
    .where(
      and(
        eq(estimates.deal_id, dealId),
        eq(estimates.company_id, session.user.company_id),
        isNull(estimates.deleted_at)
      )
    )
    .orderBy(desc(estimates.version));
}

const statusUpdateSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'declined']),
});

export async function updateEstimateStatus(
  estimateId: string,
  dealId: string,
  status: 'draft' | 'sent' | 'accepted' | 'declined'
): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');

  const parsed = statusUpdateSchema.safeParse({ status });
  if (!parsed.success) throw new Error('不正なステータスです');

  const updateData: Record<string, unknown> = {
    status: parsed.data.status,
    updated_at: new Date(),
  };
  if (parsed.data.status === 'sent') {
    updateData.sent_at = new Date();
  }

  await db
    .update(estimates)
    .set(updateData)
    .where(
      and(
        eq(estimates.id, estimateId),
        eq(estimates.company_id, session.user.company_id)
      )
    );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: `estimate.${parsed.data.status}`,
    resource_type: 'estimate',
    resource_id: estimateId,
  });

  revalidatePath(`/deals/${dealId}`);
}

export async function deleteEstimate(estimateId: string, dealId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');

  await db
    .update(estimates)
    .set({ deleted_at: new Date() })
    .where(
      and(
        eq(estimates.id, estimateId),
        eq(estimates.company_id, session.user.company_id)
      )
    );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'estimate.delete',
    resource_type: 'estimate',
    resource_id: estimateId,
  });

  revalidatePath(`/deals/${dealId}`);
}
