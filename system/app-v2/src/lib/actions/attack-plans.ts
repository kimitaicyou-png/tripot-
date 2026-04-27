'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { attack_plans } from '@/db/schema';

const planSchema = z.object({
  deal_id: z.string().uuid(),
  key_person: z.string().max(120).optional().nullable(),
  competitor: z.string().max(200).optional().nullable(),
  budget_estimate: z.coerce.number().int().nonnegative().optional().nullable(),
  plan: z.string().max(2000).optional().nullable(),
  next_action: z.string().max(500).optional().nullable(),
});

export type AttackPlanFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
  planId?: string;
};

export async function getAttackPlanForDeal(dealId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return null;
  await setTenantContext(session.user.company_id);
  const rows = await db
    .select()
    .from(attack_plans)
    .where(
      and(
        eq(attack_plans.deal_id, dealId),
        eq(attack_plans.company_id, session.user.company_id)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertAttackPlan(
  _prev: AttackPlanFormState,
  formData: FormData
): Promise<AttackPlanFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const parsed = planSchema.safeParse({
    deal_id: formData.get('deal_id'),
    key_person: formData.get('key_person') || null,
    competitor: formData.get('competitor') || null,
    budget_estimate: formData.get('budget_estimate') || null,
    plan: formData.get('plan') || null,
    next_action: formData.get('next_action') || null,
  });

  if (!parsed.success) return { errors: { _form: ['入力エラー'] } };

  const existing = await db
    .select({ id: attack_plans.id })
    .from(attack_plans)
    .where(
      and(
        eq(attack_plans.deal_id, parsed.data.deal_id),
        eq(attack_plans.company_id, session.user.company_id)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  let planId: string;
  if (existing) {
    await db
      .update(attack_plans)
      .set({
        key_person: parsed.data.key_person ?? null,
        competitor: parsed.data.competitor ?? null,
        budget_estimate: parsed.data.budget_estimate ?? null,
        plan: parsed.data.plan ?? null,
        next_action: parsed.data.next_action ?? null,
        member_id: session.user.member_id,
        updated_at: new Date(),
      })
      .where(eq(attack_plans.id, existing.id));
    planId = existing.id;

    await logAudit({
      member_id: session.user.member_id,
      company_id: session.user.company_id,
      action: 'attack_plan.update',
      resource_type: 'attack_plan',
      resource_id: planId,
      metadata: { deal_id: parsed.data.deal_id },
    });
  } else {
    const [created] = await db
      .insert(attack_plans)
      .values({
        company_id: session.user.company_id,
        deal_id: parsed.data.deal_id,
        member_id: session.user.member_id,
        key_person: parsed.data.key_person ?? null,
        competitor: parsed.data.competitor ?? null,
        budget_estimate: parsed.data.budget_estimate ?? null,
        plan: parsed.data.plan ?? null,
        next_action: parsed.data.next_action ?? null,
      })
      .returning({ id: attack_plans.id });
    planId = created!.id;

    await logAudit({
      member_id: session.user.member_id,
      company_id: session.user.company_id,
      action: 'attack_plan.create',
      resource_type: 'attack_plan',
      resource_id: planId,
      metadata: { deal_id: parsed.data.deal_id },
    });
  }

  revalidatePath(`/deals/${parsed.data.deal_id}`);
  return { success: true, planId };
}
