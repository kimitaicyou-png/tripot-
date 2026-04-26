'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { vendors } from '@/db/schema';

const vendorSchema = z.object({
  name: z.string().min(1, '会社名は必須です').max(200),
  contact_email: z.string().email('メール形式が不正です').optional().nullable().or(z.literal('')),
  contact_phone: z.string().max(40).optional().nullable(),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  skills: z.array(z.string()).default([]),
});

export type VendorFormState = {
  errors?: { name?: string[]; contact_email?: string[]; _form?: string[] };
  success?: boolean;
  vendorId?: string;
};

export async function listVendors() {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  return db
    .select()
    .from(vendors)
    .where(
      and(
        eq(vendors.company_id, session.user.company_id),
        isNull(vendors.deleted_at)
      )
    )
    .orderBy(vendors.name);
}

export async function createVendor(
  _prev: VendorFormState,
  formData: FormData
): Promise<VendorFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };

  const skillsRaw = (formData.get('skills') ?? '').toString().trim();
  const skills = skillsRaw
    ? skillsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const parsed = vendorSchema.safeParse({
    name: formData.get('name'),
    contact_email: formData.get('contact_email') || null,
    contact_phone: formData.get('contact_phone') || null,
    rating: formData.get('rating') || null,
    skills,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const [created] = await db
    .insert(vendors)
    .values({
      company_id: session.user.company_id,
      name: parsed.data.name,
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone ?? null,
      rating: parsed.data.rating ?? null,
      skills: parsed.data.skills,
    })
    .returning({ id: vendors.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'vendor.create',
    resource_type: 'vendor',
    resource_id: created!.id,
    metadata: { name: parsed.data.name },
  });

  revalidatePath('/settings/vendors');
  return { success: true, vendorId: created!.id };
}

export async function updateVendor(
  vendorId: string,
  _prev: VendorFormState,
  formData: FormData
): Promise<VendorFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };

  const skillsRaw = (formData.get('skills') ?? '').toString().trim();
  const skills = skillsRaw
    ? skillsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const parsed = vendorSchema.safeParse({
    name: formData.get('name'),
    contact_email: formData.get('contact_email') || null,
    contact_phone: formData.get('contact_phone') || null,
    rating: formData.get('rating') || null,
    skills,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await db
    .update(vendors)
    .set({
      name: parsed.data.name,
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone ?? null,
      rating: parsed.data.rating ?? null,
      skills: parsed.data.skills,
      updated_at: new Date(),
    })
    .where(
      and(eq(vendors.id, vendorId), eq(vendors.company_id, session.user.company_id))
    );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'vendor.update',
    resource_type: 'vendor',
    resource_id: vendorId,
  });

  revalidatePath('/settings/vendors');
  return { success: true, vendorId };
}

export async function deleteVendor(vendorId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');

  await db
    .update(vendors)
    .set({ deleted_at: new Date() })
    .where(
      and(eq(vendors.id, vendorId), eq(vendors.company_id, session.user.company_id))
    );

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'vendor.delete',
    resource_type: 'vendor',
    resource_id: vendorId,
  });

  revalidatePath('/settings/vendors');
}
