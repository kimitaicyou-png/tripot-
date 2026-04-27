'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { bugs, members } from '@/db/schema';

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
type BugStatus = (typeof STATUSES)[number];

const createSchema = z.object({
  production_card_id: z.string().uuid(),
  title: z.string().min(1, 'タイトルは必須').max(200),
  description: z.string().max(4000).optional().nullable(),
  severity: z.enum(SEVERITIES).default('medium'),
});

export type BugFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function createBug(
  cardId: string,
  _prev: BugFormState,
  formData: FormData
): Promise<BugFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const parsed = createSchema.safeParse({
    production_card_id: cardId,
    title: formData.get('title'),
    description: formData.get('description') || null,
    severity: formData.get('severity') ?? 'medium',
  });

  if (!parsed.success) return { errors: { _form: parsed.error.errors.map((e) => e.message) } };

  const [created] = await db
    .insert(bugs)
    .values({
      company_id: session.user.company_id,
      production_card_id: parsed.data.production_card_id,
      reporter_id: session.user.member_id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      severity: parsed.data.severity,
    })
    .returning({ id: bugs.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'bug.create',
    resource_type: 'bug',
    resource_id: created!.id,
    metadata: { card_id: cardId, severity: parsed.data.severity },
  });

  revalidatePath(`/production/${cardId}`);
  revalidatePath('/production');
  return { success: true };
}

export async function updateBugStatus(
  bugId: string,
  cardId: string,
  status: BugStatus
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.member_id) return { success: false, error: '認証が必要です' };
  await setTenantContext(session.user.company_id);

  if (!STATUSES.includes(status)) return { success: false, error: '不正なステータス' };

  const updateData: Record<string, unknown> = { status, updated_at: new Date() };
  if (status === 'resolved' || status === 'closed') {
    updateData.resolved_at = new Date();
  }

  await db
    .update(bugs)
    .set(updateData)
    .where(and(eq(bugs.id, bugId), eq(bugs.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'bug.update_status',
    resource_type: 'bug',
    resource_id: bugId,
    metadata: { new_status: status, card_id: cardId },
  });

  revalidatePath(`/production/${cardId}`);
  revalidatePath('/production');
  return { success: true };
}

export async function listBugsForCard(cardId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  await setTenantContext(session.user.company_id);

  return db
    .select({
      id: bugs.id,
      title: bugs.title,
      description: bugs.description,
      severity: bugs.severity,
      status: bugs.status,
      reporter_id: bugs.reporter_id,
      reporter_name: members.name,
      created_at: bugs.created_at,
      resolved_at: bugs.resolved_at,
    })
    .from(bugs)
    .leftJoin(members, eq(bugs.reporter_id, members.id))
    .where(
      and(
        eq(bugs.production_card_id, cardId),
        eq(bugs.company_id, session.user.company_id)
      )
    )
    .orderBy(desc(bugs.created_at));
}
