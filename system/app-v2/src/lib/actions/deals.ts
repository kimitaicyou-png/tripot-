/**
 * 案件 (deal) Server Actions
 *
 * Next.js 16 + React 19 useActionState 対応
 * Zod バリデーション必須（Server Action のセキュリティ要件）
 */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, logAudit } from '@/lib/db';
import { deals, customers, members } from '@/db/schema';
import { isNull, ilike, sql } from 'drizzle-orm';
import { requirePermission } from '@/lib/rbac';

const dealSchema = z.object({
  title: z.string().min(1, '案件名は必須です').max(200),
  customer_id: z.string().uuid().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  stage: z.enum(['prospect', 'proposing', 'ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'paid', 'lost']),
  amount: z.coerce.number().int().nonnegative().default(0),
  monthly_amount: z.coerce.number().int().nonnegative().default(0),
  revenue_type: z.enum(['spot', 'running', 'both']).default('spot'),
  expected_close_date: z.string().optional().nullable(),
});

export type DealFormState = {
  errors?: {
    title?: string[];
    customer_id?: string[];
    assignee_id?: string[];
    stage?: string[];
    amount?: string[];
    _form?: string[];
  };
  success?: boolean;
  redirectTo?: string;
};

export async function createDeal(_prev: DealFormState, formData: FormData): Promise<DealFormState> {
  const guard = await requirePermission({ resource: 'deal', action: 'create' });
  if (!guard.ok) {
    return { errors: { _form: [guard.error] } };
  }
  const { session } = guard;

  const parsed = dealSchema.safeParse({
    title: formData.get('title'),
    customer_id: formData.get('customer_id') || null,
    assignee_id: formData.get('assignee_id') || session.user.member_id,
    stage: formData.get('stage') ?? 'prospect',
    amount: formData.get('amount') ?? 0,
    monthly_amount: formData.get('monthly_amount') ?? 0,
    revenue_type: formData.get('revenue_type') ?? 'spot',
    expected_close_date: formData.get('expected_close_date') || null,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const [created] = await db
    .insert(deals)
    .values({
      company_id: session.user.company_id,
      ...parsed.data,
      customer_id: parsed.data.customer_id ?? null,
      assignee_id: parsed.data.assignee_id ?? session.user.member_id,
    })
    .returning({ id: deals.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.create',
    resource_type: 'deal',
    resource_id: created!.id,
    metadata: { title: parsed.data.title, stage: parsed.data.stage },
  });

  revalidatePath('/deals');
  redirect(`/deals/${created!.id}`);
}

export async function updateDeal(dealId: string, _prev: DealFormState, formData: FormData): Promise<DealFormState> {
  const guard = await requirePermission({ resource: 'deal', action: 'update' });
  if (!guard.ok) {
    return { errors: { _form: [guard.error] } };
  }
  const { session } = guard;

  const parsed = dealSchema.partial().safeParse({
    title: formData.get('title') ?? undefined,
    stage: formData.get('stage') ?? undefined,
    amount: formData.get('amount') ?? undefined,
    monthly_amount: formData.get('monthly_amount') ?? undefined,
    revenue_type: formData.get('revenue_type') ?? undefined,
    expected_close_date: formData.get('expected_close_date') || null,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db
    .update(deals)
    .set({ ...parsed.data, updated_at: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.update',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: parsed.data as Record<string, unknown>,
  });

  revalidatePath('/deals');
  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

export async function deleteDeal(dealId: string): Promise<void> {
  const guard = await requirePermission({ resource: 'deal', action: 'delete' });
  if (!guard.ok) {
    throw new Error(guard.error);
  }
  const { session } = guard;

  await db
    .update(deals)
    .set({ deleted_at: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.delete',
    resource_type: 'deal',
    resource_id: dealId,
  });

  revalidatePath('/deals');
  redirect('/deals');
}

export type InternalNoteState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export type TargetMetaState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function updateDealTargetMeta(
  dealId: string,
  _prev: TargetMetaState,
  formData: FormData
): Promise<TargetMetaState> {
  const guard = await requirePermission({ resource: 'deal', action: 'update' });
  if (!guard.ok) return { errors: { _form: [guard.error] } };
  const { session } = guard;

  const targetRevenueRaw = String(formData.get('target_revenue') ?? '').trim();
  const targetGpRaw = String(formData.get('target_gp') ?? '').trim();
  const targetCloseRaw = String(formData.get('target_close_date') ?? '').trim();
  const winReason = String(formData.get('win_reason') ?? '').trim().slice(0, 500);

  const targetRevenue = /^\d+$/.test(targetRevenueRaw) ? Math.min(99_999_999_999, Number(targetRevenueRaw)) : 0;
  const targetGp = /^\d+$/.test(targetGpRaw) ? Math.min(99_999_999_999, Number(targetGpRaw)) : 0;
  const targetCloseDate = /^\d{4}-\d{2}-\d{2}$/.test(targetCloseRaw) ? targetCloseRaw : null;

  const existing = await db.query.deals.findFirst({
    where: (d, { and: aand, eq: eeq }) => aand(eeq(d.id, dealId), eeq(d.company_id, session.user.company_id)),
    columns: { metadata: true },
  });

  if (!existing) return { errors: { _form: ['案件が見つかりません'] } };

  const meta = (existing.metadata as Record<string, unknown> | null) ?? {};
  const nextMeta = {
    ...meta,
    target_revenue: targetRevenue,
    target_gp: targetGp,
    target_close_date: targetCloseDate,
    win_reason: winReason,
    target_meta_updated_at: new Date().toISOString(),
  };

  await db
    .update(deals)
    .set({ metadata: nextMeta })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.update_target_meta',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: { target_revenue: targetRevenue, target_gp: targetGp, target_close_date: targetCloseDate },
  });

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

export type RunningMetaState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function updateDealRunningMeta(
  dealId: string,
  _prev: RunningMetaState,
  formData: FormData
): Promise<RunningMetaState> {
  const guard = await requirePermission({ resource: 'deal', action: 'update' });
  if (!guard.ok) return { errors: { _form: [guard.error] } };
  const { session } = guard;

  const nextRenewalDateRaw = String(formData.get('next_renewal_date') ?? '').trim();
  const autoRenew = formData.get('auto_renew') === 'on';
  const renewalCountRaw = String(formData.get('renewal_count') ?? '').trim();
  const renewalNote = String(formData.get('renewal_note') ?? '').trim().slice(0, 500);

  const nextRenewalDate = /^\d{4}-\d{2}-\d{2}$/.test(nextRenewalDateRaw) ? nextRenewalDateRaw : null;
  const renewalCount = /^\d+$/.test(renewalCountRaw) ? Math.min(999, Number(renewalCountRaw)) : 0;

  const existing = await db.query.deals.findFirst({
    where: (d, { and: aand, eq: eeq }) => aand(eeq(d.id, dealId), eeq(d.company_id, session.user.company_id)),
    columns: { metadata: true },
  });

  if (!existing) return { errors: { _form: ['案件が見つかりません'] } };

  const meta = (existing.metadata as Record<string, unknown> | null) ?? {};
  const nextMeta = {
    ...meta,
    next_renewal_date: nextRenewalDate,
    auto_renew: autoRenew,
    renewal_count: renewalCount,
    renewal_note: renewalNote,
    running_meta_updated_at: new Date().toISOString(),
  };

  await db
    .update(deals)
    .set({ metadata: nextMeta })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.update_running_meta',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: { next_renewal_date: nextRenewalDate, auto_renew: autoRenew, renewal_count: renewalCount },
  });

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

export async function updateDealInternalNote(
  dealId: string,
  _prev: InternalNoteState,
  formData: FormData
): Promise<InternalNoteState> {
  const guard = await requirePermission({ resource: 'deal', action: 'update' });
  if (!guard.ok) return { errors: { _form: [guard.error] } };
  const { session } = guard;

  const note = String(formData.get('internal_note') ?? '').slice(0, 4000);

  const existing = await db.query.deals.findFirst({
    where: (d, { and: aand, eq: eeq }) => aand(eeq(d.id, dealId), eeq(d.company_id, session.user.company_id)),
    columns: { metadata: true },
  });

  if (!existing) return { errors: { _form: ['案件が見つかりません'] } };

  const meta = (existing.metadata as Record<string, unknown> | null) ?? {};
  const nextMeta = { ...meta, internal_note: note, internal_note_updated_at: new Date().toISOString(), internal_note_by: session.user.member_id };

  await db
    .update(deals)
    .set({ metadata: nextMeta })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.update_internal_note',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: { length: note.length },
  });

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

const VALID_STAGES = [
  'prospect',
  'proposing',
  'ordered',
  'in_production',
  'delivered',
  'acceptance',
  'invoiced',
  'paid',
  'lost',
] as const;

const bulkDealRowSchema = z.object({
  title: z.string().min(1, '案件名は必須').max(200),
  customer_name: z.string().max(200).optional().nullable(),
  assignee_email: z.string().max(200).optional().nullable(),
  stage: z.enum(VALID_STAGES).default('prospect'),
  amount: z.coerce.number().int().nonnegative().default(0),
  expected_close_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式')
    .optional()
    .or(z.literal(''))
    .nullable(),
});

export type BulkDealRow = z.infer<typeof bulkDealRowSchema>;

export type BulkCreateDealsResult = {
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

export async function bulkCreateDeals(
  rows: BulkDealRow[]
): Promise<BulkCreateDealsResult> {
  const guard = await requirePermission({ resource: 'deal', action: 'create' });
  if (!guard.ok) {
    return { inserted: 0, skipped: 0, errors: [{ row: 0, message: guard.error }] };
  }
  const { session } = guard;

  const allCustomers = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(
      and(
        eq(customers.company_id, session.user.company_id),
        isNull(customers.deleted_at)
      )
    );

  const customerByName = new Map(
    allCustomers.map((c) => [c.name.trim().toLowerCase(), c.id])
  );

  const allMembers = await db
    .select({ id: members.id, email: members.email })
    .from(members)
    .where(
      and(
        eq(members.company_id, session.user.company_id),
        isNull(members.deleted_at)
      )
    );

  const memberByEmail = new Map(
    allMembers.map((m) => [m.email.trim().toLowerCase(), m.id])
  );

  const errors: BulkCreateDealsResult['errors'] = [];
  const valid: Array<{
    company_id: string;
    title: string;
    customer_id: string | null;
    assignee_id: string | null;
    stage: (typeof VALID_STAGES)[number];
    amount: number;
    expected_close_date: string | null;
  }> = [];

  rows.forEach((row, idx) => {
    const parsed = bulkDealRowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push({
        row: idx + 1,
        message: parsed.error.errors
          .map((e) => `${e.path.join('.') || 'value'}: ${e.message}`)
          .join('; '),
      });
      return;
    }

    let customerId: string | null = null;
    if (parsed.data.customer_name) {
      const lookup = customerByName.get(parsed.data.customer_name.trim().toLowerCase());
      if (!lookup) {
        errors.push({
          row: idx + 1,
          message: `customer_name "${parsed.data.customer_name}" が顧客マスタに見つかりません（先に顧客を import してください）`,
        });
        return;
      }
      customerId = lookup;
    }

    let assigneeId: string | null = null;
    if (parsed.data.assignee_email) {
      const lookup = memberByEmail.get(parsed.data.assignee_email.trim().toLowerCase());
      if (!lookup) {
        errors.push({
          row: idx + 1,
          message: `assignee_email "${parsed.data.assignee_email}" がメンバーに見つかりません`,
        });
        return;
      }
      assigneeId = lookup;
    }

    valid.push({
      company_id: session.user.company_id,
      title: parsed.data.title.trim(),
      customer_id: customerId,
      assignee_id: assigneeId,
      stage: parsed.data.stage,
      amount: parsed.data.amount,
      expected_close_date: parsed.data.expected_close_date || null,
    });
  });

  if (valid.length === 0) {
    return { inserted: 0, skipped: rows.length, errors };
  }

  const inserted = await db.insert(deals).values(valid).returning({ id: deals.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deals.bulk_create',
    resource_type: 'deal',
    resource_id: 'bulk',
    metadata: {
      inserted: inserted.length,
      errors_count: errors.length,
      sample_titles: valid.slice(0, 5).map((v) => v.title),
    },
  });

  revalidatePath('/deals');
  return {
    inserted: inserted.length,
    skipped: rows.length - inserted.length,
    errors,
  };
}

/* ============================================================
 * ADR-0010 P1-1 粗利表示 — external_cost 更新 server action
 * ============================================================
 * gross_profit / gross_profit_rate は Generated Column のため
 * external_cost のみ更新すれば DB 側で自動再計算される。
 */

export type ExternalCostState = {
  errors?: { _form?: string[]; external_cost?: string[] };
  success?: boolean;
};

export async function updateDealExternalCost(
  dealId: string,
  _prev: ExternalCostState,
  formData: FormData
): Promise<ExternalCostState> {
  const guard = await requirePermission({ resource: 'deal', action: 'update' });
  if (!guard.ok) {
    return { errors: { _form: [guard.error] } };
  }
  const { session } = guard;

  const externalCostRaw = String(formData.get('external_cost') ?? '').trim();
  if (!/^\d+$/.test(externalCostRaw)) {
    return { errors: { external_cost: ['外注費は0以上の整数で入力してください'] } };
  }
  const externalCost = Math.min(99_999_999_999, Number(externalCostRaw));

  await db
    .update(deals)
    .set({ external_cost: externalCost })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.update_external_cost',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: { external_cost: externalCost },
  });

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}


const stageEnum = z.enum([
  "prospect",
  "proposing",
  "ordered",
  "in_production",
  "delivered",
  "acceptance",
  "invoiced",
  "paid",
  "lost",
]);

export type UpdateStageResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * 案件ステージを手動で更新する Server Action。
 *
 * InlineStageChanger（バッジクリック → dropdown）の保存先。
 * 隊長指摘 (2026-05-20)「動線の中にステージがどうしたら変わるのか」への直接の応答：
 * 案件詳細から 1 クリックでステージを動かせる動線を確保する。
 *
 * Phase 2 で実装する自動連動（書類 status → deal.stage）と並行運用：
 * 自動連動の対象外ケース（手動オーバーライド・例外運用）はここを経由する。
 */
export async function updateDealStage(
  dealId: string,
  stage: string
): Promise<UpdateStageResult> {
  const guard = await requirePermission({ resource: "deal", action: "update" });
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const { session } = guard;

  const parsed = stageEnum.safeParse(stage);
  if (!parsed.success) {
    return { ok: false, error: "invalid_stage" };
  }

  const current = await db
    .select({
      stage: deals.stage,
      subjective_confidence: deals.subjective_confidence,
    })
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!current) {
    return { ok: false, error: "deal_not_found" };
  }

  // 受注以降の stage に移行する場合、主観確度を自動リセット（秋美レビュー C-4 改良 3、2026-05-26）
  // 受注済 + confidence=D の論理矛盾を構造で防ぐ。stage CF 加重が真実、主観は不要。
  const POST_ORDER_STAGES = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'paid'];
  const shouldResetConfidence =
    POST_ORDER_STAGES.includes(parsed.data) && current.subjective_confidence !== null;

  await db
    .update(deals)
    .set({
      stage: parsed.data,
      ...(shouldResetConfidence
        ? {
            subjective_confidence: null,
            confidence_updated_at: new Date(),
            confidence_updated_by: session.user.member_id,
          }
        : {}),
      updated_at: new Date(),
    })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: "deal.stage_manual_change",
    resource_type: "deal",
    resource_id: dealId,
    metadata: {
      from: current.stage,
      to: parsed.data,
      source: "inline_stage_changer",
      ...(shouldResetConfidence
        ? { confidence_auto_reset: { from: current.subjective_confidence, to: null } }
        : {}),
    },
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  return { ok: true };
}

