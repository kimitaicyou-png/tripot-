'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { db, logAudit } from '@/lib/db';
import { meetings } from '@/db/schema';
import { requirePermission } from '@/lib/rbac';
import { maybeAdvanceDealStage } from '@/lib/deals/stage-advance';

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
  const guard = await requirePermission({ resource: 'meeting', action: 'create' });
  if (!guard.ok) return { errors: { _form: [guard.error] } };
  const { session } = guard;

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

  try {
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
  } catch (error) {
    // 保存失敗時も必ず state を返す（throw すると useActionState の pending が
    // false に戻らず、ボタンが「保存中…」のまま固まるため）
    const message = error instanceof Error ? error.message : '保存に失敗しました';
    return { errors: { _form: [message] } };
  }
}

export async function updateMeeting(
  meetingId: string,
  _prev: MeetingFormState,
  formData: FormData
): Promise<MeetingFormState> {
  const guard = await requirePermission({ resource: 'meeting', action: 'update' });
  if (!guard.ok) return { errors: { _form: [guard.error] } };
  const { session } = guard;

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
  const guard = await requirePermission({ resource: 'meeting', action: 'delete' });
  if (!guard.ok) throw new Error(guard.error);
  const { session } = guard;

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

/**
 * 議事録を「検収議事録」としてマークし、案件ステージを acceptance へ自動進行。
 *
 * 隊長思想 (2026-05-20)「行動 → 自動でステージ」の delivered → acceptance 段の実装。
 * meetings.type enum を拡張せず、metadata.is_acceptance フラグで対応（migration 不要）。
 *
 * deal.stage が delivered の時のみ acceptance に進む（後退しないルール）。
 */
export async function markMeetingAsAcceptance(
  meetingId: string,
  dealId: string
): Promise<{ ok: boolean; error?: string }> {
  const guard = await requirePermission({ resource: 'meeting', action: 'update' });
  if (!guard.ok) return { ok: false, error: guard.error };
  const { session } = guard;

  // 議事録 metadata に is_acceptance: true をマージ
  // jsonb_build_object('is_acceptance', true) を既存 metadata に jsonb || で結合
  await db
    .update(meetings)
    .set({
      metadata: sql`COALESCE(${meetings.metadata}, '{}'::jsonb) || jsonb_build_object('is_acceptance', true, 'marked_acceptance_at', to_jsonb(NOW()::text))`,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(meetings.id, meetingId),
        eq(meetings.company_id, session.user.company_id),
        isNull(meetings.deleted_at)
      )
    );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'meeting.marked_acceptance',
    resource_type: 'meeting',
    resource_id: meetingId,
    metadata: { deal_id: dealId },
  });

  // deal.stage = 'delivered' のときのみ acceptance に進む（後退しないルール）
  await maybeAdvanceDealStage({
    dealId,
    companyId: session.user.company_id,
    memberId: session.user.member_id,
    targetStage: 'acceptance',
    triggeredBy: 'meeting.marked_acceptance',
  });

  revalidatePath(`/deals/${dealId}`);
  return { ok: true };
}

export async function listMeetingsForDeal(dealId: string) {
  const guard = await requirePermission({ resource: 'meeting', action: 'read' });
  if (!guard.ok) return [];
  const { session } = guard;
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
