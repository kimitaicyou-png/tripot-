'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { project_templates } from '@/db/schema';
import { TRIPOT_CONFIG } from '../../../coaris.config';

const templateSchema = z.object({
  name: z.string().min(1, 'テンプレ名は必須です').max(120),
  description: z.string().max(500).optional().nullable(),
});

export type ProjectTemplateFormState = {
  errors?: { name?: string[]; description?: string[]; _form?: string[] };
  success?: boolean;
  templateId?: string;
};

export async function listProjectTemplates() {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  return db
    .select()
    .from(project_templates)
    .where(
      and(
        eq(project_templates.company_id, session.user.company_id),
        isNull(project_templates.deleted_at)
      )
    )
    .orderBy(project_templates.name);
}

export async function createProjectTemplate(
  _prev: ProjectTemplateFormState,
  formData: FormData
): Promise<ProjectTemplateFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };

  const parsed = templateSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || null,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const [created] = await db
    .insert(project_templates)
    .values({
      company_id: session.user.company_id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .returning({ id: project_templates.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'project_template.create',
    resource_type: 'project_template',
    resource_id: created!.id,
    metadata: { name: parsed.data.name },
  });

  revalidatePath('/settings/templates');
  return { success: true, templateId: created!.id };
}

export async function updateProjectTemplate(
  templateId: string,
  _prev: ProjectTemplateFormState,
  formData: FormData
): Promise<ProjectTemplateFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };

  const parsed = templateSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || null,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await db
    .update(project_templates)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(project_templates.id, templateId),
        eq(project_templates.company_id, session.user.company_id)
      )
    );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'project_template.update',
    resource_type: 'project_template',
    resource_id: templateId,
  });

  revalidatePath('/settings/templates');
  return { success: true, templateId };
}

export async function deleteProjectTemplate(templateId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');

  await db
    .update(project_templates)
    .set({ deleted_at: new Date() })
    .where(
      and(
        eq(project_templates.id, templateId),
        eq(project_templates.company_id, session.user.company_id)
      )
    );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'project_template.delete',
    resource_type: 'project_template',
    resource_id: templateId,
  });

  revalidatePath('/settings/templates');
}

export async function seedDefaultTemplates(): Promise<{ inserted: number; skipped: number }> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');

  const seeds = TRIPOT_CONFIG.projectTemplates ?? [];
  if (seeds.length === 0) return { inserted: 0, skipped: 0 };

  const [existingRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(project_templates)
    .where(
      and(
        eq(project_templates.company_id, session.user.company_id),
        isNull(project_templates.deleted_at)
      )
    );

  if ((existingRow?.n ?? 0) > 0) {
    return { inserted: 0, skipped: seeds.length };
  }

  await db.insert(project_templates).values(
    seeds.map((s) => ({
      company_id: session.user.company_id,
      name: s.name,
      description: s.description,
    }))
  );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'project_template.seed',
    resource_type: 'company',
    resource_id: session.user.company_id,
    metadata: { count: seeds.length, source: 'coaris.config.projectTemplates' },
  });

  revalidatePath('/settings/templates');
  return { inserted: seeds.length, skipped: 0 };
}
