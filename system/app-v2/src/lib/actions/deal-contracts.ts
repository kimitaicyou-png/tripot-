'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { deal_contracts } from '@/db/schema';

const schema = z.object({
  title: z.string().min(1, 'タイトルは必須').max(200),
  contract_type: z.string().max(40).optional().nullable(),
  signed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  file_url: z.string().url().or(z.literal('')).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

export type ContractFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function createDealContract(
  dealId: string,
  _prev: ContractFormState,
  formData: FormData
): Promise<ContractFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };

  const parsed = schema.safeParse({
    title: formData.get('title'),
    contract_type: formData.get('contract_type') || null,
    signed_date: formData.get('signed_date') || null,
    expiry_date: formData.get('expiry_date') || null,
    file_url: formData.get('file_url') || null,
    note: formData.get('note') || null,
  });

  if (!parsed.success) return { errors: { _form: parsed.error.errors.map((e) => e.message) } };

  const [created] = await db
    .insert(deal_contracts)
    .values({
      company_id: session.user.company_id,
      deal_id: dealId,
      created_by: session.user.member_id,
      title: parsed.data.title,
      contract_type: parsed.data.contract_type ?? null,
      signed_date: parsed.data.signed_date ?? null,
      expiry_date: parsed.data.expiry_date ?? null,
      file_url: parsed.data.file_url || null,
      note: parsed.data.note ?? null,
    })
    .returning({ id: deal_contracts.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal_contract.create',
    resource_type: 'deal_contract',
    resource_id: created!.id,
    metadata: { deal_id: dealId, title: parsed.data.title },
  });

  revalidatePath(`/deals/${dealId}`);
  return { success: true };
}

export async function deleteDealContract(contractId: string, dealId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');

  await db
    .update(deal_contracts)
    .set({ deleted_at: new Date() })
    .where(and(eq(deal_contracts.id, contractId), eq(deal_contracts.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'deal_contract.delete',
    resource_type: 'deal_contract',
    resource_id: contractId,
  });

  revalidatePath(`/deals/${dealId}`);
}

export async function listDealContracts(dealId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return [];

  return db
    .select()
    .from(deal_contracts)
    .where(
      and(
        eq(deal_contracts.deal_id, dealId),
        eq(deal_contracts.company_id, session.user.company_id),
        isNull(deal_contracts.deleted_at)
      )
    )
    .orderBy(desc(deal_contracts.created_at));
}
