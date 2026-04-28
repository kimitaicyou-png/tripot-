'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { purchase_orders, vendors } from '@/db/schema';

const createSchema = z.object({
  production_card_id: z.string().uuid(),
  vendor_id: z.string().uuid('外注先の選択は必須です'),
  title: z.string().min(1, 'タイトルは必須').max(200),
  amount: z.coerce.number().int().nonnegative().default(0),
  issued_on: z.string().optional().nullable(),
});

export type PurchaseOrderFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function createPurchaseOrder(
  cardId: string,
  _prev: PurchaseOrderFormState,
  formData: FormData
): Promise<PurchaseOrderFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const issuedOnRaw = formData.get('issued_on');
  const parsed = createSchema.safeParse({
    production_card_id: cardId,
    vendor_id: formData.get('vendor_id'),
    title: formData.get('title'),
    amount: formData.get('amount') ?? 0,
    issued_on: issuedOnRaw ? String(issuedOnRaw) : null,
  });

  if (!parsed.success) return { errors: { _form: parsed.error.errors.map((e) => e.message) } };

  const [created] = await db
    .insert(purchase_orders)
    .values({
      company_id: session.user.company_id,
      production_card_id: parsed.data.production_card_id,
      vendor_id: parsed.data.vendor_id,
      title: parsed.data.title,
      amount: parsed.data.amount,
      issued_on: parsed.data.issued_on || null,
    })
    .returning({ id: purchase_orders.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'purchase_order.create',
    resource_type: 'purchase_order',
    resource_id: created!.id,
    metadata: { card_id: cardId, vendor_id: parsed.data.vendor_id, amount: parsed.data.amount },
  });

  revalidatePath(`/production/${cardId}`);
  return { success: true };
}

export async function markPurchaseOrderDelivered(
  poId: string,
  cardId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.member_id) return { success: false, error: '認証が必要です' };
  await setTenantContext(session.user.company_id);

  await db
    .update(purchase_orders)
    .set({ delivered_on: new Date().toISOString().slice(0, 10), updated_at: new Date() })
    .where(and(eq(purchase_orders.id, poId), eq(purchase_orders.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'purchase_order.mark_delivered',
    resource_type: 'purchase_order',
    resource_id: poId,
    metadata: { card_id: cardId },
  });

  revalidatePath(`/production/${cardId}`);
  return { success: true };
}

export async function markPurchaseOrderPaid(
  poId: string,
  cardId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.member_id) return { success: false, error: '認証が必要です' };
  await setTenantContext(session.user.company_id);

  await db
    .update(purchase_orders)
    .set({ paid_on: new Date().toISOString().slice(0, 10), updated_at: new Date() })
    .where(and(eq(purchase_orders.id, poId), eq(purchase_orders.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'purchase_order.mark_paid',
    resource_type: 'purchase_order',
    resource_id: poId,
    metadata: { card_id: cardId },
  });

  revalidatePath(`/production/${cardId}`);
  return { success: true };
}

export async function listPurchaseOrdersForCard(cardId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  await setTenantContext(session.user.company_id);

  return db
    .select({
      id: purchase_orders.id,
      title: purchase_orders.title,
      amount: purchase_orders.amount,
      issued_on: purchase_orders.issued_on,
      delivered_on: purchase_orders.delivered_on,
      paid_on: purchase_orders.paid_on,
      vendor_id: purchase_orders.vendor_id,
      vendor_name: vendors.name,
      created_at: purchase_orders.created_at,
    })
    .from(purchase_orders)
    .leftJoin(vendors, eq(purchase_orders.vendor_id, vendors.id))
    .where(
      and(
        eq(purchase_orders.production_card_id, cardId),
        eq(purchase_orders.company_id, session.user.company_id)
      )
    )
    .orderBy(desc(purchase_orders.created_at));
}

export async function listVendorsForSelect() {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  await setTenantContext(session.user.company_id);

  return db
    .select({ id: vendors.id, name: vendors.name })
    .from(vendors)
    .where(and(eq(vendors.company_id, session.user.company_id), isNull(vendors.deleted_at)))
    .orderBy(vendors.name);
}
