/**
 * 行動入力 (action) Server Actions
 *
 * 隊長思想「数字を追うな、行動を追え」「行動量がKPIの源泉」
 * これが個人レイヤーの心臓部、毎日叩く画面
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { actions } from '@/db/schema';

const actionSchema = z.object({
  type: z.enum(['call', 'meeting', 'proposal', 'email', 'visit', 'other']),
  note: z.string().max(2000).optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
});

export type ActionFormState = {
  errors?: { type?: string[]; _form?: string[] };
  success?: boolean;
};

export async function logActionEntry(_prev: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const parsed = actionSchema.safeParse({
    type: formData.get('type'),
    note: formData.get('note') || null,
    deal_id: formData.get('deal_id') || null,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const [created] = await db
    .insert(actions)
    .values({
      company_id: session.user.company_id,
      member_id: session.user.member_id,
      ...parsed.data,
    })
    .returning({ id: actions.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'action.log',
    resource_type: 'action',
    resource_id: created!.id,
    metadata: { type: parsed.data.type },
  });

  revalidatePath(`/home/${session.user.member_id}`);
  revalidatePath('/weekly');
  return { success: true };
}

const bulkActionSchema = z.object({
  entries: z
    .array(
      z.object({
        member_id: z.string().uuid(),
        type: z.enum(['call', 'meeting', 'proposal', 'email', 'visit', 'other']),
        count: z.number().int().min(0).max(999),
      })
    )
    .min(1)
    .max(500),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type BulkActionFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
  inserted?: number;
};

export async function bulkLogActions(
  payload: { entries: Array<{ member_id: string; type: string; count: number }>; occurred_on?: string }
): Promise<BulkActionFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const parsed = bulkActionSchema.safeParse(payload);
  if (!parsed.success) {
    return { errors: { _form: ['入力に誤りがあります'] } };
  }

  const occurredAt = parsed.data.occurred_on
    ? new Date(`${parsed.data.occurred_on}T12:00:00+09:00`)
    : new Date();

  const rows = parsed.data.entries
    .filter((e) => e.count > 0)
    .flatMap((e) =>
      Array.from({ length: e.count }, () => ({
        company_id: session.user.company_id,
        member_id: e.member_id,
        type: e.type as 'call' | 'meeting' | 'proposal' | 'email' | 'visit' | 'other',
        note: '週次入力',
        occurred_at: occurredAt,
      }))
    );

  if (rows.length === 0) return { success: true, inserted: 0 };

  await db.insert(actions).values(rows);

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'action.bulk_log',
    resource_type: 'action',
    metadata: { count: rows.length, occurred_on: parsed.data.occurred_on ?? null },
  });

  revalidatePath('/weekly');
  revalidatePath('/weekly/input');
  return { success: true, inserted: rows.length };
}
