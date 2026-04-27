'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { quotes } from '@/db/schema';
import { TRIPOT_CONFIG } from '../../../coaris.config';

export async function listActiveQuotes() {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  await setTenantContext(session.user.company_id);
  return db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.company_id, session.user.company_id),
        eq(quotes.is_active, 1)
      )
    );
}

export async function pickQuoteForMember(memberId: string): Promise<{
  body: string;
  author: string | null;
} | null> {
  const session = await auth();
  if (!session?.user?.member_id) return null;
  await setTenantContext(session.user.company_id);

  const rows = await db
    .select({
      body: quotes.body,
      author: quotes.author,
      weight: quotes.weight,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.company_id, session.user.company_id),
        eq(quotes.is_active, 1)
      )
    );

  if (rows.length === 0) return null;

  let hash = 0;
  const dayKey = new Date().toISOString().slice(0, 10) + memberId;
  for (let i = 0; i < dayKey.length; i++) {
    hash = (hash << 5) - hash + dayKey.charCodeAt(i);
    hash = hash & hash;
  }

  const totalWeight = rows.reduce((s, r) => s + (r.weight || 1), 0);
  const target = Math.abs(hash) % totalWeight;
  let acc = 0;
  for (const r of rows) {
    acc += r.weight || 1;
    if (target < acc) return { body: r.body, author: r.author };
  }
  return { body: rows[0]!.body, author: rows[0]!.author };
}

export async function seedDefaultQuotes(): Promise<{ inserted: number; skipped: number }> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  const [existingRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(quotes)
    .where(eq(quotes.company_id, session.user.company_id));

  if ((existingRow?.n ?? 0) > 0) {
    return { inserted: 0, skipped: TRIPOT_CONFIG.quotes.length };
  }

  const values = TRIPOT_CONFIG.quotes.map((q) => ({
    company_id: session.user.company_id,
    body: q.body,
    author: q.author ?? null,
    weight: q.weight ?? 1,
    is_active: 1,
  }));

  if (values.length === 0) return { inserted: 0, skipped: 0 };

  await db.insert(quotes).values(values);

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'quotes.seed',
    resource_type: 'company',
    resource_id: session.user.company_id,
    metadata: { count: values.length, source: 'coaris.config.quotes' },
  });

  revalidatePath('/');
  return { inserted: values.length, skipped: 0 };
}

export async function addQuote(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  const body = (formData.get('body') ?? '').toString().trim();
  if (!body) throw new Error('名言が入力されていません');

  const author = (formData.get('author') ?? '').toString().trim() || null;
  const weight = Number(formData.get('weight') ?? 1) || 1;

  await db.insert(quotes).values({
    company_id: session.user.company_id,
    member_id: session.user.member_id,
    body,
    author,
    weight,
    is_active: 1,
  });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'quotes.create',
    resource_type: 'quote',
    metadata: { body },
  });

  revalidatePath('/');
}
