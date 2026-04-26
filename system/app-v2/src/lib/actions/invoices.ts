'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { invoices } from '@/db/schema';

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

export async function listInvoicesForDeal(dealId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return [];
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
