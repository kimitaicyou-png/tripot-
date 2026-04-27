'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { production_cards, deals, bugs } from '@/db/schema';

const STATUSES = ['requirements', 'designing', 'building', 'reviewing', 'delivered', 'cancelled'] as const;
type ProductionStatus = (typeof STATUSES)[number];

const createSchema = z.object({
  title: z.string().min(1, 'タイトルは必須').max(200),
  deal_id: z.string().uuid().optional().nullable(),
  status: z.enum(STATUSES).default('requirements'),
  estimated_cost: z.coerce.number().int().nonnegative().default(0),
});

export type ProductionFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function createProductionCard(
  _prev: ProductionFormState,
  formData: FormData
): Promise<ProductionFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const parsed = createSchema.safeParse({
    title: formData.get('title'),
    deal_id: formData.get('deal_id') || null,
    status: formData.get('status') ?? 'requirements',
    estimated_cost: formData.get('estimated_cost') ?? 0,
  });

  if (!parsed.success) return { errors: { _form: parsed.error.errors.map((e) => e.message) } };

  const [created] = await db
    .insert(production_cards)
    .values({
      company_id: session.user.company_id,
      deal_id: parsed.data.deal_id || null,
      title: parsed.data.title,
      status: parsed.data.status,
      estimated_cost: parsed.data.estimated_cost,
    })
    .returning({ id: production_cards.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'production_card.create',
    resource_type: 'production_card',
    resource_id: created!.id,
    metadata: { title: parsed.data.title, status: parsed.data.status },
  });

  revalidatePath('/production');
  return { success: true };
}

export async function updateProductionCardStatus(
  cardId: string,
  status: ProductionStatus
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.member_id) return { success: false, error: '認証が必要です' };
  await setTenantContext(session.user.company_id);

  if (!STATUSES.includes(status)) return { success: false, error: '不正なステータス' };

  const updateData: Record<string, unknown> = { status, updated_at: new Date() };
  if (status === 'delivered') updateData.delivered_at = new Date().toISOString().slice(0, 10);
  if (status === 'building' || status === 'designing') {
    updateData.started_at = sql`COALESCE(${production_cards.started_at}, CURRENT_DATE)`;
  }

  const [updated] = await db
    .update(production_cards)
    .set(updateData)
    .where(and(eq(production_cards.id, cardId), eq(production_cards.company_id, session.user.company_id)))
    .returning({ id: production_cards.id });

  if (!updated) return { success: false, error: 'カードが見つかりません' };

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'production_card.update_status',
    resource_type: 'production_card',
    resource_id: cardId,
    metadata: { new_status: status },
  });

  revalidatePath('/production');
  return { success: true };
}

const updateSchema = z.object({
  title: z.string().min(1).max(200),
  estimated_cost: z.coerce.number().int().nonnegative().default(0),
  actual_cost: z.coerce.number().int().nonnegative().default(0),
});

export async function updateProductionCard(
  cardId: string,
  _prev: ProductionFormState,
  formData: FormData
): Promise<ProductionFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const parsed = updateSchema.safeParse({
    title: formData.get('title'),
    estimated_cost: formData.get('estimated_cost') ?? 0,
    actual_cost: formData.get('actual_cost') ?? 0,
  });

  if (!parsed.success) return { errors: { _form: parsed.error.errors.map((e) => e.message) } };

  const [updated] = await db
    .update(production_cards)
    .set({
      title: parsed.data.title,
      estimated_cost: parsed.data.estimated_cost,
      actual_cost: parsed.data.actual_cost,
      updated_at: new Date(),
    })
    .where(and(eq(production_cards.id, cardId), eq(production_cards.company_id, session.user.company_id)))
    .returning({ id: production_cards.id });

  if (!updated) return { errors: { _form: ['カードが見つかりません'] } };

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'production_card.update',
    resource_type: 'production_card',
    resource_id: cardId,
    metadata: { title: parsed.data.title, estimated_cost: parsed.data.estimated_cost, actual_cost: parsed.data.actual_cost },
  });

  revalidatePath(`/production/${cardId}`);
  revalidatePath('/production');
  return { success: true };
}

export async function deleteProductionCard(cardId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  await db
    .update(production_cards)
    .set({ deleted_at: new Date() })
    .where(and(eq(production_cards.id, cardId), eq(production_cards.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'production_card.delete',
    resource_type: 'production_card',
    resource_id: cardId,
  });

  revalidatePath('/production');
}

export async function listProductionCards() {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  await setTenantContext(session.user.company_id);

  return db
    .select({
      id: production_cards.id,
      title: production_cards.title,
      status: production_cards.status,
      deal_id: production_cards.deal_id,
      deal_title: deals.title,
      estimated_cost: production_cards.estimated_cost,
      actual_cost: production_cards.actual_cost,
      started_at: production_cards.started_at,
      delivered_at: production_cards.delivered_at,
    })
    .from(production_cards)
    .leftJoin(deals, eq(production_cards.deal_id, deals.id))
    .where(
      and(
        eq(production_cards.company_id, session.user.company_id),
        isNull(production_cards.deleted_at)
      )
    )
    .orderBy(production_cards.created_at);
}

export async function bugCounts() {
  const session = await auth();
  if (!session?.user?.member_id) return { open: 0, inProgress: 0, critical: 0 };
  await setTenantContext(session.user.company_id);

  const [row] = await db
    .select({
      open: sql<number>`COUNT(*) FILTER (WHERE ${bugs.status} = 'open')::int`,
      inProgress: sql<number>`COUNT(*) FILTER (WHERE ${bugs.status} = 'in_progress')::int`,
      critical: sql<number>`COUNT(*) FILTER (WHERE ${bugs.severity} = 'critical' AND ${bugs.status} != 'closed')::int`,
    })
    .from(bugs)
    .where(eq(bugs.company_id, session.user.company_id));

  return row ?? { open: 0, inProgress: 0, critical: 0 };
}
