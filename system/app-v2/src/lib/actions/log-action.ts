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
import { db, logAudit } from '@/lib/db';
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
