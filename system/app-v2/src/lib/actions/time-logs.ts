'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db, logAudit } from '@/lib/db';
import { time_logs, members } from '@/db/schema';
import { requirePermission } from '@/lib/rbac';

const createSchema = z.object({
  production_card_id: z.string().uuid(),
  minutes: z.coerce.number().int().min(1, '最低1分').max(1440, '1日の上限24時間'),
  occurred_on: z.string().min(1, '日付必須'),
  note: z.string().max(500).optional().nullable(),
});

export type TimeLogFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function createTimeLog(
  cardId: string,
  _prev: TimeLogFormState,
  formData: FormData,
): Promise<TimeLogFormState> {
  const guard = await requirePermission({ resource: 'production_card', action: 'update' });
  if (!guard.ok) return { errors: { _form: [guard.error] } };
  const { session } = guard;

  const parsed = createSchema.safeParse({
    production_card_id: cardId,
    minutes: formData.get('minutes'),
    occurred_on: formData.get('occurred_on'),
    note: formData.get('note') || null,
  });

  if (!parsed.success) {
    return { errors: { _form: parsed.error.errors.map((e) => e.message) } };
  }

  const [created] = await db
    .insert(time_logs)
    .values({
      company_id: session.user.company_id,
      member_id: session.user.member_id,
      production_card_id: cardId,
      minutes: parsed.data.minutes,
      occurred_on: parsed.data.occurred_on,
      note: parsed.data.note || null,
    })
    .returning({ id: time_logs.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'time_log.create',
    resource_type: 'time_log',
    resource_id: created!.id,
    metadata: {
      production_card_id: cardId,
      minutes: parsed.data.minutes,
      occurred_on: parsed.data.occurred_on,
    },
  });

  revalidatePath(`/production/${cardId}`);
  return { success: true };
}

export async function deleteTimeLog(timeLogId: string, cardId: string): Promise<void> {
  const guard = await requirePermission({ resource: 'production_card', action: 'update' });
  if (!guard.ok) throw new Error(guard.error);
  const { session } = guard;

  const [deleted] = await db
    .delete(time_logs)
    .where(
      and(
        eq(time_logs.id, timeLogId),
        eq(time_logs.company_id, session.user.company_id),
      ),
    )
    .returning({ id: time_logs.id });

  if (!deleted) throw new Error('time_log が見つかりません');

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'time_log.delete',
    resource_type: 'time_log',
    resource_id: timeLogId,
  });

  revalidatePath(`/production/${cardId}`);
}

export async function listTimeLogsForCard(cardId: string) {
  const guard = await requirePermission({ resource: 'production_card', action: 'read' });
  if (!guard.ok) return [];
  const { session } = guard;

  return db
    .select({
      id: time_logs.id,
      minutes: time_logs.minutes,
      occurred_on: time_logs.occurred_on,
      note: time_logs.note,
      member_name: members.name,
      member_id: time_logs.member_id,
    })
    .from(time_logs)
    .leftJoin(members, eq(time_logs.member_id, members.id))
    .where(
      and(
        eq(time_logs.production_card_id, cardId),
        eq(time_logs.company_id, session.user.company_id),
      ),
    )
    .orderBy(desc(time_logs.occurred_on), desc(time_logs.created_at));
}

export async function timeLogTotalsForCard(cardId: string): Promise<{ totalMinutes: number; logCount: number }> {
  const guard = await requirePermission({ resource: 'production_card', action: 'read' });
  if (!guard.ok) return { totalMinutes: 0, logCount: 0 };
  const { session } = guard;

  const [row] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${time_logs.minutes}), 0)::int`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(time_logs)
    .where(
      and(
        eq(time_logs.production_card_id, cardId),
        eq(time_logs.company_id, session.user.company_id),
      ),
    );

  return { totalMinutes: row?.total ?? 0, logCount: row?.count ?? 0 };
}