/**
 * 主観確度（A〜E + 想定/継続）の更新（ADR-0013、G3、2026-05-25）
 *
 * 現行スプレッドシート互換の営業温度感ラベル。stage（客観事実）と直交する補完軸。
 * 柏樹（ノリスケ反証ペルソナ）「stage cashflow weight は綺麗だが営業の A〜E 手感を潰してる」
 * 指摘を受けて実装。
 */
const confidenceEnum = z
  .enum(['a', 'b', 'c', 'd', 'e', 'expected', 'continuing'])
  .nullable();

export async function updateDealConfidence(
  dealId: string,
  confidence: 'a' | 'b' | 'c' | 'd' | 'e' | 'expected' | 'continuing' | null,
): Promise<UpdateStageResult> {
  const guard = await requirePermission({ resource: 'deal', action: 'update' });
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const { session } = guard;

  const parsed = confidenceEnum.safeParse(confidence);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_confidence' };
  }

  const current = await db
    .select({ subjective_confidence: deals.subjective_confidence })
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!current) {
    return { ok: false, error: 'deal_not_found' };
  }

  await db
    .update(deals)
    .set({
      subjective_confidence: parsed.data,
      confidence_updated_at: new Date(),
      confidence_updated_by: session.user.member_id,
      updated_at: new Date(),
    })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.confidence_update',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: { from: current.subjective_confidence, to: parsed.data },
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath('/deals');
  revalidatePath('/home');
  return { ok: true };
}

