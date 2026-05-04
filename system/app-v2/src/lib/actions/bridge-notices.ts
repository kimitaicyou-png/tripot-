'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { db, logAudit } from '@/lib/db';
import { bridge_notices, members } from '@/db/schema';
import { requirePermission } from '@/lib/rbac';

export async function listBridgeNotices() {
  const guard = await requirePermission({ resource: 'bridge_notice', action: 'read' });
  if (!guard.ok) return [];
  const { session } = guard;

  return db
    .select({
      id: bridge_notices.id,
      title: bridge_notices.title,
      body: bridge_notices.body,
      severity: bridge_notices.severity,
      sent_at: bridge_notices.sent_at,
      acknowledged_at: bridge_notices.acknowledged_at,
      acknowledged_by_name: members.name,
    })
    .from(bridge_notices)
    .leftJoin(members, eq(bridge_notices.acknowledged_by, members.id))
    .where(eq(bridge_notices.company_id, session.user.company_id))
    .orderBy(desc(bridge_notices.sent_at))
    .limit(50);
}

export async function unackBridgeNoticesCount(): Promise<number> {
  const guard = await requirePermission({ resource: 'bridge_notice', action: 'read' });
  if (!guard.ok) return 0;
  const { session } = guard;

  const [row] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(bridge_notices)
    .where(
      and(
        eq(bridge_notices.company_id, session.user.company_id),
        isNull(bridge_notices.acknowledged_at),
      ),
    );

  return row?.n ?? 0;
}

export async function acknowledgeBridgeNotice(noticeId: string): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission({ resource: 'bridge_notice', action: 'acknowledge' });
  if (!guard.ok) return { success: false, error: guard.error };
  const { session } = guard;

  const [updated] = await db
    .update(bridge_notices)
    .set({
      acknowledged_at: new Date(),
      acknowledged_by: session.user.member_id,
    })
    .where(
      and(
        eq(bridge_notices.id, noticeId),
        eq(bridge_notices.company_id, session.user.company_id),
        isNull(bridge_notices.acknowledged_at),
      ),
    )
    .returning({ id: bridge_notices.id });

  if (!updated) return { success: false, error: 'お知らせが見つからない、または既に確認済' };

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'bridge_notice.acknowledge',
    resource_type: 'bridge_notice',
    resource_id: noticeId,
  });

  revalidatePath('/notifications');
  return { success: true };
}
