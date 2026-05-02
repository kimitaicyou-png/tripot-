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
import { db, logAudit, setTenantContext } from '@/lib/db';
import { deals, customers, members } from '@/db/schema';
import { isNull, ilike, sql } from 'drizzle-orm';

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
  await setTenantContext(session.user.company_id);

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
  await setTenantContext(session.user.company_id);

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
  await setTenantContext(session.user.company_id);

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

export type TargetMetaState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function updateDealTargetMeta(
  dealId: string,
  _prev: TargetMetaState,
  formData: FormData
): Promise<TargetMetaState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const targetRevenueRaw = String(formData.get('target_revenue') ?? '').trim();
  const targetGpRaw = String(formData.get('target_gp') ?? '').trim();
  const targetCloseRaw = String(formData.get('target_close_date') ?? '').trim();
  const winReason = String(formData.get('win_reason') ?? '').trim().slice(0, 500);

  const targetRevenue = /^\d+$/.test(targetRevenueRaw) ? Math.min(99_999_999_999, Number(targetRevenueRaw)) : 0;
  const targetGp = /^\d+$/.test(targetGpRaw) ? Math.min(99_999_999_999, Number(targetGpRaw)) : 0;
  const targetCloseDate = /^\d{4}-\d{2}-\d{2}$/.test(targetCloseRaw) ? targetCloseRaw : null;

  const existing = await db.query.deals.findFirst({
    where: (d, { and: aand, eq: eeq }) => aand(eeq(d.id, dealId), eeq(d.company_id, session.user.company_id)),
    columns: { metadata: true },
  });

  if (!existing) return { errors: { _form: ['案件が見つかりません'] } };

  const meta = (existing.metadata as Record<string, unknown> | null) ?? {};
  const nextMeta = {
    ...meta,
    target_revenue: targetRevenue,
    target_gp: targetGp,
    target_close_date: targetCloseDate,
    win_reason: winReason,
    target_meta_updated_at: new Date().toISOString(),
  };

  await db
    .update(deals)
    .set({ metadata: nextMeta })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.update_target_meta',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: { target_revenue: targetRevenue, target_gp: targetGp, target_close_date: targetCloseDate },
  });

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

export type RunningMetaState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function updateDealRunningMeta(
  dealId: string,
  _prev: RunningMetaState,
  formData: FormData
): Promise<RunningMetaState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const nextRenewalDateRaw = String(formData.get('next_renewal_date') ?? '').trim();
  const autoRenew = formData.get('auto_renew') === 'on';
  const renewalCountRaw = String(formData.get('renewal_count') ?? '').trim();
  const renewalNote = String(formData.get('renewal_note') ?? '').trim().slice(0, 500);

  const nextRenewalDate = /^\d{4}-\d{2}-\d{2}$/.test(nextRenewalDateRaw) ? nextRenewalDateRaw : null;
  const renewalCount = /^\d+$/.test(renewalCountRaw) ? Math.min(999, Number(renewalCountRaw)) : 0;

  const existing = await db.query.deals.findFirst({
    where: (d, { and: aand, eq: eeq }) => aand(eeq(d.id, dealId), eeq(d.company_id, session.user.company_id)),
    columns: { metadata: true },
  });

  if (!existing) return { errors: { _form: ['案件が見つかりません'] } };

  const meta = (existing.metadata as Record<string, unknown> | null) ?? {};
  const nextMeta = {
    ...meta,
    next_renewal_date: nextRenewalDate,
    auto_renew: autoRenew,
    renewal_count: renewalCount,
    renewal_note: renewalNote,
    running_meta_updated_at: new Date().toISOString(),
  };

  await db
    .update(deals)
    .set({ metadata: nextMeta })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.update_running_meta',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: { next_renewal_date: nextRenewalDate, auto_renew: autoRenew, renewal_count: renewalCount },
  });

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

export async function updateDealInternalNote(
  dealId: string,
  _prev: InternalNoteState,
  formData: FormData
): Promise<InternalNoteState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

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