/**
 * 受注予定日のインライン更新（G7 拡張、2026-05-26）
 *
 * 柏樹「90 件運用で詳細ページ往復ダルい」の解消。
 * date 文字列（YYYY-MM-DD）or null（クリア）を受ける。
 */
const expectedCloseSchema = z
  .union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が不正です（YYYY-MM-DD）'),
    z.literal(''),
    z.null(),
  ])
  .nullable();

export async function updateDealExpectedClose(
  dealId: string,
  date: string | null,
): Promise<UpdateStageResult> {
  const guard = await requirePermission({ resource: 'deal', action: 'update' });
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const { session } = guard;

  const parsed = expectedCloseSchema.safeParse(date);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_date' };
  }
  const normalized = parsed.data === '' ? null : parsed.data;

  const current = await db
    .select({ expected_close_date: deals.expected_close_date })
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!current) {
    return { ok: false, error: 'deal_not_found' };
  }

  await db
    .update(deals)
    .set({ expected_close_date: normalized, updated_at: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.expected_close_inline_update',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: { from: current.expected_close_date, to: normalized, source: 'list_view_inline' },
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath('/deals');
  revalidatePath('/home');
  return { ok: true };
}

/**
 * 「次やること」インライン更新（G7 拡張 + 隊長明示 2026-05-26 03:14「いつまでに誰が」構造化）
 *
 * 柏樹反証 + 隊長明示で 3 要素構造に拡張：
 *   - text: 何を（200 字まで）
 *   - due_date: いつまでに（YYYY-MM-DD、null OK）
 *   - assignee_id: 誰が（members.id、null は案件担当者を fallback）
 *
 * deals.metadata 配下に保存（migration 不要、jsonb 部分更新）。
 */
const nextActionSchema = z.object({
  text: z.string().max(200),
  due_date: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が不正です'),
      z.literal(''),
      z.null(),
    ])
    .nullable()
    .optional(),
  assignee_id: z.union([z.string().uuid(), z.literal(''), z.null()]).nullable().optional(),
});

