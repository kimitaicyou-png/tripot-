'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { deliverables } from '@/db/schema';

const createSchema = z.object({
  production_card_id: z.string().uuid(),
  name: z.string().min(1, '成果物名は必須').max(200),
  version: z.coerce.number().int().positive().default(1),
  file_url: z.string().url('正しいURL形式で入力').optional().or(z.literal('')).nullable(),
  note: z.string().max(2000).optional().nullable(),
});

export type DeliverableFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function createDeliverable(
  cardId: string,
  _prev: DeliverableFormState,
  formData: FormData
): Promise<DeliverableFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const fileUrlRaw = formData.get('file_url');
  const parsed = createSchema.safeParse({
    production_card_id: cardId,
    name: formData.get('name'),
    version: formData.get('version') ?? 1,
    file_url: fileUrlRaw ? String(fileUrlRaw) : null,
    note: formData.get('note') || null,
  });

  if (!parsed.success) return { errors: { _form: parsed.error.errors.map((e) => e.message) } };

  const [created] = await db
    .insert(deliverables)
    .values({
      company_id: session.user.company_id,
      production_card_id: parsed.data.production_card_id,
      name: parsed.data.name,
      version: parsed.data.version,
      file_url: parsed.data.file_url || null,
      note: parsed.data.note ?? null,
      delivered_at: new Date(),
    })
    .returning({ id: deliverables.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deliverable.create',
    resource_type: 'deliverable',
    resource_id: created!.id,
    metadata: { card_id: cardId, name: parsed.data.name, version: parsed.data.version },
  });

  revalidatePath(`/production/${cardId}`);
  return { success: true };
}

export async function listDeliverablesForCard(cardId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  await setTenantContext(session.user.company_id);

  return db
    .select({
      id: deliverables.id,
      name: deliverables.name,
      version: deliverables.version,
      file_url: deliverables.file_url,
      note: deliverables.note,
      delivered_at: deliverables.delivered_at,
      created_at: deliverables.created_at,
    })
    .from(deliverables)
    .where(
      and(
        eq(deliverables.production_card_id, cardId),
        eq(deliverables.company_id, session.user.company_id)
      )
    )
    .orderBy(desc(deliverables.created_at));
}