const VALID_STAGES = [
  'prospect',
  'proposing',
  'ordered',
  'in_production',
  'delivered',
  'acceptance',
  'invoiced',
  'paid',
  'lost',
] as const;

const bulkDealRowSchema = z.object({
  title: z.string().min(1, '案件名は必須').max(200),
  customer_name: z.string().max(200).optional().nullable(),
  assignee_email: z.string().max(200).optional().nullable(),
  stage: z.enum(VALID_STAGES).default('prospect'),
  amount: z.coerce.number().int().nonnegative().default(0),
  expected_close_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式')
    .optional()
    .or(z.literal(''))
    .nullable(),
});

export type BulkDealRow = z.infer<typeof bulkDealRowSchema>;

export type BulkCreateDealsResult = {
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

export async function bulkCreateDeals(
  rows: BulkDealRow[]
): Promise<BulkCreateDealsResult> {
  const session = await auth();
  if (!session?.user?.member_id) {
    return { inserted: 0, skipped: 0, errors: [{ row: 0, message: '認証が必要です' }] };
  }
  await setTenantContext(session.user.company_id);

  const allCustomers = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(
      and(
        eq(customers.company_id, session.user.company_id),
        isNull(customers.deleted_at)
      )
    );

  const customerByName = new Map(
    allCustomers.map((c) => [c.name.trim().toLowerCase(), c.id])
  );

  const allMembers = await db
    .select({ id: members.id, email: members.email })
    .from(members)
    .where(
      and(
        eq(members.company_id, session.user.company_id),
        isNull(members.deleted_at)
      )
    );

  const memberByEmail = new Map(
    allMembers.map((m) => [m.email.trim().toLowerCase(), m.id])
  );

  const errors: BulkCreateDealsResult['errors'] = [];
  const valid: Array<{
    company_id: string;
    title: string;
    customer_id: string | null;
    assignee_id: string | null;
    stage: (typeof VALID_STAGES)[number];
    amount: number;
    expected_close_date: string | null;
  }> = [];

  rows.forEach((row, idx) => {
    const parsed = bulkDealRowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push({
        row: idx + 1,
        message: parsed.error.errors
          .map((e) => `${e.path.join('.') || 'value'}: ${e.message}`)
          .join('; '),
      });
      return;
    }

    let customerId: string | null = null;
    if (parsed.data.customer_name) {
      const lookup = customerByName.get(parsed.data.customer_name.trim().toLowerCase());
      if (!lookup) {
        errors.push({
          row: idx + 1,
          message: `customer_name "${parsed.data.customer_name}" が顧客マスタに見つかりません（先に顧客を import してください）`,
        });
        return;
      }
      customerId = lookup;
    }

    let assigneeId: string | null = null;
    if (parsed.data.assignee_email) {
      const lookup = memberByEmail.get(parsed.data.assignee_email.trim().toLowerCase());
      if (!lookup) {
        errors.push({
          row: idx + 1,
          message: `assignee_email "${parsed.data.assignee_email}" がメンバーに見つかりません`,
        });
        return;
      }
      assigneeId = lookup;
    }

    valid.push({
      company_id: session.user.company_id,
      title: parsed.data.title.trim(),
      customer_id: customerId,
      assignee_id: assigneeId,
      stage: parsed.data.stage,
      amount: parsed.data.amount,
      expected_close_date: parsed.data.expected_close_date || null,
    });
  });

  if (valid.length === 0) {
    return { inserted: 0, skipped: rows.length, errors };
  }

  const inserted = await db.insert(deals).values(valid).returning({ id: deals.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deals.bulk_create',
    resource_type: 'deal',
    resource_id: 'bulk',
    metadata: {
      inserted: inserted.length,
      errors_count: errors.length,
      sample_titles: valid.slice(0, 5).map((v) => v.title),
    },
  });

  revalidatePath('/deals');
  return {
    inserted: inserted.length,
    skipped: rows.length - inserted.length,
    errors,
  };
}
