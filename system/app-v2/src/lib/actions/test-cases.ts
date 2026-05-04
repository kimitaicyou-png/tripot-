'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db, logAudit } from '@/lib/db';
import { test_cases, change_logs } from '@/db/schema';
import { requirePermission } from '@/lib/rbac';

const createSchema = z.object({
  production_card_id: z.string().uuid(),
  title: z.string().min(1, 'タイトルは必須').max(200),
  expected: z.string().max(2000).optional().nullable(),
});

export type TestCaseFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function createTestCase(
  cardId: string,
  _prev: TestCaseFormState,
  formData: FormData
): Promise<TestCaseFormState> {
  const guard = await requirePermission({ resource: 'production_card', action: 'update' });
  if (!guard.ok) return { errors: { _form: [guard.error] } };
  const { session } = guard;

  const parsed = createSchema.safeParse({
    production_card_id: cardId,
    title: formData.get('title'),
    expected: formData.get('expected') || null,
  });

  if (!parsed.success) return { errors: { _form: parsed.error.errors.map((e) => e.message) } };

  const [created] = await db
    .insert(test_cases)
    .values({
      company_id: session.user.company_id,
      production_card_id: parsed.data.production_card_id,
      title: parsed.data.title,
      expected: parsed.data.expected ?? null,
    })
    .returning({ id: test_cases.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'test_case.create',
    resource_type: 'test_case',
    resource_id: created!.id,
    metadata: { card_id: cardId },
  });

  revalidatePath(`/production/${cardId}`);
  return { success: true };
}

export async function recordTestRun(
  testCaseId: string,
  cardId: string,
  passed: boolean,
  result?: string
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission({ resource: 'production_card', action: 'update' });
  if (!guard.ok) return { success: false, error: guard.error };
  const { session } = guard;

  await db
    .update(test_cases)
    .set({
      passed: passed ? 1 : 0,
      result: result ?? null,
      last_run_at: new Date(),
    })
    .where(and(eq(test_cases.id, testCaseId), eq(test_cases.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'test_case.record_run',
    resource_type: 'test_case',
    resource_id: testCaseId,
    metadata: { passed, card_id: cardId },
  });

  revalidatePath(`/production/${cardId}`);
  return { success: true };
}

export async function listTestCasesForCard(cardId: string) {
  const guard = await requirePermission({ resource: 'production_card', action: 'read' });
  if (!guard.ok) return [];
  const { session } = guard;

  return db
    .select()
    .from(test_cases)
    .where(
      and(
        eq(test_cases.production_card_id, cardId),
        eq(test_cases.company_id, session.user.company_id)
      )
    )
    .orderBy(desc(test_cases.created_at));
}

export async function listChangeLogsForCard(cardId: string) {
  const guard = await requirePermission({ resource: 'production_card', action: 'read' });
  if (!guard.ok) return [];
  const { session } = guard;

  return db
    .select()
    .from(change_logs)
    .where(
      and(
        eq(change_logs.production_card_id, cardId),
        eq(change_logs.company_id, session.user.company_id)
      )
    )
    .orderBy(desc(change_logs.occurred_at))
    .limit(50);
}
