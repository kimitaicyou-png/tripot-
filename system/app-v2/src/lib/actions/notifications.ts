'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull, sql, desc, or } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { notifications } from '@/db/schema';

const createSchema = z.object({
  member_id: z.string().uuid().optional().nullable(),
  rule_key: z.string().min(1).max(80),
  channel: z.enum(['app', 'slack', 'line', 'email']).default('app'),
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional().nullable(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type NotificationFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function listNotificationsForMember(memberId: string, limit = 30) {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.company_id, session.user.company_id),
        or(eq(notifications.member_id, memberId), isNull(notifications.member_id))
      )
    )
    .orderBy(desc(notifications.created_at))
    .limit(limit);
}

export async function unreadCountForMember(memberId: string): Promise<number> {
  const session = await auth();
  if (!session?.user?.member_id) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.company_id, session.user.company_id),
        or(eq(notifications.member_id, memberId), isNull(notifications.member_id)),
        isNull(notifications.read_at)
      )
    );
  return row?.n ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');

  await db
    .update(notifications)
    .set({ read_at: new Date(), status: 'read' })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.company_id, session.user.company_id)
      )
    );

  revalidatePath('/notifications');
}

export async function markAllAsRead(): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');

  await db
    .update(notifications)
    .set({ read_at: new Date(), status: 'read' })
    .where(
      and(
        eq(notifications.company_id, session.user.company_id),
        or(
          eq(notifications.member_id, session.user.member_id),
          isNull(notifications.member_id)
        ),
        isNull(notifications.read_at)
      )
    );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'notification.mark_all_read',
    resource_type: 'notification',
  });

  revalidatePath('/notifications');
}

export async function createNotification(
  _prev: NotificationFormState,
  formData: FormData
): Promise<NotificationFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };

  const parsed = createSchema.safeParse({
    member_id: formData.get('member_id') || null,
    rule_key: formData.get('rule_key'),
    channel: formData.get('channel') ?? 'app',
    title: formData.get('title'),
    body: formData.get('body') || null,
  });

  if (!parsed.success) return { errors: { _form: ['入力エラー'] } };

  await db.insert(notifications).values({
    company_id: session.user.company_id,
    member_id: parsed.data.member_id ?? null,
    rule_key: parsed.data.rule_key,
    channel: parsed.data.channel,
    title: parsed.data.title,
    body: parsed.data.body ?? null,
    status: 'queued',
  });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'notification.create',
    resource_type: 'notification',
    metadata: { rule_key: parsed.data.rule_key, channel: parsed.data.channel },
  });

  revalidatePath('/notifications');
  return { success: true };
}
