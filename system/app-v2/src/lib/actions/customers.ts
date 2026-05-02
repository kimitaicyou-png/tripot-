'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { customers } from '@/db/schema';

const customerSchema = z.object({
  name: z.string().min(1, '顧客名は必須です').max(200),
  contact_email: z.string().email().optional().or(z.literal('')).nullable(),
  contact_phone: z.string().max(50).optional().nullable(),
});

export type CustomerFormState = {
  errors?: { name?: string[]; contact_email?: string[]; _form?: string[] };
  success?: boolean;
};

export async function createCustomer(_prev: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const parsed = customerSchema.safeParse({
    name: formData.get('name'),
    contact_email: formData.get('contact_email') || null,
    contact_phone: formData.get('contact_phone') || null,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const [created] = await db
    .insert(customers)
    .values({
      company_id: session.user.company_id,
      ...parsed.data,
      contact_email: parsed.data.contact_email || null,
    })
    .returning({ id: customers.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'customer.create',
    resource_type: 'customer',
    resource_id: created!.id,
    metadata: { name: parsed.data.name },
  });

  revalidatePath('/customers');
  redirect('/customers');
}

export async function updateCustomer(
  customerId: string,
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const parsed = customerSchema.safeParse({
    name: formData.get('name'),
    contact_email: formData.get('contact_email') || null,
    contact_phone: formData.get('contact_phone') || null,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await db
    .update(customers)
    .set({
      ...parsed.data,
      contact_email: parsed.data.contact_email || null,
      updated_at: new Date(),
    })
    .where(and(eq(customers.id, customerId), eq(customers.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'customer.update',
    resource_type: 'customer',
    resource_id: customerId,
    metadata: { name: parsed.data.name },
  });

  revalidatePath('/customers');
  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

export async function deleteCustomer(customerId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  await db
    .update(customers)
    .set({ deleted_at: new Date() })
    .where(and(eq(customers.id, customerId), eq(customers.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'customer.delete',
    resource_type: 'customer',
    resource_id: customerId,
  });

  revalidatePath('/customers');
  redirect('/customers');
}

const bulkCustomerRowSchema = z.object({
  name: z.string().min(1, '顧客名は必須').max(200),
  contact_email: z
    .string()
    .email('メール形式が不正')
    .optional()
    .or(z.literal(''))
    .nullable(),
  contact_phone: z.string().max(50).optional().nullable(),
});

export type BulkCustomerRow = z.infer<typeof bulkCustomerRowSchema>;

export type BulkCreateCustomersResult = {
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

export async function bulkCreateCustomers(
  rows: BulkCustomerRow[]
): Promise<BulkCreateCustomersResult> {
  const session = await auth();
  if (!session?.user?.member_id) {
    return { inserted: 0, skipped: 0, errors: [{ row: 0, message: '認証が必要です' }] };
  }
  await setTenantContext(session.user.company_id);

  const errors: BulkCreateCustomersResult['errors'] = [];
  const valid: Array<{
    company_id: string;
    name: string;
    contact_email: string | null;
    contact_phone: string | null;
  }> = [];

  rows.forEach((row, idx) => {
    const parsed = bulkCustomerRowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push({
        row: idx + 1,
        message: parsed.error.errors
          .map((e) => `${e.path.join('.') || 'value'}: ${e.message}`)
          .join('; '),
      });
      return;
    }
    valid.push({
      company_id: session.user.company_id,
      name: parsed.data.name.trim(),
      contact_email: parsed.data.contact_email ? parsed.data.contact_email.trim() : null,
      contact_phone: parsed.data.contact_phone ? parsed.data.contact_phone.trim() : null,
    });
  });

  if (valid.length === 0) {
    return { inserted: 0, skipped: rows.length, errors };
  }

  const inserted = await db
    .insert(customers)
    .values(valid)
    .returning({ id: customers.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'customers.bulk_create',
    resource_type: 'customer',
    resource_id: 'bulk',
    metadata: {
      inserted: inserted.length,
      errors_count: errors.length,
      sample_names: valid.slice(0, 5).map((v) => v.name),
    },
  });

  revalidatePath('/customers');
  return {
    inserted: inserted.length,
    skipped: rows.length - inserted.length,
    errors,
  };
}
