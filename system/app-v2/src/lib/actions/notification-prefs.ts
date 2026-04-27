'use server';

import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { notification_prefs } from '@/db/schema';

export async function listMyPreferences(memberId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  await setTenantContext(session.user.company_id);
  return db
    .select()
    .from(notification_prefs)
    .where(
      and(
        eq(notification_prefs.company_id, session.user.company_id),
        eq(notification_prefs.member_id, memberId)
      )
    );
}

export async function upsertPreference(
  memberId: string,
  ruleKey: string,
  channels: string[],
  isMuted: boolean
): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  if (memberId !== session.user.member_id && session.user.role === 'member') {
    throw new Error('他人の通知設定は変更できません');
  }

  const existing = await db
    .select({ id: notification_prefs.id })
    .from(notification_prefs)
    .where(
      and(
        eq(notification_prefs.company_id, session.user.company_id),
        eq(notification_prefs.member_id, memberId),
        eq(notification_prefs.rule_key, ruleKey)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) {
    await db
      .update(notification_prefs)
      .set({
        channels,
        is_muted: isMuted ? 1 : 0,
        updated_at: new Date(),
      })
      .where(eq(notification_prefs.id, existing.id));
  } else {
    await db.insert(notification_prefs).values({
      company_id: session.user.company_id,
      member_id: memberId,
      rule_key: ruleKey,
      channels,
      is_muted: isMuted ? 1 : 0,
    });
  }

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'notification_prefs.update',
    resource_type: 'notification_pref',
    metadata: { rule_key: ruleKey, channels, is_muted: isMuted },
  });

  revalidatePath('/settings/notifications');
}
