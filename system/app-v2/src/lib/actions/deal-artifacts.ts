'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { deal_artifacts } from '@/db/schema';

const schema = z.object({
  title: z.string().min(1, 'タイトルは必須').max(200),
  artifact_type: z.string().max(40).optional().nullable(),
  file_url: z.string().url().or(z.literal('')).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

export type ArtifactFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function createDealArtifact(
  dealId: string,
  _prev: ArtifactFormState,
  formData: FormData
): Promise<ArtifactFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };

  const parsed = schema.safeParse({
    title: formData.get('title'),
    artifact_type: formData.get('artifact_type') || null,
    file_url: formData.get('file_url') || null,
    note: formData.get('note') || null,
  });

  if (!parsed.success) return { errors: { _form: parsed.error.errors.map((e) => e.message) } };

  const [created] = await db
    .insert(deal_artifacts)
    .values({
      company_id: session.user.company_id,
      deal_id: dealId,
      created_by: session.user.member_id,
      title: parsed.data.title,
      artifact_type: parsed.data.artifact_type ?? null,
      file_url: parsed.data.file_url || null,
      note: parsed.data.note ?? null,
    })
    .returning({ id: deal_artifacts.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal_artifact.create',
    resource_type: 'deal_artifact',
    resource_id: created!.id,
    metadata: { deal_id: dealId, title: parsed.data.title },
  });

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

export async function deleteDealArtifact(artifactId: string, dealId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');

  await db
    .update(deal_artifacts)
    .set({ deleted_at: new Date() })
    .where(and(eq(deal_artifacts.id, artifactId), eq(deal_artifacts.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal_artifact.delete',
    resource_type: 'deal_artifact',
    resource_id: artifactId,
  });

  revalidatePath(`/deals/${dealId}`);
}

export async function listDealArtifacts(dealId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return [];

  return db
    .select()
    .from(deal_artifacts)
    .where(
      and(
        eq(deal_artifacts.deal_id, dealId),
        eq(deal_artifacts.company_id, session.user.company_id),
        isNull(deal_artifacts.deleted_at)
      )
    )
    .orderBy(desc(deal_artifacts.created_at));
}