export async function updateDealNextAction(
  dealId: string,
  input: { text: string; due_date?: string | null; assignee_id?: string | null },
): Promise<UpdateStageResult> {
  const guard = await requirePermission({ resource: 'deal', action: 'update' });
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const { session } = guard;

  const parsed = nextActionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_next_action' };
  }
  const trimmedText = parsed.data.text.trim();
  const dueDate = parsed.data.due_date === '' ? null : (parsed.data.due_date ?? null);
  const assigneeId = parsed.data.assignee_id === '' ? null : (parsed.data.assignee_id ?? null);

  const current = await db
    .select({ metadata: deals.metadata })
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!current) {
    return { ok: false, error: 'deal_not_found' };
  }

  const oldMeta = (current.metadata as Record<string, unknown> | null) ?? {};
  const oldSnapshot = {
    text: typeof oldMeta.next_action === 'string' ? oldMeta.next_action : null,
    due_date:
      typeof oldMeta.next_action_due_date === 'string' ? oldMeta.next_action_due_date : null,
    assignee_id:
      typeof oldMeta.next_action_assignee_id === 'string'
        ? oldMeta.next_action_assignee_id
        : null,
  };
  const newMetadata: Record<string, unknown> = { ...oldMeta };

  if (trimmedText === '' && !dueDate && !assigneeId) {
    // 全部空 → クリア
    delete newMetadata.next_action;
    delete newMetadata.next_action_due_date;
    delete newMetadata.next_action_assignee_id;
    delete newMetadata.next_action_updated_at;
    delete newMetadata.next_action_updated_by;
  } else {
    newMetadata.next_action = trimmedText;
    newMetadata.next_action_due_date = dueDate;
    newMetadata.next_action_assignee_id = assigneeId;
    newMetadata.next_action_updated_at = new Date().toISOString();
    newMetadata.next_action_updated_by = session.user.member_id;
  }

  await db
    .update(deals)
    .set({ metadata: newMetadata, updated_at: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.next_action_inline_update',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: {
      from: oldSnapshot,
      to: { text: trimmedText, due_date: dueDate, assignee_id: assigneeId },
      source: 'list_view_inline',
    },
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath('/deals');
  revalidatePath('/home');
  return { ok: true };
}

