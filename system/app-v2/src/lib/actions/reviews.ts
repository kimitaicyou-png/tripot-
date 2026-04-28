'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { reviews, deliverables, members } from '@/db/schema';

const REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'revision'] as const;
type ReviewStatus = (typeof REVIEW_STATUSES)[number];

const createSchema = z.object({
  production_card_id: z.string().uuid(),
  deliverable_id: z.string().uuid().optional().nullable(),
  status: z.enum(REVIEW_STATUSES).default('pending'),
  feedback: z.string().max(4000).optional().nullable(),
});

export type ReviewFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
};

export async function createReview(
  cardId: string,
  _prev: ReviewFormState,
  formData: FormData
): Promise<ReviewFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const deliverableIdRaw = formData.get('deliverable_id');
  const parsed = createSchema.safeParse({
    production_card_id: cardId,
    deliverable_id: deliverableIdRaw ? String(deliverableIdRaw) : null,
    status: formData.get('status') ?? 'pending',
    feedback: formData.get('feedback') || null,
  });

  if (!parsed.success) return { errors: { _form: parsed.error.errors.map((e) => e.message) } };

  const reviewedAt = parsed.data.status === 'pending' ? null : new Date();

  const [created] = await db
    .insert(reviews)
    .values({
      company_id: session.user.company_id,
      production_card_id: parsed.data.production_card_id,
      deliverable_id: parsed.data.deliverable_id || null,
      reviewer_id: session.user.member_id,
      status: parsed.data.status,
      feedback: parsed.data.feedback ?? null,
      reviewed_at: reviewedAt,
    })
    .returning({ id: reviews.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'review.create',
    resource_type: 'review',
    resource_id: created!.id,
    metadata: { card_id: cardId, status: parsed.data.status },
  });

  revalidatePath(`/production/${cardId}`);
  return { success: true };
}

export async function updateReviewStatus(
  reviewId: string,
  cardId: string,
  status: ReviewStatus
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.member_id) return { success: false, error: '認証が必要です' };
  await setTenantContext(session.user.company_id);

  if (!REVIEW_STATUSES.includes(status)) return { success: false, error: '不正なステータス' };

  await db
    .update(reviews)
    .set({
      status,
      reviewed_at: status === 'pending' ? null : new Date(),
    })
    .where(and(eq(reviews.id, reviewId), eq(reviews.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'review.update_status',
    resource_type: 'review',
    resource_id: reviewId,
    metadata: { card_id: cardId, new_status: status },
  });

  revalidatePath(`/production/${cardId}`);
  return { success: true };
}

export async function listReviewsForCard(cardId: string) {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  await setTenantContext(session.user.company_id);

  return db
    .select({
      id: reviews.id,
      deliverable_id: reviews.deliverable_id,
      deliverable_name: deliverables.name,
      deliverable_version: deliverables.version,
      reviewer_id: reviews.reviewer_id,
      reviewer_name: members.name,
      status: reviews.status,
      feedback: reviews.feedback,
      reviewed_at: reviews.reviewed_at,
      created_at: reviews.created_at,
    })
    .from(reviews)
    .leftJoin(deliverables, eq(reviews.deliverable_id, deliverables.id))
    .leftJoin(members, eq(reviews.reviewer_id, members.id))
    .where(
      and(
        eq(reviews.production_card_id, cardId),
        eq(reviews.company_id, session.user.company_id)
      )
    )
    .orderBy(desc(reviews.created_at));
}
