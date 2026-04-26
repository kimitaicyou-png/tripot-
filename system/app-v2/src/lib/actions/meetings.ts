'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { meetings } from '@/db/schema';

const meetingSchema = z.object({
  deal_id: z.string().uuid().optional().nullable(),
  customer_id: z.string().uuid().optional().nullable(),
  type: z.enum(['call', 'meeting', 'gmeet', 'visit', 'email', 'other']),
  title: z.string().max(200).optional().nullable(),
  raw_text: z.string().max(50000).optional().nullable(),
  summary: z.string().max(20000).optional().nullable(),
  occurred_at: z.string().optional(),
  duration_sec: z.coerce.number().int().nonnegative().optional().nullable(),
});

export type MeetingFormState = {
  errors?: {
    type?: string[];
    title?: string[];
    raw_text?: string[];
    _form?: string[];
  };
  success?: boolean;
  meetingId?: string;
};

export async function createMeeting(
  _prev: MeetingFormState,
  formData: FormData
): Promise<MeetingFormState> {
  const session = await auth();
  if (!session?.user?.member_id) {
    return { errors: { _form: ['認証が必要です'] } };
  }

  const parsed = meetingSchema.safeParse({
    deal_id: formData.get('deal_id') || null,
    customer_id: formData.get('customer_id') || null,
    type: formData.get('type') ?? 'meeting',
    title: formData.get('title') || null,
    raw_text: formData.get('raw_text') || null,
    summary: formData.get('summary') || null,
    occurred_at: formData.get('occurred_at') || undefined,
    duration_sec: formData.get('duration_sec') || null,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const occurredAt = parsed.data.occurred_at ? new Date(parsed.data.occurred_at) : new Date();

  const [created] = await db
    .insert(meetings)
    .values({
      company_id: session.user.company_id,
      member_id: session.user.member_id,
      deal_id: parsed.data.deal_id ?? null,
      customer_id: parsed.data.customer_id ?? null,
      type: parsed.data.type,
      title: parsed.data.title ?? null,
      raw_text: parsed.data.raw_text ?? null,
      summary: parsed.data.summary ?? null,
      duration_sec: parsed.data.duration_sec ?? null,
      occurred_at: occurredAt,
    })
    .returning({ id: meetings.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'meeting.create',
    resource_type: 'meeting',
    resource_id: created!.id,
    metadata: { type: parsed.data.type, deal_id: parsed.data.deal_id },
  });

  if (parsed.data.deal_id) revalidatePath(`/deals/${parsed.data.deal_id}`);
  return { success: true, meetingId: created!.id };
}

export async function updateMeeting(
  meetingId: string,
  _prev: MeetingFormState,
  formData: FormData
): Promise<MeetingFormState> {
  const session = await auth();
  if (!session?.user?.member_id) {
    return { errors: { _form: ['認証が必要です'] } };
  }

  const parsed = meetingSchema.partial().safeParse({
    type: formData.get('type') ?? undefined,
    title: formData.get('title') || null,
    raw_text: formData.get('raw_text') || null,
    summary: formData.get('summary') || null,
    duration_sec: formData.get('duration_sec') || null,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date(),
  };
  if (updateData.duration_sec === null) delete updateData.duration_sec;

  await db
    .update(meetings)
    .set(updateData)
    .where(and(eq(meetings.id, meetingId), eq(meetings.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'meeting.update',
    resource_type: 'meeting',
    resource_id: meetingId,
  });

  return { success: true, meetingId };
}

export async function deleteMeeting(meetingId: string, dealId?: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');

  await db
    .update(meetings)
    .set({ deleted_at: new Date() })
    .where(and(eq(meetings.id, meetingId), eq(meetings.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'meeting.delete',
    resource_type: 'meeting',
    resource_id: meetingId,
  });

  if (dealId) revalidatePath(`/deals/${dealId}`);
}

export async function listMeetingsForDeal(dealId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  return db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.deal_id, dealId),
        eq(meetings.company_id, session.user.company_id),
        isNull(meetings.deleted_at)
      )
    )
    .orderBy(meetings.occurred_at);
}