/**
 * 担当者（assignee_id）のインライン更新（G7 拡張、2026-05-27）
 *
 * 隊長明示「触れなかったら意味ない」直撃。週グリッドと List view 両方で。
 * null（担当解除）も許容。
 */
const assigneeSchema = z.union([z.string().uuid(), z.literal(''), z.null()]).nullable();

export async function updateDealAssignee(
  dealId: string,
  assigneeId: string | null,
): Promise<UpdateStageResult> {
  const guard = await requirePermission({ resource: 'deal', action: 'update' });
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const { session } = guard;

  const parsed = assigneeSchema.safeParse(assigneeId);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_assignee' };
  }
  const normalized = parsed.data === '' ? null : parsed.data;

  const current = await db
    .select({ assignee_id: deals.assignee_id })
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!current) {
    return { ok: false, error: 'deal_not_found' };
  }

  await db
    .update(deals)
    .set({ assignee_id: normalized, updated_at: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.assignee_inline_update',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: { from: current.assignee_id, to: normalized, source: 'list_or_week_grid_inline' },
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath('/deals');
  revalidatePath('/home');
  return { ok: true };
}

/**
 * 受注金額（amount）のインライン更新（G7 1 画面編集、2026-05-26）
 *
 * 柏樹（ノリスケ反証）「90 件運用で死ぬ」指摘：詳細ページ往復なしで /deals 一覧から
 * 金額を直接いじれるようにする。負数は拒否、最大 999 億で安全網。
 */
const amountSchema = z.coerce.number().int().nonnegative().max(99_999_999_999);

export async function updateDealAmount(
  dealId: string,
  amount: number,
): Promise<UpdateStageResult> {
  const guard = await requirePermission({ resource: 'deal', action: 'update' });
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const { session } = guard;

  const parsed = amountSchema.safeParse(amount);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_amount' };
  }

  const current = await db
    .select({ amount: deals.amount })
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!current) {
    return { ok: false, error: 'deal_not_found' };
  }

  await db
    .update(deals)
    .set({ amount: parsed.data, updated_at: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal.amount_inline_update',
    resource_type: 'deal',
    resource_id: dealId,
    metadata: { from: current.amount, to: parsed.data, source: 'list_view_inline' },
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath('/deals');
  revalidatePath('/home');
  return { ok: true };
}

