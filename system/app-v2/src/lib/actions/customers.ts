'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
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
