'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, gte, lte } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { leaves, members } from '@/db/schema';

const leaveSchema = z.object({
  member_id: z.string().uuid(),
  leave_type: z.string().min(1).max(40),
  start_date: z.string().min(1, '開始日は必須'),
  end_date: z.string().min(1, '終了日は必須'),
  note: z.string().max(500).optional().nullable(),
});

export type LeaveFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function listLeaves(rangeStart: string, rangeEnd: string) {
  const session = await auth();
  if (!session?.user?.member_id) return [];

  return db
    .select({
      id: leaves.id,
      member_id: leaves.member_id,
      member_name: members.name,
      leave_type: leaves.leave_type,
      start_date: leaves.start_date,
      end_date: leaves.end_date,
      note: leaves.note,
    })
    .from(leaves)
    .leftJoin(members, eq(leaves.member_id, members.id))
    .where(
      and(
        eq(leaves.company_id, session.user.company_id),
        gte(leaves.end_date, rangeStart),
        lte(leaves.start_date, rangeEnd)
      )
    )
    .orderBy(leaves.start_date);
}

export async function createLeave(
  _prev: LeaveFormState,
  formData: FormData
): Promise<LeaveFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };

  const parsed = leaveSchema.safeParse({
    member_id: formData.get('member_id'),
    leave_type: formData.get('leave_type'),
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date'),
    note: formData.get('note') || null,
  });

  if (!parsed.success) return { errors: { _form: ['入力エラー'] } };

  const [created] = await db
    .insert(leaves)
    .values({
      company_id: session.user.company_id,
      member_id: parsed.data.member_id,
      leave_type: parsed.data.leave_type,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      note: parsed.data.note ?? null,
    })
    .returning({ id: leaves.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'leave.create',
    resource_type: 'leave',
    resource_id: created!.id,
    metadata: { member_id: parsed.data.member_id, range: `${parsed.data.start_date}〜${parsed.data.end_date}` },
  });

  revalidatePath('/team');
  return { success: true };
}

export async function deleteLeave(leaveId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');

  await db
    .delete(leaves)
    .where(
      and(eq(leaves.id, leaveId), eq(leaves.company_id, session.user.company_id))
    );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'leave.delete',
    resource_type: 'leave',
    resource_id: leaveId,
  });

  revalidatePath('/team');
}
