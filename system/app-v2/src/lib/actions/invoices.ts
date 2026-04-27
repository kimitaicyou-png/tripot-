'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { invoices, estimates } from '@/db/schema';

const invoiceSchema = z.object({
  deal_id: z.string().uuid(),
  estimate_id: z.string().uuid().optional().nullable(),
  invoice_number: z.string().max(64).optional().nullable(),
  status: z.enum(['draft', 'issued', 'sent', 'paid', 'overdue', 'voided']).default('draft'),
  subtotal: z.coerce.number().int().nonnegative().default(0),
  tax: z.coerce.number().int().nonnegative().default(0),
  total: z.coerce.number().int().nonnegative(),
  issue_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
});

export type InvoiceFormState = {
  errors?: { invoice_number?: string[]; total?: string[]; _form?: string[] };
  success?: boolean;
  invoiceId?: string;
};

export async function createInvoice(
  _prev: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const parsed = invoiceSchema.safeParse({
    deal_id: formData.get('deal_id'),
    estimate_id: formData.get('estimate_id') || null,
    invoice_number: formData.get('invoice_number') || null,
    status: formData.get('status') ?? 'draft',
    subtotal: formData.get('subtotal') ?? 0,
    tax: formData.get('tax') ?? 0,
    total: formData.get('total') ?? 0,
    issue_date: formData.get('issue_date') || null,
    due_date: formData.get('due_date') || null,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const [created] = await db
    .insert(invoices)
    .values({
      company_id: session.user.company_id,
      deal_id: parsed.data.deal_id,
      estimate_id: parsed.data.estimate_id ?? null,
      invoice_number: parsed.data.invoice_number ?? null,
      status: parsed.data.status,
      subtotal: parsed.data.subtotal,
      tax: parsed.data.tax,
      total: parsed.data.total,
      issue_date: parsed.data.issue_date ?? null,
      due_date: parsed.data.due_date ?? null,
    })
    .returning({ id: invoices.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'invoice.create',
    resource_type: 'invoice',
    resource_id: created!.id,
    metadata: { deal_id: parsed.data.deal_id, total: parsed.data.total },
  });

  revalidatePath(`/deals/${parsed.data.deal_id}`);
  return { success: true, invoiceId: created!.id };
}

export async function markInvoicePaid(invoiceId: string, dealId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  await db
    .update(invoices)
    .set({ status: 'paid', paid_at: new Date().toISOString().slice(0, 10), updated_at: new Date() })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'invoice.paid',
    resource_type: 'invoice',
    resource_id: invoiceId,
  });

  revalidatePath(`/deals/${dealId}`);
}

export async function createInvoiceFromEstimate(
  estimateId: string,
  dealId: string
): Promise<{ invoiceId: string }> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  const estimate = await db
    .select({
      id: estimates.id,
      deal_id: estimates.deal_id,
      title: estimates.title,
      subtotal: estimates.subtotal,
      tax: estimates.tax,
      total: estimates.total,
    })
    .from(estimates)
    .where(
      and(
        eq(estimates.id, estimateId),
        eq(estimates.company_id, session.user.company_id),
        isNull(estimates.deleted_at)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!estimate) throw new Error('見積が見つかりません');

  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${invoices.invoice_number})::text::int, 0)` })
    .from(invoices)
    .where(
      and(
        eq(invoices.company_id, session.user.company_id),
        sql`${invoices.invoice_number} ~ '^INV-[0-9]+$'`
      )
    );
  const nextNumber = `INV-${String((maxRow?.max ?? 0) + 1).padStart(5, '0')}`;

  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + 30);

  const [created] = await db
    .insert(invoices)
    .values({
      company_id: session.user.company_id,
      deal_id: dealId,
      estimate_id: estimateId,
      invoice_number: nextNumber,
      status: 'draft',
      subtotal: estimate.subtotal ?? 0,
      tax: estimate.tax ?? 0,
      total: estimate.total ?? 0,
      issue_date: today.toISOString().slice(0, 10),
      due_date: dueDate.toISOString().slice(0, 10),
    })
    .returning({ id: invoices.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'invoice.from_estimate',
    resource_type: 'invoice',
    resource_id: created!.id,
    metadata: {
      estimate_id: estimateId,
      deal_id: dealId,
      total: estimate.total,
      invoice_number: nextNumber,
    },
  });

  revalidatePath(`/deals/${dealId}`);
  return { invoiceId: created!.id };
}

export async function updateInvoiceStatus(
  invoiceId: string,
  dealId: string,
  status: 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'voided'
): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date(),
  };
  if (status === 'paid') {
    updateData.paid_at = new Date().toISOString().slice(0, 10);
  }

  await db
    .update(invoices)
    .set(updateData)
    .where(
      and(eq(invoices.id, invoiceId), eq(invoices.company_id, session.user.company_id))
    );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: `invoice.${status}`,
    resource_type: 'invoice',
    resource_id: invoiceId,
  });

  revalidatePath(`/deals/${dealId}`);
}

export async function deleteInvoice(invoiceId: string, dealId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  await db
    .update(invoices)
    .set({ deleted_at: new Date() })
    .where(
      and(eq(invoices.id, invoiceId), eq(invoices.company_id, session.user.company_id))
    );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'invoice.delete',
    resource_type: 'invoice',
    resource_id: invoiceId,
  });

  revalidatePath(`/deals/${dealId}`);
}

export async function listInvoicesForDeal(dealId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  await setTenantContext(session.user.company_id);
  return db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.deal_id, dealId),
        eq(invoices.company_id, session.user.company_id),
        isNull(invoices.deleted_at)
      )
    )
    .orderBy(desc(invoices.created_at));
}
