'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { budgets } from '@/db/schema';

const budgetSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  target_revenue: z.coerce.number().int().nonnegative().default(0),
  target_gross_profit: z.coerce.number().int().nonnegative().default(0),
  target_operating_profit: z.coerce.number().int().nonnegative().default(0),
});

export type BudgetFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function upsertBudget(_prev: BudgetFormState, formData: FormData): Promise<BudgetFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const parsed = budgetSchema.safeParse({
    year: formData.get('year'),
    month: formData.get('month'),
    target_revenue: formData.get('target_revenue') ?? 0,
    target_gross_profit: formData.get('target_gross_profit') ?? 0,
    target_operating_profit: formData.get('target_operating_profit') ?? 0,
  });

  if (!parsed.success) return { errors: { _form: ['入力値が不正です'] } };

  const existing = await db
    .select({
      id: budgets.id,
      target_revenue: budgets.target_revenue,
      target_gross_profit: budgets.target_gross_profit,
      target_operating_profit: budgets.target_operating_profit,
    })
    .from(budgets)
    .where(
      and(
        eq(budgets.company_id, session.user.company_id),
        eq(budgets.year, parsed.data.year),
        eq(budgets.month, parsed.data.month),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) {
    await db
      .update(budgets)
      .set({
        target_revenue: parsed.data.target_revenue,
        target_gross_profit: parsed.data.target_gross_profit,
        target_operating_profit: parsed.data.target_operating_profit,
        updated_at: new Date(),
      })
      .where(eq(budgets.id, existing.id));
  } else {
    await db.insert(budgets).values({
      company_id: session.user.company_id,
      ...parsed.data,
    });
  }

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: existing ? 'budget.update' : 'budget.create',
    resource_type: 'budget',
    resource_id: existing?.id ?? null,
    metadata: {
      year: parsed.data.year,
      month: parsed.data.month,
      before: existing
        ? {
            target_revenue: existing.target_revenue,
            target_gross_profit: existing.target_gross_profit,
            target_operating_profit: existing.target_operating_profit,
          }
        : null,
      after: {
        target_revenue: parsed.data.target_revenue,
        target_gross_profit: parsed.data.target_gross_profit,
        target_operating_profit: parsed.data.target_operating_profit,
      },
    },
  });

  revalidatePath('/budget');
  revalidatePath('/monthly');
  return { success: true };
}
