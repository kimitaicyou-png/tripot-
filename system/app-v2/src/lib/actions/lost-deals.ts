'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { lost_deals, deals } from '@/db/schema';

const reasonSchema = z.object({
  deal_id: z.string().uuid(),
  reason: z.string().min(1, '失注理由は必須').max(40),
  competitor: z.string().max(120).optional().nullable(),
  detail: z.string().max(2000).optional().nullable(),
});

export type LostDealFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function getLostDealForDeal(dealId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return null;
  return db
    .select()
    .from(lost_deals)
    .where(
      and(
        eq(lost_deals.deal_id, dealId),
        eq(lost_deals.company_id, session.user.company_id)
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export async function recordLostDeal(
  _prev: LostDealFormState,
  formData: FormData
): Promise<LostDealFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };

  const parsed = reasonSchema.safeParse({
    deal_id: formData.get('deal_id'),
    reason: formData.get('reason'),
    competitor: formData.get('competitor') || null,
    detail: formData.get('detail') || null,
  });

  if (!parsed.success) return { errors: { _form: ['入力エラー'] } };

  const existing = await db
    .select({ id: lost_deals.id })
    .from(lost_deals)
    .where(
      and(
        eq(lost_deals.deal_id, parsed.data.deal_id),
        eq(lost_deals.company_id, session.user.company_id)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) {
    await db
      .update(lost_deals)
      .set({
        reason: parsed.data.reason,
        competitor: parsed.data.competitor ?? null,
        detail: parsed.data.detail ?? null,
        lost_at: new Date(),
      })
      .where(eq(lost_deals.id, existing.id));

    await logAudit({
      member_id: session.user.member_id,
      company_id: session.user.company_id,
      action: 'lost_deal.update',
      resource_type: 'lost_deal',
      resource_id: existing.id,
      metadata: { deal_id: parsed.data.deal_id, reason: parsed.data.reason },
    });
  } else {
    const [created] = await db
      .insert(lost_deals)
      .values({
        company_id: session.user.company_id,
        deal_id: parsed.data.deal_id,
        reason: parsed.data.reason,
        competitor: parsed.data.competitor ?? null,
        detail: parsed.data.detail ?? null,
        created_by: session.user.member_id,
      })
      .returning({ id: lost_deals.id });

    await logAudit({
      member_id: session.user.member_id,
      company_id: session.user.company_id,
      action: 'lost_deal.create',
      resource_type: 'lost_deal',
      resource_id: created!.id,
      metadata: { deal_id: parsed.data.deal_id, reason: parsed.data.reason },
    });
  }

  await db
    .update(deals)
    .set({ stage: 'lost', updated_at: new Date() })
    .where(
      and(
        eq(deals.id, parsed.data.deal_id),
        eq(deals.company_id, session.user.company_id)
      )
    );

  revalidatePath(`/deals/${parsed.data.deal_id}`);
  return { success: true };
}
