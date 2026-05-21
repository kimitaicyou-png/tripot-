'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit } from '@/lib/db';
import { companies } from '@/db/schema';

/**
 * 月次販管費の手動入力 server action（MoneyForward 接続前の仮実装）。
 *
 * MF Cloud 接続は env 投入待ち（docs/MONEYFORWARD_INTEGRATION.md）。
 * 接続までの間、販管費は手動入力で運用する。companies.config.monthly_opex[YYYY-MM]
 * に保存。MF 接続後は actual_opex は MF transactions から自動算出される。
 *
 * migration ゼロで実装するため companies.config jsonb を流用（本来 budgets.actual_opex
 * カラムに置くべき、Phase 2 で migration 検討）。
 */

const opexSchema = z.object({
  year_month: z.string().regex(/^\d{4}-\d{2}$/, 'YYYY-MM 形式'),
  amount: z.number().int().nonnegative().max(99_999_999_999),
});

export type MonthlyOpexResult = { ok: true } | { ok: false; error: string };

export async function updateMonthlyOpex(
  yearMonth: string,
  amount: number
): Promise<MonthlyOpexResult> {
  const session = await auth();
  if (!session?.user?.member_id) return { ok: false, error: 'unauthorized' };
  // president / hq_member のみ書込許可
  if (session.user.role !== 'president' && session.user.role !== 'hq_member') {
    return { ok: false, error: 'forbidden' };
  }

  const parsed = opexSchema.safeParse({ year_month: yearMonth, amount });
  if (!parsed.success) {
    return { ok: false, error: 'invalid_input' };
  }

  // companies.config.monthly_opex[YYYY-MM] = amount を merge update
  await db
    .update(companies)
    .set({
      config: sql`
        jsonb_set(
          COALESCE(${companies.config}, '{}'::jsonb),
          ${`{monthly_opex,${parsed.data.year_month}}`}::text[],
          to_jsonb(${parsed.data.amount}::bigint),
          true
        )
      `,
      updated_at: new Date(),
    })
    .where(eq(companies.id, session.user.company_id));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'monthly_opex.update',
    resource_type: 'company',
    resource_id: session.user.company_id,
    metadata: { year_month: parsed.data.year_month, amount: parsed.data.amount },
  });

  revalidatePath('/monthly');
  revalidatePath('/budget');
  return { ok: true };
}

/**
 * companies.config.monthly_opex[YYYY-MM] を取得。
 * 未設定なら 0 を返す。session が無い場合も 0（呼出側でフォールバック）。
 */
export async function getMonthlyOpex(yearMonth: string): Promise<number> {
  const session = await auth();
  if (!session?.user?.member_id) return 0;

  const row = await db
    .select({ config: companies.config })
    .from(companies)
    .where(eq(companies.id, session.user.company_id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!row) return 0;
  const config = row.config as Record<string, unknown> | null;
  if (!config || typeof config !== 'object') return 0;
  const opexMap = (config as { monthly_opex?: Record<string, unknown> }).monthly_opex;
  if (!opexMap || typeof opexMap !== 'object') return 0;
  const v = opexMap[yearMonth];
  return typeof v === 'number' ? v : 0;
}

/**
 * 年内 12 ヶ月分の monthly_opex を Map<month, amount> で返す。
 * budget page の年間 P/L サマリー用。1 クエリで companies.config を引き、メモリで month 分解。
 */
export async function getYearlyMonthlyOpex(year: number): Promise<Map<number, number>> {
  const session = await auth();
  const map = new Map<number, number>();
  if (!session?.user?.member_id) return map;

  const row = await db
    .select({ config: companies.config })
    .from(companies)
    .where(eq(companies.id, session.user.company_id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!row) return map;
  const config = row.config as Record<string, unknown> | null;
  if (!config || typeof config !== 'object') return map;
  const opexMap = (config as { monthly_opex?: Record<string, unknown> }).monthly_opex;
  if (!opexMap || typeof opexMap !== 'object') return map;

  for (let month = 1; month <= 12; month++) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const v = opexMap[ym];
    if (typeof v === 'number' && v > 0) map.set(month, v);
  }
  return map;
}
